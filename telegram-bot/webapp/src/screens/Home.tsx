import { Flame, Target, Star, Layers, BookA, BarChart3, ArrowRight, WifiOff, UserRound, LogOut, RotateCcw } from 'lucide-react';
import { api, clearCache } from '../api';
import { getToken, clearToken } from '../auth';
import { haptic } from '../telegram';
import { Loading, useCached } from '../ui';
import { useLanguage } from '../i18n';
import { StreakCelebration, useStreakCelebration } from '../components/StreakCelebration';
import type { View } from '../App';
import { QuizIcon, Sparks } from '../components/icons';
import { Greek } from '../components/greek';

/* Page-level ornaments: pastel corner washes plus a set of classical line
   drawings — olive sprigs, a column, an amphora, a bust and a temple on its
   hill — so the empty margins carry the Greek theme instead of generic
   doodles. Fixed behind the content, never interactive. */
function HomeDecor() {
  return (
    <div className="hs-deco home-decor" aria-hidden="true">
      <Greek name="bg-shape-1" className="blob b-tl" />
      <Greek name="bg-shape-3" className="blob b-tr" />
      <Greek name="bg-shape-3" className="blob b-bl" />
      <Greek name="bg-shape-2" className="blob b-br" />
      <Greek name="column" className="doodle d-column-l" />
      <Greek name="column" className="doodle d-column-r" />
      <Greek name="hill-temple" className="doodle d-temple" />
      <Greek name="amphora" className="doodle d-amphora" />
      <Greek name="decorative-line" className="doodle d-bust" />
      <Greek name="olive-branch" className="doodle d-olive-1" />
      <Greek name="olive-branch-small" className="doodle d-olive-2" />
      <Greek name="laurel-branch" className="doodle d-olive-3" />
      <Greek name="olive-branch-small" className="doodle d-olive-4" />
    </div>
  );
}

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
      <HomeDecor />
      <div className="hero">
        <Sparks className="hs-deco spark-badge" />
        <Greek name="olive-branch-small" className="hero-olive" />
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
              <Flame size={15} color="var(--coral)" />
              {me.streak} {t(me.streak === 1 ? 'home.streakDay' : 'home.streakDays')}
            </span>
          )}
          <span className="chip chip-acc">
            <Target size={15} color="var(--mint)" />
            {acc}%
          </span>
          <span className="chip">
            <QuizIcon size={15} color="var(--accent)" />
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
            <QuizIcon size={26} strokeWidth={2.2} />
          </span>
          <span className="grow">
            <span className="tile-t" style={{ display: 'block' }}>
              {t('nav.quiz')}
            </span>
            <span className="tile-d">{t('home.quiz.desc')}</span>
          </span>
          <Greek name="olive-branch-small" className="tile-olive" />
          <Greek name="column" className="tile-column" />
          <Sparks className="hs-deco spark-cta" />
          <span className="arrow">
            <ArrowRight size={22} strokeWidth={2.6} />
          </span>
        </button>

        <button className="tile t-cards" style={{ animationDelay: '90ms' }} onClick={() => nav('flashcards')}>
          <span className="tile-ic">
            <Layers size={24} strokeWidth={2.2} />
          </span>
          <span className="tile-t">{t('nav.flashcards')}</span>
          <span className="tile-d">{t('home.flashcards.desc')}</span>
          <Greek name="olive-branch-small" className="tile-olive" />
          <span className="hs-deco tile-go" aria-hidden="true">
            <ArrowRight size={22} strokeWidth={2.4} />
          </span>
        </button>
        <button className="tile t-vocab" style={{ animationDelay: '130ms' }} onClick={() => nav('vocab')}>
          <span className="tile-ic">
            <BookA size={24} strokeWidth={2.2} />
          </span>
          <span className="tile-t">{t('nav.vocab')}</span>
          <span className="tile-d">{t('home.vocab.desc')}</span>
          <Greek name="olive-branch-small" className="tile-olive" />
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
            <BarChart3 size={24} strokeWidth={2.2} />
          </span>
          <span className="grow">
            <span className="tile-t" style={{ display: 'block' }}>
              {t('home.stats.title')}
            </span>
            <span className="tile-d">{t('home.stats.desc')}</span>
          </span>
          <Greek name="olive-branch-small" className="tile-olive" />
          <span className="arrow" style={{ color: 'var(--muted)' }}>
            <ArrowRight size={20} strokeWidth={2.4} />
          </span>
        </button>
      </div>

      {showStreak && <StreakCelebration streak={me.streak} onDismiss={dismissStreak} />}
    </div>
  );
}
