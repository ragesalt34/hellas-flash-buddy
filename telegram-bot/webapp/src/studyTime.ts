import { useEffect } from 'react';
import { api } from './api';
import type { Language } from './i18n';

export type StudyMode = 'quiz' | 'flashcards' | 'vocab' | 'homework';

/** A pause between two actions up to this long is study (reading a question, thinking); longer, and
 * the learner is taken to have been away. */
const IDLE_MS = 2 * 60 * 1000;
/** Time after the last action that counts when no further action comes (walked away, closed the tab). */
const TAIL_MS = 30 * 1000;
/** How often the counted seconds are sent (also on leaving the screen or hiding the tab). */
const FLUSH_MS = 60 * 1000;
/** A longer gap between ticks means the timer was asleep (background tab, laptop lid): not counted. */
const MAX_TICK_MS = 5000;

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'] as const;

/** Count active seconds on a study screen and report them to the server (supabase/sql/study_time.sql).
 * Time since the last click, key, scroll or touch is held back until the next action confirms the
 * learner was there (a pause under two minutes counts in full); with no next action only 30 s of it
 * count. Hidden tabs count nothing. `mode` null (another screen, or a guest) counts nothing. */
export function useStudyTime(mode: StudyMode | null): void {
  useEffect(() => {
    if (!mode) return;
    let lastAction = Date.now();
    let lastTick = Date.now();
    let confirmedMs = 0; // counted, ready to send
    let heldMs = 0; // since the last action, waiting for the next one
    const tick = () => {
      const now = Date.now();
      const dt = now - lastTick;
      lastTick = now;
      if (document.visibilityState !== 'visible' || dt > MAX_TICK_MS) return;
      if (now - lastAction < IDLE_MS) heldMs += dt;
      else if (heldMs > 0) { confirmedMs += Math.min(heldMs, TAIL_MS); heldMs = 0; } // was away
    };
    const touch = () => {
      tick();
      confirmedMs += heldMs;
      heldMs = 0;
      lastAction = Date.now();
    };
    const send = () => {
      const seconds = Math.floor(confirmedMs / 1000);
      if (seconds < 1) return;
      confirmedMs -= seconds * 1000;
      // Best-effort: a lost minute is not worth a retry queue.
      api.reportTime(mode, seconds).catch(() => {});
    };
    /** Leaving (screen, tab, page): the held time ends here, so only its tail counts. */
    const close = () => {
      tick();
      confirmedMs += Math.min(heldMs, TAIL_MS);
      heldMs = 0;
      send();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') close();
      else lastTick = lastAction = Date.now();
    };
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, touch, { passive: true, capture: true }));
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', close);
    const ticker = window.setInterval(tick, 1000);
    const flusher = window.setInterval(send, FLUSH_MS);
    return () => {
      window.clearInterval(ticker);
      window.clearInterval(flusher);
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, touch, { capture: true }));
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', close);
      close();
    };
  }, [mode]);
}

/** "12 мин", "1 ч 05 мин" / "12 λεπ.", "1 ώ. 05 λεπ." from seconds. */
export function formatStudyTime(seconds: number, lang: Language): string {
  const total = Math.floor(seconds / 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  const [hu, mu] = lang === 'ru' ? ['ч', 'мин'] : ['ώ.', 'λεπ.'];
  return h > 0 ? `${h} ${hu} ${String(m).padStart(2, '0')} ${mu}` : `${m} ${mu}`;
}
