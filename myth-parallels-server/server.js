// server.js — improved (themes routes preserved)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const natural = require('natural');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // optionally: max, idleTimeoutMillis
});

pool.on('error', (err) => {
  console.error('Unexpected PG client error', err);
});

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '250kb' })); // avoid huge payloads

// basic rate limiter (tune as needed)
const limiter = rateLimit({
  windowMs: 10 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Global error logging
process.on('unhandledRejection', (reason, p) => {
  console.error('UNHANDLED REJECTION at Promise', p, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION', err);
});

/* ---------------------- Utility: text preprocessing & matching ---------------------- */

// tokenizer + stemmer
const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;

// stoplist — keep it small to avoid over-pruning
const STOPWORDS = new Set([
  'the','and','for','a','an','of','in','on','to','is','are','that','this','with','as','by','from','it','its','be','was','were','which','or','but'
]);

const ENTITY_STOPWORDS = new Set([
  'jesus', 'christ', 'moses', 'krishna', 'buddha', 'zeus', 'apollo'
]);

function normalizeTags(tags) {
  if (!tags) return '';
  if (Array.isArray(tags)) return tags.join(' ');
  if (typeof tags === 'string') {
    const s = tags.trim();
    // JSON array
    if (s.startsWith('[') && s.endsWith(']')) {
      try {
        const parsed = JSON.parse(s);
        return Array.isArray(parsed) ? parsed.join(' ') : s;
      } catch (e) {
        // fallback to heuristics below
      }
    }
    // object-like {a,b}
    if (s.startsWith('{') && s.endsWith('}')) {
      return s.slice(1, -1).split(',').map(t => t.replace(/^"|"$/g, '').trim()).join(' ');
    }
    return s;
  }
  return String(tags);
}

function preprocessToTokens(text) {
  if (!text) return [];
  const raw = String(text).toLowerCase();
  const toks = tokenizer.tokenize(raw);
  const cleaned = toks
    .map(t => t.replace(/[^a-z0-9]/g, ''))
    .filter(
      t =>
        t &&
        t.length > 2 &&
        !STOPWORDS.has(t) &&
        !ENTITY_STOPWORDS.has(t)
    )
    .map(t => stemmer.stem(t));
  return cleaned;
}

function preprocessToString(text) {
  return preprocessToTokens(text).join(' ');
}

/* ---------------------- Document builder + in-memory cache ---------------------- */

// clamp content parts to avoid huge TF-IDF documents
const MAX_CHARS_PER_PART = 2000;

function safeSlice(s, max) {
  if (!s) return '';
  return s.length > max ? s.slice(0, max) : s;
}

function buildDocForRow(row, opts = { titleBoost: 2 }) {
  const title = String(row.title || '');
  const summary = safeSlice(String(row.summary || ''), MAX_CHARS_PER_PART);
  const content = safeSlice(String(row.content || ''), MAX_CHARS_PER_PART);
  const tags = normalizeTags(row.tags || '');

  const titlePart = Array(Math.max(1, opts.titleBoost))
    .fill(preprocessToString(title))
    .join(' ');
  const summaryPart = preprocessToString(summary);
  const contentPart = preprocessToString(content);
  const tagPart = preprocessToString(tags);

  return `${titlePart} ${summaryPart} ${contentPart} ${tagPart}`.trim();
}

const SUGGEST_CACHE = {
  value: null,
  ttlMs: 1000 * 60 * 5 // 5 minutes
};

async function buildOrGetCache(opts = { titleBoost: 2 }) {
  const now = Date.now();
  if (SUGGEST_CACHE.value && (now - SUGGEST_CACHE.value.ts < SUGGEST_CACHE.ttlMs)) {
    return SUGGEST_CACHE.value;
  }

  const q = `
    SELECT m.id, m.title, m.summary, m.content, m.tags, m.tradition, m."imageUrl",
      COALESCE(json_agg(DISTINCT th.name) FILTER (WHERE th.name IS NOT NULL), '[]') AS themes
    FROM myths m
    LEFT JOIN myth_themes mt ON mt.myth_id = m.id
    LEFT JOIN themes th ON th.id = mt.theme_id
    GROUP BY m.id
    ORDER BY m.id;
  `;
  const { rows } = await pool.query(q);

  const docs = [];
  const idToRow = new Map();
  for (const row of rows) {
    const doc = buildDocForRow(row, opts);
    docs.push(doc);
    idToRow.set(Number(row.id), { row, doc });
  }

  const value = { ts: now, docs, idToRow, mythList: rows };
  SUGGEST_CACHE.value = value;
  return value;
}

/* ---------------------- Health/Admin ---------------------- */

app.get('/health', (req, res) => {
  res.json({ ok: true, db: !!pool ? 'connected' : 'unknown', ts: Date.now() });
});

// admin: rebuild cache (useful after inserts); in prod protect this route
app.post('/admin/rebuild-suggest-cache', async (req, res) => {
  try {
    SUGGEST_CACHE.value = null;
    const cache = await buildOrGetCache();
    res.json({ rebuilt: true, docs: cache.docs.length });
  } catch (err) {
    console.error('rebuild cache err', err);
    res.status(500).json({ error: 'rebuild failed' });
  }
});

/* ---------------------- Basic routes (preserved) ---------------------- */

app.get('/api/myths/next', async (req, res) => {
  const currentId = Number(req.query.currentId);
  if (!Number.isFinite(currentId)) {
    return res.status(400).json({ error: 'currentId required and must be a number' });
  }
  try {
    const nextQ = 'SELECT id, title, "imageUrl" FROM myths WHERE id > $1 ORDER BY id ASC LIMIT 1;';
    const nextRes = await pool.query(nextQ, [currentId]);
    if (nextRes.rows.length) return res.json(nextRes.rows[0]);

    const wrapQ = 'SELECT id, title, "imageUrl" FROM myths ORDER BY id ASC LIMIT 1;';
    const wrapRes = await pool.query(wrapQ);
    if (wrapRes.rows.length) return res.json(wrapRes.rows[0]);

    return res.status(404).json({ error: 'no myths found' });
  } catch (err) {
    console.error('/api/myths/next ERROR:', err);
    return res.status(500).json({ error: 'server error' });
  }
});

app.get('/api/myths/random', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, title, "imageUrl" FROM myths ORDER BY RANDOM() LIMIT 1;');
    if (!rows.length) return res.status(404).json({ error: 'no myths found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('GET /api/myths/random err', err);
    res.status(500).json({ error: 'server error' });
  }
});

app.get('/api/myths', async (req, res) => {
  try {
    const { rows: myths } = await pool.query(`
      SELECT m.id, m.title, m.tradition, m.summary, m.tags, m.created_at, m."imageUrl",
        COALESCE(json_agg(DISTINCT jsonb_build_object('id', t.id, 'title', t.title, 'content', t.content))
                 FILTER (WHERE t.id IS NOT NULL), '[]') AS texts,
        COALESCE(json_agg(DISTINCT jsonb_build_object('id', th.id, 'name', th.name))
                 FILTER (WHERE th.id IS NOT NULL), '[]') AS themes
      FROM myths m
      LEFT JOIN myth_texts mt ON mt.myth_id = m.id
      LEFT JOIN texts t ON t.id = mt.text_id
      LEFT JOIN myth_themes mth ON mth.myth_id = m.id
      LEFT JOIN themes th ON th.id = mth.theme_id
      GROUP BY m.id
      ORDER BY m.id;
    `);
    res.json(myths);
  } catch (err) {
    console.error('GET /api/myths err', err);
    res.status(500).json({ error: 'db error' });
  }
});

app.get('/api/myths/:id', async (req, res) => {
  try {
    const rawId = req.params.id;
    if (!/^\d+$/.test(String(rawId))) {
      return res.status(400).json({ error: 'invalid myth id' });
    }
    const id = Number(rawId);

    const { rows } = await pool.query(`
      SELECT m.id, m.title, m.summary, m.tags, m.tradition, m."imageUrl",
        COALESCE(json_agg(DISTINCT th.name) FILTER (WHERE th.name IS NOT NULL), '[]') AS themes
      FROM myths m
      LEFT JOIN myth_themes mt ON mt.myth_id = m.id
      LEFT JOIN themes th ON th.id = mt.theme_id
      WHERE m.id = $1
      GROUP BY m.id
      LIMIT 1;
    `, [id]);

    if (!rows.length) return res.status(404).json({ error: 'myth not found' });
    return res.json(rows[0]);
  } catch (err) {
    console.error('GET /api/myths/:id err', err);
    return res.status(500).json({ error: 'server error' });
  }
});

app.get('/api/sites', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM sites ORDER BY id;');
    res.json(rows);
  } catch (err) {
    console.error('GET /api/sites err', err);
    res.status(500).json({ error: 'db error' });
  }
});
app.post('/api/parallels/suggest', async (req, res) => {
  try {
    const { mythId } = req.body;
    if (!mythId) return res.status(400).json({ error: 'mythId required' });
    const numericId = Number(mythId);
    if (!Number.isFinite(numericId)) return res.status(400).json({ error: 'invalid mythId' });

    // tuning params
    const TITLE_BOOST = 3;
    const MIN_SCORE = 0.035;
    const TOP_K = 12;
    const TITLE_PENALTY_MULT = 0.6;

    const cache = await buildOrGetCache({ titleBoost: TITLE_BOOST });

    const src = cache.idToRow.get(numericId);
    if (!src) return res.status(404).json({ error: 'source myth not found' });
    const sourceRow = src.row;

    // helper: normalize themes to array of lowercase strings
    function extractThemes(row) {
      try {
        if (!row) return [];
        const t = row.themes;
        if (!t) return [];
        if (Array.isArray(t)) return t.map(x => String(x).toLowerCase());
        if (typeof t === 'string') {
          const s = t.trim();
          if (s.startsWith('[')) {
            try {
              const parsed = JSON.parse(s);
              if (Array.isArray(parsed)) return parsed.map(x => String(x).toLowerCase());
            } catch (e) { /* fallthrough */ }
          }
          // fallback: try splitting on commas (defensive)
          return s.split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
        }
        // final fallback
        return [String(t).toLowerCase()];
      } catch (e) {
        return [];
      }
    }

    const sourceThemes = new Set(extractThemes(sourceRow)); // may be empty

    // fetch already-accepted myth_b list for this myth_a to exclude
    const linkedRes = await pool.query('SELECT myth_b FROM parallels WHERE myth_a = $1;', [numericId]);
    const linkedBs = new Set((linkedRes.rows || []).map(r => Number(r.myth_b)).filter(Boolean));

    // Build candidate list: all myths except source and linked
    // **New**: if source has themes, only keep candidates that share at least one theme
    const rawCandidates = cache.mythList.filter(m => {
      const id = Number(m.id);
      return id !== numericId && !linkedBs.has(id);
    });

    let candidates;
    if (sourceThemes.size > 0) {
      candidates = rawCandidates.filter(c => {
        const cThemes = new Set(extractThemes(c));
        for (const t of cThemes) {
          if (sourceThemes.has(t)) return true;
        }
        return false;
      });
      // If theme-restricted pool is empty, fall back to full pool to avoid returning nothing
      if (!candidates.length) candidates = rawCandidates;
    } else {
      // source has no themes — fall back to global candidate set
      candidates = rawCandidates;
    }

    if (!candidates.length) return res.json([]);

    // Build docs: source first, then candidates
    const sourceDoc = buildDocForRow(sourceRow, { titleBoost: TITLE_BOOST });
    const docs = [sourceDoc, ...candidates.map(c => buildDocForRow(c, { titleBoost: TITLE_BOOST }))];

    // TF-IDF
    const tfidf = new natural.TfIdf();
    docs.forEach(d => tfidf.addDocument(d));

    // Convert to term->weight maps
    const termMaps = docs.map((_, i) => {
      const map = Object.create(null);
      tfidf.listTerms(i).forEach(({ term, tfidf: weight }) => {
        map[term] = weight;
      });
      return map;
    });

    function cosine(a = {}, b = {}) {
      let num = 0, aa = 0, bb = 0;
      for (const t in a) {
        const va = a[t] || 0;
        const vb = b[t] || 0;
        num += va * vb;
        aa += va * va;
      }
      for (const t in b) {
        const vb = b[t] || 0;
        bb += vb * vb;
      }
      if (aa === 0 || bb === 0) return 0;
      return num / (Math.sqrt(aa) * Math.sqrt(bb));
    }

    const targetMap = termMaps[0];
    const scored = [];

    const sourceTitleTokens = new Set(preprocessToTokens(sourceRow.title || ''));

    for (let i = 0; i < candidates.length; i++) {
      const cand = candidates[i];
      const map = termMaps[i + 1];
      let score = cosine(targetMap, map);

      const candTitleTokens = new Set(preprocessToTokens(cand.title || ''));
      let sharedTitleCount = 0;
      for (const t of candTitleTokens) if (sourceTitleTokens.has(t)) sharedTitleCount++;
      if (sharedTitleCount > 0) {
        const penaltyThreshold = 0.08;
        if (score < penaltyThreshold) {
          score = score * TITLE_PENALTY_MULT;
        }
      }

      if (sharedTitleCount > 0 && score < (MIN_SCORE * 0.5)) {
        continue;
      }

      if (score && score > 0) {
        scored.push({ score, myth: cand });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    const top = scored.filter(s => s.score >= MIN_SCORE).slice(0, TOP_K);

    const out = top.map(s => {
      const m = s.myth;
      const tags = Array.isArray(m.tags) ? m.tags
        : (typeof m.tags === 'string' && m.tags.trim().startsWith('[') ? JSON.parse(m.tags) : (typeof m.tags === 'string' ? normalizeTags(m.tags).split(' ').filter(Boolean) : []));
      const themes = Array.isArray(m.themes) ? m.themes : (typeof m.themes === 'string' ? (m.themes.trim().startsWith('[') ? JSON.parse(m.themes) : normalizeTags(m.themes).split(',').map(x => x.trim()).filter(Boolean)) : []);
      return {
        score: s.score,
        myth: {
          id: m.id,
          title: m.title,
          tradition: m.tradition || null,
          summary: m.summary || null,
          tags,
          imageUrl: m.imageurl || m.imageUrl || null,
          themes
        }
      };
    });

    return res.json(out);
  } catch (err) {
    console.error('parallels.suggest err', err);
    return res.status(500).json({ error: 'server error' });
  }
});

/* ---------------------- GET accepted parallels ---------------------- */
app.get('/api/parallels', async (req, res) => {
  try {
    const mythId = Number(req.query.mythId);
    if (!Number.isFinite(mythId)) return res.status(400).json({ error: 'mythId required' });

    const { rows } = await pool.query(`
      SELECT p.*,
             mb.id   AS myth_b_id,
             mb.title AS myth_b_title,
             mb.tradition AS myth_b_tradition,
             mb.summary AS myth_b_summary,
             mb.tags AS myth_b_tags,
             mb."imageUrl" AS myth_b_imageUrl
      FROM parallels p
      JOIN myths mb ON mb.id = p.myth_b
      WHERE p.myth_a = $1
      ORDER BY p.id DESC;
    `, [mythId]);

    const mapped = rows.map(r => {
      let mbTags = [];
      try {
        if (Array.isArray(r.myth_b_tags)) mbTags = r.myth_b_tags;
        else if (typeof r.myth_b_tags === 'string' && r.myth_b_tags.trim().startsWith('[')) {
          mbTags = JSON.parse(r.myth_b_tags);
        } else if (typeof r.myth_b_tags === 'string' && r.myth_b_tags.startsWith('{') && r.myth_b_tags.endsWith('}')) {
          mbTags = r.myth_b_tags.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean);
        }
      } catch {}
      return {
        myth: {
          id: Number(r.myth_b_id),
          title: r.myth_b_title,
          tradition: r.myth_b_tradition,
          summary: r.myth_b_summary,
          tags: mbTags,
          imageUrl: r.myth_b_imageurl || r.myth_b_imageUrl || null
        },
        normalizedScore: r.score ?? null,
        rationale: r.rationale ?? '',
        detectedBy: r.detected_by ?? 'human',
        targetId: mythId,
        savedRow: r,
      };
    });

    return res.json(mapped);
  } catch (err) {
    console.error('GET /api/parallels err', err);
    return res.status(500).json({ error: 'server error' });
  }
});

/* ---------------------- Insert parallel (returns normalized saved object) ---------------------- */
app.post('/api/parallels', async (req, res) => {
  try {
    let { mythA, mythB, score = null, rationale = null, detectedBy = 'human' } = req.body;

    mythA = Number(mythA);
    mythB = Number(mythB);

    if (!Number.isFinite(mythA) || !Number.isFinite(mythB)) {
      return res.status(400).json({ error: 'mythA and mythB must be valid numeric ids' });
    }
    if (mythA === mythB) return res.status(400).json({ error: 'cannot link myth to itself' });

    const insertSql = `
      INSERT INTO parallels (myth_a, myth_b, score, rationale, detected_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const { rows } = await pool.query(insertSql, [mythA, mythB, score, rationale, detectedBy]);
    if (!rows.length) throw new Error('Insert failed');

    const saved = rows[0];

    // Clear suggest cache — so new suggestions reflect the saved parallel
    SUGGEST_CACHE.value = null;

    // fetch myth_a and myth_b metadata for normalized response
    const metasQ = `
      SELECT id, title, summary, tradition, tags, "imageUrl"
      FROM myths
      WHERE id = ANY($1)
    `;
    const { rows: metas } = await pool.query(metasQ, [[mythA, mythB]]);
    const metaById = new Map(metas.map(m => [Number(m.id), m]));

    const payload = {
      savedRow: saved,
      myth_a: mythA,
      myth_b: mythB,
      myth: {
        a: metaById.get(mythA) ? {
          id: Number(metaById.get(mythA).id),
          title: metaById.get(mythA).title,
          tradition: metaById.get(mythA).tradition || null,
          summary: metaById.get(mythA).summary || null,
          tags: Array.isArray(metaById.get(mythA).tags) ? metaById.get(mythA).tags : (typeof metaById.get(mythA).tags === 'string' && metaById.get(mythA).tags.trim().startsWith('[') ? JSON.parse(metaById.get(mythA).tags) : (metaById.get(mythA).tags ? normalizeTags(metaById.get(mythA).tags).split(' ').filter(Boolean) : [])),
          imageUrl: metaById.get(mythA).imageurl || metaById.get(mythA).imageUrl || null
        } : null,
        b: metaById.get(mythB) ? {
          id: Number(metaById.get(mythB).id),
          title: metaById.get(mythB).title,
          tradition: metaById.get(mythB).tradition || null,
          summary: metaById.get(mythB).summary || null,
          tags: Array.isArray(metaById.get(mythB).tags) ? metaById.get(mythB).tags : (typeof metaById.get(mythB).tags === 'string' && metaById.get(mythB).tags.trim().startsWith('[') ? JSON.parse(metaById.get(mythB).tags) : (metaById.get(mythB).tags ? normalizeTags(metaById.get(mythB).tags).split(' ').filter(Boolean) : [])),
          imageUrl: metaById.get(mythB).imageurl || metaById.get(mythB).imageUrl || null
        } : null
      }
    };

    return res.status(201).json(payload);
  } catch (err) {
    console.error('POST /api/parallels error', err);
    return res.status(500).json({ error: 'server error' });
  }
});

/* ---------------------- Themes endpoints (kept intact) ---------------------- */

app.get('/api/themes', async (req, res) => {
  try {
    const q = `
      SELECT th.id,
             th.name,
             COALESCE(NULLIF(TRIM(th.slug), ''), lower(th.name)) AS slug,
             th.description,
             COUNT(mt.myth_id) AS myth_count
      FROM themes th
      LEFT JOIN myth_themes mt ON mt.theme_id = th.id
      GROUP BY th.id, th.name, th.slug, th.description
      ORDER BY myth_count DESC, th.name;
    `;
    const { rows } = await pool.query(q);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/themes err', err);
    res.status(500).json({ error: 'db error' });
  }
});

app.get('/api/themes/:slug/myths', async (req, res) => {
  try {
    const raw = String(req.params.slug || '').trim().toLowerCase();
    if (!raw) return res.status(400).json({ error: 'slug required' });

    const q = `
      SELECT m.id, m.title, m.summary, m.tradition, m.tags, m."imageUrl"
      FROM themes th
      JOIN myth_themes mt ON mt.theme_id = th.id
      JOIN myths m ON m.id = mt.myth_id
      WHERE lower(COALESCE(th.slug, th.name)) = $1
      ORDER BY m.id;
    `;
    const { rows } = await pool.query(q, [raw]);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/themes/:slug/myths err', err);
    res.status(500).json({ error: 'db error' });
  }
});

app.get('/api/myths/:id/themes', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid myth id' });

    const q = `
      SELECT th.id,
             th.name,
             COALESCE(NULLIF(TRIM(th.slug), ''), lower(th.name)) AS slug,
             th.description
      FROM myth_themes mt
      JOIN themes th ON th.id = mt.theme_id
      WHERE mt.myth_id = $1
      ORDER BY th.name;
    `;
    const { rows } = await pool.query(q, [id]);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/myths/:id/themes err', err);
    res.status(500).json({ error: 'db error' });
  }
});

/* ---------------------- Server boot & graceful shutdown ---------------------- */

const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

function shutdown(signal) {
  console.log('Received', signal, 'shutting down gracefully...');
  server.close(async () => {
    try {
      await pool.end();
      console.log('Pool ended, exiting.');
      process.exit(0);
    } catch (e) {
      console.error('Error during pool.end', e);
      process.exit(1);
    }
  });
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
