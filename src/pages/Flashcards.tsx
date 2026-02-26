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
    if (!ratedIndices.has(currentIndex)) {
      setRatedIndices(prev => new Set([...prev, currentIndex]));
      setKnownCount(prev => prev + 1);
      if (user) {
        upsertProgress(user.id, questions[currentIndex].id, true);
      }
    }
    goToNext();
  };

  const handleDontKnow = () => {
    if (!ratedIndices.has(currentIndex)) {
      setRatedIndices(prev => new Set([...prev, currentIndex]));
      setUnknownCount(prev => prev + 1);
      setUnknownQuestions(prev => [...prev, questions[currentIndex]]);
      if (user) {
        upsertProgress(user.id, questions[currentIndex].id, false);
      }
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

          <Card className="relative max-w-2xl mx-auto flashcard-glass rounded-2xl">
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
                <div className="text-center bg-muted/50 rounded-xl p-4">
                  <div className="text-3xl font-bold text-success">{knownCount}</div>
                  <div className="text-sm text-muted-foreground">{t('flashcards.known')}</div>
                </div>
                <div className="text-center bg-muted/50 rounded-xl p-4">
                  <div className="text-3xl font-bold text-destructive">{unknownCount}</div>
                  <div className="text-sm text-muted-foreground">{t('flashcards.unknown')}</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 justify-center pt-4">
                {unknownQuestions.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={handleRestartUnknown}
                    className="border-destructive/30 text-destructive hover:bg-destructive/10"
                  >
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

  const topicColor: Record<string, string> = {
    history: 'hsl(var(--history))',
    culture: 'hsl(var(--culture))',
    laws: 'hsl(var(--laws))',
    geography: 'hsl(var(--geography))',
  };

  return (
    <Layout>
      <div
        className="relative z-10 flex flex-col"
        style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px 80px', minHeight: '80vh', width: '100%' }}
      >

        {/* Back link */}
        <Link
          to="/learn"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            color: 'hsl(var(--muted-foreground))', textDecoration: 'none',
            fontSize: '14px', fontWeight: 500, marginBottom: '24px',
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'hsl(var(--foreground))')}
          onMouseLeave={e => (e.currentTarget.style.color = 'hsl(var(--muted-foreground))')}
        >
          <ArrowLeft style={{ width: '16px', height: '16px' }} />
          {t('quiz.backToTopics')}
        </Link>

        {/* Title row */}
        <div className="glass-panel mb-6" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'hsl(var(--foreground))' }}>
              {topicTitle} — {t('mode.flashcards')}
            </h1>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={handleShuffle}
                style={{
                  width: '44px', height: '44px', borderRadius: '12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'transparent', border: '1px solid transparent',
                  cursor: 'pointer', color: 'hsl(var(--foreground))', fontSize: '18px',
                  transition: 'all 0.2s',
                }}
                title={t('flashcards.shuffle')}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.6)'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.05)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
              >
                <Shuffle style={{ width: '18px', height: '18px' }} />
              </button>
            </div>
          </div>

          {/* Progress bar row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ flexGrow: 1, height: '6px', background: 'rgba(47,53,50,0.1)', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                background: topicColor[validTopic] || 'hsl(var(--foreground))',
                width: `${progress}%`,
                borderRadius: '10px',
                transition: 'width 0.3s ease',
                opacity: 0.75,
              }} />
            </div>
            <span style={{ fontSize: '13px', color: 'hsl(var(--muted-foreground))', whiteSpace: 'nowrap', fontWeight: 600 }}>
              {currentIndex + 1} / {questions.length}
            </span>
          </div>
        </div>

        {/* Flashcard scene */}
        <div
          style={{
            perspective: '1000px',
            width: '100%', maxWidth: '640px', height: '380px',
            margin: '0 auto 8px',
            cursor: 'pointer',
          }}
          onClick={handleFlip}
        >
          <div style={{
            width: '100%', height: '100%',
            position: 'relative',
            transition: 'transform 0.6s cubic-bezier(0.4,0,0.2,1)',
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            borderRadius: '24px',
          }}>
            {/* Front face */}
            <div style={{
              position: 'absolute', width: '100%', height: '100%',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              background: '#FFFFFF',
              borderRadius: '24px',
              boxShadow: '0 8px 40px rgba(0,0,0,0.10)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: '48px', textAlign: 'center',
            }}>
              {/* Topic badge */}
              <span style={{
                position: 'absolute', top: '24px', left: '24px',
                padding: '6px 16px', background: 'rgba(0,0,0,0.06)',
                borderRadius: '100px', fontSize: '11px', fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase' as const,
                color: topicColor[validTopic] || 'hsl(var(--muted-foreground))',
              }}>
                {topicTitle}
              </span>

              {/* Speaker */}
              {isSupported && (
                <button
                  style={{
                    position: 'absolute', top: '20px', right: '20px',
                    width: '40px', height: '40px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'hsl(var(--muted-foreground))', cursor: 'pointer',
                    background: 'transparent', border: 'none', fontSize: '18px',
                    transition: 'all 0.2s',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    isSpeaking ? stop() : speak(currentQuestion.question, `${currentQuestion.id}_question_${language}`);
                  }}
                >
                  {isSpeaking ? <VolumeX style={{ width: '18px', height: '18px' }} /> : <Volume2 style={{ width: '18px', height: '18px' }} />}
                </button>
              )}

              <p style={{ fontSize: '28px', fontWeight: 600, lineHeight: 1.35, color: 'hsl(var(--foreground))' }}>
                {currentQuestion.question}
              </p>

              <span style={{
                position: 'absolute', bottom: '24px',
                fontSize: '13px', color: 'hsl(var(--muted-foreground))', opacity: 0.7,
              }}>
                {language === 'ru' ? 'Нажмите, чтобы перевернуть' : 'Click to flip'}
              </span>
            </div>

            {/* Back face */}
            <div style={{
              position: 'absolute', width: '100%', height: '100%',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              background: '#F9F8F6',
              borderRadius: '24px',
              border: '1px solid rgba(0,0,0,0.03)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.10)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: '48px', textAlign: 'center',
              transform: 'rotateY(180deg)',
            }}>
              <span style={{
                position: 'absolute', top: '24px',
                fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const,
                color: 'hsl(var(--muted-foreground))',
              }}>
                {language === 'ru' ? 'Ответ' : 'Answer'}
              </span>

              {/* Speaker */}
              {isSupported && (
                <button
                  style={{
                    position: 'absolute', top: '20px', right: '20px',
                    width: '40px', height: '40px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'hsl(var(--muted-foreground))', cursor: 'pointer',
                    background: 'transparent', border: 'none', fontSize: '18px',
                    transition: 'all 0.2s',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    isSpeaking ? stop() : speak(currentQuestion.correct_answer, `${currentQuestion.id}_answer_${language}`);
                  }}
                >
                  {isSpeaking ? <VolumeX style={{ width: '18px', height: '18px' }} /> : <Volume2 style={{ width: '18px', height: '18px' }} />}
                </button>
              )}

              <p style={{ fontSize: '26px', fontWeight: 500, color: 'hsl(var(--foreground))', lineHeight: 1.4 }}>
                {currentQuestion.correct_answer}
              </p>
              {currentQuestion.explanation && (
                <p style={{
                  position: 'absolute', bottom: '28px',
                  fontSize: '13px', color: 'hsl(var(--muted-foreground))',
                  lineHeight: 1.5, maxWidth: '80%', opacity: 0.8,
                }}>
                  {currentQuestion.explanation}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={{ maxWidth: '640px', width: '100%', margin: '0 auto' }}>
          {/* Prev / Next */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '12px' }}>
            <button
              onClick={goToPrev}
              disabled={currentIndex === 0}
              style={{
                padding: '12px 28px', borderRadius: '100px',
                background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.6)',
                color: 'hsl(var(--foreground))', fontWeight: 500, fontSize: '15px',
                cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                opacity: currentIndex === 0 ? 0.5 : 1,
                transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: '8px',
                minWidth: '140px', justifyContent: 'center',
                fontFamily: 'inherit',
              }}
              onMouseEnter={e => { if (currentIndex > 0) { e.currentTarget.style.background = 'rgba(255,255,255,0.8)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.5)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <ArrowLeft style={{ width: '16px', height: '16px' }} />
              {language === 'ru' ? 'Назад' : 'Back'}
            </button>
            <button
              onClick={goToNext}
              disabled={currentIndex === questions.length - 1}
              style={{
                padding: '12px 28px', borderRadius: '100px',
                background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.6)',
                color: 'hsl(var(--foreground))', fontWeight: 500, fontSize: '15px',
                cursor: currentIndex === questions.length - 1 ? 'not-allowed' : 'pointer',
                opacity: currentIndex === questions.length - 1 ? 0.5 : 1,
                transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: '8px',
                minWidth: '140px', justifyContent: 'center',
                fontFamily: 'inherit',
              }}
              onMouseEnter={e => { if (currentIndex < questions.length - 1) { e.currentTarget.style.background = 'rgba(255,255,255,0.8)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.5)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {language === 'ru' ? 'Далее' : 'Next'}
              <ArrowRight style={{ width: '16px', height: '16px' }} />
            </button>
          </div>

          {/* Know / Don't Know — revealed after flip */}
          <div style={{
            display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '8px',
            visibility: isFlipped ? 'visible' : 'hidden',
          }}>
            <button
              onClick={handleDontKnow}
              style={{
                padding: '14px 40px', borderRadius: '100px',
                background: '#E06C6C', border: 'none',
                color: '#fff', fontWeight: 600, fontSize: '15px',
                cursor: 'pointer', boxShadow: '0 4px 16px rgba(224,108,108,0.3)',
                display: 'flex', alignItems: 'center', gap: '8px',
                minWidth: '150px', justifyContent: 'center',
                fontFamily: 'inherit', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.filter = 'brightness(1.05)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.filter = 'none'; }}
            >
              <ThumbsDown style={{ width: '16px', height: '16px' }} />
              {language === 'ru' ? `Не знаю · ${unknownCount}` : `${t('flashcards.dontKnow')} · ${unknownCount}`}
            </button>
            <button
              onClick={handleKnow}
              style={{
                padding: '14px 40px', borderRadius: '100px',
                background: '#7D8A57', border: 'none',
                color: '#fff', fontWeight: 600, fontSize: '15px',
                cursor: 'pointer', boxShadow: '0 4px 16px rgba(125,138,87,0.3)',
                display: 'flex', alignItems: 'center', gap: '8px',
                minWidth: '150px', justifyContent: 'center',
                fontFamily: 'inherit', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.filter = 'brightness(1.05)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.filter = 'none'; }}
            >
              <ThumbsUp style={{ width: '16px', height: '16px' }} />
              {language === 'ru' ? `Знаю · ${knownCount}` : `${t('flashcards.know')} · ${knownCount}`}
            </button>
          </div>
        </div>

      </div>
    </Layout>
  );
}
