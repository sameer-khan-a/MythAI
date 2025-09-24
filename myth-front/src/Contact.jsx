import React, { useState, useRef, useEffect } from "react";
import emailjs from "@emailjs/browser";

/**
 * ContactFormMythAbout — smoother micro-interactions & transitions
 * - explicit emailjs.send with templateParams (from_name/from_email/subject/message/sent_at)
 * - smooth easing, subtle 3D depth on hover/focus
 * - auto-resize textarea
 * - toast animated with rAF for snappy feel (but respects reduced-motion)
 * - reduced-motion support
 *
 * Replace EMAILJS_* with your values as needed.
 */

export default function ContactFormMythAbout() {
  const liveRef = useRef(null);
  const toastTimer = useRef(null);
  const toastRAF = useRef(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
    hp: ""
  });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState({ type: "", msg: "" });
  const [toast, setToast] = useState("");
  const [toastVisible, setToastVisible] = useState(false);

  // EmailJS values (replace if you like)
  const EMAILJS_SERVICE = "service_1itxm3p";
  const EMAILJS_TEMPLATE = "template_0okk39t";
  const EMAILJS_PUBLIC = "sm84rSuh9RmGWbAtw";

  // reduced-motion check
  const isReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    return () => {
      clearTimeout(toastTimer.current);
      if (toastRAF.current) cancelAnimationFrame(toastRAF.current);
    };
  }, []);

  function update(k, v) {
    setForm((s) => ({ ...s, [k]: v }));
    if (status.msg) setStatus({ type: "", msg: "" });
  }

  function validEmail(e) {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);
  }

  // tasteful toast that uses rAF for entrance timing (only if motion allowed)
  function pushToast(msg) {
    setToast(msg);
    if (liveRef.current) liveRef.current.textContent = msg;

    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastVisible(true);

    // schedule hide
    toastTimer.current = setTimeout(() => {
      // animate hide via state + rAF if ok
      if (!isReducedMotion) {
        // give CSS a frame to apply class before hiding
        toastRAF.current = requestAnimationFrame(() => {
          setToastVisible(false);
          // finally clear after CSS duration (240ms)
          toastTimer.current = setTimeout(() => setToast(""), 240);
        });
      } else {
        // immediate hide for reduced motion
        setToastVisible(false);
        setToast("");
      }
    }, 2200);
  }

  // auto-resize textarea
  function handleTextareaResize(el) {
    if (!el) return;
    el.style.height = "0px";
    const h = el.scrollHeight;
    el.style.height = Math.max(120, h) + "px";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (busy) return;

    // validation
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setStatus({ type: "error", msg: "Please complete the required fields." });
      pushToast("Please complete required fields.");
      return;
    }
    if (!validEmail(form.email)) {
      setStatus({ type: "error", msg: "Please enter a valid email." });
      pushToast("Invalid email.");
      return;
    }

    // honeypot
    if (form.hp) {
      setStatus({ type: "success", msg: "Message sent — thanks." });
      setForm({ name: "", email: "", subject: "", message: "", hp: "" });
      pushToast("Message sent — thanks.");
      return;
    }

    setBusy(true);

    const templateParams = {
      from_name: form.name || "(anonymous)",
      from_email: form.email || "(no-email)",
      subject: form.subject || "(no-subject)",
      message: form.message,
      sent_at: new Date().toLocaleString()
    };

    try {
      await emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, templateParams, EMAILJS_PUBLIC);
      setStatus({ type: "success", msg: "Message sent — thanks. We'll be in touch soon." });
      setForm({ name: "", email: "", subject: "", message: "", hp: "" });
      pushToast("Sent — we'll reply soon.");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("EmailJS send error:", err);
      setStatus({ type: "error", msg: "Send failed. Try again later or email directly." });
      pushToast("Send failed. Try again later.");
    } finally {
      setBusy(false);
    }
  }

  // small helpers for classes
  const fieldClass = (value) => (value ? "field filled" : "field");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "transparent",
        color: "#FFEBCD",
        padding: "32px 0"
      }}
    >
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "0 18px" }}>
        <style>{`
          :root{
            --maroon: #fd3c3cff;
            --blanchedalmond: #FFEBCD;
            --panel-glass: rgba(10, 14, 20, 0.97);
            --radius: 12px;
            --focus: 3px solid rgba(128,0,0,0.5);
            --ease-s: cubic-bezier(.16,.84,.3,1);
            --ease-m: cubic-bezier(.2,.9,.2,1);
          }

          /* panel */
          .contact-panel {
            background: var(--panel-glass);
            padding: 20px;
            border-radius: var(--radius);
            border: 1px solid rgba(255,255,255,0.05);
            backdrop-filter: blur(6px) saturate(120%);
            color: var(--blanchedalmond);
            will-change: transform;
            transform-origin: center;
          }
          .contact-panel:hover {  box-shadow: 0 22px 48px rgba(2,6,23,0.55); }

          .contact-hero { text-align:center; margin-bottom: 1rem; }
          .contact-title { font-family: Georgia, 'Times New Roman', serif; font-size: 1.6rem; margin: 0; color: var(--maroon); }
          .contact-sub { color: black; margin-top: 6px; font-size: 0.98rem; opacity: 0.95; }

          .form-row { display:grid; grid-template-columns: 1fr 1fr; gap:12px; align-items:start; }

          /* floating label field */
          .field {
            position: relative;
            margin-bottom: 6px;
            transition: transform 280ms var(--ease-s);
          }
          .field input,
          .field textarea {
            background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.02));
            border: 1px solid rgba(255,255,255,0.06);
            color: var(--blanchedalmond);
            padding: 14px 12px 12px 12px;
            border-radius: 10px;
            width:100%;
            font-size:0.95rem;
            transition: border-color 220ms var(--ease-s), box-shadow 220ms var(--ease-s), background 220ms var(--ease-s), transform 220ms var(--ease-s);
            resize: vertical;
            caret-color: var(--maroon);
            transform-origin: center;
          }
          .field textarea { padding-top: 12px; min-height: 120px; max-height: 360px; }

          .label {
            position: absolute;
            left: 14px;
            top: 14px;
            font-weight:700;
            color: rgba(255,235,205,0.85);
            font-size: 0.92rem;
            pointer-events: none;
            transform-origin: left top;
            transition: transform 220ms var(--ease-s), font-size 220ms var(--ease-s), top 220ms var(--ease-s), color 220ms var(--ease-s);
            background: transparent;
            padding: 0 4px;
          }

          /* float up */
          .field.filled .label,
          .field input:focus + .label,
          .field textarea:focus + .label {
            transform: translateY(-12px) scale(0.82);
            top: 8px;
            font-size: 0.78rem;
            color: var(--blanchedalmond);
          }

          /* subtle depth on focus */
          .field input:focus,
          .field textarea:focus {
            border-color: var(--maroon);
            background: linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.02));
            outline: none;
            box-shadow: 0 8px 30px rgba(128,0,0,0.06);
            transform: translateZ(10px);
          }

          .muted { color: rgba(255,235,205,0.78); font-size:0.88rem; }

          .btn-primary {
            background: linear-gradient(90deg,var(--maroon), #7c3aed);
            color:#fff;
            padding:10px 14px;
            border-radius:10px;
            font-weight:700;
            border: none;
            cursor:pointer;
            transition: transform 180ms var(--ease-s), box-shadow 180ms var(--ease-s), filter 180ms var(--ease-s);
            display:inline-flex;
            align-items:center;
            gap:8px;
            transform-origin: center;
          }
          .btn-primary:hover { transform: translateY(-3px) scale(1.01); box-shadow: 0 14px 36px rgba(124,58,237,0.12); }
          .btn-primary:active { transform: translateY(-1px) scale(0.998); }

          .btn-outline {
            background: transparent;
            border: 1px solid rgba(255,255,255,0.12);
            padding:10px 14px;
            border-radius:10px;
            color: var(--blanchedalmond);
            cursor:pointer;
            font-weight:700;
            transition: transform 140ms var(--ease-s);
            background-clip: padding-box;
          }
          .btn-outline:hover { transform: translateY(-3px); }

          .small-note { font-size:0.86rem; color: rgba(255,235,205,0.78); }

          /* spinner */
          .spinner {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            border: 2px solid rgba(255,255,255,0.18);
            border-top-color: #fff;
            animation: spin 900ms linear infinite;
            display:inline-block;
          }
          @keyframes spin { to { transform: rotate(360deg); } }

          /* toast */
          .toast {
            position: fixed;
            right: 18px;
            bottom: 18px;
            background: linear-gradient(180deg, rgba(3,6,12,0.95), rgba(3,6,12,0.9));
            color: var(--blanchedalmond);
            padding:10px 14px;
            border-radius:12px;
            box-shadow: 0 12px 36px rgba(2,6,23,0.6);
            opacity: 0;
            transform: translateY(8px) scale(0.985);
            transition: opacity 220ms var(--ease-s), transform 260ms var(--ease-s);
            z-index: 9999;
            border: 1px solid rgba(255,255,255,0.03);
            will-change: transform, opacity;
          }
          .toast.show { opacity:1; transform: translateY(0) scale(1); }

          /* status box */
          .status {
            padding: 12px;
            border-radius: 10px;
            margin-top: 12px;
            border: 1px solid rgba(255,255,255,0.03);
            display:flex;
            gap:12px;
            align-items:flex-start;
            transition: transform 240ms var(--ease-m), opacity 240ms var(--ease-m);
            will-change: transform, opacity;
          }
          .status.success { background: linear-gradient(180deg, rgba(18,100,20,0.06), rgba(18,100,20,0.02)); border-color: rgba(18,100,20,0.08); }
          .status.error { background: linear-gradient(180deg, rgba(120,20,20,0.06), rgba(120,20,20,0.02)); border-color: rgba(120,20,20,0.08); }

          /* small success check */
          .check {
            width:30px;
            height:30px;
            border-radius:8px;
            display:grid;
            place-items:center;
            background: rgba(255,255,255,0.02);
            font-weight:700;
            transform-origin:center;
          }

          /* small shake for error panel (tasteful) */
          .shake { animation: shake 420ms cubic-bezier(.36,.07,.19,.97); }
          @keyframes shake {
            10%, 90% { transform: translateX(-1px) }
            20%, 80% { transform: translateX(2px) }
            30%, 50%, 70% { transform: translateX(-4px) }
            40%, 60% { transform: translateX(4px) }
          }

          @media (max-width:700px) { .form-row { grid-template-columns: 1fr; } }

          /* reduced motion: neutralize animations but keep visibility changes */
          @media (prefers-reduced-motion: reduce) {
            :root { --ease-s: linear; --ease-m: linear; }
            .contact-panel, .field input, .field textarea, .btn-primary, .btn-outline, .toast, .status { transition: none !important; animation: none !important; }
            .spinner { display: none; }
          }
        `}</style>

        <div className="contact-hero">
          <h2 className="contact-title">Reach us</h2>
          <p className="contact-sub">Questions, feedback, or bugs? Drop a message — we’ll get back to help.</p>
        </div>

        <section
          className={`contact-panel ${status.type === "error" ? "shake" : ""}`}
          aria-labelledby="contact-title"
        >
          <h3 id="contact-title" style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--maroon)" }}>
            Contact
          </h3>

          <form onSubmit={handleSubmit} noValidate style={{ marginTop: 12 }}>
            {/* honeypot - visually hidden */}
            <div style={{ position: "absolute", left: "-9999px", top: "auto", width: "1px", height: "1px", overflow: "hidden" }} aria-hidden="true">
              <label>Leave this field empty</label>
              <input
                name="hp"
                tabIndex={-1}
                autoComplete="off"
                value={form.hp}
                onChange={(e) => update("hp", e.target.value)}
              />
            </div>

            <div className="form-row">
              <div className={fieldClass(form.name)}>
                <input
                  id="cf-name"
                  name="user_name"
                  type="text"
                  placeholder=" "
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  required
                  aria-required="true"
                  autoComplete="name"
                />
                <label className="label" htmlFor="cf-name">Name <span aria-hidden style={{ color: "#ff6b6b" }}>*</span></label>
              </div>

              <div className={fieldClass(form.email)}>
                <input
                  id="cf-email"
                  name="user_email"
                  type="email"
                  placeholder=" "
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  required
                  aria-required="true"
                  autoComplete="email"
                />
                <label className="label" htmlFor="cf-email">Email <span aria-hidden style={{ color: "#ff6b6b" }}>*</span></label>
              </div>
            </div>

            <div className={fieldClass(form.subject)} style={{ marginTop: 12 }}>
              <input
                id="cf-subject"
                name="subject"
                type="text"
                placeholder=" "
                value={form.subject}
                onChange={(e) => update("subject", e.target.value)}
                autoComplete="on"
              />
              <label className="label" htmlFor="cf-subject">Subject</label>
            </div>

            <div className={fieldClass(form.message)} style={{ marginTop: 12 }}>
              <textarea
                id="cf-message"
                name="message"
                placeholder=" "
                rows={6}
                value={form.message}
                onChange={(e) => {
                  update("message", e.target.value);
                  // auto-resize the textarea
                  handleTextareaResize(e.target);
                }}
                required
                ref={(el) => {
                  if (el) handleTextareaResize(el);
                }}
              />
              <label className="label" htmlFor="cf-message">Message <span aria-hidden style={{ color: "#ff6b6b" }}>*</span></label>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                <div className="small-note">{form.message.length} chars</div>
                <div className="small-note">Required fields marked *</div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
              <button
                type="button"
                className="btn-outline"
                onClick={() => {
                  setForm({ name: "", email: "", subject: "", message: "", hp: "" });
                  setStatus({ type: "", msg: "" });
                }}
                disabled={busy}
                aria-disabled={busy}
              >
                Clear
              </button>

              <button
                type="submit"
                className="btn-primary"
                disabled={busy}
                aria-live="polite"
                aria-busy={busy}
              >
                {busy ? (
                  <>
                    <span className="spinner" role="status" aria-hidden="true" />
                    Sending…
                  </>
                ) : (
                  "Send message"
                )}
              </button>
            </div>
          </form>

          <div style={{ marginTop: 12 }} aria-live="polite">
            {status.msg && (
              <div className={`status ${status.type === "success" ? "success" : "error"}`} role="status">
                <div className="check" aria-hidden>
                  {status.type === "success" ? "✓" : "!"}
                </div>
                <div>
                  <div style={{ fontWeight: 700 }}>{status.type === "success" ? "Thanks" : "Oops"}</div>
                  <div style={{ marginTop: 6 }}>{status.msg}</div>
                </div>
              </div>
            )}
          </div>
        </section>

        <div
          role="status"
          aria-live="polite"
          ref={liveRef}
          className={`toast ${toastVisible ? "show" : ""}`}
          style={{ display: toast || toastVisible ? undefined : "none" }}
        >
          {toast}
        </div>
      </div>
    </div>
  );
}
