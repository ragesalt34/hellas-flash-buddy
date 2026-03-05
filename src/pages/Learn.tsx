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
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px 80px' }}>

        {/* Page header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 500, letterSpacing: '-0.02em', color: 'hsl(var(--foreground))', marginBottom: 4 }}>
              {language === 'ru' ? 'Выберите тему' : 'Επιλέξτε θέμα'}
            </h1>
            <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))' }}>
              {language === 'ru'
                ? 'Начните изучение с интересующей вас темы или продолжите прогресс'
                : 'Ξεκινήστε με ένα θέμα ή συνεχίστε την πρόοδό σας'}
            </p>
          </div>
          {dueCount != null && dueCount > 0 && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 99,
              background: 'rgba(236,200,92,0.22)', color: '#584610',
              fontSize: 12, fontWeight: 600,
              border: '1px solid rgba(236,200,92,0.4)',
            }}>
              <Layers style={{ width: 13, height: 13 }} />
              {language === 'ru' ? `Сегодня: ${dueCount} карточек` : `Σήμερα: ${dueCount} κάρτες`}
            </div>
          )}
        </div>

        {/* Topics grid — 2 columns on mobile, 2 on desktop */}
        <div className="learn-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14, marginBottom: 32 }}>
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

                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                  {/* Icon row + progress */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 12,
                      background: meta.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: meta.color,
                    }}>
                      <Icon style={{ width: 18, height: 18 }} />
                    </div>

                    {/* Progress circle mini */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <svg width="28" height="28" viewBox="0 0 32 32" style={{ transform: 'rotate(-90deg)' }}>
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
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'hsl(var(--foreground))' }}>{pct}%</span>
                    </div>
                  </div>

                  {/* Topic name + description */}
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 600, color: 'hsl(var(--foreground))', marginBottom: 3 }}>
                      {t(`topic.${meta.id}`)}
                    </h3>
                    <p className="learn-topic-desc" style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {t(`topic.${meta.id}.desc`)}
                    </p>
                  </div>

                  {/* Accuracy badge */}
                  {accuracy !== null && (
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '3px 8px', borderRadius: 99, width: 'fit-content',
                      fontSize: 11, fontWeight: 700,
                      background: accuracy >= 70 ? 'rgba(125,138,87,0.12)' : accuracy >= 50 ? 'rgba(236,200,92,0.18)' : 'rgba(224,108,108,0.10)',
                      color: accuracy >= 70 ? '#4E5A33' : accuracy >= 50 ? '#7A5E0E' : '#A03030',
                      border: `1px solid ${accuracy >= 70 ? 'rgba(125,138,87,0.2)' : accuracy >= 50 ? 'rgba(236,200,92,0.3)' : 'rgba(224,108,108,0.2)'}`,
                    }}>
                      {accuracy >= 70
                        ? <CheckCircle style={{ width: 10, height: 10 }} />
                        : accuracy >= 50
                        ? <TrendingUp style={{ width: 10, height: 10 }} />
                        : <AlertCircle style={{ width: 10, height: 10 }} />}
                      {accuracy}%
                    </div>
                  )}

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 'auto', paddingTop: 2 }}>
                    <Link to={`/learn/${meta.id}/flashcards`} style={{ textDecoration: 'none', flex: 1 }}>
                      <button className="learn-action-btn" style={{ width: '100%', justifyContent: 'center' }}>
                        <Layers style={{ width: 13, height: 13 }} />
                        {language === 'ru' ? 'Карточки' : 'Κάρτες'}
                      </button>
                    </Link>
                    <Link to={`/learn/${meta.id}/quiz`} style={{ textDecoration: 'none', flex: 1 }}>
                      <button className="learn-action-btn learn-action-primary" style={{ width: '100%', justifyContent: 'center' }}>
                        <PenLine style={{ width: 13, height: 13 }} />
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <h2 style={{ fontSize: 20, fontWeight: 500, letterSpacing: '-0.01em', color: 'hsl(var(--foreground))', margin: 0, whiteSpace: 'nowrap' }}>
              {language === 'ru' ? 'Режимы экзамена' : 'Λειτουργίες εξέτασης'}
            </h2>
            <div style={{ flex: 1, height: 1, background: 'rgba(47,53,50,0.08)' }} />
          </div>

          {/* Dark exam card */}
          <div className="learn-exam-card" style={{
            background: '#2F3532',
            color: '#fff',
            borderRadius: 28,
            display: 'flex', flexDirection: 'column',
            padding: '24px 20px',
            position: 'relative', overflow: 'hidden',
            boxShadow: '0 12px 48px -8px rgba(47,53,50,0.35)',
            gap: 20,
          }}>
            {/* Deco icon */}
            <GraduationCap style={{ position: 'absolute', right: -20, bottom: -40, width: 180, height: 180, color: 'rgba(255,255,255,0.04)' }} />

            {/* Top: icon + text */}
            <div className="learn-exam-left" style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative', zIndex: 1 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 16,
                background: 'rgba(236,200,92,0.20)',
                color: '#ECC85C',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <GraduationCap style={{ width: 26, height: 26 }} />
              </div>
              <div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 8px', borderRadius: 99, marginBottom: 6,
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
                  background: 'rgba(236,200,92,0.20)', color: '#ECC85C',
                }}>
                  {language === 'ru' ? 'Финальный этап' : 'Τελικό στάδιο'}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>
                  {language === 'ru' ? 'Симуляция экзамена' : 'Προσομοίωση εξέτασης'}
                </div>
                <div style={{ fontSize: 12, opacity: 0.55, lineHeight: 1.5 }}>
                  {language === 'ru'
                    ? 'Проверьте себя в условиях реального теста. Все темы, без подсказок.'
                    : 'Δοκιμάστε τον εαυτό σας σε συνθήκες κοντά στην πραγματική εξέταση.'}
                </div>
              </div>
            </div>

            {/* Stats + CTA row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1, flexWrap: 'wrap', gap: 12 }}>
              <div className="learn-exam-stats" style={{ display: 'flex', gap: 20 }}>
                {[
                  { value: '20', label: language === 'ru' ? 'вопросов' : 'ερωτήσεις' },
                  { value: '45', label: language === 'ru' ? 'минут' : 'λεπτά' },
                  { value: '70%', label: language === 'ru' ? 'проходной' : 'βάση' },
                ].map((stat, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>{stat.value}</span>
                    <span style={{ fontSize: 10, opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, whiteSpace: 'nowrap' }}>{stat.label}</span>
                  </div>
                ))}
              </div>

              <Link to="/learn/exam" style={{ textDecoration: 'none', position: 'relative', zIndex: 1 }}>
                <button
                  className="exam-start-btn"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '12px 22px', borderRadius: 99,
                    border: 'none', background: '#ECC85C', color: '#2F3532',
                    fontSize: 14, fontWeight: 700, cursor: 'pointer',
                    fontFamily: 'inherit', whiteSpace: 'nowrap',
                    transition: 'all 0.18s',
                  }}
                >
                  {language === 'ru' ? 'Начать экзамен' : 'Έναρξη εξέτασης'}
                  <ArrowRight style={{ width: 15, height: 15 }} />
                </button>
              </Link>
            </div>
          </div>
        </div>

      </div>

      <style>{`
        .learn-topic-card {
          transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
        }
        .learn-topic-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 40px -8px rgba(0,0,0,0.10);
        }
        .learn-action-btn {
          display: flex; align-items: center; gap: 5px;
          padding: 8px 12px;
          border: 1.5px solid rgba(47,53,50,0.30);
          border-radius: 100px;
          background: rgba(255,255,255,0.55);
          color: #2F3532;
          font-size: 12px; font-weight: 700;
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
        @media (min-width: 640px) {
          .learn-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 20px !important; }
          .learn-exam-card { flex-direction: row !important; align-items: center !important; padding: 36px 44px !important; }
          .learn-exam-left { flex: 1 !important; }
        }
      `}</style>
    </Layout>
  );
}
