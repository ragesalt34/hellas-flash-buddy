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
  ArrowRight,
  RotateCcw,
  Home,
  ThumbsUp,
  ThumbsDown,
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

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Hex to RGBA helper
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
        if (!p) return { q, group: 2, ts: 0 };
        const reviewTs = p.next_review_at ? new Date(p.next_review_at).getTime() : 0;
        const isDue = reviewTs <= now;
        if (isDue) return { q, group: 0, ts: reviewTs };
        if (p.incorrect_count > p.correct_count) return { q, group: 1, ts: reviewTs };
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

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setIsFlipped(false);
    }
  };

  const handleKnow = () => {
    if (!ratedIndices.has(currentIndex)) {
      setRatedIndices(prev => new Set([...prev, currentIndex]));
      setKnownCount(prev => prev + 1);
      if (user) upsertProgress(user.id, questions[currentIndex].id, true);
    }
    goToNext();
  };

  const handleDontKnow = () => {
    if (!ratedIndices.has(currentIndex)) {
      setRatedIndices(prev => new Set([...prev, currentIndex]));
      setUnknownCount(prev => prev + 1);
      setUnknownQuestions(prev => [...prev, questions[currentIndex]]);
      if (user) upsertProgress(user.id, questions[currentIndex].id, false);
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

  // Keyboard shortcuts — must be before conditional returns
  useEffect(() => {
    if (isFinished || isLoading || questions.length === 0) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          handleFlip();
          break;
        case 'ArrowRight':
          if (isFlipped) handleKnow();
          break;
        case 'ArrowLeft':
          if (isFlipped) handleDontKnow();
          break;
        case 'ArrowUp':
          goToPrev();
          break;
        case 'ArrowDown':
          goToNext();
          break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isFinished, isLoading, questions.length, isFlipped, currentIndex]);

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

  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;
  const topicTitle = t(`topic.${validTopic}`);
  const accent = topicAccent[validTopic] || '#5B8DB8';
  const emoji = topicEmoji[validTopic] || '📚';

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
          <div className="glass-panel max-w-2xl mx-auto rounded-2xl p-10 text-center space-y-6">
            {/* Accent top bar */}
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
                <div className="text-3xl font-bold text-success">{knownCount}</div>
                <div className="text-sm text-muted-foreground">{t('flashcards.known')}</div>
              </div>
              <div className="text-center rounded-xl p-4" style={{ background: 'rgba(239,68,68,0.08)' }}>
                <div className="text-3xl font-bold text-destructive">{unknownCount}</div>
                <div className="text-sm text-muted-foreground">{t('flashcards.unknown')}</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 justify-center pt-4">
              {unknownQuestions.length > 0 && (
                <Button variant="outline" onClick={handleRestartUnknown} className="border-destructive/30 text-destructive hover:bg-destructive/10">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {language === 'ru'
                    ? `Повторить незнакомые (${unknownQuestions.length})`
                    : `Επανάληψη άγνωστων (${unknownQuestions.length})`}
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
      <div className="relative container py-4 sm:py-8 px-4">

        {/* Header */}
        <div className="relative mb-6 sm:mb-8">
          <Link to="/learn" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4 text-sm transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('quiz.backToTopics')}
          </Link>
          <div className="flex items-center justify-between gap-2">
            <h1 className="font-display text-lg sm:text-2xl font-bold line-clamp-2">
              {emoji} {topicTitle} — {t('mode.flashcards')}
            </h1>
            <Button variant="ghost" size="sm" onClick={handleShuffle} className="shrink-0">
              <Shuffle className="h-4 w-4" />
            </Button>
          </div>

          {/* Custom progress bar */}
          <div className="flex items-center gap-3 mt-4">
            <div className="flex-1 h-[3px] rounded-full bg-black/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, background: hexToRgba(accent, 0.75) }}
              />
            </div>
            <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
              {currentIndex + 1} / {questions.length}
            </span>
          </div>
        </div>

        {/* Flashcard */}
        <div className="relative max-w-2xl mx-auto h-72 sm:h-96 px-2 flashcard-container">
          <div
            className={cn("flashcard-inner cursor-pointer", isFlipped && "flipped")}
            onClick={handleFlip}
          >
            {/* Front */}
            <div className="flashcard-face flashcard-glass flex flex-col overflow-hidden rounded-2xl">
              {/* Accent stripe */}
              <div className="h-1 w-full shrink-0" style={{ background: accent }} />

              <div className="flex items-start justify-between px-5 pt-4 pb-0">
                {/* Topic pill */}
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full"
                  style={{
                    background: hexToRgba(accent, 0.13),
                    color: accent,
                  }}
                >
                  {emoji} {topicTitle}
                </span>

                {isSupported && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground/50 hover:text-foreground transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      isSpeaking ? stop() : speak(currentQuestion.question, `${currentQuestion.id}_question_${language}`);
                    }}
                  >
                    {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </Button>
                )}
              </div>

              <div className="flex-1 flex items-center justify-center px-8 sm:px-12">
                <p className="text-2xl sm:text-4xl font-semibold leading-relaxed text-center">
                  {currentQuestion.question}
                </p>
              </div>

              <div className="pb-4 text-center">
                <span className="text-xs text-muted-foreground/50">
                  {language === 'ru' ? 'Нажмите, чтобы перевернуть' : 'Πατήστε για αναστροφή'} · Space
                </span>
              </div>
            </div>

            {/* Back */}
            <div
              className="flashcard-face flashcard-back flashcard-glass flex flex-col overflow-hidden rounded-2xl"
              style={{
                background: `radial-gradient(circle at 30% 20%, ${hexToRgba(accent, 0.10)}, transparent 70%), rgba(255,255,255,0.72)`,
              }}
            >
              {/* Accent stripe */}
              <div className="h-1 w-full shrink-0" style={{ background: accent }} />

              <div className="flex items-start justify-between px-5 pt-4 pb-0">
                {/* Answer badge */}
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full"
                  style={{
                    background: hexToRgba(accent, 0.13),
                    color: accent,
                  }}
                >
                  {language === 'ru' ? '✓ Ответ' : '✓ Απάντηση'}
                </span>

                {isSupported && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground/50 hover:text-foreground transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      isSpeaking ? stop() : speak(currentQuestion.correct_answer, `${currentQuestion.id}_answer_${language}`);
                    }}
                  >
                    {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </Button>
                )}
              </div>

              <div className="flex-1 flex items-center justify-center px-8 sm:px-12 pb-4">
                <p className="text-2xl sm:text-4xl font-semibold leading-relaxed text-center text-foreground">
                  {currentQuestion.correct_answer}
                </p>
              </div>

              {currentQuestion.explanation && (
                <div className="px-6 pb-5 border-t pt-3" style={{ borderColor: hexToRgba(accent, 0.15) }}>
                  <p className="text-sm text-foreground/50 italic leading-relaxed text-center">
                    {currentQuestion.explanation}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="relative max-w-2xl mx-auto mt-8 px-4">
          {/* Know/Don't Know — circular glass buttons */}
          <div className={cn("flex gap-6 justify-center mb-6", !isFlipped && "invisible")}>
            {/* Don't Know */}
            <button
              onClick={handleDontKnow}
              className="group flex flex-col items-center gap-1.5"
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200"
                style={{
                  background: 'rgba(255,255,255,0.5)',
                  border: '1.5px solid rgba(255,255,255,0.7)',
                  backdropFilter: 'blur(8px)',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.5)')}
              >
                <X className="h-5 w-5 text-destructive" />
              </div>
              <span className="text-xs text-muted-foreground hidden sm:block">
                {t('flashcards.dontKnow')} <span className="opacity-40">←</span>
              </span>
            </button>

            {/* Skip/Flip back */}
            <button
              onClick={handleFlip}
              className="group flex flex-col items-center gap-1.5"
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200"
                style={{
                  background: 'rgba(255,255,255,0.5)',
                  border: '1.5px solid rgba(255,255,255,0.7)',
                  backdropFilter: 'blur(8px)',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.05)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.5)')}
              >
                <RotateCcw className="h-5 w-5 text-muted-foreground" />
              </div>
              <span className="text-xs text-muted-foreground hidden sm:block opacity-60">
                {language === 'ru' ? 'Назад' : 'Πίσω'} · Space
              </span>
            </button>

            {/* Know */}
            <button
              onClick={handleKnow}
              className="group flex flex-col items-center gap-1.5"
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200"
                style={{
                  background: 'rgba(255,255,255,0.5)',
                  border: '1.5px solid rgba(255,255,255,0.7)',
                  backdropFilter: 'blur(8px)',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(34,197,94,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.5)')}
              >
                <Check className="h-5 w-5 text-success" />
              </div>
              <span className="text-xs text-muted-foreground hidden sm:block">
                {t('flashcards.know')} <span className="opacity-40">→</span>
              </span>
            </button>
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPrev}
              disabled={currentIndex === 0}
              className="flex-1 sm:flex-none"
            >
              <ArrowLeft className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{t('flashcards.prev')}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={goToNext}
              disabled={currentIndex === questions.length - 1}
              className="flex-1 sm:flex-none"
            >
              <span className="hidden sm:inline">{t('flashcards.next')}</span>
              <ArrowRight className="h-4 w-4 sm:ml-2" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="relative flex justify-center gap-6 mt-6 text-sm">
          <div className="flex items-center gap-2 rounded-full px-4 py-2" style={{ background: 'rgba(34,197,94,0.08)' }}>
            <ThumbsUp className="h-4 w-4 text-success" />
            <span className="text-success font-medium">{knownCount}</span>
          </div>
          <div className="flex items-center gap-2 rounded-full px-4 py-2" style={{ background: 'rgba(239,68,68,0.08)' }}>
            <ThumbsDown className="h-4 w-4 text-destructive" />
            <span className="text-destructive font-medium">{unknownCount}</span>
          </div>
        </div>

      </div>
    </Layout>
  );
}
