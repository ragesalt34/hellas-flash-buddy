import { Navigate, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Loader2, Trophy, Target, TrendingUp, Flame, BarChart3,
  AlertTriangle, BookOpen, ArrowRight, Clock, Languages,
} from 'lucide-react';
import { useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line,
} from 'recharts';
import { StudyTimeWidget } from '@/components/StudyTimeWidget';
import { cn } from '@/lib/utils';

const TOPICS = ['history', 'culture', 'laws', 'geography'] as const;
type TopicKey = typeof TOPICS[number];

export default function Stats() {
  const { user, isLoading: authLoading } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { toast } = useToast();

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ['user-progress-stats', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_progress')
        .select('*, questions(topic, question, question_el)')
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

  // Total questions in DB (for readiness %)
  const { data: allQuestions, isLoading: questionsLoading } = useQuery({
    queryKey: ['all-questions-count'],
    queryFn: async () => {
      const { data, error } = await supabase.from('questions').select('id, topic');
      if (error) throw error;
      return data || [];
    },
  });

  const isDataLoading = progressLoading || examsLoading || sessionsLoading || questionsLoading;

  // Streak milestone toasts — MUST be before any early returns (Rules of Hooks)
  useEffect(() => {
    if (!user || !studySessions || studySessions.length === 0) return;
    const uniqueDays = new Set(
      studySessions.map(s => {
        const d = new Date(s.started_at);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }),
    );
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    let s = 0;
    const checkDate = new Date(today);
    if (!uniqueDays.has(todayStr)) checkDate.setDate(checkDate.getDate() - 1);
    while (true) {
      const ds = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
      if (uniqueDays.has(ds)) { s++; checkDate.setDate(checkDate.getDate() - 1); } else break;
    }
    if (s === 0 || ![3, 7, 14, 30].includes(s)) return;
    const key = `streak_milestone_${user.id}_${s}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, '1');
    const msgs: Record<number, { ru: string; el: string }> = {
      3:  { ru: '🔥 3 дня подряд! Отличный старт!', el: '🔥 3 μέρες σερί! Εξαιρετική αρχή!' },
      7:  { ru: '🔥 Неделя подряд! Так держать!', el: '🔥 Μία εβδομάδα σερί! Συνεχίστε!' },
      14: { ru: '💪 2 недели подряд! Вы на верном пути!', el: '💪 2 εβδομάδες σερί! Είστε στο σωστό δρόμο!' },
      30: { ru: '🏆 30 дней подряд! Невероятно!', el: '🏆 30 μέρες σερί! Απίστευτο!' },
    };
    toast({
      title: language === 'ru' ? msgs[s].ru : msgs[s].el,
      description: language === 'ru'
        ? `Серия ${s} дней — продолжайте учиться каждый день!`
        : `Σερί ${s} ημερών — συνεχίστε να μαθαίνετε κάθε μέρα!`,
    });
  }, [studySessions, user?.id, language]);

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

  // ── Calculations ───────────────────────────────────────────────────────────

  const now = new Date();
  const totalQuestionsCount = allQuestions?.length || 0;

  // Total questions per topic
  const topicTotals: Record<string, number> = {};
  allQuestions?.forEach(q => {
    topicTotals[q.topic] = (topicTotals[q.topic] || 0) + 1;
  });

  // Overall accuracy
  const totalCorrect = progress?.reduce((acc, p) => acc + p.correct_count, 0) || 0;
  const totalIncorrect = progress?.reduce((acc, p) => acc + p.incorrect_count, 0) || 0;
  const totalAnswered = totalCorrect + totalIncorrect;
  const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

  // Readiness: quiz-based mastery (correct_count > 0 AND correct_count >= incorrect_count)
  const masteredCount = progress?.filter(
    p => p.correct_count > 0 && p.correct_count >= p.incorrect_count,
  ).length || 0;
  const readiness = totalQuestionsCount > 0
    ? Math.round((masteredCount / totalQuestionsCount) * 100)
    : 0;

  // Cards due for SRS review today
  const dueForReviewCount = progress?.filter(p => {
    if (!p.next_review_at) return false;
    return new Date(p.next_review_at) <= now;
  }).length || 0;

  // Total study time in minutes
  const totalStudyMinutes = Math.round(
    (studySessions?.reduce((acc, s) => acc + (s.duration_seconds || 0), 0) || 0) / 60
  );

  // Mastered per topic (for progress rows)
  const topicMastered: Record<string, number> = {};
  progress?.forEach(p => {
    const topic = (p.questions as any)?.topic as string | undefined;
    if (!topic) return;
    if (p.correct_count > 0 && p.correct_count >= p.incorrect_count) {
      topicMastered[topic] = (topicMastered[topic] || 0) + 1;
    }
  });

  // Topic accuracy data for bar chart
  const topicStats: Record<string, { correct: number; total: number }> = {};
  progress?.forEach(p => {
    const topic = ((p.questions as any)?.topic as string) || 'unknown';
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

  // Study streak
  const calculateStreak = (): number => {
    if (!studySessions || studySessions.length === 0) return 0;
    const uniqueDays = new Set(
      studySessions.map(s => {
        const d = new Date(s.started_at);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }),
    );
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    let streak = 0;
    const checkDate = new Date(today);
    if (!uniqueDays.has(todayStr)) checkDate.setDate(checkDate.getDate() - 1);
    while (true) {
      const dateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
      if (uniqueDays.has(dateStr)) { streak++; checkDate.setDate(checkDate.getDate() - 1); }
      else break;
    }
    return streak;
  };
  const streak = calculateStreak();

  // Exam line chart
  const examChartData = examResults
    ?.slice(0, 10)
    .reverse()
    .map((exam, index) => ({
      name: `#${index + 1}`,
      score: Math.round((exam.correct_answers / exam.total_questions) * 100),
      date: new Date(exam.completed_at).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'el-GR'),
    })) || [];

  // 30-day activity calendar with intensity (minutes per day)
  const toDateKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const thirtyDayCalendar = (() => {
    const days: Record<string, number> = {}; // minutes per day
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      days[toDateKey(d)] = 0;
    }
    studySessions?.forEach(s => {
      const key = toDateKey(new Date(s.started_at));
      if (key in days) days[key] += Math.round((s.duration_seconds || 0) / 60);
    });
    return Object.entries(days).map(([date, minutes]) => ({ date, minutes }));
  })();

  // Intensity level: 0 = none, 1 = <10min, 2 = <30min, 3 = <60min, 4 = 60min+
  const getCalendarIntensity = (minutes: number): 0 | 1 | 2 | 3 | 4 => {
    if (minutes === 0) return 0;
    if (minutes < 10) return 1;
    if (minutes < 30) return 2;
    if (minutes < 60) return 3;
    return 4;
  };
  const calendarIntensityClass: Record<0 | 1 | 2 | 3 | 4, string> = {
    0: 'bg-muted/40',
    1: 'bg-primary/20',
    2: 'bg-primary/40',
    3: 'bg-primary/65',
    4: 'bg-primary/90',
  };

  // Top 5 hardest questions by incorrect_count
  const top5Hardest = [...(progress || [])]
    .filter(p => p.incorrect_count > 0)
    .sort((a, b) => b.incorrect_count - a.incorrect_count)
    .slice(0, 5);

  // Weakest topic (most errors) — used for "Practice hardest" button
  const hardestTopicCounts: Record<string, number> = {};
  top5Hardest.forEach(p => {
    const topic = ((p.questions as any)?.topic as string) || 'history';
    hardestTopicCounts[topic] = (hardestTopicCounts[topic] || 0) + p.incorrect_count;
  });
  const weakestTopic = Object.entries(hardestTopicCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'history';

  // Review today: SRS-based (next_review_at <= now), most overdue first, up to 10
  const reviewToday = [...(progress || [])]
    .filter(p => p.next_review_at && new Date(p.next_review_at) <= now)
    .sort((a, b) => {
      const aTime = a.next_review_at ? new Date(a.next_review_at).getTime() : 0;
      const bTime = b.next_review_at ? new Date(b.next_review_at).getTime() : 0;
      return aTime - bTime; // most overdue first
    })
    .slice(0, 10);

  // ── Render ─────────────────────────────────────────────────────────────────

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

        <Tabs defaultValue="overview" className="relative">
          <TabsList className="mb-6">
            <TabsTrigger value="overview">
              {language === 'ru' ? 'Обзор' : 'Επισκόπηση'}
            </TabsTrigger>
            <TabsTrigger value="progress">
              {language === 'ru' ? 'Прогресс' : 'Πρόοδος'}
            </TabsTrigger>
            <TabsTrigger value="errors">
              {language === 'ru' ? 'Ошибки' : 'Λάθη'}
            </TabsTrigger>
          </TabsList>

          {/* ── Tab 1: Обзор ─────────────────────────────────────────────── */}
          <TabsContent value="overview" className="space-y-6 mt-0">

            {/* Summary cards */}
            <div className="grid gap-4 sm:gap-6 grid-cols-2 md:grid-cols-4">
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
                  <p className="text-xs text-muted-foreground mt-1">
                    {totalAnswered} {language === 'ru' ? 'ответов' : 'απαντήσεις'}
                  </p>
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
                  <p className="text-3xl font-bold text-foreground">{masteredCount}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {language === 'ru'
                      ? `из ${totalQuestionsCount} вопросов`
                      : `από ${totalQuestionsCount} ερωτήσεις`}
                  </p>
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
                  <p className="text-xs text-muted-foreground mt-1">
                    {language === 'ru' ? 'подряд' : 'συνεχόμενες'}
                  </p>
                </CardContent>
              </Card>

              <Card className="liquid-glass-card animate-fade-in" style={{ animationDelay: '0.3s' }}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="p-2 rounded-lg liquid-glass-button">
                      <Clock className="h-4 w-4 text-accent" />
                    </div>
                    <span className="text-sm">{language === 'ru' ? 'Время обучения' : 'Χρόνος μάθησης'}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-foreground">
                    {totalStudyMinutes >= 60
                      ? `${Math.floor(totalStudyMinutes / 60)}ч`
                      : `${totalStudyMinutes}м`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {language === 'ru' ? 'всего' : 'συνολικά'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Greek switch banner */}
            {accuracy >= 80 && language === 'ru' && (
              <Card className="liquid-glass-card animate-fade-in border-accent/40 bg-gradient-to-r from-accent/5 to-primary/5" style={{ animationDelay: '0.35s' }}>
                <CardContent className="py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-accent/15 shrink-0">
                      <Languages className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">
                        🇬🇷 Вы готовы учиться на греческом!
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Точность {accuracy}% — отличный результат. Попробуйте отвечать на вопросы на греческом языке.
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="shrink-0 bg-accent/20 hover:bg-accent/30 text-accent border border-accent/30 hover:border-accent/50"
                    variant="outline"
                    onClick={() => setLanguage('el')}
                  >
                    Переключиться на греческий
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Due for review badge */}
            {dueForReviewCount > 0 && (
              <Card className="liquid-glass-card animate-fade-in border-primary/30" style={{ animationDelay: '0.35s' }}>
                <CardContent className="py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {language === 'ru'
                          ? `${dueForReviewCount} карточек ждут повторения сегодня`
                          : `${dueForReviewCount} κάρτες περιμένουν σήμερα`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {language === 'ru'
                          ? 'По расписанию интервального повторения'
                          : 'Σύμφωνα με το πρόγραμμα επανάληψης'}
                      </p>
                    </div>
                  </div>
                  <Link to="/learn">
                    <Button size="sm" className="liquid-glass-button shrink-0">
                      {language === 'ru' ? 'Повторить' : 'Επανάληψη'}
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Study time widget */}
            <StudyTimeWidget />

            {/* Exam progress chart */}
            {examChartData.length > 1 && (
              <Card className="liquid-glass-card animate-fade-in" style={{ animationDelay: '0.4s' }}>
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
                            if (active && payload?.length) {
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
                        <Line
                          type="monotone"
                          dataKey="score"
                          stroke="hsl(var(--primary))"
                          strokeWidth={3}
                          dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Путь к экзамену */}
            <Card className="liquid-glass-card animate-fade-in" style={{ animationDelay: '0.5s' }}>
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <div className="p-2 rounded-lg liquid-glass-button">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  {language === 'ru' ? 'Путь к экзамену' : 'Δρόμος προς εξέταση'}
                </CardTitle>
                <CardDescription>
                  {language === 'ru'
                    ? 'Готовность к сдаче теста на гражданство'
                    : 'Ετοιμότητα για τεστ ιθαγένειας'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {readiness >= 80 && (
                  <div className="flex items-center gap-3 p-4 bg-success/10 border border-success/30 rounded-xl text-success">
                    <Trophy className="h-5 w-5 shrink-0" />
                    <p className="font-medium text-sm">
                      {language === 'ru'
                        ? '🎉 Вы готовы к экзамену! Уровень знаний достаточен для сдачи теста.'
                        : '🎉 Είστε έτοιμοι για εξέταση! Το επίπεδο γνώσεων αρκεί για το τεστ.'}
                    </p>
                  </div>
                )}

                {/* Unified readiness */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">
                      {language === 'ru' ? 'Готовность к экзамену' : 'Ετοιμότητα εξέτασης'}
                    </span>
                    <span className="font-bold text-primary">{readiness}%</span>
                  </div>
                  <Progress value={readiness} className="h-3" />
                  <p className="text-xs text-muted-foreground">
                    {language === 'ru'
                      ? `${masteredCount} из ${totalQuestionsCount} вопросов освоено (≥80% для допуска)`
                      : `${masteredCount} από ${totalQuestionsCount} ερωτήσεις κατεκτήθηκαν (≥80% για εξέταση)`}
                  </p>
                </div>

                {/* Progress milestones */}
                <div className="flex gap-2 flex-wrap">
                  {[25, 50, 75, 80, 100].map(milestone => (
                    <span
                      key={milestone}
                      className={cn(
                        'text-xs px-2 py-1 rounded-full',
                        readiness >= milestone
                          ? 'bg-primary/20 text-primary font-medium'
                          : 'bg-muted/30 text-muted-foreground',
                      )}
                    >
                      {milestone}%
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab 2: Прогресс ──────────────────────────────────────────── */}
          <TabsContent value="progress" className="space-y-6 mt-0">

            {/* Topic accuracy chart */}
            {topicChartData.length > 0 && (
              <Card className="liquid-glass-card animate-fade-in">
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
                        <XAxis dataKey="topic" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 100]} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload?.length) {
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

            {/* Per-topic progress rows */}
            <Card className="liquid-glass-card animate-fade-in">
              <CardHeader>
                <CardTitle className="font-display">
                  {language === 'ru' ? 'Прогресс по темам' : 'Πρόοδος ανά θέμα'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {TOPICS.map(topic => {
                  const mastered = topicMastered[topic] || 0;
                  const total = topicTotals[topic] || 0;
                  const pct = total > 0 ? Math.round((mastered / total) * 100) : 0;
                  return (
                    <div key={topic}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-medium">{t(`topic.${topic}`)}</span>
                        <span className="text-muted-foreground">
                          {mastered} / {total} {language === 'ru' ? 'выучено' : 'μάθει'}
                        </span>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* 30-day activity calendar */}
            <Card className="liquid-glass-card animate-fade-in">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <div className="p-2 rounded-lg liquid-glass-button">
                    <Flame className="h-5 w-5 text-accent" />
                  </div>
                  {language === 'ru' ? 'Активность за 30 дней' : 'Δραστηριότητα 30 ημερών'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-10 gap-1.5">
                  {thirtyDayCalendar.map(({ date, minutes }) => {
                    const level = getCalendarIntensity(minutes);
                    return (
                      <div
                        key={date}
                        title={`${date}${minutes > 0 ? ` — ${minutes} ${language === 'ru' ? 'мин' : 'λεπτά'}` : ''}`}
                        className={cn('aspect-square rounded-sm', calendarIntensityClass[level])}
                      />
                    );
                  })}
                </div>
                <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground flex-wrap">
                  <span>{language === 'ru' ? 'Меньше' : 'Λιγότερο'}</span>
                  {([0, 1, 2, 3, 4] as const).map(lvl => (
                    <span key={lvl} className={cn('w-3 h-3 rounded-sm inline-block', calendarIntensityClass[lvl])} />
                  ))}
                  <span>{language === 'ru' ? 'Больше' : 'Περισσότερο'}</span>
                  <span className="ml-auto opacity-60">
                    {language === 'ru' ? '< 10м / < 30м / < 60м / 60м+' : '< 10λ / < 30λ / < 60λ / 60λ+'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab 3: Ошибки ─────────────────────────────────────────────── */}
          <TabsContent value="errors" className="space-y-6 mt-0">

            {/* Top 5 hardest questions */}
            <Card className="liquid-glass-card animate-fade-in">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <div className="p-2 rounded-lg liquid-glass-button">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>
                  {language === 'ru' ? 'Топ-5 сложных вопросов' : 'Top-5 δύσκολες ερωτήσεις'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {top5Hardest.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    {language === 'ru'
                      ? 'Пока нет ошибок. Отличная работа!'
                      : 'Δεν υπάρχουν λάθη ακόμα. Εξαιρετική δουλειά!'}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {top5Hardest.map((p, i) => {
                      const q = p.questions as any;
                      const text = language === 'el' && q?.question_el ? q.question_el : q?.question || '—';
                      const topic = (q?.topic as string) || 'unknown';
                      return (
                        <div key={p.id} className="flex items-start gap-3 p-3 rounded-xl liquid-glass">
                          <span className="text-destructive font-bold text-lg shrink-0 w-6 text-center">
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium line-clamp-2">{text}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {t(`topic.${topic}`)} ·{' '}
                              {language === 'ru'
                                ? `${p.incorrect_count} ошибок`
                                : `${p.incorrect_count} λάθη`}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div className="pt-2">
                      <Link to={`/learn/${weakestTopic}/quiz`}>
                        <Button size="sm" variant="outline" className="w-full liquid-glass-button gap-1.5">
                          {language === 'ru' ? 'Потренировать сложные вопросы' : 'Εξάσκηση δύσκολων ερωτήσεων'}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Review today */}
            <Card className="liquid-glass-card animate-fade-in">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <div className="p-2 rounded-lg liquid-glass-button">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  {language === 'ru' ? 'Повторить сегодня' : 'Επανάληψη σήμερα'}
                </CardTitle>
                <CardDescription>
                  {language === 'ru'
                    ? 'Вопросы, которые пора повторить по расписанию SRS'
                    : 'Ερωτήσεις που πρέπει να επαναληφθούν σύμφωνα με το SRS'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {reviewToday.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    {language === 'ru'
                      ? 'Нет вопросов для повторения. Так держать!'
                      : 'Δεν υπάρχουν ερωτήσεις για επανάληψη. Συνεχίστε έτσι!'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {reviewToday.map(p => {
                      const q = p.questions as any;
                      const text = language === 'el' && q?.question_el ? q.question_el : q?.question || '—';
                      const topic = (q?.topic as TopicKey) || 'history';
                      return (
                        <div
                          key={p.id}
                          className="flex items-center gap-3 p-3 rounded-xl liquid-glass"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium line-clamp-1">{text}</p>
                            <p className="text-xs text-muted-foreground">
                              {t(`topic.${topic}`)} ·{' '}
                              {p.correct_count}/{p.correct_count + p.incorrect_count}{' '}
                              {language === 'ru' ? 'верно' : 'σωστά'}
                            </p>
                          </div>
                          <Link
                            to={`/learn/${topic}/quiz`}
                            className="shrink-0 flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                          >
                            {language === 'ru' ? 'Повторить' : 'Επανάληψη'}
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
