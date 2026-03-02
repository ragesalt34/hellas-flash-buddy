import { useState, useEffect, useCallback, useRef } from 'react';
import { localizeQuestions } from '@/lib/questionLocale';
import { useParams, Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Loader2,
  ArrowLeft,
  RotateCcw,
  Home,
  Shuffle,
  Volume2,
  VolumeX,
  X,
  RefreshCw,
  ThumbsUp,
  Zap,
} from 'lucide-react';
import { useSpeech } from '@/hooks/useSpeech';
import { useStudyTimer } from '@/hooks/useStudyTimer';
import { cn } from '@/lib/utils';
import { upsertProgress } from '@/lib/progressHelper';

type Question = {
  id: string;
  question: string;
  correct_answer: string;
  explanation: string | null;
  srsCorrect: number;
  srsIncorrect: number;
};

type TopicType = 'history' | 'culture' | 'laws' | 'geography';

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

const topicSubLabel: Record<TopicType, string> = {
  history:   'Древняя Эллада',
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

// Returns a human-readable label for the next review interval given a grade.
// Mirrors the DB interval logic so the preview is always accurate.
function getIntervalLabel(
  grade: 1 | 2 | 3,
  correct: number,
  incorrect: number,
  language: string,
): string {
  const d = (n: number) => language === 'ru' ? `${n}д` : `${n}μ`;
  if (grade === 1) return language === 'ru' ? '<1м' : '<1λ';
  const c = correct + 1; // after this Good/Easy rating
  if (grade === 2) {
    if (incorrect > c) return d(1);
    if (c <= 1) return d(1);
    if (c <= 2) return d(3);
    if (c <= 4) return d(7);
    return d(14);
  }
  // grade === 3 (Easy) — accelerated
  if (c <= 1) return d(4);
  if (c <= 2) return d(7);
  if (c <= 4) return d(14);
  return d(21);
}

export default function Flashcards() {
  const { topic } = useParams<{ topic: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const { t, language } = useLanguage();

  const [questions, setQuestions]         = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex]   = useState(0);
  const [isFlipped, setIsFlipped]         = useState(false);
  const [againCount, setAgainCount]       = useState(0);
  const [goodCount, setGoodCount]         = useState(0);
  const [easyCount, setEasyCount]         = useState(0);
  const [originalCount, setOriginalCount] = useState(0);
  const [isLoading, setIsLoading]         = useState(true);
  const [isFinished, setIsFinished]       = useState(false);
  const [restartCount, setRestartCount]   = useState(0);
  const [ratedIndices, setRatedIndices]   = useState<Set<number>>(new Set());
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Track which question IDs have already been re-queued as "Again" this session
  // (prevents infinite appending if user keeps pressing Again on the same card)
  const againAppendedRef = useRef<Set<string>>(new Set());

  const { speak, stop, isSpeaking, isSupported } = useSpeech();
  useStudyTimer('flashcards');

  const validTopic = topic as TopicType;
  const validTopics = ['history', 'culture', 'laws', 'geography'];
  const isValidTopic = topic && validTopics.includes(topic);

  useEffect(() => {
    if (!isValidTopic || !user) return;
    const fetchQuestions = async () => {
      setIsLoading(true);
      againAppendedRef.current = new Set();
      // Reset session state so a language change mid-session starts fresh
      setCurrentIndex(0);
      setIsFlipped(false);
      setAgainCount(0);
      setGoodCount(0);
      setEasyCount(0);
      setIsFinished(false);
      setRatedIndices(new Set());

      const [questionsResult, progressResult] = await Promise.all([
        supabase.from('questions').select('*').eq('topic', validTopic),
        supabase.from('user_progress').select('question_id, correct_count, incorrect_count, next_review_at').eq('user_id', user.id),
      ]);
      if (questionsResult.error) { setIsLoading(false); return; }
      const data = questionsResult.data || [];
      if (data.length === 0) {
        setQuestions([]);
        setOriginalCount(0);
        setIsLoading(false);
        return;
      }
      const localized = localizeQuestions(data, language);
      const progressMap = Object.fromEntries((progressResult.data || []).map(p => [p.question_id, p]));
      const now = Date.now();
      const scored = localized.map(q => {
        const p = progressMap[q.id];
        const srsCorrect   = p?.correct_count   ?? 0;
        const srsIncorrect = p?.incorrect_count ?? 0;
        const enriched = { ...q, srsCorrect, srsIncorrect };
        if (!p) return { q: enriched, group: 0, ts: 0 };
        const reviewTs = p.next_review_at ? new Date(p.next_review_at).getTime() : 0;
        const isDue = reviewTs <= now;
        if (isDue)                               return { q: enriched, group: 1, ts: reviewTs };
        if (p.incorrect_count > p.correct_count) return { q: enriched, group: 2, ts: reviewTs };
        return { q: enriched, group: 3, ts: reviewTs };
      });
      scored.sort((a, b) => a.group !== b.group ? a.group - b.group : a.ts - b.ts);
      const sorted = scored.map(s => s.q);
      setQuestions(sorted);
      setOriginalCount(sorted.length);
      setIsLoading(false);
    };
    fetchQuestions();
  }, [validTopic, user, isValidTopic, language, restartCount]);

  const handleFlip = useCallback(() => setIsFlipped(prev => !prev), []);

  const handleGrade = useCallback((grade: 1 | 2 | 3) => {
    if (!isFlipped || isTransitioning) return;

    const currentQ = questions[currentIndex];
    if (user) void upsertProgress(user.id, currentQ.id, grade);

    setIsFlipped(false);
    setIsTransitioning(true);

    if (grade === 1) {
      setAgainCount(c => c + 1);
      const isAlreadyAppended = againAppendedRef.current.has(currentQ.id);
      if (!isAlreadyAppended) {
        againAppendedRef.current.add(currentQ.id);
        setQuestions(prev => [...prev, currentQ]);
      }
      // After appending: new deck length = questions.length + 1, safe to go next.
      const newLength = isAlreadyAppended ? questions.length : questions.length + 1;
      if (currentIndex >= newLength - 1) {
        setIsTransitioning(false);
        setIsFinished(true);
      } else {
        setTimeout(() => {
          setCurrentIndex(prev => prev + 1);
          setIsTransitioning(false);
        }, 350);
      }
      return;
    }

    // grade 2 or 3
    if (!ratedIndices.has(currentIndex)) {
      setRatedIndices(prev => new Set([...prev, currentIndex]));
    }
    if (grade === 2) setGoodCount(c => c + 1);
    else             setEasyCount(c => c + 1);

    if (currentIndex >= questions.length - 1) {
      setIsTransitioning(false);
      setIsFinished(true);
    } else {
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        setIsTransitioning(false);
      }, 350);
    }
  }, [isFlipped, isTransitioning, currentIndex, questions, ratedIndices, user]);

  const handleShuffle = () => {
    setQuestions(shuffleArray(questions));
    setOriginalCount(questions.length);
    setCurrentIndex(0);
    setIsFlipped(false);
    setAgainCount(0);
    setGoodCount(0);
    setEasyCount(0);
    setIsFinished(false);
    setRatedIndices(new Set());
    againAppendedRef.current = new Set();
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setAgainCount(0);
    setGoodCount(0);
    setEasyCount(0);
    setIsFinished(false);
    setRatedIndices(new Set());
    againAppendedRef.current = new Set();
    setRestartCount(c => c + 1);
  };

  // Keyboard: Space = flip, 1/2/3 = grade
  useEffect(() => {
    if (isFinished || isLoading || questions.length === 0) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          handleFlip();
          break;
        case 'Digit1':
          if (isFlipped) handleGrade(1);
          break;
        case 'Digit2':
          if (isFlipped) handleGrade(2);
          break;
        case 'Digit3':
          if (isFlipped) handleGrade(3);
          break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isFinished, isLoading, isFlipped, handleFlip, handleGrade]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#E8E6E1' }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#2F3532' }} />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!isValidTopic) return <Navigate to="/learn" replace />;

  const accent      = topicAccent[validTopic] || '#5B8DB8';
  const emoji       = topicEmoji[validTopic]  || '📚';
  const headerLabel = t(`topic.${validTopic}`);
  const badgeLabel  = topicSubLabel[validTopic] ?? topicSubLabel.history;
  // Progress bar uses originalCount so it doesn't regress when Again cards are appended
  const progress    = originalCount > 0 ? Math.min(((currentIndex + 1) / originalCount) * 100, 100) : 0;

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#E8E6E1' }}>
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
    const finishPct = originalCount > 0
      ? Math.min(Math.round((goodCount + easyCount) / originalCount * 100), 100)
      : 0;
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6"
        style={{
          background: '#E8E6E1',
          backgroundImage: 'radial-gradient(rgba(47,53,50,0.15) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        <div className="bg-white rounded-2xl p-10 text-center shadow-sm max-w-md w-full space-y-6">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center mx-auto text-3xl font-bold"
            style={{ background: hexToRgba(accent, 0.12), color: accent }}
          >
            {finishPct}%
          </div>
          <h2 className="text-2xl font-bold" style={{ color: '#2F3532' }}>{t('flashcards.finished')}</h2>
          <div className="flex justify-center gap-4">
            <div className="text-center rounded-xl p-4" style={{ background: 'rgba(194,91,91,0.08)' }}>
              <div className="text-2xl font-bold" style={{ color: '#C25B5B' }}>{againCount}</div>
              <div className="text-xs uppercase tracking-wide mt-1" style={{ color: 'rgba(47,53,50,0.5)' }}>
                ↺ {language === 'ru' ? 'Снова' : 'Πάλι'}
              </div>
            </div>
            <div className="text-center rounded-xl p-4" style={{ background: 'rgba(85,107,71,0.08)' }}>
              <div className="text-2xl font-bold" style={{ color: '#556B47' }}>{goodCount}</div>
              <div className="text-xs uppercase tracking-wide mt-1" style={{ color: 'rgba(47,53,50,0.5)' }}>
                👍 {language === 'ru' ? 'Хорошо' : 'Καλά'}
              </div>
            </div>
            <div className="text-center rounded-xl p-4" style={{ background: 'rgba(47,53,50,0.08)' }}>
              <div className="text-2xl font-bold" style={{ color: '#2F3532' }}>{easyCount}</div>
              <div className="text-xs uppercase tracking-wide mt-1" style={{ color: 'rgba(47,53,50,0.5)' }}>
                ⚡ {language === 'ru' ? 'Легко' : 'Εύκολο'}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={handleShuffle}
              className="w-full py-3 rounded-2xl text-sm font-semibold border"
              style={{ borderColor: 'rgba(47,53,50,0.15)', color: '#2F3532', background: 'white' }}
            >
              <Shuffle className="h-4 w-4 inline mr-2" />
              {t('flashcards.shuffle')}
            </button>
            <button
              onClick={handleRestart}
              className="w-full py-3 rounded-2xl text-sm font-semibold border"
              style={{ borderColor: 'rgba(47,53,50,0.15)', color: '#2F3532', background: 'white' }}
            >
              <RotateCcw className="h-4 w-4 inline mr-2" />
              {t('quiz.tryAgain')}
            </button>
            <Link to="/learn" className="block">
              <button
                className="w-full py-3 rounded-2xl text-sm font-semibold text-white"
                style={{ background: '#2F3532' }}
              >
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

        .fc-scene { perspective: 1200px; }
        .fc-inner {
          position: relative; width: 100%; height: 100%;
          transition: transform 0.35s cubic-bezier(0.4,0.2,0.2,1);
          transform-style: preserve-3d;
          will-change: transform;
        }
        .fc-inner.flipped { transform: rotateY(180deg); }
        .fc-face {
          position: absolute; inset: 0;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        .fc-back { transform: rotateY(180deg); }

        .fc-btn-again { background: #C25B5B; color: white; }
        .fc-btn-again:hover { background: #b04f4f; }

        .fc-btn-good { background: #556B47; color: white; }
        .fc-btn-good:hover { background: #485c3c; }

        .fc-btn-easy { background: #2F3532; color: white; }
        .fc-btn-easy:hover { background: #222825; }

        .fc-rating {
          flex: 1;
          display: flex; align-items: center; justify-content: center; gap: 7px;
          padding: 14px 10px;
          border-radius: 100px;
          border: none;
          font-family: inherit;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          letter-spacing: -0.01em;
        }
        .fc-rating:active { transform: scale(0.97); }

        .fc-speaker-btn {
          width: 32px; height: 32px;
          border-radius: 50%;
          border: 1.5px solid rgba(47,53,50,0.10);
          background: rgba(47,53,50,0.04);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          color: rgba(47,53,50,0.40);
          transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.15s ease;
        }
        .fc-speaker-btn:hover {
          background: rgba(47,53,50,0.10);
          border-color: rgba(47,53,50,0.20);
          color: rgba(47,53,50,0.75);
          transform: scale(1.08);
        }
        .fc-speaker-btn:active { transform: scale(0.95); }

        .fc-rating .interval {
          font-size: 12px; font-weight: 500; opacity: 0.70;
        }

        .fc-progress-bar-track {
          height: 4px; border-radius: 4px;
          background: rgba(47,53,50,0.12);
          overflow: hidden; position: relative;
        }
        .fc-progress-bar-fill {
          height: 100%; border-radius: 4px; transition: width 0.4s ease;
        }
      `}</style>

      {/* ── TOP HEADER BAR ── */}
      <div className="px-4 pt-5 pb-4 flex items-center justify-between max-w-3xl mx-auto w-full">
        {/* Left: avatar + topic label */}
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ background: '#2F3532' }}
          >
            {emoji}
          </div>
          <span className="font-semibold text-base" style={{ color: '#2F3532' }}>
            {headerLabel}
          </span>
        </div>

        {/* Right: close button */}
        <Link
          to="/learn"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium no-underline transition-all"
          style={{
            background: 'rgba(255,255,255,0.7)',
            border: '1.5px solid rgba(47,53,50,0.12)',
            color: '#2F3532',
            backdropFilter: 'blur(8px)',
          }}
        >
          <X className="h-3.5 w-3.5" />
          {language === 'ru' ? 'Закрыть сессию' : 'Κλείσιμο'}
        </Link>
      </div>

      {/* ── PROGRESS ── */}
      <div className="px-4 pb-5 max-w-3xl mx-auto w-full">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'rgba(47,53,50,0.50)' }}>
            {language === 'ru'
              ? `Карточка ${currentIndex + 1} из ${questions.length}`
              : `Κάρτα ${currentIndex + 1} από ${questions.length}`}
          </span>
          <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'rgba(47,53,50,0.50)' }}>
            {Math.round(progress)}% {language === 'ru' ? 'выполнено' : 'ολοκληρώθηκε'}
          </span>
        </div>
        <div className="fc-progress-bar-track">
          <div
            className="fc-progress-bar-fill"
            style={{ width: `${progress}%`, background: accent }}
          />
        </div>
      </div>

      {/* ── CARD ── */}
      <div className="px-4 max-w-3xl mx-auto w-full flex-1 flex flex-col">
        <div className="fc-scene" style={{ height: 380 }}>
          <div
            className={cn('fc-inner', !isTransitioning && 'cursor-pointer', isFlipped && 'flipped')}
            onClick={isTransitioning ? undefined : handleFlip}
          >
            {/* FRONT */}
            <div
              className="fc-face bg-white rounded-2xl flex flex-col overflow-hidden relative"
              style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}
            >
              {/* Header row: spacer | badge | speaker */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '20px 20px 0' }}>
                <div style={{ width: 32, flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                  <span
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase"
                    style={{ background: hexToRgba(accent, 0.12), color: accent }}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: accent }} />
                    {badgeLabel}
                  </span>
                </div>
                {isSupported ? (
                  <button
                    className="fc-speaker-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      isSpeaking ? stop() : speak(currentQuestion.question, `${currentQuestion.id}_question_${language}`);
                    }}
                  >
                    {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </button>
                ) : (
                  <div style={{ width: 32, flexShrink: 0 }} />
                )}
              </div>

              {/* Question */}
              <div className="flex-1 flex items-center justify-center px-10 sm:px-16 py-6">
                <p className="text-xl sm:text-2xl font-semibold text-center leading-relaxed" style={{ color: '#2F3532' }}>
                  {currentQuestion.question}
                </p>
              </div>

              {/* Hint */}
              <div className="pb-6 text-center">
                <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'rgba(47,53,50,0.30)' }}>
                  {language === 'ru' ? 'Нажмите, чтобы перевернуть' : 'Πατήστε για αναστροφή'}
                </span>
              </div>
            </div>

            {/* BACK */}
            <div
              className="fc-face fc-back bg-white rounded-2xl flex flex-col overflow-hidden relative"
              style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}
            >
              {/* Header row: spacer | badge | speaker */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '20px 20px 0' }}>
                <div style={{ width: 32, flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                  <span
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase"
                    style={{ background: hexToRgba(accent, 0.12), color: accent }}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: accent }} />
                    {language === 'ru' ? 'Ответ' : 'Απάντηση'}
                  </span>
                </div>
                {isSupported ? (
                  <button
                    className="fc-speaker-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      isSpeaking ? stop() : speak(currentQuestion.correct_answer, `${currentQuestion.id}_answer_${language}`);
                    }}
                  >
                    {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </button>
                ) : (
                  <div style={{ width: 32, flexShrink: 0 }} />
                )}
              </div>

              {/* Answer text */}
              <div className="flex-1 flex flex-col items-center justify-center px-10 sm:px-16 py-4 gap-3">
                <p className="text-2xl sm:text-3xl font-bold text-center leading-relaxed" style={{ color: accent }}>
                  {currentQuestion.correct_answer}
                </p>
                {currentQuestion.explanation && (
                  <p className="text-sm text-center leading-relaxed" style={{ color: 'rgba(47,53,50,0.55)' }}>
                    {currentQuestion.explanation}
                  </p>
                )}
              </div>

              {/* Hint */}
              <div className="pb-6 text-center">
                <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'rgba(47,53,50,0.30)' }}>
                  {language === 'ru' ? 'Нажмите, чтобы вернуться к вопросу' : 'Πατήστε για επιστροφή'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── RATING BUTTONS ── */}
        <div className="flex gap-3 mt-5">
          <button
            className={cn('fc-rating fc-btn-again', !isFlipped && 'opacity-40 pointer-events-none')}
            onClick={() => handleGrade(1)}
          >
            <RefreshCw className="h-4 w-4 shrink-0" />
            {language === 'ru' ? 'Снова' : 'Πάλι'}
            <span className="interval">
              {getIntervalLabel(1, currentQuestion.srsCorrect, currentQuestion.srsIncorrect, language)}
            </span>
          </button>
          <button
            className={cn('fc-rating fc-btn-good', !isFlipped && 'opacity-40 pointer-events-none')}
            onClick={() => handleGrade(2)}
          >
            <ThumbsUp className="h-4 w-4 shrink-0" />
            {language === 'ru' ? 'Хорошо' : 'Καλά'}
            <span className="interval">
              {getIntervalLabel(2, currentQuestion.srsCorrect, currentQuestion.srsIncorrect, language)}
            </span>
          </button>
          <button
            className={cn('fc-rating fc-btn-easy', !isFlipped && 'opacity-40 pointer-events-none')}
            onClick={() => handleGrade(3)}
          >
            <Zap className="h-4 w-4 shrink-0" />
            {language === 'ru' ? 'Легко' : 'Εύκολο'}
            <span className="interval">
              {getIntervalLabel(3, currentQuestion.srsCorrect, currentQuestion.srsIncorrect, language)}
            </span>
          </button>
        </div>

        {/* ── KEYBOARD HINT ── */}
        <p
          className="text-center text-xs font-semibold tracking-widest uppercase mt-5 mb-6"
          style={{ color: 'rgba(47,53,50,0.30)' }}
        >
          {language === 'ru'
            ? 'Используйте [Space] для переворота • [1, 2, 3] для оценки'
            : 'Χρησιμοποιήστε [Space] για αναστροφή • [1, 2, 3] για αξιολόγηση'}
        </p>
      </div>
    </div>
  );
}
