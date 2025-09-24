// src/Home.jsx
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

function truncate(text = '', n = 140) {
  if (!text) return '';
  return text.length > n ? text.slice(0, n - 1) + '…' : text;
}

export default function Home() {
  const [myths, setMyths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [q, setQ] = useState('');
  const [tradition, setTradition] = useState('all');
  const [sortBy, setSortBy] = useState('id');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetch(`${API}/api/myths`)
      .then(r => {
        if (!r.ok) throw new Error(`Fetch failed ${r.status}`);
        return r.json();
      })
      .then(data => {
        if (!mounted) return;
        setMyths(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        if (!mounted) return;
        setError('Could not load myths.');
        setLoading(false);
      });
    return () => (mounted = false);
  }, []);

  const traditions = useMemo(() => {
    const s = new Set();
    myths.forEach(m => {
      if (m.tradition) s.add(m.tradition);
    });
    return ['all', ...Array.from(s)];
  }, [myths]);

  const filtered = useMemo(() => {
    let list = myths.slice();
    if (tradition !== 'all') {
      list = list.filter(m => (m.tradition || '').toLowerCase() === (tradition || '').toLowerCase());
    }
    if (q.trim()) {
      const qq = q.toLowerCase();
      list = list.filter(m =>
        String(m.title || '').toLowerCase().includes(qq) ||
        String(m.summary || '').toLowerCase().includes(qq) ||
        (Array.isArray(m.tags) ? m.tags.join(' ') : String(m.tags || '')).toLowerCase().includes(qq)
      );
    }
    if (sortBy === 'title') list.sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')));
    else list.sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
    return list;
  }, [myths, q, tradition, sortBy]);

  return (
    <div className="container py-4">
      {/* Theme styles local to this component */}
      <style>{`
        /* papyrus background and parchment cards */
        .papyrus-bg {
          background-image:
            linear-gradient(transparent 0 40%, rgba(0,0,0,0.01) 40%),
            radial-gradient(circle at 10% 10%, rgba(0,0,0,0.02), transparent 30%),
            linear-gradient(90deg, rgba(235,223,190,0.6), rgba(245,238,220,0.6));
          background-color: #FFC857;
        }
        .stone-header {
          background: linear-gradient(180deg, #efe7d3 0%, #e6dcc4 100%);
          border-radius: 6px;
          font-family: Georgia, "Times New Roman", serif;
          box-shadow: inset 0 -8px 10px rgba(0,0,0,0.05);
          padding: 6px 10px;
        }
        .card-arch {
          background: linear-gradient(180deg, rgba(255,255,255,0.92), rgba(250,245,235,0.9));
          border: 1px solid rgba(0,0,0,0.06);
          border-radius: 8px;
        }
        .artifact-badge {
          background: rgba(34, 30, 19, 0.07);
          color: #2b2a25;
          border: 1px solid rgba(34,30,19,0.06);
          font-family: Georgia, "Times New Roman", serif;
        }
        .card-thumb {
          width: 64px;
          height: 64px;
          border-radius: 6px;
          background: linear-gradient(180deg,#efe0c2,#e3d0ad);
          display:flex;
          align-items:center;
          justify-content:center;
          font-weight:700;
          font-family: Georgia, "Times New Roman", serif;
          color:#5a4326;
        }
        @media (min-width: 768px) {
          .card-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
        }
        @media (min-width: 992px) {
          .card-grid { grid-template-columns: repeat(3, 1fr); }
        }
      `}</style>

      <div className="papyrus-bg p-3 rounded mb-4">
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <h2 className="h3 mb-1" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              🏺 Explore Myths — Flood Cycle Exhibit
            </h2>
            <div className="small text-muted">Curated parallels & suggested analogues across traditions</div>
          </div>

          <div className="text-end">
            <div className="stone-header small text-muted">Catalogue: {myths.length}</div>
          </div>
        </div>

        <div className="row mt-3 gy-2">
          <div className="col-md-6">
            <div className="input-group">
              <span className="input-group-text artifact-badge" aria-hidden>📜</span>
              <input
                className="form-control"
                placeholder="Search title, summary, tags (e.g. 'boat' or 'flood')"
                value={q}
                onChange={e => setQ(e.target.value)}
                aria-label="Search myths"
              />
              <select
                className="form-select"
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                aria-label="Sort myths"
                style={{ maxWidth: 140 }}
              >
                <option value="id">Sort: id</option>
                <option value="title">Sort: title</option>
              </select>
            </div>
          </div>

          <div className="col-md-6 text-md-end mt-2 mt-md-0">
            <div className="btn-group" role="group" aria-label="filters">
              <select className="form-select" value={tradition} onChange={e => setTradition(e.target.value)} style={{ minWidth: 200 }}>
                {traditions.map(t => (
                  <option key={t} value={t}>{t === 'all' ? 'All traditions' : t}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-secondary" role="status" aria-hidden></div>
          <div className="mt-2 text-muted small">Cataloguing artifacts…</div>
        </div>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : (
        <>
          <div className="mb-3 d-flex justify-content-between align-items-center">
            <div className="small text-muted">Showing <strong>{filtered.length}</strong> of <strong>{myths.length}</strong></div>
            <div className="small text-muted">Tip: click a card to inspect parallels</div>
          </div>

          <div className="card-grid">
            {filtered.map(m => (
              <Link key={m.id} to={`/myth/${m.id}`} className="text-decoration-none">
                <article className="card card-arch p-3" aria-labelledby={`myth-${m.id}-title`}>
                  <div className="d-flex align-items-start">
                    <div className="me-3 card-thumb" aria-hidden>
                      {/* short monogram from title */}
                      {String(m.title || '—').split(' ').slice(0,2).map(w => w[0]).join('').slice(0,2)}
                    </div>

                    <div className="flex-grow-1">
                      <h3 id={`myth-${m.id}-title`} className="h6 mb-1 text-dark" style={{ fontFamily: 'Georgia, serif' }}>{m.title}</h3>
                      <div className="small text-muted mb-2">{m.tradition || 'Unknown tradition'}</div>
                      <p className="small text-muted mb-2" style={{ lineHeight: 1.35 }}>{truncate(m.summary, 150)}</p>

                      <div className="d-flex flex-wrap align-items-center">
                        {(Array.isArray(m.tags) ? m.tags : String(m.tags || '').replace(/^\{|\}$/g, '').split(',').filter(Boolean)).slice(0,6).map((t, i) => (
                          <span key={t + i} className="badge artifact-badge me-1 mb-1 small">{t.trim()}</span>
                        ))}
                        <span className="ms-auto small text-muted">ID {m.id}</span>
                      </div>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-4 text-muted">No myths match your filters — try clearing search or choosing “All traditions”.</div>
          )}
        </>
      )}
    </div>
  );
}
