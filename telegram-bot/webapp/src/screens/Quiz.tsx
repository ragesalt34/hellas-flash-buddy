import { useEffect, useRef, useState } from 'react';
import {
  Shuffle,
  Landmark,
  Drama,
  Scale,
  Check,
  X,
  ArrowRight,
  BookOpen,
  Zap,
  ThumbsUp,
  Trophy,
  RotateCcw,
  LayoutGrid,
  House,
  Lightbulb,
  Volume2,
  type LucideIcon,
} from 'lucide-react';
import { api, QuizQuestion, persistWrite } from '../api';
import { haptic, notify } from '../telegram';
import { speakGreek, prefetchGreek, textKey, hasGreek } from '../speech';
import { playCorrect, playWrong, playComplete, playTap } from '../sound';
import { Loading, ProgressBar, Ring } from '../ui';
import { useLanguage } from '../i18n';
import { GeoIcon } from '../components/icons';
import { Greek } from '../components/greek';

/* Round-theme ornaments for the topic picker: one classical element per
   screen edge, faint and pastel, so the centre stays a clean menu. Decorative
   only — aria-hidden, and .hs-deco is hidden by the square theme. */
function TopicDecor() {
  return (
    <div className="hs-deco tp-decor" aria-hidden="true">
      <Greek name="bg-shape-1" className="blob b-tl" />
      <Greek name="bg-shape-3" className="blob b-tr" />
      <Greek name="bg-shape-3" className="blob b-bl" />
      <Greek name="bg-shape-2" className="blob b-br" />
      <Greek name="column" className="orn o-column" />
      <Greek name="olive-branch" className="orn o-olive-tl" />
      <Greek name="greek-key" className="orn o-key-tr" />
      <Greek name="hill-temple" className="orn o-temple" />
      <Greek name="amphora" className="orn o-amphora" />
      <Greek name="olive-branch-small" className="orn o-olive-bl" />
      <Greek name="olive-branch" className="orn o-olive-br" />
      <Greek name="greek-key-small" className="orn o-key-bl" />
      <Greek name="decorative-diamond" className="orn o-diamond d1" />
      <Greek name="decorative-diamond" className="orn o-diamond d2" />
    </div>
  );
}

/* Small ornaments inside each topic tile — two per tile at most, in the
   corners, so the icon and the name stay the only things that read. */
function TileOrnaments({ id }: { id: string }) {
  switch (id) {
    case 'mixed':
      return (
        <>
          <Greek name="decorative-corner" className="tp-o key tr" />
          <Greek name="olive-branch-small" className="tp-o olive br" />
        </>
      );
    case 'history':
      return (
        <>
          <Greek name="decorative-corner" className="tp-o key tr" />
          <Greek name="column" className="tp-o column br" />
        </>
      );
    case 'culture':
      return (
        <>
          <Greek name="olive-branch-small" className="tp-o olive tr" />
          <Greek name="decorative-corner" className="tp-o key br" />
        </>
      );
    case 'laws':
      return (
        <>
          <Greek name="olive-branch-small" className="tp-o olive tr" />
          <Greek name="decorative-corner" className="tp-o key br" />
        </>
      );
    case 'geography':
      return (
        <>
          <Greek name="decorative-corner" className="tp-o key tr" />
          <Greek name="hill-temple" className="tp-o temple br" />
        </>
      );
    default:
      return null;
  }
}

const LETTERS = ['Α', 'Β', 'Γ', 'Δ'];

const TOPICS: { id: string; key: string; icon: LucideIcon | typeof GeoIcon; color: string; span?: boolean }[] = [
  { id: 'mixed', key: 'topic.mixed', icon: Shuffle, color: 'var(--amber)', span: true },
  { id: 'history', key: 'topic.history', icon: Landmark, color: 'var(--accent)' },
  { id: 'culture', key: 'topic.culture', icon: Drama, color: 'var(--topic-culture)' },
  { id: 'laws', key: 'topic.laws', icon: Scale, color: 'var(--topic-laws)' },
  { id: 'geography', key: 'topic.geography', icon: GeoIcon, color: 'var(--topic-geo)' },
];

interface AnswerRec {
  question_id: string;
  chosen: string;
  correct: boolean;
  correct_answer: string;
}

type Phase = 'topic' | 'loading' | 'play' | 'result';

export function Quiz({ onHome }: { onHome: () => void }) {
  const { t } = useLanguage();
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
    return (
      <div className="fade-in tp-screen">
        <TopicDecor />
        <div className="section-label">
          {t('quiz.chooseTopic')}
          <Greek name="olive-branch-small" className="tp-label-olive" />
        </div>
        <div className="tiles stagger">
          {TOPICS.map((topicDef, i) => {
            const Icon = topicDef.icon;
            return topicDef.span ? (
              <button
                key={topicDef.id}
                className="tile feature warm t-mixed"
                style={{ animationDelay: `${40 + i * 45}ms` }}
                onClick={() => start(topicDef.id)}
              >
                <TileOrnaments id={topicDef.id} />
                <span className="tile-ic">
                  <Icon size={26} strokeWidth={2.2} />
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
            ) : (
              <button
                key={topicDef.id}
                className={`tile tp-tile t-${topicDef.id}`}
                style={{ animationDelay: `${40 + i * 45}ms` }}
                onClick={() => start(topicDef.id)}
              >
                <TileOrnaments id={topicDef.id} />
                <span className="tile-ic" style={{ background: `color-mix(in srgb, ${topicDef.color} 18%, transparent)`, color: topicDef.color }}>
                  <Icon size={24} strokeWidth={2.2} />
                </span>
                <span className="tile-t">{t(topicDef.key)}</span>
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
    let ResultIcon: LucideIcon = BookOpen;
    let ttlKey = 'quiz.result.tryHarder';
    if (pct >= 80) {
      ResultIcon = Trophy;
      ttlKey = 'quiz.result.great';
    } else if (pct >= 60) {
      ResultIcon = ThumbsUp;
      ttlKey = 'quiz.result.good';
    } else if (pct >= 40) {
      ResultIcon = Zap;
      ttlKey = 'quiz.result.keepGoing';
    }
    return (
      <div className="fade-in center-col">
        <div className="result">
          <Ring pct={pct} size={150} stroke={13}>
            <div className="ring-pct">{pct}%</div>
            <div className="ring-sub">{score}/{total}</div>
          </Ring>
          <div className="ttl" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <ResultIcon size={22} strokeWidth={2.4} /> {t(ttlKey)}
          </div>
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
        <button className="btn btn-block good" onClick={() => start(topic)}>
          <RotateCcw size={18} strokeWidth={2.4} /> {t('common.retry')}
        </button>
        <button className="btn btn-block" onClick={() => setPhase('topic')}>
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
    <div className="fade-in" key={idx}>
      <div className="topbar">
        <span className="meta">{topicLabel}</span>
        <span className="counter">
          {idx + 1}/{questions.length}
        </span>
      </div>
      <ProgressBar value={idx + (chosen ? 1 : 0)} total={questions.length} />
      <div className="spacer" />
      <div className="card">
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
            <Lightbulb
              size={16}
              strokeWidth={2.4}
              style={{ display: 'inline', verticalAlign: '-3px', marginRight: 6 }}
            />
            {q.explanation}
          </div>
        )}
      </div>
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
