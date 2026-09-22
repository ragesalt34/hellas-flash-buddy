// Brand marks drawn for Hellas Study — custom SVGs instead of stock icon-set
// glyphs, so the logo doesn't look like every other lucide app.

import { useId } from 'react';
import geographyIconUrl from '../assets/geography.png';

/** Greek temple mark: pediment, architrave, three columns, stylobate.
 * Geometric and chunky to match the neo-brutalist UI. Inherits currentColor. */
export function TempleMark({ size = 20, strokeWidth = 2.2 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {/* pediment */}
      <path d="M12 2.6 21.4 8.4 H2.6 Z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="miter" />
      {/* architrave */}
      <path d="M4 11 H20" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="square" />
      {/* columns */}
      <path d="M6.6 11 V17.6 M12 11 V17.6 M17.4 11 V17.6" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="square" />
      {/* stylobate */}
      <path d="M4 20.4 H20" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="square" />
    </svg>
  );
}

/** Greek key (meander) band — the running ornament from classical friezes.
 *
 * Real cultural ornament rather than another generic divider: the page's only
 * Greek reference used to be the temple icon and the word ΕΛΛΑΣ.
 *
 * Geometry is constructed on a grid so the repeat is exact instead of eyeballed.
 * One tile is 40 wide × 24 tall, stroke 2, line centres on odd coordinates so
 * strokes land on whole pixels:
 *   · rails at y=1 and y=23 frame the band (they span the full tile, so
 *     consecutive tiles join seamlessly);
 *   · the key rises off the bottom rail at x=6, runs right at y=7, drops to
 *     y=17 at x=30 and returns left to x=16 — one full inward turn of the
 *     spiral, with equal 6px gaps to both rails.
 *
 * The tile is deliberately large: an earlier 24×16 version repeated ~46 times
 * across the page and read as a barcode rather than an ornament. Render it in a
 * narrow centred container (see `.lp-rule`) so only a handful of keys show.
 *
 * `height` must stay ≥ 24 — a shorter box clips the pattern and leaves only the
 * top rail with stubs hanging off it, which looks like film-strip perforations.
 *
 * Tiling is done by the SVG <pattern>, so the band stretches to any width.
 * `useId` keeps the pattern id unique when several are on one page.
 */
export function MeanderRule({ height = 24 }: { height?: number }) {
  const id = useId();
  return (
    <svg width="100%" height={height} aria-hidden="true" focusable="false">
      <defs>
        <pattern id={id} patternUnits="userSpaceOnUse" width="40" height="24">
          <g stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="square">
            {/* framing rails */}
            <path d="M0 1 H40 M0 23 H40" />
            {/* the key: up off the rail, right, down, back left */}
            <path d="M6 23 V7 H30 V17 H16" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height={height} fill={`url(#${id})`} />
    </svg>
  );
}

/** Three short strokes fanning out from a point — a hand-drawn "shine" used as
 * decoration. Always aria-hidden; the caller positions and colours it. */
export function Sparks({ className, size = 44 }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 44 44" fill="none" aria-hidden="true">
      <path d="M8 30 L19 24 M12 15 L21 20 M22 6 L24 16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Quiz icon — a question sheet (bulleted list) with a mortarboard at its
 * corner. Drawn on lucide's 24px grid with round caps so it sits with the
 * rest of the icon set; takes the same size / strokeWidth / color props. */
export function QuizIcon({
  size = 24,
  strokeWidth = 2,
  color = 'currentColor',
  className,
}: {
  size?: number | string;
  strokeWidth?: number | string;
  color?: string;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* sheet with a folded corner, open at the bottom-right for the cap */}
      <path d="M10 21H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h7l4 4v4.5" />
      <path d="M12 2v4h4" />
      {/* bulleted list */}
      <path d="M7 9h.01M10 9h2.5M7 13h.01M10 13h1.5M7 17h.01" />
      {/* mortarboard */}
      <path d="M11.5 15.5l5.75-2.9 5.75 2.9-5.75 2.9z" />
      <path d="M14 17v3c0 .8 1.5 1.5 3.25 1.5s3.25-.7 3.25-1.5v-3" />
    </svg>
  );
}

/** Geography icon — the exact artwork supplied for it (globe on a monitor
 * with an open book), used as a mask so it takes the current text colour
 * like the line icons around it. `strokeWidth` is accepted for drop-in
 * compatibility with lucide icons and ignored: the stroke is in the artwork. */
export function GeoIcon({
  size = 24,
  color = 'currentColor',
  className,
}: {
  size?: number | string;
  strokeWidth?: number | string;
  color?: string;
  className?: string;
}) {
  const mask = `url(${geographyIconUrl}) center / contain no-repeat`;
  return (
    <span
      className={className}
      aria-hidden="true"
      style={{
        display: 'inline-block',
        flex: 'none',
        width: size,
        height: size,
        backgroundColor: color,
        WebkitMask: mask,
        mask,
      }}
    />
  );
}
