import { Flame, Target, BookOpen, Star, Layers, Languages, BarChart3, ArrowRight, WifiOff, UserRound, LogOut } from 'lucide-react';
import { api, clearCache } from '../api';
import { getToken, clearToken } from '../auth';
import { haptic } from '../telegram';
import { Loading, useCached } from '../ui';
import { useLanguage } from '../i18n';
import { StreakCelebration, useStreakCelebration } from '../components/StreakCelebration';
import type { View } from '../App';

export function Home({ onNavigate }: { onNavigate: (v: View) => void }) {
  const { t, language } = useLanguage();
  const { data: me, err } = useCached(`me:${language}`, api.me);

  const { show: showStreak, dismiss: dismissStreak } = useStreakCelebration(me?.streak ?? 0);

  if (err)
    return (
      <div className="empty fade-in">
        <div className="e">
          <WifiOff size={52} strokeWidth={1.8} />
        </div>
        <p>
          {t('common.error')}
          <br />
          <span className="muted">{err}</span>
        </p>
      </div>
    );
  if (!me) return <Loading />;

  const acc =
    me.stats.total_questions > 0
      ? Math.round((me.stats.total_correct / me.stats.total_questions) * 100)
      : 0;

  const nav = (v: View) => {
    haptic();
    onNavigate(v);
  };

  return (
    <div className="fade-in">
      <div className="hero">
        <span className="hero-badge" aria-hidden="true">
          {/* Greek key (meander) — square spiral motif */}
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
            <path
              d="M3 21 V3 H21 V21 H9 V9 H15 V15 H12"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="square"
            />
          </svg>
        </span>
        <p className="sub">{t('home.welcome')}</p>
        <h1>
          <span className="highlight">{me.user.name}</span>
        </h1>
        <div className="hero-chips">
          {me.streak >= 2 && (
            <span className="chip">
              <Flame size={15} color="var(--coral)" />
              {me.streak} {t(me.streak === 1 ? 'home.streakDay' : 'home.streakDays')}
            </span>
          )}
          <span className="chip">
            <Target size={15} color="var(--mint)" />
            {acc}%
          </span>
          <span className="chip">
            <BookOpen size={15} color="var(--accent)" />
            {me.stats.total_sessions}
          </span>
          <span className="chip">
            <Star size={15} color="var(--amber)" />
            {me.vocab.mastered}/{me.vocab.total}
          </span>
          {getToken() ? (
            <button
              className="chip"
              onClick={() => {
                haptic();
                clearToken();
                clearCache();
                window.location.reload();
              }}
            >
              <LogOut size={14} strokeWidth={2.4} />
              {t('auth.logout')}
            </button>
          ) : (
            <button className="chip" onClick={() => nav('auth')}>
              <UserRound size={14} strokeWidth={2.4} />
              {t('auth.loginChip')}
            </button>
          )}
        </div>
      </div>

      <div className="section-label">{t('home.section.learn')}</div>
      <div className="tiles stagger">
        <button
          className="tile feature"
          style={{ animationDelay: '40ms' }}
          onClick={() => nav('quiz')}
        >
          <span className="tile-ic">
            <BookOpen size={26} strokeWidth={2.2} />
          </span>
          <span className="grow">
            <span className="tile-t" style={{ display: 'block' }}>
              {t('nav.quiz')}
            </span>
            <span className="tile-d">{t('home.quiz.desc')}</span>
          </span>
          <span className="arrow">
            <ArrowRight size={22} strokeWidth={2.6} />
          </span>
        </button>

        <button className="tile" style={{ animationDelay: '90ms' }} onClick={() => nav('flashcards')}>
          <span className="tile-ic">
            <Layers size={24} strokeWidth={2.2} />
          </span>
          <span className="tile-t">{t('nav.flashcards')}</span>
          <span className="tile-d">{t('home.flashcards.desc')}</span>
        </button>
        <button className="tile" style={{ animationDelay: '130ms' }} onClick={() => nav('vocab')}>
          <span className="tile-ic">
            <Languages size={24} strokeWidth={2.2} />
          </span>
          <span className="tile-t">{t('nav.vocab')}</span>
          <span className="tile-d">{t('home.vocab.desc')}</span>
        </button>

        <button
          className="tile span2"
          style={{ animationDelay: '180ms', flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 'auto' }}
          onClick={() => nav('stats')}
        >
          <span className="tile-ic">
            <BarChart3 size={24} strokeWidth={2.2} />
          </span>
          <span className="grow">
            <span className="tile-t" style={{ display: 'block' }}>
              {t('home.stats.title')}
            </span>
            <span className="tile-d">{t('home.stats.desc')}</span>
          </span>
          <span className="arrow" style={{ color: 'var(--muted)' }}>
            <ArrowRight size={20} strokeWidth={2.4} />
          </span>
        </button>
      </div>

      {showStreak && <StreakCelebration streak={me.streak} onDismiss={dismissStreak} />}
    </div>
  );
}
