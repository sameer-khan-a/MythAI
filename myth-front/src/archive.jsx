import React from "react";

/**
 * ArchivePage_Simple_v3_userFriendly
 * - Clean, user-focused availability badges (Available / Subscription / Limited access).
 * - Stable links used for public-domain items; streaming/publisher links kept where appropriate.
 * - UI is the same as your original but friendlier to non-technical users.
 */

const ARTICLES = [
  { title: "Theorizing Myth: Narrative, Ideology, and Scholarship — Bruce Lincoln", url: "https://press.uchicago.edu/ucp/books/book/chicago/T/bo3637666.html", avail: "Available" },
  { title: "In Defense of the Accidental (Odo Marquard) — essay/book entry", url: "https://www.worldcat.org/search?q=In+Defense+of+the+Accidental+Odo+Marquard", avail: "Limited access" },
  { title: "The Golden Bough — James Frazer (full text)", url: "https://www.gutenberg.org/ebooks/3623", avail: "Available" },
  { title: "Teutonic Mythology — Viktor Rydberg (scan)", url: "https://archive.org/details/teutonicmytholo00rydb", avail: "Available" },
  { title: "The Power of Myth: How to Study Comparative Mythology (classic overview)", url: "https://archive.org/details/cu31924086007923", avail: "Available" },
  { title: "World Mythology 101 — Comparative Approaches", url: "https://press.rebus.community/mythology/", avail: "Available" },
  { title: "Universal Properties of Mythological Networks — Mac Carron & Kenna (EPL / arXiv)", url: "https://arxiv.org/abs/1205.4324", avail: "Available" },
  { title: "Network analysis of the Íslendinga Sögur — Mac Carron & Kenna", url: "https://arxiv.org/abs/1309.6134", avail: "Available" },
  { title: "Comparative Mythology — Encyclopedia summary", url: "https://en.wikipedia.org/wiki/Comparative_mythology", avail: "Available" },
  { title: "Oxford Reference — Comparative Mythology (library lookup)", url: "https://www.worldcat.org/search?q=Comparative+Mythology+Oxford+Reference", avail: "Limited access" }
];

const VIDEOS = [
  { title: "Introduction to the Comparative Mythology Methodology", url: "https://www.youtube.com/watch?v=RrTJYmQKmqo", avail: "Available" },
  { title: "Comparative Mythology of the Indo-European Creation Myth", url: "https://www.youtube.com/watch?v=YJVPXosPF8A", avail: "Available" },
  { title: "Comparative Mythology Lesson", url: "https://www.youtube.com/watch?v=1ov1j-rs4X4", avail: "Available" },
  { title: "Untangling Greek and Roman Mythology", url: "https://www.youtube.com/watch?v=fBatYo8shTM", avail: "Available" },
  { title: "Greek Mythology Explained (Compilation #1)", url: "https://www.youtube.com/watch?v=9hwNCmp4jX4", avail: "Available" },
  { title: "Comparative Mythology Sample Lesson", url: "https://www.youtube.com/watch?v=9pvg-aufo7s", avail: "Available" },
  { title: "Comparative Mythology: An Introductory Course (Playlist)", url: "https://www.youtube.com/playlist?list=PLTWgWMDElyORzVqSG2ykI_fpxuzsrrJ1b", avail: "Available" },
  { title: "Dr. Robert Moore | Georges Dumézil and The New Comparative Mythology", url: "https://www.youtube.com/watch?v=_XHpjW-gnRY", avail: "Available" },
  { title: "It’s Over: The End of Comparative Mythology?!", url: "https://www.youtube.com/watch?v=1e_CrOjH3xM", avail: "Available" },
  { title: "Spirituality, Comparative Mythology & Metaphysics (Playlist)", url: "https://www.youtube.com/playlist?list=PLFm_z83CPiFv-fc8leyXO8H-NnmyeY_pw", avail: "Available" }
];

const DOCS = [
  { title: "Myths & Monsters (2017) — Netflix", url: "https://www.netflix.com/title/80158649", avail: "Subscription" },
  { title: "The Power of Myth (1988) — Joseph Campbell & Bill Moyers", url: "https://billmoyers.com/series/joseph-campbell-and-the-power-of-myth-1988/", avail: "Available" },
  { title: "Clash of the Gods (2009) — History Channel", url: "https://www.history.com/shows/clash-of-the-gods", avail: "Available" },
  { title: "The Great Greek Myths (2015)", url: "https://en.wikipedia.org/wiki/The_Great_Greek_Myths", avail: "Available" },
  { title: "Myth Hunters (2015)", url: "https://en.wikipedia.org/wiki/MythHunters", avail: "Available" },
  { title: "Ancient Apocalypse (2022) — Graham Hancock", url: "https://en.wikipedia.org/wiki/Ancient_Apocalypse", avail: "Available" },
  { title: "The Entire Story of Greek Mythology", url: "https://topdocumentaryfilms.com/entire-story-greek-mythology/", avail: "Available" },
  { title: "Greece – Garden of the Gods (2005)", url: "https://archive.org/search.php?query=Garden%20of%20the%20Gods%20documentary%20Greece", avail: "Available" },
  { title: "The Storyteller: Greek Myths (1997)", url: "https://en.wikipedia.org/wiki/The_Storyteller_(British_TV_series)", avail: "Available" },
  { title: "Great Mythologies of the World (compilations)", url: "https://www.worldcat.org/search?q=Great+Mythologies+of+the+World", avail: "Limited access" }
];

export default function ArchivePageSimple() {
  return (
    <div className="archive-root" aria-live="polite">
      <div className="container">
        <header className="header">
          <h1>Archive — Knowledge Hub</h1>
          <p className="lede">Curated readings, lectures and films on comparative mythology — method first, then pattern-mapping.</p>
        </header>

        <Section title="Recommended Articles" subtitle="Ten foundational & contemporary pieces to ground your approach.">
          <Row>
            {ARTICLES.map((a, i) => (
              <SimpleCard key={i}>
                <h4>{a.title}</h4>
                <div className="meta">
                  <a href={a.url} target="_blank" rel="noopener noreferrer" className="btn-link">Open</a>
                  <AvailabilityChip status={a.avail} />
                </div>
              </SimpleCard>
            ))}
          </Row>
        </Section>

        <Section title="Recommended Videos" subtitle="Lectures, playlists and accessible primers.">
          <Row>
            {VIDEOS.map((v, i) => (
              <SimpleCard key={i}>
                <h4>{v.title}</h4>
                <div className="meta">
                  <a href={v.url} target="_blank" rel="noopener noreferrer" className="btn-link">Watch</a>
                  <AvailabilityChip status={v.avail} />
                </div>
              </SimpleCard>
            ))}
          </Row>
        </Section>

        <Section title="Documentaries & Shows" subtitle="Long-form viewing — speculative shows are noted in the copy.">
          <Row>
            {DOCS.map((d, i) => (
              <SimpleCard key={i}>
                <h4>{d.title}</h4>
                <div className="meta">
                  <a href={d.url} target="_blank" rel="noopener noreferrer" className="btn-link">Open</a>
                  <AvailabilityChip status={d.avail} />
                </div>
              </SimpleCard>
            ))}
          </Row>
        </Section>

        <footer className="footer">⚑ Quick note: "Subscription" items require a service account or purchase. Everything else should be publicly accessible in most regions.</footer>
      </div>

      <style>{`
        :root{
          --bg: rgba(6,10,18,0.98);
          --muted: rgba(255,235,205,0.95);
          --accent: #f46060ff;
          --card: rgba(255,255,255,0.03);
          --glass: rgba(255,255,255,0.02);
          --chip-available: rgba(34,197,94,0.12);
          --chip-limited: rgba(250,204,21,0.08);
          --chip-sub: rgba(59,130,246,0.08);
        }
        .archive-root{ padding:36px; min-height:100vh; background: rgba(2, 6, 23, 0.84) ; color:var(--muted); font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; }
        .container{ max-width:1100px; margin:0 auto; }
        .header{ text-align:center; margin-bottom:18px; }
        h1{ margin:0; color:var(--accent); font-family: Georgia, 'Times New Roman', serif; font-size:32px; }
        .lede{ color:var(--muted); margin-top:8px; max-width:820px; margin-left:auto; margin-right:auto; }

        h2{ color:var(--accent); margin:0 0 6px 0; font-size:20px; }
        section{ margin-top:28px; }

        .row{ display:flex; flex-wrap:wrap; gap:12px; margin-top:12px; }

        .archive-card{ flex:1 1 calc(50% - 12px); background:var(--bg); padding:14px; border-radius:12px; border:1px solid var(--card); box-shadow: 0 10px 26px rgba(2,6,23,0.45); transition: transform .16s ease, box-shadow .16s ease; min-width:280px; }
        .archive-card:hover{ transform: translateY(-6px); box-shadow: 0 18px 40px rgba(2,6,23,0.6); }

        h4{ margin:0 0 6px 0; color: #fff; font-size:16px; }
        .meta{ margin-top:10px; display:flex; align-items:center; gap:10px; flex-wrap:wrap; }

        .btn-link{ color:#ffd9c2; font-weight:700; text-decoration:none; padding:6px 10px; border-radius:8px; background:var(--glass); display:inline-block; }
        .btn-link:focus, .btn-link:hover{ text-decoration:underline; }

        .footer{ margin-top:28px; color:rgba(255,235,205,0.85); font-size:13px; text-align:center; }

        @media (max-width:520px){ .archive-root{ padding:18px; } h1{ font-size:22px; } .archive-card{ flex:1 1 100%; } }

        /* availability chips */
        .chip{ font-size:12px; padding:6px 8px; border-radius:999px; border:1px solid rgba(255,255,255,0.03); display:inline-flex; align-items:center; gap:8px; }
        .chip.available{ background:var(--chip-available); color: #bfeccd; }
        .chip.limited{ background:var(--chip-limited); color: #f8e3a0; }
        .chip.sub{ background:var(--chip-sub); color: #bbdbff; }
      `}</style>
    </div>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <section>
      <h2>{title}</h2>
      {subtitle && <p style={{ color: 'rgba(255,235,205,0.85)', marginTop:6 }}>{subtitle}</p>}
      <div className="row">{children}</div>
    </section>
  );
}

function Row({ children }){ return <div className="row">{children}</div>; }

function SimpleCard({ children }){ return <article className="archive-card">{children}</article>; }

function AvailabilityChip({ status }) {
  const map = {
    "Available": { cls: "available", label: "Available", emoji: "✔︎" },
    "Limited access": { cls: "limited", label: "Limited access", emoji: "ℹ︎" },
    "Subscription": { cls: "sub", label: "Subscription", emoji: "★" }
  };
  const s = map[status] || map["Available"];
  return (
    <span className={`chip ${s.cls}`} aria-hidden="false" title={s.label}>
      <span style={{ fontSize: 12 }}>{s.emoji}</span>
      <span>{s.label}</span>
    </span>
  );
}
