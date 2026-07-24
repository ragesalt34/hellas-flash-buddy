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
 * Geometry is constructed on a 4px grid so the repeat is exact instead of
 * eyeballed. One tile is 24 wide × 16 tall, stroke 2, line centres on odd
 * coordinates so strokes land on whole pixels:
 *   · rails at y=1 and y=15 frame the band (they span the full tile, so
 *     consecutive tiles join seamlessly);
 *   · the key rises off the bottom rail at x=4, runs right at y=5, drops to
 *     y=11 at x=18 and returns left to x=10 — one full inward turn of the
 *     spiral, with equal 4px gaps to both rails.
 *
 * Tiling is done by the SVG <pattern> itself, so the band stretches to any
 * width. `useId` keeps the pattern id unique when several are on one page.
 */
export function MeanderRule({ height = 16 }: { height?: number }) {
  const id = useId();
  return (
    <svg width="100%" height={height} aria-hidden="true" focusable="false">
      <defs>
        <pattern id={id} patternUnits="userSpaceOnUse" width="24" height="16">
          <g stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="square">
            {/* framing rails */}
            <path d="M0 1 H24 M0 15 H24" />
            {/* the key: up off the rail, right, down, back left */}
            <path d="M4 15 V5 H18 V11 H10" />
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
