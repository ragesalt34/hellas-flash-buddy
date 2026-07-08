import { useState } from 'react';
import {
  Shuffle,
  Landmark,
  Drama,
  Scale,
  Globe2,
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
import { api, QuizQuestion } from '../api';
import { haptic, notify } from '../telegram';
import { speakGreek } from '../speech';
import { playCorrect, playWrong, playComplete, playTap } from '../sound';
import { Loading, ProgressBar, Ring } from '../ui';
import { useLanguage } from '../i18n';

const LETTERS = ['Α', 'Β', 'Γ', 'Δ'];

const TOPICS: { id: string; key: string; icon: LucideIcon; color: string; span?: boolean }[] = [
  { id: 'mixed', key: 'topic.mixed', icon: Shuffle, color: 'var(--amber)', span: true },
  { id: 'history', key: 'topic.history', icon: Landmark, color: 'var(--accent)' },
  { id: 'culture', key: 'topic.culture', icon: Drama, color: 'var(--purple)' },
  { id: 'laws', key: 'topic.laws', icon: Scale, color: 'var(--coral)' },
  { id: 'geography', key: 'topic.geography', icon: Globe2, color: 'var(--mint)' },
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
  const [score, setScore] = useState(0);

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
      api
        .quizComplete({
          topic,
          score,
          answers,
          questions: questions.map((x) => ({ id: x.id })),
        })
        .catch(() => {});
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
      <div className="fade-in">
        <div className="section-label">{t('quiz.chooseTopic')}</div>
        <div className="tiles stagger">
          {TOPICS.map((topicDef, i) => {
            const Icon = topicDef.icon;
            return topicDef.span ? (
              <button
                key={topicDef.id}
                className="tile feature warm"
                style={{ animationDelay: `${40 + i * 45}ms` }}
                onClick={() => start(topicDef.id)}
              >
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
                className="tile"
                style={{ animationDelay: `${40 + i * 45}ms` }}
                onClick={() => start(topicDef.id)}
              >
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
        <div className="speak-row">
          <div className="qtext">{q.question}</div>
          <button
            className="speak-btn"
            aria-label={t('common.pronounce')}
            onClick={() => { haptic(); speakGreek(q.question, `q_${q.id}`); }}
          >
            <Volume2 size={17} strokeWidth={2.3} />
          </button>
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
              <button
                key={i}
                className={cls}
                disabled={!!chosen}
                onClick={() => choose(opt)}
              >
                <span className="lt">{LETTERS[i] ?? i + 1}</span>
                <span style={{ flex: 1 }}>{opt}</span>
                {showCheck && <Check size={20} strokeWidth={3} />}
                {showX && <X size={20} strokeWidth={3} />}
              </button>
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
