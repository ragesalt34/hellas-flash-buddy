import { lazy, Suspense, useEffect, useState } from 'react';
import { tg, haptic } from './telegram';
import { getToken, clearToken } from './auth';
import { clearCache } from './api';
import { SiteHeader } from './components/SiteHeader';

/** Load a code-split chunk, surviving a failed fetch instead of showing nothing.
 *
 * A rejected `import()` inside `lazy()` leaves the Suspense boundary empty
 * forever — the page just stays blank, with only a console error. That is not
 * hypothetical: it took the live site down after a deploy, when Cloudflare's
 * edge had cached an HTML response under the chunk's URL, so every import threw
 * "Failed to fetch dynamically imported module". A flaky mobile connection does
 * the same thing.
 *
 * So: retry once after a moment, and if it still fails, reload the page once
 * (guarded by sessionStorage, so a genuinely broken deploy can't loop) — a fresh
 * document reliably re-resolves the chunk. */
function lazyWithRetry<T>(load: () => Promise<T>): Promise<T> {
  return load().catch(
    () =>
      new Promise<T>((resolve, reject) => {
        setTimeout(() => {
          load().then(resolve, (err) => {
            const KEY = 'hs_chunk_reload';
            if (!sessionStorage.getItem(KEY)) {
              sessionStorage.setItem(KEY, '1');
              location.reload();
              return; // never settles; the reload takes over
            }
            reject(err);
          });
        }, 600);
      })
  );
}

// The landing page is the only user of Motion (~40KB gzip). Load it
// on demand in its own chunk so the app shell
// doesn't pay for it.
const Landing = lazy(() =>
  lazyWithRetry(() => import('./screens/Landing')).then((m) => ({ default: m.Landing }))
);
import { Home } from './screens/Home';
import { Quiz } from './screens/Quiz';
import { Flashcards } from './screens/Flashcards';
import { Vocab } from './screens/Vocab';
import { Stats } from './screens/Stats';
import { Homework } from './screens/Homework';
import { Auth } from './screens/Auth';

export type View = 'home' | 'quiz' | 'flashcards' | 'vocab' | 'stats' | 'homework';

// Inside Telegram, an installed PWA, or with a valid signed-in session, skip
// the landing page — everyone else always sees it first (guests included:
// a guest's "continue without an account" only lasts the current tab session).
const isStandalonePWA =
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true);

export function App() {
  const [entered, setEntered] = useState(() => !!tg || isStandalonePWA || !!getToken());
  const [view, setView] = useState<View>('home');
  const [showLanding, setShowLanding] = useState(false);
  // Pre-entry flow: landing page first, then the sign-in/sign-up screen.
  const [gate, setGate] = useState<'landing' | 'auth'>('landing');
  const [gateMode, setGateMode] = useState<'login' | 'register'>('register');
  // Bump key to force a screen to remount (reset its internal phase) when its tab is re-tapped.
  const [navKey, setNavKey] = useState(0);
  const home = () => navigate('home');

  // Focus mode keeps the study column centred beneath the persistent header.
  const focus =
    (entered && !showLanding && (view === 'quiz' || view === 'flashcards' || view === 'vocab' || view === 'homework')) ||
    (!entered && gate === 'auth');
  useEffect(() => {
    document.body.classList.toggle('focus', focus);
    return () => document.body.classList.remove('focus');
  }, [focus]);

  // Depth for the decorative scenes: the backdrop layers drift a few pixels
  // against a mouse pointer (CSS reads --px/--py on <body>, -1..1). Mouse only,
  // and nothing at all for people who asked the system for less motion.
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        document.body.style.setProperty('--px', ((e.clientX / window.innerWidth) * 2 - 1).toFixed(3));
        document.body.style.setProperty('--py', ((e.clientY / window.innerHeight) * 2 - 1).toFixed(3));
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Guest entry is intentionally in-memory only (not persisted): reloading the
  // site drops back to the landing page unless a real session was created.
  const enter = () => {
    setView('home');
    setShowLanding(false);
    setEntered(true);
    window.scrollTo(0, 0);
  };

  const openGateAuth = (mode: 'login' | 'register') => {
    setGateMode(mode);
    setGate('auth');
  };

  const goTab = (v: View | 'landing') => {
    if (v === 'landing') {
      setGate('landing');
      setShowLanding(true);
      window.scrollTo(0, 0);
      return;
    }
    haptic('light');
    setShowLanding(false);
    window.scrollTo(0, 0);
    if (v === view) {
      setNavKey((k) => k + 1);
      return;
    }
    navigate(v);
  };
  function navigate(v: View) {
    setView(v);
  }
  // Telegram BackButton mirrors in-app navigation back to the menu.
  useEffect(() => {
    const bb = tg?.BackButton;
    if (!bb) return;
    const onBack = () => { setShowLanding(false); navigate('home'); };
    bb.onClick(onBack);
    if (view === 'home' && !showLanding) bb.hide();
    else bb.show();
    return () => bb.offClick(onBack);
  }, [view, showLanding]);

  const welcome = !entered || showLanding;
  const page = welcome ? gate : view;
  const login = () => { openGateAuth('login'); setEntered(false); setShowLanding(false); window.scrollTo(0, 0); };
  const account = () => {
    if (page === 'auth') { setGate('landing'); window.scrollTo(0, 0); }
    else if (entered) enter();
    else login();
  };

  return (
    <div className="hs-shell">
      <SiteHeader
        page={page}
        accountEntry={entered}
        onNavigate={goTab}
        onAccount={account}
        onLogin={entered && !getToken() && !tg ? login : undefined}
        onLogout={getToken() ? () => { haptic(); clearToken(); clearCache(); window.location.reload(); } : undefined}
      />
      <div className="aurora" />
      {welcome ? gate === 'auth' ? (
        <div className="app hs-content gate-app">
          <Auth initialMode={gateMode} onDone={enter} />
        </div>
      ) : (
        <Suspense fallback={null}>
          <Landing onStart={() => entered ? enter() : openGateAuth('register')} onGuest={enter} />
        </Suspense>
      ) : (
        <div className="app hs-content">
          {view === 'home' && <Home key={navKey} onNavigate={navigate} />}
          {view === 'quiz' && <Quiz key={navKey} onHome={home} />}
          {view === 'flashcards' && <Flashcards key={navKey} onHome={home} />}
          {view === 'vocab' && <Vocab key={navKey} onHome={home} />}
          {view === 'homework' && <Homework key={navKey} onHome={home} />}
          {view === 'stats' && <Stats key={navKey} onHome={home} onNavigate={navigate} />}
        </div>
      )}
    </div>
  );
}
