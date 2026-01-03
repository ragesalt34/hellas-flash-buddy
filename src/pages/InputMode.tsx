import { useState, useEffect } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Send
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

function normalizeAnswer(answer: string): string {
  return answer
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:'"«»""'']/g, '')
    .replace(/\s+/g, ' ');
}

function checkAnswer(userAnswer: string, correctAnswer: string): boolean {
  const normalizedUser = normalizeAnswer(userAnswer);
  const normalizedCorrect = normalizeAnswer(correctAnswer);
  
  if (normalizedUser === normalizedCorrect) return true;
  
  // Allow minor differences (up to 2 characters for longer answers)
  if (normalizedCorrect.length > 5) {
    const distance = levenshteinDistance(normalizedUser, normalizedCorrect);
    return distance <= 2;
  }
  
  return false;
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

export default function InputMode() {
  const { topic } = useParams<{ topic: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFinished, setIsFinished] = useState(false);

  const validTopic = topic as TopicType;
  const validTopics = ['history', 'culture', 'laws', 'geography'];
  const isValidTopic = topic && validTopics.includes(topic);

  useEffect(() => {
    if (!isValidTopic || !user) return;

    const fetchQuestions = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('questions')
        .select('id, question, correct_answer, explanation')
        .eq('topic', validTopic)
        .limit(20);

      if (error) {
        console.error('Error fetching questions:', error);
      } else if (data && data.length > 0) {
        setQuestions(shuffleArray(data));
      }
      setIsLoading(false);
    };

    fetchQuestions();
  }, [validTopic, user, isValidTopic]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAnswer.trim() || isAnswered) return;
    
    const correct = checkAnswer(userAnswer, questions[currentIndex].correct_answer);
    setIsCorrect(correct);
    setIsAnswered(true);
    
    if (correct) {
      setScore(prev => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setUserAnswer('');
      setIsAnswered(false);
      setIsCorrect(false);
    } else {
      setIsFinished(true);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setUserAnswer('');
    setIsAnswered(false);
    setIsCorrect(false);
    setScore(0);
    setIsFinished(false);
    setQuestions(shuffleArray(questions));
  };

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
          <Card className="max-w-2xl mx-auto text-center">
            <CardContent className="py-12">
              <h2 className="text-2xl font-display font-bold mb-4">
                {t('quiz.noQuestions')}
              </h2>
              <p className="text-muted-foreground mb-6">
                {t('quiz.noQuestions.desc')}
              </p>
              <Link to="/learn">
                <Button>
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
    const percentage = Math.round((score / questions.length) * 100);
    
    return (
      <Layout>
        <div className="container py-12">
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="font-display text-3xl">
                {t('quiz.finished')}
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
                  {t('quiz.correctAnswers')} {score} {t('quiz.of')} {questions.length}
                </p>
                <p className="text-muted-foreground mt-2">
                  {percentage >= 70 ? t('quiz.result.great') : 
                   percentage >= 50 ? t('quiz.result.good') : 
                   t('quiz.result.practice')}
                </p>
              </div>

              <div className="flex gap-4 justify-center pt-4">
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
            {t('quiz.backToTopics')}
          </Link>
          <h1 className="font-display text-2xl font-bold">{topicTitle} — {t('mode.input')}</h1>
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
            {/* Input Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Input
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder={t('input.placeholder')}
                  disabled={isAnswered}
                  className={cn(
                    "pr-12 text-lg py-6",
                    isAnswered && isCorrect && "border-green-500 bg-green-50",
                    isAnswered && !isCorrect && "border-red-500 bg-red-50"
                  )}
                  autoFocus
                />
                {!isAnswered && (
                  <Button 
                    type="submit" 
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    disabled={!userAnswer.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </form>

            {/* Result */}
            {isAnswered && (
              <div className={cn(
                "p-4 rounded-lg flex items-start gap-3",
                isCorrect ? "bg-green-50" : "bg-red-50"
              )}>
                {isCorrect ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p className={cn(
                    "font-medium",
                    isCorrect ? "text-green-700" : "text-red-700"
                  )}>
                    {isCorrect ? t('input.correct') : t('input.incorrect')}
                  </p>
                  {!isCorrect && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('input.correctAnswer')} <strong>{currentQuestion.correct_answer}</strong>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Explanation */}
            {isAnswered && currentQuestion.explanation && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>{t('quiz.explanation')}</strong> {currentQuestion.explanation}
                </p>
              </div>
            )}

            {/* Next Button */}
            {isAnswered && (
              <div className="flex justify-end pt-4">
                <Button onClick={handleNext} size="lg">
                  {currentIndex < questions.length - 1 ? (
                    <>
                      {t('quiz.nextQuestion')}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  ) : (
                    <>
                      {t('quiz.finishTest')}
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
          {t('quiz.correctAnswers')} {score}
        </div>
      </div>
    </Layout>
  );
}
