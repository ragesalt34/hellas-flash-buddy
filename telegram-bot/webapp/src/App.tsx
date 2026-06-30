import { useEffect, useState } from 'react';
import { House, BookOpen, Layers, Languages, BarChart3, Sparkles, type LucideIcon } from 'lucide-react';
import { tg, haptic } from './telegram';
import { Landing } from './screens/Landing';
import { Home } from './screens/Home';
import { Quiz } from './screens/Quiz';
import { Flashcards } from './screens/Flashcards';
import { Vocab } from './screens/Vocab';
import { Stats } from './screens/Stats';

export type View = 'home' | 'quiz' | 'flashcards' | 'vocab' | 'stats';

const ENTERED_KEY = 'hs_entered';
// Inside Telegram or after first entry (or installed PWA) skip the landing page.
const isStandalonePWA =
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true);

const NAV: { id: View; icon: LucideIcon; label: string }[] = [
  { id: 'home', icon: House, label: 'Αρχική' },
  { id: 'quiz', icon: BookOpen, label: 'Κουίζ' },
  { id: 'flashcards', icon: Layers, label: 'Κάρτες' },
  { id: 'vocab', icon: Languages, label: 'Λεξιλόγιο' },
  { id: 'stats', icon: BarChart3, label: 'Πρόοδος' },
];

export function App() {
  const [entered, setEntered] = useState(
    () => !!tg || isStandalonePWA || localStorage.getItem(ENTERED_KEY) === '1'
  );
  const [view, setView] = useState<View>('home');
  // Bump key to force a screen to remount (reset its internal phase) when its tab is re-tapped.
  const [navKey, setNavKey] = useState(0);
  const home = () => setView('home');

  const enter = () => {
    localStorage.setItem(ENTERED_KEY, '1');
    setEntered(true);
  };

  const goTab = (v: View) => {
    haptic('light');
    if (v === view) setNavKey((k) => k + 1);
    else setView(v);
  };

  // Telegram BackButton mirrors in-app navigation back to the menu.
  // (All hooks must run unconditionally — the landing early-return is below.)
  useEffect(() => {
    const bb = tg?.BackButton;
    if (!bb) return;
    const onBack = () => setView('home');
    bb.onClick(onBack);
    if (view === 'home') bb.hide();
    else bb.show();
    return () => bb.offClick(onBack);
  }, [view]);

  if (!entered) {
    return (
      <>
        <div className="aurora" />
        <Landing onStart={enter} />
      </>
    );
  }

  return (
    <>
      <div className="aurora" />
      <div className="app">
        {view === 'home' && <Home key={navKey} onNavigate={setView} />}
        {view === 'quiz' && <Quiz key={navKey} onHome={home} />}
        {view === 'flashcards' && <Flashcards key={navKey} onHome={home} />}
        {view === 'vocab' && <Vocab key={navKey} onHome={home} />}
        {view === 'stats' && <Stats key={navKey} onHome={home} />}
      </div>

      <nav className="bottomnav" aria-label="Κύρια πλοήγηση">
        <div className="bottomnav-inner glass">
          <div className="nav-brand" aria-hidden="true">
            <Sparkles size={22} color="#fff" strokeWidth={2.4} />
          </div>
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
                <span className="nav-ic">
                  <Icon size={24} strokeWidth={active ? 2.6 : 2.1} />
                </span>
                <span className="nav-l">{n.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
