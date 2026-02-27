import { useState, useEffect } from 'react';
import { localizeQuestions } from '@/lib/questionLocale';
import { useParams, Navigate, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
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

const TOPIC_COLORS: Record<TopicType, string> = {
  history: 'hsl(var(--history))',
  culture: 'hsl(var(--culture))',
  laws: 'hsl(var(--laws))',
  geography: 'hsl(var(--geography))',
};

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function Quiz() {
  const { topic, mode } = useParams<{ topic: string; mode: string }>();
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

  if (authLoading) return <Layout><div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></Layout>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isValidTopic) return <Navigate to="/learn" replace />;

  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;
  const topicTitle = t(`topic.${validTopic}`);
  const topicColor = TOPIC_COLORS[validTopic];

  if (isLoading) return <Layout><div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></Layout>;

  if (questions.length === 0) {
    return (
      <Layout>
        <div className="container py-12">
          <div className="max-w-2xl mx-auto text-center bg-card rounded-3xl p-12 shadow-sm">
            <h2 className="text-2xl font-semibold mb-4">{t('quiz.noQuestions')}</h2>
            <p className="text-muted-foreground mb-6">{t('quiz.noQuestions.desc')}</p>
            <Link to="/learn"><Button><ArrowLeft className="h-4 w-4 mr-2" />{t('quiz.backToTopics')}</Button></Link>
          </div>
        </div>
      </Layout>
    );
  }

  if (isFinished) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <Layout>
        <div className="container py-12">
          <div className="max-w-2xl mx-auto bg-card rounded-3xl p-10 shadow-sm text-center">
            <h2 className="text-3xl font-semibold mb-8">{t('quiz.finished')}</h2>
            <div className={cn(
              "w-32 h-32 rounded-full flex items-center justify-center mx-auto text-4xl font-bold mb-6",
              percentage >= 70 ? "bg-success/15 text-success" :
              percentage >= 50 ? "bg-accent/15 text-accent-foreground" :
              "bg-destructive/15 text-destructive"
            )}>{percentage}%</div>
            <p className="text-xl font-medium mb-2">{t('quiz.correctAnswers')} {score} {t('quiz.of')} {questions.length}</p>
            <p className="text-muted-foreground mb-8">
              {percentage >= 70 ? t('quiz.result.great') : percentage >= 50 ? t('quiz.result.good') : t('quiz.result.practice')}
            </p>
            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={handleRestart}><RotateCcw className="h-4 w-4 mr-2" />{t('quiz.tryAgain')}</Button>
              <Link to="/learn"><Button><Home className="h-4 w-4 mr-2" />{t('quiz.toTopics')}</Button></Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ── Top bar ── */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-8 py-3 border-b border-border/60 bg-background/90 backdrop-blur-sm"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ background: topicColor }}
          >
            {topicTitle.slice(0, 2).toUpperCase()}
          </div>
          <span className="font-medium text-sm sm:text-base text-foreground">
            {topicTitle} • {t('quiz.title') || 'Тест'}
          </span>
        </div>
        <Link to="/learn">
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors border border-border/60 rounded-full px-3 py-1.5">
            <X className="h-3.5 w-3.5" />
            {t('quiz.finish') || 'Завершить тест'}
          </button>
        </Link>
      </div>

      {/* ── Progress ── */}
      <div className="px-4 sm:px-8 pt-6 pb-2 max-w-3xl mx-auto w-full">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2 font-medium">
          <span>{t('quiz.question') || 'Вопрос'} {currentIndex + 1} {t('quiz.of') || 'из'} {questions.length}</span>
          <span>{Math.round(progress)}% {t('quiz.passed') || 'пройдено'}</span>
        </div>
        {/* Custom progress bar */}
        <div className="w-full h-2 bg-border rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: topicColor }}
          />
        </div>
      </div>

      {/* ── Main card ── */}
      <div className="px-4 sm:px-8 py-4 max-w-3xl mx-auto w-full">
        <div className="bg-card rounded-3xl shadow-sm overflow-hidden">
          {/* Question header */}
          <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-4">
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: topicColor }}
              />
              <span
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: topicColor }}
              >
                {t('quiz.chooseAnswer') || 'Выберите правильный ответ'}
              </span>
              {isSupported && (
                <button
                  onClick={() => isSpeaking ? stop() : speak(currentQuestion.question, `${currentQuestion.id}_question_${language}`)}
                  className="ml-auto p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold leading-snug text-foreground">
              {currentQuestion.question}
            </h2>
          </div>

          {/* Answers */}
          <div className="px-6 sm:px-8 pb-6 sm:pb-8 space-y-2.5">
            {shuffledAnswers.map((answer, index) => {
              const isCorrect = answer === currentQuestion.correct_answer;
              const isSelected = answer === selectedAnswer;

              let bgStyle = {};
              let borderClass = 'border-border/50 bg-background hover:border-border';
              let textClass = 'text-foreground';
              let labelBg = 'bg-muted text-muted-foreground';

              if (isAnswered) {
                if (isCorrect) {
                  bgStyle = { background: topicColor };
                  borderClass = 'border-transparent';
                  textClass = 'text-white';
                  labelBg = 'bg-white/20 text-white';
                } else if (isSelected && !isCorrect) {
                  borderClass = 'border-destructive/40 bg-destructive/5';
                  textClass = 'text-destructive';
                  labelBg = 'bg-destructive/10 text-destructive';
                }
              }

              return (
                <button
                  key={index}
                  onClick={() => handleAnswer(answer)}
                  disabled={isAnswered}
                  className={cn(
                    'w-full flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 sm:py-4 rounded-2xl border text-left transition-all duration-300',
                    borderClass,
                    textClass,
                    !isAnswered && 'cursor-pointer'
                  )}
                  style={isAnswered && isCorrect ? bgStyle : {}}
                >
                  <span className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-all', labelBg)}>
                    {ANSWER_LABELS[index]}
                  </span>
                  <span className="flex-1 font-medium text-sm sm:text-base">{answer}</span>
                  {isAnswered && isCorrect && <CheckCircle2 className="h-5 w-5 text-white/90 shrink-0" />}
                  {isAnswered && isSelected && !isCorrect && <XCircle className="h-5 w-5 shrink-0" />}
                </button>
              );
            })}

            {/* Explanation */}
            {isAnswered && currentQuestion.explanation && (
              <div className="mt-2 p-4 bg-muted/50 rounded-2xl border border-border/40">
                <p className="text-sm text-foreground/80"><span className="font-semibold">{t('quiz.explanation')}</span> {currentQuestion.explanation}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="px-4 sm:px-8 pb-8 max-w-3xl mx-auto w-full flex items-center justify-between">
        {/* Keyboard hint */}
        <p className="text-xs text-muted-foreground hidden sm:block">
          {t('quiz.keyboardHint') || 'Используйте [1, 2, 3, 4] для выбора • [Enter] для продолжения'}
        </p>

        {/* Next button — only visible after answering */}
        <div className={cn('ml-auto transition-all duration-300', !isAnswered && 'opacity-0 pointer-events-none')}>
          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-sm text-white shadow-md transition-all hover:opacity-90 active:scale-95"
            style={{ background: 'hsl(var(--foreground))' }}
          >
            {currentIndex < questions.length - 1
              ? <>{t('quiz.nextQuestion') || 'Далее'} <ArrowRight className="h-4 w-4" /></>
              : <>{t('quiz.finishTest') || 'Завершить'} <CheckCircle2 className="h-4 w-4" /></>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
