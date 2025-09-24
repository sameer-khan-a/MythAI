// src/MythHome.jsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ChromaGrid from './assets/Bits/ChromaGrid';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

// Fixed slug → image mapping (your manual order)
const THEME_IMAGES = {
  "avatar-advent": "/images/avatar.png",
  "deliverance": "/images/deliverance.png",
  "cosmic-cycle": "/images/cosmic-cycle.png",
  "end-times": "/images/endtimes.png",
  "prophecy": "/images/prophacy.png",
  "savior-figure": "/images/savior.png",
  "betrayal": "/images/betrayal.png",
  "creation": "/images/creation.png",
  "exile": "/images/exile.png",
  "flood": "/images/flood.png",
  "miraculous-birth": "/images/birth.png",
  "mountain-revelation": "/images/mountain.png",
  "persecution": "/images/persecution.png"
};

// fallback placeholder
const PLACEHOLDER = "/images/avatar.png";

function slugOf(th) {
  if (!th) return '';
  if (th.slug) return String(th.slug).toLowerCase();
  return String(th.name || '').trim().toLowerCase().replace(/\s+/g, '-');
}

function isAbrahamic(tradition) {
  if (!tradition) return false;
  const t = String(tradition).toLowerCase();
  return (
    t.includes('abrahamic') ||
    t.includes('hebrew') ||
    t.includes('judeo') ||
    t.includes('christian') ||
    t.includes('islam')
  );
}

export default function MythHome() {
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const ac = new AbortController();
    async function fetchThemes() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API}/api/themes`, { signal: ac.signal });
        if (!res.ok) throw new Error(`Fetch failed ${res.status}`);
        const data = await res.json();
        setThemes(Array.isArray(data) ? data : []);
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error('GET /api/themes error', err);
        setError('Could not load themes. Try refreshing or check your API.');
        setThemes([]);
      } finally {
        setLoading(false);
      }
    }
    fetchThemes();
    return () => ac.abort();
  }, []);

  const chromaItems = useMemo(() => {
    return themes.map((th) => {
      const slug = th.slug || slugOf(th);
      const ab = isAbrahamic(th.tradition);

      // Prefer API imageUrl > manual map > fallback
      const imageFromApi = th?.imageUrl ? String(th.imageUrl).trim() : '';
      const mappedImage = THEME_IMAGES[slug] || '';
      const image = imageFromApi || mappedImage || PLACEHOLDER;

      const subtitleSource = th?.description || '';
      const subtitle = subtitleSource ? String(subtitleSource).slice(0, 120) : '';

      return {
        image,
        alt: th?.name ? `${th.name} image` : 'theme image',
        title: th.name,
        subtitle,
        handle: `@${slug}`,
        borderColor: ab ? '#D4AF37' : '#3B82F6',
        gradient: ab
          ? 'linear-gradient(160deg,#efe5c6,#d4af37)'
          : 'linear-gradient(160deg,#3B82F6,#0ea5e9)',
        slug,
        raw: th
      };
    });
  }, [themes]);

  const handleTileClick = useCallback(
    (item) => {
      if (!item?.slug) return;
      navigate(`/themes/${encodeURIComponent(item.slug)}`);
    },
    [navigate]
  );

  const handleCardKeyDown = useCallback(
    (e, item) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleTileClick(item);
      }
    },
    [handleTileClick]
  );

  // image fallback handler
  const handleImgError = (e) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = PLACEHOLDER;
  };

  // skeleton placeholders for loading state
  const skeletons = new Array(6).fill(0);

  return (
    <div id="maincontent" style={{ minHeight: '100vh', marginTop: '3rem' }}>
      <style>{`
        :root {
          --card-height-desktop: 410px;
          --card-height-tablet: 340px;
          --card-height-mobile: 240px;
          --accent: #7c3aed;
        }
        .myth-hero { padding: 28px 0 10px; display:flex; align-items:center; gap:16px; }
        .myth-title { font-family: Georgia, 'Times New Roman', serif; color:#111827; margin:0; font-weight:700; font-size:1.85rem; }
        .myth-sub { color:#6b7280; margin:0; font-size:0.95rem; }
        .theme-card { height: var(--card-height-desktop); border-radius: 12px; overflow: hidden; position: relative; border: none; cursor: pointer; background: linear-gradient(180deg, #0f172a, #071029); }
        .theme-media { position: absolute; inset: 0; z-index: 0; }
        .theme-media img.bg-img { width: 100%; height: 100%; object-fit: cover; display: block; filter: grayscale(0.06) contrast(0.98); transition: transform .45s ease, filter .45s ease, opacity .25s ease; }
        .theme-media img.bg-img.loading { opacity: 0.5; transform: scale(1.02); filter: blur(1px); }
        .theme-grid-wrap { position:absolute; inset:0; z-index: 6; pointer-events:auto; background:transparent; display:flex; align-items:center; justify-content:center; }
        .chroma-grid.chroma-single .chroma-info { display: none !important; }
        .theme-overlay, .theme-overlay * { display: none !important; }
        .theme-card:focus { outline: 3px solid rgba(124,58,237,0.14); outline-offset: 4px; transform: translateY(-2px); }
        .theme-card:hover img.bg-img { transform: scale(1.04); filter: none; }
        .card-meta { position: absolute; left: 16px; bottom: 14px; z-index: 8; color: #fff; text-shadow: 0 2px 8px rgba(0,0,0,0.6); }
        .skeleton-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
        .skeleton-card { border-radius: 12px; height: var(--card-height-desktop); background: linear-gradient(90deg, #eee, #f6f6f6, #eee); background-size: 200% 100%; animation: shimmer 1.4s linear infinite; }
        @keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
        @media (max-width: 991.98px) {
          .skeleton-grid { grid-template-columns: repeat(2, 1fr); }
          .theme-card { height: var(--card-height-tablet); }
          .skeleton-card { height: var(--card-height-tablet); }
        }
        @media (max-width: 575.98px) {
          .skeleton-grid { grid-template-columns: repeat(1, 1fr); }
          .theme-card { height: var(--card-height-mobile); }
          .skeleton-card { height: var(--card-height-mobile); }
          .myth-hero { flex-direction: column; align-items:flex-start; gap:8px; }
        }
      `}</style>

      <div className="position-relative text-center my-5">
        <div
          className="position-absolute top-0 end-0 d-inline-flex align-items-center gap-2 px-3 py-1"
          style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 999,
            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
            fontSize: '0.9rem',
            color: '#374151'
          }}
        >
          <strong>{themes.length}</strong>&nbsp;themes
        </div>

        <h1
          className="fw-bold display-4"
          style={{
            fontFamily: "'Georgia', 'Times New Roman', serif",
            color: '#1f2937',
            letterSpacing: '-0.5px'
          }}
        >
          The Eerily Similar Myths
        </h1>
        <p className="text-muted mt-2" style={{ fontSize: '1.1rem' }}>
          Echoes across cultures, stories retold through time
        </p>
        <div
          style={{
            width: 80,
            height: 4,
            background: 'linear-gradient(90deg, #7c3aed, #3b82f6)',
            borderRadius: 2,
            margin: '1rem auto 0'
          }}
        />
      </div>

      <div className="container">
        {loading ? (
          <div className="py-4">
            <div className="skeleton-grid" aria-hidden>
              {skeletons.map((_, i) => (
                <div key={i} className="skeleton-card" />
              ))}
            </div>
            <div className="d-flex justify-content-center py-3" aria-live="polite">
              <div className="spinner-border text-secondary" role="status" aria-hidden></div>
              <span className="ms-2 text-muted">Loading themes…</span>
            </div>
          </div>
        ) : error ? (
          <div className="alert alert-danger" role="alert">{error}</div>
        ) : chromaItems.length === 0 ? (
          <div className="alert alert-info" role="status">No themes found.</div>
        ) : (
          <div className="row g-3" role="list">
            {chromaItems.map((item, idx) => {
              const cardId = `theme-card-${idx}-${item.slug || idx}`;
              return (
                <div key={item.slug || idx} className="col-12 col-sm-6 col-md-6 col-lg-4" role="listitem">
                  <article
                    id={cardId}
                    className="card theme-card shadow-sm"
                    role="button"
                    tabIndex={0}
                    onClick={() => handleTileClick(item)}
                    onKeyDown={(e) => handleCardKeyDown(e, item)}
                    aria-label={`Open ${item.title || 'theme'}`}
                    aria-describedby={`${cardId}-desc`}
                  >
                    <div className="theme-media" aria-hidden>
                      <img
                        className="bg-img loading"
                        src={item.image}
                        alt={item.alt || item.title || 'theme image'}
                        loading="lazy"
                        onError={handleImgError}
                        onLoad={(e) => e.currentTarget.classList.remove('loading')}
                      />
                    </div>

                    <div className="theme-grid-wrap" aria-hidden>
                      <ChromaGrid
                        items={[item]}
                        className="chroma-single"
                        columns={1}
                        rows={1}
                        radius={140}
                        damping={0.35}
                        fadeOut={0.6}
                        ease="power3.out"
                      />
                    </div>

                    <div className="card-meta" id={`${cardId}-desc`}>
                      <div style={{ fontSize: '1rem', fontWeight: 700 }}>{item.title}</div>
                      {item.subtitle && (
                        <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.9)' }}>
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </article>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
