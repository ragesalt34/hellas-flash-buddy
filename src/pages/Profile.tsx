import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Trophy, Target, Clock, TrendingUp, ChevronDown, ChevronUp, BarChart3, CheckCircle2, XCircle, Flag } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

type TopicsBreakdown = {
  [topic: string]: { total: number; correct: number };
};

type QuestionData = {
  question_id: string;
  user_answer: string | null;
  is_correct: boolean;
  time_spent: number;
  topic: string;
};

export default function Profile() {
  const { user, isLoading: authLoading } = useAuth();
  const { language, t } = useLanguage();
  const [expandedExam, setExpandedExam] = useState<string | null>(null);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: examResults, isLoading: examsLoading } = useQuery({
    queryKey: ['exam-results', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exam_results')
        .select('*')
        .eq('user_id', user!.id)
        .order('completed_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ['user-progress', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user!.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const isDataLoading = profileLoading || examsLoading || progressLoading;

  if (authLoading || (user && isDataLoading)) {
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

  const knownCount = progress?.filter(p => p.is_known).length || 0;
  const totalCorrect = progress?.reduce((acc, p) => acc + p.correct_count, 0) || 0;
  const totalIncorrect = progress?.reduce((acc, p) => acc + p.incorrect_count, 0) || 0;
  const accuracy = totalCorrect + totalIncorrect > 0 
    ? Math.round((totalCorrect / (totalCorrect + totalIncorrect)) * 100) 
    : 0;

  const bestExam = examResults?.reduce((best, exam) => {
    const score = (exam.correct_answers / exam.total_questions) * 100;
    const bestScore = best ? (best.correct_answers / best.total_questions) * 100 : 0;
    return score > bestScore ? exam : best;
  }, null as typeof examResults[0] | null);

  const averageScore = examResults && examResults.length > 0
    ? Math.round(examResults.reduce((sum, exam) => 
        sum + (exam.correct_answers / exam.total_questions) * 100, 0
      ) / examResults.length)
    : 0;

  // Prepare chart data (last 10 exams, reversed for chronological order)
  const chartData = examResults
    ?.slice(0, 10)
    .reverse()
    .map((exam, index) => ({
      name: `#${index + 1}`,
      score: Math.round((exam.correct_answers / exam.total_questions) * 100),
      date: new Date(exam.completed_at).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'el-GR'),
    })) || [];

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Layout>
      <div className="container py-12">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground">
            {language === 'ru' ? 'Профиль' : 'Προφίλ'}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {profile?.display_name || user.email}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-4 mb-12">
          <Card className="animate-fade-in">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Target className="h-4 w-4" />
                <span className="text-sm">{language === 'ru' ? 'Изучено вопросов' : 'Ερωτήσεις που μάθατε'}</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">{knownCount}</p>
            </CardContent>
          </Card>

          <Card className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">{language === 'ru' ? 'Точность ответов' : 'Ακρίβεια απαντήσεων'}</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">{accuracy}%</p>
            </CardContent>
          </Card>

          <Card className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="text-sm">{language === 'ru' ? 'Пройдено экзаменов' : 'Εξετάσεις που ολοκληρώθηκαν'}</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">{examResults?.length || 0}</p>
            </CardContent>
          </Card>

          <Card className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Trophy className="h-4 w-4" />
                <span className="text-sm">{language === 'ru' ? 'Лучший результат' : 'Καλύτερο αποτέλεσμα'}</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">
                {bestExam 
                  ? `${Math.round((bestExam.correct_answers / bestExam.total_questions) * 100)}%`
                  : '—'
                }
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Progress Chart */}
        {chartData.length > 1 && (
          <Card className="mb-12 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                {language === 'ru' ? 'График прогресса' : 'Διάγραμμα προόδου'}
              </CardTitle>
              <CardDescription>
                {language === 'ru' 
                  ? `Средний балл: ${averageScore}% за последние ${chartData.length} экзаменов`
                  : `Μέση βαθμολογία: ${averageScore}% για τις τελευταίες ${chartData.length} εξετάσεις`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="name" 
                      className="text-xs fill-muted-foreground"
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      className="text-xs fill-muted-foreground"
                    />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-popover border rounded-lg p-2 shadow-lg">
                              <p className="font-medium">{payload[0].payload.date}</p>
                              <p className="text-primary">{payload[0].value}%</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Exam History */}
        <Card className="animate-fade-in" style={{ animationDelay: '0.5s' }}>
          <CardHeader>
            <CardTitle className="font-display">
              {language === 'ru' ? 'История экзаменов' : 'Ιστορικό εξετάσεων'}
            </CardTitle>
            <CardDescription>
              {language === 'ru' ? 'Все ваши результаты' : 'Όλα τα αποτελέσματά σας'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {examResults && examResults.length > 0 ? (
              <div className="space-y-3">
                {examResults.map((exam) => {
                  const percentage = Math.round((exam.correct_answers / exam.total_questions) * 100);
                  const passed = percentage >= 70;
                  const isExpanded = expandedExam === exam.id;
                  const topicsBreakdown = exam.topics_breakdown as TopicsBreakdown | null;
                  const questionsData = exam.questions_data as QuestionData[] | null;

                  return (
                    <div 
                      key={exam.id} 
                      className="border rounded-lg overflow-hidden"
                    >
                      {/* Summary row */}
                      <div 
                        className={cn(
                          "flex items-center justify-between p-4 cursor-pointer transition-colors",
                          passed ? "bg-green-50 dark:bg-green-950" : "bg-red-50 dark:bg-red-950",
                          "hover:bg-opacity-80"
                        )}
                        onClick={() => setExpandedExam(isExpanded ? null : exam.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center",
                            passed ? "bg-green-100 dark:bg-green-900" : "bg-red-100 dark:bg-red-900"
                          )}>
                            {passed ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">
                              {new Date(exam.completed_at).toLocaleDateString(
                                language === 'ru' ? 'ru-RU' : 'el-GR',
                                { day: 'numeric', month: 'long', year: 'numeric' }
                              )}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {exam.selected_topics?.length === 4 || !exam.selected_topics
                                ? (language === 'ru' ? 'Все темы' : 'Όλα τα θέματα')
                                : exam.selected_topics.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(', ')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className={cn(
                              "text-xl font-bold",
                              passed ? "text-green-600" : "text-red-600"
                            )}>
                              {percentage}%
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {exam.correct_answers}/{exam.total_questions}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span className="text-sm">{formatTime(exam.time_spent_seconds)}</span>
                          </div>
                          {exam.flagged_count && exam.flagged_count > 0 && (
                            <div className="flex items-center gap-1 text-orange-500">
                              <Flag className="h-4 w-4" />
                              <span className="text-sm">{exam.flagged_count}</span>
                            </div>
                          )}
                          <Button variant="ghost" size="sm">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="p-4 border-t bg-background">
                          {/* Topics breakdown */}
                          {topicsBreakdown && Object.keys(topicsBreakdown).length > 0 && (
                            <div className="mb-4">
                              <h4 className="font-medium mb-3 text-sm">
                                {language === 'ru' ? 'По темам:' : 'Ανά θέμα:'}
                              </h4>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {Object.entries(topicsBreakdown).map(([topic, data]) => {
                                  const topicPercent = data.total > 0 
                                    ? Math.round((data.correct / data.total) * 100) 
                                    : 0;
                                  return (
                                    <div key={topic} className="bg-muted rounded-lg p-3">
                                      <p className="text-xs text-muted-foreground mb-1">
                                        {t(`topic.${topic}`)}
                                      </p>
                                      <p className={cn(
                                        "font-bold",
                                        topicPercent >= 70 ? "text-green-600" : "text-red-600"
                                      )}>
                                        {data.correct}/{data.total} ({topicPercent}%)
                                      </p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Questions list */}
                          {questionsData && questionsData.length > 0 && (
                            <div>
                              <h4 className="font-medium mb-3 text-sm">
                                {language === 'ru' ? 'Детали ответов:' : 'Λεπτομέρειες απαντήσεων:'}
                              </h4>
                              <div className="max-h-[200px] overflow-y-auto space-y-1">
                                {questionsData.map((q, idx) => (
                                  <div 
                                    key={idx}
                                    className={cn(
                                      "flex items-center gap-2 p-2 rounded text-sm",
                                      q.is_correct ? "bg-green-50 dark:bg-green-950" : "bg-red-50 dark:bg-red-950"
                                    )}
                                  >
                                    <span className={cn(
                                      "w-5 h-5 rounded-full flex items-center justify-center text-xs",
                                      q.is_correct ? "bg-green-100 dark:bg-green-900 text-green-600" : "bg-red-100 dark:bg-red-900 text-red-600"
                                    )}>
                                      {q.is_correct ? '✓' : '✗'}
                                    </span>
                                    <span className="text-xs px-1.5 py-0.5 bg-muted rounded">
                                      {t(`topic.${q.topic}`)}
                                    </span>
                                    <span className="text-muted-foreground">
                                      {q.time_spent > 0 ? `${q.time_spent}с` : '—'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>{language === 'ru' ? 'Нет завершённых экзаменов' : 'Δεν υπάρχουν ολοκληρωμένες εξετάσεις'}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
