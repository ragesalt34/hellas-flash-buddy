import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
  BookOpen, Layers, Languages, BarChart3, Flame, Volume2, ArrowRight,
  MousePointerClick, Target, Drama, Scale, Globe2, type LucideIcon,
} from 'lucide-react';
import { useLanguage } from '../i18n';
import { LanguageSwitch } from '../components/LanguageSwitch';
import { TempleMark } from '../components/icons';

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

/** Number that counts up from 0 when it scrolls into view (once). */
function CountUp({ to, suffix = '' }: { to: number; suffix?: string }) {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setN(to); // no animation for reduced-motion users — show the value instantly
      return;
    }
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        const t0 = performance.now();
        const dur = 1100;
        const tick = (t: number) => {
          const p = Math.min(1, (t - t0) / dur);
          setN(Math.round(to * (1 - Math.pow(1 - p, 3)))); // ease-out cubic
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to]);
  return (
    <span ref={ref}>
      {n}
      {suffix}
    </span>
  );
}

// Real vocab items from the app — the hero demo IS the product.
const DEMO_WORDS: { word: string; ru: string }[] = [
  { word: 'η ιθαγένεια', ru: 'гражданство' },
  { word: 'η πατρίδα', ru: 'родина' },
  { word: 'η σημαία', ru: 'флаг' },
  { word: 'το σύνταγμα', ru: 'конституция' },
];

/** Interactive vocab card in the hero: tap to reveal, tap again for the next
 * word. On desktop it also tilts in 3D toward the cursor with a moving glare. */
function DemoCard() {
  const { t } = useLanguage();
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const w = DEMO_WORDS[i % DEMO_WORDS.length];

  // Cursor-follow 3D tilt (mouse only; springs keep it smooth, not twitchy).
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const spring = { stiffness: 220, damping: 18, mass: 0.4 };
  const rotateX = useSpring(useTransform(my, [0, 1], [7, -7]), spring);
  const rotateY = useSpring(useTransform(mx, [0, 1], [-9, 9]), spring);
  const glare = useTransform(
    [mx, my],
    ([x, y]: number[]) =>
      `radial-gradient(220px circle at ${x * 100}% ${y * 100}%, rgba(255,255,255,0.5), transparent 60%)`
  );

  const reduce =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (reduce || e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
  };
  const reset = () => {
    mx.set(0.5);
    my.set(0.5);
  };

  const tap = () => {
    if (!revealed) setRevealed(true);
    else {
      setI((n) => n + 1);
      setRevealed(false);
    }
  };

  return (
    <motion.div
      className="card lp-demo"
      onClick={tap}
      role="button"
      tabIndex={0}
      onPointerMove={onMove}
      onPointerLeave={reset}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
    >
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
      <motion.span className="lp-glare" aria-hidden="true" style={{ background: glare }} />
    </motion.div>
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
            <motion.span
              className="lp-pill lp-pill--sticker"
              initial={{ opacity: 0, y: 10, rotate: 0 }}
              animate={{ opacity: 1, y: 0, rotate: -1.5 }}
              transition={{ duration: 0.5 }}
            >
              <span className="lp-pill-tag">
                <TempleMark size={14} strokeWidth={2.6} /> ΕΛΛΑΣ
              </span>
              <span className="lp-pill-text">
                {t('landing.pill')} <b>{t('landing.pill.b')}</b>
              </span>
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

      {/* Topic marquee — each exam topic with its own icon (same set as the quiz screen) */}
      <div className="lp-marquee" aria-hidden="true">
        <div className="lp-marquee-track">
          {[0, 1].map((copy) => (
            <span className="lp-marquee-seg" key={copy}>
              <span className="lp-marquee-item"><TempleMark size={19} strokeWidth={2.4} /> {t('topic.history').toUpperCase()}</span>
              <span className="lp-marquee-item"><Drama size={19} strokeWidth={2.4} /> {t('topic.culture').toUpperCase()}</span>
              <span className="lp-marquee-item"><Scale size={19} strokeWidth={2.4} /> {t('topic.laws').toUpperCase()}</span>
              <span className="lp-marquee-item"><Globe2 size={19} strokeWidth={2.4} /> {t('topic.geography').toUpperCase()}</span>
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
            style={{ rotate: [-1.5, 1, -0.5][i] ?? 0 }}
            whileHover={{ rotate: 0, y: -6 }}
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
              style={{ rotate: [1.2, -1, 0.6, -0.8, 1, -1.3][i] ?? 0 }}
              whileHover={{ rotate: 0, y: -6 }}
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

      {/* Opinion pull-quote — a designed pause with attitude, not a feature line */}
      <motion.section
        className="lp-quote"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE }}
        viewport={{ once: true, margin: '-80px' }}
      >
        <span className="lp-quote-mark" aria-hidden="true">“</span>
        <p className="lp-quote-text">{t('landing.quote')}</p>
        <p className="lp-quote-sub">{t('landing.quote.sub')}</p>
      </motion.section>

      <motion.section className="lp-stats" variants={rise} initial="hidden" whileInView="show" viewport={{ once: true }}>
        <div className="lp-stat"><div className="n" style={{ color: 'var(--amber)' }}><CountUp to={160} suffix="+" /></div><div className="l">{t('landing.stat.questions')}</div></div>
        <div className="lp-stat"><div className="n" style={{ color: 'var(--mint)' }}><CountUp to={150} suffix="+" /></div><div className="l">{t('landing.stat.words')}</div></div>
        <div className="lp-stat"><div className="n" style={{ color: 'var(--accent)' }}><CountUp to={4} /></div><div className="l">{t('landing.stat.topics')}</div></div>
        <div className="lp-stat"><div className="n" style={{ color: 'var(--blue)' }}>SRS</div><div className="l">{t('landing.stat.srs')}</div></div>
      </motion.section>

      {/* FAQ — short, plain, with personality (native <details>, zero JS) */}
      <motion.section
        className="lp-faq"
        variants={rise}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-60px' }}
      >
        <h2 className="lp-faq-h">{t('landing.faq.title')}</h2>
        {[1, 2, 3, 4].map((n) => (
          <details className="lp-faq-item" key={n}>
            <summary>
              {t(`landing.faq.q${n}`)}
              <span className="lp-faq-plus" aria-hidden="true">+</span>
            </summary>
            <p>{t(`landing.faq.a${n}`)}</p>
          </details>
        ))}
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
        <span className="lp-footer-note">© 2026 · {t('landing.footer.tag')}</span>
      </footer>
    </div>
  );
}
