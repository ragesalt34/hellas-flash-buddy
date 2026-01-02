import { Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Trophy, Target, Clock, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function Profile() {
  const { user, isLoading: authLoading } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const { data: examResults } = useQuery({
    queryKey: ['exam-results', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('exam_results')
        .select('*')
        .eq('user_id', user!.id)
        .order('completed_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: progress } = useQuery({
    queryKey: ['user-progress', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user!.id);
      return data || [];
    },
    enabled: !!user,
  });

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

  const knownCount = progress?.filter(p => p.is_known).length || 0;
  const totalAnswered = progress?.length || 0;
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

  return (
    <Layout>
      <div className="container py-12">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground">
            Профиль
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
                <span className="text-sm">Изучено вопросов</span>
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
                <span className="text-sm">Точность ответов</span>
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
                <span className="text-sm">Пройдено тестов</span>
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
                <span className="text-sm">Лучший результат</span>
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

        {/* Progress by Topic */}
        <Card className="mb-12 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <CardHeader>
            <CardTitle className="font-display">Прогресс по темам</CardTitle>
            <CardDescription>Ваши достижения в каждой категории</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {[
              { id: 'history', name: 'История', color: 'bg-history' },
              { id: 'culture', name: 'Культура', color: 'bg-culture' },
              { id: 'laws', name: 'Законы', color: 'bg-laws' },
            ].map((topic) => {
              const topicProgress = progress?.filter(p => {
                // We'd need to join with questions to get topic, for now show placeholder
                return true;
              }) || [];
              const percentage = Math.min(Math.round((topicProgress.length / 100) * 100), 100);
              
              return (
                <div key={topic.id}>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">{topic.name}</span>
                    <span className="text-sm text-muted-foreground">{percentage}%</span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Recent Exams */}
        {examResults && examResults.length > 0 && (
          <Card className="animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <CardHeader>
              <CardTitle className="font-display">Последние экзамены</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {examResults.slice(0, 5).map((exam) => (
                  <div 
                    key={exam.id} 
                    className="flex items-center justify-between p-4 rounded-lg bg-secondary/50"
                  >
                    <div>
                      <p className="font-medium">
                        {exam.topic ? exam.topic.charAt(0).toUpperCase() + exam.topic.slice(1) : 'Все темы'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(exam.completed_at).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">
                        {exam.correct_answers}/{exam.total_questions}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {Math.round((exam.correct_answers / exam.total_questions) * 100)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
