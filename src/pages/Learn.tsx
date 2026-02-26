import { Link, Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Layers, PenLine, GraduationCap,
  History, Palette, Scale, MapPin,
  ArrowRight, Loader2, TrendingUp, AlertCircle, CheckCircle,
} from 'lucide-react';

const TOPIC_META = [
  {
    id: 'history',
    icon: History,
    iconBg: 'rgba(91,141,184,0.18)',
    iconColor: '#5B8DB8',
  },
  {
    id: 'culture',
    icon: Palette,
    iconBg: 'rgba(155,126,200,0.18)',
    iconColor: '#9B7EC8',
  },
  {
    id: 'laws',
    icon: Scale,
    iconBg: 'rgba(125,138,87,0.18)',
    iconColor: '#7D8A57',
  },
  {
    id: 'geography',
    icon: MapPin,
    iconBg: 'rgba(212,135,74,0.18)',
    iconColor: '#D4874A',
  },
];

function AccuracyBadge({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  const high = pct >= 70;
  const med = pct >= 50;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '4px 12px', borderRadius: '9999px',
      fontSize: '12px', fontWeight: 600,
      background: high ? 'rgba(125,138,87,0.15)' : med ? 'rgba(236,200,92,0.20)' : 'rgba(224,108,108,0.15)',
      color: high ? '#58633C' : med ? '#8F721D' : '#A83838',
    }}>
      {high
        ? <CheckCircle style={{ width: 13, height: 13 }} />
        : med
        ? <TrendingUp style={{ width: 13, height: 13 }} />
        : <AlertCircle style={{ width: 13, height: 13 }} />}
      {pct}%
    </div>
  );
}

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

  const { data: topicAccuracy } = useQuery({
    queryKey: ['topic-accuracy', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_progress')
        .select('correct_count, incorrect_count, questions(topic)')
        .eq('user_id', user!.id);
      if (error) throw error;
      const stats: Record<string, { correct: number; total: number }> = {};
      (data || []).forEach((p: any) => {
        const topic = p.questions?.topic as string;
        if (!topic) return;
        if (!stats[topic]) stats[topic] = { correct: 0, total: 0 };
        stats[topic].correct += p.correct_count;
        stats[topic].total += p.correct_count + p.incorrect_count;
      });
      return Object.fromEntries(
        Object.entries(stats).map(([topic, s]) => [
          topic,
          s.total > 0 ? Math.round((s.correct / s.total) * 100) : null,
        ])
      ) as Record<string, number | null>;
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const modes = [
    { id: 'flashcards', label: language === 'ru' ? 'Карточки' : 'Κάρτες', icon: Layers },
    { id: 'quiz',       label: language === 'ru' ? 'Тест'     : 'Κουίζ',  icon: PenLine },
    { id: 'exam',       label: language === 'ru' ? 'Экзамен'  : 'Εξέταση',icon: GraduationCap },
  ];

  return (
    <Layout>
      <div className="relative z-10" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px 80px' }}>

        {/* Page header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px', marginBottom: '40px' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: '8px', color: '#2F3532' }}>
              {language === 'ru' ? 'Выберите тему' : 'Επιλέξτε θέμα'}
            </h1>
            <p style={{ fontSize: '14px', color: 'hsl(var(--muted-foreground))' }}>
              {language === 'ru'
                ? 'Начните изучение с интересующей вас темы или продолжите прогресс'
                : 'Ξεκινήστε με ένα θέμα ή συνεχίστε την πρόοδό σας'}
            </p>
          </div>
          {dueCount != null && dueCount > 0 && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '6px 16px', borderRadius: '9999px',
              background: '#ECC85C', color: '#584610',
              fontSize: '13px', fontWeight: 600,
            }}>
              <Layers style={{ width: 15, height: 15 }} />
              {language === 'ru' ? `К повторению: ${dueCount} карточек` : `Σήμερα: ${dueCount} κάρτες`}
            </div>
          )}
        </div>

        {/* Topics 2×2 grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '24px',
          marginBottom: '64px',
        }} className="sm-1col">
          {TOPIC_META.map(meta => {
            const acc = topicAccuracy?.[meta.id] ?? null;
            const Icon = meta.icon;
            return (
              <div key={meta.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '220px' }}>
                <div>
                  {/* Icon + accuracy row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '50%',
                      background: meta.iconBg, color: meta.iconColor,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '22px',
                    }}>
                      <Icon style={{ width: 22, height: 22 }} />
                    </div>
                    <AccuracyBadge pct={acc} />
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px', color: '#2F3532' }}>
                    {t(`topic.${meta.id}`)}
                  </h3>
                  <p style={{ fontSize: '14px', color: 'hsl(var(--muted-foreground))', marginBottom: '24px', lineHeight: 1.5 }}>
                    {t(`topic.${meta.id}.desc`)}
                  </p>
                </div>
                {/* Action buttons */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {modes.map(mode => (
                    <Link key={mode.id} to={`/learn/${meta.id}/${mode.id}`} style={{ textDecoration: 'none' }}>
                      <button
                        style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          padding: '8px 16px',
                          border: '1px solid rgba(47,53,50,0.1)',
                          borderRadius: '9999px',
                          background: 'transparent',
                          color: '#2F3532',
                          fontSize: '13px', fontWeight: 500,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.8)';
                          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(47,53,50,0.2)';
                          (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(47,53,50,0.1)';
                          (e.currentTarget as HTMLButtonElement).style.transform = '';
                        }}
                        onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.96)'; }}
                        onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; }}
                      >
                        <mode.icon style={{ width: 15, height: 15 }} />
                        {mode.label}
                      </button>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Exam section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 500, letterSpacing: '-0.01em', color: '#2F3532' }}>
            {language === 'ru' ? 'Или пройдите экзамен' : 'Ή δώστε εξέταση'}
          </h2>
        </div>
        <div style={{
          background: '#2F3532', color: 'white',
          padding: '48px', borderRadius: '32px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          gap: '32px', flexWrap: 'wrap',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Decorative ghost icon */}
          <GraduationCap style={{
            position: 'absolute', right: '-20px', bottom: '-40px',
            width: '220px', height: '220px',
            color: 'rgba(255,255,255,0.03)',
            transform: 'rotate(-15deg)',
          }} />
          <div style={{ maxWidth: '560px', position: 'relative', zIndex: 1 }}>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.6 }}>
              Simulation Mode
            </span>
            <h2 style={{ fontSize: '28px', fontWeight: 500, marginTop: '8px', marginBottom: '0' }}>
              {language === 'ru' ? 'Симуляция экзамена' : 'Προσομοίωση εξέτασης'}
            </h2>
            <p style={{ fontSize: '14px', opacity: 0.7, marginTop: '8px', lineHeight: 1.5 }}>
              {language === 'ru'
                ? 'Проверьте свои знания в условиях, приближённых к реальному тесту. 20 вопросов, 45 минут.'
                : 'Ελέγξτε τις γνώσεις σας σε συνθήκες κοντά στην πραγματική εξέταση. 20 ερωτήσεις, 45 λεπτά.'}
            </p>
          </div>
          <Link to="/learn/exam" style={{ textDecoration: 'none', position: 'relative', zIndex: 1 }}>
            <button
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '12px 24px',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '9999px',
                background: 'transparent', color: 'white',
                fontSize: '14px', fontWeight: 500,
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'white';
                (e.currentTarget as HTMLButtonElement).style.color = '#2F3532';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                (e.currentTarget as HTMLButtonElement).style.color = 'white';
              }}
            >
              {language === 'ru' ? 'Начать экзамен' : 'Έναρξη εξέτασης'}
              <ArrowRight style={{ width: 16, height: 16 }} />
            </button>
          </Link>
        </div>

      </div>

      {/* Responsive: stack topics to 1 col on small screens */}
      <style>{`
        @media (max-width: 640px) {
          .sm-1col { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </Layout>
  );
}
