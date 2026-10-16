import { LiquidMetalButton } from '../components/ui/liquid-metal-button';
import { useEffect, useRef } from 'react';
import { mountLandingMotion } from './landingMotion.js';
import { LandingFaq } from './LandingFaq';
import { SlideArrow } from '../components/SlideArrow';
import { useLanguage } from '../i18n';
import { Logo } from '../components/Logo';
import { LanguageSwitch } from '../components/LanguageSwitch';
import { LANDING_ART, type LandingArtKey } from './landingArt';
import './landingEditorial.css';
import './landingResponsive.css';
import './landingFeatures.css';
import './landingJourney.css';

/* Desktop landing, first editorial reference (design-handoff/landing-editorial-assets-v1).
   Text, numbers, buttons and the FAQ are live HTML; the 19 pictures are the delivered ones
   (WebP re-encodes of the PNGs, placed by the manifest's visible bounds). Shared by desktop, tablet and phone; layouts reflow in landingResponsive.css. */

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
  { art: 'feature-plan', title: 'plan.title', text: 'le.f5.text' },
  { art: 'feature-progress', title: 'landing.feature.progress.title', text: 'le.f6.text' },
] as const;

export function LandingEditorial({ onStart, onGuest }: { onStart: () => void; onGuest: () => void }) {
  const { t } = useLanguage();
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => mountLandingMotion(root.current), []);

  return (
    <div ref={root} className="landing landing-screen le-page">
      <div className="le-wrap">
        {/* ---- hero ---- */}
        <section className="le-hero" id="top">
          <div className="le-hero-copy">
            <p className="le-eyebrow">{t('landing.pill.b')}</p>
            <h1 data-motion-title>{t('le.h1')}</h1>
            <p className="le-sub">{t('landing.pureplay.sub')}</p>
            <div className="le-cta">
              <LiquidMetalButton className="le-btn primary" onClick={onStart}>
                {t('landing.cta.start')} <SlideArrow size={22} strokeWidth={2} aria-hidden="true" />
              </LiquidMetalButton>
              <LiquidMetalButton className="le-btn ghost" variant="secondary" onClick={onGuest}>
                {t('landing.cta.see')}
              </LiquidMetalButton>
            </div>
          </div>
          <Art name="hero-collage" vw={840} className="le-hero-art" />
        </section>

        {/* ---- facts: one paper ribbon, four groups ---- */}
        <section className="le-ribbon" aria-label={t('landing.stat.topics')}>
          <Art name="surface-facts-ribbon" className="le-ribbon-paper" />
          <ul className="le-ribbon-list">
            <li><Art name="fact-questions" className="le-ribbon-art" /><b>160+</b><span className="le-ribbon-label">{t('le.facts.questions')}</span></li>
            <li><Art name="fact-vocabulary" className="le-ribbon-art" /><b>150</b><span className="le-ribbon-label">{t('le.facts.words')}</span></li>
            <li><Art name="fact-topics" className="le-ribbon-art" /><b>4</b><span className="le-ribbon-label">{t('le.facts.topics')}</span></li>
            <li><Art name="fact-srs" className="le-ribbon-art" /><b>SRS</b><span className="le-ribbon-label">{t('le.facts.srs')}</span></li>
          </ul>
        </section>

        {/* ---- how it works ---- */}
        <section className="le-journey" id="how-it-works" aria-labelledby="landing-journey-title">
          <h2 id="landing-journey-title" data-motion-title>{t('landing.steps.title')}</h2>
          <ol>
            {STEPS.map((s, i) => (
              <li key={s.art}>
                <div className="le-journey-copy">
                  <span className="le-journey-number" aria-hidden="true">{i + 1}</span>
                  <div>
                    <h3>{t(s.title)}</h3>
                    <p>{t(s.text)}</p>
                  </div>
                </div>
                <div className="le-journey-picture">
                  <Art name={s.art} className="le-journey-art" />
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ---- everything for the preparation ---- */}
        <section className="le-prep" id="features" aria-labelledby="landing-features-title">
          <h2 id="landing-features-title" data-motion-title>{t('le.features.title')}</h2>
          <p className="le-prep-sub">{t('le.features.sub')}</p>
          <ul className="le-prep-list">
            {FEATURES.map((f) => (
              <li key={f.art} data-motion-card>
                <Art name={f.art} className="le-prep-art" />
                <div className="le-prep-text">
                  <h3>{t(f.title)}</h3>
                  <p>{t(f.text)}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* ---- FAQ ---- */}
        <LandingFaq />

        {/* ---- closing banner ---- */}
        <section className="le-close">
          <Art name="closing-banner" className="le-close-art" />
          <div className="le-close-copy">
            <h2 data-motion-title>{t('le.close.title')}</h2>
            <p>{t('le.close.sub')}</p>
            <button className="le-btn primary" onClick={onStart}>
              {t('le.close.cta')} <SlideArrow size={22} strokeWidth={2} aria-hidden="true" />
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
