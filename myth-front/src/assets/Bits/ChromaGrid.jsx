
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
  onCardClick = null,
}) => {
  const rootRef = useRef(null);
  const fadeRef = useRef(null);
  const setX = useRef(null);
  const setY = useRef(null);
  const pos = useRef({ x: 0, y: 0 });

  const PLACEHOLDER =
    `data:image/svg+xml;utf8,` +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'>
        <rect width='100%' height='100%' fill='#efeae1'/>
        <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'
        fill='#9b8f7f' font-family='Arial' font-size='20'>
          image placeholder
        </text>
      </svg>`
    );

  const data = items?.length ? items : [];

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

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
      overwrite: true,
      onUpdate: () => {
        setX.current?.(pos.current.x);
        setY.current?.(pos.current.y);
      },
    });
  };

  const handleMove = (e) => {
    const r = rootRef.current.getBoundingClientRect();
    moveTo(e.clientX - r.left, e.clientY - r.top);
    gsap.to(fadeRef.current, { opacity: 0, duration: 0.25, overwrite: true });
  };

  const handleLeave = () => {
    gsap.to(fadeRef.current, {
      opacity: 1,
      duration: fadeOut,
      overwrite: true,
    });
  };

  const handleCardMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();

    card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  };

  const revealColor = (e) => {
    const img = e.currentTarget.querySelector('img');
    if (!img) return;
    img.style.filter = 'none';
    img.style.transform = 'scale(1.05)';
  };

  const hideColor = (e) => {
    const img = e.currentTarget.querySelector('img');
    if (!img) return;
    img.style.filter = 'grayscale(1) contrast(.96) saturate(.9)';
    img.style.transform = 'scale(1)';
  };

  return (
    <div
      ref={rootRef}
      className={`chroma-grid ${className}`}
      style={{
        '--r': `${radius}px`,
        '--cols': columns,
        '--rows': rows,
      }}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
    >
      {data.map((item, i) => (
        <article
          key={i}
          className="chroma-card"
          style={{
            '--card-border': item.borderColor || '#d4af37',
            '--card-gradient': item.gradient,
          }}
          onPointerMove={handleCardMove}
          onMouseEnter={revealColor}
          onMouseLeave={hideColor}
          onFocus={revealColor}
          onBlur={hideColor}
          onClick={() =>
            onCardClick ? onCardClick(item, i) : item?.url && window.open(item.url)
          }
          tabIndex={0}
          role="button"
        >
          <div className="chroma-img-wrapper">
            <img
              src={item.image || PLACEHOLDER}
              alt={item.title || ''}
              loading="lazy"
              style={{
                filter: 'grayscale(1) contrast(.96) saturate(.9)',
                transition: 'all .35s ease',
              }}
            />
          </div>

          <footer className="chroma-info">
            <h3 className="name title">{item.title}</h3>
            {item.handle && <span className="handle">{item.handle}</span>}
            <p className="role meta">{item.subtitle}</p>
          </footer>
        </article>
      ))}

      <div className="chroma-overlay" />
      <div ref={fadeRef} className="chroma-fade" />
    </div>
  );
};

export default ChromaGrid;
