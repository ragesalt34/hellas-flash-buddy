import { useState, useEffect } from 'react';
import { localizeQuestions } from '@/lib/questionLocale';
import { useParams, Navigate, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
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
  Check
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

const topicLabel: Record<TopicType, { ru: string; el: string }> = {
  history:   { ru: 'Древняя Эллада', el: 'Αρχαία Ελλάδα' },
  culture:   { ru: 'Культура', el: 'Πολιτισμός' },
  laws:      { ru: 'Законы', el: 'Νόμοι' },
  geography: { ru: 'География', el: 'Γεωγραφία' },
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
        supabase
          .from('user_progress')
          .select('question_id, correct_count, incorrect_count, next_review_at')
          .eq('user_id', user.id),
      ]);

      if (questionsResult.error) {
        console.error('Error fetching questions:', questionsResult.error);
        setIsLoading(false);
        return;
      }

      const data = questionsResult.data || [];
      if (data.length === 0) {
        setQuestions([]);
        setIsLoading(false);
        return;
      }

      const localized = localizeQuestions(data, language);
      const progressMap = Object.fromEntries(
        (progressResult.data || []).map(p => [p.question_id, p])
      );

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
      setQuestions(scored.map(s => s.q));
      setIsLoading(false);
    };

    fetchQuestions();
  }, [validTopic, user, isValidTopic, language, restartCount]);

  const handleFlip = () => setIsFlipped(!isFlipped);

  const goToNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
    } else {
      setIsFinished(true);
    }
  };

  const handleAgain = () => {
    if (!ratedIndices.has(currentIndex)) {
      setRatedIndices(prev => new Set([...prev, currentIndex]));
      setUnknownCount(prev => prev + 1);
      setUnknownQuestions(prev => [...prev, questions[currentIndex]]);
      if (user) void upsertProgress(user.id, questions[currentIndex].id, false);
    }
    goToNext();
  };

  const handleGood = () => {
    if (!ratedIndices.has(currentIndex)) {
      setRatedIndices(prev => new Set([...prev, currentIndex]));
      setKnownCount(prev => prev + 1);
      if (user) void upsertProgress(user.id, questions[currentIndex].id, true);
    }
    goToNext();
  };

  const handleEasy = () => {
    if (!ratedIndices.has(currentIndex)) {
      setRatedIndices(prev => new Set([...prev, currentIndex]));
      setKnownCount(prev => prev + 1);
      if (user) void upsertProgress(user.id, questions[currentIndex].id, true);
    }
    goToNext();
  };

  const handleShuffle = () => {
    setQuestions(shuffleArray(questions));
    setCurrentIndex(0);
    setIsFlipped(false);
    setKnownCount(0);
    setUnknownCount(0);
    setUnknownQuestions([]);
    setIsFinished(false);
    setRatedIndices(new Set());
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setKnownCount(0);
    setUnknownCount(0);
    setUnknownQuestions([]);
    setIsFinished(false);
    setRatedIndices(new Set());
    setRestartCount(c => c + 1);
  };

  const handleRestartUnknown = () => {
    if (unknownQuestions.length === 0) return;
    setQuestions(unknownQuestions);
    setCurrentIndex(0);
    setIsFlipped(false);
    setKnownCount(0);
    setUnknownCount(0);
    setUnknownQuestions([]);
    setIsFinished(false);
    setRatedIndices(new Set());
  };

  // Keyboard shortcuts
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
          if (isFlipped) handleAgain();
          break;
        case 'Digit2':
          if (isFlipped) handleGood();
          break;
        case 'Digit3':
          if (isFlipped) handleEasy();
          break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isFinished, isLoading, questions.length, isFlipped, currentIndex, ratedIndices]);

  if (authLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!isValidTopic) return <Navigate to="/learn" replace />;

  const progressPct = questions.length > 0 ? Math.round(((currentIndex) / questions.length) * 100) : 0;
  const topicTitle = t(`topic.${validTopic}`);
  const accent = topicAccent[validTopic] || '#5B8DB8';
  const emoji = topicEmoji[validTopic] || '📚';
  const tLabel = topicLabel[validTopic]?.[language as 'ru' | 'el'] ?? topicTitle;

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (questions.length === 0) {
    return (
      <Layout>
        <div className="container py-12">
          <div className="glass-panel max-w-2xl mx-auto text-center p-12 rounded-2xl">
            <h2 className="text-2xl font-display font-bold mb-4">{t('quiz.noQuestions')}</h2>
            <p className="text-muted-foreground mb-6">{t('quiz.noQuestions.desc')}</p>
            <Link to="/learn">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('quiz.backToTopics')}
              </Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  if (isFinished) {
    const percentage = questions.length > 0 ? Math.round((knownCount / questions.length) * 100) : 0;
    return (
      <Layout>
        <div className="container py-12">
          <div className="glass-panel max-w-2xl mx-auto rounded-2xl p-10 text-center space-y-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: accent }} />
            <h2 className="font-display text-3xl font-bold">{t('flashcards.finished')}</h2>
            <div
              className="w-32 h-32 rounded-full flex items-center justify-center mx-auto text-4xl font-bold"
              style={{
                background: hexToRgba(accent, 0.12),
                color: accent,
                boxShadow: `0 8px 32px ${hexToRgba(accent, 0.2)}`
              }}
            >
              {percentage}%
            </div>
            <div className="flex justify-center gap-8">
              <div className="text-center rounded-xl p-4" style={{ background: 'rgba(34,197,94,0.08)' }}>
                <div className="text-3xl font-bold" style={{ color: '#22c55e' }}>{knownCount}</div>
                <div className="text-sm text-muted-foreground">{t('flashcards.known')}</div>
              </div>
              <div className="text-center rounded-xl p-4" style={{ background: 'rgba(239,68,68,0.08)' }}>
                <div className="text-3xl font-bold" style={{ color: '#ef4444' }}>{unknownCount}</div>
                <div className="text-sm text-muted-foreground">{t('flashcards.unknown')}</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 justify-center pt-4">
              {unknownQuestions.length > 0 && (
                <Button variant="outline" onClick={handleRestartUnknown} style={{ borderColor: 'rgba(239,68,68,0.3)', color: '#ef4444' }}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {language === 'ru' ? `Повторить незнакомые (${unknownQuestions.length})` : `Επανάληψη άγνωστων (${unknownQuestions.length})`}
                </Button>
              )}
              <Button variant="outline" onClick={handleShuffle}>
                <Shuffle className="h-4 w-4 mr-2" />
                {t('flashcards.shuffle')}
              </Button>
              <Button variant="outline" onClick={handleRestart}>
                <RotateCcw className="h-4 w-4 mr-2" />
                {t('quiz.tryAgain')}
              </Button>
              <Link to="/learn">
                <Button>
                  <Home className="h-4 w-4 mr-2" />
                  {t('quiz.toTopics')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <Layout>
      <style>{`
        .fc-card-scene {
          perspective: 1200px;
        }
        .fc-card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform 0.55s cubic-bezier(0.4,0.2,0.2,1);
          transform-style: preserve-3d;
        }
        .fc-card-inner.flipped {
          transform: rotateY(180deg);
        }
        .fc-face {
          position: absolute;
          inset: 0;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .fc-face-back {
          transform: rotateY(180deg);
        }
        .fc-rating-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 11px 0;
          border-radius: 14px;
          border: 1.5px solid rgba(47,53,50,0.13);
          background: rgba(255,255,255,0.60);
          backdrop-filter: blur(10px);
          font-family: inherit;
          font-size: 13px;
          font-weight: 600;
          color: #2F3532;
          cursor: pointer;
          transition: all 0.18s ease;
        }
        .fc-rating-btn:hover {
          background: rgba(255,255,255,0.90);
          box-shadow: 0 4px 16px rgba(0,0,0,0.10);
          transform: translateY(-1px);
        }
        .fc-rating-btn .fc-rating-interval {
          font-size: 11px;
          font-weight: 500;
          opacity: 0.55;
        }
      `}</style>

      <div className="min-h-screen flex flex-col" style={{ paddingBottom: 32 }}>
        {/* ── Header ── */}
        <div className="container pt-5 pb-0 px-4">
          <div className="flex items-center justify-between mb-5">
            {/* Left: topic pill */}
            <Link to="/learn" className="inline-flex items-center gap-2 no-underline">
              <span
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
                style={{
                  background: hexToRgba(accent, 0.13),
                  color: accent,
                  border: `1.5px solid ${hexToRgba(accent, 0.22)}`,
                }}
              >
                <span className="text-base">{emoji}</span>
                {tLabel}
              </span>
            </Link>

            {/* Right: close */}
            <Link
              to="/learn"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
              {language === 'ru' ? 'Закрыть сессию' : 'Κλείσιμο'}
            </Link>
          </div>

          {/* Progress info */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground/70">
              {language === 'ru'
                ? `Карточка ${currentIndex + 1} из ${questions.length}`
                : `Κάρτα ${currentIndex + 1} από ${questions.length}`}
            </span>
            <span className="text-xs text-muted-foreground/70">
              {progressPct}% {language === 'ru' ? 'выполнено' : 'ολοκληρώθηκε'}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-[3px] rounded-full bg-black/8 overflow-hidden mb-6">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%`, background: accent }}
            />
          </div>
        </div>

        {/* ── Card ── */}
        <div className="container px-4 flex-1 flex flex-col">
          <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col">
            {/* Card scene */}
            <div className="fc-card-scene" style={{ height: 360, flex: '0 0 360px' }}>
              <div
                className={cn("fc-card-inner cursor-pointer", isFlipped && "flipped")}
                onClick={handleFlip}
              >
                {/* ── Front ── */}
                <div
                  className="fc-face rounded-2xl overflow-hidden flex flex-col"
                  style={{
                    background: 'rgba(255,255,255,0.72)',
                    backdropFilter: 'blur(24px)',
                    boxShadow: '0 8px 40px rgba(0,0,0,0.10), 0 1px 0 rgba(255,255,255,0.8) inset',
                    border: '1px solid rgba(255,255,255,0.7)',
                  }}
                >
                  {/* Accent stripe */}
                  <div className="h-1 w-full shrink-0" style={{ background: accent }} />

                  <div className="flex items-center justify-between px-5 pt-4 pb-0">
                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full tracking-wide uppercase"
                      style={{
                        background: hexToRgba(accent, 0.13),
                        color: accent,
                      }}
                    >
                      {tLabel}
                    </span>

                    {isSupported && (
                      <button
                        className="h-8 w-8 rounded-full flex items-center justify-center transition-colors hover:bg-black/5"
                        style={{ color: 'rgba(47,53,50,0.4)', border: 'none', background: 'none', cursor: 'pointer' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          isSpeaking ? stop() : speak(currentQuestion.question, `${currentQuestion.id}_question_${language}`);
                        }}
                      >
                        {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                      </button>
                    )}
                  </div>

                  <div className="flex-1 flex items-center justify-center px-8 sm:px-12">
                    <p className="text-xl sm:text-3xl font-semibold leading-relaxed text-center" style={{ color: '#2F3532' }}>
                      {currentQuestion.question}
                    </p>
                  </div>

                  <div className="pb-5 text-center">
                    <span className="text-xs" style={{ color: 'rgba(47,53,50,0.35)' }}>
                      {language === 'ru' ? 'Нажмите, чтобы перевернуть' : 'Πατήστε για αναστροφή'}
                    </span>
                  </div>
                </div>

                {/* ── Back ── */}
                <div
                  className="fc-face fc-face-back rounded-2xl overflow-hidden flex flex-col"
                  style={{
                    background: `radial-gradient(circle at 30% 20%, ${hexToRgba(accent, 0.10)}, transparent 70%), rgba(255,255,255,0.72)`,
                    backdropFilter: 'blur(24px)',
                    boxShadow: '0 8px 40px rgba(0,0,0,0.10), 0 1px 0 rgba(255,255,255,0.8) inset',
                    border: '1px solid rgba(255,255,255,0.7)',
                  }}
                >
                  {/* Accent stripe */}
                  <div className="h-1 w-full shrink-0" style={{ background: accent }} />

                  <div className="flex items-center justify-between px-5 pt-4 pb-0">
                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full tracking-wide uppercase"
                      style={{
                        background: hexToRgba(accent, 0.13),
                        color: accent,
                      }}
                    >
                      {language === 'ru' ? '✓ Ответ' : '✓ Απάντηση'}
                    </span>

                    {isSupported && (
                      <button
                        className="h-8 w-8 rounded-full flex items-center justify-center transition-colors hover:bg-black/5"
                        style={{ color: 'rgba(47,53,50,0.4)', border: 'none', background: 'none', cursor: 'pointer' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          isSpeaking ? stop() : speak(currentQuestion.correct_answer, `${currentQuestion.id}_answer_${language}`);
                        }}
                      >
                        {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                      </button>
                    )}
                  </div>

                  <div className="flex-1 flex items-center justify-center px-8 sm:px-12">
                    <p className="text-2xl sm:text-4xl font-bold leading-relaxed text-center" style={{ color: '#2F3532' }}>
                      {currentQuestion.correct_answer}
                    </p>
                  </div>

                  {currentQuestion.explanation && (
                    <div
                      className="px-6 pb-5 pt-3 border-t"
                      style={{ borderColor: hexToRgba(accent, 0.15) }}
                    >
                      <p className="text-sm italic leading-relaxed text-center" style={{ color: 'rgba(47,53,50,0.50)' }}>
                        {currentQuestion.explanation}
                      </p>
                    </div>
                  )}

                  {!currentQuestion.explanation && (
                    <div className="pb-5 text-center">
                      <span className="text-xs" style={{ color: 'rgba(47,53,50,0.35)' }}>
                        {language === 'ru' ? 'Нажмите, чтобы вернуться к вопросу' : 'Πατήστε για επιστροφή'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Rating buttons ── */}
            <div className={cn("mt-5 flex gap-3", !isFlipped && "invisible pointer-events-none")}>
              <button className="fc-rating-btn" onClick={handleAgain} style={{ color: '#e05252' }}>
                <X className="h-4 w-4" />
                {language === 'ru' ? 'Снова' : 'Πάλι'}
                <span className="fc-rating-interval">&lt;1м</span>
              </button>
              <button className="fc-rating-btn" onClick={handleGood} style={{ color: '#2F7D50' }}>
                <Check className="h-4 w-4" />
                {language === 'ru' ? 'Хорошо' : 'Καλά'}
                <span className="fc-rating-interval">1д</span>
              </button>
              <button className="fc-rating-btn" onClick={handleEasy} style={{ color: accent }}>
                <Check className="h-4 w-4" strokeWidth={2.5} />
                {language === 'ru' ? 'Легко' : 'Εύκολο'}
                <span className="fc-rating-interval">4д</span>
              </button>
            </div>

            {/* ── Keyboard hint ── */}
            <p className="text-center text-xs mt-4" style={{ color: 'rgba(47,53,50,0.38)' }}>
              {language === 'ru'
                ? 'Используйте [Space] для переворота • [1, 2, 3] для оценки'
                : 'Χρησιμοποιήστε [Space] για αναστροφή • [1, 2, 3] για αξιολόγηση'}
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
