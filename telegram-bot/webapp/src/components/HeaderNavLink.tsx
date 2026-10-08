import { motion, useReducedMotion } from 'motion/react';

type Props = {
  icon: string;
  label: string;
  current?: 'page' | 'location';
  surface: 'desktop' | 'menu';
  href?: string;
  onClick: () => void;
};

const paperMotion = {
  rest: { y: 0, rotate: 0, scale: 1 },
  selected: { y: -1, rotate: 0, scale: 1.03 },
  lifted: { y: -3, rotate: -5, scale: 1.1 },
  pressed: { y: 1, rotate: 2, scale: 0.94 },
};

/** Real generated paper artwork; labels and routing stay native and accessible. */
export function HeaderNavLink({ icon, label, current, surface, href, onClick }: Props) {
  const reducedMotion = useReducedMotion();
  const children = <>
    <motion.span className="hs-header-art" aria-hidden="true" variants={paperMotion}
      transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 390, damping: 22 }}>
      <img src={`${import.meta.env.BASE_URL}assets/header-paper-v1/${icon}.webp`}
        width={192} height={192} alt="" draggable={false} decoding="async" />
    </motion.span>
    <span className="hs-header-link-label">{label}</span>
    {current && <motion.span className="hs-header-indicator" aria-hidden="true"
      layoutId={reducedMotion ? undefined : `hs-header-indicator-${surface}`}
      transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 30 }} />}
  </>;
  const shared = {
    className: 'hs-header-link',
    'aria-current': current,
    onClick,
    initial: false as const,
    animate: reducedMotion ? 'rest' : current ? 'selected' : 'rest',
    whileHover: reducedMotion ? undefined : 'lifted',
    whileTap: reducedMotion ? undefined : 'pressed',
  };
  return href
    ? <motion.a {...shared} href={href}>{children}</motion.a>
    : <motion.button {...shared} type="button">{children}</motion.button>;
}
