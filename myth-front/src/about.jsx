import React, { useState, useRef, useEffect, useCallback } from "react";

/**
 * MythAbout — fixed hover + parallax
 * - Parallax writes transform to .card-inner (child) so parent :hover stays smooth
 * - JS never writes inline transitions
 * - IntersectionObserver reveal, reduced-motion respected (but hover zoom preserved)
 * - Like pulse, copy, toast, keyboard a11y kept
 */

export default function MythAbout() {
  const pillarsInit = [
    {
      key: "study",
      title: "What we study",
      subtitle:
        "Comparative myth: recurring motifs across traditions that point to shared cognitive and social solutions.",
      icon: "📚",
      details:
        "We prioritise primary texts and cross-cultural pattern mapping. Expect careful sourcing, not sensational summaries."
    },
    {
      key: "method",
      title: "Method",
      subtitle:
        "Textual triangulation, context-aware comparison, and careful sourcing — pattern recognition without speculation.",
      icon: "🔎",
      details:
        "Method = triangulate multiple attestations, check chronology & context, and avoid weak analogies. We document uncertainty."
    },
    {
      key: "audience",
      title: "Audience",
      subtitle:
        "Researchers, curious devs, and readers who prefer evidence-framing over sensational headlines.",
      icon: "🧭",
      details:
        "If you like evidence-first threads and code-level clarity, this is for you. We assume curiosity, not credulity."
    }
  ];

  const credits = [
    { name: "Research & Curation", value: "Community contributors + editors" },
    { name: "Design & UI", value: "Your (very particular) aesthetic" },
    { name: "Data", value: "Open sources, classic texts, and careful transcription" }
  ];

  const [expanded, setExpanded] = useState(() => ({}));
  const [likes, setLikes] = useState(() => ({}));
  const [pulseKeys, setPulseKeys] = useState(() => ({}));
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);
  const liveRef = useRef(null);

  // map of parent article elements (used for reveal + inner lookup)
  const cardRefs = useRef(new Map());
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    return () => clearTimeout(toastTimer.current);
  }, []);

  function pushToast(msg) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
    if (liveRef.current) liveRef.current.textContent = msg;
  }

  const toggleExpand = useCallback((key) => {
    setExpanded((s) => ({ ...s, [key]: !s[key] }));
  }, []);

  function handleLike(key) {
    setLikes((s) => ({ ...s, [key]: (s[key] || 0) + 1 }));
    setPulseKeys((s) => ({ ...s, [key]: true }));
    setTimeout(() => setPulseKeys((s) => ({ ...s, [key]: false })), 650);
    pushToast("Liked — nice taste.");
  }

  async function handleCopy(text) {
    try {
      await navigator.clipboard.writeText(text);
      pushToast("Copied to clipboard.");
    } catch {
      pushToast("Copy failed — use Ctrl/Cmd+C.");
    }
  }

  // Reveal on scroll
  useEffect(() => {
    if (reduceMotion) {
      cardRefs.current.forEach((el) => {
        if (el) el.classList.add("revealed");
      });
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target;
            el.classList.add("revealed");
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.12 }
    );

    cardRefs.current.forEach((el) => {
      if (el) io.observe(el);
    });

    return () => io.disconnect();
  }, [reduceMotion]);

  // Parallax: write transforms to .card-inner (child) only
  const handlePointerMove = useCallback(
    (e, key) => {
      if (reduceMotion) return;
      const parent = cardRefs.current.get(key);
      if (!parent) return;
      const inner = parent.querySelector(".card-inner");
      if (!inner) return;

      const rect = parent.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      const nx = px - 0.5;
      const ny = py - 0.5;
      const rotX = -ny * 6;
      const rotY = nx * 6;
      const translateZ = Math.max(0, 12 - Math.hypot(nx * 10, ny * 10) * 10);

      // rAF and ONLY the transform property on the inner element
      cancelAnimationFrame(inner._raf || 0);
      inner._raf = requestAnimationFrame(() => {
        inner.style.transform = `translateZ(${translateZ.toFixed(
          2
        )}px) translateY(-6px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(
          2
        )}deg) scale(1.01)`;
      });
    },
    [reduceMotion]
  );

  const handlePointerLeave = useCallback((key) => {
    const parent = cardRefs.current.get(key);
    if (!parent) return;
    const inner = parent.querySelector(".card-inner");
    if (!inner) return;
    cancelAnimationFrame(inner._raf || 0);
    inner._raf = requestAnimationFrame(() => {
      inner.style.transform = ""; // clear inline -> CSS transitions will take over
    });
  }, []);

  // helper ref setter (stores parent article element)
  const setCardRef = (key) => (node) => {
    if (node) cardRefs.current.set(key, node);
    else cardRefs.current.delete(key);
  };

  function pillKeyHandler(e, key) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleExpand(key);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "transparent",
        color: "#FFEBCD",
        padding: "32px 0"
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 18px" }}>
        <style>{`
          :root{
            --maroon: #fd3c3cff;
            --blanchedalmond: #FFEBCD;
            --panel-glass: rgba(10, 14, 20, 0.97);
            --tile-dark-start: #071028;
            --tile-dark-end: #04101b;
            --radius: 12px;
            --shadow-soft: 0 8px 28px rgba(2,6,23,0.35);
            --shadow-strong: 0 18px 48px rgba(2,6,23,0.6);
            --focus: 3px solid rgba(128,0,0,0.18);
          }

          .about-hero { text-align:center; margin-bottom: 1.5rem; background: transparent; }
          .about-title { font-family: Georgia, 'Times New Roman', serif; font-size: 1.95rem; margin: 0; color: var(--maroon); }
          .about-sub { color: black; margin-top: 8px; font-size: 1.02rem; opacity: 0.95; }

          .about-panel {
            background: var(--panel-glass);
            padding: 20px;
            border-radius: var(--radius);
            box-shadow: var(--shadow-soft);
            border: 1px solid rgba(255,255,255,0.03);
            backdrop-filter: blur(6px) saturate(120%);
            color: var(--blanchedalmond);
          }

          .credits { display:flex; gap:12px; margin-top:12px; }
          .credit {
            flex:1;
            background: rgba(6,10,18,0.5);
            border: 1px solid rgba(255,255,255,0.03);
            padding:12px;
            border-radius:8px;
            min-width:0;
            color: var(--blanchedalmond);
            backdrop-filter: blur(4px);
            transition: transform 240ms ease, box-shadow 240ms ease;
          }
          .credit:hover { transform: translateY(-6px); box-shadow: var(--shadow-strong); }

          /* perspective so 3D reads; applied to grid and card for inner */
          .pillars { 
            display:grid; 
            grid-template-columns: repeat(3,1fr); 
            gap:14px; 
            margin-top:18px; 
            perspective: 900px;
          }

          /* Card root: CSS hover transforms here — parent transform not overridden by inner transforms */
          .card-tile {
            position: relative;
            overflow: visible;
            background: linear-gradient(160deg, var(--tile-dark-start) 0%, var(--tile-dark-end) 100%);
            color: var(--blanchedalmond);
            padding:16px;
            border-radius:12px;
            min-height:140px;
            display:flex;
            flex-direction:column;
            gap:12px;
            box-shadow: 0 6px 18px rgba(2,6,23,0.36);
            border: 1px solid rgba(255,255,255,0.03);
            backdrop-filter: blur(3px);
            will-change: transform;
            transform-origin: center center;
            transform-style: preserve-3d;
            opacity: 0;
          }

          /* Reveal toggles opacity/transform */
          .card-tile.revealed {
            opacity: 1;
            transform: none;
          }

          /* Parent hover is smooth because JS writes transform to child (.card-inner) */
       

          /* INNER wrapper gets JS parallax transforms only */
          .card-inner {
            will-change: transform;
          }

          .card-top { display:flex; gap:12px; align-items:center; }
          .icon { width:46px; height:46px; border-radius:10px; display:grid; place-items:center; background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01)); font-size:1.25rem; color: var(--blanchedalmond); box-shadow: inset 0 -6px 14px rgba(0,0,0,0.25); }
          .card-title { font-weight:700; font-size:1.03rem; color: var(--maroon); }
          .card-sub { color: rgba(255,235,205,0.95); line-height:1.35; font-size:0.96rem; opacity:0.98; }

          .actions { display:flex; gap:8px; align-items:center; }
          .btn-mini {
            background: rgba(255,235,205,0.03);
            color: var(--blanchedalmond);
            border:1px solid rgba(255,235,205,0.04);
            padding:6px 10px;
            border-radius:8px;
            cursor:pointer;
            font-weight:700;
            font-size:0.92rem;
            display:inline-flex;
            gap:8px;
            align-items:center;
            transition: transform 140ms ease, background 140ms;
          }
          .btn-mini:hover { transform: translateY(-3px); }
          .btn-mini:active { transform: translateY(0); }
          .btn-mini:focus { outline: none; box-shadow: 0 0 0 3px rgba(255,235,205,0.06); border-radius:8px; }

          .like-pulse { animation: like-pulse 640ms cubic-bezier(.2,.9,.2,1); }
          @keyframes like-pulse { 0%{transform:scale(1);}35%{transform:scale(1.45);}60%{transform:scale(.98);}100%{transform:scale(1);} }

          .details {
            margin-top:8px;
            background: linear-gradient(180deg, rgba(255,255,255,0.01), rgba(255,255,255,0.005));
            padding:10px;
            border-radius:8px;
            font-size:0.92rem;
            line-height:1.45;
            color: var(--blanchedalmond);
            border: 1px solid rgba(255,255,255,0.02);
            max-height: 0;
            opacity: 0;
            overflow: hidden;
            transition: max-height 360ms cubic-bezier(.2,.9,.2,1), opacity 240ms ease, transform 240ms ease;
            transform-origin: top;
            transform: translateY(-8px);
          }
          .details.open { max-height: 360px; opacity: 1; transform: translateY(0); }

          .card-tile::after {
            content: '';
            position: absolute;
            left: -2%;
            top: -2%;
            width: 104%;
            height: 40%;
            background: linear-gradient(90deg, rgba(255,255,255,0.008), rgba(255,255,255,0.02), rgba(255,255,255,0.008));
            transform: translateY(-24%) rotate(-6deg) ease-in ease-out;
            opacity: 0;
             transition: transform 160ms ease, box-shadow 160ms ease, filter 160ms ease;
            pointer-events: none;
            border-radius: 12px;
          }
          .card-tile.revealed::after { opacity: 1; transform: translateY(0) rotate(-6deg); }

          .ctas { margin-top:18px; display:flex; gap:12px; flex-wrap:wrap; }
          .btn-primary {
            background: linear-gradient(90deg,var(--maroon), #7c3aed);
            color:#fff;
            padding:10px 14px;
            border-radius:10px;
            text-decoration:none;
            font-weight:700;
            border: none;
            box-shadow: 0 6px 18px rgba(0,0,0,0.35);
            transition: transform 160ms ease, box-shadow 160ms ease, filter 160ms ease;
          }
          .btn-primary:hover, .btn-primary:focus {
            color: #fff !important;
            transform: translateY(-3px);
            box-shadow: 0 12px 30px rgba(124,58,237,0.12);
            filter: brightness(1.03);
            text-decoration: none;
          }
          .btn-outline {
            background: transparent;
            border: 1px solid rgba(255,255,255,0.04);
            padding:10px 14px;
            border-radius:10px;
            color: var(--blanchedalmond);
            text-decoration:none;
            font-weight:700;
            backdrop-filter: blur(3px);
          }

          .toast { position: fixed; right: 18px; bottom: 18px; background: rgba(3,6,12,0.9); color: var(--blanchedalmond); padding:10px 14px; border-radius:10px; box-shadow: 0 10px 30px rgba(2,6,23,0.6); opacity:0; transform: translateY(8px); transition: opacity 160ms, transform 160ms; z-index: 9999; border: 1px solid rgba(255,255,255,0.03); }
          .toast.show { opacity:1; transform:none; }

          .card-tile:focus-visible { outline: var(--focus); outline-offset: 6px; transform: translateY(-6px) scale(1.01); }

          @media (max-width: 980px) { .pillars { grid-template-columns: repeat(2,1fr); } }
          @media (max-width: 560px) { .pillars { grid-template-columns: 1fr; } .credits { flex-direction: column; } }
          
          /* IMPORTANT: keep hover transform active even with reduced motion.
             We remove transitions/animations, but do NOT force transform: none. */
          @media (prefers-reduced-motion: reduce) {
            .card-tile, .card-tile.revealed, .details, .like-pulse, .toast, .card-inner { 
              transition: none !important; 
              animation: none !important; 
            }
          }
        `}</style>

        <div className="about-hero">
          <h1 className="about-title" style={{ marginTop: 8 }}>
            About — The Eerily Similar Myths
          </h1>
          <p className="about-sub">Pattern-hunting across myth, anchored to sources and cautious interpretation.</p>
        </div>

        <section className="about-panel" aria-labelledby="mission-title">
          <h2 id="mission-title" style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--maroon)" }}>Mission</h2>
          <p style={{ color: "var(--blanchedalmond)", marginTop: 10, lineHeight: 1.6 }}>
            We map recurring motifs across traditions to better understand narrative solutions to human problems — creation, exile, return, betrayal.
          </p>

          <div style={{ marginTop: 14 }}>
            <strong style={{ display: "block", marginBottom: 8, color: "var(--blanchedalmond)" }}>Quick facts</strong>
            <ul style={{ marginTop: 0, color: "rgba(255,235,205,0.78)" }}>
              <li>Evidence-first essays — links to primary texts when possible.</li>
              <li>No sensationalism — patterns, not conspiracies.</li>
              <li>Open to corrections: scholarship is iterative.</li>
            </ul>
          </div>

          <div className="credits" aria-label="Credits" style={{ marginTop: 14 }}>
            {credits.map((c) => (
              <div className="credit" key={c.name}>
                <h4>{c.name}</h4>
                <div style={{ marginTop: 8, color: "rgba(255,235,205,0.78)" }}>{c.value}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 18 }}>
            <h3 style={{ margin: "8px 0 12px 0", fontSize: 16, color: "var(--maroon)" }}>Core principles — tap to expand</h3>

            <div className="pillars" role="list" aria-label="Core principles list">
              {pillarsInit.map((p) => {
                const isOpen = !!expanded[p.key];
                return (
                  <article
                    key={p.key}
                    className="card-tile"
                    role="listitem"
                    tabIndex={0}
                    aria-expanded={isOpen}
                    aria-controls={`${p.key}-details`}
                    onKeyDown={(e) => pillKeyHandler(e, p.key)}
                    onMouseMove={(e) => handlePointerMove(e, p.key)}
                    onMouseLeave={() => handlePointerLeave(p.key)}
                    ref={setCardRef(p.key)}
                  >
                    {/* inner wrapper receives parallax transform from JS */}
                    <div className="card-inner">
                      <div className="card-top">
                        <div className="icon" aria-hidden>{p.icon}</div>
                        <div style={{ flex: 1 }}>
                          <div className="card-title">{p.title}</div>
                          <div className="card-sub" id={`${p.key}-sub`}>{p.subtitle}</div>
                        </div>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div className="actions" aria-hidden>
                          <button
                            className="btn-mini"
                            onClick={() => toggleExpand(p.key)}
                            aria-pressed={isOpen}
                            aria-label={isOpen ? `Collapse ${p.title}` : `Expand ${p.title}`}
                          >
                            {isOpen ? "− Collapse" : "+ Explore"}
                          </button>

                          <button
                            className={`btn-mini ${pulseKeys[p.key] ? "like-pulse" : ""}`}
                            onClick={() => handleLike(p.key)}
                            aria-label={`Like ${p.title}`}
                          >
                            ❤️ <span style={{ fontWeight: 800 }}>{likes[p.key] || 0}</span>
                          </button>

                          <button className="btn-mini" onClick={() => handleCopy(p.subtitle)} aria-label={`Copy blurb for ${p.title}`}>
                            Copy
                          </button>
                        </div>

                        <div style={{ fontSize: 12, color: "rgba(255,235,205,0.78)" }}>
                          {isOpen ? "Open" : "Summary"}
                        </div>
                      </div>

                      <div
                        id={`${p.key}-details`}
                        className={`details ${isOpen ? "open" : ""}`}
                        role="region"
                        aria-labelledby={`${p.key}-sub`}
                        aria-hidden={!isOpen}
                        style={{ marginTop: 10 }}
                      >
                        {p.details}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="ctas" style={{ marginTop: 18 }}>
            <a className="btn-primary" href="/contact">Contact</a>
            <a className="btn-outline" href="/contribute">Contribute</a>
            <a className="btn-outline" href="/">Back home</a>
          </div>
        </section>

        <div
          role="status"
          aria-live="polite"
          ref={liveRef}
          className={`toast ${toast ? "show" : ""}`}
          style={{ display: toast ? undefined : "none" }}
        >
          {toast}
        </div>
      </div>
    </div>
  );
}
