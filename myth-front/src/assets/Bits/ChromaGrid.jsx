// src/ChromaGrid.jsx
import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import './ChromaGrid.css';

export const ChromaGrid = ({
  items,
  className = '',
  radius = 300,
  columns = 3,
  rows = 2,
  damping = 0.45,
  fadeOut = 0.6,
  ease = 'power3.out',
  onCardClick = null, // optional callback (item, index)
}) => {
  const rootRef = useRef(null);
  const fadeRef = useRef(null);
  const setX = useRef(null);
  const setY = useRef(null);
  const pos = useRef({ x: 0, y: 0 });

  // safe placeholder (SVG data URI) so empty image doesn't create a bogus request
  const PLACEHOLDER = `data:image/svg+xml;utf8,` + encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'>
       <rect width='100%' height='100%' fill='#efeae1'/>
       <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#9b8f7f' font-family='Arial' font-size='20'>
         image placeholder
       </text>
     </svg>`
  );

  const demo = [ /* ... your demo items ... */ ];
  const data = items?.length ? items : demo;

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    // quickSetters target the root element's CSS variables --x / --y (used by overlays/masks)
    setX.current = gsap.quickSetter(el, '--x', 'px');
    setY.current = gsap.quickSetter(el, '--y', 'px');

    const { width, height } = el.getBoundingClientRect();
    pos.current = { x: width / 2, y: height / 2 };
    setX.current(pos.current.x);
    setY.current(pos.current.y);
  }, []);

  const moveTo = (x, y) => {
    gsap.to(pos.current, {
      x,
      y,
      duration: damping,
      ease,
      onUpdate: () => {
        setX.current?.(pos.current.x);
        setY.current?.(pos.current.y);
      },
      overwrite: true
    });
  };

  const handleMove = e => {
    const r = rootRef.current.getBoundingClientRect();
    moveTo(e.clientX - r.left, e.clientY - r.top);
    gsap.to(fadeRef.current, { opacity: 0, duration: 0.25, overwrite: true });
  };

  const handleLeave = () => {
    gsap.to(fadeRef.current, {
      opacity: 1,
      duration: fadeOut,
      overwrite: true
    });
  };

  const handleCardClick = (item, i) => {
    if (typeof onCardClick === 'function') {
      onCardClick(item, i);
      return;
    }
    // fallback: open url in new tab if provided
    if (item?.url) {
      window.open(item.url, '_blank', 'noopener,noreferrer');
    }
  };

  // Per-card pointer handler: update CSS variables on the *card* so the spotlight stays local.
  const handleCardMove = e => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty('--mouse-x', `${x}px`);
    card.style.setProperty('--mouse-y', `${y}px`);
  };

  // New: reveal color on interactions (hover / focus / pointer enter) and restore on leave/blur.
  const revealColor = e => {
    const card = e.currentTarget;
    const img = card.querySelector('img');
    if (img) {
      // smooth reveal
      img.style.transition = 'filter 300ms ease, transform 300ms ease, opacity 200ms ease';
      img.style.filter = 'none';
      img.style.opacity = '1';
    }
  };

  const hideColor = e => {
    const card = e.currentTarget;
    const img = card.querySelector('img');
    if (img) {
      img.style.transition = 'filter 350ms ease, transform 350ms ease, opacity 200ms ease';
      img.style.filter = 'grayscale(1) contrast(0.96) saturate(0.9)';
      // keep opacity at 1 but you can reduce to 0.95 if you want a subtle dimming
      img.style.opacity = '1';
    }
  };

  return (
    <div
      ref={rootRef}
      className={`chroma-grid ${className}`}
      style={{
        '--r': `${radius}px`,
        '--cols': columns,
        '--rows': rows
      }}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
    >
      {data.map((c, i) => (
        <article
          key={i}
          className="chroma-card"
          onMouseMove={handleCardMove}
          onPointerMove={handleCardMove}
          onClick={() => handleCardClick(c, i)}
          onMouseEnter={revealColor}
          onMouseLeave={hideColor}
          onFocus={revealColor}
          onBlur={hideColor}
          style={{
            '--card-border': c.borderColor || 'transparent',
            '--card-gradient': c.gradient,
            cursor: 'pointer'
          }}
          role="button"
          tabIndex={0}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleCardClick(c, i); }}
        >
          <div className="chroma-img-wrapper">
            {/* Start images in grayscale via inline style; interactions above will toggle this. */}
            <img
              src={c.image || PLACEHOLDER}
              alt={c.title || ''}
              loading="lazy"
              style={{
                filter: 'grayscale(1) contrast(0.96) saturate(0.9)',
                transition: 'filter 350ms ease, transform 350ms ease, opacity 200ms ease'
              }}
            />
          </div>

          <footer className="chroma-info">
            <h3 className="name title">{c.title}</h3>
            {c.handle && <span className="handle">{c.handle}</span>}
            <p className="role meta">{c.subtitle}</p>
          </footer>
        </article>
      ))}

      {/* overlay and fade remain at grid level (they also respond to per-card --mouse-x/--mouse-y if JS sets them per-card) */}
      <div className="chroma-overlay" />
      <div ref={fadeRef} className="chroma-fade" />
    </div>
  );
};

export default ChromaGrid;
