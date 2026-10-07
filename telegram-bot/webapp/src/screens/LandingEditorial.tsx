import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, CircleHelp, LogIn, Volume2 } from 'lucide-react';
import { useLanguage } from '../i18n';
import { speakGreek } from '../speech';
import { Logo } from '../components/Logo';
import { LanguageSwitch } from '../components/LanguageSwitch';
import { LANDING_ART, type LandingArtKey } from './landingArt';
import './landingEditorial.css';

/* Desktop landing, first editorial reference (design-handoff/landing-editorial-assets-v1).
   Text, numbers, buttons and the FAQ are live HTML; the 19 pictures are the delivered ones
   (WebP re-encodes of the PNGs, placed by the manifest's visible bounds). Wide screens only:
   Landing.tsx renders the older layout below 1100px. */

const BASE = import.meta.env.BASE_URL;

/** One delivered picture, placed by its visible bounds (PLACEMENT_GUIDE.md): the box has the
 * aspect of the visible drawing and the whole canvas sits inside it, so nothing is cropped. */
function Art({ name, vw, className = '' }: { name: LandingArtKey; vw?: number; className?: string }) {
  const s = LANDING_ART[name];
  return (
    <span className={`le-art ${className}`} aria-hidden="true" style={{ ['--ar' as string]: s.aspect, ['--vw' as string]: vw ?? s.vw }}>
      <img
        src={`${BASE}assets/landing-editorial-v1/${s.file}`}
        alt=""
        draggable={false}
        decoding="async"
        style={{ left: `${s.l}%`, top: `${s.t}%`, width: `${s.w}%` }}
      />
    </span>
  );
}

// The demo card cycles through a few words; the first one is the reference's. `speak` is the exact
// vocabulary entry the server will pronounce (/api/tts only serves known texts), `id` its clip key;
// words without one show the sound icon as a plain picture.
const DEMO_WORDS: { word: string; ru: string; speak?: string; id?: number }[] = [
  { word: 'η ιστορία', ru: 'история' },
  { word: 'η ιθαγένεια', ru: 'гражданство', speak: 'ιθαγένεια', id: 1 },
  { word: 'η σημαία', ru: 'флаг', speak: 'σημαία', id: 124 },
  { word: 'η πατρίδα', ru: 'родина' },
  { word: 'το σύνταγμα', ru: 'конституция', speak: 'Σύνταγμα', id: 5 },
];

const STEPS = [
  { art: 'step-choose', title: 'landing.step1.title', text: 'landing.pureplay.step1' },
  { art: 'step-repeat', title: 'landing.step2.title', text: 'landing.pureplay.step2' },
  { art: 'step-progress', title: 'landing.step3.title', text: 'le.step3.text' },
] as const;

const FEATURES = [
  { art: 'feature-tests', title: 'landing.feature.quiz.title', text: 'le.f1.text' },
  { art: 'feature-flashcards', title: 'landing.feature.flashcards.title', text: 'le.f2.text' },
  { art: 'feature-vocabulary', title: 'landing.feature.vocab.title', text: 'le.f3.text' },
  { art: 'feature-pronunciation', title: 'landing.feature.speech.title', text: 'le.f4.text' },
  { art: 'feature-plan', title: 'plan.title', text: 'le.f5.text', plan: true },
  { art: 'feature-progress', title: 'landing.feature.progress.title', text: 'le.f6.text' },
] as const;

// Existing FAQ entries, the four the reference shows (landing.faq.q1/q4/q2/q6).
const FAQ = [1, 4, 2, 6];

export function LandingEditorial({ onStart, onLogin, onGuest, accountEntry = false }: { onStart: () => void; onLogin: () => void; onGuest: () => void; accountEntry?: boolean }) {
  const { t } = useLanguage();
  const [wordIndex, setWordIndex] = useState(0);
  const word = DEMO_WORDS[wordIndex % DEMO_WORDS.length];
  const reduce = useReducedMotion();

  return (
    <div className="landing landing-screen le-page">
      <div className="le-wrap">
        {/* ---- header ---- */}
        <header className="le-nav">
          <a className="le-brand" href="#top" aria-label="Hellas Study">
            <Logo className="le-logo" />
          </a>
          <nav className="le-links" aria-label="Hellas Study">
            <a href="#how-it-works">{t('landing.steps.title')}</a>
            <a href="#features">{t('landing.features.title')}</a>
            <a href="#faq">{t('landing.pureplay.nav.faq')}</a>
          </nav>
          <div className="le-nav-right">
            <LanguageSwitch />
            <a className="le-help" href="#faq" aria-label={t('landing.pureplay.nav.faq')}>
              <CircleHelp size={26} strokeWidth={1.7} />
            </a>
            <button className="le-login" onClick={onLogin}>
              <LogIn size={20} strokeWidth={2} aria-hidden="true" />
              {t(accountEntry ? 'nav.dashboard' : 'landing.enter')}
            </button>
          </div>
        </header>

        {/* ---- hero ---- */}
        <section className="le-hero" id="top">
          <motion.div className="le-hero-copy" initial={reduce ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}>
            <p className="le-eyebrow">{t('landing.pill.b')}</p>
            <h1>{t('le.h1')}</h1>
            <p className="le-sub">{t('landing.pureplay.sub')}</p>
            <div className="le-cta">
              <button className="le-btn primary" onClick={onStart}>
                {t('landing.cta.start')} <ArrowRight size={22} strokeWidth={2} aria-hidden="true" />
              </button>
              <button className="le-btn ghost" onClick={onGuest}>
                {t('landing.cta.see')}
              </button>
            </div>
          </motion.div>
          <Art name="hero-collage" vw={840} className="le-hero-art" />
          <div className="le-demo">
            <Art name="surface-word-card" vw={320} className="le-demo-paper" />
            {word.speak ? (
              <button
                type="button"
                className="le-demo-sound"
                aria-label={t('common.pronounce')}
                onClick={() => void speakGreek(word.speak!, `vocab_${word.id}`)}
              >
                <Volume2 size={22} strokeWidth={2} aria-hidden="true" />
              </button>
            ) : (
              <span className="le-demo-sound" aria-hidden="true">
                <Volume2 size={22} strokeWidth={2} />
              </span>
            )}
            <span className="le-demo-word" lang="el">{word.word}</span>
            <span className="le-demo-ru">{word.ru}</span>
            <button
              type="button"
              className="le-demo-try"
              onClick={() => setWordIndex((n) => n + 1)}
              aria-label={`${word.word} — ${word.ru}. ${t('landing.pureplay.demo.next')}`}
            >
              {t('landing.pureplay.demo.try')} <ArrowRight size={18} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        </section>

        {/* ---- facts: one paper ribbon, four groups ---- */}
        <section className="le-facts" aria-label={t('landing.stat.topics')}>
          <Art name="surface-facts-ribbon" className="le-facts-paper" />
          <ul>
            <li className="f1"><Art name="fact-questions" /><b>160+</b><span>{t('le.facts.questions')}</span></li>
            <li className="f2"><Art name="fact-vocabulary" /><b>150</b><span>{t('le.facts.words')}</span></li>
            <li className="f3"><Art name="fact-topics" /><b>4</b><span>{t('le.facts.topics')}</span></li>
            <li className="f4"><Art name="fact-srs" /><b>SRS</b><span>{t('le.facts.srs')}</span></li>
          </ul>
        </section>

        {/* ---- how it works ---- */}
        <section className="le-steps" id="how-it-works">
          <h2>{t('landing.steps.title')}</h2>
          <ol>
            {STEPS.map((s, i) => (
              <li key={s.art} className={`s${i + 1}`}>
                <span className="le-step-no" aria-hidden="true">{i + 1}</span>
                <h3>{t(s.title)}</h3>
                <p>{t(s.text)}</p>
                <Art name={s.art} className="le-step-art" />
                {i < 2 && <ArrowRight className="le-step-go" size={26} strokeWidth={1.8} aria-hidden="true" />}
              </li>
            ))}
          </ol>
        </section>

        {/* ---- everything for the preparation ---- */}
        <section className="le-features" id="features">
          <h2>{t('le.features.title')}</h2>
          <p className="le-features-sub">{t('le.features.sub')}</p>
          <ul>
            {FEATURES.map((f) => (
              <li key={f.art} className={'plan' in f ? 'is-plan' : undefined}>
                {'plan' in f && <Art name="surface-plan-wash" className="le-plan-wash" />}
                <Art name={f.art} className="le-feature-art" />
                <div className="le-feature-text">
                  <h3>{t(f.title)}</h3>
                  <p>{t(f.text)}</p>
                </div>
                <ArrowRight className="le-feature-go" size={26} strokeWidth={1.8} aria-hidden="true" />
              </li>
            ))}
          </ul>
        </section>

        {/* ---- FAQ ---- */}
        <section className="le-faq" id="faq">
          <div className="le-faq-side">
            <h2>{t('le.faq.title')}</h2>
            <Art name="faq-column-olive" className="le-faq-art" />
          </div>
          <div className="le-faq-list">
            {FAQ.map((n) => (
              <details key={n}>
                <summary>
                  {t(`landing.faq.q${n}`)}
                  <span className="le-plus" aria-hidden="true" />
                </summary>
                <p>{t(`landing.faq.a${n}`)}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ---- closing banner ---- */}
        <section className="le-close">
          <Art name="closing-banner" className="le-close-art" />
          <div className="le-close-copy">
            <h2>{t('le.close.title')}</h2>
            <p>{t('le.close.sub')}</p>
            <button className="le-btn primary" onClick={onStart}>
              {t('le.close.cta')} <ArrowRight size={22} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        </section>

        {/* ---- footer ---- */}
        <footer className="le-footer">
          <Logo className="le-logo" />
          <span className="le-footer-rule" aria-hidden="true" />
          <span className="le-footer-tag">{t('le.footer.tag')}</span>
          <LanguageSwitch />
        </footer>
      </div>
    </div>
  );
}
