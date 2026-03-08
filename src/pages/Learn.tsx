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
  { id: 'history',   icon: History,  color: '#5B8DB8', colorRgb: '91,141,184',  bg: 'rgba(91,141,184,0.12)',  dataAttr: 'history',  featured: true  },
  { id: 'culture',   icon: Palette,  color: '#9B7EC8', colorRgb: '155,126,200', bg: 'rgba(155,126,200,0.12)', dataAttr: 'culture',  featured: false },
  { id: 'laws',      icon: Scale,    color: '#7D8A57', colorRgb: '125,138,87',  bg: 'rgba(125,138,87,0.12)',  dataAttr: 'laws',     featured: false },
  { id: 'geography', icon: MapPin,   color: '#D4874A', colorRgb: '212,135,74',  bg: 'rgba(212,135,74,0.12)',  dataAttr: 'geo',      featured: false },
];

/* SVG blob path — organic decoration */
const BlobDecor = ({ color }: { color: string }) => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" style={{
    position: 'absolute', top: -20, right: -20, width: 130, height: 130,
    opacity: 0.08, pointerEvents: 'none', zIndex: 0,
  }}>
    <path fill={color} d="M47.6,-66.3C58.9,-55.7,63.5,-38.6,66.8,-21.9C70.1,-5.1,72.1,11.3,67.1,25.7C62,40.1,49.9,52.4,35.8,60.3C21.7,68.1,5.6,71.6,-10.3,70.3C-26.3,69,-42.1,62.8,-52.6,51.9C-63.1,40.9,-68.4,25.1,-70.4,8.6C-72.4,-8,-71.2,-25.4,-63.1,-38.4C-54.9,-51.4,-39.8,-60,-24.5,-67.7C-9.2,-75.5,6.2,-82.5,19.8,-79.7C33.5,-76.9,36.2,-76.9,47.6,-66.3Z" transform="translate(100 100)" />
  </svg>
);

/* Circular progress ring */
const ProgressRing = ({
  pct, color, size, strokeWidth, serif,
}: { pct: number; color: string; size: number; strokeWidth: number; serif?: boolean }) => {
  const r = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(47,53,50,0.08)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct / 100)}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: serif ? 'var(--font-serif)' : 'inherit',
        fontSize: serif ? size * 0.28 : size * 0.3,
        fontWeight: serif ? 600 : 700,
        color: pct > 0 ? color : 'rgba(47,53,50,0.3)',
        letterSpacing: '-0.02em',
        lineHeight: 1,
      }}>
        {pct}
        <span style={{ fontSize: serif ? size * 0.16 : size * 0.18, marginTop: 2, fontFamily: 'var(--font-body)' }}>%</span>
      </div>
    </div>
  );
};

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
        .select('correct_count, incorrect_count, is_known, questions(topic)')
        .eq('user_id', user!.id);
      if (error) throw error;

      const stats: Record<string, { correct: number; total: number; mastered: number }> = {};
      (data || []).forEach((p: any) => {
        const topic = p.questions?.topic as string;
        if (!topic) return;
        if (!stats[topic]) stats[topic] = { correct: 0, total: 0, mastered: 0 };
        stats[topic].correct += p.correct_count;
        stats[topic].total += p.correct_count + p.incorrect_count;
        if (p.is_known) stats[topic].mastered++;
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

  const featuredMeta = TOPIC_META[0]; // history
  const restMeta = TOPIC_META.slice(1); // culture, laws, geography

  const getTopicStats = (id: string) => {
    const tp = topicProgress?.[id];
    const total = topicTotals?.[id] || 0;
    const seen = tp ? tp.mastered : 0;
    const pct = total > 0 ? Math.round((seen / total) * 100) : 0;
    const accuracy = tp && tp.total > 0 ? Math.round((tp.correct / tp.total) * 100) : null;
    return { pct, accuracy, total };
  };

  return (
    <Layout>
      <div className="learn-page-wrap">

        {/* ── Page header ── */}
        <div className="learn-page-header">
          <div>
            <h1 className="learn-page-title">
              {language === 'ru' ? 'Выберите тему' : 'Επιλέξτε θέμα'}
            </h1>
            <p className="learn-page-subtitle">
              {language === 'ru'
                ? 'Изучайте темы или проверьте себя на экзамене'
                : 'Μάθετε θέματα ή δοκιμαστείτε στην εξέταση'}
            </p>
          </div>
          {dueCount != null && dueCount > 0 && (
            <div className="learn-due-badge">
              <Layers style={{ width: 13, height: 13 }} />
              {language === 'ru' ? `Сегодня: ${dueCount} карточек` : `Σήμερα: ${dueCount} κάρτες`}
            </div>
          )}
        </div>

        {/* ── Bento Grid ── */}
        <div className="learn-bento-grid">

          {/* FEATURED: History — large, row-span-2 */}
          {(() => {
            const meta = featuredMeta;
            const { pct, accuracy } = getTopicStats(meta.id);
            const Icon = meta.icon;
            return (
              <div
                className="learn-bento-card learn-bento-featured glass-panel"
                data-topic={meta.dataAttr}
                style={{ '--topic-color': meta.color, '--topic-rgb': meta.colorRgb } as React.CSSProperties}
              >
                <BlobDecor color={meta.color} />
                <div className="learn-bento-glow" style={{ background: `radial-gradient(ellipse at 50% 120%, rgba(${meta.colorRgb},0.35) 0%, transparent 70%)` }} />

                {/* Top: icon + accuracy badge */}
                <div className="learn-bento-toprow">
                  <div className="learn-bento-icon" style={{ background: meta.bg, color: meta.color }}>
                    <Icon style={{ width: 22, height: 22 }} />
                  </div>
                  {accuracy !== null && (
                    <AccuracyBadge accuracy={accuracy} />
                  )}
                </div>

                {/* Progress ring — large, serif */}
                <div className="learn-bento-ring-wrap">
                  <ProgressRing pct={pct} color={meta.color} size={96} strokeWidth={6} serif />
                  <div className="learn-bento-ring-label">
                    <span className="learn-bento-topic-name">{t(`topic.${meta.id}`)}</span>
                    <span className="learn-bento-mastered">
                      {language === 'ru' ? 'освоено' : 'κατακτήθηκε'}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p className="learn-bento-desc">{t(`topic.${meta.id}.desc`)}</p>

                {/* Action buttons */}
                <div className="learn-bento-actions">
                  <Link to={`/learn/${meta.id}/flashcards`} style={{ textDecoration: 'none', flex: 1 }}>
                    <button className="learn-btn learn-btn--secondary" style={{ width: '100%' }}>
                      <Layers style={{ width: 15, height: 15 }} />
                      {language === 'ru' ? 'Карточки' : 'Κάρτες'}
                    </button>
                  </Link>
                  <Link to={`/learn/${meta.id}/quiz`} style={{ textDecoration: 'none', flex: 1 }}>
                    <button className="learn-btn learn-btn--primary" style={{ width: '100%', '--btn-color': meta.color, '--btn-rgb': meta.colorRgb } as React.CSSProperties}>
                      <PenLine style={{ width: 15, height: 15 }} />
                      {language === 'ru' ? 'Тест' : 'Κουίζ'}
                    </button>
                  </Link>
                </div>
              </div>
            );
          })()}

          {/* Right column: Culture + Laws */}
          <div className="learn-bento-col">
            {restMeta.slice(0, 2).map(meta => {
              const { pct, accuracy } = getTopicStats(meta.id);
              const Icon = meta.icon;
              return (
                <div
                  key={meta.id}
                  className="learn-bento-card learn-bento-compact glass-panel"
                  data-topic={meta.dataAttr}
                  style={{ '--topic-color': meta.color, '--topic-rgb': meta.colorRgb } as React.CSSProperties}
                >
                  <BlobDecor color={meta.color} />
                  <div className="learn-bento-glow" style={{ background: `radial-gradient(ellipse at 50% 120%, rgba(${meta.colorRgb},0.28) 0%, transparent 70%)` }} />

                  <div className="learn-bento-compact-inner">
                    <div className="learn-bento-compact-left">
                      <div className="learn-bento-icon learn-bento-icon--sm" style={{ background: meta.bg, color: meta.color }}>
                        <Icon style={{ width: 16, height: 16 }} />
                      </div>
                      <div>
                        <div className="learn-bento-topic-name">{t(`topic.${meta.id}`)}</div>
                        {accuracy !== null && <AccuracyBadge accuracy={accuracy} compact />}
                      </div>
                    </div>
                    <ProgressRing pct={pct} color={meta.color} size={56} strokeWidth={4.5} />
                  </div>

                  <div className="learn-bento-actions learn-bento-actions--sm">
                    <Link to={`/learn/${meta.id}/flashcards`} style={{ textDecoration: 'none', flex: 1 }}>
                      <button className="learn-btn learn-btn--secondary learn-btn--sm" style={{ width: '100%' }}>
                        <Layers style={{ width: 12, height: 12 }} />
                        {language === 'ru' ? 'Карточки' : 'Κάρτες'}
                      </button>
                    </Link>
                    <Link to={`/learn/${meta.id}/quiz`} style={{ textDecoration: 'none', flex: 1 }}>
                      <button className="learn-btn learn-btn--primary learn-btn--sm" style={{ width: '100%', '--btn-color': meta.color, '--btn-rgb': meta.colorRgb } as React.CSSProperties}>
                        <PenLine style={{ width: 12, height: 12 }} />
                        {language === 'ru' ? 'Тест' : 'Κουίζ'}
                      </button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom row: Geography */}
          {(() => {
            const meta = restMeta[2]; // geography
            const { pct, accuracy } = getTopicStats(meta.id);
            const Icon = meta.icon;
            return (
              <div
                className="learn-bento-card learn-bento-compact learn-bento-geo glass-panel"
                data-topic={meta.dataAttr}
                style={{ '--topic-color': meta.color, '--topic-rgb': meta.colorRgb } as React.CSSProperties}
              >
                <BlobDecor color={meta.color} />
                <div className="learn-bento-glow" style={{ background: `radial-gradient(ellipse at 50% 120%, rgba(${meta.colorRgb},0.28) 0%, transparent 70%)` }} />

                <div className="learn-bento-compact-inner">
                  <div className="learn-bento-compact-left">
                    <div className="learn-bento-icon learn-bento-icon--sm" style={{ background: meta.bg, color: meta.color }}>
                      <Icon style={{ width: 16, height: 16 }} />
                    </div>
                    <div>
                      <div className="learn-bento-topic-name">{t(`topic.${meta.id}`)}</div>
                      {accuracy !== null && <AccuracyBadge accuracy={accuracy} compact />}
                    </div>
                  </div>
                  <ProgressRing pct={pct} color={meta.color} size={56} strokeWidth={4.5} />
                </div>

                <div className="learn-bento-actions learn-bento-actions--sm">
                  <Link to={`/learn/${meta.id}/flashcards`} style={{ textDecoration: 'none', flex: 1 }}>
                    <button className="learn-btn learn-btn--secondary learn-btn--sm" style={{ width: '100%' }}>
                      <Layers style={{ width: 12, height: 12 }} />
                      {language === 'ru' ? 'Карточки' : 'Κάρτες'}
                    </button>
                  </Link>
                  <Link to={`/learn/${meta.id}/quiz`} style={{ textDecoration: 'none', flex: 1 }}>
                    <button className="learn-btn learn-btn--primary learn-btn--sm" style={{ width: '100%', '--btn-color': meta.color, '--btn-rgb': meta.colorRgb } as React.CSSProperties}>
                      <PenLine style={{ width: 12, height: 12 }} />
                      {language === 'ru' ? 'Тест' : 'Κουίζ'}
                    </button>
                  </Link>
                </div>
              </div>
            );
          })()}

          {/* Exam card — spans bottom right */}
          <div className="learn-bento-exam">
            <GraduationCap style={{ position: 'absolute', right: -16, bottom: -32, width: 160, height: 160, color: 'rgba(255,255,255,0.04)', zIndex: 0 }} />
            {/* exam glow */}
            <div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', background: 'radial-gradient(ellipse at 80% 120%, rgba(236,200,92,0.18) 0%, transparent 60%)', zIndex: 0, pointerEvents: 'none' }} />

            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
              {/* badge */}
              <div className="learn-exam-badge">
                <span>{language === 'ru' ? '⚡ Финальный этап' : '⚡ Τελικό στάδιο'}</span>
              </div>

              {/* icon + title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div className="learn-exam-icon-wrap">
                  <GraduationCap style={{ width: 26, height: 26 }} />
                </div>
                <div>
                  <div className="learn-exam-title">
                    {language === 'ru' ? 'Симуляция экзамена' : 'Προσομοίωση εξέτασης'}
                  </div>
                  <div className="learn-exam-sub">
                    {language === 'ru'
                      ? 'Все темы, без подсказок, реальные условия'
                      : 'Όλα τα θέματα, χωρίς βοήθεια, πραγματικές συνθήκες'}
                  </div>
                </div>
              </div>

              {/* stats row */}
              <div className="learn-exam-stats-row">
                {[
                  { v: '20', l: language === 'ru' ? 'вопросов' : 'ερωτ.' },
                  { v: '45', l: language === 'ru' ? 'минут' : 'λεπτά' },
                  { v: '70%', l: language === 'ru' ? 'проходной' : 'βάση' },
                ].map((s, i) => (
                  <div key={i} className="learn-exam-stat">
                    <span className="learn-exam-stat-val">{s.v}</span>
                    <span className="learn-exam-stat-lbl">{s.l}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div style={{ marginTop: 'auto' }}>
                <Link to="/learn/exam" style={{ textDecoration: 'none' }}>
                  <button className="learn-exam-cta">
                    {language === 'ru' ? 'Начать экзамен' : 'Έναρξη εξέτασης'}
                    <ArrowRight style={{ width: 16, height: 16 }} />
                  </button>
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>

      <style>{`
        /* ── Page wrap ── */
        .learn-page-wrap {
          max-width: 1080px;
          margin: 0 auto;
          padding: 28px 16px 96px;
        }

        /* ── Page header ── */
        .learn-page-header {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-end;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 28px;
        }
        .learn-page-title {
          font-family: var(--font-serif);
          font-size: clamp(24px, 3vw, 34px);
          font-weight: 500;
          letter-spacing: -0.03em;
          color: hsl(var(--foreground));
          margin-bottom: 5px;
          line-height: 1.1;
        }
        .learn-page-subtitle {
          font-size: 13px;
          color: hsl(var(--muted-foreground));
          line-height: 1.5;
        }
        .learn-due-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 15px;
          border-radius: 99px;
          background: rgba(236,200,92,0.20);
          color: #584610;
          font-size: 12px;
          font-weight: 700;
          border: 1px solid rgba(236,200,92,0.4);
        }

        /* ── Bento Grid ── */
        .learn-bento-grid {
          display: grid;
          grid-template-columns: 1.35fr 1fr;
          grid-template-rows: auto auto;
          gap: 14px;
        }

        /* ── Card base ── */
        .learn-bento-card {
          position: relative;
          overflow: hidden;
          border-radius: 24px;
          cursor: default;
          transition: transform 0.28s cubic-bezier(0.25,0.8,0.25,1), box-shadow 0.28s cubic-bezier(0.25,0.8,0.25,1);
        }
        .learn-bento-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 48px -8px rgba(var(--topic-rgb, 47,53,50), 0.22), 0 8px 16px -4px rgba(0,0,0,0.06);
        }
        .learn-bento-card:active {
          transform: scale(0.97) translateY(0);
        }

        /* ── Ambient glow ── */
        .learn-bento-glow {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          pointer-events: none;
          z-index: 0;
          opacity: 0.7;
          transition: opacity 0.3s ease;
        }
        .learn-bento-card:hover .learn-bento-glow {
          opacity: 1;
        }

        /* ── Featured card (History) ── */
        .learn-bento-featured {
          grid-column: 1;
          grid-row: 1 / 3;
          padding: 28px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          min-height: 360px;
        }

        /* ── Right column (Culture + Laws) ── */
        .learn-bento-col {
          grid-column: 2;
          grid-row: 1;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        /* ── Compact card ── */
        .learn-bento-compact {
          padding: 20px 20px 16px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .learn-bento-compact-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          position: relative;
          z-index: 1;
        }
        .learn-bento-compact-left {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        /* ── Geography card (bottom left) ── */
        .learn-bento-geo {
          grid-column: 1;
          grid-row: 3;
        }

        /* ── Exam card ── */
        .learn-bento-exam {
          grid-column: 2;
          grid-row: 2 / 4;
          background: #2F3532;
          color: #fff;
          border-radius: 24px;
          padding: 24px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 12px 48px -8px rgba(47,53,50,0.35);
          transition: transform 0.28s cubic-bezier(0.25,0.8,0.25,1), box-shadow 0.28s;
        }
        .learn-bento-exam:hover {
          transform: translateY(-4px);
          box-shadow: 0 24px 56px -8px rgba(47,53,50,0.42);
        }
        .learn-exam-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 99px;
          background: rgba(236,200,92,0.18);
          color: #ECC85C;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          width: fit-content;
        }
        .learn-exam-icon-wrap {
          width: 50px;
          height: 50px;
          border-radius: 16px;
          background: rgba(236,200,92,0.18);
          color: #ECC85C;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .learn-exam-title {
          font-size: 17px;
          font-weight: 700;
          letter-spacing: -0.02em;
          margin-bottom: 3px;
        }
        .learn-exam-sub {
          font-size: 12px;
          opacity: 0.52;
          line-height: 1.5;
        }
        .learn-exam-stats-row {
          display: flex;
          gap: 0;
          background: rgba(255,255,255,0.05);
          border-radius: 14px;
          padding: 12px 8px;
          border: 1px solid rgba(255,255,255,0.06);
        }
        .learn-exam-stat {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          border-right: 1px solid rgba(255,255,255,0.08);
        }
        .learn-exam-stat:last-child { border-right: none; }
        .learn-exam-stat-val {
          font-family: var(--font-serif);
          font-size: 22px;
          font-weight: 600;
          letter-spacing: -0.02em;
          line-height: 1;
        }
        .learn-exam-stat-lbl {
          font-size: 9px;
          opacity: 0.45;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-weight: 600;
        }
        .learn-exam-cta {
          width: 100%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 13px 20px;
          border-radius: 14px;
          border: none;
          background: #ECC85C;
          color: #2F3532;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.18s cubic-bezier(0.25,0.8,0.25,1);
        }
        .learn-exam-cta:hover {
          background: #f5d575;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px -4px rgba(236,200,92,0.5);
        }

        /* ── Icon ── */
        .learn-bento-icon {
          width: 44px;
          height: 44px;
          border-radius: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          position: relative;
          z-index: 1;
        }
        .learn-bento-icon--sm {
          width: 34px;
          height: 34px;
          border-radius: 10px;
        }

        /* ── Top row ── */
        .learn-bento-toprow {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          position: relative;
          z-index: 1;
        }

        /* ── Progress ring section (featured) ── */
        .learn-bento-ring-wrap {
          display: flex;
          align-items: center;
          gap: 20px;
          position: relative;
          z-index: 1;
        }
        .learn-bento-ring-label {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .learn-bento-topic-name {
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: hsl(var(--foreground));
          line-height: 1.1;
        }
        .learn-bento-compact .learn-bento-topic-name {
          font-size: 14px;
        }
        .learn-bento-mastered {
          font-size: 11px;
          color: hsl(var(--muted-foreground));
          font-weight: 500;
        }

        /* ── Description ── */
        .learn-bento-desc {
          font-size: 13px;
          color: hsl(var(--muted-foreground));
          line-height: 1.55;
          position: relative;
          z-index: 1;
          flex: 1;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* ── Action buttons ── */
        .learn-bento-actions {
          display: flex;
          gap: 8px;
          margin-top: auto;
          position: relative;
          z-index: 1;
        }
        .learn-bento-actions--sm {
          gap: 6px;
        }
        .learn-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px 16px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.18s cubic-bezier(0.25,0.8,0.25,1);
          white-space: nowrap;
          border: 1.5px solid transparent;
        }
        .learn-btn--secondary {
          background: rgba(255,255,255,0.58);
          border-color: rgba(47,53,50,0.18);
          color: hsl(var(--foreground));
        }
        .learn-btn--secondary:hover {
          background: rgba(255,255,255,0.85);
          border-color: rgba(47,53,50,0.28);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px -2px rgba(0,0,0,0.07);
        }
        .learn-btn--primary {
          background: var(--topic-color, hsl(var(--primary)));
          border-color: transparent;
          color: #fff;
        }
        .learn-btn--primary:hover {
          opacity: 0.88;
          transform: translateY(-1px);
          box-shadow: 0 6px 18px -4px rgba(var(--btn-rgb, 47,53,50), 0.45);
        }
        .learn-btn--sm {
          padding: 8px 12px;
          font-size: 12px;
          border-radius: 10px;
        }

        /* ── Mobile: 1 column ── */
        @media (max-width: 639px) {
          .learn-bento-grid {
            grid-template-columns: 1fr;
            grid-template-rows: auto;
          }
          .learn-bento-featured {
            grid-column: 1;
            grid-row: auto;
            min-height: unset;
            padding: 22px;
          }
          .learn-bento-col {
            grid-column: 1;
            grid-row: auto;
          }
          .learn-bento-geo {
            grid-column: 1;
            grid-row: auto;
          }
          .learn-bento-exam {
            grid-column: 1;
            grid-row: auto;
            padding: 22px;
          }
          .learn-bento-card:hover {
            transform: none;
          }
          .learn-page-title {
            font-size: 26px;
          }
        }
      `}</style>
    </Layout>
  );
}

/* ── Accuracy badge ── */
function AccuracyBadge({ accuracy, compact }: { accuracy: number; compact?: boolean }) {
  const high = accuracy >= 70;
  const mid = accuracy >= 50;
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 3,
      padding: compact ? '2px 7px' : '4px 10px',
      borderRadius: 99,
      fontSize: compact ? 10 : 11,
      fontWeight: 700,
      background: high ? 'rgba(125,138,87,0.12)' : mid ? 'rgba(236,200,92,0.18)' : 'rgba(224,108,108,0.10)',
      color: high ? '#4E5A33' : mid ? '#7A5E0E' : '#A03030',
      border: `1px solid ${high ? 'rgba(125,138,87,0.2)' : mid ? 'rgba(236,200,92,0.3)' : 'rgba(224,108,108,0.2)'}`,
      position: 'relative',
      zIndex: 1,
    }}>
      {high ? <CheckCircle style={{ width: 9, height: 9 }} /> : mid ? <TrendingUp style={{ width: 9, height: 9 }} /> : <AlertCircle style={{ width: 9, height: 9 }} />}
      {accuracy}%
    </div>
  );
}
