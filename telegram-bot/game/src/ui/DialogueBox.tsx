import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { bus } from '../bus';
import { lemma, type LemmaId } from '../content/lexicon';
import { answer, reply, talk, type DialogueView } from '../story/director';
import type { StoryStore } from '../story/store';
import { dayKey } from '../story/wordSrs';
import type { World } from '../world3d/engine';
import { GreekLine } from './GreekLine';
import { speak } from './speak';
import { s } from './strings';
import { useBusEvent } from './useBus';

interface Conversation {
  view: DialogueView;
  lines: string[];
  step: number;
  answered: boolean;
}

interface Props {
  store: StoryStore;
  world: World | null;
  onBusy: (busy: boolean) => void;
  onExam: () => void;
  onWord: (id: LemmaId) => void;
}

export function DialogueBox({ store, world, onBusy, onExam, onWord }: Props) {
  useSyncExternalStore(store.subscribe, store.version);
  const [conv, setConv] = useState<Conversation | null>(null);
  const bubble = useRef<HTMLDivElement>(null);

  useBusEvent('npc:talk', ({ npcId }) => {
    if (conv) return;
    const out: { view: DialogueView | null } = { view: null };
    store.update((st) => {
      const r = talk(st, npcId, dayKey());
      out.view = r.view;
      return r.state;
    });
    if (!out.view) return;
    onBusy(true);
    setConv({ view: out.view, lines: out.view.lines, step: 0, answered: false });
  });

  const line = conv && conv.step < conv.lines.length ? conv.lines[conv.step] : null;
  const choosing =
    conv !== null && line === null && !conv.answered && (conv.view.kind === 'request' || conv.view.replies.length > 0);
  const shown = line ?? (choosing && conv ? conv.lines[conv.lines.length - 1] : null);

  useEffect(() => {
    if (line) speak(line);
  }, [line]);

  // Keep the bubble over the speaker's head while the camera drifts.
  useEffect(() => {
    if (!conv || !world) return;
    let raf = 0;
    const follow = () => {
      const p = world.screenPos(conv.view.npcId);
      const el = bubble.current;
      if (el && p) {
        el.style.left = `${p.x}px`;
        el.style.top = `${p.y}px`;
      }
      raf = requestAnimationFrame(follow);
    };
    follow();
    return () => cancelAnimationFrame(raf);
  }, [conv, world]);

  function close() {
    const v = conv?.view;
    setConv(null);
    onBusy(false);
    bus.emit('world:flags', {});
    if (v?.kind === 'lines' && v.exam) onExam();
  }

  function advance() {
    if (!conv) return;
    if (line === null) {
      if (!choosing) close();
      return;
    }
    const next = conv.step + 1;
    const willChoose = !conv.answered && (conv.view.kind === 'request' || conv.view.replies.length > 0);
    // Past the last line with nothing to choose: close now, not on an extra keypress.
    if (next >= conv.lines.length && !willChoose) close();
    else setConv({ ...conv, step: next });
  }

  function choose(i: number) {
    if (!conv || !choosing) return;
    const v = conv.view;
    const out = { lines: [] as string[] };
    if (v.kind === 'request') {
      const id = v.options[i];
      if (!id) return;
      store.update((st) => {
        const r = answer(st, v.requestId, id, dayKey());
        out.lines = r.lines;
        return r.state;
      });
    } else {
      if (i >= v.replies.length) return;
      store.update((st) => {
        const r = reply(st, v.npcId, i);
        out.lines = r.lines;
        return r.state;
      });
    }
    setConv({ ...conv, lines: out.lines, step: 0, answered: true });
  }

  useEffect(() => {
    if (!conv) return;
    // Capture phase: the dialogue owns these keys while it is open (pause and world never see them).
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (choosing && n >= 1 && n <= 3) choose(n - 1);
      else if (!choosing && (e.code === 'KeyE' || e.key === 'Enter' || e.key === ' ')) advance();
      else if (e.key === 'Escape') close();
      else return;
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });

  if (!conv) return null;
  const journal = store.get().journal;
  const v = conv.view;
  return (
    <>
      {shown !== null && (
        <div ref={bubble} className="bubble" onClick={advance}>
          <GreekLine text={shown} journal={journal} onWord={onWord} highlight={v.kind === 'request' && !conv.answered ? v.lemma : undefined} />
        </div>
      )}
      {choosing && (
        <div className="choices">
          {v.kind === 'request'
            ? v.options.map((id, i) => (
                <button key={id} className="pic" onClick={() => choose(i)}>
                  <span className="num">{i + 1}</span>
                  {lemma(id).icon}
                </button>
              ))
            : v.replies.map((text, i) => (
                <button key={text} onClick={() => choose(i)}>
                  <span className="num">{i + 1}</span>
                  <GreekLine text={text} journal={journal} onWord={onWord} />
                </button>
              ))}
        </div>
      )}
      <div className="dialog-hint">{choosing ? s('chooseHint') : s('nextHint')}</div>
    </>
  );
}
