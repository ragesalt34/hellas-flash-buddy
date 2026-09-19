import { Flame, Target, BookOpen, Star, Layers, Languages, BarChart3, ArrowRight, WifiOff, UserRound, LogOut, RotateCcw } from 'lucide-react';
import { api, clearCache } from '../api';
import { getToken, clearToken } from '../auth';
import { haptic } from '../telegram';
import { Loading, useCached } from '../ui';
import { useLanguage } from '../i18n';
import { StreakCelebration, useStreakCelebration } from '../components/StreakCelebration';
import type { View } from '../App';

/* Decoration for the round theme's home screen: three short strokes fanning out
   from a point, like a hand-drawn "shine". Purely visual — aria-hidden, and the
   square theme hides every .hs-deco element. */
function Sparks({ className }: { className: string }) {
  return (
    <svg className={`hs-deco ${className}`} width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden="true">
      <path d="M8 30 L19 24 M12 15 L21 20 M22 6 L24 16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* Page-level ornaments: soft pastel blobs in the corners and a few doodles.
   Fixed behind the content, never interactive. */
function HomeDecor() {
  return (
    <div className="hs-deco home-decor" aria-hidden="true">
      <span className="blob b-tl" />
      <span className="blob b-tr" />
      <span className="blob b-bl" />
      <span className="blob b-br" />
      <svg className="doodle d-heart" width="46" height="44" viewBox="0 0 46 44" fill="none">
        <path
          d="M23 39 C10 30 4 22 5 14 C6 7 13 4 18 7 C21 9 22 12 23 14 C24 11 27 7 31 6 C37 5 42 10 41 17 C40 25 32 32 23 39 Z"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      </svg>
      <svg className="doodle d-squiggle" width="30" height="34" viewBox="0 0 30 34" fill="none">
        <path d="M5 4 C14 6 6 14 14 17 C22 20 13 26 24 30" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <svg className="doodle d-swirl" width="72" height="44" viewBox="0 0 72 44" fill="none">
        <path
          d="M4 40 C8 22 20 14 30 20 C38 25 30 34 25 28 C20 21 34 8 48 10 C58 12 62 6 68 4"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
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
        <Sparks className="spark-badge" />
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
          <Sparks className="spark-name" />
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
            <BookOpen size={26} strokeWidth={2.2} />
          </span>
          <span className="grow">
            <span className="tile-t" style={{ display: 'block' }}>
              {t('nav.quiz')}
            </span>
            <span className="tile-d">{t('home.quiz.desc')}</span>
          </span>
          <Sparks className="spark-cta" />
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
          <span className="hs-deco tile-go" aria-hidden="true">
            <ArrowRight size={22} strokeWidth={2.4} />
          </span>
        </button>
        <button className="tile t-vocab" style={{ animationDelay: '130ms' }} onClick={() => nav('vocab')}>
          <span className="tile-ic">
            <Languages size={24} strokeWidth={2.2} />
          </span>
          <span className="tile-t">{t('nav.vocab')}</span>
          <span className="tile-d">{t('home.vocab.desc')}</span>
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
          <span className="arrow" style={{ color: 'var(--muted)' }}>
            <ArrowRight size={20} strokeWidth={2.4} />
          </span>
        </button>
      </div>

      {showStreak && <StreakCelebration streak={me.streak} onDismiss={dismissStreak} />}
    </div>
  );
}
