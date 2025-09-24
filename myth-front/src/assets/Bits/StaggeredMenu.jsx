// src/assets/Bits/StaggeredMenu.jsx
import React, { useCallback, useLayoutEffect, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { gsap } from 'gsap';
import './StaggeredMenu.css';

export default function StaggeredMenu({
  position = 'right',
  colors = ['#B19EEF', '#5227FF'],
  items = [],
  socialItems = [],
  displaySocials = true,
  displayItemNumbering = true,
  className,
  // prefer public/relative path (React serves /public files at root)
  logoUrl = '/images/savior.png',
  menuButtonColor = '#fff',
  openMenuButtonColor = '#fff',
  accentColor = '#5227FF',
  changeMenuColorOnOpen = true,
  onMenuOpen,
  onMenuClose
}) {
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);

  // refs to DOM
  const panelRef = useRef(null);
  const preLayersRef = useRef(null);
  const preLayerElsRef = useRef([]);
  const plusHRef = useRef(null);
  const plusVRef = useRef(null);
  const iconRef = useRef(null);
  const textInnerRef = useRef(null);
  const textWrapRef = useRef(null);
  const toggleBtnRef = useRef(null);

  // state for the toggle text animation lines
  const [textLines, setTextLines] = useState(['Menu', 'Close']);

  // animation refs
  const openTlRef = useRef(null);
  const closeTweenRef = useRef(null);
  const spinTweenRef = useRef(null);
  const textCycleAnimRef = useRef(null);
  const colorTweenRef = useRef(null);
  const busyRef = useRef(false);
  const itemEntranceTweenRef = useRef(null);

  // store last focused element before opening to restore focus on close
  const lastFocusedRef = useRef(null);

  // Initial visual fallback: place panel offscreen so users without JS don't get a flash
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (panel) {
      const off = position === 'left' ? '-100%' : '100%';
      panel.style.transform = `translateX(${off})`;
    }
  }, [position]);

  // gsap set up: set initial transforms and cache pre-layer elements
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const panel = panelRef.current;
      const preContainer = preLayersRef.current;
      const plusH = plusHRef.current;
      const plusV = plusVRef.current;
      const icon = iconRef.current;
      const textInner = textInnerRef.current;
      if (!panel || !plusH || !plusV || !icon || !textInner) return;

      let preLayers = [];
      if (preContainer) preLayers = Array.from(preContainer.querySelectorAll('.sm-prelayer'));
      preLayerElsRef.current = preLayers;

      // use xPercent so GSAP respects responsive layout
      const offscreen = position === 'left' ? -100 : 100;
      gsap.set([panel, ...preLayers], { xPercent: offscreen });
      gsap.set(plusH, { transformOrigin: '50% 50%', rotate: 0 });
      gsap.set(plusV, { transformOrigin: '50% 50%', rotate: 90 });
      gsap.set(icon, { rotate: 0, transformOrigin: '50% 50%' });
      gsap.set(textInner, { yPercent: 0 });
      if (toggleBtnRef.current) gsap.set(toggleBtnRef.current, { color: menuButtonColor });
    });

    return () => {
      // revert context and kill any lingering timelines
      ctx.revert();
      openTlRef.current?.kill();
      closeTweenRef.current?.kill();
      spinTweenRef.current?.kill();
      textCycleAnimRef.current?.kill();
      colorTweenRef.current?.kill();
      itemEntranceTweenRef.current?.kill();
    };
  }, [menuButtonColor, position]);

  // build the open animation timeline (keeps your original staggered behavior)
  const buildOpenTimeline = useCallback(() => {
    const panel = panelRef.current;
    const layers = preLayerElsRef.current;
    if (!panel) return null;

    openTlRef.current?.kill();
    if (closeTweenRef.current) {
      closeTweenRef.current.kill();
      closeTweenRef.current = null;
    }
    itemEntranceTweenRef.current?.kill();

    const itemEls = Array.from(panel.querySelectorAll('.sm-panel-itemLabel'));
    const numberEls = Array.from(panel.querySelectorAll('.sm-panel-list[data-numbering] .sm-panel-item'));
    const socialTitle = panel.querySelector('.sm-socials-title');
    const socialLinks = Array.from(panel.querySelectorAll('.sm-socials-link'));

    const layerStates = layers.map(el => ({ el, start: Number(gsap.getProperty(el, 'xPercent')) }));
    const panelStart = Number(gsap.getProperty(panel, 'xPercent'));

    if (itemEls.length) gsap.set(itemEls, { yPercent: 140, rotate: 10 });
    if (numberEls.length) gsap.set(numberEls, { '--sm-num-opacity': 0 });
    if (socialTitle) gsap.set(socialTitle, { opacity: 0 });
    if (socialLinks.length) gsap.set(socialLinks, { y: 25, opacity: 0 });

    const tl = gsap.timeline({ paused: true });

    layerStates.forEach((ls, i) => {
      tl.fromTo(ls.el, { xPercent: ls.start }, { xPercent: 0, duration: 0.5, ease: 'power4.out' }, i * 0.07);
    });

    const lastTime = layerStates.length ? (layerStates.length - 1) * 0.07 : 0;
    const panelInsertTime = lastTime + (layerStates.length ? 0.08 : 0);
    const panelDuration = 0.65;
    tl.fromTo(panel, { xPercent: panelStart }, { xPercent: 0, duration: panelDuration, ease: 'power4.out' }, panelInsertTime);

    if (itemEls.length) {
      const itemsStartRatio = 0.15;
      const itemsStart = panelInsertTime + panelDuration * itemsStartRatio;
      tl.to(
        itemEls,
        {
          yPercent: 0,
          rotate: 0,
          duration: 1,
          ease: 'power4.out',
          stagger: { each: 0.1, from: 'start' }
        },
        itemsStart
      );
      if (numberEls.length) {
        tl.to(
          numberEls,
          {
            duration: 0.6,
            ease: 'power2.out',
            '--sm-num-opacity': 1,
            stagger: { each: 0.08, from: 'start' }
          },
          itemsStart + 0.1
        );
      }
    }

    if (socialTitle || socialLinks.length) {
      const socialsStart = panelInsertTime + panelDuration * 0.4;
      if (socialTitle) tl.to(socialTitle, { opacity: 1, duration: 0.5, ease: 'power2.out' }, socialsStart);
      if (socialLinks.length) {
        tl.to(
          socialLinks,
          {
            y: 0,
            opacity: 1,
            duration: 0.55,
            ease: 'power3.out',
            stagger: { each: 0.08, from: 'start' },
            onComplete: () => gsap.set(socialLinks, { clearProps: 'opacity' })
          },
          socialsStart + 0.04
        );
      }
    }

    openTlRef.current = tl;
    return tl;
  }, [position]);

  // play open animation and set busy guard
  const playOpen = useCallback(() => {
    if (busyRef.current) return;
    busyRef.current = true;
    const tl = buildOpenTimeline();
    if (tl) {
      tl.eventCallback('onComplete', () => {
        busyRef.current = false;
      });
      tl.play(0);
    } else {
      busyRef.current = false;
    }
  }, [buildOpenTimeline]);

  // play close animation and reset visual states
  const playClose = useCallback(() => {
    openTlRef.current?.kill();
    openTlRef.current = null;
    itemEntranceTweenRef.current?.kill();

    const panel = panelRef.current;
    const layers = preLayerElsRef.current;
    if (!panel) return;

    const all = [...layers, panel];
    closeTweenRef.current?.kill();
    const offscreen = position === 'left' ? -100 : 100;
    closeTweenRef.current = gsap.to(all, {
      xPercent: offscreen,
      duration: 0.32,
      ease: 'power3.in',
      overwrite: 'auto',
      onComplete: () => {
        const itemEls = Array.from(panel.querySelectorAll('.sm-panel-itemLabel'));
        if (itemEls.length) gsap.set(itemEls, { yPercent: 140, rotate: 10 });
        const numberEls = Array.from(panel.querySelectorAll('.sm-panel-list[data-numbering] .sm-panel-item'));
        if (numberEls.length) gsap.set(numberEls, { '--sm-num-opacity': 0 });
        const socialTitle = panel.querySelector('.sm-socials-title');
        const socialLinks = Array.from(panel.querySelectorAll('.sm-socials-link'));
        if (socialTitle) gsap.set(socialTitle, { opacity: 0 });
        if (socialLinks.length) gsap.set(socialLinks, { y: 25, opacity: 0 });
        busyRef.current = false;
      }
    });
  }, [position]);

  // spin/rotate the icon when toggling
  const animateIcon = useCallback(opening => {
    const icon = iconRef.current;
    if (!icon) return;
    spinTweenRef.current?.kill();
    if (opening) {
      spinTweenRef.current = gsap.to(icon, { rotate: 225, duration: 0.8, ease: 'power4.out', overwrite: 'auto' });
    } else {
      spinTweenRef.current = gsap.to(icon, { rotate: 0, duration: 0.35, ease: 'power3.inOut', overwrite: 'auto' });
    }
  }, []);

  // change toggle color if requested
  const animateColor = useCallback(
    opening => {
      const btn = toggleBtnRef.current;
      if (!btn) return;
      colorTweenRef.current?.kill();
      if (changeMenuColorOnOpen) {
        const targetColor = opening ? openMenuButtonColor : menuButtonColor;
        colorTweenRef.current = gsap.to(btn, { color: targetColor, delay: 0.18, duration: 0.3, ease: 'power2.out' });
      } else {
        gsap.set(btn, { color: menuButtonColor });
      }
    },
    [changeMenuColorOnOpen, openMenuButtonColor, menuButtonColor]
  );

  // set initial toggle color on mount / prop change
  useEffect(() => {
    if (toggleBtnRef.current) {
      if (changeMenuColorOnOpen) {
        const targetColor = openRef.current ? openMenuButtonColor : menuButtonColor;
        gsap.set(toggleBtnRef.current, { color: targetColor });
      } else {
        gsap.set(toggleBtnRef.current, { color: menuButtonColor });
      }
    }
  }, [changeMenuColorOnOpen, menuButtonColor, openMenuButtonColor]);

  // animated text cycling between "Menu" and "Close"
  const animateText = useCallback(opening => {
    const inner = textInnerRef.current;
    if (!inner) return;
    textCycleAnimRef.current?.kill();

    const currentLabel = opening ? 'Menu' : 'Close';
    const targetLabel = opening ? 'Close' : 'Menu';
    const cycles = 3;
    const seq = [currentLabel];
    let last = currentLabel;
    for (let i = 0; i < cycles; i++) {
      last = last === 'Menu' ? 'Close' : 'Menu';
      seq.push(last);
    }
    if (last !== targetLabel) seq.push(targetLabel);
    seq.push(targetLabel);
    setTextLines(seq);

    gsap.set(inner, { yPercent: 0 });
    const lineCount = seq.length;
    const finalShift = ((lineCount - 1) / lineCount) * 100;
    textCycleAnimRef.current = gsap.to(inner, { yPercent: -finalShift, duration: 0.5 + lineCount * 0.07, ease: 'power4.out' });
  }, []);

  // toggle menu: orchestrates state + animations
  const toggleMenu = useCallback(() => {
    const target = !openRef.current;
    openRef.current = target;
    setOpen(target);

    if (target) {
      // open workflow
      lastFocusedRef.current = document.activeElement;
      onMenuOpen?.();
      playOpen();
    } else {
      // close workflow
      onMenuClose?.();
      playClose();
    }

    animateIcon(target);
    animateColor(target);
    animateText(target);
  }, [playOpen, playClose, animateIcon, animateColor, animateText, onMenuOpen, onMenuClose]);

  // close when a menu item is clicked (let native navigation happen)
  const handleItemClick = useCallback(() => {
    openRef.current = false;
    setOpen(false);
    playClose();
    onMenuClose?.();
  }, [playClose, onMenuClose]);

  // when menu opens, move focus into the panel; when closes restore focus
  useEffect(() => {
    if (open) {
      // small delay to let DOM updates settle (and panel be portaled)
      const t = setTimeout(() => {
        const panel = panelRef.current;
        if (!panel) return;
        // find first focusable element inside panel
        const first = panel.querySelector(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (first) first.focus();
        // disable body scrolling while menu is open
        document.body.style.overflow = 'hidden';
      }, 60);
      return () => clearTimeout(t);
    } else {
      // restore scrolling and focus
      document.body.style.overflow = '';
      // restore last focus
      const prev = lastFocusedRef.current;
      if (prev && typeof prev.focus === 'function') prev.focus();
    }
  }, [open]);

  // keyboard handling: close on Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && openRef.current) {
        openRef.current = false;
        setOpen(false);
        playClose();
        onMenuClose?.();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [playClose, onMenuClose]);

  // click outside to close (ignore clicks on toggle and panel)
  useEffect(() => {
    const onPointer = (e) => {
      if (!openRef.current) return;
      const panel = panelRef.current;
      const toggle = toggleBtnRef.current;
      if (!panel) return;
      const target = e.target;
      if (panel.contains(target) || (toggle && toggle.contains(target))) return;
      // clicked outside
      openRef.current = false;
      setOpen(false);
      playClose();
      onMenuClose?.();
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [playClose, onMenuClose]);

  // Build the panel DOM (we'll portal it to body)
  const panelNode = (
    <aside
      id="staggered-menu-panel"
      ref={panelRef}
      className="staggered-menu-panel"
      aria-hidden={!open}
      role="dialog"
      aria-modal="true"
      style={{
        pointerEvents: open ? 'auto' : 'none'
      }}
    >
      {/* Close toggle inside the panel */}
      <div
        className="sm-panel-closeWrap"
        aria-hidden={!open}
        style={{ position: 'absolute', top: 16, right: 16, zIndex: 99999, pointerEvents: 'auto' }}
      >
        <button
          type="button"
          className="sm-panel-close"
          aria-label="Close menu"
          onClick={toggleMenu}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'inherit',
            fontWeight: 600,
            padding: '6px 8px'
          }}
        >
          <span className="sm-icon" aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="sm-icon-line" style={{ transform: 'translate(-50%, -50%)' }} />
            <span className="sm-icon-line sm-icon-line-v" style={{ transform: 'translate(-50%, -50%) rotate(90deg)' }} />
          </span>
        </button>
      </div>

      <div className="sm-panel-inner">
        <ul className="sm-panel-list" role="list" data-numbering={displayItemNumbering || undefined}>
          {items && items.length ? (
            items.map((it, idx) => (
              <li className="sm-panel-itemWrap" key={it.label + idx}>
                <a
                  className="sm-panel-item"
                  href={it.link}
                  aria-label={it.ariaLabel}
                  data-index={idx + 1}
                  onClick={handleItemClick}
                >
                  <span className="sm-panel-itemLabel">{it.label}</span>
                </a>
              </li>
            ))
          ) : (
            <li className="sm-panel-itemWrap" aria-hidden="true">
              <span className="sm-panel-item"><span className="sm-panel-itemLabel">No items</span></span>
            </li>
          )}
        </ul>

        {displaySocials && socialItems && socialItems.length > 0 && (
          <div className="sm-socials" aria-label="Social links">
            <h3 className="sm-socials-title">Socials</h3>
            <ul className="sm-socials-list" role="list">
              {socialItems.map((s, i) => (
                <li key={s.label + i} className="sm-socials-item">
                  <a
                    href={s.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sm-socials-link"
                    onClick={() => {
                      openRef.current = false;
                      setOpen(false);
                      playClose();
                    }}
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </aside>
  );

  return (
    <div
      className={(className ? className + ' ' : '') + 'staggered-menu-wrapper'}
      // expose accent as CSS var usable by your CSS file
      style={accentColor ? { ['--sm-accent']: accentColor } : undefined}
      data-position={position}
      data-open={open || undefined}
    >
      <div ref={preLayersRef} className="sm-prelayers" aria-hidden="true">
        {(() => {
          const raw = colors && colors.length ? colors.slice(0, 4) : ['#1e1e22', '#35353c'];
          let arr = [...raw];
          if (arr.length >= 3) {
            const mid = Math.floor(arr.length / 2);
            arr.splice(mid, 1);
          }
          return arr.map((c, i) => <div key={i} className="sm-prelayer" style={{ background: c }} />);
        })()}
      </div>

      <header className="staggered-menu-header" aria-label="Main navigation header">
        <div className="sm-logo" aria-label="Logo">
          <img
            src={logoUrl || '/images/savior.png'}
            alt="Logo"
            className="sm-logo-img"
            draggable={false}
            width={110}
            height={24}
          />
        </div>

        <button
          ref={toggleBtnRef}
          className="sm-toggle"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="staggered-menu-panel"
          onClick={toggleMenu}
          type="button"
        >
          <span ref={textWrapRef} className="sm-toggle-textWrap" aria-hidden="true">
            <span ref={textInnerRef} className="sm-toggle-textInner">
              {textLines.map((l, i) => (
                <span className="sm-toggle-line" key={i}>{l}</span>
              ))}
            </span>
          </span>
          <span ref={iconRef} className="sm-icon" aria-hidden="true">
            <span ref={plusHRef} className="sm-icon-line" />
            <span ref={plusVRef} className="sm-icon-line sm-icon-line-v" />
          </span>
        </button>
      </header>

      {/* portal the panel to body so it escapes stacking contexts that hide it */}
      {typeof document !== 'undefined' ? createPortal(panelNode, document.body) : panelNode}
    </div>
  );
}
