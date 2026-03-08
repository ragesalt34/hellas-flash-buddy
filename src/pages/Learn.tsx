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
  { id: 'history',   icon: History,  color: '#5B8DB8', colorRgb: '91,141,184',   bg: 'rgba(91,141,184,0.13)'  },
  { id: 'culture',   icon: Palette,  color: '#9B7EC8', colorRgb: '155,126,200',  bg: 'rgba(155,126,200,0.13)' },
  { id: 'laws',      icon: Scale,    color: '#7D8A57', colorRgb: '125,138,87',   bg: 'rgba(125,138,87,0.13)'  },
  { id: 'geography', icon: MapPin,   color: '#D4874A', colorRgb: '212,135,74',   bg: 'rgba(212,135,74,0.13)'  },
];




/* Progress ring with number inside */
const Ring = ({ pct, color, size, sw }: { pct: number; color: string; size: number; sw: number }) => {
  const r = (size - sw * 2) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(47,53,50,0.09)" strokeWidth={sw} />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={sw}
          strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(.4,0,.2,1)' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-serif)',
        fontSize: size * 0.26,
        fontWeight: 600,
        color: pct > 0 ? color : 'rgba(47,53,50,0.28)',
        letterSpacing: '-0.02em',
        lineHeight: 1,
      }}>
        {pct}<span style={{ fontSize: size * 0.15, fontFamily: 'inherit', marginTop: 1 }}>%</span>
      </div>
    </div>
  );
};

function AccBadge({ acc, compact }: { acc: number | null; compact?: boolean }) {
  if (acc === null) return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: compact ? '2px 7px' : '3px 9px',
      borderRadius: 99, fontSize: compact ? 10 : 11, fontWeight: 700,
      background: 'rgba(47,53,50,0.06)',
      color: 'rgba(47,53,50,0.32)',
      border: '1px solid rgba(47,53,50,0.10)',
    }}>—</span>
  );
  const hi = acc >= 70, mid = acc >= 50;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: compact ? '2px 7px' : '3px 9px',
      borderRadius: 99, fontSize: compact ? 10 : 11, fontWeight: 700,
      background: hi ? 'rgba(125,138,87,0.13)' : mid ? 'rgba(236,200,92,0.18)' : 'rgba(224,108,108,0.10)',
      color: hi ? '#4E5A33' : mid ? '#7A5E0E' : '#A03030',
      border: `1px solid ${hi ? 'rgba(125,138,87,0.22)' : mid ? 'rgba(236,200,92,0.3)' : 'rgba(224,108,108,0.2)'}`,
    }}>
      {hi ? <CheckCircle style={{ width: 9, height: 9 }} />
          : mid ? <TrendingUp style={{ width: 9, height: 9 }} />
          : <AlertCircle style={{ width: 9, height: 9 }} />}
      {acc}%
    </span>
  );
}

export default function Learn() {
  const { user, isLoading } = useAuth();
  const { t, language } = useLanguage();
  const ru = language === 'ru';

  const { data: dueCount } = useQuery({
    queryKey: ['due-review-count', user?.id],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase.from('user_progress').select('id')
        .eq('user_id', user!.id).lte('next_review_at', now);
      if (error) throw error;
      return data?.length || 0;
    },
    enabled: !!user,
  });

  const { data: topicProgress } = useQuery({
    queryKey: ['topic-progress', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_progress')
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

  if (isLoading) return (
    <Layout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'hsl(var(--foreground))' }} />
      </div>
    </Layout>
  );

  if (!user) return <Navigate to="/login" replace />;

  const getStats = (id: string) => {
    const tp = topicProgress?.[id];
    const total = topicTotals?.[id] || 0;
    const pct = total > 0 ? Math.round(((tp?.mastered || 0) / total) * 100) : 0;
    const acc = tp && tp.total > 0 ? Math.round((tp.correct / tp.total) * 100) : null;
    return { pct, acc };
  };

  return (
    <Layout>
      <div className="lp-wrap">

        {/* Header */}
        <div className="lp-header">
          <div>
            <h1 className="lp-title">{ru ? 'Выберите тему' : 'Επιλέξτε θέμα'}</h1>
            <p className="lp-sub">{ru ? 'Изучайте темы или проверьте себя на экзамене' : 'Μάθετε θέματα ή δοκιμαστείτε στην εξέταση'}</p>
          </div>
          {!!dueCount && dueCount > 0 && (
            <div className="lp-due">
              <Layers style={{ width: 13, height: 13 }} />
              {ru ? `Сегодня: ${dueCount} карточек` : `Σήμερα: ${dueCount} κάρτες`}
            </div>
          )}
        </div>

        {/* Bento grid */}
        <div className="lp-grid">

          {/* 4 topic cards */}
          {TOPIC_META.map((meta, i) => {
            const { pct, acc } = getStats(meta.id);
            const Icon = meta.icon;
            const featured = i === 0;
            return (
              <div
                key={meta.id}
                className={`lp-card${featured ? ' lp-card--featured' : ''}`}
                style={{ '--tc': meta.color, '--trgb': meta.colorRgb } as React.CSSProperties}
              >
                {/* ambient glow */}
                <div className="lp-glow" style={{ background: `radial-gradient(ellipse at 60% 110%, rgba(${meta.colorRgb},.28) 0%, transparent 68%)` }} />

                {/* Top: icon + accuracy badge */}
                <div className="lp-card-top">
                  <div className="lp-icon" style={{ background: meta.bg, color: meta.color }}>
                    <Icon style={{ width: 18, height: 18 }} />
                  </div>
                  {acc !== null && <AccBadge acc={acc} compact />}
                </div>

                {/* Middle: ring + name */}
                <div className="lp-mid">
                  <Ring pct={pct} color={meta.color} size={72} sw={5} />
                  <div>
                    <div className="lp-name" style={{ fontSize: 16 }}>{t(`topic.${meta.id}`)}</div>
                    <div className="lp-mastered">
                      {(topicProgress?.[meta.id]?.mastered || 0)} / {topicTotals?.[meta.id] || '…'} {ru ? 'освоено' : 'κατακτήθηκε'}
                    </div>
                    <p className="lp-desc">{t(`topic.${meta.id}.desc`)}</p>
                  </div>
                </div>

                {/* Buttons */}
                <div className="lp-btns">
                  <Link to={`/learn/${meta.id}/flashcards`} className="lp-link">
                    <button className="lp-btn lp-btn--tint" style={{ '--bc': meta.color, '--brgb': meta.colorRgb } as React.CSSProperties}>
                      <Layers style={{ width: 13, height: 13 }} />
                      {ru ? 'Карточки' : 'Κάρτες'}
                    </button>
                  </Link>
                  <Link to={`/learn/${meta.id}/quiz`} className="lp-link">
                    <button className="lp-btn lp-btn--tint" style={{ '--bc': meta.color, '--brgb': meta.colorRgb } as React.CSSProperties}>
                      <PenLine style={{ width: 13, height: 13 }} />
                      {ru ? 'Тест' : 'Κουίζ'}
                    </button>
                  </Link>
                </div>
              </div>
            );
          })}

          {/* Exam card */}
          <div className="lp-exam">
            <GraduationCap style={{ position: 'absolute', right: -12, bottom: -28, width: 140, height: 140, color: 'rgba(255,255,255,0.04)', zIndex: 0 }} />
            <div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', background: 'radial-gradient(ellipse at 80% 100%, rgba(236,200,92,.16) 0%, transparent 60%)', pointerEvents: 'none', zIndex: 0 }} />

            <div className="lp-exam-inner">
              {/* Left: badge + title */}
              <div className="lp-exam-left">
                <div className="lp-exam-badge">⚡ {ru ? 'Финальный этап' : 'Τελικό στάδιο'}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="lp-exam-icon"><GraduationCap style={{ width: 24, height: 24 }} /></div>
                  <div>
                    <div className="lp-exam-title">{ru ? 'Симуляция экзамена' : 'Προσομοίωση εξέτασης'}</div>
                    <div className="lp-exam-sub">{ru ? 'Все темы, без подсказок, реальные условия' : 'Όλα τα θέματα, χωρίς βοήθεια'}</div>
                  </div>
                </div>
              </div>

              {/* Center: stats */}
              <div className="lp-exam-stats">
                {[['20', ru ? 'вопросов' : 'ερωτ.'], ['45', ru ? 'минут' : 'λεπτά'], ['70%', ru ? 'проходной' : 'βάση']].map(([v, l], i) => (
                  <div key={i} className="lp-exam-stat">
                    <span className="lp-exam-val">{v}</span>
                    <span className="lp-exam-lbl">{l}</span>
                  </div>
                ))}
              </div>

              {/* Right: CTA */}
              <Link to="/learn/exam" style={{ textDecoration: 'none', flexShrink: 0 }}>
                <button className="lp-exam-cta">
                  {ru ? 'Начать экзамен' : 'Έναρξη εξέτασης'}
                  <ArrowRight style={{ width: 15, height: 15 }} />
                </button>
              </Link>
            </div>
          </div>

        </div>
      </div>

      <style>{`
        .lp-wrap { max-width: 1040px; margin: 0 auto; padding: 28px 16px 48px; }

        /* Header */
        .lp-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
        .lp-title { font-size: 24px; font-weight: 500; letter-spacing: -.02em; color: #2F3532; line-height: 1.1; margin: 0 0 4px; }
        .lp-sub { font-size: 14px; color: hsl(var(--muted-foreground)); margin: 0; line-height: 1.5; }
        .lp-due { display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: 99px; background: rgba(91,141,184,0.12); color: #3a6a96; font-size: 12px; font-weight: 600; border: 1px solid rgba(91,141,184,0.22); flex-shrink: 0; margin-top: 4px; }

        .lp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }

        /* Card — full glass built-in, no glass-panel double-padding */
        .lp-card {
          position: relative; overflow: hidden; border-radius: 22px;
          padding: 20px; display: flex; flex-direction: column; justify-content: space-between; gap: 14px;
          background: rgba(255,255,255,0.52);
          backdrop-filter: blur(24px) saturate(1.4);
          -webkit-backdrop-filter: blur(24px) saturate(1.4);
          border: 1px solid rgba(255,255,255,0.62);
          box-shadow: 0 4px 24px -4px rgba(47,53,50,.08), 0 1px 0 0 rgba(255,255,255,.7) inset;
          transition: transform .26s cubic-bezier(.25,.8,.25,1), box-shadow .26s cubic-bezier(.25,.8,.25,1);
        }
        .lp-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 18px 40px -8px rgba(var(--trgb,47,53,50),.20), 0 6px 14px -4px rgba(0,0,0,.05);
        }
        .lp-card:active { transform: scale(.97); }

        /* Exam: full-width bottom row */
        .lp-exam {
          grid-column: 1 / 3;
          background: #2F3532; color: #fff;
          border-radius: 22px; position: relative; overflow: hidden;
          box-shadow: 0 12px 40px -8px rgba(47,53,50,.32);
          transition: transform .26s cubic-bezier(.25,.8,.25,1), box-shadow .26s;
        }
        .lp-exam:hover { transform: translateY(-4px); box-shadow: 0 22px 52px -8px rgba(47,53,50,.4); }
        .lp-exam-inner {
          position: relative; z-index: 1; padding: 24px 28px;
          display: flex; flex-direction: row; align-items: center;
          gap: 28px; flex-wrap: wrap;
        }

        /* Ambient glow */
        .lp-glow { position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: 0; opacity: .65; transition: opacity .3s; }
        .lp-card:hover .lp-glow { opacity: 1; }

        /* Icon */
        .lp-icon { width: 38px; height: 38px; border-radius: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; position: relative; z-index: 1; }

        /* Top row */
        .lp-card-top { display: flex; align-items: flex-start; justify-content: space-between; position: relative; z-index: 1; }

        /* Ring + name row */
        .lp-mid { display: flex; align-items: center; gap: 14px; position: relative; z-index: 1; }
        .lp-name { font-weight: 700; letter-spacing: -.02em; color: hsl(var(--foreground)); line-height: 1.1; margin-bottom: 3px; }
        .lp-mastered { font-size: 12px; color: hsl(var(--muted-foreground)); font-weight: 500; }
        .lp-desc { font-size: 12px; color: hsl(var(--muted-foreground)); line-height: 1.5; margin-top: 6px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }

        /* Buttons */
        .lp-btns { display: flex; gap: 7px; position: relative; z-index: 1; }
        .lp-link { text-decoration: none; flex: 1; }
        .lp-btn {
          width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 5px;
          padding: 9px 12px; border-radius: 11px; font-size: 12px; font-weight: 700;
          cursor: pointer; font-family: inherit; transition: all .18s cubic-bezier(.25,.8,.25,1);
          border: 1.5px solid transparent; white-space: nowrap;
        }
        .lp-btn--ghost { background: rgba(232,227,217,.72); border-color: rgba(47,53,50,.22); color: hsl(var(--foreground)); }
        .lp-btn--ghost:hover { background: rgba(232,227,217,1); border-color: rgba(47,53,50,.34); transform: translateY(-1px); box-shadow: 0 3px 10px -2px rgba(0,0,0,.09); }
        .lp-btn--tint { background: rgba(var(--brgb, 91,141,184),.12); border-color: rgba(var(--brgb, 91,141,184),.35); color: var(--bc, #5B8DB8); }
        .lp-btn--tint:hover { background: rgba(var(--brgb, 91,141,184),.22); border-color: rgba(var(--brgb, 91,141,184),.55); transform: translateY(-1px); box-shadow: 0 3px 10px -2px rgba(var(--brgb, 91,141,184),.2); }
        .lp-btn--color { background: var(--bc, #5B8DB8); color: #fff; }
        .lp-btn--color:hover { opacity: .85; transform: translateY(-1px); box-shadow: 0 5px 14px -3px rgba(var(--brgb, 91,141,184),.45); }

        /* Exam internals */
        .lp-exam-left { flex: 1; min-width: 160px; display: flex; flex-direction: column; gap: 10px; }
        .lp-exam-badge { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 99px; background: rgba(236,200,92,.18); color: #ECC85C; font-size: 10px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; width: fit-content; }
        .lp-exam-icon { width: 46px; height: 46px; border-radius: 14px; background: rgba(236,200,92,.18); color: #ECC85C; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .lp-exam-title { font-size: 17px; font-weight: 700; letter-spacing: -.02em; margin-bottom: 3px; }
        .lp-exam-sub { font-size: 12px; opacity: .5; line-height: 1.4; }
        .lp-exam-stats { display: flex; flex: 1; min-width: 180px; background: rgba(255,255,255,.05); border-radius: 12px; padding: 14px 8px; border: 1px solid rgba(255,255,255,.06); }
        .lp-exam-stat { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; border-right: 1px solid rgba(255,255,255,.07); }
        .lp-exam-stat:last-child { border-right: none; }
        .lp-exam-val { font-family: var(--font-serif); font-size: 22px; font-weight: 600; letter-spacing: -.02em; line-height: 1; }
        .lp-exam-lbl { font-size: 9px; opacity: .42; text-transform: uppercase; letter-spacing: .06em; font-weight: 600; }
        .lp-exam-cta { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 13px 24px; border-radius: 12px; border: none; background: #ECC85C; color: #2F3532; font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit; transition: all .18s cubic-bezier(.25,.8,.25,1); white-space: nowrap; flex-shrink: 0; }
        .lp-exam-cta:hover { background: #f5d575; transform: translateY(-1px); box-shadow: 0 6px 18px -4px rgba(236,200,92,.5); }

        /* ── Mobile: 1 col ── */
        @media (max-width: 639px) {
          .lp-wrap { padding-bottom: 100px; }
          .lp-grid { grid-template-columns: 1fr; }
          .lp-exam { grid-column: 1; }
          .lp-exam-inner { flex-direction: column; align-items: flex-start; padding: 20px; gap: 16px; }
          .lp-exam-stats { width: 100%; flex: none; }
          .lp-exam-cta { width: 100%; }
          .lp-card:hover { transform: none; }
          .lp-exam:hover { transform: none; }
        }
      `}</style>
    </Layout>
  );
}
