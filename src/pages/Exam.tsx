import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { localizeQuestions } from '@/lib/questionLocale';
import { Navigate, Link, useParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
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
  Timer,
  Flag,
  Download,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useStudyTimer } from '@/hooks/useStudyTimer';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Json } from '@/integrations/supabase/types';

type Question = {
  id: string;
  question: string;
  correct_answer: string;
  wrong_answers: string[];
  explanation: string | null;
  topic: string;
};

type QuestionTopic = 'history' | 'culture' | 'laws' | 'geography';

type QuestionData = {
  question_id: string;
  user_answer: string | null;
  is_correct: boolean;
  time_spent: number;
  topic: string;
};

type TopicsBreakdown = {
  [topic: string]: { total: number; correct: number };
};

type ExamSettings = {
  questionCount: number;
  timeLimit: number; // in minutes, 0 = no limit
  topics: QuestionTopic[];
};

const TOPICS: QuestionTopic[] = ['history', 'culture', 'laws', 'geography'];
const QUESTION_OPTIONS = [10, 20, 30, 0]; // 0 = all
const TIME_OPTIONS = [15, 30, 45, 60, 0]; // 0 = no limit
const PASSING_SCORE = 70;

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

export default function Exam() {
  const { user, isLoading: authLoading } = useAuth();
  const { topic: urlTopic } = useParams<{ topic?: string }>();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  useStudyTimer('exam');

  // Fetch last exam score for comparison
  const { data: lastExamScore } = useQuery({
    queryKey: ['last-exam-score', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exam_results')
        .select('correct_answers, total_questions')
        .eq('user_id', user!.id)
        .order('completed_at', { ascending: false })
        .limit(1);
      if (error) throw error;
      if (!data || data.length === 0) return null;
      return Math.round((data[0].correct_answers / data[0].total_questions) * 100);
    },
    enabled: !!user,
  });
  
  // Settings state
  const [settings, setSettings] = useState<ExamSettings>({
    questionCount: 20,
    timeLimit: 30,
    topics: (urlTopic && (TOPICS as string[]).includes(urlTopic))
      ? [urlTopic as QuestionTopic]
      : [...TOPICS],
  });
  
  // Exam states
  const [examStarted, setExamStarted] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [questionTimes, setQuestionTimes] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const lastQuestionTime = useRef<Date>(new Date());
  
  // Shuffle answers for current question
  const [shuffledAnswers, setShuffledAnswers] = useState<string[]>([]);
  
  // Sound warning refs
  const warned5min = useRef(false);
  const warned1min = useRef(false);

  // Timer
  useEffect(() => {
    if (!examStarted || isFinished || settings.timeLimit === 0) return;
    
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          finishExamRef.current();
          return 0;
        }
        
        // Sound warnings
        if (prev === 300 && !warned5min.current) {
          warned5min.current = true;
          toast({
            title: language === 'ru' ? '⏰ Осталось 5 минут!' : '⏰ 5 λεπτά απομένουν!',
            variant: 'default',
          });
        }
        if (prev === 60 && !warned1min.current) {
          warned1min.current = true;
          toast({
            title: language === 'ru' ? '⚠️ Осталась 1 минута!' : '⚠️ 1 λεπτό απομένει!',
            variant: 'destructive',
          });
        }
        
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [examStarted, isFinished, settings.timeLimit, language, toast]);

  // Track time per question
  useEffect(() => {
    if (examStarted && !isFinished) {
      const now = new Date();
      const timeSpentOnPrev = Math.floor((now.getTime() - lastQuestionTime.current.getTime()) / 1000);
      
      if (currentIndex > 0 || Object.keys(questionTimes).length > 0) {
        setQuestionTimes(prev => ({
          ...prev,
          [currentIndex - 1]: (prev[currentIndex - 1] || 0) + timeSpentOnPrev
        }));
      }
      
      lastQuestionTime.current = now;
    }
  }, [currentIndex, examStarted, isFinished]);

  // Shuffle answers when question changes
  useEffect(() => {
    if (questions.length > 0 && currentIndex < questions.length) {
      const current = questions[currentIndex];
      const allAnswers = [current.correct_answer, ...current.wrong_answers];
      setShuffledAnswers(shuffleArray(allAnswers));
    }
  }, [currentIndex, questions]);

  const handleTopicToggle = (topic: QuestionTopic) => {
    setSettings(prev => {
      const newTopics = prev.topics.includes(topic)
        ? prev.topics.filter(t => t !== topic)
        : [...prev.topics, topic];
      
      // Ensure at least one topic is selected
      if (newTopics.length === 0) return prev;
      
      return { ...prev, topics: newTopics };
    });
  };

  const startExam = async () => {
    if (settings.topics.length === 0) {
      toast({
        title: language === 'ru' ? 'Выберите хотя бы одну тему' : 'Επιλέξτε τουλάχιστον ένα θέμα',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    
    let query = supabase.from('questions').select('*');
    
    if (settings.topics.length < TOPICS.length) {
      query = query.in('topic', settings.topics);
    }
    
    const { data, error } = await query;

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

    const minQuestions = settings.questionCount === 0 ? 1 : Math.min(settings.questionCount, data?.length || 0);
    
    if (!data || data.length < minQuestions) {
      toast({
        title: language === 'ru' ? 'Недостаточно вопросов' : 'Ανεπαρκείς ερωτήσεις',
        description: language === 'ru' 
          ? `Найдено только ${data?.length || 0} вопросов по выбранным темам` 
          : `Βρέθηκαν μόνο ${data?.length || 0} ερωτήσεις για τα επιλεγμένα θέματα`,
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    // Shuffle and take required number of questions
    const shuffledQuestions = shuffleArray(data);
    const selectedQuestions = settings.questionCount === 0 
      ? shuffledQuestions 
      : shuffledQuestions.slice(0, settings.questionCount);
    
    setQuestions(localizeQuestions(selectedQuestions, language));
    setExamStarted(true);
    setStartTime(new Date());
    lastQuestionTime.current = new Date();
    setTimeLeft(settings.timeLimit * 60);
    warned5min.current = false;
    warned1min.current = false;
    setIsLoading(false);
  };

  const calculateResults = useCallback((timesOverride?: Record<number, number>) => {
    const effectiveTimes = timesOverride ?? questionTimes;
    const questionsData: QuestionData[] = questions.map((q, index) => ({
      question_id: q.id,
      user_answer: answers[index] || null,
      is_correct: answers[index] === q.correct_answer,
      time_spent: effectiveTimes[index] || 0,
      topic: q.topic,
    }));

    const topicsBreakdown: TopicsBreakdown = {};
    questions.forEach((q, index) => {
      if (!topicsBreakdown[q.topic]) {
        topicsBreakdown[q.topic] = { total: 0, correct: 0 };
      }
      topicsBreakdown[q.topic].total += 1;
      if (answers[index] === q.correct_answer) {
        topicsBreakdown[q.topic].correct += 1;
      }
    });

    const score = questionsData.filter(q => q.is_correct).length;
    const timeSpent = startTime ? Math.floor((new Date().getTime() - startTime.getTime()) / 1000) : 0;

    return { questionsData, topicsBreakdown, score, timeSpent };
  }, [questions, answers, questionTimes, startTime]);

  const finishExam = useCallback(async () => {
    // Track time for last question — compute locally so calculateResults gets fresh data
    // (setQuestionTimes is async and the state wouldn't be ready in time)
    const now = new Date();
    const timeSpentOnLast = Math.floor((now.getTime() - lastQuestionTime.current.getTime()) / 1000);
    const finalQuestionTimes = {
      ...questionTimes,
      [currentIndex]: (questionTimes[currentIndex] || 0) + timeSpentOnLast,
    };
    setQuestionTimes(finalQuestionTimes);

    setIsFinished(true);
    setShowFinishDialog(false);

    const { questionsData, topicsBreakdown, score, timeSpent } = calculateResults(finalQuestionTimes);
    
    // Save result to database
    if (user) {
      const { error } = await supabase.from('exam_results').insert({
        user_id: user.id,
        total_questions: questions.length,
        correct_answers: score,
        time_spent_seconds: timeSpent,
        questions_data: questionsData as unknown as Json,
        topics_breakdown: topicsBreakdown as unknown as Json,
        flagged_count: flagged.size,
        selected_topics: settings.topics,
        question_count: questions.length,
      });
      
      if (error) {
        console.error('Error saving exam result:', error);
      }
    }
  }, [questions, calculateResults, user, flagged, settings.topics, currentIndex]);

  // Keep a ref so the timer interval always calls the latest finishExam
  const finishExamRef = useRef(finishExam);
  useEffect(() => { finishExamRef.current = finishExam; }, [finishExam]);

  const handleFinishClick = () => {
    const unanswered = questions.length - Object.keys(answers).length;
    if (unanswered > 0) {
      setShowFinishDialog(true);
    } else {
      finishExam();
    }
  };

  const handleAnswer = (answer: string) => {
    setAnswers(prev => ({ ...prev, [currentIndex]: answer }));
  };

  const handleToggleFlag = () => {
    setFlagged(prev => {
      const newSet = new Set(prev);
      if (newSet.has(currentIndex)) {
        newSet.delete(currentIndex);
      } else {
        newSet.add(currentIndex);
      }
      return newSet;
    });
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
    setFlagged(new Set());
    setQuestionTimes({});
    setIsFinished(false);
    setTimeLeft(0);
    setStartTime(null);
  };

  const handlePracticeErrors = () => {
    const incorrectQuestions = questions.filter((q, index) => answers[index] !== q.correct_answer);
    if (incorrectQuestions.length === 0) {
      toast({
        title: language === 'ru' ? 'Нет ошибок!' : 'Δεν υπάρχουν λάθη!',
        description: language === 'ru' ? 'Вы ответили правильно на все вопросы' : 'Απαντήσατε σωστά σε όλες τις ερωτήσεις',
      });
      return;
    }
    
    setQuestions(incorrectQuestions);
    setCurrentIndex(0);
    setAnswers({});
    setFlagged(new Set());
    setQuestionTimes({});
    setIsFinished(false);
    setTimeLeft(settings.timeLimit * 60);
    setStartTime(new Date());
    lastQuestionTime.current = new Date();
    warned5min.current = false;
    warned1min.current = false;
  };

  const handleExportResults = () => {
    const { questionsData, topicsBreakdown, score, timeSpent } = calculateResults();
    const percentage = Math.round((score / questions.length) * 100);
    
    let text = language === 'ru' 
      ? `РЕЗУЛЬТАТЫ ЭКЗАМЕНА\n${'='.repeat(40)}\n\n`
      : `ΑΠΟΤΕΛΕΣΜΑΤΑ ΕΞΕΤΑΣΗΣ\n${'='.repeat(40)}\n\n`;
    
    text += language === 'ru'
      ? `Дата: ${new Date().toLocaleString('ru-RU')}\n`
      : `Ημερομηνία: ${new Date().toLocaleString('el-GR')}\n`;
    
    text += language === 'ru'
      ? `Результат: ${score}/${questions.length} (${percentage}%)\n`
      : `Αποτέλεσμα: ${score}/${questions.length} (${percentage}%)\n`;
    
    text += language === 'ru'
      ? `Время: ${formatTime(timeSpent)}\n\n`
      : `Χρόνος: ${formatTime(timeSpent)}\n\n`;
    
    text += language === 'ru' 
      ? `СТАТИСТИКА ПО ТЕМАМ\n${'-'.repeat(30)}\n`
      : `ΣΤΑΤΙΣΤΙΚΑ ΑΝΑ ΘΕΜΑ\n${'-'.repeat(30)}\n`;
    
    Object.entries(topicsBreakdown).forEach(([topic, data]) => {
      const topicName = t(`topic.${topic}`);
      text += `${topicName}: ${data.correct}/${data.total}\n`;
    });
    
    text += language === 'ru' 
      ? `\nДЕТАЛИ ОТВЕТОВ\n${'-'.repeat(30)}\n`
      : `\nΛΕΠΤΟΜΕΡΕΙΕΣ ΑΠΑΝΤΗΣΕΩΝ\n${'-'.repeat(30)}\n`;
    
    questions.forEach((q, index) => {
      const isCorrect = answers[index] === q.correct_answer;
      const icon = isCorrect ? '✓' : '✗';
      text += `\n${index + 1}. ${q.question}\n`;
      text += language === 'ru'
        ? `   ${icon} Ваш ответ: ${answers[index] || '(пропущен)'}\n`
        : `   ${icon} Η απάντησή σας: ${answers[index] || '(παραλείφθηκε)'}\n`;
      if (!isCorrect) {
        text += language === 'ru'
          ? `   Правильный ответ: ${q.correct_answer}\n`
          : `   Σωστή απάντηση: ${q.correct_answer}\n`;
      }
    });
    
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exam-results-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
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

  // Exam settings screen
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
                  ? 'Настройте параметры экзамена' 
                  : 'Ρυθμίστε τις παραμέτρους της εξέτασης'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Question count */}
              <div>
                <label className="text-sm font-medium mb-3 block">
                  {language === 'ru' ? 'Количество вопросов' : 'Αριθμός ερωτήσεων'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {QUESTION_OPTIONS.map(count => (
                    <button
                      key={count}
                      onClick={() => setSettings(s => ({ ...s, questionCount: count }))}
                      className={cn(
                        "p-3 rounded-lg border-2 transition-all text-center font-medium",
                        settings.questionCount === count
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      {count === 0 ? (language === 'ru' ? 'Все' : 'Όλες') : count}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time limit */}
              <div>
                <label className="text-sm font-medium mb-3 block">
                  {language === 'ru' ? 'Время (минут)' : 'Χρόνος (λεπτά)'}
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {TIME_OPTIONS.map(time => (
                    <button
                      key={time}
                      onClick={() => setSettings(s => ({ ...s, timeLimit: time }))}
                      className={cn(
                        "p-3 rounded-lg border-2 transition-all text-center font-medium",
                        settings.timeLimit === time
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      {time === 0 ? '∞' : time}
                    </button>
                  ))}
                </div>
              </div>

              {/* Topics */}
              <div>
                <label className="text-sm font-medium mb-3 block">
                  {language === 'ru' ? 'Темы' : 'Θέματα'}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {TOPICS.map(topic => (
                    <label
                      key={topic}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                        settings.topics.includes(topic)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <Checkbox
                        checked={settings.topics.includes(topic)}
                        onCheckedChange={() => handleTopicToggle(topic)}
                      />
                      <span className="font-medium">{t(`topic.${topic}`)}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <Target className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <div className="font-bold text-xl">
                    {settings.questionCount === 0 ? '∞' : settings.questionCount}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {language === 'ru' ? 'Вопросов' : 'Ερωτήσεις'}
                  </div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <Timer className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <div className="font-bold text-xl">
                    {settings.timeLimit === 0 ? '∞' : settings.timeLimit}
                  </div>
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
              <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong className="block mb-1">
                      {language === 'ru' ? 'Подсказки:' : 'Συμβουλές:'}
                    </strong>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>{language === 'ru' ? 'Используйте флажок для сомнительных вопросов' : 'Χρησιμοποιήστε τη σημαία για αμφίβολες ερωτήσεις'}</li>
                      <li>{language === 'ru' ? 'Можно пропускать и возвращаться' : 'Μπορείτε να παραλείψετε και να επιστρέψετε'}</li>
                      <li>{language === 'ru' ? 'Предупреждение за 5 и 1 минуту до конца' : 'Προειδοποίηση 5 και 1 λεπτό πριν το τέλος'}</li>
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
    const { topicsBreakdown, score, timeSpent } = calculateResults();
    const percentage = Math.round((score / questions.length) * 100);
    const passed = percentage >= PASSING_SCORE;
    const avgTimePerQuestion = Math.round(timeSpent / questions.length);
    
    // Find weak topics
    const weakTopics = Object.entries(topicsBreakdown)
      .filter(([_, data]) => data.total > 0 && (data.correct / data.total) < 0.7)
      .map(([topic]) => topic);
    
    return (
      <Layout>
        <div className="container py-12">
          <Card className="max-w-4xl mx-auto">
            <CardHeader className="text-center">
              <div className={cn(
                "mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4",
                passed ? "bg-green-100 dark:bg-green-900" : "bg-red-100 dark:bg-red-900"
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
              <div className="flex flex-col items-center gap-2">
                <div className={cn(
                  "w-32 h-32 rounded-full flex items-center justify-center mx-auto text-4xl font-bold",
                  passed ? "bg-green-100 dark:bg-green-900 text-green-600" : "bg-red-100 dark:bg-red-900 text-red-600"
                )}>
                  {percentage}%
                </div>
                {lastExamScore != null && (
                  <div className={cn(
                    "flex items-center gap-1 text-sm font-medium px-3 py-1 rounded-full",
                    percentage > lastExamScore
                      ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400"
                      : percentage < lastExamScore
                      ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400"
                      : "bg-muted text-muted-foreground",
                  )}>
                    {percentage > lastExamScore
                      ? `▲ +${percentage - lastExamScore}%`
                      : percentage < lastExamScore
                      ? `▼ ${percentage - lastExamScore}%`
                      : '= '}
                    <span className="opacity-70 text-xs ml-1">
                      {language === 'ru' ? 'vs прошлый' : 'vs προηγ.'}
                      {' '}{lastExamScore}%
                    </span>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-4 text-center">
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
                  <div className="text-2xl font-bold">{avgTimePerQuestion}с</div>
                  <div className="text-sm text-muted-foreground">
                    {language === 'ru' ? 'Сек/вопрос' : 'Δευτ/ερώτηση'}
                  </div>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{flagged.size}</div>
                  <div className="text-sm text-muted-foreground">
                    {language === 'ru' ? 'Отмечено' : 'Επισημάνθηκαν'}
                  </div>
                </div>
              </div>

              {/* Topics breakdown */}
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  {language === 'ru' ? 'Статистика по темам' : 'Στατιστικά ανά θέμα'}
                </h3>
                <div className="space-y-3">
                  {Object.entries(topicsBreakdown).map(([topic, data]) => {
                    const topicPercent = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
                    return (
                      <div key={topic}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{t(`topic.${topic}`)}</span>
                          <span className={cn(
                            "font-medium",
                            topicPercent >= 70 ? "text-green-600" : "text-red-600"
                          )}>
                            {data.correct}/{data.total} ({topicPercent}%)
                          </span>
                        </div>
                        <Progress value={topicPercent} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Weak topics recommendation */}
              {weakTopics.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-800 dark:text-yellow-200">
                      <strong className="block mb-1">
                        {language === 'ru' ? 'Рекомендуется повторить:' : 'Συνιστάται επανάληψη:'}
                      </strong>
                      <ul className="list-disc pl-4">
                        {weakTopics.map(topic => (
                          <li key={topic}>{t(`topic.${topic}`)}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Review answers */}
              <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
                {questions.map((q, index) => {
                  const isCorrect = answers[index] === q.correct_answer;
                  const wasFlagged = flagged.has(index);
                  return (
                    <div key={q.id} className={cn(
                      "p-4",
                      isCorrect ? "bg-green-50 dark:bg-green-950" : "bg-red-50 dark:bg-red-950"
                    )}>
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                          isCorrect ? "bg-green-100 dark:bg-green-900 text-green-600" : "bg-red-100 dark:bg-red-900 text-red-600"
                        )}>
                          {isCorrect ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs px-2 py-0.5 bg-muted rounded">{t(`topic.${q.topic}`)}</span>
                            {wasFlagged && <Flag className="h-3 w-3 text-orange-500" />}
                          </div>
                          <p className="font-medium text-base mb-1">{q.question}</p>
                          {answers[index] && (
                            <p className={cn(
                              "text-sm",
                              isCorrect ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"
                            )}>
                              {language === 'ru' ? 'Ваш ответ:' : 'Η απάντησή σας:'} {answers[index]}
                            </p>
                          )}
                          {!isCorrect && (
                            <p className="text-sm text-muted-foreground mt-1">
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
              <div className="flex flex-wrap gap-3 justify-center pt-4">
                <Button variant="outline" onClick={handlePracticeErrors}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {language === 'ru' ? 'Повторить ошибки' : 'Επανάληψη λαθών'}
                </Button>
                <Button variant="outline" onClick={handleExportResults}>
                  <Download className="h-4 w-4 mr-2" />
                  {language === 'ru' ? 'Экспорт' : 'Εξαγωγή'}
                </Button>
                <Button variant="outline" onClick={handleRestart}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {language === 'ru' ? 'Новый экзамен' : 'Νέα εξέταση'}
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
  const isLowTime = settings.timeLimit > 0 && timeLeft <= 300;
  const isFlagged = flagged.has(currentIndex);

  return (
    <Layout>
      <div className="container py-6">
        {/* Finish confirmation dialog */}
        <AlertDialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {language === 'ru' ? 'Завершить экзамен?' : 'Ολοκλήρωση εξέτασης;'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {language === 'ru' 
                  ? `У вас есть ${questions.length - answeredCount} неотвеченных вопросов. Вы уверены, что хотите завершить?`
                  : `Έχετε ${questions.length - answeredCount} αναπάντητες ερωτήσεις. Είστε σίγουροι ότι θέλετε να ολοκληρώσετε;`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{language === 'ru' ? 'Отмена' : 'Ακύρωση'}</AlertDialogCancel>
              <AlertDialogAction onClick={finishExam}>
                {language === 'ru' ? 'Завершить' : 'Ολοκλήρωση'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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
          {settings.timeLimit > 0 && (
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-bold",
              isLowTime ? "bg-red-100 dark:bg-red-900 text-red-600 animate-pulse" : "bg-muted"
            )}>
              <Clock className="h-5 w-5" />
              {formatTime(timeLeft)}
            </div>
          )}
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
          {questions.map((_, index) => {
            const isAnswered = answers[index] !== undefined;
            const isCurrentFlagged = flagged.has(index);
            const isCurrent = currentIndex === index;
            
            return (
              <button
                key={index}
                onClick={() => handleJumpToQuestion(index)}
                className={cn(
                  "w-10 h-10 rounded-lg text-sm font-medium transition-all relative",
                  isCurrent && "ring-2 ring-primary ring-offset-2",
                  isCurrentFlagged && "bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400",
                  !isCurrentFlagged && isAnswered && "bg-primary text-primary-foreground",
                  !isCurrentFlagged && !isAnswered && "bg-muted hover:bg-muted/80"
                )}
              >
                {index + 1}
                {isCurrentFlagged && (
                  <Flag className="h-3 w-3 absolute -top-1 -right-1 text-orange-500" />
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex gap-4 text-xs text-muted-foreground mb-6">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-muted"></div>
            <span>{language === 'ru' ? 'Не отвечен' : 'Αναπάντητη'}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-primary"></div>
            <span>{language === 'ru' ? 'Отвечен' : 'Απαντήθηκε'}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-orange-100 dark:bg-orange-900"></div>
            <span>{language === 'ru' ? 'Отмечен' : 'Επισημάνθηκε'}</span>
          </div>
        </div>

        {/* Question card */}
        <Card className="max-w-3xl mx-auto mb-6">
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="px-2 py-1 bg-muted rounded text-xs">
                  {t(`topic.${currentQuestion.topic}`)}
                </span>
                <span>
                  {language === 'ru' ? 'Вопрос' : 'Ερώτηση'} {currentIndex + 1} {language === 'ru' ? 'из' : 'από'} {questions.length}
                </span>
              </div>
              <Button
                variant={isFlagged ? "default" : "outline"}
                size="sm"
                onClick={handleToggleFlag}
                className={cn(isFlagged && "bg-orange-500 hover:bg-orange-600")}
              >
                <Flag className="h-4 w-4 mr-1" />
                {isFlagged 
                  ? (language === 'ru' ? 'Отмечен' : 'Επισημάνθηκε')
                  : (language === 'ru' ? 'Отметить' : 'Επισήμανση')}
              </Button>
            </div>
            <CardTitle className="font-display text-xl sm:text-2xl font-semibold leading-relaxed">
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
                      "w-full p-4 text-left rounded-lg border-2 transition-all text-base sm:text-lg font-medium",
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

          <Button 
            onClick={handleFinishClick}
            variant="outline"
            className="text-destructive hover:text-destructive"
          >
            {language === 'ru' ? 'Завершить экзамен' : 'Ολοκλήρωση εξέτασης'}
          </Button>

          <Button 
            onClick={handleNext}
            disabled={currentIndex === questions.length - 1}
          >
            {language === 'ru' ? 'Далее' : 'Επόμενο'}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </Layout>
  );
}
