// src/ArchivePage_Simple.jsx
import React from "react";

/**
 * ArchivePage_Simple
 * - No tilt, no fancy transforms — simple cards for accessibility & clarity.
 * - Uses the curated arrays of links (articles, videos, documentaries).
 * - Lightweight, easy to theme or convert to server-rendered markup.
 */

const ARTICLES = [
  { title: "Theorizing Myth: Narrative, Ideology, and Scholarship — Bruce Lincoln", url: "https://press.uchicago.edu/ucp/books/book/chicago/T/bo3634358.html" },
  { title: "In Defense of the Accidental (Odo Marquard) — essay/book entry", url: "https://www.sup.org/books/title/?id=20888" },
  { title: "The Golden Bough — James Frazer (full text)", url: "https://www.gutenberg.org/ebooks/3623" },
  { title: "Teutonic Mythology — Viktor Rydberg (scan)", url: "https://archive.org/details/teutonicmytholog01rydb" },
  { title: "The Power of Myth: How to Study Comparative Mythology (essay)", url: "https://www.sacredearthjourneys.ca/blog/comparative-mythology-overview/" },
  { title: "World Mythology 101 — Comparative Approaches", url: "https://press.rebus.community/mythology/" },
  { title: "Universal Properties of Mythological Networks — Kenna & Mac Carron (arXiv)", url: "https://arxiv.org/abs/1201.4491" },
  { title: "Network analysis of the Íslendinga Sögur — Kenna & Mac Carron (arXiv)", url: "https://arxiv.org/abs/1303.6208" },
  { title: "Comparative Mythology — Encyclopedia Britannica", url: "https://www.britannica.com/topic/comparative-mythology" },
  { title: "Oxford Reference — Comparative Mythology", url: "https://www.oxfordreference.com/display/10.1093/oi/authority.20110803095603851" }
];

const VIDEOS = [
  { title: "Introduction to the Comparative Mythology Methodology", url: "https://www.youtube.com/watch?v=RrTJYmQKmqo" },
  { title: "Comparative Mythology of the Indo-European Creation Myth", url: "https://www.youtube.com/watch?v=YJVPXosPF8A" },
  { title: "Comparative Mythology Lesson", url: "https://www.youtube.com/watch?v=1ov1j-rs4X4" },
  { title: "Untangling Greek and Roman Mythology", url: "https://www.youtube.com/watch?v=fBatYo8shTM" },
  { title: "Greek Mythology Explained (Compilation #1)", url: "https://www.youtube.com/watch?v=9hwNCmp4jX4" },
  { title: "Comparative Mythology Sample Lesson", url: "https://www.youtube.com/watch?v=9pvg-aufo7s" },
  { title: "Comparative Mythology: An Introductory Course (Playlist)", url: "https://www.youtube.com/playlist?list=PLTWgWMDElyORzVqSG2ykI_fpxuzsrrJ1b" },
  { title: "Dr. Robert Moore | Georges Dumézil and The New Comparative Mythology", url: "https://www.youtube.com/watch?v=_XHpjW-gnRY" },
  { title: "It’s Over: The End of Comparative Mythology?!", url: "https://www.youtube.com/watch?v=1e_CrOjH3xM" },
  { title: "Spirituality, Comparative Mythology & Metaphysics (Playlist)", url: "https://www.youtube.com/playlist?list=PLFm_z83CPiFv-fc8leyXO8H-NnmyeY_pw" }
];

const DOCS = [
  { title: "Myths & Monsters (2017) — Netflix", url: "https://www.netflix.com/title/80158649" },
  { title: "The Power of Myth (1988) — Joseph Campbell & Bill Moyers", url: "https://billmoyers.com/series/joseph-campbell-and-the-power-of-myth-1988/" },
  { title: "Clash of the Gods (2009) — History Channel", url: "https://www.imdb.com/title/tt1494806/" },
  { title: "The Great Greek Myths (2015)", url: "https://tv.apple.com/gb/show/the-great-greek-myths/umc.cmc.zqqmloybgchvjp2j9l9n8kb" },
  { title: "Myth Hunters (2015)", url: "https://www.netflix.com/title/80004288" },
  { title: "Ancient Apocalypse (2022) — Graham Hancock", url: "https://en.wikipedia.org/wiki/Ancient_Apocalypse" },
  { title: "The Entire Story of Greek Mythology", url: "https://topdocumentaryfilms.com/entire-story-greek-mythology/" },
  { title: "Greece – Garden of the Gods (2005)", url: "https://www.factualamerica.com/the-unseen-realm/mythology-documentaries" },
  { title: "The Storyteller: Greek Myths (1997)", url: "https://www.factualamerica.com/the-unseen-realm/mythology-documentaries" },
  { title: "Great Mythologies of the World (compilations)", url: "https://www.imdb.com/title/tt1214565/" }
];

export default function ArchivePageSimple() {
  return (
    <div style={{ padding: 36, color: "#FFEBCD", minHeight: "100vh", background: "transparent" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <header style={{ textAlign: "center", marginBottom: 18 }}>
          <h1 style={{ margin: 0, color: "#fd3c3c", fontFamily: "Georgia, serif" }}>Archive — Knowledge Hub</h1>
          <p style={{ color: "rgba(255,235,205,0.9)", marginTop: 8, maxWidth: 820, marginLeft: "auto", marginRight: "auto" }}>
            Curated readings, lectures and films on comparative mythology — method first, then pattern-mapping.
          </p>
        </header>

        <Section title="Recommended Articles" subtitle="Ten foundational & contemporary pieces to ground your approach.">
          <Grid>
            {ARTICLES.map((a, i) => (
              <SimpleCard key={i}>
                <h4 style={{ margin: "0 0 6px" }}>{a.title}</h4>
                <div style={{ marginTop: 8 }}>
                  <a href={a.url} target="_blank" rel="noreferrer" className="btn-link">
                    Read → 
                  </a>
                </div>
              </SimpleCard>
            ))}
          </Grid>
        </Section>

        <Section title="Recommended Videos" subtitle="Lectures, playlists and accessible primers.">
          <Grid>
            {VIDEOS.map((v, i) => (
              <SimpleCard key={i}>
                <h4 style={{ margin: "0 0 6px" }}>{v.title}</h4>
                <div style={{ marginTop: 8 }}>
                  <a href={v.url} target="_blank" rel="noreferrer" className="btn-link">
                    Watch → 
                  </a>
                </div>
              </SimpleCard>
            ))}
          </Grid>
        </Section>

        <Section title="Documentaries & Shows" subtitle="Long-form viewing — flag the speculative ones as such.">
          <Grid>
            {DOCS.map((d, i) => (
              <SimpleCard key={i}>
                <h4 style={{ margin: "0 0 6px" }}>{d.title}</h4>
                <div style={{ marginTop: 8 }}>
                  <a href={d.url} target="_blank" rel="noreferrer" className="btn-link">
                    Open →
                  </a>
                </div>
              </SimpleCard>
            ))}
          </Grid>
        </Section>
      </div>

      <style>{`
        .btn-link {
          color: #ffd9c2;
          font-weight: 700;
          text-decoration: none;
        }
        .btn-link:focus,
        .btn-link:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}

/* small presentational helpers */
function Section({ title, subtitle, children }) {
  return (
    <section style={{ marginTop: 28 }}>
      <h2 style={{ color: "#fd3c3c", margin: 0 }}>{title}</h2>
      {subtitle && <p style={{ color: "rgba(255,235,205,0.85)", marginTop: 6 }}>{subtitle}</p>}
      {children}
    </section>
  );
}

function Grid({ children }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))",
      gap: 12,
      marginTop: 12
    }}>
      {children}
    </div>
  );
}

function SimpleCard({ children }) {
  return (
    <article
      className="archive-card"
      style={{
        background: "rgba(6,10,18,0.96)",
        padding: 14,
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.03)",
        boxShadow: "0 10px 26px rgba(2,6,23,0.45)"
      }}
    >
      {children}
    </article>
  );
}
