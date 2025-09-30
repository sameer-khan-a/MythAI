// server.js — final Render-ready backend with improved parallels.suggest
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const natural = require('natural');

/* ---------------------- Database config ---------------------- */
function makePoolConfig() {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    };
  }
  return {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  };
}
const pool = new Pool(makePoolConfig());
pool.on('error', (err) => console.error('Unexpected PG client error', err));

/* ---------------------- Express setup ---------------------- */
const app = express();
app.use(helmet());

app.use(cors({
  origin: '*',
  credentials: false
}));

app.use(express.json({ limit: '250kb' }));

// rate limiting
const limiter = rateLimit({
  windowMs: 10 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// error logging
process.on('unhandledRejection', (reason, p) => {
  console.error('UNHANDLED REJECTION at Promise', p, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION', err);
});

/* ---------------------- Utility functions ---------------------- */
const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;
const STOPWORDS = new Set(['the','and','for','a','an','of','in','on','to','is','are','that','this','with','as','by','from','it','its','be','was','were','which','or','but']);
const ENTITY_STOPWORDS = new Set(['jesus','christ','moses','krishna','buddha','zeus','apollo','muhammad','allah','odin','thor','ra','ishvara']); // extend as needed

function normalizeTags(tags) {
  if (!tags) return '';
  if (Array.isArray(tags)) return tags.join(' ');
  if (typeof tags === 'string') {
    const s = tags.trim();
    if (s.startsWith('[') && s.endsWith(']')) {
      try { const parsed = JSON.parse(s); return Array.isArray(parsed) ? parsed.join(' ') : s; } catch {}
    }
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
  return tokenizer.tokenize(raw)
    .map(t => t.replace(/[^a-z0-9]/g, ''))
    .filter(t => t && t.length > 2 && !STOPWORDS.has(t) && !ENTITY_STOPWORDS.has(t))
    .map(t => stemmer.stem(t));
}
function preprocessToString(text) {
  return preprocessToTokens(text).join(' ');
}
function safeSlice(s, max) {
  if (!s) return '';
  return s.length > max ? s.slice(0, max) : s;
}
function buildDocForRow(row, opts = { titleBoost: 2 }) {
  const title = String(row.title || '');
  const summary = safeSlice(String(row.summary || ''), 2000);
  const content = safeSlice(String(row.content || ''), 2000);
  const tags = normalizeTags(row.tags || '');
  const titlePart = Array(Math.max(1, opts.titleBoost)).fill(preprocessToString(title)).join(' ');
  return `${titlePart} ${preprocessToString(summary)} ${preprocessToString(content)} ${preprocessToString(tags)}`.trim();
}

/* ---------------------- Suggest cache ---------------------- */
const SUGGEST_CACHE = { value: null, ttlMs: 1000 * 60 * 5 };
async function buildOrGetCache(opts = { titleBoost: 2 }) {
  const now = Date.now();
  if (SUGGEST_CACHE.value && (now - SUGGEST_CACHE.value.ts < SUGGEST_CACHE.ttlMs)) return SUGGEST_CACHE.value;

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

/* ---------------------- Helper functions for suggester ---------------------- */
function ngramsFromTokens(tokens, n = 2) {
  const out = [];
  for (let i = 0; i + n - 1 < tokens.length; i++) {
    out.push(tokens.slice(i, i + n).join(' '));
  }
  return out;
}
function toSet(arr) {
  return new Set(Array.isArray(arr) ? arr : []);
}
function intersectionSize(aSet, bSet) {
  if (!aSet || !bSet) return 0;
  let c = 0;
  for (const x of aSet) if (bSet.has(x)) c++;
  return c;
}
function unionSize(aSet, bSet) {
  const u = new Set();
  for (const x of aSet) u.add(x);
  for (const x of bSet) u.add(x);
  return u.size;
}
function jaccard(aSet, bSet) {
  const u = unionSize(aSet, bSet);
  if (u === 0) return 0;
  return intersectionSize(aSet, bSet) / u;
}

/* ---------------------- Routes ---------------------- */
// health
app.get('/health', (req, res) => res.json({ ok: true, db: !!pool ? 'connected' : 'unknown', ts: Date.now() }));
app.post('/admin/rebuild-suggest-cache', async (req, res) => {
  try { SUGGEST_CACHE.value = null; const cache = await buildOrGetCache(); res.json({ rebuilt: true, docs: cache.docs.length }); }
  catch (err) { console.error('rebuild-suggest err', err); res.status(500).json({ error: 'rebuild failed' }); }
});

// ---- Myths ----
app.get('/api/myths/next', async (req, res) => {
  const currentId = Number(req.query.currentId);
  if (!Number.isFinite(currentId)) return res.status(400).json({ error: 'currentId required' });
  try {
    const nextRes = await pool.query('SELECT id, title, "imageUrl" FROM myths WHERE id > $1 ORDER BY id ASC LIMIT 1;', [currentId]);
    if (nextRes.rows.length) return res.json(nextRes.rows[0]);
    const wrapRes = await pool.query('SELECT id, title, "imageUrl" FROM myths ORDER BY id ASC LIMIT 1;');
    if (wrapRes.rows.length) return res.json(wrapRes.rows[0]);
    return res.status(404).json({ error: 'no myths found' });
  } catch (err) { res.status(500).json({ error: 'server error' }); }
});
app.get('/api/myths/random', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, title, "imageUrl" FROM myths ORDER BY RANDOM() LIMIT 1;');
    if (!rows.length) return res.status(404).json({ error: 'no myths found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'server error' }); }
});
app.get('/api/myths', async (req, res) => {
  try {
    const { rows } = await pool.query(`
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
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'db error' }); }
});
app.get('/api/myths/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid myth id' });
    const { rows } = await pool.query(`
      SELECT m.id, m.title, m.summary, m.tags, m.tradition, m."imageUrl",
        COALESCE(json_agg(DISTINCT th.name) FILTER (WHERE th.name IS NOT NULL), '[]') AS themes
      FROM myths m
      LEFT JOIN myth_themes mt ON mt.myth_id = m.id
      LEFT JOIN themes th ON th.id = mt.theme_id
      WHERE m.id = $1
      GROUP BY m.id LIMIT 1;`, [id]);
    if (!rows.length) return res.status(404).json({ error: 'myth not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'server error' }); }
});
app.get('/api/myths/:id/themes', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid myth id' });
    const { rows } = await pool.query(`
      SELECT th.id, th.name, COALESCE(NULLIF(TRIM(th.slug), ''), lower(th.name)) AS slug, th.description
      FROM myth_themes mt JOIN themes th ON th.id = mt.theme_id
      WHERE mt.myth_id = $1 ORDER BY th.name;`, [id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'db error' }); }
});

// ---- Sites ----
app.get('/api/sites', async (req, res) => {
  try { const { rows } = await pool.query('SELECT * FROM sites ORDER BY id;'); res.json(rows); }
  catch (err) { res.status(500).json({ error: 'db error' }); }
});

// ---- Themes ----
app.get('/api/themes', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT th.id, th.name, COALESCE(NULLIF(TRIM(th.slug), ''), lower(th.name)) AS slug, th.description,
             COUNT(mt.myth_id) AS myth_count
      FROM themes th LEFT JOIN myth_themes mt ON mt.theme_id = th.id
      GROUP BY th.id, th.name, th.slug, th.description
      ORDER BY myth_count DESC, th.name;`);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'db error' }); }
});
app.get('/api/themes/:slug/myths', async (req, res) => {
  try {
    const raw = String(req.params.slug || '').trim().toLowerCase();
    if (!raw) return res.status(400).json({ error: 'slug required' });
    const { rows } = await pool.query(`
      SELECT m.id, m.title, m.summary, m.tradition, m.tags, m."imageUrl"
      FROM themes th JOIN myth_themes mt ON mt.theme_id = th.id
      JOIN myths m ON m.id = mt.myth_id
      WHERE lower(COALESCE(th.slug, th.name)) = $1 ORDER BY m.id;`, [raw]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'db error' }); }
});

// ---- Parallels ----
app.get('/api/parallels', async (req, res) => {
  try {
    const mythId = Number(req.query.mythId);
    if (!Number.isFinite(mythId)) return res.status(400).json({ error: 'mythId required' });
    const { rows } = await pool.query(`
      SELECT p.*, mb.id AS myth_b_id, mb.title AS myth_b_title, mb.tradition AS myth_b_tradition,
             mb.summary AS myth_b_summary, mb.tags AS myth_b_tags, mb."imageUrl" AS myth_b_imageUrl
      FROM parallels p JOIN myths mb ON mb.id = p.myth_b
      WHERE p.myth_a = $1 ORDER BY p.id DESC;`, [mythId]);
    res.json(rows.map(r => ({
      myth: {
        id: Number(r.myth_b_id),
        title: r.myth_b_title,
        tradition: r.myth_b_tradition,
        summary: r.myth_b_summary,
        tags: r.myth_b_tags,
        imageUrl: r.myth_b_imageurl || r.myth_b_imageUrl || null
      },
      normalizedScore: r.score ?? null,
      rationale: r.rationale ?? '',
      detectedBy: r.detected_by ?? 'human',
      targetId: mythId,
      savedRow: r,
    })));
  } catch (err) { res.status(500).json({ error: 'server error' }); }
});
app.post('/api/parallels', async (req, res) => {
  try {
    let { mythA, mythB, score = null, rationale = null, detectedBy = 'human' } = req.body;
    mythA = Number(mythA); mythB = Number(mythB);
    if (!Number.isFinite(mythA) || !Number.isFinite(mythB)) return res.status(400).json({ error: 'invalid ids' });
    if (mythA === mythB) return res.status(400).json({ error: 'cannot link myth to itself' });
    const { rows } = await pool.query(`
      INSERT INTO parallels (myth_a, myth_b, score, rationale, detected_by)
      VALUES ($1,$2,$3,$4,$5) RETURNING *;`, [mythA, mythB, score, rationale, detectedBy]);
    if (!rows.length) throw new Error('Insert failed');
    SUGGEST_CACHE.value = null;
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'server error' }); }
});
app.post('/api/parallels/suggest', async (req, res) => {
  try {
    const { mythId } = req.body;
    const numericId = Number(mythId);
    if (!Number.isFinite(numericId)) return res.status(400).json({ error: 'invalid mythId' });

    // tuning params (tweak these to taste)
    const TITLE_BOOST = 3;
    const MIN_SCORE = 0.035;     // base threshold for non-theme matches
    const TOP_K = 12;
    const THEME_AUTO_ACCEPT = 2; // if >= this many shared themes, auto qualify

    // domain / motif keywords (stemmed) to boost meaningful domain similarity
    const KEYWORD_GROUP = [
      'birth','born','nativity','miracl','miraculous','conception','found','founder','origin','resurrect','resurrecti','divin','prophet','savior','sacrifice'
    ].map(w => stemmer.stem(w));

    // Build cache (docs + metadata)
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
          return s.split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
        }
        return [String(t).toLowerCase()];
      } catch (e) { return []; }
    }

    const sourceThemes = new Set(extractThemes(sourceRow));

    // exclude already-linked myths
    const linkedRes = await pool.query('SELECT myth_b FROM parallels WHERE myth_a = $1;', [numericId]);
    const linkedBs = new Set((linkedRes.rows || []).map(r => Number(r.myth_b)).filter(Boolean));

    // Build candidate pool (exclude source & linked)
    const rawCandidates = cache.mythList.filter(m => {
      const id = Number(m.id);
      return id !== numericId && !linkedBs.has(id);
    });

    // If source has themes, prioritize candidates that share at least one theme (fallback to full pool)
    let prioritizedCandidates;
    if (sourceThemes.size > 0) {
      prioritizedCandidates = rawCandidates.filter(c => {
        const cThemes = new Set(extractThemes(c));
        for (const t of cThemes) if (sourceThemes.has(t)) return true;
        return false;
      });
      if (!prioritizedCandidates.length) prioritizedCandidates = rawCandidates;
    } else {
      prioritizedCandidates = rawCandidates;
    }

    if (!prioritizedCandidates.length) return res.json([]);

    // Build TF-IDF docs (source first)
    const sourceDoc = buildDocForRow(sourceRow, { titleBoost: TITLE_BOOST });
    const docs = [ sourceDoc, ...prioritizedCandidates.map(c => buildDocForRow(c, { titleBoost: TITLE_BOOST })) ];
    const tfidf = new natural.TfIdf();
    docs.forEach(d => tfidf.addDocument(d));

    // term maps (term -> weight) for cosine
    const termMaps = docs.map((_, i) => {
      const map = Object.create(null);
      tfidf.listTerms(i).forEach(({ term, tfidf: w }) => { map[term] = w; });
      return map;
    });

    function cosine(a = {}, b = {}) {
      let num = 0, aa = 0, bb = 0;
      for (const t in a) { const va = a[t] || 0; const vb = b[t] || 0; num += va * vb; aa += va * va; }
      for (const t in b) { const vb = b[t] || 0; bb += vb * vb; }
      if (aa === 0 || bb === 0) return 0;
      return num / (Math.sqrt(aa) * Math.sqrt(bb));
    }

    // helper: token sets / bigram sets for source
    const sourceAllText = `${sourceRow.title || ''} ${sourceRow.summary || ''} ${sourceRow.content || ''}`;
    const srcTokens = preprocessToTokens(sourceAllText);
    const srcTokenSet = toSet(srcTokens);
    const srcBigrams = ngramsFromTokens(srcTokens, 2);
    const srcBigramSet = toSet(srcBigrams);

    // scoring loop
    const scored = [];
    for (let i = 0; i < prioritizedCandidates.length; i++) {
      const cand = prioritizedCandidates[i];
      const map = termMaps[i + 1];
      let baseScore = cosine(termMaps[0], map); // 0..1

      // additional lexical overlap features
      const candAllText = `${cand.title || ''} ${cand.summary || ''} ${cand.content || ''}`;
      const candTokens = preprocessToTokens(candAllText);
      const candTokenSet = toSet(candTokens);
      const candBigrams = ngramsFromTokens(candTokens, 2);
      const candBigramSet = toSet(candBigrams);

      // bigram jaccard (captures exact phrase overlap like "miraculous birth")
      const bigramJacc = jaccard(srcBigramSet, candBigramSet);

      // unigram jaccard (smaller signal)
      const unigramJacc = jaccard(srcTokenSet, candTokenSet);

      // title overlap count (to detect cheap matches)
      const srcTitleTokens = toSet(preprocessToTokens(String(sourceRow.title || '')));
      const candTitleTokens = toSet(preprocessToTokens(String(cand.title || '')));
      const sharedTitleCount = intersectionSize(srcTitleTokens, candTitleTokens);

      // shared theme count
      const candThemes = new Set(extractThemes(cand));
      const sharedThemeCount = intersectionSize(sourceThemes, candThemes);

      // shared domain keywords (stemmed)
      let sharedKeywordCount = 0;
      for (const kw of KEYWORD_GROUP) {
        if (srcTokenSet.has(kw) && candTokenSet.has(kw)) sharedKeywordCount++;
      }

      // compose final score: base cosine scaled by evidence multipliers
      // theme evidence is most important; bigram phrase overlap is next; keywords add confirmatory signal
      const themeBoost = Math.min(sharedThemeCount, 3) * 0.45;        // up to ~1.35 boost
      const bigramBoost = bigramJacc * 1.1;                          // normalized 0..1.1
      const unigramBoost = unigramJacc * 0.35;                       // small boost
      const keywordBoost = Math.min(sharedKeywordCount, 3) * 0.5;    // up to 1.5
      const titlePenalty = (sharedTitleCount > 0 && baseScore < 0.08) ? 0.6 : 1.0; // penalize low-scoring title-shares

      let finalScore = baseScore * (1 + themeBoost + bigramBoost + unigramBoost + keywordBoost);
      finalScore = finalScore * titlePenalty;

      // Decide qualification:
      // - if they share >= THEME_AUTO_ACCEPT themes, auto-qualify (but still rank by finalScore)
      // - otherwise require finalScore >= MIN_SCORE
      const autoAccept = sharedThemeCount >= THEME_AUTO_ACCEPT;
      if (autoAccept || finalScore >= MIN_SCORE) {
        scored.push({
          score: finalScore,
          raw: {
            baseScore,
            sharedThemeCount,
            bigramJacc,
            unigramJacc,
            sharedKeywordCount,
            sharedTitleCount,
            title: cand.title,
            id: cand.id
          },
          myth: cand
        });
      }
    }

    // sort and return top-K, normalized payload
    scored.sort((a, b) => b.score - a.score);
    const out = scored.slice(0, TOP_K).map(s => {
      const m = s.myth;
      const tags = Array.isArray(m.tags) ? m.tags
        : (typeof m.tags === 'string' && m.tags.trim().startsWith('[') ? JSON.parse(m.tags) : (typeof m.tags === 'string' ? normalizeTags(m.tags).split(' ').filter(Boolean) : []));
      const themes = Array.isArray(m.themes) ? m.themes : (typeof m.themes === 'string' ? (m.themes.trim().startsWith('[') ? JSON.parse(m.themes) : normalizeTags(m.themes).split(',').map(x => x.trim()).filter(Boolean)) : []);
      return {
        score: s.score,
        rationale: s.raw,
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

/* ---------------------- Boot ---------------------- */
const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
function shutdown(signal) {
  console.log('Received', signal, 'shutting down gracefully...');
  server.close(async () => { try { await pool.end(); process.exit(0); } catch { process.exit(1); } });
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
