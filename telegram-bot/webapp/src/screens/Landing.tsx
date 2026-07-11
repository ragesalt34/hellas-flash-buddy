import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen, Layers, Languages, BarChart3, Flame, Volume2, ArrowRight,
  MousePointerClick, Target, type LucideIcon,
} from 'lucide-react';
import { useLanguage } from '../i18n';
import { LanguageSwitch } from '../components/LanguageSwitch';
import { TempleMark, LaurelSprig } from '../components/icons';

const FEATURES: { icon: LucideIcon; color: string; titleKey: string; textKey: string }[] = [
  { icon: BookOpen, color: 'var(--accent)', titleKey: 'landing.feature.quiz.title', textKey: 'landing.feature.quiz.text' },
  { icon: Layers, color: 'var(--violet)', titleKey: 'landing.feature.flashcards.title', textKey: 'landing.feature.flashcards.text' },
  { icon: Languages, color: 'var(--mint)', titleKey: 'landing.feature.vocab.title', textKey: 'landing.feature.vocab.text' },
  { icon: Volume2, color: 'var(--amber)', titleKey: 'landing.feature.speech.title', textKey: 'landing.feature.speech.text' },
  { icon: Flame, color: 'var(--coral)', titleKey: 'landing.feature.streak.title', textKey: 'landing.feature.streak.text' },
  { icon: BarChart3, color: 'var(--pink)', titleKey: 'landing.feature.progress.title', textKey: 'landing.feature.progress.text' },
];

const STEPS: { titleKey: string; textKey: string }[] = [
  { titleKey: 'landing.step1.title', textKey: 'landing.step1.text' },
  { titleKey: 'landing.step2.title', textKey: 'landing.step2.text' },
  { titleKey: 'landing.step3.title', textKey: 'landing.step3.text' },
];

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const rise = {
  hidden: { opacity: 0, y: 28 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay: i * 0.06, ease: EASE } }),
};

// Real vocab items from the app — the hero demo IS the product.
const DEMO_WORDS: { word: string; ru: string }[] = [
  { word: 'η ιθαγένεια', ru: 'гражданство' },
  { word: 'η πατρίδα', ru: 'родина' },
  { word: 'η σημαία', ru: 'флаг' },
  { word: 'το σύνταγμα', ru: 'конституция' },
];

/** Interactive vocab card in the hero: tap to reveal, tap again for the next word. */
function DemoCard() {
  const { t } = useLanguage();
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const w = DEMO_WORDS[i % DEMO_WORDS.length];

  const tap = () => {
    if (!revealed) setRevealed(true);
    else {
      setI((n) => n + 1);
      setRevealed(false);
    }
  };

  return (
    <div className="card lp-demo" onClick={tap} role="button" tabIndex={0}>
      <span className="hero-badge" aria-hidden="true">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 21 V3 H21 V21 H9 V9 H15 V15 H12"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="square"
          />
        </svg>
      </span>
      <div className="vocab-word">{w.word}</div>
      <div className={`spoiler${revealed ? '' : ' hidden'}`}>
        <div className="reveal">
          <div className="ru">{w.ru}</div>
        </div>
        {!revealed && (
          <div className="tap" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <MousePointerClick size={14} strokeWidth={2.4} /> {t('vocab.tapToReveal')}
          </div>
        )}
      </div>
    </div>
  );
}

export function Landing({
  onStart,
  onLogin,
  onGuest,
}: {
  onStart: () => void;
  onLogin: () => void;
  onGuest: () => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="landing">
      <nav className="lp-nav">
        <div className="lp-brand">
          <span className="lp-logo" style={{ color: '#fff' }}><TempleMark size={22} /></span>
          Hellas Study
        </div>
        <div className="lp-nav-right">
          <LanguageSwitch />
          <button className="lp-btn ghost" onClick={onLogin}>{t('landing.enter')}</button>
        </div>
      </nav>

      <header className="lp-hero">
        <div className="lp-hero-grid">
          <div className="lp-hero-copy">
            <motion.span className="lp-pill" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <span style={{ color: 'var(--good)', display: 'inline-flex' }}><LaurelSprig size={16} /></span>
              {t('landing.pill')} <b>{t('landing.pill.b')}</b>
            </motion.span>
            <motion.h1 initial="hidden" animate="show" variants={rise}>
              {t('landing.h1.line1')}<br /><span className="highlight">{t('landing.h1.highlight')}</span>
            </motion.h1>
            <motion.p initial="hidden" animate="show" custom={1} variants={rise}>
              {t('landing.sub')}
            </motion.p>
            <motion.div className="lp-cta" initial="hidden" animate="show" custom={2} variants={rise}>
              <button className="lp-btn primary" onClick={onStart}>{t('landing.cta.start')} <ArrowRight size={19} strokeWidth={2.6} /></button>
              <button className="lp-btn ghost" onClick={onGuest}>{t('landing.cta.see')}</button>
            </motion.div>
          </div>

          <motion.div
            className="lp-demo-wrap"
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.25, ease: EASE }}
          >
            <div className="lp-demo-label">{t('landing.demo.label')}</div>
            <DemoCard />
            {/* Floating product stickers — fill the side space, echo the app UI */}
            <motion.span
              className="lp-float f1"
              initial={{ opacity: 0, y: 14, rotate: -8 }}
              animate={{ opacity: 1, y: 0, rotate: -6 }}
              transition={{ delay: 0.55, duration: 0.5, ease: EASE }}
              aria-hidden="true"
            >
              <Flame size={17} strokeWidth={2.5} /> ×7
            </motion.span>
            <motion.span
              className="lp-float f2"
              initial={{ opacity: 0, y: 14, rotate: 6 }}
              animate={{ opacity: 1, y: 0, rotate: 4 }}
              transition={{ delay: 0.7, duration: 0.5, ease: EASE }}
              aria-hidden="true"
            >
              <Target size={17} strokeWidth={2.5} /> 87%
            </motion.span>
            <motion.span
              className="lp-float f3"
              initial={{ opacity: 0, y: 14, rotate: -5 }}
              animate={{ opacity: 1, y: 0, rotate: -8 }}
              transition={{ delay: 0.85, duration: 0.5, ease: EASE }}
              aria-hidden="true"
            >
              <Volume2 size={17} strokeWidth={2.5} /> α β γ
            </motion.span>
          </motion.div>
        </div>
      </header>

      {/* Meander marquee — the Greek key ribbon */}
      <div className="lp-marquee" aria-hidden="true">
        <div className="lp-marquee-track">
          {[0, 1].map((copy) => (
            <span className="lp-marquee-seg" key={copy}>
              {(['topic.history', 'topic.culture', 'topic.laws', 'topic.geography'] as const).map((k) => (
                <span className="lp-marquee-item" key={k}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M3 21 V3 H21 V21 H9 V9 H15 V15 H12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" />
                  </svg>
                  {t(k).toUpperCase()}
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      <motion.h2 className="lp-steps-h" variants={rise} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}>
        {t('landing.steps.title')}
      </motion.h2>
      <section className="lp-steps">
        {STEPS.map((s, i) => (
          <motion.div
            key={s.titleKey}
            className={`lp-step s${i + 1}`}
            variants={rise}
            custom={i}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
          >
            <span className="num">{i + 1}</span>
            <h3>{t(s.titleKey)}</h3>
            <p>{t(s.textKey)}</p>
          </motion.div>
        ))}
      </section>

      <section className="lp-features">
        {FEATURES.map((f, i) => {
          const Icon = f.icon;
          return (
            <motion.div
              key={f.titleKey}
              className="lp-feature"
              variants={rise}
              custom={i % 3}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-60px' }}
            >
              <span className="ic" style={{ background: `color-mix(in srgb, ${f.color} 18%, transparent)`, color: f.color }}>
                <Icon size={24} strokeWidth={2.3} />
              </span>
              <h3>{t(f.titleKey)}</h3>
              <p>{t(f.textKey)}</p>
            </motion.div>
          );
        })}
      </section>

      <motion.section className="lp-stats" variants={rise} initial="hidden" whileInView="show" viewport={{ once: true }}>
        <div className="lp-stat"><div className="n" style={{ color: 'var(--amber)' }}>160+</div><div className="l">{t('landing.stat.questions')}</div></div>
        <div className="lp-stat"><div className="n" style={{ color: 'var(--mint)' }}>150+</div><div className="l">{t('landing.stat.words')}</div></div>
        <div className="lp-stat"><div className="n" style={{ color: 'var(--accent)' }}>4</div><div className="l">{t('landing.stat.topics')}</div></div>
        <div className="lp-stat"><div className="n" style={{ color: 'var(--blue)' }}>SRS</div><div className="l">{t('landing.stat.srs')}</div></div>
      </motion.section>

      <motion.section
        className="lp-foot"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        viewport={{ once: true }}
      >
        <h2>{t('landing.foot.title')}</h2>
        <button className="lp-btn primary" onClick={onStart}>{t('landing.foot.cta')} <ArrowRight size={19} strokeWidth={2.6} /></button>
      </motion.section>

      <footer className="lp-footer">
        <div className="lp-brand">
          <span className="lp-logo" style={{ color: '#fff' }}><TempleMark size={18} /></span>
          Hellas Study
        </div>
        <span className="lp-footer-note">© 2026 · {t('landing.pill')}</span>
      </footer>
    </div>
  );
}
