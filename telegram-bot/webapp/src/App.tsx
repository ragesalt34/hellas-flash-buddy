import { useEffect, useState } from 'react';
import { tg } from './telegram';
import { Home } from './screens/Home';
import { Quiz } from './screens/Quiz';
import { Flashcards } from './screens/Flashcards';
import { Vocab } from './screens/Vocab';
import { Stats } from './screens/Stats';

export type View = 'home' | 'quiz' | 'flashcards' | 'vocab' | 'stats';

export function App() {
  const [view, setView] = useState<View>('home');
  const home = () => setView('home');

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
    <div className="app">
      {view === 'home' && <Home onNavigate={setView} />}
      {view === 'quiz' && <Quiz onHome={home} />}
      {view === 'flashcards' && <Flashcards onHome={home} />}
      {view === 'vocab' && <Vocab onHome={home} />}
      {view === 'stats' && <Stats onHome={home} />}
    </div>
  );
}
