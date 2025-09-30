// src/components/Navbar.jsx
import React, { useEffect, useState } from "react";
import PillNav from "./assets/Bits/PillNav";
import logo from "/public/images/myths.png";

const menuItems = [
  { label: "Home", link: "/", ariaLabel: "Return to the beginning" },
  { label: "About", link: "/about", ariaLabel: "Discover who we are and why myths matter" },
  { label: "Archive", link: "/archive", ariaLabel: "Explore the library of myth essays and motifs" },
  { label: "Contact", link: "/contact", ariaLabel: "Reach out and share your thoughts" }
];

export default function Navbar() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const pillItems = menuItems.map((it) => ({ label: it.label, href: it.link }));

  return (
    <header
      className="app-navbar"
      style={{
        width: "100vw",
        height: 112,
        display: "flex",
        alignItems: "center",
        justifyContent: "center", // centers nav horizontally
        padding: "0 0px",
        boxSizing: "border-box",
        position: "relative",
        zIndex: 20,
      }}
    >
      <div
        className="nav-center"
        aria-label="Primary navigation"
        style={{
          display: "flex",
          justifyContent: "center", // keeps it centered inside
          alignItems: "center",
          width: "100%",
        }}
      >
        {mounted && (
          <div
            className="custom-nav"
            role="navigation"
            aria-label="Pill navigation"
            style={{
              display: "flex",
              justifyContent: "center", // centers the pills themselves
              alignItems: "center",
              gap: "12px",
            }}
          >
            <PillNav
              logo={logo}
              logoAlt="Myths logo"
              items={pillItems}
              activeHref="/"
              className="custom-nav"
              ease="power2.easeOut"
              baseColor="#000000"
              pillColor="#ffffff"
              hoveredPillTextColor="#ffffff"
              pillTextColor="#000000"
            />
          </div>
        )}
      </div>
    </header>
  );
}
