// Brand marks drawn for Hellas Study — custom SVGs instead of stock icon-set
// glyphs, so the logo doesn't look like every other lucide app.

import { useId } from 'react';

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

/** Laurel sprig — a curved stem with solid leaves; the victory/knowledge motif. */
export function LaurelSprig({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4.5 21 C10 18.8 15.8 13 19.2 4" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      {/* left-side leaves */}
      <path d="M4.4 15.4 c3.8 -0.7 6.2 0.9 7 4 c-3.8 0.7 -6.2 -0.9 -7 -4Z" fill="currentColor" />
      <path d="M9.2 10.4 c3.6 -0.4 5.8 1.2 6.4 4.2 c-3.6 0.4 -5.8 -1.2 -6.4 -4.2Z" fill="currentColor" />
      <path d="M13.4 5.6 c3.4 -0.2 5.3 1.6 5.7 4.5 c-3.4 0.2 -5.3 -1.6 -5.7 -4.5Z" fill="currentColor" />
      {/* right-side leaves */}
      <path d="M7.6 13.2 c-0.7 -3.8 0.9 -6.2 4 -7 c0.7 3.8 -0.9 6.2 -4 7Z" fill="currentColor" />
      <path d="M12.2 8 c-0.4 -3.6 1.2 -5.8 4.2 -6.4 c0.4 3.6 -1.2 5.8 -4.2 6.4Z" fill="currentColor" />
    </svg>
  );
}
