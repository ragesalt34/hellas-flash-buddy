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
import { Loading, ProgressBar, Ring } from '../ui';

const LETTERS = ['Α', 'Β', 'Γ', 'Δ'];

const TOPICS: { id: string; label: string; icon: LucideIcon; color: string; span?: boolean }[] = [
  { id: 'mixed', label: 'Όλα τα θέματα', icon: Shuffle, color: 'var(--amber)', span: true },
  { id: 'history', label: 'Ιστορία', icon: Landmark, color: 'var(--accent)' },
  { id: 'culture', label: 'Πολιτισμός', icon: Drama, color: 'var(--purple)' },
  { id: 'laws', label: 'Νομοθεσία', icon: Scale, color: 'var(--coral)' },
  { id: 'geography', label: 'Γεωγραφία', icon: Globe2, color: 'var(--mint)' },
];

interface AnswerRec {
  question_id: string;
  chosen: string;
  correct: boolean;
  correct_answer: string;
}

type Phase = 'topic' | 'loading' | 'play' | 'result';

export function Quiz({ onHome }: { onHome: () => void }) {
  const [phase, setPhase] = useState<Phase>('topic');
  const [topic, setTopic] = useState('mixed');
  const [topicLabel, setTopicLabel] = useState('');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [idx, setIdx] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [answers, setAnswers] = useState<AnswerRec[]>([]);
  const [score, setScore] = useState(0);

  async function start(t: string) {
    haptic();
    setTopic(t);
    setPhase('loading');
    try {
      const r = await api.quiz(t, 10);
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
    } else {
      notify('error');
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
      setPhase('result');
    } else {
      setIdx((i) => i + 1);
      setChosen(null);
    }
  }

  // ---- Topic selection ----
  if (phase === 'topic') {
    return (
      <div className="fade-in">
        <div className="section-label">Διάλεξε θέμα</div>
        <div className="tiles stagger">
          {TOPICS.map((t, i) => {
            const Icon = t.icon;
            return t.span ? (
              <button
                key={t.id}
                className="tile feature warm"
                style={{ animationDelay: `${40 + i * 45}ms` }}
                onClick={() => start(t.id)}
              >
                <span className="tile-ic">
                  <Icon size={26} strokeWidth={2.2} />
                </span>
                <span className="grow">
                  <span className="tile-t" style={{ display: 'block' }}>
                    {t.label}
                  </span>
                  <span className="tile-d">10 τυχαίες ερωτήσεις</span>
                </span>
                <span className="arrow">
                  <ArrowRight size={22} strokeWidth={2.6} />
                </span>
              </button>
            ) : (
              <button
                key={t.id}
                className="tile"
                style={{ animationDelay: `${40 + i * 45}ms` }}
                onClick={() => start(t.id)}
              >
                <span className="tile-ic" style={{ background: `color-mix(in srgb, ${t.color} 18%, transparent)`, color: t.color }}>
                  <Icon size={24} strokeWidth={2.2} />
                </span>
                <span className="tile-t">{t.label}</span>
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
    let ttl = 'Μπορείς καλύτερα';
    if (pct >= 80) {
      ResultIcon = Trophy;
      ttl = 'Εξαιρετικά!';
    } else if (pct >= 60) {
      ResultIcon = ThumbsUp;
      ttl = 'Μπράβο!';
    } else if (pct >= 40) {
      ResultIcon = Zap;
      ttl = 'Συνέχισε!';
    }
    return (
      <div className="fade-in center-col">
        <div className="result">
          <Ring pct={pct} size={150} stroke={13}>
            <div className="ring-pct">{pct}%</div>
            <div className="ring-sub">{score}/{total}</div>
          </Ring>
          <div className="ttl" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <ResultIcon size={22} strokeWidth={2.4} /> {ttl}
          </div>
          <div className="line" style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Check size={15} strokeWidth={3} /> {score} σωστά
            </span>
            ·
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <X size={15} strokeWidth={3} /> {total - score} λάθος
            </span>
          </div>
        </div>
        <button className="btn btn-block good" onClick={() => start(topic)}>
          <RotateCcw size={18} strokeWidth={2.4} /> Ξανά
        </button>
        <button className="btn btn-block" onClick={() => setPhase('topic')}>
          <LayoutGrid size={18} strokeWidth={2.4} /> Άλλο θέμα
        </button>
        <button className="btn btn-block secondary" onClick={onHome}>
          <House size={18} strokeWidth={2.4} /> Μενού
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
            aria-label="Προφορά"
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
        <>
          <div className="spacer" />
          <button className="btn btn-block" onClick={next}>
            {idx + 1 >= questions.length ? 'Αποτέλεσμα' : 'Επόμενη'}
            <ArrowRight size={20} strokeWidth={2.6} />
          </button>
        </>
      )}
    </div>
  );
}
