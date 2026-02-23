import { Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Trophy, Target, TrendingUp, Flame, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { StudyTimeWidget } from '@/components/StudyTimeWidget';
import { cn } from '@/lib/utils';

export default function Stats() {
  const { user, isLoading: authLoading } = useAuth();
  const { language, t } = useLanguage();

  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ['user-progress-stats', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_progress')
        .select('*, questions(topic)')
        .eq('user_id', user!.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: examResults, isLoading: examsLoading } = useQuery({
    queryKey: ['exam-results-stats', user?.id],
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

  const { data: studySessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['study-sessions-stats', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', user!.id)
        .order('started_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const isDataLoading = progressLoading || examsLoading || sessionsLoading;

  if (authLoading || (user && isDataLoading)) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Overall stats
  const knownCount = progress?.filter(p => p.is_known).length || 0;
  const totalCorrect = progress?.reduce((acc, p) => acc + p.correct_count, 0) || 0;
  const totalIncorrect = progress?.reduce((acc, p) => acc + p.incorrect_count, 0) || 0;
  const totalAnswered = totalCorrect + totalIncorrect;
  const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

  // Study streak
  const calculateStreak = (): number => {
    if (!studySessions || studySessions.length === 0) return 0;
    const uniqueDays = new Set(
      studySessions.map(s => {
        const d = new Date(s.started_at);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      })
    );
    const sortedDays = Array.from(uniqueDays).sort().reverse();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    let streak = 0;
    const checkDate = new Date(today);
    // Allow starting from today or yesterday
    if (!uniqueDays.has(todayStr)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }
    
    while (true) {
      const dateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
      if (uniqueDays.has(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  };
  const streak = calculateStreak();

  // Accuracy by topic
  const topicStats: Record<string, { correct: number; total: number }> = {};
  progress?.forEach(p => {
    const topic = (p.questions as any)?.topic || 'unknown';
    if (!topicStats[topic]) topicStats[topic] = { correct: 0, total: 0 };
    topicStats[topic].correct += p.correct_count;
    topicStats[topic].total += p.correct_count + p.incorrect_count;
  });

  const topicChartData = Object.entries(topicStats)
    .filter(([topic]) => topic !== 'unknown')
    .map(([topic, data]) => ({
      topic: t(`topic.${topic}`),
      accuracy: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
    }));

  // Exam chart data
  const examChartData = examResults
    ?.slice(0, 10)
    .reverse()
    .map((exam, index) => ({
      name: `#${index + 1}`,
      score: Math.round((exam.correct_answers / exam.total_questions) * 100),
      date: new Date(exam.completed_at).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'el-GR'),
    })) || [];

  // Recent activity (last 7 days)
  const recentActivity = (() => {
    if (!studySessions) return [];
    const days: Record<string, { date: string; minutes: number; types: Set<string> }> = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days[key] = { date: d.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'el-GR', { weekday: 'short', day: 'numeric' }), minutes: 0, types: new Set() };
    }
    studySessions.forEach(s => {
      const d = new Date(s.started_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (days[key]) {
        days[key].minutes += Math.round(s.duration_seconds / 60);
        days[key].types.add(s.activity_type);
      }
    });
    return Object.values(days);
  })();

  return (
    <Layout>
      <div className="relative container py-8 sm:py-12 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-[400px] h-[400px] rounded-full aurora-blob" />

        <div className="relative mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground">
            {language === 'ru' ? 'Статистика' : 'Στατιστικά'}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {language === 'ru' ? 'Ваш прогресс обучения' : 'Η πρόοδος της μάθησής σας'}
          </p>
        </div>

        {/* Summary Cards */}
        <div className="relative grid gap-4 sm:gap-6 grid-cols-2 md:grid-cols-4 mb-10">
          <Card className="liquid-glass-card animate-fade-in">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="p-2 rounded-lg liquid-glass-button">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm">{language === 'ru' ? 'Точность' : 'Ακρίβεια'}</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">{accuracy}%</p>
              <p className="text-xs text-muted-foreground mt-1">{totalAnswered} {language === 'ru' ? 'ответов' : 'απαντήσεις'}</p>
            </CardContent>
          </Card>

          <Card className="liquid-glass-card animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="p-2 rounded-lg liquid-glass-button">
                  <Target className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm">{language === 'ru' ? 'Изучено' : 'Μάθατε'}</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">{knownCount}</p>
              <p className="text-xs text-muted-foreground mt-1">{language === 'ru' ? 'вопросов' : 'ερωτήσεις'}</p>
            </CardContent>
          </Card>

          <Card className="liquid-glass-card animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="p-2 rounded-lg liquid-glass-button">
                  <Flame className="h-4 w-4 text-accent" />
                </div>
                <span className="text-sm">{language === 'ru' ? 'Серия дней' : 'Σερί ημερών'}</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">{streak}</p>
              <p className="text-xs text-muted-foreground mt-1">{language === 'ru' ? 'подряд' : 'συνεχόμενες'}</p>
            </CardContent>
          </Card>

          <Card className="liquid-glass-card animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="p-2 rounded-lg liquid-glass-button">
                  <Trophy className="h-4 w-4 text-accent" />
                </div>
                <span className="text-sm">{language === 'ru' ? 'Экзаменов' : 'Εξετάσεις'}</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">{examResults?.length || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">{language === 'ru' ? 'пройдено' : 'ολοκληρώθηκαν'}</p>
            </CardContent>
          </Card>
        </div>

        {/* Study Time */}
        <div className="mb-10">
          <StudyTimeWidget />
        </div>

        {/* Topic Accuracy Chart */}
        {topicChartData.length > 0 && (
          <Card className="relative mb-10 liquid-glass-card animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <div className="p-2 rounded-lg liquid-glass-button">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                {language === 'ru' ? 'Точность по темам' : 'Ακρίβεια ανά θέμα'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topicChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="topic" className="text-xs fill-muted-foreground" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} className="text-xs fill-muted-foreground" />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="liquid-glass rounded-lg p-3 shadow-xl border border-primary/20">
                              <p className="font-medium">{payload[0].payload.topic}</p>
                              <p className="text-primary font-bold">{payload[0].value}%</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="accuracy" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Exam Progress Chart */}
        {examChartData.length > 1 && (
          <Card className="relative mb-10 liquid-glass-card animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <div className="p-2 rounded-lg liquid-glass-button">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                {language === 'ru' ? 'Прогресс экзаменов' : 'Πρόοδος εξετάσεων'}
              </CardTitle>
              <CardDescription>
                {language === 'ru'
                  ? `Последние ${examChartData.length} экзаменов`
                  : `Τελευταίες ${examChartData.length} εξετάσεις`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={examChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs fill-muted-foreground" />
                    <YAxis domain={[0, 100]} className="text-xs fill-muted-foreground" />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="liquid-glass rounded-lg p-3 shadow-xl border border-primary/20">
                              <p className="font-medium">{payload[0].payload.date}</p>
                              <p className="text-primary font-bold">{payload[0].value}%</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        <Card className="relative liquid-glass-card animate-fade-in" style={{ animationDelay: '0.6s' }}>
          <CardHeader>
            <CardTitle className="font-display">
              {language === 'ru' ? 'Активность за 7 дней' : 'Δραστηριότητα 7 ημερών'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {recentActivity.map((day, i) => (
                <div key={i} className="text-center">
                  <div
                    className={cn(
                      "w-full aspect-square rounded-lg flex items-center justify-center text-sm font-bold transition-all",
                      day.minutes > 0
                        ? "bg-primary/20 text-primary shadow-sm"
                        : "bg-muted/30 text-muted-foreground"
                    )}
                  >
                    {day.minutes > 0 ? `${day.minutes}м` : '—'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{day.date}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
