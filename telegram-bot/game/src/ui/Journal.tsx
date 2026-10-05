import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { bus } from '../bus';
import { PAGES, PAGE_BY_ID } from '../content/chapter1';
import { displayForm, lemma, type LemmaId } from '../content/lexicon';
import { solvePage, writeNote } from '../story/director';
import { pageStatus, type Page } from '../story/journal';
import type { StoryStore } from '../story/store';
import { dayKey } from '../story/wordSrs';
import { s } from './strings';

function slotsOf(page: Page): { icon: string; solution: string }[] {
  if (page.kind === 'words') return page.slots.map((sl) => ({ icon: sl.icon, solution: lemma(sl.lemma).el }));
  return page.slots.map((sl) => ({ icon: sl.icon, solution: sl.form }));
}

export function Journal({ store, focus, onClose }: { store: StoryStore; focus: LemmaId | null; onClose: () => void }) {
  useSyncExternalStore(store.subscribe, store.version);
  const j = store.get().journal;
  const [pageId, setPageId] = useState(() => PAGES.find((p) => pageStatus(j, p) === 'open')?.id ?? PAGES[0].id);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const focusRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    focusRef.current?.scrollIntoView({ block: 'center' });
  }, [focus]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' && e.key !== 'Tab') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const page = PAGE_BY_ID.get(pageId)!;
  const status = pageStatus(j, page);
  const slots = slotsOf(page);
  const current = answers[pageId] ?? slots.map(() => '');
  const options =
    page.kind === 'words'
      ? j.seen.map((id) => ({ value: id as string, label: lemma(id).el }))
      : j.seenForms.map((f) => ({ value: f, label: displayForm(f) }));

  function check() {
    const out = { ok: false };
    store.update((st) => {
      const r = solvePage(st, pageId, current, dayKey());
      out.ok = r.ok;
      return r.state;
    });
    bus.emit('toast', { key: out.ok ? 'pageSolved' : 'pageWrong' });
  }

  return (
    <div className="overlay">
      <div className="journal">
        <section className="entries">
          <h2>{s('journal')}</h2>
          <ul>
            {j.seen.map((id) => {
              const l = lemma(id);
              const known = j.deciphered.includes(id);
              return (
                <li key={id} ref={id === focus ? focusRef : undefined} className={id === focus ? 'focus' : undefined}>
                  <b className="el">{l.el}</b>
                  {known ? (
                    <span className="ru">{l.ru}</span>
                  ) : (
                    <input
                      placeholder={s('yourGuess')}
                      defaultValue={j.notes[id] ?? ''}
                      onBlur={(e) => store.update((st) => writeNote(st, id, e.target.value))}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </section>
        <section className="pages">
          <nav>
            {PAGES.map((p, i) => {
              const ps = pageStatus(j, p);
              return (
                <button
                  key={p.id}
                  className={`tab ${ps}${p.id === pageId ? ' active' : ''}`}
                  disabled={ps === 'locked'}
                  onClick={() => setPageId(p.id)}
                >
                  {ps === 'solved' ? '✓' : ps === 'locked' ? '·' : i + 1}
                </button>
              );
            })}
          </nav>
          {status === 'locked' ? (
            <p className="muted">{s('pageLocked')}</p>
          ) : (
            <div className={`page ${status}`}>
              {slots.map((slot, i) => (
                <div key={i} className="slot">
                  <div className="pic">{slot.icon}</div>
                  {status === 'solved' ? (
                    <div className="el">{slot.solution}</div>
                  ) : (
                    <select
                      value={current[i]}
                      onChange={(e) => {
                        const next = [...current];
                        next[i] = e.target.value;
                        setAnswers({ ...answers, [pageId]: next });
                      }}
                    >
                      <option value="">—</option>
                      {options.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
              {status === 'open' && (
                <button className="check" onClick={check} disabled={current.some((a) => !a)}>
                  {s('check')}
                </button>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
