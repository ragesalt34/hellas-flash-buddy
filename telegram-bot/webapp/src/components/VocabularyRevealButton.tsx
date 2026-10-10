import { useEffect, useRef, useState } from 'react';
import { haptic } from '../telegram';
import { playTap } from '../sound';

type Props = {
  label: string;
  onReveal: (moveFocus: boolean) => void;
};

/** Native activation handles pointer, touch, Enter and Space uniformly. */
export function VocabularyRevealButton({ label, onReveal }: Props) {
  const [opening, setOpening] = useState(false);
  const pendingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
  }, []);

  return (
    <button
      type="button"
      className={`spoiler hidden vc-reveal-trigger${opening ? ' is-opening' : ''}`}
      aria-disabled={opening || undefined}
      onClick={(event) => {
        if (pendingRef.current) return;
        pendingRef.current = true;
        const moveFocus = document.activeElement === event.currentTarget;
        haptic();
        playTap();
        const animate = document.documentElement.dataset.theme === 'soft'
          && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!animate) {
          onReveal(moveFocus);
          return;
        }
        setOpening(true);
        // Show the short material response before replacing the cover with text.
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          onReveal(moveFocus);
        }, 160);
      }}
    >
      <span className="vc-reveal-paper hs-deco" aria-hidden="true">
        <span className="vc-reveal-face" />
        <span className="vc-reveal-corner" />
      </span>
      <span className="vc-reveal-label">{label}</span>
    </button>
  );
}
