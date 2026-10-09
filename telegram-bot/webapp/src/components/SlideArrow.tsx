import { ArrowRight } from 'lucide-react';

/** The → arrow with the hover motion used across the app (adapted from the owner's Uiverse pick).
 * Two identical arrows sit in a strip behind a clip window; when the button, link or row that
 * contains it is hovered or keyboard-focused, the strip moves one arrow to the right: the old arrow
 * leaves forward and a fresh one enters from behind (see `.slide-arrow` in styles.css). It is
 * decorative, so it is always aria-hidden; reduced motion turns the movement off. */
export function SlideArrow({
  size = 20,
  strokeWidth = 2,
  className = '',
}: {
  size?: number;
  strokeWidth?: number;
  className?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
}) {
  return (
    <span className={`slide-arrow ${className}`} aria-hidden="true" style={{ ['--sa' as string]: `${size}px` }}>
      <span className="sa-strip">
        <ArrowRight size={size} strokeWidth={strokeWidth} />
        <ArrowRight size={size} strokeWidth={strokeWidth} />
      </span>
    </span>
  );
}
