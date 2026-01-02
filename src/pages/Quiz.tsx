import { useState, useEffect } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Loader2, 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  ArrowRight,
  RotateCcw,
  Home
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Question = {
  id: string;
  question: string;
  correct_answer: string;
  wrong_answers: string[];
  explanation: string | null;
};

type TopicType = 'history' | 'culture' | 'laws' | 'geography';

const topicLabels: Record<TopicType, string> = {
  history: 'История Греции',
  culture: 'Культура и традиции',
  laws: 'Законы и политика',
  geography: 'География Греции',
};

const topicColors: Record<TopicType, string> = {
  history: 'history',
  culture: 'culture',
  laws: 'laws',
  geography: 'geography',
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
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [shuffledAnswers, setShuffledAnswers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFinished, setIsFinished] = useState(false);

  const validTopic = topic as TopicType;
  const isValidTopic = topic && Object.keys(topicLabels).includes(topic);

  useEffect(() => {
    if (!isValidTopic || !user) return;

    const fetchQuestions = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('topic', validTopic)
        .limit(20);

      if (error) {
        console.error('Error fetching questions:', error);
      } else if (data && data.length > 0) {
        const shuffledQuestions = shuffleArray(data);
        setQuestions(shuffledQuestions);
      }
      setIsLoading(false);
    };

    fetchQuestions();
  }, [validTopic, user, isValidTopic]);

  useEffect(() => {
    if (questions.length > 0 && currentIndex < questions.length) {
      const current = questions[currentIndex];
      const allAnswers = [current.correct_answer, ...current.wrong_answers];
      setShuffledAnswers(shuffleArray(allAnswers));
    }
  }, [currentIndex, questions]);

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

  const handleAnswer = (answer: string) => {
    if (isAnswered) return;
    
    setSelectedAnswer(answer);
    setIsAnswered(true);
    
    if (answer === questions[currentIndex].correct_answer) {
      setScore(prev => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    } else {
      setIsFinished(true);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setScore(0);
    setIsFinished(false);
    setQuestions(shuffleArray(questions));
  };

  const topicColor = topicColors[validTopic];
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

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
          <Card className="max-w-2xl mx-auto text-center">
            <CardContent className="py-12">
              <h2 className="text-2xl font-display font-bold mb-4">
                Вопросов пока нет
              </h2>
              <p className="text-muted-foreground mb-6">
                В теме "{topicLabels[validTopic]}" пока нет вопросов. 
                Администратор может добавить их в панели управления.
              </p>
              <Link to="/learn">
                <Button>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Вернуться к темам
                </Button>
              </Link>
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
        <div className="container py-12">
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="font-display text-3xl">
                Тест завершён!
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <div className={cn(
                "w-32 h-32 rounded-full flex items-center justify-center mx-auto text-4xl font-bold",
                percentage >= 70 ? "bg-green-100 text-green-600" : 
                percentage >= 50 ? "bg-yellow-100 text-yellow-600" : 
                "bg-red-100 text-red-600"
              )}>
                {percentage}%
              </div>
              
              <div>
                <p className="text-xl font-medium">
                  Правильных ответов: {score} из {questions.length}
                </p>
                <p className="text-muted-foreground mt-2">
                  {percentage >= 70 ? "Отличный результат!" : 
                   percentage >= 50 ? "Хороший результат, но есть куда расти!" : 
                   "Нужно больше практики!"}
                </p>
              </div>

              <div className="flex gap-4 justify-center pt-4">
                <Button variant="outline" onClick={handleRestart}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Пройти снова
                </Button>
                <Link to="/learn">
                  <Button>
                    <Home className="h-4 w-4 mr-2" />
                    К темам
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
      <div className="container py-8">
        {/* Header */}
        <div className="mb-8">
          <Link to="/learn" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад к темам
          </Link>
          <h1 className="font-display text-2xl font-bold">{topicLabels[validTopic]}</h1>
          <div className="flex items-center gap-4 mt-4">
            <Progress value={progress} className="flex-1" />
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {currentIndex + 1} / {questions.length}
            </span>
          </div>
        </div>

        {/* Question Card */}
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle className="font-display text-xl leading-relaxed">
              {currentQuestion.question}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Answer Options */}
            <div className="grid gap-3">
              {shuffledAnswers.map((answer, index) => {
                const isCorrect = answer === currentQuestion.correct_answer;
                const isSelected = answer === selectedAnswer;
                
                return (
                  <button
                    key={index}
                    onClick={() => handleAnswer(answer)}
                    disabled={isAnswered}
                    className={cn(
                      "w-full p-4 text-left rounded-lg border-2 transition-all",
                      "hover:border-primary/50 hover:bg-accent/50",
                      !isAnswered && "cursor-pointer",
                      isAnswered && isCorrect && "border-green-500 bg-green-50",
                      isAnswered && isSelected && !isCorrect && "border-red-500 bg-red-50",
                      !isAnswered && isSelected && "border-primary bg-primary/5"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span>{answer}</span>
                      {isAnswered && isCorrect && (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      )}
                      {isAnswered && isSelected && !isCorrect && (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Explanation */}
            {isAnswered && currentQuestion.explanation && (
              <div className="p-4 bg-muted rounded-lg mt-4">
                <p className="text-sm text-muted-foreground">
                  <strong>Объяснение:</strong> {currentQuestion.explanation}
                </p>
              </div>
            )}

            {/* Next Button */}
            {isAnswered && (
              <div className="flex justify-end pt-4">
                <Button onClick={handleNext} size="lg">
                  {currentIndex < questions.length - 1 ? (
                    <>
                      Следующий вопрос
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  ) : (
                    <>
                      Завершить тест
                      <CheckCircle2 className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Score indicator */}
        <div className="text-center mt-6 text-muted-foreground">
          Правильных ответов: {score}
        </div>
      </div>
    </Layout>
  );
}
