import { useState, useEffect } from 'react';
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
  Check,
  RefreshCw,
  ThumbsUp,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSpeech } from '@/hooks/useSpeech';
import { useStudyTimer } from '@/hooks/useStudyTimer';
import { cn } from '@/lib/utils';
import { upsertProgress } from '@/lib/progressHelper';

type Question = {
  id: string;
  question: string;
  correct_answer: string;
  explanation: string | null;
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

export default function Flashcards() {
  const { topic } = useParams<{ topic: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCount, setKnownCount] = useState(0);
  const [unknownCount, setUnknownCount] = useState(0);
  const [unknownQuestions, setUnknownQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  const [restartCount, setRestartCount] = useState(0);
  const [ratedIndices, setRatedIndices] = useState<Set<number>>(new Set());
  const { speak, stop, isSpeaking, isSupported } = useSpeech();
  useStudyTimer('flashcards');

  const validTopic = topic as TopicType;
  const validTopics = ['history', 'culture', 'laws', 'geography'];
  const isValidTopic = topic && validTopics.includes(topic);

  useEffect(() => {
    if (!isValidTopic || !user) return;
    const fetchQuestions = async () => {
      setIsLoading(true);
      const [questionsResult, progressResult] = await Promise.all([
        supabase.from('questions').select('*').eq('topic', validTopic),
        supabase.from('user_progress').select('question_id, correct_count, incorrect_count, next_review_at').eq('user_id', user.id),
      ]);
      if (questionsResult.error) { setIsLoading(false); return; }
      const data = questionsResult.data || [];
      if (data.length === 0) { setQuestions([]); setIsLoading(false); return; }
      const localized = localizeQuestions(data, language);
      const progressMap = Object.fromEntries((progressResult.data || []).map(p => [p.question_id, p]));
      const now = Date.now();
      const scored = localized.map(q => {
        const p = progressMap[q.id];
        if (!p) return { q, group: 0, ts: 0 };
        const reviewTs = p.next_review_at ? new Date(p.next_review_at).getTime() : 0;
        if (reviewTs <= now) return { q, group: 1, ts: reviewTs };
        if (p.incorrect_count > p.correct_count) return { q, group: 2, ts: reviewTs };
        return { q, group: 3, ts: reviewTs };
      });
      scored.sort((a, b) => a.group !== b.group ? a.group - b.group : a.ts - b.ts);
      setQuestions(scored.map(s => s.q));
      setIsLoading(false);
    };
    fetchQuestions();
  }, [validTopic, user, isValidTopic, language, restartCount]);

  const goToNext = () => {
    if (currentIndex < questions.length - 1) { setCurrentIndex(p => p + 1); setIsFlipped(false); }
    else setIsFinished(true);
  };

  const handleAgain = () => {
    if (!ratedIndices.has(currentIndex)) {
      setRatedIndices(p => new Set([...p, currentIndex]));
      setUnknownCount(p => p + 1);
      setUnknownQuestions(p => [...p, questions[currentIndex]]);
      if (user) void upsertProgress(user.id, questions[currentIndex].id, false);
    }
    goToNext();
  };

  const handleGood = () => {
    if (!ratedIndices.has(currentIndex)) {
      setRatedIndices(p => new Set([...p, currentIndex]));
      setKnownCount(p => p + 1);
      if (user) void upsertProgress(user.id, questions[currentIndex].id, true);
    }
    goToNext();
  };

  const handleEasy = () => {
    if (!ratedIndices.has(currentIndex)) {
      setRatedIndices(p => new Set([...p, currentIndex]));
      setKnownCount(p => p + 1);
      if (user) void upsertProgress(user.id, questions[currentIndex].id, true);
    }
    goToNext();
  };

  const handleShuffle = () => {
    setQuestions(shuffleArray(questions)); setCurrentIndex(0); setIsFlipped(false);
    setKnownCount(0); setUnknownCount(0); setUnknownQuestions([]); setIsFinished(false); setRatedIndices(new Set());
  };

  const handleRestart = () => {
    setCurrentIndex(0); setIsFlipped(false); setKnownCount(0); setUnknownCount(0);
    setUnknownQuestions([]); setIsFinished(false); setRatedIndices(new Set()); setRestartCount(c => c + 1);
  };

  const handleRestartUnknown = () => {
    if (unknownQuestions.length === 0) return;
    setQuestions(unknownQuestions); setCurrentIndex(0); setIsFlipped(false);
    setKnownCount(0); setUnknownCount(0); setUnknownQuestions([]); setIsFinished(false); setRatedIndices(new Set());
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (isFinished || isLoading || questions.length === 0) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') { e.preventDefault(); setIsFlipped(f => !f); }
      if (e.code === 'Digit1') handleAgain();
      if (e.code === 'Digit2') handleGood();
      if (e.code === 'Digit3') handleEasy();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isFinished, isLoading, questions.length, isFlipped, currentIndex, ratedIndices]);

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
  const headerLabel = topicLabelRu[validTopic] ?? topicLabelRu.history;
  const badgeLabel = topicSubLabel[validTopic] ?? topicSubLabel.history;
  const progressPct = questions.length > 0 ? Math.round((currentIndex / questions.length) * 100) : 0;

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
    const pct = Math.round((knownCount / questions.length) * 100);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: '#E8E6E1', backgroundImage: 'radial-gradient(rgba(47,53,50,0.15) 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
        <div className="bg-white rounded-2xl p-10 text-center shadow-sm max-w-md w-full space-y-6">
          <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto text-3xl font-bold" style={{ background: hexToRgba(accent, 0.12), color: accent }}>
            {pct}%
          </div>
          <h2 className="text-2xl font-bold" style={{ color: '#2F3532' }}>{t('flashcards.finished')}</h2>
          <div className="flex justify-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold" style={{ color: '#4b7a5e' }}>{knownCount}</div>
              <div className="text-xs uppercase tracking-wide mt-1" style={{ color: 'rgba(47,53,50,0.5)' }}>{t('flashcards.known')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold" style={{ color: '#c0504d' }}>{unknownCount}</div>
              <div className="text-xs uppercase tracking-wide mt-1" style={{ color: 'rgba(47,53,50,0.5)' }}>{t('flashcards.unknown')}</div>
            </div>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            {unknownQuestions.length > 0 && (
              <button onClick={handleRestartUnknown} className="w-full py-3 rounded-2xl text-sm font-semibold text-white" style={{ background: '#c0504d' }}>
                <RotateCcw className="h-4 w-4 inline mr-2" />
                {language === 'ru' ? `Повторить незнакомые (${unknownQuestions.length})` : `Επανάληψη άγνωστων (${unknownQuestions.length})`}
              </button>
            )}
            <button onClick={handleShuffle} className="w-full py-3 rounded-2xl text-sm font-semibold border" style={{ borderColor: 'rgba(47,53,50,0.15)', color: '#2F3532', background: 'white' }}>
              <Shuffle className="h-4 w-4 inline mr-2" />
              {t('flashcards.shuffle')}
            </button>
            <button onClick={handleRestart} className="w-full py-3 rounded-2xl text-sm font-semibold border" style={{ borderColor: 'rgba(47,53,50,0.15)', color: '#2F3532', background: 'white' }}>
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

        .fc-scene { perspective: 1200px; }
        .fc-inner {
          position: relative; width: 100%; height: 100%;
          transition: transform 0.55s cubic-bezier(0.4,0.2,0.2,1);
          transform-style: preserve-3d;
        }
        .fc-inner.flipped { transform: rotateY(180deg); }
        .fc-face {
          position: absolute; inset: 0;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .fc-back { transform: rotateY(180deg); }

        .fc-btn-again {
          background: #C25B5B;
          color: white;
        }
        .fc-btn-again:hover { background: #b04f4f; }

        .fc-btn-good {
          background: #556B47;
          color: white;
        }
        .fc-btn-good:hover { background: #485c3c; }

        .fc-btn-easy {
          background: #2F3532;
          color: white;
        }
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
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1.5px solid rgba(47,53,50,0.10);
          background: rgba(47,53,50,0.04);
          display: flex;
          align-items: center;
          justify-content: center;
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
          font-size: 12px;
          font-weight: 500;
          opacity: 0.70;
        }

        .fc-progress-bar-track {
          height: 4px;
          border-radius: 4px;
          background: rgba(47,53,50,0.12);
          overflow: hidden;
          position: relative;
        }
        .fc-progress-bar-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.4s ease;
        }
      `}</style>

      {/* ── TOP HEADER BAR ── */}
      <div className="px-4 pt-5 pb-4 flex items-center justify-between max-w-3xl mx-auto w-full">
        {/* Left: avatar + topic */}
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
            {language === 'ru' ? `Карточка ${currentIndex + 1} из ${questions.length}` : `Κάρτα ${currentIndex + 1} από ${questions.length}`}
          </span>
          <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'rgba(47,53,50,0.50)' }}>
            {progressPct}% {language === 'ru' ? 'выполнено' : 'ολοκληρώθηκε'}
          </span>
        </div>
        <div className="fc-progress-bar-track">
          <div
            className="fc-progress-bar-fill"
            style={{ width: `${progressPct}%`, background: accent }}
          />
        </div>
      </div>

      {/* ── CARD ── */}
      <div className="px-4 max-w-3xl mx-auto w-full flex-1 flex flex-col">
        <div className="fc-scene" style={{ height: 380 }}>
          <div
            className={cn('fc-inner cursor-pointer', isFlipped && 'flipped')}
            onClick={() => setIsFlipped(f => !f)}
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
            onClick={handleAgain}
          >
            <RefreshCw className="h-4 w-4 shrink-0" />
            {language === 'ru' ? 'Снова' : 'Πάλι'}
            <span className="interval">&lt;1м</span>
          </button>
          <button
            className={cn('fc-rating fc-btn-good', !isFlipped && 'opacity-40 pointer-events-none')}
            onClick={handleGood}
          >
            <ThumbsUp className="h-4 w-4 shrink-0" />
            {language === 'ru' ? 'Хорошо' : 'Καλά'}
            <span className="interval">1д</span>
          </button>
          <button
            className={cn('fc-rating fc-btn-easy', !isFlipped && 'opacity-40 pointer-events-none')}
            onClick={handleEasy}
          >
            <Zap className="h-4 w-4 shrink-0" />
            {language === 'ru' ? 'Легко' : 'Εύκολο'}
            <span className="interval">4д</span>
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
