import { useState } from 'react';
import { api, QuizQuestion } from '../api';
import { haptic, notify } from '../telegram';
import { Loading, ProgressBar, Ring } from '../ui';

const LETTERS = ['Α', 'Β', 'Γ', 'Δ'];

const TOPICS = [
  { id: 'mixed', label: 'Όλα τα θέματα', ic: '🎲', span: true },
  { id: 'history', label: 'Ιστορία', ic: '🏛' },
  { id: 'culture', label: 'Πολιτισμός', ic: '🎭' },
  { id: 'laws', label: 'Νομοθεσία', ic: '⚖️' },
  { id: 'geography', label: 'Γεωγραφία', ic: '🌍' },
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
          {TOPICS.map((t, i) =>
            t.span ? (
              <button
                key={t.id}
                className="tile feature warm"
                style={{ animationDelay: `${40 + i * 45}ms` }}
                onClick={() => start(t.id)}
              >
                <span className="tile-ic">{t.ic}</span>
                <span className="grow">
                  <span className="tile-t" style={{ display: 'block' }}>
                    {t.label}
                  </span>
                  <span className="tile-d">10 τυχαίες ερωτήσεις</span>
                </span>
                <span className="arrow">→</span>
              </button>
            ) : (
              <button
                key={t.id}
                className="tile"
                style={{ animationDelay: `${40 + i * 45}ms` }}
                onClick={() => start(t.id)}
              >
                <span className="tile-ic">{t.ic}</span>
                <span className="tile-t">{t.label}</span>
              </button>
            )
          )}
        </div>
      </div>
    );
  }

  if (phase === 'loading') return <Loading />;

  // ---- Result ----
  if (phase === 'result') {
    const total = questions.length;
    const pct = total ? Math.round((score / total) * 100) : 0;
    let emoji = '📚';
    let ttl = 'Μπορείς καλύτερα';
    if (pct >= 80) {
      emoji = '🏆';
      ttl = 'Εξαιρετικά!';
    } else if (pct >= 60) {
      emoji = '👍';
      ttl = 'Μπράβο!';
    } else if (pct >= 40) {
      emoji = '💪';
      ttl = 'Συνέχισε!';
    }
    return (
      <div className="fade-in center-col">
        <div className="result">
          <Ring pct={pct} size={150} stroke={13}>
            <div className="ring-pct">{pct}%</div>
            <div className="ring-sub">{score}/{total}</div>
          </Ring>
          <div className="ttl">
            {emoji} {ttl}
          </div>
          <div className="line">
            ✅ {score} σωστά · ❌ {total - score} λάθος
          </div>
        </div>
        <button className="btn btn-block good" onClick={() => start(topic)}>
          🔄 Ξανά
        </button>
        <button className="btn btn-block" onClick={() => setPhase('topic')}>
          🎯 Άλλο θέμα
        </button>
        <button className="btn btn-block secondary" onClick={onHome}>
          🏠 Μενού
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
        <div className="qtext">{q.question}</div>
        <div className="options">
          {q.options.map((opt, i) => {
            let cls = 'option';
            if (chosen) {
              if (opt === q.correct_answer) cls += ' correct';
              else if (opt === chosen) cls += ' wrong';
              else cls += ' dim';
            }
            return (
              <button
                key={i}
                className={cls}
                disabled={!!chosen}
                onClick={() => choose(opt)}
              >
                <span className="lt">{LETTERS[i] ?? i + 1}</span>
                <span>{opt}</span>
              </button>
            );
          })}
        </div>
        {chosen && q.explanation && (
          <div className="explain">
            <b>💡</b> {q.explanation}
          </div>
        )}
      </div>
      {chosen && (
        <>
          <div className="spacer" />
          <button className="btn btn-block" onClick={next}>
            {idx + 1 >= questions.length ? '🏁 Αποτέλεσμα' : 'Επόμενη →'}
          </button>
        </>
      )}
    </div>
  );
}
