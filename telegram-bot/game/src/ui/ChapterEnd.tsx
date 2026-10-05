import { useEffect } from 'react';
import { CHAPTER_UNLOCK } from '../content/chapter1';
import { chapterProgress } from '../story/director';
import type { StoryStore } from '../story/store';
import { s } from './strings';

export function ChapterEnd({ store, onClose }: { store: StoryStore; onClose: () => void }) {
  const pct = Math.round(chapterProgress(store.get()) * 100);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== 'Escape') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);
  return (
    <div className="overlay">
      <div className="chapter-end">
        <h2>{s('chapterDone')}</h2>
        <div className="meter">
          <div style={{ width: `${pct}%` }} />
          <span style={{ left: `${CHAPTER_UNLOCK * 100}%` }} />
        </div>
        <p>{s('chapterNext', String(pct))}</p>
        <button onClick={onClose}>{s('continueHint')}</button>
      </div>
    </div>
  );
}
