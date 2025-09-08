// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/myths', async (req, res) => {
  try {
    const { rows: myths } = await pool.query(`
      SELECT m.id, m.title, m.tradition, m.summary, m.tags, m.created_at,
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
    console.error(err);
    res.status(500).json({ error: 'db error' });
  }
});

app.get('/api/sites', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM sites ORDER BY id;');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'db error' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
