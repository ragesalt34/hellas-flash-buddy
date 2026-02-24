import { useState, useEffect } from 'react';
import { localizeQuestions } from '@/lib/questionLocale';
import { useParams, Navigate, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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
  VolumeX
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

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
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
  const { speak, stop, isSpeaking, isSupported } = useSpeech();
  useStudyTimer('flashcards');

  const validTopic = topic as TopicType;
  const validTopics = ['history', 'culture', 'laws', 'geography'];
  const isValidTopic = topic && validTopics.includes(topic);

  useEffect(() => {
    if (!isValidTopic || !user) return;

    const fetchQuestions = async () => {
      setIsLoading(true);

      // Fetch questions and user progress in parallel
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

      // Same priority groups as Quiz — show all cards but due/hard ones first
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

  if (authLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isValidTopic) {
    return <Navigate to="/learn" replace />;
  }

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleKnow = () => {
    setKnownCount(prev => prev + 1);
    if (user) {
      upsertProgress(user.id, questions[currentIndex].id, true, true);
    }
    goToNext();
  };

  const handleDontKnow = () => {
    setUnknownCount(prev => prev + 1);
    setUnknownQuestions(prev => [...prev, questions[currentIndex]]);
    if (user) {
      upsertProgress(user.id, questions[currentIndex].id, false, false);
    }
    goToNext();
  };

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

  const handleShuffle = () => {
    setQuestions(shuffleArray(questions));
    setCurrentIndex(0);
    setIsFlipped(false);
    setKnownCount(0);
    setUnknownCount(0);
    setUnknownQuestions([]);
    setIsFinished(false);
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setKnownCount(0);
    setUnknownCount(0);
    setUnknownQuestions([]);
    setIsFinished(false);
    setRestartCount(c => c + 1); // re-fetch with fresh priority order
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

  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;
  const topicTitle = t(`topic.${validTopic}`);

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
          <Card className="max-w-2xl mx-auto text-center liquid-glass-card">
            <CardContent className="py-12">
              <h2 className="text-2xl font-display font-bold mb-4">
                {t('quiz.noQuestions')}
              </h2>
              <p className="text-muted-foreground mb-6">
                {t('quiz.noQuestions.desc')}
              </p>
              <Link to="/learn">
                <Button className="liquid-glass-button">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t('quiz.backToTopics')}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (isFinished) {
    const percentage = questions.length > 0 ? Math.round((knownCount / questions.length) * 100) : 0;
    
    return (
      <Layout>
        <div className="relative container py-12">

          <Card className="relative max-w-2xl mx-auto liquid-glass-card glow-border">
            <CardContent className="py-12 text-center space-y-6">
              <h2 className="font-display text-3xl font-bold">
                {t('flashcards.finished')}
              </h2>
              
              <div className={cn(
                "w-32 h-32 rounded-full flex items-center justify-center mx-auto text-4xl font-bold shadow-2xl",
                percentage >= 70 ? "bg-success/20 text-success shadow-success/20" : 
                percentage >= 50 ? "bg-accent/20 text-accent shadow-accent/20" : 
                "bg-destructive/20 text-destructive shadow-destructive/20"
              )}>
                {percentage}%
              </div>
              
              <div className="flex justify-center gap-8">
                <div className="text-center liquid-glass-button rounded-xl p-4">
                  <div className="text-3xl font-bold text-success">{knownCount}</div>
                  <div className="text-sm text-muted-foreground">{t('flashcards.known')}</div>
                </div>
                <div className="text-center liquid-glass-button rounded-xl p-4">
                  <div className="text-3xl font-bold text-destructive">{unknownCount}</div>
                  <div className="text-sm text-muted-foreground">{t('flashcards.unknown')}</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 justify-center pt-4">
                {unknownQuestions.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={handleRestartUnknown}
                    className="liquid-glass-button border-destructive/30 text-destructive hover:bg-destructive/10"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    {language === 'ru'
                      ? `Повторить незнакомые (${unknownQuestions.length})`
                      : `Επανάληψη άγνωστων (${unknownQuestions.length})`}
                  </Button>
                )}
                <Button variant="outline" onClick={handleShuffle} className="liquid-glass-button">
                  <Shuffle className="h-4 w-4 mr-2" />
                  {t('flashcards.shuffle')}
                </Button>
                <Button variant="outline" onClick={handleRestart} className="liquid-glass-button">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {t('quiz.tryAgain')}
                </Button>
                <Link to="/learn">
                  <Button className="gradient-greek text-primary-foreground shadow-lg shadow-primary/30">
                    <Home className="h-4 w-4 mr-2" />
                    {t('quiz.toTopics')}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
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
            <h1 className="font-display text-lg sm:text-2xl font-bold line-clamp-2">{topicTitle} — {t('mode.flashcards')}</h1>
            <Button variant="ghost" size="sm" onClick={handleShuffle} className="shrink-0 liquid-glass-button">
              <Shuffle className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <Progress value={progress} className="flex-1" />
            <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
              {currentIndex + 1} / {questions.length}
            </span>
          </div>
        </div>

        {/* Flashcard */}
        <div className="relative max-w-2xl mx-auto h-64 sm:h-80 px-2 flashcard-container">
          <div 
            className={cn("flashcard-inner cursor-pointer", isFlipped && "flipped")}
            onClick={handleFlip}
          >
            {/* Front */}
            <Card className="flashcard-face flashcard-glass animated-border overflow-hidden">
              <CardContent className="p-0 h-full flex flex-col items-center justify-center text-center gap-3 px-8 py-6">
                <p className="text-xs text-muted-foreground uppercase tracking-widest">
                  {t('flashcards.question')}
                </p>
                <p className="font-display text-xl sm:text-2xl font-semibold leading-snug flex-1 flex items-center">
                  {currentQuestion.question}
                </p>
                <div className="flex items-center justify-center gap-2 shrink-0">
                  <p className="text-xs text-muted-foreground">
                    {t('flashcards.clickToFlip')}
                  </p>
                  {isSupported && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 liquid-glass-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        isSpeaking ? stop() : speak(currentQuestion.question, `${currentQuestion.id}_question_${language}`);
                      }}
                    >
                      {isSpeaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Back */}
            <Card className="flashcard-face flashcard-back flashcard-glass animated-border overflow-hidden">
              <CardContent className="p-0 h-full flex flex-col items-center justify-center text-center gap-3 px-8 py-6">
                <p className="text-xs text-muted-foreground uppercase tracking-widest">
                  {t('flashcards.answer')}
                </p>
                <p className="font-display text-xl sm:text-2xl font-semibold leading-snug flex-1 flex items-center text-foreground">
                  {currentQuestion.correct_answer}
                </p>
                <div className="flex flex-col items-center gap-2 shrink-0">
                  {currentQuestion.explanation && (
                    <p className="text-sm text-foreground/60 leading-snug max-w-xs">
                      {currentQuestion.explanation}
                    </p>
                  )}
                  {isSupported && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 liquid-glass-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        isSpeaking ? stop() : speak(currentQuestion.correct_answer, `${currentQuestion.id}_answer_${language}`);
                      }}
                    >
                      {isSpeaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Controls */}
        <div className="relative max-w-2xl mx-auto mt-8 px-4">
          {/* Know/Don't Know buttons — visible only after flip */}
          {isFlipped ? (
            <div className="flex gap-3 justify-center mb-4">
              <Button
                variant="outline"
                className="flex-1 sm:flex-none liquid-glass-button border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive/50"
                onClick={handleDontKnow}
              >
                <ThumbsDown className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('flashcards.dontKnow')}</span>
                <span className="hidden sm:inline text-xs opacity-50 ml-1">←</span>
              </Button>
              <Button
                variant="outline"
                className="flex-1 sm:flex-none liquid-glass-button border-success/30 text-success hover:bg-success/10 hover:border-success/50"
                onClick={handleKnow}
              >
                <ThumbsUp className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('flashcards.know')}</span>
                <span className="hidden sm:inline text-xs opacity-50 ml-1">→</span>
              </Button>
            </div>
          ) : (
            <div className="flex justify-center mb-4">
              <p className="text-sm text-muted-foreground">
                {language === 'ru'
                  ? 'Переверните карточку, чтобы оценить ответ'
                  : 'Αναποδογυρίστε την κάρτα για να αξιολογήσετε'}{' '}
                <span className="opacity-50">(Space)</span>
              </p>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={goToPrev}
              disabled={currentIndex === 0}
              className="flex-1 sm:flex-none liquid-glass-button"
            >
              <ArrowLeft className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{t('flashcards.prev')}</span>
            </Button>

            <Button 
              variant="outline" 
              size="sm"
              onClick={goToNext}
              disabled={currentIndex === questions.length - 1}
              className="flex-1 sm:flex-none liquid-glass-button"
            >
              <span className="hidden sm:inline">{t('flashcards.next')}</span>
              <ArrowRight className="h-4 w-4 sm:ml-2" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="relative flex justify-center gap-6 mt-6 text-sm">
          <div className="flex items-center gap-2 liquid-glass-button rounded-full px-4 py-2">
            <ThumbsUp className="h-4 w-4 text-success" />
            <span className="text-success font-medium">{knownCount}</span>
          </div>
          <div className="flex items-center gap-2 liquid-glass-button rounded-full px-4 py-2">
            <ThumbsDown className="h-4 w-4 text-destructive" />
            <span className="text-destructive font-medium">{unknownCount}</span>
          </div>
        </div>
      </div>
    </Layout>
  );
}
