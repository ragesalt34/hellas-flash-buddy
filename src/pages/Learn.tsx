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
  { id: 'history',   icon: History,  color: '#5B8DB8', bg: 'rgba(91,141,184,0.12)',  dataAttr: 'history' },
  { id: 'culture',   icon: Palette,  color: '#9B7EC8', bg: 'rgba(155,126,200,0.12)', dataAttr: 'culture' },
  { id: 'laws',      icon: Scale,    color: '#7D8A57', bg: 'rgba(125,138,87,0.12)',  dataAttr: 'laws' },
  { id: 'geography', icon: MapPin,   color: '#D4874A', bg: 'rgba(212,135,74,0.12)',  dataAttr: 'geo' },
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

  return (
    <Layout>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* Page header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 40 }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 500, letterSpacing: '-0.02em', color: 'hsl(var(--foreground))', marginBottom: 6 }}>
              {language === 'ru' ? 'Выберите тему' : 'Επιλέξτε θέμα'}
            </h1>
            <p style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))' }}>
              {language === 'ru'
                ? 'Начните изучение с интересующей вас темы или продолжите прогресс'
                : 'Ξεκινήστε με ένα θέμα ή συνεχίστε την πρόοδό σας'}
            </p>
          </div>
          {dueCount != null && dueCount > 0 && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 18px', borderRadius: 99,
              background: 'rgba(236,200,92,0.22)', color: '#584610',
              fontSize: 13, fontWeight: 600,
              border: '1px solid rgba(236,200,92,0.4)',
            }}>
              <Layers style={{ width: 14, height: 14 }} />
              {language === 'ru' ? `Сегодня: ${dueCount} карточек` : `Σήμερα: ${dueCount} κάρτες`}
            </div>
          )}
        </div>

        {/* Topics grid — 2 columns */}
        <div className="learn-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 20, marginBottom: 64 }}>
          {TOPIC_META.map(meta => {
            const tp = topicProgress?.[meta.id];
            const total = topicTotals?.[meta.id] || 0;
            const seen = tp ? (tp.mastered) : 0;
            const pct = total > 0 ? Math.round((seen / total) * 100) : 0;
            const accuracy = tp && tp.total > 0 ? Math.round((tp.correct / tp.total) * 100) : null;
            const Icon = meta.icon;

            return (
              <div
                key={meta.id}
                className="learn-topic-card glass-panel"
                data-topic={meta.dataAttr}
                style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: 0, overflow: 'hidden', cursor: 'default' }}
              >
                {/* Colored top accent */}
                <div style={{ height: 4, background: meta.color, borderRadius: '16px 16px 0 0', flexShrink: 0 }} />

                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
                  {/* Icon row + accuracy badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    {/* Icon */}
                    <div style={{
                      width: 44, height: 44, borderRadius: 14,
                      background: meta.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: meta.color, fontSize: 22,
                    }}>
                      <Icon style={{ width: 20, height: 20 }} />
                    </div>

                    {/* Progress % badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {/* Progress circle mini */}
                      <svg width="32" height="32" viewBox="0 0 32 32" style={{ transform: 'rotate(-90deg)' }}>
                        <circle cx="16" cy="16" r="12" fill="none" stroke="rgba(47,53,50,0.08)" strokeWidth="3" />
                        <circle
                          cx="16" cy="16" r="12" fill="none"
                          stroke={meta.color} strokeWidth="3"
                          strokeDasharray={`${2 * Math.PI * 12}`}
                          strokeDashoffset={`${2 * Math.PI * 12 * (1 - pct / 100)}`}
                          strokeLinecap="round"
                          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                        />
                      </svg>
                      <span style={{ fontSize: 15, fontWeight: 700, color: 'hsl(var(--foreground))', minWidth: 36 }}>{pct}%</span>
                    </div>
                  </div>

                  {/* Topic name + description */}
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 600, color: 'hsl(var(--foreground))', marginBottom: 4 }}>
                      {t(`topic.${meta.id}`)}
                    </h3>
                    <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', lineHeight: 1.5 }}>
                      {t(`topic.${meta.id}.desc`)}
                    </p>
                  </div>

                  {/* Accuracy badge (optional) */}
                  {accuracy !== null && (
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '4px 10px', borderRadius: 99, width: 'fit-content',
                      fontSize: 12, fontWeight: 700,
                      background: accuracy >= 70 ? 'rgba(125,138,87,0.12)' : accuracy >= 50 ? 'rgba(236,200,92,0.18)' : 'rgba(224,108,108,0.10)',
                      color: accuracy >= 70 ? '#4E5A33' : accuracy >= 50 ? '#7A5E0E' : '#A03030',
                      border: `1px solid ${accuracy >= 70 ? 'rgba(125,138,87,0.2)' : accuracy >= 50 ? 'rgba(236,200,92,0.3)' : 'rgba(224,108,108,0.2)'}`,
                    }}>
                      {accuracy >= 70
                        ? <CheckCircle style={{ width: 11, height: 11 }} />
                        : accuracy >= 50
                        ? <TrendingUp style={{ width: 11, height: 11 }} />
                        : <AlertCircle style={{ width: 11, height: 11 }} />}
                      {accuracy}%
                    </div>
                  )}

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 4 }}>
                    <Link to={`/learn/${meta.id}/flashcards`} style={{ textDecoration: 'none' }}>
                      <button className="learn-action-btn">
                        <Layers style={{ width: 14, height: 14 }} />
                        {language === 'ru' ? 'Карточки' : 'Κάρτες'}
                      </button>
                    </Link>
                    <Link to={`/learn/${meta.id}/quiz`} style={{ textDecoration: 'none' }}>
                      <button className="learn-action-btn learn-action-primary">
                        <PenLine style={{ width: 14, height: 14 }} />
                        {language === 'ru' ? 'Тест' : 'Κουίζ'}
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Exam section */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <h2 style={{ fontSize: 22, fontWeight: 500, letterSpacing: '-0.01em', color: 'hsl(var(--foreground))', margin: 0, whiteSpace: 'nowrap' }}>
              {language === 'ru' ? 'Режимы экзамена' : 'Λειτουργίες εξέτασης'}
            </h2>
            <div style={{ flex: 1, height: 1, background: 'rgba(47,53,50,0.08)' }} />
          </div>

          {/* Dark exam card */}
          <div className="learn-exam-card" style={{
            background: '#2F3532',
            color: '#fff',
            borderRadius: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '40px 52px',
            position: 'relative', overflow: 'hidden',
            boxShadow: '0 12px 48px -8px rgba(47,53,50,0.35)',
            gap: 40, flexWrap: 'wrap',
          }}>
            {/* Deco icon */}
            <GraduationCap style={{ position: 'absolute', right: -30, bottom: -50, width: 260, height: 260, color: 'rgba(255,255,255,0.04)' }} />

            {/* Left: icon + text */}
            <div className="learn-exam-left" style={{ display: 'flex', alignItems: 'center', gap: 28, flex: 1, minWidth: 260, position: 'relative', zIndex: 1 }}>
              <div style={{
                width: 64, height: 64, borderRadius: 20,
                background: 'rgba(236,200,92,0.20)',
                color: '#ECC85C',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <GraduationCap style={{ width: 32, height: 32 }} />
              </div>
              <div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '4px 10px', borderRadius: 99, marginBottom: 10,
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
                  background: 'rgba(236,200,92,0.20)', color: '#ECC85C',
                }}>
                  {language === 'ru' ? 'Финальный этап' : 'Τελικό στάδιο'}
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>
                  {language === 'ru' ? 'Симуляция экзамена' : 'Προσομοίωση εξέτασης'}
                </div>
                <div style={{ fontSize: 14, opacity: 0.50, lineHeight: 1.5 }}>
                  {language === 'ru'
                    ? 'Проверьте себя в условиях, приближённых к реальному тесту на гражданство. Все темы, без подсказок.'
                    : 'Δοκιμάστε τον εαυτό σας σε συνθήκες κοντά στην πραγματική εξέταση ιθαγένειας.'}
                </div>
              </div>
            </div>

            {/* Middle: stats */}
            <div style={{ display: 'flex', gap: 32, flexShrink: 0, position: 'relative', zIndex: 1 }}>
              {[
                { value: '20', label: language === 'ru' ? 'вопросов' : 'ερωτήσεις' },
                null,
                { value: '45', label: language === 'ru' ? 'минут' : 'λεπτά' },
                null,
                { value: '70%', label: language === 'ru' ? 'проходной' : 'βάση επιτυχίας' },
              ].map((stat, i) =>
                stat === null
                  ? <div key={i} style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.10)', alignSelf: 'center' }} />
                  : (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>{stat.value}</span>
                      <span style={{ fontSize: 11, opacity: 0.45, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, whiteSpace: 'nowrap' }}>{stat.label}</span>
                    </div>
                  )
              )}
            </div>

            {/* Right: CTA */}
            <Link to="/learn/exam" style={{ textDecoration: 'none', position: 'relative', zIndex: 1 }}>
              <button
                className="exam-start-btn"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '14px 28px', borderRadius: 99,
                  border: 'none', background: '#ECC85C', color: '#2F3532',
                  fontSize: 15, fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0,
                  transition: 'all 0.18s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = '#f0d06e';
                  (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 24px -4px rgba(236,200,92,0.5)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = '#ECC85C';
                  (e.currentTarget as HTMLButtonElement).style.transform = '';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '';
                }}
              >
                {language === 'ru' ? 'Начать экзамен' : 'Έναρξη εξέτασης'}
                <ArrowRight style={{ width: 16, height: 16 }} />
              </button>
            </Link>
          </div>
        </div>

      </div>

      <style>{`
        @media (max-width: 640px) {
          .learn-grid { grid-template-columns: 1fr !important; }
          .learn-exam-card { padding: 28px 24px !important; gap: 24px !important; }
          .learn-exam-left { min-width: 0 !important; }
        }
        .learn-topic-card {
          transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
        }
        .learn-topic-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 16px 40px -8px rgba(0,0,0,0.10);
        }
        .learn-action-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 9px 18px;
          border: 1.5px solid rgba(47,53,50,0.30);
          border-radius: 100px;
          background: rgba(255,255,255,0.55);
          color: #2F3532;
          font-size: 13px; font-weight: 700;
          cursor: pointer; font-family: inherit;
          transition: all 0.18s cubic-bezier(0.25,0.8,0.25,1);
        }
        .learn-action-btn:hover {
          background: #fff;
          border-color: rgba(47,53,50,0.18);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px -2px rgba(0,0,0,0.08);
        }
        .learn-action-primary {
          background: rgba(255,255,255,0.55);
          color: #2F3532;
          border-color: rgba(47,53,50,0.30);
          font-weight: 700;
        }
        .learn-action-primary:hover {
          background: #fff !important;
          border-color: rgba(47,53,50,0.45) !important;
          box-shadow: 0 4px 12px -2px rgba(0,0,0,0.08) !important;
        }
      `}</style>
    </Layout>
  );
}
