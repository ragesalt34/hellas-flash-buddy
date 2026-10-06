import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState, type ComponentType } from 'react';
import { X, ArrowLeft } from 'lucide-react';
import { Logo, LogoMark } from './components/Logo';
import { ColumnChart, CycladicHome, Ostraka, Papyrus, WaxTablet } from './components/homeArt';
import { MeanderBand } from './components/greekArt';
import { tg, haptic } from './telegram';
import { getToken } from './auth';
import { useLanguage } from './i18n';
import { LanguageSwitch } from './components/LanguageSwitch';
import { ThemeSwitch } from './components/ThemeSwitch';

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

// The landing page is the only user of Motion (~40KB gzip) and is never
// shown to signed-in users — split it into its own chunk so the app shell
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

const NAV: { id: View; icon: ComponentType<{ className?: string }>; key: string }[] = [
  { id: 'home', icon: CycladicHome, key: 'nav.home' },
  { id: 'quiz', icon: WaxTablet, key: 'nav.quiz' },
  { id: 'flashcards', icon: Ostraka, key: 'nav.flashcards' },
  { id: 'vocab', icon: Papyrus, key: 'nav.vocab' },
  { id: 'stats', icon: ColumnChart, key: 'nav.stats' },
];

export function App() {
  const { t } = useLanguage();
  const [entered, setEntered] = useState(() => !!tg || isStandalonePWA || !!getToken());
  const [view, setView] = useState<View>('home');
  // Pre-entry flow: landing page first, then the sign-in/sign-up screen.
  const [gate, setGate] = useState<'landing' | 'auth'>('landing');
  const [gateMode, setGateMode] = useState<'login' | 'register'>('register');
  // Bump key to force a screen to remount (reset its internal phase) when its tab is re-tapped.
  const [navKey, setNavKey] = useState(0);
  const home = () => navigate('home');

  // Focus mode (quiz/flashcards/vocab, or the pre-entry auth gate): on desktop
  // the sidebar is hidden and the content is centred full-width with a bottom
  // action bar (Duolingo-style).
  const focus =
    (entered && (view === 'quiz' || view === 'flashcards' || view === 'vocab' || view === 'homework')) ||
    (!entered && gate === 'auth');
  useEffect(() => {
    document.body.classList.toggle('focus', focus);
    return () => document.body.classList.remove('focus');
  }, [focus]);

  // On narrow screens the language/style switches float at the top; they hide
  // while the page is scrolled so they never sit on top of card text. A 24px
  // marker at the top of the document says when: no scroll listener at all.
  useEffect(() => {
    const mark = document.createElement('div');
    mark.className = 'scroll-mark';
    mark.setAttribute('aria-hidden', 'true');
    document.body.prepend(mark);
    const io = new IntersectionObserver(([e]) => document.body.classList.toggle('scrolled', !e.isIntersecting));
    io.observe(mark);
    return () => {
      io.disconnect();
      mark.remove();
      document.body.classList.remove('scrolled');
    };
  }, []);

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
  const enter = () => setEntered(true);

  const openGateAuth = (mode: 'login' | 'register') => {
    setGateMode(mode);
    setGate('auth');
  };

  // The ink pill slides from the old tab to the new one: remember where it was,
  // and after the re-render play the new pill from that box back to its own.
  const navRef = useRef<HTMLElement>(null);
  const pillFrom = useRef<DOMRect | null>(null);
  const goTab = (v: View) => {
    haptic('light');
    if (v === view) {
      setNavKey((k) => k + 1);
      return;
    }
    navigate(v);
  };
  function navigate(v: View) {
    pillFrom.current = navRef.current?.querySelector('.nav-pill')?.getBoundingClientRect() ?? null;
    setView(v);
  }
  useLayoutEffect(() => {
    const from = pillFrom.current;
    pillFrom.current = null;
    const pill = navRef.current?.querySelector<HTMLElement>('.nav-pill');
    if (!from || !pill || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const to = pill.getBoundingClientRect();
    if (!to.width || !to.height || !from.width) return;
    pill.animate(
      [
        {
          transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`,
        },
        { transform: 'none' },
      ],
      { duration: 380, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
    );
  }, [view]);

  // Telegram BackButton mirrors in-app navigation back to the menu.
  // (All hooks must run unconditionally — the landing early-return is below.)
  useEffect(() => {
    const bb = tg?.BackButton;
    if (!bb) return;
    const onBack = () => navigate('home');
    bb.onClick(onBack);
    if (view === 'home') bb.hide();
    else bb.show();
    return () => bb.offClick(onBack);
  }, [view]);

  if (!entered) {
    // Welcome flow: landing → sign-up/sign-in (or explicit guest entry) → app.
    return (
      <>
        <div className="aurora" />
        {gate === 'auth' ? (
          <>
            <div className="app gate-app">
              <Auth initialMode={gateMode} onDone={enter} />
            </div>
            {/* Always-visible back to the welcome page (the desktop-only
                focus-close X leaves mobile users with no way back). */}
            <button className="gate-back" onClick={() => setGate('landing')}>
              <ArrowLeft size={18} strokeWidth={2.6} /> {t('auth.back')}
            </button>
          </>
        ) : (
          <Suspense fallback={null}>
            <Landing
              onStart={() => openGateAuth('register')}
              onLogin={() => openGateAuth('login')}
              onGuest={enter}
            />
          </Suspense>
        )}
      </>
    );
  }

  return (
    <>
      <div className="aurora" />
      <div className="app">
        {view === 'home' && <Home key={navKey} onNavigate={navigate} />}
        {view === 'quiz' && <Quiz key={navKey} onHome={home} />}
        {view === 'flashcards' && <Flashcards key={navKey} onHome={home} />}
        {view === 'vocab' && <Vocab key={navKey} onHome={home} />}
        {view === 'homework' && <Homework key={navKey} onHome={home} />}
        {view === 'stats' && <Stats key={navKey} onHome={home} onNavigate={navigate} />}
      </div>

      <button className="focus-close" aria-label={t('nav.close')} onClick={home}>
        <X size={22} strokeWidth={2.6} />
      </button>

      <nav ref={navRef} className="bottomnav" aria-label={t('nav.aria')}>
        <div className="bottomnav-inner glass">
          {/* Colour lives in CSS, not inline: the mark is white on the round
              theme's coral badge, but the square theme draws the block as bare
              paper, where white-on-white made the logo vanish. */}
          <div className="nav-brand" aria-hidden="true">
            <LogoMark />
            <Logo className="nav-desktop-logo" />
          </div>
          <MeanderBand className="nav-meander" height={7} />
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = view === n.id;
            return (
              <button
                key={n.id}
                className={`navbtn${active ? ' active' : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={() => goTab(n.id)}
              >
                {active && <span className="nav-pill" aria-hidden="true" />}
                <span className="nav-ic">
                  <Icon className="nav-art" />
                </span>
                <span className="nav-l">{t(n.key)}</span>
              </button>
            );
          })}
          <LanguageSwitch />
          <ThemeSwitch />
        </div>
      </nav>
    </>
  );
}
