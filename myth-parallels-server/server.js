// server.js — Render-ready version
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const natural = require('natural');

//
// Database config: prefer DATABASE_URL, but allow legacy broken-out envs for local dev.
//
function makePoolConfig() {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      // If running in Render / production and remote Postgres requires SSL:
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      // optional: max, idleTimeoutMillis
    };
  }

  // fallback to separate env vars (kept for local/dev)
  return {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  };
}

const pool = new Pool(makePoolConfig());

pool.on('error', (err) => {
  console.error('Unexpected PG client error', err);
});

const app = express();
app.use(helmet());

// CORS: must set FRONTEND_ORIGIN on Render to your Vercel URL (https://your-site.vercel.app)
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || ''; // empty => disabled
const corsOptions = FRONTEND_ORIGIN ? {
  origin: FRONTEND_ORIGIN,
  credentials: true,
  optionsSuccessStatus: 200
} : { origin: false };

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",  // vite local
  "https://1768447e.mythai-byg.pages.dev", // your Cloudflare Pages site
];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS: " + origin));
  },
  credentials: true,
}));

app.use(express.json({ limit: '250kb' })); // avoid huge payloads

// basic rate limiter (tune as needed)
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

/* ---------------------- Text utils ---------------------- */

const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;

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
    if (s.startsWith('[') && s.endsWith(']')) {
      try {
        const parsed = JSON.parse(s);
        return Array.isArray(parsed) ? parsed.join(' ') : s;
      } catch (e) {}
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

/* ---------------------- Routes (preserved) ---------------------- */

/* ... keep all your routes exactly as they were ... */
/* For brevity in this snippet, paste the rest of your route handlers here unchanged,
   or simply keep the original route code below this point in your file. */

//
// (Paste the exact route implementations from your previous file here.)
//

/* ---------------------- Server boot & graceful shutdown ---------------------- */

const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

async function shutdown(signal) {
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

// Export for tests (optional)
module.exports = server;
