import { Navigate, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Loader2, Trophy, Target, TrendingUp, Flame, BarChart3,
  AlertTriangle, BookOpen, ArrowRight, Clock, Languages,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  ResponsiveContainer, LineChart, Line,
} from 'recharts';
import { StudyTimeWidget } from '@/components/StudyTimeWidget';

const TOPICS = ['history', 'culture', 'laws', 'geography'] as const;
type TopicKey = typeof TOPICS[number];

const TOPIC_COLORS: Record<string, string> = {
  history:   'hsl(210 36% 55%)',
  culture:   'hsl(270 37% 64%)',
  laws:      'hsl(82 13% 44%)',
  geography: 'hsl(24 60% 58%)',
};

export default function Stats() {
  const { user, isLoading: authLoading } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'progress' | 'errors'>('overview');

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

  const { data: allQuestions, isLoading: questionsLoading } = useQuery({
    queryKey: ['all-questions-count'],
    queryFn: async () => {
      const { data, error } = await supabase.from('questions').select('id, topic');
      if (error) throw error;
      return data || [];
    },
  });

  const isDataLoading = progressLoading || examsLoading || sessionsLoading || questionsLoading;

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
      3:  { ru: '🔥 3 дня подряд!', el: '🔥 3 μέρες σερί!' },
      7:  { ru: '🔥 Неделя подряд!', el: '🔥 Μία εβδομάδα σερί!' },
      14: { ru: '💪 2 недели подряд!', el: '💪 2 εβδομάδες σερί!' },
      30: { ru: '🏆 30 дней подряд!', el: '🏆 30 μέρες σερί!' },
    };
    toast({ title: language === 'ru' ? msgs[s].ru : msgs[s].el });
  }, [studySessions, user?.id, language]);

  if (authLoading || (user && isDataLoading)) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'hsl(var(--foreground))' }} />
        </div>
      </Layout>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // ── Calculations ───────────────────────────────────────────────────────────

  const now = new Date();
  const totalQuestionsCount = allQuestions?.length || 0;
  const topicTotals: Record<string, number> = {};
  allQuestions?.forEach(q => { topicTotals[q.topic] = (topicTotals[q.topic] || 0) + 1; });

  const totalCorrect = progress?.reduce((acc, p) => acc + p.correct_count, 0) || 0;
  const totalIncorrect = progress?.reduce((acc, p) => acc + p.incorrect_count, 0) || 0;
  const totalAnswered = totalCorrect + totalIncorrect;
  const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

  const masteredCount = progress?.filter(p => p.is_known).length || 0;
  const readiness = totalQuestionsCount > 0
    ? Math.round((masteredCount / totalQuestionsCount) * 100) : 0;

  const dueForReviewCount = progress?.filter(p => {
    if (!p.next_review_at) return false;
    return new Date(p.next_review_at) <= now;
  }).length || 0;

  const totalStudyMinutes = Math.round(
    (studySessions?.reduce((acc, s) => acc + (s.duration_seconds || 0), 0) || 0) / 60
  );

  const topicMastered: Record<string, number> = {};
  progress?.forEach(p => {
    const topic = (p.questions as any)?.topic as string | undefined;
    if (!topic) return;
    if (p.is_known)
      topicMastered[topic] = (topicMastered[topic] || 0) + 1;
  });

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
      topicKey: topic,
      accuracy: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
    }));

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

  const examChartData = examResults
    ?.slice(0, 10).reverse()
    .map((exam, index) => ({
      name: `#${index + 1}`,
      score: Math.round((exam.correct_answers / exam.total_questions) * 100),
      date: new Date(exam.completed_at).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'el-GR'),
    })) || [];

  const toDateKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const thirtyDayCalendar = (() => {
    const days: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i); days[toDateKey(d)] = 0;
    }
    studySessions?.forEach(s => {
      const key = toDateKey(new Date(s.started_at));
      if (key in days) days[key] += Math.round((s.duration_seconds || 0) / 60);
    });
    return Object.entries(days).map(([date, minutes]) => ({ date, minutes }));
  })();

  const getCalendarIntensity = (minutes: number): 0 | 1 | 2 | 3 | 4 => {
    if (minutes === 0) return 0;
    if (minutes < 10) return 1;
    if (minutes < 30) return 2;
    if (minutes < 60) return 3;
    return 4;
  };

  const top5Hardest = [...(progress || [])]
    .filter(p => p.incorrect_count > 0)
    .sort((a, b) => b.incorrect_count - a.incorrect_count)
    .slice(0, 5);

  const hardestTopicCounts: Record<string, number> = {};
  top5Hardest.forEach(p => {
    const topic = ((p.questions as any)?.topic as string) || 'history';
    hardestTopicCounts[topic] = (hardestTopicCounts[topic] || 0) + p.incorrect_count;
  });
  const weakestTopic = Object.entries(hardestTopicCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'history';

  const reviewToday = [...(progress || [])]
    .filter(p => p.next_review_at && new Date(p.next_review_at) <= now)
    .sort((a, b) => {
      const aTime = a.next_review_at ? new Date(a.next_review_at).getTime() : 0;
      const bTime = b.next_review_at ? new Date(b.next_review_at).getTime() : 0;
      return aTime - bTime;
    })
    .slice(0, 10);

  const TABS = [
    { id: 'overview', label: language === 'ru' ? 'Обзор' : 'Επισκόπηση' },
    { id: 'progress', label: language === 'ru' ? 'Прогресс' : 'Πρόοδος' },
    { id: 'errors',   label: language === 'ru' ? 'Ошибки' : 'Λάθη' },
  ] as const;

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="glass-panel" style={{ padding: '8px 14px', fontSize: 13 }}>
        <p style={{ fontWeight: 600 }}>{payload[0].payload.date || payload[0].payload.topic}</p>
        <p style={{ color: 'hsl(var(--foreground))', fontWeight: 700 }}>{payload[0].value}%</p>
      </div>
    );
  };

  return (
    <Layout>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 32, fontWeight: 500, letterSpacing: '-0.02em', color: 'hsl(var(--foreground))', marginBottom: 6 }}>
            {language === 'ru' ? 'Статистика' : 'Στατιστικά'}
          </h1>
          <p style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))' }}>
            {language === 'ru' ? 'Ваш прогресс обучения' : 'Η πρόοδος της μάθησής σας'}
          </p>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 32, background: 'rgba(255,255,255,0.35)', borderRadius: 99, padding: '5px', width: 'fit-content', border: '1px solid rgba(47,53,50,0.1)' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '7px 20px',
                borderRadius: 99,
                border: 'none',
                fontSize: 13,
                fontWeight: 500,
                fontFamily: 'inherit',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: activeTab === tab.id ? 'rgba(255,255,255,0.85)' : 'transparent',
                color: activeTab === tab.id ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
                boxShadow: activeTab === tab.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab: Overview ──────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* 4 stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }} className="stats-grid-4">
              {[
                { icon: <TrendingUp size={18} />, label: language === 'ru' ? 'Точность' : 'Ακρίβεια', value: `${accuracy}%`, sub: `${totalAnswered} ${language === 'ru' ? 'ответов' : 'απαντήσεις'}` },
                { icon: <Target size={18} />, label: language === 'ru' ? 'Изучено' : 'Μάθατε', value: String(masteredCount), sub: language === 'ru' ? `из ${totalQuestionsCount}` : `από ${totalQuestionsCount}` },
                { icon: <Flame size={18} />, label: language === 'ru' ? 'Серия дней' : 'Σερί ημερών', value: String(streak), sub: language === 'ru' ? 'подряд' : 'συνεχόμενες' },
                { icon: <Clock size={18} />, label: language === 'ru' ? 'Время' : 'Χρόνος', value: totalStudyMinutes >= 60 ? `${Math.floor(totalStudyMinutes / 60)}ч` : `${totalStudyMinutes}м`, sub: language === 'ru' ? 'всего' : 'συνολικά' },
              ].map((card, i) => (
                <div key={i} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'hsl(var(--muted-foreground))' }}>
                    <div style={{ padding: '6px', borderRadius: 10, background: 'rgba(47,53,50,0.07)', display: 'flex' }}>{card.icon}</div>
                    <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{card.label}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', color: 'hsl(var(--foreground))' }}>{card.value}</div>
                    <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', marginTop: 2 }}>{card.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Greek switch banner */}
            {accuracy >= 80 && language === 'ru' && (
              <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ padding: '8px', borderRadius: 12, background: 'rgba(125,138,87,0.12)', display: 'flex' }}>
                    <Languages size={18} style={{ color: 'hsl(var(--accent))' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'hsl(var(--foreground))' }}>🇬🇷 Вы готовы учиться на греческом!</p>
                    <p style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', marginTop: 2 }}>Точность {accuracy}% — попробуйте греческий язык.</p>
                  </div>
                </div>
                <button
                  onClick={() => setLanguage('el')}
                  style={{ padding: '8px 18px', borderRadius: 99, border: '1px solid rgba(125,138,87,0.3)', background: 'rgba(125,138,87,0.1)', color: 'hsl(var(--accent))', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  Переключиться <ArrowRight size={13} />
                </button>
              </div>
            )}

            {/* Due review banner */}
            {dueForReviewCount > 0 && (
              <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ padding: '8px', borderRadius: 12, background: 'rgba(47,53,50,0.07)', display: 'flex' }}>
                    <BookOpen size={18} style={{ color: 'hsl(var(--foreground))' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'hsl(var(--foreground))' }}>
                      {language === 'ru' ? `${dueForReviewCount} карточек ждут повторения` : `${dueForReviewCount} κάρτες περιμένουν`}
                    </p>
                    <p style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', marginTop: 2 }}>
                      {language === 'ru' ? 'Интервальное повторение' : 'Επανάληψη με διαστήματα'}
                    </p>
                  </div>
                </div>
                <Link to="/learn" style={{ textDecoration: 'none' }}>
                  <button style={{ padding: '8px 18px', borderRadius: 99, border: '1px solid rgba(47,53,50,0.15)', background: 'rgba(255,255,255,0.7)', color: 'hsl(var(--foreground))', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {language === 'ru' ? 'Повторить' : 'Επανάληψη'} <ArrowRight size={13} />
                  </button>
                </Link>
              </div>
            )}

            {/* Study time widget */}
            <StudyTimeWidget />

            {/* Exam progress chart */}
            {examChartData.length > 1 && (
              <div className="glass-panel">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <div style={{ padding: '7px', borderRadius: 10, background: 'rgba(47,53,50,0.07)', display: 'flex' }}>
                    <TrendingUp size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{language === 'ru' ? 'Прогресс экзаменов' : 'Πρόοδος εξετάσεων'}</div>
                    <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>{language === 'ru' ? `Последние ${examChartData.length} экзаменов` : `Τελευταίες ${examChartData.length} εξετάσεις`}</div>
                  </div>
                </div>
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={examChartData}>
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="score" stroke="hsl(var(--foreground))" strokeWidth={2.5} dot={{ fill: 'hsl(var(--foreground))', strokeWidth: 0, r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Readiness */}
            <div className="glass-panel">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ padding: '7px', borderRadius: 10, background: 'rgba(47,53,50,0.07)', display: 'flex' }}>
                  <BookOpen size={16} />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{language === 'ru' ? 'Путь к экзамену' : 'Δρόμος προς εξέταση'}</div>
                  <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>{language === 'ru' ? 'Готовность к тесту на гражданство' : 'Ετοιμότητα για τεστ ιθαγένειας'}</div>
                </div>
              </div>

              {readiness >= 80 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 14, background: 'rgba(125,138,87,0.12)', border: '1px solid rgba(125,138,87,0.25)', marginBottom: 20 }}>
                  <Trophy size={16} style={{ color: 'hsl(var(--accent))' }} />
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'hsl(var(--accent))' }}>
                    {language === 'ru' ? '🎉 Вы готовы к экзамену!' : '🎉 Είστε έτοιμοι για εξέταση!'}
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{language === 'ru' ? 'Готовность' : 'Ετοιμότητα'}</span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{readiness}%</span>
              </div>
              <div style={{ height: 6, borderRadius: 99, background: 'rgba(47,53,50,0.1)', overflow: 'hidden', marginBottom: 8 }}>
                <div style={{ height: '100%', borderRadius: 99, background: 'hsl(var(--foreground))', width: `${readiness}%`, transition: 'width 0.6s ease' }} />
              </div>
              <p style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>
                {language === 'ru' ? `${masteredCount} из ${totalQuestionsCount} вопросов освоено` : `${masteredCount} από ${totalQuestionsCount} ερωτήσεις κατεκτήθηκαν`}
              </p>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
                {[25, 50, 75, 80, 100].map(m => (
                  <span key={m} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 99, background: readiness >= m ? 'rgba(47,53,50,0.12)' : 'rgba(47,53,50,0.05)', color: readiness >= m ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))', fontWeight: readiness >= m ? 600 : 400 }}>
                    {m}%
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Progress ─────────────────────────────────────────────── */}
        {activeTab === 'progress' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Topic accuracy chart */}
            {topicChartData.length > 0 && (
              <div className="glass-panel">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <div style={{ padding: '7px', borderRadius: 10, background: 'rgba(47,53,50,0.07)', display: 'flex' }}>
                    <BarChart3 size={16} />
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{language === 'ru' ? 'Точность по темам' : 'Ακρίβεια ανά θέμα'}</div>
                </div>
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topicChartData} barSize={36}>
                      <XAxis dataKey="topic" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(47,53,50,0.04)' }} />
                      <Bar dataKey="accuracy" radius={[8, 8, 0, 0]}>
                        {topicChartData.map((entry, index) => (
                          <Cell key={index} fill={TOPIC_COLORS[entry.topicKey] || 'hsl(var(--foreground))'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Per-topic progress rows */}
            <div className="glass-panel">
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>
                {language === 'ru' ? 'Прогресс по темам' : 'Πρόοδος ανά θέμα'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {TOPICS.map(topic => {
                  const mastered = topicMastered[topic] || 0;
                  const total = topicTotals[topic] || 0;
                  const pct = total > 0 ? Math.round((mastered / total) * 100) : 0;
                  const color = TOPIC_COLORS[topic];
                  return (
                    <div key={topic}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{t(`topic.${topic}`)}</span>
                        <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>
                          {mastered} / {total} {language === 'ru' ? 'выучено' : 'μάθει'}
                        </span>
                      </div>
                      <div style={{ height: 6, borderRadius: 99, background: 'rgba(47,53,50,0.08)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 99, background: color, width: `${pct}%`, transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 30-day calendar */}
            <div className="glass-panel">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ padding: '7px', borderRadius: 10, background: 'rgba(47,53,50,0.07)', display: 'flex' }}>
                  <Flame size={16} style={{ color: 'hsl(var(--accent))' }} />
                </div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{language === 'ru' ? 'Активность за 30 дней' : 'Δραστηριότητα 30 ημερών'}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 6 }}>
                {thirtyDayCalendar.map(({ date, minutes }) => {
                  const level = getCalendarIntensity(minutes);
                  const styles: Record<number, React.CSSProperties> = {
                    0: { background: 'rgba(47,53,50,0.07)' },
                    1: { background: 'rgba(47,53,50,0.20)' },
                    2: { background: 'rgba(47,53,50,0.38)' },
                    3: { background: 'rgba(47,53,50,0.60)' },
                    4: { background: 'rgba(47,53,50,0.85)' },
                  };
                  return (
                    <div
                      key={date}
                      title={`${date}${minutes > 0 ? ` — ${minutes} ${language === 'ru' ? 'мин' : 'λεπτά'}` : ''}`}
                      style={{ aspectRatio: '1', borderRadius: 4, ...styles[level] }}
                    />
                  );
                })}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>
                <span>{language === 'ru' ? 'Меньше' : 'Λιγότερο'}</span>
                {([0,1,2,3,4] as const).map(lvl => {
                  const bgMap = ['rgba(47,53,50,0.07)', 'rgba(47,53,50,0.20)', 'rgba(47,53,50,0.38)', 'rgba(47,53,50,0.60)', 'rgba(47,53,50,0.85)'];
                  return <span key={lvl} style={{ width: 12, height: 12, borderRadius: 3, display: 'inline-block', background: bgMap[lvl] }} />;
                })}
                <span>{language === 'ru' ? 'Больше' : 'Περισσότερο'}</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Errors ───────────────────────────────────────────────── */}
        {activeTab === 'errors' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Top 5 hardest */}
            <div className="glass-panel">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ padding: '7px', borderRadius: 10, background: 'rgba(224,108,108,0.12)', display: 'flex' }}>
                  <AlertTriangle size={16} style={{ color: 'hsl(var(--destructive))' }} />
                </div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{language === 'ru' ? 'Топ-5 сложных вопросов' : 'Top-5 δύσκολες ερωτήσεις'}</div>
              </div>
              {top5Hardest.length === 0 ? (
                <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))' }}>
                  {language === 'ru' ? 'Пока нет ошибок. Отличная работа!' : 'Δεν υπάρχουν λάθη ακόμα. Εξαιρετική δουλειά!'}
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {top5Hardest.map((p, i) => {
                    const q = p.questions as any;
                    const text = language === 'el' && q?.question_el ? q.question_el : q?.question || '—';
                    const topic = (q?.topic as string) || 'unknown';
                    return (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(47,53,50,0.08)' }}>
                        <span style={{ fontSize: 16, fontWeight: 700, color: 'hsl(var(--destructive))', minWidth: 22, textAlign: 'center' }}>{i + 1}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{text}</p>
                          <p style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', marginTop: 3 }}>
                            {t(`topic.${topic}`)} · {language === 'ru' ? `${p.incorrect_count} ошибок` : `${p.incorrect_count} λάθη`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <Link to={`/learn/${weakestTopic}/quiz`} style={{ textDecoration: 'none', marginTop: 4 }}>
                    <button style={{ width: '100%', padding: '10px', borderRadius: 14, border: '1px solid rgba(47,53,50,0.12)', background: 'transparent', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      {language === 'ru' ? 'Потренировать сложные вопросы' : 'Εξάσκηση δύσκολων ερωτήσεων'} <ArrowRight size={14} />
                    </button>
                  </Link>
                </div>
              )}
            </div>

            {/* Review today */}
            <div className="glass-panel">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <div style={{ padding: '7px', borderRadius: 10, background: 'rgba(47,53,50,0.07)', display: 'flex' }}>
                  <BookOpen size={16} />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{language === 'ru' ? 'Повторить сегодня' : 'Επανάληψη σήμερα'}</div>
                  <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>{language === 'ru' ? 'По расписанию SRS' : 'Σύμφωνα με το SRS'}</div>
                </div>
              </div>
              <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {reviewToday.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))' }}>
                    {language === 'ru' ? 'Нет вопросов для повторения. Так держать!' : 'Δεν υπάρχουν ερωτήσεις για επανάληψη.'}
                  </p>
                ) : reviewToday.map(p => {
                  const q = p.questions as any;
                  const text = language === 'el' && q?.question_el ? q.question_el : q?.question || '—';
                  const topic = (q?.topic as TopicKey) || 'history';
                  return (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(47,53,50,0.08)' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{text}</p>
                        <p style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', marginTop: 2 }}>
                          {t(`topic.${topic}`)} · {p.correct_count}/{p.correct_count + p.incorrect_count} {language === 'ru' ? 'верно' : 'σωστά'}
                        </p>
                      </div>
                      <Link to={`/learn/${topic}/quiz`} style={{ textDecoration: 'none', fontSize: 12, fontWeight: 500, color: 'hsl(var(--foreground))', display: 'flex', alignItems: 'center', gap: 4, opacity: 0.7, whiteSpace: 'nowrap' }}>
                        {language === 'ru' ? 'Повторить' : 'Επανάληψη'} <ArrowRight size={12} />
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 700px) {
          .stats-grid-4 { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 400px) {
          .stats-grid-4 { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </Layout>
  );
}
