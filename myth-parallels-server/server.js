// server.js — final Render-ready backend with all routes
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

// allow frontend origin(s)
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.FRONTEND_ORIGIN // e.g. https://your-cloudflare.pages.dev
].filter(Boolean);

app.use(cors({
  origin: function (origin, cb) {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS: ' + origin));
  }
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
const ENTITY_STOPWORDS = new Set(['jesus','christ','moses','krishna','buddha','zeus','apollo']);

function normalizeTags(tags) {
  if (!tags) return '';
  if (Array.isArray(tags)) return tags.join(' ');
  if (typeof tags === 'string') {
    const s = tags.trim();
    if (s.startsWith('[') && s.endsWith(']')) {
      try {
        const parsed = JSON.parse(s);
        return Array.isArray(parsed) ? parsed.join(' ') : s;
      } catch {}
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
  const titlePart = Array(Math.max(1, opts.titleBoost))
    .fill(preprocessToString(title))
    .join(' ');
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

/* ---------------------- Routes ---------------------- */
// health
app.get('/health', (req, res) => res.json({ ok: true, db: !!pool ? 'connected' : 'unknown', ts: Date.now() }));
app.post('/admin/rebuild-suggest-cache', async (req, res) => {
  try { SUGGEST_CACHE.value = null; const cache = await buildOrGetCache(); res.json({ rebuilt: true, docs: cache.docs.length }); }
  catch (err) { res.status(500).json({ error: 'rebuild failed' }); }
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

    const cache = await buildOrGetCache({ titleBoost: 3 });
    const src = cache.idToRow.get(numericId);
    if (!src) return res.status(404).json({ error: 'source myth not found' });
    const sourceDoc = buildDocForRow(src.row, { titleBoost: 3 });
    const candidates = cache.mythList.filter(m => m.id !== numericId);
    if (!candidates.length) return res.json([]);
    const docs = [sourceDoc, ...candidates.map(c => buildDocForRow(c, { titleBoost: 3 }))];
    const tfidf = new natural.TfIdf();
    docs.forEach(d => tfidf.addDocument(d));
    const termMaps = docs.map((_, i) => {
      const map = Object.create(null);
      tfidf.listTerms(i).forEach(({ term, tfidf: w }) => { map[term] = w; });
      return map;
    });
    function cosine(a, b) {
      let num=0,aa=0,bb=0;
      for (const t in a) { num += (a[t]||0)*(b[t]||0); aa += (a[t]||0)**2; }
      for (const t in b) { bb += (b[t]||0)**2; }
      if (!aa || !bb) return 0;
      return num/(Math.sqrt(aa)*Math.sqrt(bb));
    }
    const scored = candidates.map((c,i) => ({ score: cosine(termMaps[0], termMaps[i+1]), myth: c }));
    scored.sort((a,b)=>b.score-a.score);
    res.json(scored.slice(0,10));
  } catch (err) { res.status(500).json({ error: 'server error' }); }
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
