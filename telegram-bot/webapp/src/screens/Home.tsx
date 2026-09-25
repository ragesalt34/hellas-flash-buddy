import { ArrowRight, WifiOff, UserRound, LogOut, RotateCcw } from 'lucide-react';
import { api, clearCache } from '../api';
import { getToken, clearToken } from '../auth';
import { haptic } from '../telegram';
import { Loading, useCached } from '../ui';
import { useLanguage } from '../i18n';
import { StreakCelebration, useStreakCelebration } from '../components/StreakCelebration';
import type { View } from '../App';
import { Sparks } from '../components/icons';
import { Aspis, ColumnChart, LaurelSprig, OilLamp, Ostraka, Papyrus, WaxTablet } from '../components/homeArt';
import { HomeFrame, HomeDecorImg } from './homeDecor';

export function Home({ onNavigate }: { onNavigate: (v: View) => void }) {
  const { t, language } = useLanguage();
  const { data: me, err, reload } = useCached(`me:${language}`, api.me);

  const { show: showStreak, dismiss: dismissStreak } = useStreakCelebration(me?.streak ?? 0);

  // The raw message ("API 401: {\"error\":\"unauthorized\"}") used to be printed
  // here — a developer string in the user's face, and with no way out of the
  // screen. useCached logs the detail to the console instead; this offers a
  // retry, which matters because the most common cause is the API host waking
  // from sleep and succeeding on the second try.
  if (err)
    return (
      <div className="empty fade-in">
        <div className="e">
          <WifiOff size={52} strokeWidth={1.8} />
        </div>
        <p>{t('common.error')}</p>
        <button className="btn" onClick={() => { haptic(); reload(); }}>
          <RotateCcw size={18} strokeWidth={2.4} /> {t('common.retry')}
        </button>
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
    <div className="home fade-in">
      <HomeFrame />
      <div className="hero">
        <Sparks className="hs-deco spark-badge" />
        <HomeDecorImg slot="oliveRight" className="hero-olive" />
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
          <Sparks className="hs-deco spark-name" />
        </h1>
        <div className="hero-chips">
          {me.streak >= 2 && (
            <span className="chip">
              <OilLamp className="chip-art c-lamp" />
              {me.streak} {t(me.streak === 1 ? 'home.streakDay' : 'home.streakDays')}
            </span>
          )}
          <span className="chip chip-acc">
            <Aspis className="chip-art c-aspis" />
            {acc}%
          </span>
          <span className="chip">
            <WaxTablet className="chip-art c-tablet" />
            {me.stats.total_sessions}
          </span>
          <span className="chip">
            <LaurelSprig className="chip-art c-laurel" />
            {me.vocab.mastered}/{me.vocab.total}
          </span>
          {getToken() ? (
            <button
              className="chip"
              onClick={() => {
                haptic();
                clearToken();
                clearCache();
                // Reloading with no token now re-derives entered=false, landing on
                // the welcome page (see App.tsx).
                window.location.reload();
              }}
            >
              <LogOut size={14} strokeWidth={2.4} />
              {t('auth.logout')}
            </button>
          ) : (
            <button
              className="chip"
              onClick={() => {
                haptic();
                // Guests have no token, so reloading re-derives entered=false and
                // lands on the welcome page (login / register / continue).
                window.location.reload();
              }}
            >
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
            <WaxTablet />
          </span>
          <span className="grow">
            <span className="tile-t" style={{ display: 'block' }}>
              {t('nav.quiz')}
            </span>
            <span className="tile-d">{t('home.quiz.desc')}</span>
          </span>
          <HomeDecorImg slot="oliveMid" className="tile-olive" />
          <HomeDecorImg slot="columnTilted" className="tile-column" />
          <Sparks className="hs-deco spark-cta" />
          <span className="arrow">
            <ArrowRight size={22} strokeWidth={2.6} />
          </span>
        </button>

        <button className="tile t-cards" style={{ animationDelay: '90ms' }} onClick={() => nav('flashcards')}>
          <span className="tile-ic">
            <Ostraka />
          </span>
          <span className="tile-t">{t('nav.flashcards')}</span>
          <span className="tile-d">{t('home.flashcards.desc')}</span>
          <HomeDecorImg slot="oliveSmall" className="tile-olive" />
          <span className="hs-deco tile-go" aria-hidden="true">
            <ArrowRight size={22} strokeWidth={2.4} />
          </span>
        </button>
        <button className="tile t-vocab" style={{ animationDelay: '130ms' }} onClick={() => nav('vocab')}>
          <span className="tile-ic">
            <Papyrus />
          </span>
          <span className="tile-t">{t('nav.vocab')}</span>
          <span className="tile-d">{t('home.vocab.desc')}</span>
          <HomeDecorImg slot="oliveMid" className="tile-olive" />
          <span className="hs-deco tile-go" aria-hidden="true">
            <ArrowRight size={22} strokeWidth={2.4} />
          </span>
        </button>

        <button
          className="tile span2 t-stats"
          style={{ animationDelay: '180ms', flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 'auto' }}
          onClick={() => nav('stats')}
        >
          <span className="tile-ic">
            <ColumnChart />
          </span>
          <span className="grow">
            <span className="tile-t" style={{ display: 'block' }}>
              {t('home.stats.title')}
            </span>
            <span className="tile-d">{t('home.stats.desc')}</span>
          </span>
          <HomeDecorImg slot="lilacBranch" className="tile-olive" />
          <span className="arrow" style={{ color: 'var(--muted)' }}>
            <ArrowRight size={20} strokeWidth={2.4} />
          </span>
        </button>
      </div>

      {showStreak && <StreakCelebration streak={me.streak} onDismiss={dismissStreak} />}
    </div>
  );
}
