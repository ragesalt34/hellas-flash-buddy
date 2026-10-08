import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import type { ShaderMount } from '@paper-design/shaders';

type Props = {
  children: ReactNode;
  onClick: () => void;
  className: string;
  variant?: 'primary' | 'secondary';
};

/** Paper's liquid-metal material, fitted to the existing hero CTA instead of a fixed pill. */
export function LiquidMetalButton({ children, onClick, className, variant = 'primary' }: Props) {
  const button = useRef<HTMLButtonElement>(null);
  const surface = useRef<HTMLSpanElement>(null);
  const mount = useRef<ShaderMount | null>(null);
  const engaged = useRef({ hovered: false, focused: false });
  const burstTimer = useRef<ReturnType<typeof setTimeout>>();
  const rippleTimers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const nextRipple = useRef(0);
  const [enabled, setEnabled] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number; size: number }[]>([]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setEnabled(!media.matches && button.current?.closest('[data-theme]')?.getAttribute('data-theme') === 'soft');
    const themes = new MutationObserver(sync);
    themes.observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: ['data-theme'] });
    media.addEventListener('change', sync);
    sync();
    return () => {
      themes.disconnect();
      media.removeEventListener('change', sync);
      clearTimeout(burstTimer.current);
      rippleTimers.current.forEach(clearTimeout);
      rippleTimers.current.clear();
    };
  }, []);

  useEffect(() => {
    const host = surface.current;
    if (!enabled || !host) return;
    let cancelled = false;
    let shader: ShaderMount | null = null;
    // Lazy loading keeps the shader library out of the initial app bundle.
    void import('@paper-design/shaders').then(({ ShaderMount, liquidMetalFragmentShader }) => {
      if (cancelled) return;
      try {
        shader = new ShaderMount(host, liquidMetalFragmentShader, {
          u_colorBack: [0.8, 0.9, 1, 1],
          u_colorTint: variant === 'primary' ? [0.65, 0.82, 1, 0.7] : [0.92, 0.9, 0.85, 0.5],
          u_repetition: 2.4, u_softness: 0.65,
          u_shiftRed: 0.03, u_shiftBlue: 0.03,
          u_distortion: 0.08, u_contour: 0, u_angle: 65,
          u_shape: 0, u_isImage: false,
          u_fit: 0, u_scale: 1.4, u_rotation: 0,
          u_offsetX: 0, u_offsetY: 0, u_originX: 0.5, u_originY: 0.5,
          u_worldWidth: 0, u_worldHeight: 0,
        }, { alpha: true, antialias: false },
        engaged.current.hovered || engaged.current.focused ? 0.7 : variant === 'primary' ? 0.16 : 0,
        4000, 1, 120_000);
        mount.current = shader;
        host.dataset.ready = 'true';
      } catch {
        // WebGL can be unavailable; the CSS surface and native action still work.
        host.querySelector('canvas')?.remove();
      }
    }).catch(() => { /* A failed enhancement must never block the CTA. */ });
    return () => {
      cancelled = true;
      delete host.dataset.ready;
      shader?.dispose();
      if (mount.current === shader) mount.current = null;
    };
  }, [enabled, variant]);

  const restSpeed = () => engaged.current.hovered || engaged.current.focused ? 0.7 : variant === 'primary' ? 0.16 : 0;
  const updateSpeed = () => {
    clearTimeout(burstTimer.current);
    mount.current?.setSpeed(restSpeed());
  };
  const playFeedback = (element: HTMLButtonElement, clientX?: number, clientY?: number) => {
    if (enabled) {
      const rect = element.getBoundingClientRect();
      const id = nextRipple.current++;
      // Keyboard activation has no pointer coordinates: start the wave in the middle.
      const x = clientX === undefined ? rect.width / 2 : clientX - rect.left;
      const y = clientY === undefined ? rect.height / 2 : clientY - rect.top;
      setRipples((items) => [...items.slice(-2), { id, x, y, size: Math.hypot(rect.width, rect.height) * 2 }]);
      const timer = setTimeout(() => {
        rippleTimers.current.delete(timer);
        setRipples((items) => items.filter((item) => item.id !== id));
      }, 560);
      rippleTimers.current.add(timer);
      clearTimeout(burstTimer.current);
      mount.current?.setSpeed(1.4);
      burstTimer.current = setTimeout(() => mount.current?.setSpeed(restSpeed()), 280);
    }
  };
  const activate = (event: MouseEvent<HTMLButtonElement>) => {
    if (event.detail === 0) playFeedback(event.currentTarget);
    onClick();
  };

  return (
    <button
      ref={button}
      type="button"
      className={`${className} liquid-metal-button liquid-metal-button--${variant}`}
      data-pressed={pressed || undefined}
      onClick={activate}
      onPointerEnter={(event) => {
        if (event.pointerType !== 'mouse') return;
        engaged.current.hovered = true;
        updateSpeed();
      }}
      onPointerLeave={() => { engaged.current.hovered = false; setPressed(false); updateSpeed(); }}
      onPointerDown={(event) => {
        setPressed(true);
        playFeedback(event.currentTarget, event.clientX, event.clientY);
      }}
      onPointerUp={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onFocus={() => { engaged.current.focused = true; updateSpeed(); }}
      onBlur={() => { engaged.current.focused = false; setPressed(false); updateSpeed(); }}
      onKeyDown={(event) => {
        if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
          setPressed(true);
          playFeedback(event.currentTarget);
        }
      }}
      onKeyUp={() => setPressed(false)}
    >
      <span ref={surface} className="liquid-metal-surface hs-deco" aria-hidden="true" />
      <span className="liquid-metal-light hs-deco" aria-hidden="true" />
      <span className="liquid-metal-label">{children}</span>
      {enabled && ripples.map((ripple) => (
        <span key={ripple.id} className="liquid-metal-ripple hs-deco" aria-hidden="true"
          style={{ left: ripple.x, top: ripple.y, width: ripple.size, height: ripple.size }} />
      ))}
    </button>
  );
}
