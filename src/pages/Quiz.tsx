import { useState, useEffect } from 'react';
import { localizeQuestions } from '@/lib/questionLocale';
import { useParams, Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ArrowLeft, CheckCircle2, XCircle, ArrowRight, RotateCcw, Home, Volume2, VolumeX, X } from 'lucide-react';
import { useSpeech } from '@/hooks/useSpeech';
import { useStudyTimer } from '@/hooks/useStudyTimer';
import { cn } from '@/lib/utils';
import { upsertProgress } from '@/lib/progressHelper';

type Question = { id: string; question: string; correct_answer: string; wrong_answers: string[]; explanation: string | null; };
type TopicType = 'history' | 'culture' | 'laws' | 'geography';

const ANSWER_LABELS = ['A', 'B', 'C', 'D'];

const topicAccent: Record<TopicType, string> = {
  history:   '#5B8DB8',
  culture:   '#9B7EC8',
  laws:      '#7D8A57',
  geography: '#D4874A',
};

const topicEmoji: Record<TopicType, string> = {
  history:   '📜',
  culture:   '🎭',
  laws:      '⚖️',
  geography: '🗺️',
};

const topicLabelRu: Record<TopicType, string> = {
  history:   'История Греции',
  culture:   'Культура',
  laws:      'Законы',
  geography: 'География',
};

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function Quiz() {
  const { topic } = useParams<{ topic: string; mode: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [shuffledAnswers, setShuffledAnswers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  const { speak, stop, isSpeaking, isSupported } = useSpeech();
  useStudyTimer('quiz');
  const [restartCount, setRestartCount] = useState(0);

  const validTopic = topic as TopicType;
  const validTopics = ['history', 'culture', 'laws', 'geography'];
  const isValidTopic = topic && validTopics.includes(topic);

  useEffect(() => {
    if (!isValidTopic || !user) return;
    const fetchQuestions = async () => {
      setIsLoading(true);
      const { data, error } = await supabase.from('questions').select('*').eq('topic', validTopic).limit(200);
      if (error) { setIsLoading(false); return; }
      if (!data || data.length === 0) { setQuestions([]); setIsLoading(false); return; }

      const localized = localizeQuestions(data, language);
      const { data: progressData } = await supabase
        .from('user_progress')
        .select('question_id, correct_count, incorrect_count, last_reviewed_at, next_review_at')
        .eq('user_id', user.id);

      const progressMap = Object.fromEntries((progressData || []).map(p => [p.question_id, p]));
      const now = Date.now();

      const scored = localized.map(q => {
        const p = progressMap[q.id];
        if (!p) return { q, group: 0, ts: 0 };
        const reviewTs = p.next_review_at ? new Date(p.next_review_at).getTime() : 0;
        const isDue = reviewTs <= now;
        if (isDue) return { q, group: 1, ts: reviewTs };
        if (p.incorrect_count > p.correct_count) return { q, group: 2, ts: reviewTs };
        return { q, group: 3, ts: reviewTs };
      });

      scored.sort((a, b) => a.group !== b.group ? a.group - b.group : a.ts - b.ts);
      const selected = shuffleArray(scored.slice(0, 20).map(s => s.q));
      setQuestions(selected);
      setIsLoading(false);
    };
    fetchQuestions();
  }, [validTopic, user, isValidTopic, language, restartCount]);

  useEffect(() => {
    if (questions.length > 0 && currentIndex < questions.length) {
      const current = questions[currentIndex];
      setShuffledAnswers(shuffleArray([current.correct_answer, ...current.wrong_answers]));
    }
  }, [currentIndex, questions]);

  useEffect(() => {
    if (isFinished || isLoading || questions.length === 0) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!isAnswered) {
        const idx = ['1', '2', '3', '4'].indexOf(e.key);
        if (idx !== -1 && idx < shuffledAnswers.length) handleAnswer(shuffledAnswers[idx]);
      } else if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isFinished, isLoading, questions.length, isAnswered, shuffledAnswers, currentIndex]);

  const handleAnswer = (answer: string) => {
    if (isAnswered) return;
    setSelectedAnswer(answer);
    setIsAnswered(true);
    const isCorrect = answer === questions[currentIndex].correct_answer;
    if (isCorrect) setScore(prev => prev + 1);
    if (user) void upsertProgress(user.id, questions[currentIndex].id, isCorrect);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) { setCurrentIndex(prev => prev + 1); setSelectedAnswer(null); setIsAnswered(false); }
    else setIsFinished(true);
  };

  const handleRestart = () => { setCurrentIndex(0); setSelectedAnswer(null); setIsAnswered(false); setScore(0); setIsFinished(false); setRestartCount(c => c + 1); };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#E8E6E1' }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#2F3532' }} />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!isValidTopic) return <Navigate to="/learn" replace />;

  const accent = topicAccent[validTopic] || '#5B8DB8';
  const emoji = topicEmoji[validTopic] || '📚';
  const label = topicLabelRu[validTopic] ?? 'Тест';
  const progressPct = questions.length > 0 ? Math.round(((currentIndex) / questions.length) * 100) : 0;

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#E8E6E1', backgroundImage: 'radial-gradient(rgba(47,53,50,0.15) 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
        <div className="bg-white rounded-2xl p-10 text-center shadow-sm max-w-md w-full">
          <p className="text-lg font-semibold mb-4" style={{ color: '#2F3532' }}>{t('quiz.noQuestions')}</p>
          <Link to="/learn">
            <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white" style={{ background: accent }}>
              <ArrowLeft className="h-4 w-4" />
              {t('quiz.backToTopics')}
            </button>
          </Link>
        </div>
      </div>
    );
  }

  if (isFinished) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6"
        style={{ background: '#E8E6E1', backgroundImage: 'radial-gradient(rgba(47,53,50,0.15) 1px, transparent 1px)', backgroundSize: '24px 24px', fontFamily: "'DM Sans', sans-serif" }}
      >
        <div className="bg-white rounded-2xl p-10 text-center shadow-sm max-w-md w-full space-y-6">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center mx-auto text-3xl font-bold"
            style={{ background: hexToRgba(accent, 0.12), color: accent }}
          >
            {percentage}%
          </div>
          <h2 className="text-2xl font-bold" style={{ color: '#2F3532' }}>{t('quiz.finished')}</h2>
          <p className="text-sm" style={{ color: 'rgba(47,53,50,0.55)' }}>
            {t('quiz.correctAnswers')} {score} {t('quiz.of')} {questions.length}
          </p>
          <p className="text-sm font-medium" style={{ color: accent }}>
            {percentage >= 70 ? t('quiz.result.great') : percentage >= 50 ? t('quiz.result.good') : t('quiz.result.practice')}
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={handleRestart}
              className="w-full py-3 rounded-2xl text-sm font-semibold border"
              style={{ borderColor: 'rgba(47,53,50,0.15)', color: '#2F3532', background: 'white' }}
            >
              <RotateCcw className="h-4 w-4 inline mr-2" />
              {t('quiz.tryAgain')}
            </button>
            <Link to="/learn" className="block">
              <button className="w-full py-3 rounded-2xl text-sm font-semibold text-white" style={{ background: '#2F3532' }}>
                <Home className="h-4 w-4 inline mr-2" />
                {t('quiz.toTopics')}
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: '#E8E6E1',
        backgroundImage: 'radial-gradient(rgba(47,53,50,0.15) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap');

        .qz-speaker-btn {
          width: 32px; height: 32px;
          border-radius: 50%;
          border: 1.5px solid rgba(47,53,50,0.10);
          background: rgba(47,53,50,0.04);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          color: rgba(47,53,50,0.40);
          transition: background 0.15s, border-color 0.15s, color 0.15s, transform 0.15s;
          flex-shrink: 0;
        }
        .qz-speaker-btn:hover {
          background: rgba(47,53,50,0.10);
          border-color: rgba(47,53,50,0.20);
          color: rgba(47,53,50,0.75);
          transform: scale(1.08);
        }
        .qz-answer-btn {
          width: 100%;
          display: flex; align-items: center; gap: 14px;
          padding: 14px 18px;
          border-radius: 16px;
          border: 1.5px solid rgba(47,53,50,0.12);
          background: white;
          text-align: left;
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s, transform 0.15s;
          font-family: inherit;
          font-size: 15px;
          font-weight: 500;
          color: #2F3532;
        }
        .qz-answer-btn:hover:not(:disabled) {
          border-color: rgba(47,53,50,0.25);
          background: rgba(47,53,50,0.02);
          transform: translateY(-1px);
        }
        .qz-answer-btn:disabled { cursor: default; transform: none; }
        .qz-label {
          width: 30px; height: 30px;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 700;
          flex-shrink: 0;
          background: rgba(47,53,50,0.07);
          color: rgba(47,53,50,0.45);
          transition: background 0.2s, color 0.2s;
        }
      `}</style>

      {/* ── Top bar ── */}
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36, height: 36, borderRadius: '50%',
              background: hexToRgba(accent, 0.15),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18,
            }}
          >
            {emoji}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#2F3532', lineHeight: 1.2 }}>{label}</div>
            <div style={{ fontSize: 12, color: 'rgba(47,53,50,0.45)', lineHeight: 1.2 }}>Тест</div>
          </div>
        </div>
        <Link to="/learn">
          <button
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 100,
              border: '1.5px solid rgba(47,53,50,0.15)',
              background: 'rgba(47,53,50,0.04)',
              fontSize: 13, fontWeight: 600, color: 'rgba(47,53,50,0.65)',
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'background 0.15s, border-color 0.15s',
            }}
          >
            <X size={14} />
            Завершить
          </button>
        </Link>
      </div>

      {/* ── Progress ── */}
      <div style={{ padding: '0 20px 16px', maxWidth: 600, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(47,53,50,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Вопрос {currentIndex + 1} из {questions.length}
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(47,53,50,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {progressPct}% пройдено
          </span>
        </div>
        <div style={{ width: '100%', height: 4, borderRadius: 100, background: 'rgba(47,53,50,0.12)', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 100, background: accent, width: `${progressPct}%`, transition: 'width 0.5s ease' }} />
        </div>
      </div>

      {/* ── Main area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 20px 24px', maxWidth: 600, width: '100%', margin: '0 auto', boxSizing: 'border-box', gap: 12 }}>

        {/* Question card */}
        <div style={{ background: 'white', borderRadius: 20, boxShadow: '0 4px 24px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
          {/* Card header: spacer | badge | speaker */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '18px 18px 0' }}>
            <div style={{ width: 32 }} />
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '4px 12px', borderRadius: 100,
                background: hexToRgba(accent, 0.10),
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em',
                color: accent,
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: accent, display: 'inline-block' }} />
                Выберите ответ
              </span>
            </div>
            {isSupported && (
              <button
                className="qz-speaker-btn"
                onClick={() => isSpeaking ? stop() : speak(currentQuestion.question, `${currentQuestion.id}_question_${language}`)}
              >
                {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
            )}
          </div>

          {/* Question text */}
          <div style={{ padding: '16px 22px 22px' }}>
            <p style={{ fontSize: 18, fontWeight: 600, color: '#2F3532', lineHeight: 1.5, margin: 0 }}>
              {currentQuestion.question}
            </p>
          </div>
        </div>

        {/* Answers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {shuffledAnswers.map((answer, index) => {
            const isCorrect = answer === currentQuestion.correct_answer;
            const isSelected = answer === selectedAnswer;

            let btnStyle: React.CSSProperties = {};
            let labelStyle: React.CSSProperties = {};
            let iconEl: React.ReactNode = null;

            if (isAnswered) {
              if (isCorrect) {
                btnStyle = { borderColor: accent, background: hexToRgba(accent, 0.08), color: '#2F3532' };
                labelStyle = { background: accent, color: 'white' };
                iconEl = <CheckCircle2 size={16} style={{ color: accent, flexShrink: 0 }} />;
              } else if (isSelected && !isCorrect) {
                btnStyle = { borderColor: 'rgba(192,80,77,0.4)', background: 'rgba(192,80,77,0.05)', color: '#c0504d' };
                labelStyle = { background: 'rgba(192,80,77,0.12)', color: '#c0504d' };
                iconEl = <XCircle size={16} style={{ color: '#c0504d', flexShrink: 0 }} />;
              } else {
                btnStyle = { opacity: 0.45 };
              }
            }

            return (
              <button
                key={index}
                className="qz-answer-btn"
                onClick={() => handleAnswer(answer)}
                disabled={isAnswered}
                style={{ ...btnStyle }}
              >
                <span className="qz-label" style={labelStyle}>{ANSWER_LABELS[index]}</span>
                <span style={{ flex: 1 }}>{answer}</span>
                {iconEl}
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {isAnswered && currentQuestion.explanation && (
          <div style={{ background: 'rgba(47,53,50,0.04)', borderRadius: 14, padding: '12px 16px', border: '1.5px solid rgba(47,53,50,0.08)' }}>
            <p style={{ fontSize: 13, color: 'rgba(47,53,50,0.65)', margin: 0, lineHeight: 1.6 }}>
              <span style={{ fontWeight: 700, color: '#2F3532' }}>{t('quiz.explanation')} </span>
              {currentQuestion.explanation}
            </p>
          </div>
        )}
      </div>

      {/* ── Bottom bar ── */}
      <div style={{ padding: '0 20px 32px', maxWidth: 600, width: '100%', margin: '0 auto', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: 11, color: 'rgba(47,53,50,0.35)', margin: 0 }} className="hidden sm:block">
          [1–4] выбор • [Enter] продолжить
        </p>
        <div style={{ marginLeft: 'auto', opacity: isAnswered ? 1 : 0, pointerEvents: isAnswered ? 'auto' : 'none', transition: 'opacity 0.25s' }}>
          <button
            onClick={handleNext}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 24px', borderRadius: 100,
              background: '#2F3532', color: 'white',
              border: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
              transition: 'transform 0.15s, opacity 0.15s',
            }}
          >
            {currentIndex < questions.length - 1
              ? <>Далее <ArrowRight size={16} /></>
              : <>Завершить <CheckCircle2 size={16} /></>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
