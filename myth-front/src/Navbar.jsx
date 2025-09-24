// src/components/Navbar.jsx
import React, { useEffect, useRef, useState } from "react";
import StaggeredMenu from "./assets/Bits/StaggeredMenu"; // <- correct path

const menuItems = [
  { label: "Home", link: "/", ariaLabel: "Return to the beginning" },
  { label: "About", link: "/about", ariaLabel: "Discover who we are and why myths matter" },
  { label: "Archive", link: "/archive", ariaLabel: "Explore the library of myth essays and motifs" },
  { label: "Contact", link: "/contact", ariaLabel: "Reach out and share your thoughts" }
];


const socialItems = [
  { label: "Twitter", link: "https://twitter.com" },
  { label: "GitHub", link: "https://github.com" },
  { label: "LinkedIn", link: "https://linkedin.com" }
];

export default function Navbar() {
  // client-only menu render to avoid SSR mismatch
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => setMounted(true), []);

  // NEW: after mount, force the menu toggle button to show "☰ Menu"
  useEffect(() => {
    if (!mounted) return;
    const btn = document.querySelector(
      ".site-staggered-menu button, .site-staggered-menu [role='button']"
    );
    if (btn) {
      btn.textContent = "☰ Menu";
      btn.setAttribute("aria-label", "Menu");
    }
  }, [mounted]);

  const injectedCss = `
    .site-staggered-menu,
    .site-staggered-menu * {
      background: transparent !important;
      background-image: none !important;
      box-shadow: none !important;
      border: 0 !important;
    }
    .site-staggered-menu::before,
    .site-staggered-menu::after {
      display: none !important;
      content: none !important;
    }
    .site-staggered-menu button,
    .site-staggered-menu [role="button"] {
      color: #111 !important;
      background: rgba(255,255,255,0.9) !important;
      padding: 6px 10px !important;
      border-radius: 8px !important;
      min-width: 44px !important;
      white-space: normal !important;
      text-indent: 0 !important;
      box-shadow: none !important;
    }
    .site-staggered-menu .visually-hidden,
    .site-staggered-menu .sr-only,
    .site-staggered-menu .u-screen-reader {
      position: static !important;
      width: auto !important;
      height: auto !important;
      clip: auto !important;
      clip-path: none !important;
      overflow: visible !important;
      opacity: 1 !important;
      white-space: normal !important;
    }
    .site-staggered-menu button:focus,
    .site-staggered-menu [role="button"]:focus {
      outline: none !important;
      box-shadow: 0 0 0 4px rgba(0,0,0,0.08) !important;
    }
    .navbar-menu-fallback {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      border-radius: 8px;
      background: rgba(255,255,255,0.92);
      color: #111;
      border: 0;
      font-size: 13px;
      cursor: pointer;
    }
    @media(min-width: 768px) { .navbar-menu-fallback { display: none; } }
  `;

  const triggerInnerToggle = () => {
    if (menuRef.current) {
      const btn = menuRef.current.querySelector("button, [role='button']");
      if (btn && btn instanceof HTMLElement) {
        btn.click();
        btn.focus();
        return;
      }
    }
    const selectors = [
      ".site-staggered-menu button",
      ".staggered-menu button",
      "[data-staggered] button",
      ".menu-toggle",
      ".menu-btn",
      "button[aria-haspopup]",
      "button[aria-expanded]"
    ];
    for (const s of selectors) {
      const el = document.querySelector(s);
      if (el && el instanceof HTMLElement) {
        el.click();
        el.focus();
        return;
      }
    }
    console.warn("Navbar: couldn't find inner menu toggle to trigger.");
  };

  return (
    <div
      className="app-navbar"
      style={{
        background: "linear-gradient(180deg,#FFD97A 0%, #FFC857 50%, #FFB03B 100%)",
        width: "100vw",
        height: "112px",
        marginTop: "0rem",
        display: "flex",
        marginBottom: "0rem",
        alignItems: "center",
        padding: "0 10px",
        boxSizing: "border-box",
        position: "relative",
        zIndex: 20
      }}
    >
      <style>{injectedCss}</style>

      {/* spacer */}
      <div style={{ flex: 1 }} />

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          type="button"
          aria-label="Open menu"
          className="navbar-menu-fallback"
          onClick={triggerInnerToggle}
        >
          <span style={{ fontSize: 14, color: "black" }}>☰</span>
          <span>Menu</span>
        </button>

        <div ref={menuRef} style={{ display: "inline-block" }}>
          {mounted && (
            <StaggeredMenu
              className="site-staggered-menu"
              position="right"
              items={menuItems}
              socialItems={socialItems}
              displaySocials={true}
              displayItemNumbering={true}
              menuButtonColor="#fff"
              openMenuButtonColor="#000"
              changeMenuColorOnOpen={true}
              colors={["transparent", "transparent"]}
              logoUrl="/images/myths.png"
              accentColor="#ff6b6b"
              onMenuOpen={() => console.log("Menu opened")}
              onMenuClose={() => console.log("Menu closed")}
            />
          )}
        </div>
      </div>
    </div>
  );
}
