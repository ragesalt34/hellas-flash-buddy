import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { haptic } from '../telegram';
import { playTap } from '../sound';

type Props = {
  label: string;
  children: ReactNode;
  onReveal: (moveFocus: boolean) => void;
};

/** Keep the real translation mounted underneath its material cover. */
export function VocabularyRevealButton({ label, children, onReveal }: Props) {
  const [phase, setPhase] = useState<'idle' | 'opening' | 'revealed'>('idle');
  const slotRef = useRef<HTMLDivElement>(null);
  const answerRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef(false);
  const moveFocusRef = useRef(false);
  const durationRef = useRef(620);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const layoutRef = useRef<Animation | null>(null);
  const onRevealRef = useRef(onReveal);
  onRevealRef.current = onReveal;

  const finish = useCallback(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = null;
    layoutRef.current?.cancel();
    layoutRef.current = null;
    if (slotRef.current) slotRef.current.style.removeProperty('height');
    setPhase('revealed');
    onRevealRef.current(moveFocusRef.current);
  }, []);

  useLayoutEffect(() => {
    if (phase !== 'opening') return;
    const slot = slotRef.current;
    const answer = answerRef.current;
    if (!slot || !answer) return;
    // A single bounded layout tween accommodates variable-length notes. The
    // paper itself uses transforms and clipping, with no frame-by-frame React.
    layoutRef.current = slot.animate(
      [{ height: slot.style.height }, { height: `${answer.getBoundingClientRect().height}px` }],
      { duration: durationRef.current * 0.74, delay: durationRef.current * 0.20,
        easing: 'cubic-bezier(.16, 1, .3, 1)', fill: 'forwards' },
    );
    timerRef.current = setTimeout(finish, durationRef.current);
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      layoutRef.current?.cancel();
    };
  }, [phase, finish]);

  useEffect(() => {
    if (phase !== 'opening') return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => { if (motion.matches) finish(); };
    motion.addEventListener('change', handleChange);
    return () => motion.removeEventListener('change', handleChange);
  }, [phase, finish]);

  return (
    <div ref={slotRef} className={`vc-reveal-slot is-${phase}`}>
      <div ref={answerRef} className="vc-reveal-answer" aria-hidden={phase !== 'revealed' || undefined}>
        {children}
      </div>
      {phase !== 'revealed' && (
        <button
          type="button"
          className={`spoiler hidden vc-reveal-trigger${phase === 'opening' ? ' is-opening' : ''}`}
          aria-disabled={phase === 'opening' || undefined}
          onClick={(event) => {
            if (pendingRef.current) return;
            pendingRef.current = true;
            moveFocusRef.current = document.activeElement === event.currentTarget;
            haptic();
            playTap();
            const animate = document.documentElement.dataset.theme === 'soft'
              && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            const slot = slotRef.current;
            const strip = answerRef.current?.querySelector<HTMLElement>('.ru');
            if (!animate || !slot || !strip || typeof slot.animate !== 'function') {
              finish();
              return;
            }
            const button = event.currentTarget.getBoundingClientRect();
            const target = strip.getBoundingClientRect();
            const bounds = slot.getBoundingClientRect();
            durationRef.current = parseFloat(getComputedStyle(slot).getPropertyValue('--vc-peel-duration')) || 620;
            slot.style.height = `${bounds.height}px`;
            slot.style.setProperty('--vc-cover-x', `${button.left - target.left}px`);
            slot.style.setProperty('--vc-cover-sx', `${button.width / target.width}`);
            slot.style.setProperty('--vc-cover-sy', `${button.height / target.height}`);
            slot.style.setProperty('--vc-strip-height', `${target.height}px`);
            setPhase('opening');
          }}
        >
          <span className="vc-reveal-paper hs-deco" aria-hidden="true">
            <span className="vc-reveal-face" />
            <span className="vc-reveal-corner" />
          </span>
          <span className="vc-reveal-label">{label}</span>
        </button>
      )}
      {phase !== 'revealed' && (
        <div className="vc-peel-stage hs-deco" aria-hidden="true">
          <div className="vc-peel-cover" />
          <div className="vc-peel-fold-track"><img className="vc-peel-fold"
            src={`${import.meta.env.BASE_URL}assets/vocab-reveal-v1/paper-fold.webp`}
            alt="" draggable={false} /></div>
        </div>
      )}
    </div>
  );
}
