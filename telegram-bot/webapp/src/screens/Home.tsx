import { ArrowRight, WifiOff, UserRound, LogOut, RotateCcw } from 'lucide-react';
import { api, clearCache } from '../api';
import { getToken, clearToken } from '../auth';
import { haptic } from '../telegram';
import { Loading, useCached } from '../ui';
import { countWord, useLanguage } from '../i18n';
import { StreakCelebration, useStreakCelebration } from '../components/StreakCelebration';
import type { View } from '../App';
import { StudyIcon } from '../components/StudyIcon';
import { HomeFrame, HomeDecorImg } from './homeDecor';
import { PlanCard } from './PlanCard';
import { WordOfDay } from './WordOfDay';
import { SectionLabel } from '../components/SectionLabel';
import { StudyArtwork } from '../components/StudyArtwork';

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
    <div className="home home-screen fade-in">
      <HomeFrame />
      <div className="hero">
        <StudyArtwork kind="architecture" className="home-architecture" />
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
        </h1>
        <div className="pureplay-welcome">
          <h2>{t('home.pureplay.title')}</h2>
          <p>{t('home.pureplay.sub')}</p>
          <div className="pureplay-welcome-actions">
            <button className="btn" onClick={() => nav('quiz')}>{t('home.pureplay.start')} <ArrowRight size={20} /></button>
            <button className="pureplay-text-link" onClick={() => nav('flashcards')}>{t('home.pureplay.cards')}</button>
          </div>
        </div>
        <div className="hero-chips">
          {me.streak >= 2 && (
            <span className="chip">
              <StudyIcon name="streak" className="chip-art c-lamp" />
              {me.streak} {countWord(me.streak, 'day', language)}
            </span>
          )}
          <span className="chip chip-acc">
            <StudyIcon name="accuracy" className="chip-art c-aspis" />
            {acc}%
            <span className="home-chip-label">{t('home.accuracy')}</span>
          </span>
          <span className="chip">
            <StudyIcon name="quiz" className="chip-art c-tablet" />
            {me.stats.total_sessions}
            <span className="home-chip-label">{t('home.sessions')}</span>
          </span>
          <span className="chip">
            <StudyIcon name="words" className="chip-art c-laurel" />
            {me.vocab.mastered}/{me.vocab.total}
            <span className="home-chip-label">{t('home.wordsLearned')}</span>
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

      <div className="home-workspace">
      <section className="home-learning">
      <SectionLabel k="home.section.learn" />
      <div className="tiles stagger">
        <button
          className="tile feature"
          style={{ animationDelay: '40ms' }}
          onClick={() => nav('quiz')}
        >
          <span className="tile-ic">
            <StudyIcon name="quiz" />
          </span>
          <span className="grow">
            <span className="tile-t" style={{ display: 'block' }}>
              {t('nav.quiz')}
            </span>
            <span className="tile-d">{t('home.quiz.desc')}</span>
          </span>
          <HomeDecorImg slot="oliveMid" className="tile-olive" />
          <HomeDecorImg slot="columnTilted" className="tile-column" />
          <span className="arrow">
            <ArrowRight size={22} strokeWidth={2.6} />
          </span>
        </button>

        <button className="tile t-cards" style={{ animationDelay: '90ms' }} onClick={() => nav('flashcards')}>
          <span className="tile-ic">
            <StudyIcon name="flashcards" />
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
            <StudyIcon name="vocab" />
          </span>
          <span className="tile-t">{t('nav.vocab')}</span>
          <span className="tile-d">{t('home.vocab.desc')}</span>
          <HomeDecorImg slot="oliveMid" className="tile-olive" />
          <span className="hs-deco tile-go" aria-hidden="true">
            <ArrowRight size={22} strokeWidth={2.4} />
          </span>
        </button>

        <button
          className="tile span2 t-homework"
          style={{ animationDelay: '160ms', flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 'auto' }}
          onClick={() => nav('homework')}
        >
          <span className="tile-ic">
            <StudyIcon name="homework" />
          </span>
          <span className="grow">
            <span className="tile-t" style={{ display: 'block' }}>
              {t('nav.homework')}
            </span>
            <span className="tile-d">{t('home.homework.desc')}</span>
          </span>
          <HomeDecorImg slot="oliveSmall" className="tile-olive" />
          <span className="arrow" style={{ color: 'var(--muted)' }}>
            <ArrowRight size={20} strokeWidth={2.4} />
          </span>
        </button>

        <button
          className="tile span2 t-stats"
          style={{ animationDelay: '180ms', flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 'auto' }}
          onClick={() => nav('stats')}
        >
          <span className="tile-ic">
            <StudyIcon name="stats" />
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
      {me.plan && <PlanCard plan={me.plan} isGuest={me.user.is_guest} onNavigate={onNavigate} onSaved={reload} />}
      </section>
      {me.wordOfDay && <aside className="home-sidebar"><WordOfDay word={me.wordOfDay} /></aside>}
      </div>

      {showStreak && <StreakCelebration streak={me.streak} onDismiss={dismissStreak} />}
    </div>
  );
}
