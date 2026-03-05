import { Link, Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Layers, PenLine, GraduationCap,
  History, Palette, Scale, MapPin,
  ArrowRight, Loader2, CheckCircle, TrendingUp, AlertCircle, BookOpen,
} from 'lucide-react';

const TOPIC_META = [
  {
    id: 'history',   icon: History,  color: '#5B8DB8',
    bg: 'rgba(91,141,184,0.10)',
    gradient: 'linear-gradient(135deg, rgba(91,141,184,0.18) 0%, rgba(91,141,184,0.04) 100%)',
    shadow: 'rgba(91,141,184,0.20)',
    dataAttr: 'history',
  },
  {
    id: 'culture',   icon: Palette,  color: '#9B7EC8',
    bg: 'rgba(155,126,200,0.10)',
    gradient: 'linear-gradient(135deg, rgba(155,126,200,0.18) 0%, rgba(155,126,200,0.04) 100%)',
    shadow: 'rgba(155,126,200,0.20)',
    dataAttr: 'culture',
  },
  {
    id: 'laws',      icon: Scale,    color: '#7D8A57',
    bg: 'rgba(125,138,87,0.10)',
    gradient: 'linear-gradient(135deg, rgba(125,138,87,0.18) 0%, rgba(125,138,87,0.04) 100%)',
    shadow: 'rgba(125,138,87,0.20)',
    dataAttr: 'laws',
  },
  {
    id: 'geography', icon: MapPin,   color: '#D4874A',
    bg: 'rgba(212,135,74,0.10)',
    gradient: 'linear-gradient(135deg, rgba(212,135,74,0.18) 0%, rgba(212,135,74,0.04) 100%)',
    shadow: 'rgba(212,135,74,0.20)',
    dataAttr: 'geo',
  },
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
      <div className="learn-page-root">

        {/* ── Page header ── */}
        <div className="learn-header">
          <div>
            <h1 className="learn-title">
              {language === 'ru' ? 'Выберите тему' : 'Επιλέξτε θέμα'}
            </h1>
            <p className="learn-subtitle">
              {language === 'ru'
                ? 'Начните с интересующей темы или продолжите прогресс'
                : 'Ξεκινήστε με ένα θέμα ή συνεχίστε την πρόοδό σας'}
            </p>
          </div>

          {dueCount != null && dueCount > 0 && (
            <div className="learn-due-badge">
              <Layers style={{ width: 12, height: 12 }} />
              {language === 'ru' ? `${dueCount} на повторение` : `${dueCount} για επανάληψη`}
            </div>
          )}
        </div>

        {/* ── Topic cards ── */}
        <div className="learn-topics-grid">
          {TOPIC_META.map(meta => {
            const tp = topicProgress?.[meta.id];
            const total = topicTotals?.[meta.id] || 0;
            const mastered = tp ? tp.mastered : 0;
            const pct = total > 0 ? Math.round((mastered / total) * 100) : 0;
            const accuracy = tp && tp.total > 0 ? Math.round((tp.correct / tp.total) * 100) : null;
            const Icon = meta.icon;
            const circumference = 2 * Math.PI * 14;

            return (
              <div
                key={meta.id}
                className="learn-card glass-panel"
                data-topic={meta.dataAttr}
              >
                {/* Left accent bar */}
                <div className="learn-card-accent" style={{ background: meta.color }} />

                {/* Card body */}
                <div className="learn-card-body">

                  {/* Top row: icon + progress ring */}
                  <div className="learn-card-top">
                    <div className="learn-card-icon" style={{ background: meta.bg, color: meta.color }}>
                      <Icon style={{ width: 22, height: 22 }} />
                    </div>

                    <div className="learn-progress-ring-wrap">
                      <svg width="44" height="44" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                        <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(47,53,50,0.07)" strokeWidth="3" />
                        <circle
                          cx="18" cy="18" r="14" fill="none"
                          stroke={meta.color} strokeWidth="3"
                          strokeDasharray={`${circumference}`}
                          strokeDashoffset={`${circumference * (1 - pct / 100)}`}
                          strokeLinecap="round"
                          style={{ transition: 'stroke-dashoffset 0.7s ease' }}
                        />
                      </svg>
                      <span className="learn-progress-pct" style={{ color: meta.color }}>{pct}%</span>
                    </div>
                  </div>

                  {/* Title + description */}
                  <div className="learn-card-text">
                    <h3 className="learn-card-name">{t(`topic.${meta.id}`)}</h3>
                    <p className="learn-card-desc">{t(`topic.${meta.id}.desc`)}</p>
                  </div>

                  {/* Progress bar */}
                  <div className="learn-progress-bar-track">
                    <div
                      className="learn-progress-bar-fill"
                      style={{ width: `${pct}%`, background: meta.color }}
                    />
                  </div>

                  {/* Stats row */}
                  <div className="learn-card-stats">
                    <span className="learn-stat-pill">
                      <BookOpen style={{ width: 11, height: 11 }} />
                      {mastered}/{total}
                    </span>

                    {accuracy !== null && (
                      <span
                        className="learn-stat-pill"
                        style={{
                          background: accuracy >= 70
                            ? 'rgba(125,138,87,0.12)'
                            : accuracy >= 50
                            ? 'rgba(236,200,92,0.16)'
                            : 'rgba(224,108,108,0.10)',
                          color: accuracy >= 70 ? '#4E5A33' : accuracy >= 50 ? '#7A5E0E' : '#A03030',
                          borderColor: accuracy >= 70
                            ? 'rgba(125,138,87,0.22)'
                            : accuracy >= 50
                            ? 'rgba(236,200,92,0.28)'
                            : 'rgba(224,108,108,0.18)',
                        }}
                      >
                        {accuracy >= 70
                          ? <CheckCircle style={{ width: 11, height: 11 }} />
                          : accuracy >= 50
                          ? <TrendingUp style={{ width: 11, height: 11 }} />
                          : <AlertCircle style={{ width: 11, height: 11 }} />}
                        {accuracy}%
                      </span>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="learn-card-actions">
                    <Link to={`/learn/${meta.id}/flashcards`} style={{ textDecoration: 'none', flex: 1 }}>
                      <button className="learn-btn learn-btn-ghost" style={{ '--btn-color': meta.color } as React.CSSProperties}>
                        <Layers style={{ width: 14, height: 14 }} />
                        {language === 'ru' ? 'Карточки' : 'Κάρτες'}
                      </button>
                    </Link>
                    <Link to={`/learn/${meta.id}/quiz`} style={{ textDecoration: 'none', flex: 1 }}>
                      <button className="learn-btn learn-btn-filled" style={{ '--btn-color': meta.color, background: meta.color } as React.CSSProperties}>
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

        {/* ── Exam section ── */}
        <div className="learn-section-label">
          <span>{language === 'ru' ? 'Финальный этап' : 'Τελικό στάδιο'}</span>
          <div className="learn-divider" />
        </div>

        <div className="learn-exam-card">
          {/* Deco */}
          <GraduationCap className="learn-exam-deco" />

          <div className="learn-exam-body">
            {/* Icon */}
            <div className="learn-exam-icon">
              <GraduationCap style={{ width: 28, height: 28 }} />
            </div>

            {/* Text block */}
            <div className="learn-exam-text">
              <div className="learn-exam-eyebrow">
                {language === 'ru' ? 'Официальный формат' : 'Επίσημη μορφή'}
              </div>
              <h2 className="learn-exam-title">
                {language === 'ru' ? 'Симуляция экзамена' : 'Προσομοίωση εξέτασης'}
              </h2>
              <p className="learn-exam-desc">
                {language === 'ru'
                  ? 'Все темы вместе, без подсказок — как в реальном тесте на гражданство'
                  : 'Όλα τα θέματα μαζί, χωρίς βοήθεια — όπως στην πραγματική εξέταση'}
              </p>
            </div>

            {/* Stats pills */}
            <div className="learn-exam-stats">
              {[
                { value: '20', label: language === 'ru' ? 'вопр.' : 'ερωτ.' },
                { value: '45', label: language === 'ru' ? 'мин.' : 'λεπτά' },
                { value: '70%', label: language === 'ru' ? 'проходной' : 'βάση' },
              ].map((s, i) => (
                <div key={i} className="learn-exam-stat">
                  <span className="learn-exam-stat-val">{s.value}</span>
                  <span className="learn-exam-stat-lbl">{s.label}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <Link to="/learn/exam" style={{ textDecoration: 'none', flexShrink: 0 }}>
              <button className="learn-exam-cta">
                {language === 'ru' ? 'Начать' : 'Έναρξη'}
                <ArrowRight style={{ width: 16, height: 16 }} />
              </button>
            </Link>
          </div>
        </div>

      </div>

      <style>{`
        /* ── Layout ── */
        .learn-page-root {
          max-width: 900px;
          margin: 0 auto;
          padding: 32px 20px 100px;
        }

        /* ── Header ── */
        .learn-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 28px;
          flex-wrap: wrap;
        }
        .learn-title {
          font-size: 28px;
          font-weight: 600;
          letter-spacing: -0.025em;
          color: hsl(var(--foreground));
          margin-bottom: 5px;
        }
        .learn-subtitle {
          font-size: 13.5px;
          color: hsl(var(--muted-foreground));
          line-height: 1.5;
        }
        .learn-due-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 14px;
          border-radius: 99px;
          background: rgba(236,200,92,0.20);
          color: #584610;
          font-size: 12px;
          font-weight: 700;
          border: 1px solid rgba(236,200,92,0.40);
          white-space: nowrap;
          flex-shrink: 0;
        }

        /* ── Topics grid: 2 col on desktop, 1 on mobile ── */
        .learn-topics-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-bottom: 36px;
        }

        /* ── Card ── */
        .learn-card {
          display: flex;
          flex-direction: row;
          overflow: hidden;
          padding: 0;
          border-radius: 20px;
          cursor: default;
          transition: transform 0.28s cubic-bezier(0.25,0.8,0.25,1), box-shadow 0.28s;
        }
        .learn-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 50px -10px rgba(0,0,0,0.13);
        }
        .learn-card-accent {
          width: 5px;
          flex-shrink: 0;
          border-radius: 0;
        }
        .learn-card-body {
          padding: 20px 18px;
          display: flex;
          flex-direction: column;
          gap: 13px;
          flex: 1;
          min-width: 0;
        }

        /* Top row */
        .learn-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .learn-card-icon {
          width: 46px;
          height: 46px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        /* Progress ring */
        .learn-progress-ring-wrap {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .learn-progress-pct {
          position: absolute;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: -0.03em;
        }

        /* Text */
        .learn-card-text { display: flex; flex-direction: column; gap: 3px; }
        .learn-card-name {
          font-size: 16px;
          font-weight: 700;
          color: hsl(var(--foreground));
          letter-spacing: -0.01em;
        }
        .learn-card-desc {
          font-size: 12px;
          color: hsl(var(--muted-foreground));
          line-height: 1.45;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* Progress bar */
        .learn-progress-bar-track {
          height: 4px;
          background: rgba(47,53,50,0.07);
          border-radius: 99px;
          overflow: hidden;
        }
        .learn-progress-bar-fill {
          height: 100%;
          border-radius: 99px;
          transition: width 0.7s ease;
        }

        /* Stats row */
        .learn-card-stats {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .learn-stat-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 9px;
          border-radius: 99px;
          font-size: 11px;
          font-weight: 600;
          background: rgba(47,53,50,0.06);
          color: hsl(var(--muted-foreground));
          border: 1px solid rgba(47,53,50,0.10);
        }

        /* Action buttons */
        .learn-card-actions {
          display: flex;
          gap: 8px;
          margin-top: 2px;
        }
        .learn-btn {
          width: 100%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 9px 10px;
          border-radius: 12px;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.18s;
          border: none;
        }
        .learn-btn-ghost {
          background: rgba(255,255,255,0.60);
          color: #2F3532;
          border: 1.5px solid rgba(47,53,50,0.18) !important;
        }
        .learn-btn-ghost:hover {
          background: rgba(255,255,255,0.90);
          border-color: rgba(47,53,50,0.30) !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px -3px rgba(0,0,0,0.09);
        }
        .learn-btn-filled {
          color: #fff;
          opacity: 0.92;
        }
        .learn-btn-filled:hover {
          opacity: 1;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px -4px rgba(0,0,0,0.18);
        }

        /* ── Section label ── */
        .learn-section-label {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 14px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: hsl(var(--muted-foreground));
        }
        .learn-divider {
          flex: 1;
          height: 1px;
          background: rgba(47,53,50,0.08);
        }

        /* ── Exam card ── */
        .learn-exam-card {
          background: #2F3532;
          border-radius: 24px;
          padding: 32px 36px;
          color: #fff;
          position: relative;
          overflow: hidden;
          box-shadow: 0 16px 56px -8px rgba(47,53,50,0.40);
        }
        .learn-exam-deco {
          position: absolute;
          right: -24px;
          bottom: -40px;
          width: 200px;
          height: 200px;
          color: rgba(255,255,255,0.035);
          pointer-events: none;
        }
        .learn-exam-body {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 24px;
          flex-wrap: wrap;
        }
        .learn-exam-icon {
          width: 60px;
          height: 60px;
          border-radius: 18px;
          background: rgba(236,200,92,0.18);
          color: #ECC85C;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .learn-exam-text {
          flex: 1;
          min-width: 160px;
        }
        .learn-exam-eyebrow {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #ECC85C;
          opacity: 0.85;
          margin-bottom: 5px;
        }
        .learn-exam-title {
          font-size: 20px;
          font-weight: 700;
          letter-spacing: -0.02em;
          margin-bottom: 6px;
        }
        .learn-exam-desc {
          font-size: 12.5px;
          opacity: 0.52;
          line-height: 1.55;
        }
        .learn-exam-stats {
          display: flex;
          gap: 20px;
          flex-shrink: 0;
        }
        .learn-exam-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
        }
        .learn-exam-stat-val {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.03em;
        }
        .learn-exam-stat-lbl {
          font-size: 10px;
          opacity: 0.45;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-weight: 600;
          white-space: nowrap;
        }
        .learn-exam-cta {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 13px 26px;
          border-radius: 99px;
          border: none;
          background: #ECC85C;
          color: #2F3532;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          font-family: inherit;
          white-space: nowrap;
          transition: all 0.18s;
          flex-shrink: 0;
        }
        .learn-exam-cta:hover {
          background: #f5d575;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px -4px rgba(236,200,92,0.45);
        }

        /* ── Mobile ── */
        @media (max-width: 600px) {
          .learn-page-root { padding: 20px 14px 90px; }
          .learn-title { font-size: 22px; }
          .learn-topics-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          .learn-card-body { padding: 16px 14px; gap: 11px; }
          .learn-card-name { font-size: 15px; }
          .learn-exam-card { padding: 22px 18px; }
          .learn-exam-body { flex-direction: column; align-items: flex-start; gap: 16px; }
          .learn-exam-icon { width: 48px; height: 48px; border-radius: 14px; }
          .learn-exam-cta { width: 100%; justify-content: center; }
          .learn-exam-title { font-size: 18px; }
        }
      `}</style>
    </Layout>
  );
}
