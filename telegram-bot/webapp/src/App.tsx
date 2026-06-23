import { useEffect, useState } from 'react';
import { House, BookOpen, Layers, Languages, BarChart3, type LucideIcon } from 'lucide-react';
import { tg, haptic } from './telegram';
import { Home } from './screens/Home';
import { Quiz } from './screens/Quiz';
import { Flashcards } from './screens/Flashcards';
import { Vocab } from './screens/Vocab';
import { Stats } from './screens/Stats';

export type View = 'home' | 'quiz' | 'flashcards' | 'vocab' | 'stats';

const NAV: { id: View; icon: LucideIcon; label: string }[] = [
  { id: 'home', icon: House, label: 'Αρχική' },
  { id: 'quiz', icon: BookOpen, label: 'Κουίζ' },
  { id: 'flashcards', icon: Layers, label: 'Κάρτες' },
  { id: 'vocab', icon: Languages, label: 'Λεξιλόγιο' },
  { id: 'stats', icon: BarChart3, label: 'Πρόοδος' },
];

export function App() {
  const [view, setView] = useState<View>('home');
  // Bump key to force a screen to remount (reset its internal phase) when its tab is re-tapped.
  const [navKey, setNavKey] = useState(0);
  const home = () => setView('home');

  const goTab = (v: View) => {
    haptic('light');
    if (v === view) setNavKey((k) => k + 1);
    else setView(v);
  };

  // Telegram BackButton mirrors in-app navigation back to the menu.
  useEffect(() => {
    const bb = tg?.BackButton;
    if (!bb) return;
    const onBack = () => setView('home');
    bb.onClick(onBack);
    if (view === 'home') bb.hide();
    else bb.show();
    return () => bb.offClick(onBack);
  }, [view]);

  return (
    <>
      <div className="app">
        {view === 'home' && <Home key={navKey} onNavigate={setView} />}
        {view === 'quiz' && <Quiz key={navKey} onHome={home} />}
        {view === 'flashcards' && <Flashcards key={navKey} onHome={home} />}
        {view === 'vocab' && <Vocab key={navKey} onHome={home} />}
        {view === 'stats' && <Stats key={navKey} onHome={home} />}
      </div>

      <nav className="bottomnav" aria-label="Κύρια πλοήγηση">
        <div className="bottomnav-inner glass">
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
