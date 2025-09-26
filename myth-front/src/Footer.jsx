// src/components/Footer.jsx
import React, { useEffect, useState, useRef } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { FaGithub } from "react-icons/fa";

/**
 * Enhanced Footer (Mythic Edition) — user-updated socials
 * - GitHub -> https://github.com/sameer-khan-a/MythAI.git
 * - Replaced Twitter & LinkedIn with Archive (internal) and Email (mailto)
 */

const mythQuotes = [
  "Deliverance begins with a counsel — then a step.",
  "When the world burns, the storyteller rewrites the map.",
  "Kings rule with law; myths rule with meaning.",
  "A saved soul is a community's prophecy fulfilled.",
  "Even forgotten gods return as ideas."
];

const motifList = [
  "deliverance", "dharma", "redemption", "exile",
  "rescue", "kingdom", "prophecy", "return", "rebirth"
];

const Footer = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(null); // null | "success" | "error" | "sending"
  const [quoteIndex, setQuoteIndex] = useState(0);
  const statusRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => {
      setQuoteIndex((i) => (i + 1) % mythQuotes.length);
    }, 6000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (status && statusRef.current) statusRef.current.focus();
  }, [status]);

  const validateEmail = (value) => /^\S+@\S+\.\S+$/.test(value);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!validateEmail(email)) {
      setStatus("error");
      return;
    }
    setStatus("sending");
    setTimeout(() => {
      setStatus("success");
      setEmail("");
      setTimeout(() => setStatus(null), 4200);
    }, 700);
  };

  const handleMotifClick = (m) => {
    navigator.clipboard?.writeText(m);
    setStatus("success");
    setTimeout(() => setStatus(null), 1400);
  };

  return (
    <footer
      className="py-5 mt-auto"
      style={{
        background: "linear-gradient(180deg,#FFD97A 0%, #FFC857 50%, #FFB03B 100%)",
        width: "100%",
        boxSizing: "border-box",
        borderTop: "1px solid rgba(0,0,0,0.06)",
        color: "#222"
      }}
    >
      <div className="container">
        <div className="row gy-4">
          {/* BRAND + Newsletter */}
          <div className="col-lg-4">
            <div className="d-flex align-items-start gap-3">
              <img
                src="/images/myths.png"
                alt="Myths Inc. logo — a stylized book and torch"
                style={{ height: 64, width: "auto", objectFit: "contain" }}
                loading="lazy"
              />
              <div>
                <h5 className="mb-1" style={{ marginTop: 6, fontWeight: 700 }}>
                  Myths Inc.
                </h5>
                <p className="mb-2 text-muted small">
                  We turn ancient stories into modern maps — slightly ominous, occasionally useful.
                </p>

                <form
                  className="d-flex gap-2 align-items-center"
                  onSubmit={handleSubscribe}
                  aria-label="Subscribe to myths newsletter"
                >
                  <label htmlFor="footer-news-email" className="visually-hidden">
                    Email address
                  </label>
                  <input
                    id="footer-news-email"
                    type="email"
                    className="form-control form-control-sm"
                    placeholder="you@coolmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={status === "error"}
                    aria-describedby={
                      status === "error" ? "news-error" : status === "success" ? "news-success" : undefined
                    }
                    style={{ maxWidth: 220 }}
                  />
                  <button
                    className="btn btn-sm btn-dark"
                    type="submit"
                    aria-label="Subscribe"
                    disabled={status === "sending"}
                  >
                    {status === "sending" ? "Sending…" : "Subscribe"}
                  </button>
                </form>

                <div className="mt-2" aria-live="polite" aria-atomic="true" tabIndex={-1} ref={statusRef}>
                  {status === "success" && (
                    <div id="news-success" className="small text-success">
                      Thanks — you're in. Check your inbox.
                    </div>
                  )}
                  {status === "error" && (
                    <div id="news-error" className="small text-danger">
                      Please enter a valid email address.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* micro-quote */}
            <div className="mt-3">
              <small className="text-muted" aria-live="polite">
                <em>“{mythQuotes[quoteIndex]}”</em>
              </small>
            </div>
          </div>

          {/* QUICK LINKS */}
          <div className="col-6 col-md-4 col-lg-2">
            <h6 className="mb-2">Quick links</h6>
            <ul className="list-unstyled small mb-0">
              <li>
                <a href="/" className="text-muted text-decoration-none">
                  Home
                </a>
              </li>
              <li>
                <a href="/about" className="text-muted text-decoration-none">
                  About
                </a>
              </li>
              <li>
                <a href="/explore" className="text-muted text-decoration-none">
                  Explore myths
                </a>
              </li>
              <li>
                <a href="/collections" className="text-muted text-decoration-none">
                  Collections
                </a>
              </li>
              <li>
                <a href="/contact" className="text-muted text-decoration-none">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* RESOURCES / LEGAL */}
          <div className="col-6 col-md-4 col-lg-2">
            <h6 className="mb-2">Resources</h6>
            <ul className="list-unstyled small mb-0">
              <li>
                <a href="/privacy" className="text-muted text-decoration-none">
                  Privacy
                </a>
              </li>
              <li>
                <a href="/terms" className="text-muted text-decoration-none">
                  Terms
                </a>
              </li>
              <li>
                <a href="/cookies" className="text-muted text-decoration-none">
                  Cookie Policy
                </a>
              </li>
              <li>
                <a href="/support" className="text-muted text-decoration-none">
                  Support
                </a>
              </li>
            </ul>
          </div>

          {/* CONTACT + MOTIFS */}
          <div className="col-md-12 col-lg-4">
            <h6 className="mb-2">Contact</h6>
            <address className="not-italic small text-muted mb-2">
              Myths Inc.
              <br />
              42 Storyteller Lane
              <br />
              Fictionville, FV 42042
            </address>

            <div className="small text-muted mb-2">
              <div>
                <strong>Email:</strong>{" "}
                <a href="mailto:hello@myths.example" className="text-muted text-decoration-none">
                  hello@myths.example
                </a>
              </div>
              <div>
                <strong>Phone:</strong>{" "}
                <a href="tel:+1234567890" className="text-muted text-decoration-none">
                  +1 (234) 567-890
                </a>
              </div>
              <div className="mt-2">
                <strong>Hours:</strong> Mon–Fri 9:00–18:00
              </div>
            </div>

            <div className="d-flex gap-3 align-items-center mt-3">
              {/* Replaced social icons with useful links */}
              <a href="/archive" className="text-muted text-decoration-none" aria-label="Archive hub">
                Archive
              </a>

              <a
                href="https://github.com/sameer-khan-a/MythAI.git"
                className="text-muted"
                aria-label="GitHub — MythAI repository"
                title="GitHub — MythAI"
                style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
              >
                <FaGithub size={18} />
                <span className="small text-muted">MythAI</span>
              </a>

              <a
                href="mailto:sameerkhan2003a@gmail.com"
                className="text-muted text-decoration-none"
                aria-label="Email the team"
                title="Email"
              >
                Email
              </a>

              <button
                className="btn btn-outline-secondary btn-sm ms-auto"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                aria-label="Back to top"
                title="Back to top"
              >
                ↑ Top
              </button>
            </div>

            {/* Myth motif chips */}
            <div className="mt-3">
              <div className="small text-muted mb-1">Motifs</div>
              <div className="d-flex flex-wrap gap-2">
                {motifList.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className="btn btn-sm btn-outline-dark"
                    onClick={() => handleMotifClick(m)}
                    title={`Copy motif "${m}"`}
                    aria-label={`Motif ${m}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <hr className="my-4" />

        <div className="row align-items-center">
          <div className="col-md-6 text-center text-md-start small text-muted">
            © {new Date().getFullYear()} Myths Inc. · All Rights Reserved
          </div>
          <div className="col-md-6 text-center text-md-end small text-muted">
            Built with restless curiosity · <a href="/sitemap.xml" className="text-muted text-decoration-none">Sitemap</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
