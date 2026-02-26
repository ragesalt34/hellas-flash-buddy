import { Link, Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Layers, PenLine, GraduationCap,
  History, Palette, Scale, MapPin,
  ArrowRight, Loader2, CheckCircle, TrendingUp, AlertCircle,
} from 'lucide-react';

const TOPIC_META = [
  { id: 'history',   icon: History,  color: 'hsl(210 36% 55%)', bg: 'rgba(91,141,184,0.12)' },
  { id: 'culture',   icon: Palette,  color: 'hsl(270 37% 64%)', bg: 'rgba(155,126,200,0.12)' },
  { id: 'laws',      icon: Scale,    color: 'hsl(82 13% 44%)',  bg: 'rgba(125,138,87,0.12)' },
  { id: 'geography', icon: MapPin,   color: 'hsl(24 60% 58%)',  bg: 'rgba(212,135,74,0.12)' },
];

export default function Learn() {
  const { user, isLoading } = useAuth();
  const { t, language } = useLanguage();

  const { data: dueCount } = useQuery({
    queryKey: ['due-review-count', user?.id],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('user_progress')
        .select('id')
        .eq('user_id', user!.id)
        .lte('next_review_at', now);
      if (error) throw error;
      return data?.length || 0;
    },
    enabled: !!user,
  });

  const { data: topicProgress } = useQuery({
    queryKey: ['topic-progress', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_progress')
        .select('correct_count, incorrect_count, questions(topic)')
        .eq('user_id', user!.id);
      if (error) throw error;

      const stats: Record<string, { correct: number; total: number; mastered: number }> = {};
      (data || []).forEach((p: any) => {
        const topic = p.questions?.topic as string;
        if (!topic) return;
        if (!stats[topic]) stats[topic] = { correct: 0, total: 0, mastered: 0 };
        stats[topic].correct += p.correct_count;
        stats[topic].total += p.correct_count + p.incorrect_count;
        if (p.correct_count > 0 && p.correct_count >= p.incorrect_count) stats[topic].mastered++;
      });
      return stats;
    },
    enabled: !!user,
  });

  const { data: topicTotals } = useQuery({
    queryKey: ['topic-totals'],
    queryFn: async () => {
      const { data, error } = await supabase.from('questions').select('topic');
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((q: any) => { counts[q.topic] = (counts[q.topic] || 0) + 1; });
      return counts;
    },
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'hsl(var(--foreground))' }} />
        </div>
      </Layout>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const modes = [
    { id: 'flashcards', label: language === 'ru' ? 'Карточки' : 'Κάρτες',  icon: Layers },
    { id: 'quiz',       label: language === 'ru' ? 'Тест'     : 'Κουίζ',   icon: PenLine },
    { id: 'exam',       label: language === 'ru' ? 'Экзамен'  : 'Εξέταση', icon: GraduationCap },
  ];

  return (
    <Layout>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* Header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 40 }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 500, letterSpacing: '-0.02em', color: 'hsl(var(--foreground))', marginBottom: 6 }}>
              {language === 'ru' ? 'Выберите тему' : 'Επιλέξτε θέμα'}
            </h1>
            <p style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))' }}>
              {language === 'ru'
                ? 'Начните изучение или продолжите прогресс'
                : 'Ξεκινήστε με ένα θέμα ή συνεχίστε την πρόοδό σας'}
            </p>
          </div>
          {dueCount != null && dueCount > 0 && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 18px', borderRadius: 99, background: 'rgba(236,200,92,0.22)', color: '#584610', fontSize: 13, fontWeight: 600, border: '1px solid rgba(236,200,92,0.4)' }}>
              <Layers style={{ width: 14, height: 14 }} />
              {language === 'ru' ? `К повторению: ${dueCount} карточек` : `Σήμερα: ${dueCount} κάρτες`}
            </div>
          )}
        </div>

        {/* Topics grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, marginBottom: 64 }} className="learn-grid">
          {TOPIC_META.map(meta => {
            const tp = topicProgress?.[meta.id];
            const total = topicTotals?.[meta.id] || 0;
            const mastered = tp?.mastered || 0;
            const pct = total > 0 ? Math.round((mastered / total) * 100) : 0;
            const accuracy = tp && tp.total > 0 ? Math.round((tp.correct / tp.total) * 100) : null;
            const Icon = meta.icon;

            return (
              <div key={meta.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: 0, overflow: 'hidden' }}>
                {/* Accent top bar */}
                <div style={{ height: 4, background: meta.color, borderRadius: '16px 16px 0 0' }} />

                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
                  {/* Icon + accuracy */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ width: 46, height: 46, borderRadius: '50%', background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: meta.color }}>
                      <Icon style={{ width: 20, height: 20 }} />
                    </div>
                    {accuracy !== null && (
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '4px 12px', borderRadius: 99,
                        fontSize: 12, fontWeight: 600,
                        background: accuracy >= 70 ? 'rgba(125,138,87,0.14)' : accuracy >= 50 ? 'rgba(236,200,92,0.18)' : 'rgba(224,108,108,0.14)',
                        color: accuracy >= 70 ? '#58633C' : accuracy >= 50 ? '#8F721D' : '#A83838',
                      }}>
                        {accuracy >= 70
                          ? <CheckCircle style={{ width: 12, height: 12 }} />
                          : accuracy >= 50
                          ? <TrendingUp style={{ width: 12, height: 12 }} />
                          : <AlertCircle style={{ width: 12, height: 12 }} />}
                        {accuracy}%
                      </div>
                    )}
                  </div>

                  {/* Name + desc */}
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 600, color: 'hsl(var(--foreground))', marginBottom: 4 }}>
                      {t(`topic.${meta.id}`)}
                    </h3>
                    <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', lineHeight: 1.5 }}>
                      {t(`topic.${meta.id}.desc`)}
                    </p>
                  </div>

                  {/* Progress bar */}
                  {total > 0 && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>
                        <span>{language === 'ru' ? 'Освоено' : 'Κατεκτήθηκαν'}</span>
                        <span style={{ fontWeight: 600, color: 'hsl(var(--foreground))' }}>{mastered} / {total}</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 99, background: 'rgba(47,53,50,0.08)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 99, background: meta.color, width: `${pct}%`, transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  )}

                  {/* Mode buttons */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 'auto', paddingTop: 4 }}>
                    {modes.map(mode => (
                      <Link key={mode.id} to={`/learn/${meta.id}/${mode.id}`} style={{ textDecoration: 'none' }}>
                        <button
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '7px 14px', borderRadius: 99,
                            border: '1px solid rgba(47,53,50,0.12)',
                            background: 'rgba(255,255,255,0.5)',
                            color: 'hsl(var(--foreground))',
                            fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.9)';
                            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.5)';
                            (e.currentTarget as HTMLButtonElement).style.transform = '';
                          }}
                        >
                          <mode.icon style={{ width: 13, height: 13 }} />
                          {mode.label}
                        </button>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Exam section */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 22, fontWeight: 500, letterSpacing: '-0.01em', color: 'hsl(var(--foreground))', marginBottom: 20 }}>
            {language === 'ru' ? 'Или пройдите экзамен' : 'Ή δώστε εξέταση'}
          </h2>
          <div style={{
            background: 'hsl(var(--foreground))',
            color: 'hsl(var(--primary-foreground))',
            padding: '44px 48px', borderRadius: 28,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            gap: 32, flexWrap: 'wrap',
            position: 'relative', overflow: 'hidden',
          }}>
            <GraduationCap style={{ position: 'absolute', right: -20, bottom: -40, width: 200, height: 200, color: 'rgba(255,255,255,0.04)', transform: 'rotate(-15deg)' }} />
            <div style={{ maxWidth: 540, position: 'relative', zIndex: 1 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.5 }}>Simulation Mode</span>
              <h2 style={{ fontSize: 26, fontWeight: 500, marginTop: 8, marginBottom: 0 }}>
                {language === 'ru' ? 'Симуляция экзамена' : 'Προσομοίωση εξέτασης'}
              </h2>
              <p style={{ fontSize: 14, opacity: 0.65, marginTop: 8, lineHeight: 1.55 }}>
                {language === 'ru'
                  ? '20 вопросов, 45 минут. Условия приближены к реальному тесту.'
                  : '20 ερωτήσεις, 45 λεπτά. Συνθήκες κοντά στην πραγματική εξέταση.'}
              </p>
            </div>
            <Link to="/learn/exam" style={{ textDecoration: 'none', position: 'relative', zIndex: 1 }}>
              <button
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '11px 22px', borderRadius: 99,
                  border: '1px solid rgba(255,255,255,0.3)',
                  background: 'transparent', color: 'inherit',
                  fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'white'; (e.currentTarget as HTMLButtonElement).style.color = 'hsl(var(--foreground))'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'inherit'; }}
              >
                {language === 'ru' ? 'Начать экзамен' : 'Έναρξη εξέτασης'} <ArrowRight style={{ width: 15, height: 15 }} />
              </button>
            </Link>
          </div>
        </div>

      </div>

      <style>{`
        @media (max-width: 640px) {
          .learn-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </Layout>
  );
}
