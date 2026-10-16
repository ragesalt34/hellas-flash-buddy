import { useLayoutEffect, useRef, type MouseEvent } from 'react';
import { useLanguage } from '../i18n';
import './landingFaq.css';

const ASSETS = import.meta.env.BASE_URL + 'assets/faq-paper-v1/';
const FAQ_IDS = [1, 4, 2, 6] as const;
const ART = {
  notebook: { file: 'faq-notebook.png', aspect: '1006 / 1005', left: -15.00994, top: -16.71642, width: 124.65209 },
  blue: { file: 'faq-tab-blue.png', aspect: '304 / 952', left: -156.90789, top: -16.70168, width: 412.5 },
  terracotta: { file: 'faq-tab-terracotta.png', aspect: '387 / 1021', left: -112.1447, top: -12.53673, width: 324.03101 },
} as const;

function PaperArt({ name, className }: { name: keyof typeof ART; className: string }) {
  const art = ART[name];
  return (
    <span className={'lfq-art hs-deco ' + className} aria-hidden="true" style={{ aspectRatio: art.aspect }}>
      <img src={ASSETS + art.file} alt="" loading="lazy" decoding="async" draggable={false}
        style={{ left: art.left + '%', top: art.top + '%', width: art.width + '%' }} />
    </span>
  );
}

type Reveal = { height: Animation; ink: Animation; target: boolean };

function PaperFaqItem({ id, index }: { id: number; index: number }) {
  const { t, language } = useLanguage();
  const sheet = useRef<HTMLDetailsElement>(null);
  const clip = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const running = useRef<Reveal | null>(null);

  function clearMotion() {
    if (running.current) {
      running.current.height.onfinish = null;
      running.current.height.cancel();
      running.current.ink.cancel();
      running.current = null;
    }
    clip.current?.style.removeProperty('overflow');
  }

  function settle() {
    const target = running.current?.target;
    if (sheet.current && target !== undefined) {
      sheet.current.open = target;
      sheet.current.dataset.expanded = String(target);
    }
    clearMotion();
  }

  // A new translation or viewport must never stay clipped to an old measured height.
  // Cleanup also covers navigation away and React StrictMode's effect replay.
  useLayoutEffect(() => {
    settle();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onReduce = () => { if (reduced.matches) settle(); };
    reduced.addEventListener('change', onReduce);
    window.addEventListener('resize', settle);
    return () => {
      reduced.removeEventListener('change', onReduce);
      window.removeEventListener('resize', settle);
      settle();
    };
  }, [language]);

  function reveal(event: MouseEvent<HTMLElement>) {
    const detail = sheet.current;
    const area = clip.current;
    const ink = body.current;
    if (!detail || !area || !ink || event.defaultPrevented || event.button !== 0) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || typeof area.animate !== 'function') return;

    event.preventDefault();
    const previous = running.current;
    const target = previous ? !previous.target : !detail.open;
    const fromHeight = detail.open ? area.getBoundingClientRect().height : 0;
    const previousInk = previous ? getComputedStyle(ink) : null;
    const fromOpacity = previousInk?.opacity ?? (target ? '0' : '1');
    const fromTransform = previousInk?.transform ?? (target ? 'translateY(4px)' : 'none');
    clearMotion();
    detail.open = true;
    detail.dataset.expanded = String(target);
    const fullHeight = area.getBoundingClientRect().height;
    area.style.overflow = 'clip';

    const height = area.animate(
      [{ height: fromHeight + 'px' }, { height: (target ? fullHeight : 0) + 'px' }],
      { duration: 260, easing: 'cubic-bezier(.22,.68,0,1)', fill: 'both' },
    );
    const inkMotion = ink.animate(
      [{ opacity: fromOpacity, transform: fromTransform }, { opacity: target ? 1 : 0, transform: 'translateY(0)' }],
      { duration: target ? 180 : 100, delay: target && !previous ? 50 : 0, easing: 'ease-out', fill: 'both' },
    );
    const active = { height, ink: inkMotion, target };
    running.current = active;
    height.onfinish = () => { if (running.current === active) settle(); };
  }

  return (
    <details ref={sheet} className="lfq-item" onToggle={() => {
      if (!running.current && sheet.current) sheet.current.dataset.expanded = String(sheet.current.open);
    }}>
      <summary onClick={reveal}>
        <PaperArt name={index % 2 === 0 ? 'terracotta' : 'blue'} className="lfq-tab" />
        <span className="lfq-sheet hs-deco" aria-hidden="true">
          <span className="lfq-skin lfq-skin-closed" />
          <span className="lfq-skin lfq-skin-open" />
        </span>
        <span className="lfq-question">{t('landing.faq.q' + id)}</span>
        <span className="lfq-toggle" aria-hidden="true" />
      </summary>
      <div className="lfq-answer-clip" ref={clip}>
        <div className="lfq-answer" ref={body}><p>{t('landing.faq.a' + id)}</p></div>
      </div>
    </details>
  );
}

export function LandingFaq() {
  const { t } = useLanguage();
  return (
    <section className="le-paper-faq" id="faq" aria-labelledby="landing-faq-title" style={{
      ['--lfq-paper-closed' as string]: 'url("' + ASSETS + 'faq-paper-collapsed.png")',
      ['--lfq-paper-open' as string]: 'url("' + ASSETS + 'faq-paper-expanded.png")',
    }}>
      <div className="lfq-side">
        <h2 id="landing-faq-title" data-motion-title>{t('le.faq.title')}</h2>
        <PaperArt name="notebook" className="lfq-notebook" />
      </div>
      <div className="lfq-list">
        {FAQ_IDS.map((id, index) => <PaperFaqItem key={id} id={id} index={index} />)}
      </div>
    </section>
  );
}
