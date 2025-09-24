// src/App.jsx
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import 'bootstrap/dist/css/bootstrap.min.css';

// Lazy-load heavy pages to keep initial bundle small
const MythHome = lazy(() => import('./MythHome'));
const MythPage = lazy(() => import('./MythPage'));
const MythAbout = lazy(() => import('./about'));
const Contact = lazy(() => import('./Contact'));
const Archive = lazy(() => import('./archive.jsx')); // <-- added

/**
 * Adjust these to match your Navbar/Footer heights.
 * Navbar uses 112px in your component, so keep NAV_HEIGHT consistent.
 */
const NAV_HEIGHT = 112;
const FOOTER_APPROX = 220; // approximate footer height for layout calculations

// Scroll-to-top helper: scrolls on route changes, respects reduced-motion
function ScrollToTopOnNavigate() {
  const { pathname } = useLocation();
  React.useEffect(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, left: 0, behavior: reduce ? 'auto' : 'smooth' });
  }, [pathname]);
  return null;
}

// Basic error boundary so a busted page doesn't break the whole shell.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(err, info) {
    console.error('Unhandled error in route:', err, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="container my-5">
          <div className="alert alert-danger">
            <h5 className="mb-2">Something went wrong.</h5>
            <p className="mb-2">The page failed to render. Try refreshing or come back later.</p>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>
              {String(this.state.error)}
            </pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <BrowserRouter>
      {/* Global skip link for keyboard users */}
      <a
        href="#maincontent"
        className="visually-hidden-focusable"
        style={{
          position: 'absolute',
          left: -9999,
          top: 'auto',
          width: 1,
          height: 1,
          overflow: 'hidden',
        }}
      >
        Skip to content
      </a>

      <Navbar />

      <main
        id="maincontent"
        className="container my-4"
        style={{
          minHeight: `calc(100vh - ${NAV_HEIGHT + FOOTER_APPROX}px)`,
          paddingTop: 8,
        }}
      >
        <ErrorBoundary>
          <Suspense
            fallback={
              <div
                className="d-flex justify-content-center align-items-center"
                style={{ height: 200 }}
              >
                <div
                  className="spinner-border text-secondary"
                  role="status"
                  aria-hidden
                ></div>
                <span className="ms-2 text-muted">Loading…</span>
              </div>
            }
          >
            <ScrollToTopOnNavigate />

            <Routes>
              <Route path="/" element={<MythHome />} />
              <Route path="/themes" element={<MythHome />} />
              <Route path="/themes/:slug" element={<MythPage />} />
              <Route path="/myth/:id" element={<MythPage />} />
              <Route path="/about" element={<MythAbout />} />
              <Route path="/archive" element={<Archive />} /> {/* <-- new Archive route */}
              <Route path="/contact" element={<Contact />} />
              <Route path="*" element={<MythHome />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>

      <Footer />
    </BrowserRouter>
  );
}
