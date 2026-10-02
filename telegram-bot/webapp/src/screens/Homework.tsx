import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, CircleAlert, CircleX, House, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { api, type HomeworkCheck, type HomeworkParsedItem } from '../api';
import { haptic } from '../telegram';
import { playComplete, playCorrect, playTap, playWrong } from '../sound';
import { useLanguage } from '../i18n';
import { ProgressBar } from '../ui';
import { TopicBand, TopicScene } from './topicScenes';
import { Owl } from '../components/homeArt';
import { VocabDecorImg } from './vocabularyDecor';
import { loadSets, newId, saveSets, type HwItem, type HwSet, type HwStatus } from '../homework';

type Phase = 'list' | 'new' | 'review' | 'play' | 'done';

/** Title row: a tablet emblem (same tile as the quiz topic) + the label. */
function Meta({ children }: { children: React.ReactNode }) {
  return (
    <span className="meta qz-topic hw-meta">
      <span className="hw-emblem">
        <Owl />
      </span>
      {children}
    </span>
  );
}

export function Homework({ onHome }: { onHome: () => void }) {
  const { t } = useLanguage();
  const [sets, setSets] = useState<HwSet[]>(() => loadSets());
  const [phase, setPhase] = useState<Phase>('list');
  const [ai, setAi] = useState(false);

  // draft (new) -> parsed (review)
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [items, setItems] = useState<HomeworkParsedItem[]>([]);
  const [source, setSource] = useState<'ai' | 'local'>('local');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  // play
  const [setId, setSetId] = useState<string | null>(null);
  const [queue, setQueue] = useState<string[]>([]); // item ids being practised
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<HomeworkCheck | null>(null);

  useEffect(() => {
    api.homeworkStatus().then((r) => setAi(r.ai)).catch(() => setAi(false));
  }, []);

  const current = sets.find((s) => s.id === setId) ?? null;
  const item: HwItem | null =
    current && queue[idx] ? (current.items.find((i) => i.id === queue[idx]) ?? null) : null;

  function persist(next: HwSet[]) {
    setSets(next);
    saveSets(next);
  }

  async function parse() {
    if (!text.trim() || busy) return;
    haptic();
    setBusy(true);
    setError(false);
    try {
      const r = await api.homeworkParse(text);
      setItems(r.items);
      setSource(r.source);
      setPhase('review');
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  function begin(set: HwSet, only?: HwStatus[]) {
    const ids = set.items
      .filter((i) => !only || !i.status || only.includes(i.status))
      .map((i) => i.id);
    if (!ids.length) return;
    setSetId(set.id);
    setQueue(ids);
    setIdx(0);
    setAnswer('');
    setResult(null);
    setPhase('play');
  }

  function saveAndStart() {
    if (!items.length) return;
    const set: HwSet = {
      id: newId(),
      title: title.trim() || t('hw.titleDefault'),
      createdAt: Date.now(),
      items: items.map((i) => ({ id: i.id, question: i.question, answer: i.answer, note: i.note })),
    };
    persist([set, ...sets]);
    setTitle('');
    setText('');
    begin(set);
  }

  async function check() {
    if (!item || !current || !answer.trim() || busy) return;
    haptic();
    setBusy(true);
    setError(false);
    try {
      const r = await api.homeworkCheck({
        question: item.question,
        modelAnswer: item.answer,
        note: item.note,
        answer,
      });
      setResult(r);
      if (r.verdict === 'correct') playCorrect();
      else playWrong();
      persist(
        sets.map((s) =>
          s.id === current.id
            ? { ...s, items: s.items.map((i) => (i.id === item.id ? { ...i, status: r.verdict } : i)) }
            : s
        )
      );
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  function next() {
    haptic();
    if (idx + 1 >= queue.length) {
      playComplete();
      setPhase('done');
      return;
    }
    playTap();
    setIdx(idx + 1);
    setAnswer('');
    setResult(null);
  }

  // ---------- list ----------
  if (phase === 'list') {
    return (
      <div className="fade-in hw-screen">
        <TopicScene topic="homework" />
        <div className="topbar">
          <Meta>{t('nav.homework')}</Meta>
        </div>
        <div className="spacer" />
        {sets.length === 0 && (
          <div className="card hw-empty">
            <Owl className="hw-empty-owl" />
            <p>{t('hw.empty')}</p>
          </div>
        )}
        {sets.map((s) => {
          const ok = s.items.filter((i) => i.status === 'correct').length;
          return (
            <div className="card hw-set" key={s.id}>
              <button className="hw-set-main" onClick={() => begin(s)}>
                <span className="hw-set-ic">
                  <Owl />
                </span>
                <span className="hw-set-body">
                <span className="hw-set-t">{s.title}</span>
                <span className="hw-set-d">
                  {ok}/{s.items.length} {t('hw.questions')}
                </span>
                <ProgressBar value={ok} total={s.items.length} />
                </span>
              </button>
              <button
                className="hw-del"
                aria-label={t('hw.delete')}
                onClick={() => {
                  if (window.confirm(t('hw.confirmDelete'))) persist(sets.filter((x) => x.id !== s.id));
                }}
              >
                <Trash2 size={17} strokeWidth={2.3} />
              </button>
            </div>
          );
        })}
        <TopicBand topic="homework" />
        <button
          className="btn btn-block"
          onClick={() => {
            haptic();
            setPhase('new');
          }}
        >
          <Plus size={18} strokeWidth={2.6} /> {t('hw.new')}
        </button>
        <button className="btn btn-block secondary hw-gap" onClick={onHome}>
          <House size={18} strokeWidth={2.4} /> {t('nav.menu')}
        </button>
      </div>
    );
  }

  // ---------- new ----------
  if (phase === 'new') {
    return (
      <div className="fade-in hw-screen">
        <TopicScene topic="homework" />
        <div className="topbar">
          <Meta>{t('hw.new')}</Meta>
        </div>
        <div className="spacer" />
        <label className="field">
          <span className="field-label">{t('hw.titleLabel')}</span>
          <input
            className="input"
            value={title}
            maxLength={60}
            placeholder={t('hw.titleDefault')}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="field">
          <span className="field-label">{t('hw.pasteLabel')}</span>
          <textarea
            className="input hw-text"
            rows={12}
            value={text}
            maxLength={8000}
            placeholder={t('hw.pastePlaceholder')}
            onChange={(e) => setText(e.target.value)}
          />
        </label>
        {error && <div className="hw-err">{t('common.error')}</div>}
        <button className="btn btn-block" disabled={!text.trim() || busy} onClick={parse}>
          {busy ? t('hw.parsing') : t('hw.parse')} <ArrowRight size={18} strokeWidth={2.6} />
        </button>
        <button className="btn btn-block secondary hw-gap" onClick={() => setPhase('list')}>
          {t('hw.back')}
        </button>
      </div>
    );
  }

  // ---------- review parsed ----------
  if (phase === 'review') {
    return (
      <div className="fade-in hw-screen">
        <TopicScene topic="homework" />
        <div className="topbar">
          <Meta>{t('hw.review')}</Meta>
          <span className="counter">{items.length}</span>
        </div>
        <div className="spacer" />
        <div className="hw-source">{source === 'ai' ? t('hw.sourceAi') : t('hw.sourceLocal')}</div>
        {items.length === 0 && <div className="card hw-empty">{t('hw.noQuestions')}</div>}
        {items.map((i, n) => (
          <div className="card hw-item" key={i.id}>
            <button
              className="hw-x"
              aria-label={t('hw.removeItem')}
              onClick={() => setItems(items.filter((_, k) => k !== n))}
            >
              <X size={16} strokeWidth={2.6} />
            </button>
            <div className="hw-q" lang="el">{i.question}</div>
            {i.answer && <div className="hw-a" lang="el">{i.answer}</div>}
            {i.note && <div className="hw-n">{i.note}</div>}
          </div>
        ))}
        <button className="btn btn-block" disabled={!items.length} onClick={saveAndStart}>
          {t('hw.save')} <ArrowRight size={18} strokeWidth={2.6} />
        </button>
        <button className="btn btn-block secondary hw-gap" onClick={() => setPhase('new')}>
          {t('hw.back')}
        </button>
      </div>
    );
  }

  // ---------- done ----------
  if (phase === 'done' && current) {
    const ok = current.items.filter((i) => i.status === 'correct').length;
    const weak = current.items.filter((i) => i.status !== 'correct');
    return (
      <div className="fade-in hw-screen">
        <TopicScene topic="homework" />
        <div className="card hw-done">
          <div className="hw-done-t">{t('hw.done')}</div>
          <div className="hw-wreath-wrap">
            <img
              className="hw-wreath"
              src={`${import.meta.env.BASE_URL}assets/topics/homework/wreath.webp`}
              alt=""
              aria-hidden="true"
              draggable={false}
            />
            <div className="hw-done-n">
              {ok}/{current.items.length}
            </div>
          </div>
          <div className="hw-done-d">{t('hw.score')}</div>
        </div>
        {weak.length > 0 && (
          <button className="btn btn-block" onClick={() => begin(current, ['almost', 'wrong'])}>
            <RotateCcw size={18} strokeWidth={2.4} /> {t('hw.repeatWeak')} ({weak.length})
          </button>
        )}
        <button className="btn btn-block secondary hw-gap" onClick={() => setPhase('list')}>
          {t('hw.toList')}
        </button>
      </div>
    );
  }

  // ---------- play ----------
  if (!current || !item) {
    return (
      <div className="fade-in hw-screen">
        <TopicScene topic="homework" />
        <button className="btn btn-block secondary" onClick={() => setPhase('list')}>
          {t('hw.toList')}
        </button>
      </div>
    );
  }
  return (
    <div className="fade-in hw-screen qz-play" key={item.id}>
      <TopicScene topic="homework" />
      <div className="topbar">
        <Meta>{current.title}</Meta>
        <span className="counter">
          {idx + 1}/{queue.length}
        </span>
      </div>
      <ProgressBar value={idx} total={queue.length} />
      <div className="spacer" />

      <div className="card hw-card">
        <VocabDecorImg slot="cardGreekCorner" className="hw-corner" />
        <VocabDecorImg slot="cardOliveBranch" className="hw-corner-olive" />
        <div className="hw-q big" lang="el">{item.question}</div>
      </div>

      {!result ? (
        <>
          <textarea
            className="input hw-answer"
            lang="el"
            rows={3}
            autoFocus
            value={answer}
            maxLength={600}
            placeholder={t('hw.answerPlaceholder')}
            onChange={(e) => setAnswer(e.target.value)}
          />
          {error && <div className="hw-err">{t('common.error')}</div>}
          {!ai && <div className="hw-hint">{t('hw.guestAi')}</div>}
        </>
      ) : (
        <div className={`card hw-result v-${result.verdict}`}>
          <div className="hw-verdict">
            {result.verdict === 'correct' ? (
              <CheckCircle2 size={22} strokeWidth={2.4} />
            ) : result.verdict === 'almost' ? (
              <CircleAlert size={22} strokeWidth={2.4} />
            ) : (
              <CircleX size={22} strokeWidth={2.4} />
            )}
            {t(`hw.verdict.${result.verdict}`)}
          </div>
          <div className="hw-row">
            <span className="hw-lab">{t('hw.fixed')}</span>
            <span lang="el">{result.corrected || item.answer || answer}</span>
          </div>
          {result.comment_ru && (
            <div className="hw-comment">
              <Owl className="qz-owl" />
              <span>{result.comment_ru}</span>
            </div>
          )}
          {result.mistakes.map((m, k) => (
            <div className="hw-mistake" key={k}>
              <span lang="el">
                <s>{m.wrong}</s> → <b>{m.right}</b>
              </span>
              <span>{m.why_ru}</span>
            </div>
          ))}
          {result.source === 'local' && (
            <>
              {result.missing && result.missing.length > 0 && (
                <div className="hw-row">
                  <span className="hw-lab">{t('hw.missing')}</span>
                  <span lang="el">{result.missing.join(', ')}</span>
                </div>
              )}
              {!item.answer && <div className="hw-hint">{t('hw.noModel')}</div>}
              <div className="hw-hint">{t('hw.localCheck')}</div>
            </>
          )}
          {item.answer && result.source === 'ai' && (
            <div className="hw-row">
              <span className="hw-lab">{t('hw.model')}</span>
              <span lang="el">{item.answer}</span>
            </div>
          )}
          {item.note && (
            <div className="hw-row">
              <span className="hw-lab">{t('hw.note')}</span>
              <span>{item.note}</span>
            </div>
          )}
        </div>
      )}

      <TopicBand topic="homework" />

      <div className="actionbar">
        {!result ? (
          <button className="btn btn-block" disabled={!answer.trim() || busy} onClick={check}>
            {busy ? t('hw.checking') : t('hw.check')}
          </button>
        ) : (
          <button className="btn btn-block" onClick={next}>
            {idx + 1 >= queue.length ? t('hw.finish') : t('hw.next')} <ArrowRight size={18} strokeWidth={2.6} />
          </button>
        )}
      </div>
    </div>
  );
}
