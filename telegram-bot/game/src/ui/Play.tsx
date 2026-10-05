import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { bus } from '../bus';
import { ITEMS } from '../content/chapter1';
import type { LemmaId } from '../content/lexicon';
import type { Session } from '../session';
import { countExam, examLeft } from '../story/director';
import { StoryStore } from '../story/store';
import { dayKey } from '../story/wordSrs';
import type { World } from '../world3d/engine';
import { ChallengeDialog } from './ChallengeDialog';
import { ChapterEnd } from './ChapterEnd';
import { DialogueBox } from './DialogueBox';
import { askExam } from './exam';
import { Hud } from './Hud';
import { Inventory } from './Inventory';
import { Journal } from './Journal';
import { PauseMenu } from './PauseMenu';
import { Toasts } from './Toasts';
import { useBusEvent } from './useBus';
import { WorldCanvas } from './WorldCanvas';

type BusyKey = 'dialog' | 'paused' | 'exam' | 'journal' | 'end';

export function Play({ session }: { session: Session }) {
  const store = useMemo(() => new StoryStore(session.accountId, localStorage), [session.accountId]);
  const [world, setWorld] = useState<World | null>(null);
  const onWorld = useCallback((w: World | null) => setWorld(w), []);
  const [busy, setBusyState] = useState<Record<BusyKey, boolean>>({ dialog: false, paused: false, exam: false, journal: false, end: false });
  const setBusy = useCallback((k: BusyKey, v: boolean) => setBusyState((b) => (b[k] === v ? b : { ...b, [k]: v })), []);
  const frozen = Object.values(busy).some(Boolean);

  useEffect(() => {
    bus.emit('world:freeze', { frozen });
  }, [frozen]);

  // Toasts for new words and items, from store diffs.
  const prev = useRef({ seen: store.get().journal.seen.length, items: store.get().world.inventory });
  useEffect(
    () =>
      store.subscribe(() => {
        const st = store.get();
        const fresh = st.journal.seen.length - prev.current.seen;
        if (fresh > 0) bus.emit('toast', { key: 'newWords', value: String(fresh) });
        for (const id of st.world.inventory) {
          if (!prev.current.items.includes(id)) bus.emit('toast', { key: 'itemGot', value: ITEMS[id].icon });
        }
        prev.current = { seen: st.journal.seen.length, items: st.world.inventory };
      }),
    [store],
  );

  const runExam = useCallback(async () => {
    const today = dayKey();
    const left = examLeft(store.get(), today);
    if (left <= 0) {
      bus.emit('toast', { key: 'examDone' });
      return;
    }
    setBusy('exam', true);
    for (let i = 0; i < left; i++) {
      await askExam(`exam-${today}-${Date.now()}-${i}`);
      store.update((st) => countExam(st, today));
    }
    setBusy('exam', false);
  }, [store, setBusy]);

  useBusEvent('chapter:end', () => {
    store.update((st) => (st.chapterDone ? st : { ...st, chapterDone: true }));
    setBusy('end', true);
  });
  const closeEnd = useCallback(() => setBusy('end', false), [setBusy]);

  const [journalFocus, setJournalFocus] = useState<LemmaId | null>(null);
  const openJournal = useCallback(
    (focus: LemmaId | null) => {
      setJournalFocus(focus);
      setBusy('journal', true);
    },
    [setBusy],
  );
  const closeJournal = useCallback(() => setBusy('journal', false), [setBusy]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || busy.journal || busy.exam || busy.paused || busy.end || session.controller.current()) return;
      e.preventDefault();
      openJournal(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, session, openJournal]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || session.controller.current() || busy.exam || busy.journal || busy.end) return;
      setBusy('paused', !busy.paused);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [session, busy, setBusy]);

  return (
    <div className="stage">
      <WorldCanvas store={store} onWorld={onWorld} />
      <Hud session={session} store={store} />
      <Inventory store={store} />
      <DialogueBox
        store={store}
        world={world}
        onBusy={(b) => setBusy('dialog', b)}
        onExam={() => void runExam()}
        onWord={(id) => openJournal(id)}
      />
      <Toasts />
      <ChallengeDialog controller={session.controller} />
      {busy.journal && <Journal store={store} focus={journalFocus} onClose={closeJournal} />}
      {busy.end && <ChapterEnd store={store} onClose={closeEnd} />}
      {busy.paused && <PauseMenu onResume={() => setBusy('paused', false)} />}
    </div>
  );
}
