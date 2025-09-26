// src/MythPage.jsx
import React, { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ParallelCard from "./ParallelCard";
import TiltedCard from "./assets/Bits/TiltedCard";

const API = import.meta.env.VITE_API_BASE || "http://localhost:4000";

function isValidId(v) {
  return v !== undefined && v !== null && /^\d+$/.test(String(v));
}

function normalizeMyth(m) {
  if (!m) return m;
  return {
    ...m,
    imageUrl: m.imageUrl ?? m.imageurl ?? null,
  };
}

export default function MythPage() {
  const { id, slug } = useParams();
  const navigate = useNavigate();

  const [myth, setMyth] = useState(null);
  const [loadingMyth, setLoadingMyth] = useState(false);

  const [theme, setTheme] = useState(null);
  const [themeMyths, setThemeMyths] = useState([]);
  const [loadingTheme, setLoadingTheme] = useState(false);

  const [themeQuery, setThemeQuery] = useState("");
  const [themeSort, setThemeSort] = useState("title");

  const [suggestedParallels, setSuggestedParallels] = useState([]);
  const [acceptedParallels, setAcceptedParallels] = useState([]);
  const [loadingParallels, setLoadingParallels] = useState(false);

  const [error, setError] = useState(null);
  const [navLoading, setNavLoading] = useState(false);

  const mountedRef = useRef(true);
  const inflightSuggest = useRef(null);
  const inflightAccepted = useRef(null);
  const inflightThemeFetch = useRef(null);
  const inflightMythFetch = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      inflightSuggest.current?.abort?.();
      inflightAccepted.current?.abort?.();
      inflightThemeFetch.current?.abort?.();
      inflightMythFetch.current?.abort?.();
    };
  }, []);

  useEffect(() => {
    setError(null);
    setSuggestedParallels([]);
    setAcceptedParallels([]);
    setMyth(null);
    setTheme(null);
    setThemeMyths([]);
    setThemeQuery("");

    if (slug) {
      loadTheme(slug);
    } else if (isValidId(id)) {
      fetchMyth(id);
    } else {
      setError("Invalid route; expected a myth id or theme slug.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, slug]);

  /* ---------------------- THEME HANDLERS ---------------------- */
  async function loadTheme(slugVal) {
    if (!slugVal) return;
    inflightThemeFetch.current?.abort?.();
    const ac = new AbortController();
    inflightThemeFetch.current = ac;
    setLoadingTheme(true);
    setTheme(null);
    setThemeMyths([]);
    try {
      const listRes = await fetch(`${API}/api/themes`);
      if (!listRes.ok) throw new Error("Could not load themes list");
      const all = await listRes.json();
      const found = (all || []).find(
        (t) =>
          String(t.slug || t.name || "").toLowerCase() ===
          String(slugVal).toLowerCase()
      );
      if (found) setTheme(found);
      else
        setTheme({
          id: null,
          name: slugVal.replace(/-/g, " "),
          slug: slugVal,
          description: "",
        });

      const res = await fetch(
        `${API}/api/themes/${encodeURIComponent(slugVal)}/myths`,
        { signal: ac.signal }
      );
      if (!res.ok) {
        if (res.status === 404) {
          setError("Theme not found");
          setThemeMyths([]);
          setLoadingTheme(false);
          return;
        }
        throw new Error(`Failed to load theme myths (${res.status})`);
      }
      const data = await res.json();
      setThemeMyths((Array.isArray(data) ? data : []).map(normalizeMyth));
      setLoadingTheme(false);
    } catch (err) {
      if (err.name === "AbortError") return;
      console.error("loadTheme err", err);
      setError(err.message || "Error loading theme");
      setLoadingTheme(false);
    } finally {
      inflightThemeFetch.current = null;
    }
  }

  /* ---------------------- MYTH HANDLERS ---------------------- */
  async function fetchMyth(mythId) {
    if (!isValidId(mythId)) {
      setError("Invalid myth id");
      setMyth(null);
      return;
    }
    inflightMythFetch.current?.abort?.();
    const ac = new AbortController();
    inflightMythFetch.current = ac;
    setLoadingMyth(true);
    setMyth(null);
    setSuggestedParallels([]);
    setAcceptedParallels([]);
    try {
      const res = await fetch(
        `${API}/api/myths/${encodeURIComponent(mythId)}`,
        { signal: ac.signal }
      );
      if (!res.ok) {
        if (res.status === 404) setError("Myth not found");
        else setError(`Failed to fetch myth (${res.status})`);
        setLoadingMyth(false);
        return;
      }
      const data = await res.json();
      if (mountedRef.current) setMyth(normalizeMyth(data));
      setLoadingMyth(false);

      await Promise.all([fetchParallels(mythId), fetchAcceptedParallels(mythId)]);
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("fetchMyth err", err);
        setError(err.message || "Error fetching myth");
        setLoadingMyth(false);
      }
    } finally {
      inflightMythFetch.current = null;
    }
  }
  async function fetchParallels(mythId) {
    inflightSuggest.current?.abort?.();
    const ac = new AbortController();
    inflightSuggest.current = ac;
    setLoadingParallels(true);

    const timeoutMs = 10000;
    const timer = setTimeout(() => {
      try { ac.abort(); } catch {}
    }, timeoutMs);

    try {
      const res = await fetch(`${API}/api/parallels/suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mythId: Number(mythId) }),
        signal: ac.signal,
      });

      if (!res.ok) {
        setSuggestedParallels([]);
        return;
      }

      const text = await res.text();
      let data;
      try {
        data = text ? JSON.parse(text) : [];
      } catch {
        setSuggestedParallels([]);
        return;
      }

      const list = Array.isArray(data) ? data : [];
      setSuggestedParallels(list.map((p) => ({ ...p, myth: normalizeMyth(p.myth) })));
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("fetchParallels error:", err);
      }
      setSuggestedParallels([]);
    } finally {
      clearTimeout(timer);
      setLoadingParallels(false);
      inflightSuggest.current = null;
    }
  }

  async function fetchAcceptedParallels(mythId) {
    inflightAccepted.current?.abort?.();
    const ac = new AbortController();
    inflightAccepted.current = ac;
    try {
      const res = await fetch(
        `${API}/api/parallels?mythId=${encodeURIComponent(mythId)}`,
        { signal: ac.signal }
      );
      if (!res.ok) throw new Error("Failed to fetch accepted parallels");
      const rows = await res.json();
      setAcceptedParallels(
        (Array.isArray(rows) ? rows : []).map((p) => ({
          ...p,
          myth: normalizeMyth(p.myth),
        }))
      );
    } catch (err) {
      if (err.name !== "AbortError") console.error("fetchAcceptedParallels err", err);
    } finally {
      inflightAccepted.current = null;
    }
  }

  /* ---------- navigation helpers ---------- */
  async function gotoNext() {
    if (navLoading) return;
    setNavLoading(true);
    try {
      const currentId = Number(myth?.id ?? id);
      const res = await fetch(`${API}/api/myths/next?currentId=${currentId}`);
      const next = await res.json();
      if (next?.id) navigate(`/myth/${next.id}`);
    } catch (err) {
      setError("Failed to load next myth");
    } finally {
      setNavLoading(false);
    }
  }

  async function gotoRandom() {
    if (navLoading) return;
    setNavLoading(true);
    try {
      const res = await fetch(`${API}/api/myths/random`);
      const next = await res.json();
      if (next?.id) navigate(`/myth/${next.id}`);
    } catch (err) {
      setError("Failed to load random myth");
    } finally {
      setNavLoading(false);
    }
  }

  function handleAccepted(saved, originalSuggestion) {
    const candidateId = Number(
      originalSuggestion?.myth?.id ??
      saved?.myth_b ??
      saved?.myth_b_id ??
      saved?.myth?.id ??
      saved?.savedRow?.myth_b ??
      NaN
    );
    if (!Number.isFinite(candidateId)) return;

    setSuggestedParallels((prev) =>
      prev.filter((s) => {
        const sId = Number((s.myth ?? s).id);
        return sId !== candidateId;
      })
    );

    setAcceptedParallels((prev) => [
      { ...(originalSuggestion || {}), savedRow: saved?.savedRow ?? saved },
      ...prev,
    ]);
  }

  const SmallMeta = ({ children }) => (
    <small className="text-muted d-block">{children}</small>
  );

  const LoadingSkeleton = ({ lines = 4 }) => (
    <div className="py-3">
      {[...Array(lines)].map((_, i) => (
        <div key={i} className="mb-2">
          <div className="placeholder-glow">
            <span
              className="placeholder col-12"
              style={{ height: 12, display: "block", borderRadius: 4 }}
            ></span>
          </div>
        </div>
      ))}
    </div>
  );

  const filteredThemeMyths = useMemo(() => {
    const q = String(themeQuery || "").trim().toLowerCase();
    let arr = Array.isArray(themeMyths) ? [...themeMyths] : [];
    if (q) {
      arr = arr.filter(
        (m) =>
          String(m.title || "").toLowerCase().includes(q) ||
          String(m.summary || "").toLowerCase().includes(q) ||
          String(m.tradition || "").toLowerCase().includes(q)
      );
    }
    if (themeSort === "title")
      arr.sort((a, b) =>
        String(a.title || "").localeCompare(String(b.title || ""))
      );
    if (themeSort === "tradition")
      arr.sort((a, b) =>
        String(a.tradition || "").localeCompare(String(b.tradition || ""))
      );
    return arr;
  }, [themeMyths, themeQuery, themeSort]);

  const currentMythId = Number(myth?.id ?? id ?? NaN);

  if (slug) {
    return (
      <div className="container my-5">
        <h3 className="mb-4 fw-semibold fs-1 text-center">{theme?.name}</h3>
        {loadingTheme ? (
          <LoadingSkeleton lines={6} />
        ) : filteredThemeMyths.length === 0 ? (
          <div className="text-muted small fst-italic">
            No myths found for this theme.
          </div>
        ) : (
          <div className="row g-4">
            {filteredThemeMyths.map((m) => (
              <div key={m.id} className="col-8 col-sm-6 col-md-4">
                <article
                  className="card col-3 col-sm-12 col-lg-12 col-md-12 h-100 border-0 shadow-sm rounded-3 overflow-hidden"
                  onClick={() => navigate(`/myth/${m.id}`)}
                  style={{ cursor: "pointer" }}
                >
                  <TiltedCard
                    imageSrc={m.imageUrl || "https://placehold.co/600x400?text=No+Image"}
                    altText={m.title}
                    captionText={m.title}
                    containerHeight="320px"
                    containerWidth="100%"
                    imageHeight="100%"
                    imageWidth="90%"
                  />

                  <div className="card-body py-3">
                    <h6 className="fw-semibold mb-1 text-truncate">{m.title}</h6>
                    <p
                      className="mb-0 small text-muted text-truncate"
                      title={m.summary}
                      style={{ maxWidth: "100%" }}
                    >
                      {m.summary}
                    </p>
                  </div>
                </article>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="container my-5">
      <div className="row">
        <main className="col-12">
          <div className="card shadow-sm border-0 rounded-3 mb-4">
            <div className="card-body p-4">
              {loadingMyth ? (
                <LoadingSkeleton lines={10} />
              ) : error ? (
                <div className="alert alert-danger mb-0" role="alert">
                  {error}
                </div>
              ) : myth ? (
                <>
                  <div className="d-flex justify-content-between align-items-start mb-4 flex-wrap">
                    <div className="me-2">
                      <h2 className="fw-bold mb-1">✦ {myth.title} ✦</h2>
                      <SmallMeta>{myth.tradition}</SmallMeta>
                    </div>
                    <div className="d-flex gap-2 mt-2 mt-sm-0">
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        onClick={gotoRandom}
                        disabled={navLoading || loadingMyth}
                      >
                        Random
                      </button>
                      <button
                        type="button"
                        className="btn btn-dark btn-sm"
                        onClick={gotoNext}
                        disabled={navLoading || loadingMyth}
                      >
                        Next →
                      </button>
                    </div>
                  </div>

                  {/* HERO + SUMMARY (responsive) */}
                  <div className="row g-3 align-items-start justify-content-center ">
                    {/* Image column */}
                    <div className="col-12 col-lg-7">
                      <div className="card shadow-sm overflow-visible" style={{ border: 0, borderRadius: 12 }}>
                        <div className="card-body p-0" style={{ overflow: "visible" }}>
                          <div className="tilted-wrapper" style={{ overflow: "visible" }}>
                            <TiltedCard
                              imageSrc={myth.imageUrl || "https://placehold.co/1200x800?text=No+Image"}
                              altText={myth.title}
                              captionText={`${myth.title} — ${myth.tradition || "Unknown"}`}
                              containerHeight="520px"
                              containerWidth="100%"
                              imageHeight="100%"
                              imageWidth="100%"
                              rotateAmplitude={6}
                              scaleOnHover={1.03}
                              showMobileWarning={false}
                              showTooltip={true}
                              displayOverlayContent={true}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right column: summary + tags + details */}
                    <div className="col-12 col-lg-5">
                      <div className="d-flex flex-column h-100 gap-3">
                        <div className="card border-0 shadow-sm rounded-3 p-3" style={{ background: "#fffaf3" }}>
                          <h6 className="mb-2">Summary</h6>
                          <div className="mb-2 text-muted" style={{ maxHeight: 220, overflowY: "auto", minHeight: 64 }}>
                            {myth.summary || "No summary available."}
                          </div>

                          <div className="mt-2 d-flex flex-wrap gap-2">
                            {(myth.tags || []).slice(0, 8).map((t, idx) => (
                              <button
                                key={t + idx}
                                type="button"
                                className="btn btn-sm btn-outline-info"
                                onClick={() => {
                                  try {
                                    navigate?.(`/tags/${encodeURIComponent(t)}`);
                                  } catch {}
                                }}
                              >
                                #{t}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="card border-0 shadow-sm rounded-3 p-3">
                          <div className="small text-muted">Details</div>
                          <div className="fw-semibold my-1">{myth.tradition || "Unknown tradition"}</div>
                          <div className="text-muted small mb-2">{myth.themes ? myth.themes.join(", ") : "—"}</div>

                          <hr />

                          <div className="d-flex gap-2">
                            <button
                              className="btn btn-outline-primary btn-sm flex-grow-1"
                              onClick={() => {
                                navigator.clipboard?.writeText(window.location.href);
                              }}
                            >
                              📋 Copy
                            </button>
                            <a
                              className="btn btn-primary btn-sm"
                              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                                myth.title + " — " + (myth.tradition || "")
                              )}&url=${encodeURIComponent(window.location.href)}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              ↗ Share
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-muted">No myth found.</div>
              )}
            </div>
          </div>

          {/* Suggested parallels */}
          <div className="mb-5">
            <h5 className="fw-semibold mb-3">Suggested Parallels</h5>
            {loadingParallels ? (
              <LoadingSkeleton lines={4} />
            ) : suggestedParallels.length === 0 ? (
              <div className="text-muted small fst-italic">No suggestions yet.</div>
            ) : (
              <div className="row g-3">
                {suggestedParallels.map((p, i) => (
                  <div key={(p?.myth?.id ?? p?.id) || i} className="col-12 col-sm-6 col-md-4">
                    <ParallelCard
                      p={p}
                      currentId={currentMythId}
                      onAccepted={handleAccepted}
                      accepted={false}
                      onOpen={(m) => {
                        if (m?.id) navigate(`/myth/${m.id}`);
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Accepted parallels */}
          <div className="mb-5">
            <h5 className="fw-semibold mb-3">Accepted Parallels</h5>
            {acceptedParallels.length === 0 ? (
              <div className="text-muted small fst-italic">No accepted parallels yet.</div>
            ) : (
              <div className="row g-3">
                {acceptedParallels.map((p, i) => (
                  <div key={(p?.myth?.id ?? p?.id) || i} className="col-12 col-sm-6 col-md-4">
                    <ParallelCard
                      p={p}
                      currentId={currentMythId}
                      accepted={true}
                      onOpen={(m) => {
                        if (m?.id) navigate(`/myth/${m.id}`);
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      <style>{`
        /* keep tilt overlay content visible but responsive */
        .tilted-wrapper .overlay-content,
        .TiltedCard .overlay-content {
          position: relative !important;
          z-index: 32 !important;
          background: rgba(173, 216, 230, 0.9);
          max-width: 100%;
          border-radius: 8px;
        }
        .tilted-wrapper, .tilted-wrapper .tilt-inner, .tilted-wrapper .tilt-viewport, .TiltedCard, .TiltedCard .tilt-inner {
          overflow: visible !important;
        }
        .myth-hero-deck .tilted-wrapper img,
        .tilted-wrapper img,
        .TiltedCard img {
          width: 100% !important;
          height: 100% !important;
          max-height: 520px;
          object-fit: cover !important;
        }

        @media (max-width: 992px) {
          .myth-hero-deck .tilted-wrapper img,
          .tilted-wrapper img,
          .TiltedCard img {
            max-height: 460px;
          }
        }
        @media (max-width: 576px) {
          .myth-hero-deck .tilted-wrapper img,
          .tilted-wrapper img,
          .TiltedCard img {
            max-height: 450px;
          }
        }

        /* Tag pill restyle (fallback) */
        .tag-pill {
          display: inline-block;
          background: #e0f2fe;
          color: #0369a1;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 12px;
          cursor: pointer;
          transition: background 0.2s, color 0.2s;
        }
        .tag-pill:hover {
          background: #bae6fd;
          color: #0c4a6e;
        }
      `}</style>
    </div>
  );
}
