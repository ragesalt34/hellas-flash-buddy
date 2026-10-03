import { Fragment, useEffect, useRef, useState } from 'react';
import {
  Check,
  X,
  ArrowRight,
  RotateCcw,
  LayoutGrid,
  House,
  Volume2,
} from 'lucide-react';
import { api, QuizQuestion, persistWrite } from '../api';
import { MiniTemple, TopicEmblem } from '../components/statsArt';
import { TopicDecor } from '../components/TopicDecor';
import { SectionLabel } from '../components/SectionLabel';
import { RewardSides, RewardWreath } from '../components/RewardArt';
import { Owl } from '../components/homeArt';
import { TopicBand, TopicScene, hasTopicScene } from './topicScenes';
import { haptic, notify } from '../telegram';
import { speakGreek, prefetchGreek, textKey, hasGreek } from '../speech';
import { playCorrect, playWrong, playComplete, playTap } from '../sound';
import { CountUp, Loading, ProgressBar, Ring, useCached } from '../ui';
import { countWord, useLanguage } from '../i18n';
import { Greek } from '../components/greek';

/* Round-theme ornaments for the topic picker: one classical element per
   screen edge, faint and pastel, so the centre stays a clean menu. Decorative
   only — aria-hidden, and .hs-deco is hidden by the square theme. */
const LETTERS = ['Α', 'Β', 'Γ', 'Δ'];

const tone = (p: number) => (p >= 85 ? 'h3' : p >= 60 ? 'h2' : p > 0 ? 'h1' : 'h0');

const TOPICS: { id: string; key: string; span?: boolean }[] = [
  { id: 'mixed', key: 'topic.mixed', span: true },
  { id: 'history', key: 'topic.history' },
  { id: 'culture', key: 'topic.culture' },
  { id: 'laws', key: 'topic.laws' },
  { id: 'geography', key: 'topic.geography' },
];

interface AnswerRec {
  question_id: string;
  chosen: string;
  correct: boolean;
  correct_answer: string;
}

type Phase = 'topic' | 'loading' | 'play' | 'result';

export function Quiz({ onHome }: { onHome: () => void }) {
  const { t, language } = useLanguage();
  // Same report the readiness screen shows, so each tile can say how far along that topic is.
  const { data: readiness } = useCached(`readiness:${language}`, api.readiness);
  const [phase, setPhase] = useState<Phase>('topic');
  const [topic, setTopic] = useState('mixed');
  const [topicLabel, setTopicLabel] = useState('');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [idx, setIdx] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [answers, setAnswers] = useState<AnswerRec[]>([]);
  // One-shot guard for submitting the finished session. A ref, not state: it has
  // to settle synchronously within the same frame, and it must be declared with
  // the other hooks — the phase branches below return early.
  const submitted = useRef(false);
  const [score, setScore] = useState(0);

  // Warm the current question + its options so tapping 🔊 is instant.
  useEffect(() => {
    if (phase !== 'play') return;
    const q = questions[idx];
    if (!q) return;
    prefetchGreek(q.question, `q_${q.id}`);
    q.options.forEach((opt) => prefetchGreek(opt, textKey(opt)));
  }, [phase, idx, questions]);

  async function start(topicId: string) {
    haptic();
    setTopic(topicId);
    setPhase('loading');
    try {
      const r = await api.quiz(topicId, 10);
      setQuestions(r.questions);
      setTopicLabel(r.topicLabel);
      setIdx(0);
      setChosen(null);
      // A new session may be submitted again (retry / other topic used to stall
      // on the last question: the guard was still set from the previous one).
      submitted.current = false;
      setAnswers([]);
      setScore(0);
      setPhase(r.questions.length ? 'play' : 'topic');
    } catch {
      setPhase('topic');
    }
  }

  function choose(opt: string) {
    if (chosen) return;
    const q = questions[idx];
    const correct = opt === q.correct_answer;
    setChosen(opt);
    if (correct) {
      setScore((s) => s + 1);
      notify('success');
      playCorrect();
    } else {
      notify('error');
      playWrong();
    }
    setAnswers((a) => [
      ...a,
      { question_id: q.id, chosen: opt, correct, correct_answer: q.correct_answer },
    ]);
  }

  function next() {
    haptic();
    if (idx + 1 >= questions.length) {
      // Two taps landing in the same frame would both see the old `idx` and
      // submit the session twice: two rows in the history, the score counted
      // twice, and every question's SRS level advanced twice. A ref settles it
      // synchronously, unlike state, which only updates on the next render.
      if (submitted.current) return;
      submitted.current = true;
      persistWrite(
        () =>
          api.quizComplete({
            topic,
            score,
            answers,
            questions: questions.map((x) => ({ id: x.id })),
          }),
        'quiz session'
      );
      playComplete();
      setPhase('result');
    } else {
      playTap();
      setIdx((i) => i + 1);
      setChosen(null);
    }
  }

  // ---- Topic selection ----
  if (phase === 'topic') {
    // The weakest topic in Greek, flagged only once there is something to compare.
    const tops = readiness?.topics ?? [];
    const pctOf = (tp: (typeof tops)[number]) => (tp.total > 0 ? tp.greek.known / tp.total : 0);
    const weakTopic =
      tops.some((tp) => tp.greek.checked > 0)
        ? [...tops].sort((a, b) => pctOf(a) - pctOf(b)).find((tp) => pctOf(tp) < 0.85)?.topic
        : undefined;
    return (
      <div className="fade-in tp-screen">
        <TopicDecor />
        <SectionLabel k="quiz.chooseTopic">
          <Greek name="olive-branch-small" className="tp-label-olive" />
        </SectionLabel>
        <div className="tiles stagger">
          {TOPICS.map((topicDef, i) => {
            if (topicDef.span)
              return (
                <button
                  key={topicDef.id}
                  className="tile feature warm t-mixed"
                  style={{ animationDelay: `${40 + i * 45}ms` }}
                  onClick={() => start(topicDef.id)}
                >
                  <span className="tile-ic tp-mini">
                    <MiniTemple />
                  </span>
                  <span className="grow">
                    <span className="tile-t" style={{ display: 'block' }}>
                      {t(topicDef.key)}
                    </span>
                    <span className="tile-d">{t('topic.mixed.desc')}</span>
                  </span>
                  <span className="arrow">
                    <ArrowRight size={22} strokeWidth={2.6} />
                  </span>
                </button>
              );
            const report = readiness?.topics.find((tp) => tp.topic === topicDef.id);
            const known = report && report.total > 0 ? Math.round((report.greek.known / report.total) * 100) : 0;
            const isWeak = weakTopic === topicDef.id;
            return (
              <button
                key={topicDef.id}
                className={`tile tp-tile t-${topicDef.id}${isWeak ? ' is-weak' : ''}`}
                style={{ animationDelay: `${40 + i * 45}ms` }}
                onClick={() => start(topicDef.id)}
              >
                <TopicEmblem topic={topicDef.id} className="tp-emblem" />
                <span className="tp-body">
                  {isWeak && <span className="tp-weak">{t('tp.weak')}</span>}
                  <span className="tile-t">{t(topicDef.key)}</span>
                  {report && (
                    <>
                      <span className="tp-meta">
                        {report.total} {countWord(report.total, 'question', language)} ·{' '}
                        {t('tp.known').replace('{n}', `${known}%`)}
                      </span>
                      <span className="tp-bar">
                        <i className={tone(known)} style={{ width: `${known}%` }} />
                      </span>
                    </>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (phase === 'loading') return <Loading />;

  // ---- Result ----
  if (phase === 'result') {
    const total = questions.length;
    const pct = total ? Math.round((score / total) * 100) : 0;
    const ttlKey =
      pct >= 80 ? 'quiz.result.great' : pct >= 60 ? 'quiz.result.good' : pct >= 40 ? 'quiz.result.keepGoing' : 'quiz.result.tryHarder';
    return (
      <div className="fade-in center-col">
        <div className="result">
          <RewardSides />
          <div className="ring-wreath">
            <RewardWreath />
            <Ring pct={pct} size={150} stroke={13}>
              <div className="ring-pct"><CountUp value={pct} />%</div>
              <div className="ring-sub">{score}/{total}</div>
            </Ring>
          </div>
          <div className="ttl">{t(ttlKey)}</div>
          <div className="line" style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Check size={15} strokeWidth={3} /> {score} {t('common.correct')}
            </span>
            ·
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <X size={15} strokeWidth={3} /> {total - score} {t('common.wrong')}
            </span>
          </div>
        </div>
        <button className="btn btn-block" onClick={() => start(topic)}>
          <RotateCcw size={18} strokeWidth={2.4} /> {t('common.retry')}
        </button>
        <button className="btn btn-block secondary" onClick={() => setPhase('topic')}>
          <LayoutGrid size={18} strokeWidth={2.4} /> {t('quiz.otherTopic')}
        </button>
        <button className="btn btn-block secondary" onClick={onHome}>
          <House size={18} strokeWidth={2.4} /> {t('nav.menu')}
        </button>
      </div>
    );
  }

  // ---- Playing ----
  const q = questions[idx];
  return (
    // Only the question card is keyed: the scene, counter and progress bar stay
    // mounted, so the backdrop no longer flashes on every question and the
    // leaf on the progress bar glides forward instead of jumping.
    <div className="fade-in qz-play">
      {hasTopicScene(topic) ? <TopicScene topic={topic} /> : <TopicDecor />}
      <div className="topbar">
        <span className="meta qz-topic">
          <TopicEmblem topic={topic} className="qz-emblem" />
          {topicLabel}
        </span>
        <span className="counter">
          {idx + 1}/{questions.length}
        </span>
      </div>
      <ProgressBar value={idx + (chosen ? 1 : 0)} total={questions.length} />
      <div className="spacer" />
      <Fragment key={idx}>
      <div className="card swap-in">
        {/* Pronunciation only where there is Greek to pronounce — in RU mode the
            question and options are Russian and the voice is Greek-only. */}
        <div className="speak-row">
          <div className="qtext">{q.question}</div>
          {hasGreek(q.question) && (
            <button
              className="speak-btn"
              aria-label={t('common.pronounce')}
              onClick={() => { haptic(); speakGreek(q.question, `q_${q.id}`); }}
            >
              <Volume2 size={17} strokeWidth={2.3} />
            </button>
          )}
        </div>
        <div className="options">
          {q.options.map((opt, i) => {
            let cls = 'option';
            if (chosen) {
              if (opt === q.correct_answer) cls += ' correct';
              else if (opt === chosen) cls += ' wrong';
              else cls += ' dim';
            }
            const showCheck = chosen && opt === q.correct_answer;
            const showX = chosen && opt === chosen && opt !== q.correct_answer;
            return (
              <div
                key={i}
                className={cls}
                role="button"
                tabIndex={chosen ? -1 : 0}
                aria-disabled={!!chosen}
                onClick={() => choose(opt)}
                onKeyDown={(e) => {
                  if (!chosen && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    choose(opt);
                  }
                }}
              >
                <span className="lt">{LETTERS[i] ?? i + 1}</span>
                <span style={{ flex: 1 }}>{opt}</span>
                {showCheck && <Check size={20} strokeWidth={3} />}
                {showCheck && opt === chosen && (
                  <span className="hs-deco leaf-burst" aria-hidden="true">
                    {[0, 1, 2, 3, 4, 5].map((n) => (
                      <i key={n} style={{ ['--n' as string]: n }} />
                    ))}
                  </span>
                )}
                {showX && <X size={20} strokeWidth={3} />}
                {hasGreek(opt) && (
                  <button
                    className="opt-speak"
                    aria-label={t('common.pronounce')}
                    onClick={(e) => {
                      e.stopPropagation();
                      haptic();
                      speakGreek(opt, textKey(opt));
                    }}
                  >
                    <Volume2 size={15} strokeWidth={2.3} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {chosen && q.explanation && (
          <div className="explain">
            <Owl className="qz-owl" />
            <span>{q.explanation}</span>
          </div>
        )}
      </div>
      </Fragment>
      <TopicBand topic={topic} />
      {chosen && (
        <div className="actionbar">
          <button className="btn btn-block" onClick={next}>
            {idx + 1 >= questions.length ? t('quiz.result') : t('quiz.next')}
            <ArrowRight size={20} strokeWidth={2.6} />
          </button>
        </div>
      )}
    </div>
  );
}
