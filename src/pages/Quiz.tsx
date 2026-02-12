import { useState, useEffect } from 'react';
import { localizeQuestions } from '@/lib/questionLocale';
import { useParams, Navigate, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ArrowLeft, CheckCircle2, XCircle, ArrowRight, RotateCcw, Home, Volume2, VolumeX } from 'lucide-react';
import { useSpeech } from '@/hooks/useSpeech';
import { cn } from '@/lib/utils';

type Question = { id: string; question: string; correct_answer: string; wrong_answers: string[]; explanation: string | null; };
type TopicType = 'history' | 'culture' | 'laws' | 'geography';

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

  const validTopic = topic as TopicType;
  const validTopics = ['history', 'culture', 'laws', 'geography'];
  const isValidTopic = topic && validTopics.includes(topic);

  useEffect(() => {
    if (!isValidTopic || !user) return;
    const fetchQuestions = async () => {
      setIsLoading(true);
      const { data, error } = await supabase.from('questions').select('*').eq('topic', validTopic).limit(20);
      if (error) console.error('Error fetching questions:', error);
      else if (data && data.length > 0) setQuestions(shuffleArray(localizeQuestions(data, language)));
      setIsLoading(false);
    };
    fetchQuestions();
  }, [validTopic, user, isValidTopic, language]);

  useEffect(() => {
    if (questions.length > 0 && currentIndex < questions.length) {
      const current = questions[currentIndex];
      setShuffledAnswers(shuffleArray([current.correct_answer, ...current.wrong_answers]));
    }
  }, [currentIndex, questions]);

  if (authLoading) return <Layout><div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></Layout>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isValidTopic) return <Navigate to="/learn" replace />;

  const handleAnswer = (answer: string) => {
    if (isAnswered) return;
    setSelectedAnswer(answer);
    setIsAnswered(true);
    if (answer === questions[currentIndex].correct_answer) setScore(prev => prev + 1);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) { setCurrentIndex(prev => prev + 1); setSelectedAnswer(null); setIsAnswered(false); }
    else setIsFinished(true);
  };

  const handleRestart = () => { setCurrentIndex(0); setSelectedAnswer(null); setIsAnswered(false); setScore(0); setIsFinished(false); setQuestions(shuffleArray(questions)); };

  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;
  const topicTitle = t(`topic.${validTopic}`);

  if (isLoading) return <Layout><div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></Layout>;

  if (questions.length === 0) {
    return (
      <Layout>
        <div className="container py-12">
          <Card className="max-w-2xl mx-auto text-center liquid-glass-card rounded-2xl">
            <CardContent className="py-12">
              <h2 className="text-2xl font-display font-bold mb-4">{t('quiz.noQuestions')}</h2>
              <p className="text-muted-foreground mb-6">{t('quiz.noQuestions.desc')}</p>
              <Link to="/learn"><Button className="liquid-glass-button rounded-xl"><ArrowLeft className="h-4 w-4 mr-2" />{t('quiz.backToTopics')}</Button></Link>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (isFinished) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <Layout>
        <div className="relative container py-12 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-[350px] h-[350px] rounded-full aurora-blob" />
          <Card className="relative max-w-2xl mx-auto liquid-glass-card glow-border rounded-2xl">
            <CardHeader className="text-center"><CardTitle className="font-display text-3xl">{t('quiz.finished')}</CardTitle></CardHeader>
            <CardContent className="text-center space-y-6">
              <div className={cn(
                "w-32 h-32 rounded-full flex items-center justify-center mx-auto text-4xl font-bold shadow-2xl",
                percentage >= 70 ? "bg-success/15 text-success shadow-success/15" : 
                percentage >= 50 ? "bg-accent/15 text-accent-foreground shadow-accent/15" : 
                "bg-destructive/15 text-destructive shadow-destructive/15"
              )}>{percentage}%</div>
              <div>
                <p className="text-xl font-medium">{t('quiz.correctAnswers')} {score} {t('quiz.of')} {questions.length}</p>
                <p className="text-muted-foreground mt-2">
                  {percentage >= 70 ? t('quiz.result.great') : percentage >= 50 ? t('quiz.result.good') : t('quiz.result.practice')}
                </p>
              </div>
              <div className="flex gap-4 justify-center pt-4">
                <Button variant="outline" onClick={handleRestart} className="liquid-glass-button rounded-xl"><RotateCcw className="h-4 w-4 mr-2" />{t('quiz.tryAgain')}</Button>
                <Link to="/learn"><Button className="gradient-greek text-primary-foreground shadow-lg shadow-primary/20 rounded-xl"><Home className="h-4 w-4 mr-2" />{t('quiz.toTopics')}</Button></Link>
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
      <div className="relative container py-4 sm:py-8 px-4 overflow-hidden">
        <div className="absolute -top-24 -right-24 w-[300px] h-[300px] rounded-full aurora-blob" />

        {/* Header */}
        <div className="relative mb-6 sm:mb-8">
          <Link to="/learn" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4 text-sm transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" />{t('quiz.backToTopics')}
          </Link>
          <h1 className="font-display text-lg sm:text-2xl font-bold">{topicTitle}</h1>
          <div className="flex items-center gap-3 mt-4">
            <Progress value={progress} className="flex-1" />
            <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">{currentIndex + 1} / {questions.length}</span>
          </div>
        </div>

        {/* Question */}
        <Card className="relative max-w-3xl mx-auto liquid-glass-card rounded-2xl">
          <CardHeader className="px-4 sm:px-6">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="font-display text-base sm:text-xl leading-relaxed flex-1">{currentQuestion.question}</CardTitle>
              {isSupported && (
                <Button variant="ghost" size="icon" className="shrink-0 liquid-glass-button rounded-xl"
                  onClick={() => isSpeaking ? stop() : speak(currentQuestion.question, `${currentQuestion.id}_question_${language}`)}>
                  {isSpeaking ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
            <div className="grid gap-2 sm:gap-3">
              {shuffledAnswers.map((answer, index) => {
                const isCorrect = answer === currentQuestion.correct_answer;
                const isSelected = answer === selectedAnswer;
                return (
                  <button key={index} onClick={() => handleAnswer(answer)} disabled={isAnswered}
                    className={cn(
                      "w-full p-3 sm:p-4 text-left rounded-xl border transition-all duration-500 spring-transition text-sm sm:text-base",
                      "liquid-glass-button",
                      !isAnswered && "cursor-pointer hover:border-primary/30",
                      isAnswered && isCorrect && "border-success bg-success/8 shadow-lg shadow-success/10",
                      isAnswered && isSelected && !isCorrect && "border-destructive bg-destructive/8 shadow-lg shadow-destructive/10",
                      !isAnswered && isSelected && "border-primary bg-primary/8"
                    )}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex-1">{answer}</span>
                      {isAnswered && isCorrect && <CheckCircle2 className="h-5 w-5 text-success shrink-0" />}
                      {isAnswered && isSelected && !isCorrect && <XCircle className="h-5 w-5 text-destructive shrink-0" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {isAnswered && currentQuestion.explanation && (
              <div className="p-4 liquid-glass rounded-xl mt-4">
                <p className="text-sm text-muted-foreground"><strong>{t('quiz.explanation')}</strong> {currentQuestion.explanation}</p>
              </div>
            )}

            {isAnswered && (
              <div className="flex justify-end pt-4">
                <Button onClick={handleNext} size="lg" className="gradient-greek text-primary-foreground shadow-lg shadow-primary/20 rounded-xl">
                  {currentIndex < questions.length - 1 ? (<>{t('quiz.nextQuestion')}<ArrowRight className="h-4 w-4 ml-2" /></>) : (<>{t('quiz.finishTest')}<CheckCircle2 className="h-4 w-4 ml-2" /></>)}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-muted-foreground liquid-glass-button inline-block mx-auto px-4 py-2 rounded-full">
          {t('quiz.correctAnswers')} {score}
        </div>
      </div>
    </Layout>
  );
}
