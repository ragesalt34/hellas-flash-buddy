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
    gradient: 'linear-gradient(135deg, #5B8DB8 0%, #7BA8D0 60%, #A3C4E0 100%)',
    shadow: 'rgba(91,141,184,0.35)',
  },
  {
    id: 'culture',   icon: Palette,  color: '#9B7EC8',
    gradient: 'linear-gradient(135deg, #9B7EC8 0%, #B59ADA 60%, #D0BEE8 100%)',
    shadow: 'rgba(155,126,200,0.35)',
  },
  {
    id: 'laws',      icon: Scale,    color: '#7D8A57',
    gradient: 'linear-gradient(135deg, #7D8A57 0%, #99A870 60%, #B5C28E 100%)',
    shadow: 'rgba(125,138,87,0.35)',
  },
  {
    id: 'geography', icon: MapPin,   color: '#D4874A',
    gradient: 'linear-gradient(135deg, #D4874A 0%, #E0A06A 60%, #ECC090 100%)',
    shadow: 'rgba(212,135,74,0.35)',
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
      <div className="lrn-root">

        {/* ── Page header ── */}
        <div className="lrn-header">
          <div>
            <h1 className="lrn-title">
              {language === 'ru' ? 'Выберите тему' : 'Επιλέξτε θέμα'}
            </h1>
            <p className="lrn-subtitle">
              {language === 'ru'
                ? 'Начните с интересующей темы или продолжите прогресс'
                : 'Ξεκινήστε με ένα θέμα ή συνεχίστε την πρόοδό σας'}
            </p>
          </div>

          {dueCount != null && dueCount > 0 && (
            <div className="lrn-due-badge">
              <Layers style={{ width: 12, height: 12 }} />
              {language === 'ru' ? `${dueCount} на повторение` : `${dueCount} για επανάληψη`}
            </div>
          )}
        </div>

        {/* ── Topic cards ── */}
        <div className="lrn-grid">
          {TOPIC_META.map(meta => {
            const tp = topicProgress?.[meta.id];
            const total = topicTotals?.[meta.id] || 0;
            const mastered = tp ? tp.mastered : 0;
            const pct = total > 0 ? Math.round((mastered / total) * 100) : 0;
            const accuracy = tp && tp.total > 0 ? Math.round((tp.correct / tp.total) * 100) : null;
            const Icon = meta.icon;
            const R = 26;
            const circumference = 2 * Math.PI * R;

            return (
              <div key={meta.id} className="lrn-card liquid-glass-card-v2">
                {/* Top banner */}
                <div className="lrn-banner" style={{ background: meta.gradient }}>
                  {/* Floating icon */}
                  <div className="lrn-icon-float">
                    <Icon style={{ width: 28, height: 28, color: meta.color }} />
                  </div>
                  {/* Progress ring in corner */}
                  <div className="lrn-ring-corner">
                    <svg width="60" height="60" viewBox="0 0 60 60" style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx="30" cy="30" r={R} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="4" />
                      <circle
                        cx="30" cy="30" r={R} fill="none"
                        stroke="#fff" strokeWidth="4"
                        strokeDasharray={`${circumference}`}
                        strokeDashoffset={`${circumference * (1 - pct / 100)}`}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 0.7s ease', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.2))' }}
                      />
                    </svg>
                    <span className="lrn-ring-pct">{pct}%</span>
                  </div>
                </div>

                {/* Card content */}
                <div className="lrn-body">
                  <h3 className="lrn-name">{t(`topic.${meta.id}`)}</h3>
                  <p className="lrn-desc">{t(`topic.${meta.id}.desc`)}</p>

                  {/* Progress bar */}
                  <div className="lrn-bar-track">
                    <div className="lrn-bar-fill" style={{ width: `${pct}%`, background: meta.color }} />
                  </div>

                  {/* Stats */}
                  <div className="lrn-stats">
                    <span className="lrn-pill">
                      <BookOpen style={{ width: 11, height: 11 }} />
                      {mastered}/{total}
                    </span>
                    {accuracy !== null && (
                      <span
                        className="lrn-pill"
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

                  {/* Buttons */}
                  <div className="lrn-actions">
                    <Link to={`/learn/${meta.id}/flashcards`} style={{ textDecoration: 'none', flex: 1 }}>
                      <button className="lrn-btn lrn-btn-ghost">
                        <Layers style={{ width: 14, height: 14 }} />
                        {language === 'ru' ? 'Карточки' : 'Κάρτες'}
                      </button>
                    </Link>
                    <Link to={`/learn/${meta.id}/quiz`} style={{ textDecoration: 'none', flex: 1 }}>
                      <button
                        className="lrn-btn lrn-btn-solid"
                        style={{ '--tc': meta.color, '--ts': meta.shadow } as React.CSSProperties}
                      >
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
        <div className="lrn-divider-row">
          <span>{language === 'ru' ? 'Финальный этап' : 'Τελικό στάδιο'}</span>
          <div className="lrn-divider-line" />
        </div>

        <div className="lrn-exam">
          {/* Greek key decorative border (top) */}
          <div className="lrn-exam-key-border" />
          {/* Decorative ε */}
          <div className="lrn-exam-epsilon">ε</div>

          <div className="lrn-exam-inner">
            <div className="lrn-exam-icon">
              <GraduationCap style={{ width: 30, height: 30 }} />
            </div>

            <div className="lrn-exam-text">
              <div className="lrn-exam-eyebrow">
                {language === 'ru' ? 'Официальный формат' : 'Επίσημη μορφή'}
              </div>
              <h2 className="lrn-exam-title">
                {language === 'ru' ? 'Симуляция экзамена' : 'Προσομοίωση εξέτασης'}
              </h2>
              <p className="lrn-exam-desc">
                {language === 'ru'
                  ? 'Все темы вместе, без подсказок — как в реальном тесте'
                  : 'Όλα τα θέματα μαζί, χωρίς βοήθεια — σαν πραγματική εξέταση'}
              </p>
            </div>

            <div className="lrn-exam-chips">
              {[
                { value: '20', label: language === 'ru' ? 'вопросов' : 'ερωτ.' },
                { value: '45', label: language === 'ru' ? 'минут' : 'λεπτά' },
                { value: '70%', label: language === 'ru' ? 'проходной' : 'βάση' },
              ].map((s, i) => (
                <div key={i} className="lrn-exam-chip">
                  <span className="lrn-exam-chip-val">{s.value}</span>
                  <span className="lrn-exam-chip-lbl">{s.label}</span>
                </div>
              ))}
            </div>

            <Link to="/learn/exam" style={{ textDecoration: 'none', flexShrink: 0 }}>
              <button className="lrn-exam-cta">
                {language === 'ru' ? 'Начать экзамен' : 'Έναρξη'}
                <ArrowRight style={{ width: 16, height: 16 }} />
              </button>
            </Link>
          </div>
        </div>

      </div>

      <style>{`
        /* ══ Layout ══ */
        .lrn-root {
          max-width: 920px;
          margin: 0 auto;
          padding: 36px 20px 100px;
        }

        /* ══ Header ══ */
        .lrn-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 32px;
          flex-wrap: wrap;
        }
        .lrn-title {
          font-size: 30px;
          font-weight: 700;
          letter-spacing: -0.03em;
          color: hsl(var(--foreground));
          margin-bottom: 6px;
        }
        .lrn-subtitle {
          font-size: 14px;
          color: hsl(var(--muted-foreground));
          line-height: 1.5;
        }
        .lrn-due-badge {
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
          animation: pulse-soft 2.5s ease-in-out infinite;
        }
        @keyframes pulse-soft {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.03); }
        }

        /* ══ Grid ══ */
        .lrn-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-bottom: 40px;
        }

        /* ══ Card ══ */
        .lrn-card {
          border-radius: 22px !important;
          padding: 0 !important;
          cursor: default;
        }

        /* ── Banner ── */
        .lrn-banner {
          position: relative;
          height: 80px;
          border-radius: 22px 22px 0 0;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          padding: 0 18px 0 22px;
        }
        .lrn-icon-float {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 16px rgba(0,0,0,0.12);
          transform: translateY(26px);
          flex-shrink: 0;
        }
        .lrn-ring-corner {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transform: translateY(8px);
        }
        .lrn-ring-pct {
          position: absolute;
          font-size: 13px;
          font-weight: 800;
          color: #fff;
          letter-spacing: -0.03em;
          text-shadow: 0 1px 4px rgba(0,0,0,0.25);
        }

        /* ── Body ── */
        .lrn-body {
          padding: 34px 20px 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .lrn-name {
          font-size: 18px;
          font-weight: 700;
          color: hsl(var(--foreground));
          letter-spacing: -0.015em;
        }
        .lrn-desc {
          font-size: 12.5px;
          color: hsl(var(--muted-foreground));
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* ── Progress bar ── */
        .lrn-bar-track {
          height: 5px;
          background: rgba(47,53,50,0.08);
          border-radius: 99px;
          overflow: hidden;
        }
        .lrn-bar-fill {
          height: 100%;
          border-radius: 99px;
          transition: width 0.7s ease;
        }

        /* ── Stats ── */
        .lrn-stats {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .lrn-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 10px;
          border-radius: 99px;
          font-size: 11px;
          font-weight: 600;
          background: rgba(47,53,50,0.06);
          color: hsl(var(--muted-foreground));
          border: 1px solid rgba(47,53,50,0.10);
        }

        /* ── Buttons ── */
        .lrn-actions {
          display: flex;
          gap: 8px;
          margin-top: 4px;
        }
        .lrn-btn {
          width: 100%;
          height: 38px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s;
          border: none;
        }
        .lrn-btn-ghost {
          background: rgba(255,255,255,0.55);
          color: hsl(var(--foreground));
          border: 1.5px solid rgba(47,53,50,0.15);
        }
        .lrn-btn-ghost:hover {
          background: rgba(255,255,255,0.85);
          border-color: rgba(47,53,50,0.28);
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(0,0,0,0.08);
        }
        .lrn-btn-solid {
          background: var(--tc);
          color: #fff;
          box-shadow: 0 4px 14px -2px var(--ts);
        }
        .lrn-btn-solid:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px -4px var(--ts);
          filter: brightness(1.08);
        }

        /* ══ Divider ══ */
        .lrn-divider-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: hsl(var(--muted-foreground));
        }
        .lrn-divider-line {
          flex: 1;
          height: 2px;
          background: linear-gradient(90deg, rgba(47,53,50,0.12), transparent);
          border-radius: 2px;
        }

        /* ══ Exam Card ══ */
        .lrn-exam {
          position: relative;
          background: linear-gradient(160deg, #2F3532 0%, #1A1F1D 50%, #2F3532 100%);
          border-radius: 28px;
          padding: 40px;
          color: #fff;
          overflow: hidden;
          box-shadow:
            0 24px 64px -12px rgba(47,53,50,0.50),
            inset 0 1px 0 rgba(255,255,255,0.06);
        }
        /* Greek key pattern (top decorative strip) */
        .lrn-exam-key-border {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 4px;
          background: repeating-linear-gradient(
            90deg,
            #ECC85C 0px, #ECC85C 10px,
            transparent 10px, transparent 14px,
            #ECC85C 14px, #ECC85C 18px,
            transparent 18px, transparent 22px
          );
          opacity: 0.55;
        }
        .lrn-exam-epsilon {
          position: absolute;
          right: 30px;
          bottom: -30px;
          font-size: 200px;
          font-weight: 700;
          font-family: 'EB Garamond', serif;
          color: rgba(236,200,92,0.04);
          pointer-events: none;
          line-height: 1;
        }
        .lrn-exam-inner {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 24px;
          flex-wrap: wrap;
        }
        .lrn-exam-icon {
          width: 64px;
          height: 64px;
          border-radius: 20px;
          background: rgba(236,200,92,0.15);
          color: #ECC85C;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 0 32px rgba(236,200,92,0.10);
        }
        .lrn-exam-text {
          flex: 1;
          min-width: 160px;
        }
        .lrn-exam-eyebrow {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #ECC85C;
          opacity: 0.85;
          margin-bottom: 6px;
        }
        .lrn-exam-title {
          font-size: 26px;
          font-weight: 800;
          letter-spacing: -0.025em;
          margin-bottom: 6px;
          background: linear-gradient(135deg, #fff 0%, #ECC85C 60%, #fff 100%);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer-gold 4s ease-in-out infinite;
        }
        @keyframes shimmer-gold {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .lrn-exam-desc {
          font-size: 13px;
          opacity: 0.50;
          line-height: 1.55;
        }
        .lrn-exam-chips {
          display: flex;
          gap: 12px;
          flex-shrink: 0;
        }
        .lrn-exam-chip {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          padding: 10px 14px;
          border-radius: 14px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .lrn-exam-chip-val {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.03em;
        }
        .lrn-exam-chip-lbl {
          font-size: 10px;
          opacity: 0.45;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-weight: 600;
          white-space: nowrap;
        }
        .lrn-exam-cta {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 14px 30px;
          border-radius: 99px;
          border: none;
          background: linear-gradient(135deg, #ECC85C, #F5D97A);
          color: #2F3532;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
          font-family: inherit;
          white-space: nowrap;
          transition: all 0.2s;
          flex-shrink: 0;
          box-shadow: 0 4px 20px rgba(236,200,92,0.30);
        }
        .lrn-exam-cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(236,200,92,0.50);
          filter: brightness(1.06);
        }

        /* ══ Mobile ══ */
        @media (max-width: 600px) {
          .lrn-root { padding: 20px 14px 90px; }
          .lrn-title { font-size: 24px; }
          .lrn-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .lrn-banner { height: 64px; padding: 0 14px 0 16px; }
          .lrn-icon-float { width: 44px; height: 44px; border-radius: 13px; transform: translateY(22px); }
          .lrn-icon-float svg { width: 22px !important; height: 22px !important; }
          .lrn-ring-corner svg { width: 50px; height: 50px; }
          .lrn-ring-pct { font-size: 11px; }
          .lrn-body { padding: 28px 16px 16px; }
          .lrn-name { font-size: 16px; }
          .lrn-exam { padding: 24px 18px; border-radius: 22px; }
          .lrn-exam-inner { flex-direction: column; align-items: flex-start; gap: 16px; }
          .lrn-exam-icon { width: 50px; height: 50px; border-radius: 15px; }
          .lrn-exam-title { font-size: 20px; }
          .lrn-exam-cta { width: 100%; justify-content: center; }
          .lrn-exam-chips { width: 100%; justify-content: space-between; }
        }
      `}</style>
    </Layout>
  );
}
