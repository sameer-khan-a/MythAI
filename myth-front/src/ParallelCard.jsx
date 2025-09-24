// src/ParallelCard.jsx
import React, { useState, useMemo } from 'react';
import SpotlightCard from './assets/Bits/SpotlightCard';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

// lowered threshold as requested
const READ_MORE_CHAR_THRESHOLD = 120;

export default function ParallelCard({
  p,
  onAccepted,
  accepted = false,
  onOpen,
  currentId = null
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [optimisticAccepted, setOptimisticAccepted] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const mythObj = p?.myth ?? p ?? {};
  const title = mythObj?.title ?? mythObj?.name ?? 'Untitled';

  const contentRaw = mythObj?.content ?? mythObj?.summary ?? mythObj?.excerpt ?? mythObj?.description ?? '';
  const content = useMemo(() => {
    const kwIdx = contentRaw.lastIndexOf('Keywords:');
    if (kwIdx > 50) {
      return contentRaw.slice(0, kwIdx).trim();
    }
    return contentRaw.trim();
  }, [contentRaw]);

  const tags = mythObj?.tags ?? mythObj?.tag_list ?? [];
  const tradition = mythObj?.tradition ?? '';
  const score = typeof p?.normalizedScore === 'number' ? p.normalizedScore
               : (typeof p?.score === 'number' ? p.score : null);

  const thumb = mythObj?.imageUrl || mythObj?.thumbnail || mythObj?.cover || null;

  const resolveIds = () => {
    const maybeA = p?.targetId ?? p?.target?.id ?? p?.mythA ?? p?.myth_a ?? null;
    const mythA = Number(maybeA ?? currentId ?? null);
    const maybeB = mythObj?.id ?? p?.myth_id ?? p?.myth_b_id ?? p?.mythB ?? p?.myth_b ?? null;
    const mythB = Number(maybeB ?? null);
    return { mythA: Number.isFinite(mythA) ? mythA : null, mythB: Number.isFinite(mythB) ? mythB : null };
  };

  async function handleAccept(e) {
    e?.preventDefault?.();
    setErr(null);

    const { mythA, mythB } = resolveIds();
    if (!mythA || !mythB) {
      setErr('Missing myth IDs — cannot accept.');
      return;
    }
    if (mythA === mythB) {
      setErr('Cannot accept a myth as a parallel to itself.');
      return;
    }

    if (!confirmed) {
      setConfirmed(true);
      setTimeout(() => setConfirmed(false), 4000);
      return;
    }

    setOptimisticAccepted(true);
    setLoading(true);

    try {
      const body = {
        mythA,
        mythB,
        score: score != null ? score : null,
        rationale: p?.rationale ?? null,
        detectedBy: p?.detectedBy ?? 'human',
      };

      const res = await fetch(`${API}/api/parallels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        let json = null;
        try { json = await res.json(); } catch {}
        throw new Error(json?.error || json?.message || `Server ${res.status}`);
      }

      const saved = await res.json();
      if (typeof onAccepted === 'function') onAccepted(saved, p);
    } catch (e) {
      console.error('Accept parallel error', e);
      setErr(e?.message || 'Failed to save parallel');
      setOptimisticAccepted(false);
    } finally {
      setLoading(false);
      setConfirmed(false);
    }
  }

  function handleOpen(e) {
    e?.preventDefault?.();
    if (typeof onOpen === 'function') return onOpen(mythObj);
    if (typeof window !== 'undefined' && mythObj?.id) {
      window.location.href = `/myth/${encodeURIComponent(mythObj.id)}`;
    }
  }

  const scorePercent = (() => {
    if (score == null) return null;
    if (score <= 1) return Math.round(score * 100);
    if (score <= 100) return Math.round(score);
    return Math.max(0, Math.min(100, Math.round(score)));
  })();

  const isAccepted = accepted || optimisticAccepted;

  // showReadMore uses the lowered threshold now
  const showReadMore = content && content.length > READ_MORE_CHAR_THRESHOLD;

  // preview follows the threshold (no weird Math.max forcing 200+)
  const previewText = showReadMore && !expanded
    ? content.slice(0, READ_MORE_CHAR_THRESHOLD)
    : content;

  return (
    <>
      <style>{`
        /* ===== Layout & sizing (uniform card heights) ===== */
        .parallel-card-item {
          flex: 0 0 calc(33.333% - 12px);
          max-width: calc(33.333% - 12px);
          box-sizing: border-box;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          display: flex;
          flex-direction: column;
          height: 560px;            /* fixed card height for uniform rows on desktop */
        }
        @media (max-width: 992px) {
          .parallel-card-item {
            flex: 0 0 calc(50% - 12px);
            max-width: calc(50% - 12px);
            height: 520px;          /* slightly shorter on tablet */
          }
        }
        @media (max-width: 576px) {
          .parallel-card-item {
            flex: 0 0 100%;
            max-width: 100%;
            height: auto;           /* allow natural height on narrow viewports */
          }
        }

        .parallel-card-item:hover {
          transform: translateY(-4px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.15);
        }

        /* Ensure the container fills the full card height */
        .parallel-card-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          background: transparent;
        }

        /* ===== Thumbnail: FIXED PIXEL height so all images are identical visually ===== */
        .parallel-card-thumb {
          width: 100%;
          height: 240px;           /* fixed thumbnail height for consistent cards */
          object-fit: cover;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.12);
          background: linear-gradient(135deg,#f8fafc,#ecfeff);
          flex: 0 0 auto;
        }
        @media (max-width: 992px) { .parallel-card-thumb { height: 220px; } }
        @media (max-width: 576px) { .parallel-card-thumb { height: 200px; } }

        /* ===== Body stretches to fill remaining space ===== */
        .parallel-card-body {
          flex: 1 1 auto;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 0.6rem 0;
          height: 550px;
          color: #0f1724;
        }

        .parallel-card-title {
          font-family: Georgia, serif;
          font-size: 16px;
          font-weight: 700;
          margin: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* ===== Content area: use mask fade instead of white overlay ===== */
        .parallel-card-summary {
          color: #4b5563;
          font-size: 13px;
          line-height: 1.5;
          margin-top: 8px;
          overflow: hidden;
          transition: max-height 0.28s ease;
        }

        /* collapsed: limit visible lines and apply mask fade for a smooth transition */
        .parallel-card-summary.collapsed {
          max-height: calc(1.5rem * 4); /* ~4 lines */
          -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%);
          mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%);
          -webkit-mask-size: 100% 100%;
          mask-size: 100% 100%;
        }

        /* expanded: remove mask so text shows fully */
        .parallel-card-summary.expanded {
          max-height: none;
          -webkit-mask-image: none;
          mask-image: none;
        }

        .parallel-card-tags { display:flex; gap:4px; flex-wrap:wrap; margin-top:6px; }
        .parallel-card-tag { background: rgba(0,0,0,0.04); color: #374151; padding: 2px 6px; border-radius: 999px; font-size: 11px; }

        .progress-pill {
          height: 6px;
          width: 60px;
          border-radius: 999px;
          background: rgba(0,0,0,0.06);
          overflow: hidden;
        }
        .progress-bar { height: 100%; }

        .error-alert {
          margin-top: 6px;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 12px;
          background: #fee2e2;
          color: #b91c1c;
        }

        .spinner-border.text-light { color: #fff !important; }
        .btn[disabled] { opacity: 0.9; filter: grayscale(.02); pointer-events: none; }
        .btn.btn-success { background: #16a34a; border-color: #16a34a; color: #fff; }
        .btn.btn-warning { background: #f59e0b; border-color: #f59e0b; color: #111; }
        .btn .spinner-border { vertical-align: middle; }
        .btn .spinner-label { margin-left: 8px; font-weight: 600; font-size: 12px; color: inherit; }
        .btn:focus { box-shadow: 0 0 0 3px rgba(14,165,233,0.18); outline: none; }

        .read-more-btn {
          background: transparent;
          border: none;
          color: #0ea5e9;
          font-weight: 600;
          cursor: pointer;
          padding: 0;
          margin-left: 6px;
        }

        @media (max-width: 576px) {
          .parallel-card-item { padding-bottom: 6px; }
        }
      `}</style>

      <div
        className="parallel-card-item"
        role="button"
        tabIndex={0}
        onClick={handleOpen}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleOpen(e); }}
      >
        <SpotlightCard className="mb-2" spotlightColor="rgba(0,229,255,0.06)">
          <div className="parallel-card-container">
            {/* Image */}
            {thumb ? (
              <img src={thumb} alt={title} className="parallel-card-thumb" />
            ) : (
              <div style={{
                width: '100%',
                height: 840,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg,#f0f4ff,#e6fffb)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.12)'
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 2l3 6 6 .5-4.5 3.6L19 20l-7-4-7 4 1.5-7.9L3 8.5 9 8 12 2z" fill="#6b7280"/>
                </svg>
              </div>
            )}

            {/* Body */}
            <div className="parallel-card-body" onClick={(e) => e.stopPropagation()}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <h6 className="parallel-card-title">{title}</h6>
                    <div className="small" style={{ color: '#6b7280', marginTop: 4, fontSize: 11 }}>{tradition}</div>
                  </div>

                  {scorePercent != null && (
                    <div style={{ textAlign: 'right', minWidth: 48 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'orchid' }}>{scorePercent}%</div>
                      <div className="progress-pill" aria-hidden="true">
                        <div
                          className="progress-bar"
                          style={{
                            width: `${scorePercent}%`,
                            background: scorePercent > 75 ? '#16a34a' : scorePercent > 40 ? '#0ea5e9' : '#f59e0b'
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Content (collapsed or expanded) */}
                {content ? (
                  <>
                    <p
                      className={`parallel-card-summary ${showReadMore && !expanded ? 'collapsed' : 'expanded'}`}
                      aria-expanded={expanded}
                    >
                      {showReadMore && !expanded ? previewText + '…' : content}
                    </p>

                    {/* Read more / less */}
                    {showReadMore && (
                      <div style={{ marginTop: 6 }}>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setExpanded((s) => !s); }}
                          className="read-more-btn"
                          aria-expanded={expanded}
                          aria-controls={`content-${mythObj?.id ?? Math.random()}`}
                        >
                          {expanded ? 'Read less' : 'Read more'}
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="parallel-card-summary">No description available.</p>
                )}

                <div className="parallel-card-tags" aria-hidden={!tags || tags.length === 0}>
                  {(tags || []).slice(0, 4).map((t) => (
                    <span key={t} className="parallel-card-tag">{t}</span>
                  ))}
                </div>
              </div>

              {/* Buttons at bottom */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 10 }}>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={(e) => { e.stopPropagation(); handleOpen(e); }}
                  style={{ fontSize: 12, padding: '4px 10px' }}
                  aria-label={`Open ${title}`}
                >
                  Open
                </button>

                {isAccepted ? (
                  <button
                    className="btn btn-sm btn-success"
                    disabled
                    style={{ fontSize: 12, padding: '4px 10px', display: 'inline-flex', alignItems: 'center' }}
                    onClick={(e) => e.stopPropagation()}
                    aria-disabled="true"
                    aria-label="Accepted"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ verticalAlign: 'middle', marginRight: 6 }}>
                      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Accepted
                  </button>
                ) : (
                  <button
                    className={`btn btn-sm ${confirmed ? 'btn-warning' : 'btn-success'}`}
                    onClick={(e) => { e.stopPropagation(); handleAccept(e); }}
                    disabled={loading}
                    style={{ fontSize: 12, padding: '4px 10px', display: 'inline-flex', alignItems: 'center' }}
                    aria-pressed={confirmed}
                    aria-busy={loading}
                    aria-label={confirmed ? 'Confirm accept' : 'Accept parallel'}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm text-light" role="status" aria-hidden="true"></span>
                        <span className="spinner-label">Saving</span>
                        <span className="visually-hidden">Saving…</span>
                      </>
                    ) : (
                      confirmed ? 'Confirm' : 'Accept'
                    )}
                  </button>
                )}
              </div>

              {err && <div className="error-alert" role="alert">{err}</div>}
            </div>
          </div>
        </SpotlightCard>
      </div>
    </>
  );
}
