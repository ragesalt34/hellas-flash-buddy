import { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
import { haptic, notify } from '../telegram';

const SEEN_KEY = 'hellas_seen_streak';

/** Fires once whenever the user's streak grows past what we last celebrated (persisted in localStorage). */
export function useStreakCelebration(streak: number): { show: boolean; dismiss: () => void } {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (streak < 2) return;
    const seen = Number(localStorage.getItem(SEEN_KEY) ?? '0');
    if (streak > seen) {
      localStorage.setItem(SEEN_KEY, String(streak));
      notify('success');
      setShow(true);
    }
  }, [streak]);

  return { show, dismiss: () => setShow(false) };
}

export function StreakCelebration({ streak, onDismiss }: { streak: number; onDismiss: () => void }) {
  return (
    <div className="sheet-overlay" onClick={onDismiss}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="badge-circle">
          <Flame size={40} strokeWidth={2.2} />
          <span className="badge-num">{streak}</span>
        </div>
        <h1 className="sheet-headline">{streak} ημέρες σερί!</h1>
        <p className="sheet-sub">Συνέχισε έτσι, η πρόοδός σου είναι εκπληκτική.</p>
        <button
          className="btn btn-block"
          onClick={() => {
            haptic();
            onDismiss();
          }}
        >
          Συνέχεια
        </button>
      </div>
    </div>
  );
}
