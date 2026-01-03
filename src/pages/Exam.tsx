import { useState, useEffect, useCallback } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Loader2, 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  ArrowRight,
  RotateCcw,
  Home,
  Clock,
  AlertTriangle,
  Trophy,
  Target,
  Timer
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type Question = {
  id: string;
  question: string;
  correct_answer: string;
  wrong_answers: string[];
  explanation: string | null;
  topic: string;
};

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

const EXAM_DURATION = 30 * 60; // 30 minutes
const EXAM_QUESTIONS_COUNT = 20;
const PASSING_SCORE = 70; // percentage

export default function Exam() {
  const { user, isLoading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  
  // Exam states
  const [examStarted, setExamStarted] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(EXAM_DURATION);
  const [startTime, setStartTime] = useState<Date | null>(null);
  
  // Shuffle answers for current question
  const [shuffledAnswers, setShuffledAnswers] = useState<string[]>([]);

  // Timer
  useEffect(() => {
    if (!examStarted || isFinished) return;
    
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          finishExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [examStarted, isFinished]);

  // Shuffle answers when question changes
  useEffect(() => {
    if (questions.length > 0 && currentIndex < questions.length) {
      const current = questions[currentIndex];
      const allAnswers = [current.correct_answer, ...current.wrong_answers];
      setShuffledAnswers(shuffleArray(allAnswers));
    }
  }, [currentIndex, questions]);

  const startExam = async () => {
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from('questions')
      .select('*');

    if (error) {
      console.error('Error fetching questions:', error);
      toast({
        title: language === 'ru' ? 'Ошибка' : 'Σφάλμα',
        description: language === 'ru' ? 'Не удалось загрузить вопросы' : 'Αποτυχία φόρτωσης ερωτήσεων',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    if (!data || data.length < EXAM_QUESTIONS_COUNT) {
      toast({
        title: language === 'ru' ? 'Недостаточно вопросов' : 'Ανεπαρκείς ερωτήσεις',
        description: language === 'ru' 
          ? `Нужно минимум ${EXAM_QUESTIONS_COUNT} вопросов для экзамена` 
          : `Απαιτούνται τουλάχιστον ${EXAM_QUESTIONS_COUNT} ερωτήσεις για την εξέταση`,
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    // Shuffle and take required number of questions
    const shuffledQuestions = shuffleArray(data).slice(0, EXAM_QUESTIONS_COUNT);
    setQuestions(shuffledQuestions);
    setExamStarted(true);
    setStartTime(new Date());
    setIsLoading(false);
  };

  const finishExam = useCallback(async () => {
    setIsFinished(true);
    
    // Calculate score
    const score = questions.reduce((acc, q, index) => {
      return answers[index] === q.correct_answer ? acc + 1 : acc;
    }, 0);
    
    // Calculate time spent
    const timeSpent = startTime ? Math.floor((new Date().getTime() - startTime.getTime()) / 1000) : EXAM_DURATION;
    
    // Save result to database
    if (user) {
      const { error } = await supabase.from('exam_results').insert({
        user_id: user.id,
        total_questions: questions.length,
        correct_answers: score,
        time_spent_seconds: timeSpent,
      });
      
      if (error) {
        console.error('Error saving exam result:', error);
      }
    }
  }, [questions, answers, startTime, user]);

  const handleAnswer = (answer: string) => {
    setAnswers(prev => ({ ...prev, [currentIndex]: answer }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleJumpToQuestion = (index: number) => {
    setCurrentIndex(index);
  };

  const handleRestart = () => {
    setExamStarted(false);
    setQuestions([]);
    setCurrentIndex(0);
    setAnswers({});
    setIsFinished(false);
    setTimeLeft(EXAM_DURATION);
    setStartTime(null);
  };

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

  // Exam intro screen
  if (!examStarted) {
    return (
      <Layout>
        <div className="container py-12">
          <Link to="/learn" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('quiz.backToTopics')}
          </Link>
          
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Trophy className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="font-display text-3xl">
                {language === 'ru' ? 'Симуляция экзамена' : 'Προσομοίωση εξέτασης'}
              </CardTitle>
              <CardDescription className="text-lg mt-2">
                {language === 'ru' 
                  ? 'Проверьте свои знания в условиях, приближённых к реальному тесту' 
                  : 'Ελέγξτε τις γνώσεις σας σε συνθήκες παρόμοιες με το πραγματικό τεστ'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Exam info */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <Target className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <div className="font-bold text-xl">{EXAM_QUESTIONS_COUNT}</div>
                  <div className="text-sm text-muted-foreground">
                    {language === 'ru' ? 'Вопросов' : 'Ερωτήσεις'}
                  </div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <Timer className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <div className="font-bold text-xl">30</div>
                  <div className="text-sm text-muted-foreground">
                    {language === 'ru' ? 'Минут' : 'Λεπτά'}
                  </div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <div className="font-bold text-xl">{PASSING_SCORE}%</div>
                  <div className="text-sm text-muted-foreground">
                    {language === 'ru' ? 'Для сдачи' : 'Για επιτυχία'}
                  </div>
                </div>
              </div>

              {/* Rules */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <strong className="block mb-1">
                      {language === 'ru' ? 'Важно:' : 'Σημαντικό:'}
                    </strong>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>{language === 'ru' ? 'Вопросы из всех тем' : 'Ερωτήσεις από όλα τα θέματα'}</li>
                      <li>{language === 'ru' ? 'Таймер не останавливается' : 'Το χρονόμετρο δεν σταματά'}</li>
                      <li>{language === 'ru' ? 'Можно пропускать и возвращаться' : 'Μπορείτε να παραλείψετε και να επιστρέψετε'}</li>
                      <li>{language === 'ru' ? 'Результат сохраняется автоматически' : 'Το αποτέλεσμα αποθηκεύεται αυτόματα'}</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Button 
                onClick={startExam} 
                size="lg" 
                className="w-full gradient-greek text-primary-foreground"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : null}
                {language === 'ru' ? 'Начать экзамен' : 'Έναρξη εξέτασης'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // Exam results
  if (isFinished) {
    const score = questions.reduce((acc, q, index) => {
      return answers[index] === q.correct_answer ? acc + 1 : acc;
    }, 0);
    const percentage = Math.round((score / questions.length) * 100);
    const passed = percentage >= PASSING_SCORE;
    const timeSpent = startTime ? Math.floor((new Date().getTime() - startTime.getTime()) / 1000) : EXAM_DURATION;
    
    return (
      <Layout>
        <div className="container py-12">
          <Card className="max-w-3xl mx-auto">
            <CardHeader className="text-center">
              <div className={cn(
                "mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4",
                passed ? "bg-green-100" : "bg-red-100"
              )}>
                {passed ? (
                  <Trophy className="h-10 w-10 text-green-600" />
                ) : (
                  <XCircle className="h-10 w-10 text-red-600" />
                )}
              </div>
              <CardTitle className="font-display text-3xl">
                {passed 
                  ? (language === 'ru' ? 'Экзамен сдан!' : 'Επιτυχία!')
                  : (language === 'ru' ? 'Экзамен не сдан' : 'Αποτυχία')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Score */}
              <div className={cn(
                "w-32 h-32 rounded-full flex items-center justify-center mx-auto text-4xl font-bold",
                passed ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
              )}>
                {percentage}%
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{score}/{questions.length}</div>
                  <div className="text-sm text-muted-foreground">
                    {language === 'ru' ? 'Правильных' : 'Σωστές'}
                  </div>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{formatTime(timeSpent)}</div>
                  <div className="text-sm text-muted-foreground">
                    {language === 'ru' ? 'Время' : 'Χρόνος'}
                  </div>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{PASSING_SCORE}%</div>
                  <div className="text-sm text-muted-foreground">
                    {language === 'ru' ? 'Проходной' : 'Βαθμός επιτυχίας'}
                  </div>
                </div>
              </div>

              {/* Review answers */}
              <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
                {questions.map((q, index) => {
                  const isCorrect = answers[index] === q.correct_answer;
                  return (
                    <div key={q.id} className={cn(
                      "p-4",
                      isCorrect ? "bg-green-50" : "bg-red-50"
                    )}>
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                          isCorrect ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                        )}>
                          {isCorrect ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm mb-1">{q.question}</p>
                          {!isCorrect && (
                            <p className="text-xs text-muted-foreground">
                              {language === 'ru' ? 'Правильный ответ:' : 'Σωστή απάντηση:'} {q.correct_answer}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="flex gap-4 justify-center pt-4">
                <Button variant="outline" onClick={handleRestart}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {language === 'ru' ? 'Пройти снова' : 'Δοκιμάστε ξανά'}
                </Button>
                <Link to="/learn">
                  <Button>
                    <Home className="h-4 w-4 mr-2" />
                    {language === 'ru' ? 'К темам' : 'Στα θέματα'}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // Active exam
  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / questions.length) * 100;
  const isLowTime = timeLeft <= 300; // 5 minutes

  return (
    <Layout>
      <div className="container py-6">
        {/* Exam header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-xl font-bold">
              {language === 'ru' ? 'Экзамен' : 'Εξέταση'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {language === 'ru' ? 'Ответьте на все вопросы' : 'Απαντήστε σε όλες τις ερωτήσεις'}
            </p>
          </div>
          
          {/* Timer */}
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-bold",
            isLowTime ? "bg-red-100 text-red-600 animate-pulse" : "bg-muted"
          )}>
            <Clock className="h-5 w-5" />
            {formatTime(timeLeft)}
          </div>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span>{language === 'ru' ? 'Прогресс' : 'Πρόοδος'}</span>
            <span>{answeredCount} / {questions.length}</span>
          </div>
          <Progress value={progress} />
        </div>

        {/* Question navigation */}
        <div className="flex flex-wrap gap-2 mb-6">
          {questions.map((_, index) => (
            <button
              key={index}
              onClick={() => handleJumpToQuestion(index)}
              className={cn(
                "w-10 h-10 rounded-lg text-sm font-medium transition-all",
                currentIndex === index && "ring-2 ring-primary ring-offset-2",
                answers[index] !== undefined 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted hover:bg-muted/80"
              )}
            >
              {index + 1}
            </button>
          ))}
        </div>

        {/* Question card */}
        <Card className="max-w-3xl mx-auto mb-6">
          <CardHeader>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <span className="px-2 py-1 bg-muted rounded text-xs">
                {t(`topic.${currentQuestion.topic}`)}
              </span>
              <span>
                {language === 'ru' ? 'Вопрос' : 'Ερώτηση'} {currentIndex + 1} {language === 'ru' ? 'из' : 'από'} {questions.length}
              </span>
            </div>
            <CardTitle className="font-display text-xl leading-relaxed">
              {currentQuestion.question}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              {shuffledAnswers.map((answer, index) => {
                const isSelected = answers[currentIndex] === answer;
                
                return (
                  <button
                    key={index}
                    onClick={() => handleAnswer(answer)}
                    className={cn(
                      "w-full p-4 text-left rounded-lg border-2 transition-all",
                      "hover:border-primary/50 hover:bg-accent/50",
                      isSelected && "border-primary bg-primary/5"
                    )}
                  >
                    {answer}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <Button 
            variant="outline" 
            onClick={handlePrev}
            disabled={currentIndex === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {language === 'ru' ? 'Назад' : 'Πίσω'}
          </Button>

          {currentIndex === questions.length - 1 ? (
            <Button 
              onClick={finishExam}
              className="gradient-greek text-primary-foreground"
            >
              {language === 'ru' ? 'Завершить экзамен' : 'Ολοκλήρωση εξέτασης'}
              <CheckCircle2 className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleNext}>
              {language === 'ru' ? 'Далее' : 'Επόμενο'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </Layout>
  );
}
