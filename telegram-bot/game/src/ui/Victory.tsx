import { useEffect } from 'react';
import { s } from './strings';

export function Victory({ done, total, onClose }: { done: number; total: number; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="overlay">
      <div className="panel">
        <h2>{s('victory')}</h2>
        <p>{s('victoryText')}</p>
        <p className="muted">
          {s('today')}: {done}/{total}
        </p>
        <button onClick={onClose}>{s('continueHint')}</button>
      </div>
    </div>
  );
}
