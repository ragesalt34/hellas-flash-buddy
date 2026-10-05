import { useEffect, useSyncExternalStore } from 'react';
import { hasGreek, speakGreek, textKey } from '@shared/speech';
import type { ChallengeController } from '../learning/controller';
import { s, type StringKey } from './strings';

function speakPrompt(kind: 'word' | 'exam', id: string | number, text: string) {
  if (hasGreek(text)) void speakGreek(text, kind === 'word' ? `vocab_${id}` : `q_${id}`);
}

export function ChallengeDialog({ controller }: { controller: ChallengeController }) {
  useSyncExternalStore(controller.subscribe, () => controller.version());
  const active = controller.current();
  const requestId = active?.requestId;

  // Voice the prompt once, when a new dialog opens.
  useEffect(() => {
    const a = controller.current();
    if (a) speakPrompt(a.challenge.item.kind, a.challenge.item.id, a.challenge.item.prompt);
  }, [requestId, controller]);

  function choose(opt: string) {
    const a = controller.current();
    if (!a) return;
    const ok = controller.answer(opt);
    const { answer } = a.challenge.item;
    if (!ok && hasGreek(answer)) void speakGreek(answer, textKey(answer, 'a'));
  }

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (active.picked === null) {
        const opt = active.challenge.options[Number(e.key) - 1];
        if (opt !== undefined) choose(opt);
      } else if (e.key === 'Enter' || e.key === ' ' || e.key.toLowerCase() === 'e') {
        e.preventDefault();
        controller.close();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!active) return null;
  const { challenge, picked, correct, source } = active;
  const { item } = challenge;
  const badge: StringKey = !challenge.graded ? 'practice' : item.level >= 1 ? 'review' : 'fresh';
  const cls = (opt: string) => (picked === null ? '' : opt === item.answer ? 'right' : opt === picked ? 'wrong' : '');

  return (
    <div className="overlay">
      <div className="dialog">
        <div className="meta">
          <span>{s(`src_${source}` as StringKey)}</span>
          <span>·</span>
          <span>{s(badge)}</span>
        </div>
        <div className="prompt">{item.prompt}</div>
        <div className="options">
          {challenge.options.map((opt, i) => (
            <button key={opt} className={cls(opt)} disabled={picked !== null} onClick={() => choose(opt)}>
              {i + 1}. {opt}
            </button>
          ))}
        </div>
        {picked !== null && (
          <>
            <div className={`verdict ${correct ? 'good' : 'bad'}`}>
              {correct ? s('correct') : `${s('wrong')} — ${s('rightAnswer')}: ${item.answer}`}
            </div>
            {item.explanation && <div className="muted">{item.explanation}</div>}
            <button onClick={() => controller.close()}>{s('continueHint')}</button>
          </>
        )}
      </div>
    </div>
  );
}
