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

/** Three short strokes fanning out from a point — a hand-drawn "shine" used as
 * decoration. Always aria-hidden; the caller positions and colours it. */
export function Sparks({ className, size = 44 }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 44 44" fill="none" aria-hidden="true">
      <path d="M8 30 L19 24 M12 15 L21 20 M22 6 L24 16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* ── Greek ornament set ────────────────────────────────────────────────
   Line-drawn decorations for the round theme: an olive sprig, an Ionic
   column, a temple on a hill, an amphora and a classical bust. All are
   single-colour outlines that inherit currentColor, so a caller only picks
   a hue and a size. Always decorative — callers mark them aria-hidden. */

/** Olive sprig — a curved stem with paired almond leaves and two drupes. */
export function OliveSprig({ className, size = 48 }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" fill="none">
        <path d="M6 42 C16 36 26 26 34 10" />
        <path d="M12 34 C8 29 9 23 15 21 C18 26 17 31 12 34Z" />
        <path d="M15 33 C21 32 25 35 25 40 C19 41 15 38 15 33Z" />
        <path d="M20 25 C16 20 17 14 23 12 C26 17 25 22 20 25Z" />
        <path d="M23 24 C29 23 33 26 33 31 C27 32 23 29 23 24Z" />
        <path d="M29 15 C25 10 26 5 32 3 C35 8 34 12 29 15Z" />
        <circle cx="35" cy="20" r="3.1" />
        <circle cx="28" cy="35" r="2.7" />
      </g>
    </svg>
  );
}

/** Ionic column — volute capital, fluted shaft, stepped base. */
export function ColumnSketch({ className, size = 64 }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size * 2.4} viewBox="0 0 40 96" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* abacus + volutes */}
        <path d="M6 8 H34" />
        <path d="M8 8 C4 14 10 18 12 14 C13.4 11.6 11 10 10 12" />
        <path d="M32 8 C36 14 30 18 28 14 C26.6 11.6 29 10 30 12" />
        <path d="M10 18 H30" />
        {/* fluted shaft */}
        <path d="M11 18 V82 M20 18 V82 M29 18 V82" />
        <path d="M15.5 22 V78 M24.5 22 V78" />
        {/* base */}
        <path d="M8 82 H32 M5 88 H35 M3 94 H37" />
      </g>
    </svg>
  );
}

/** Temple on a hill with two cypresses — the Acropolis silhouette, drawn. */
export function TempleScene({ className, size = 120 }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size * 0.72} viewBox="0 0 120 86" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* pediment + entablature */}
        <path d="M34 26 L58 12 L82 26 Z" />
        <path d="M30 30 H86 M32 34 H84" />
        {/* columns */}
        <path d="M38 34 V64 M47 34 V64 M56 34 V64 M65 34 V64 M74 34 V64" />
        {/* stylobate */}
        <path d="M30 64 H86 M26 70 H90" />
        {/* hill */}
        <path d="M4 82 C22 74 30 72 44 74 C64 77 82 70 116 78" />
        {/* cypresses */}
        <path d="M14 74 C12 66 14 58 16 54 C18 58 20 66 18 74 Z M16 74 V80" />
        <path d="M104 76 C102 69 104 62 106 58 C108 62 110 69 108 76 Z M106 76 V82" />
      </g>
    </svg>
  );
}

/** Amphora — the two-handled storage jar, with a meander band on its belly. */
export function AmphoraSketch({ className, size = 54 }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size * 1.45} viewBox="0 0 40 58" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M13 4 H27" />
        <path d="M15 4 V10 C15 14 8 18 8 27 C8 38 13 46 20 46 C27 46 32 38 32 27 C32 18 25 14 25 10 V4" />
        {/* handles */}
        <path d="M15 11 C8 12 5 16 5 21 M25 11 C32 12 35 16 35 21" />
        {/* foot */}
        <path d="M16 46 V52 M24 46 V52 M12 54 H28" />
        {/* meander band */}
        <path d="M10 26 H30 M10 33 H30 M14 33 V29 H22 V31" />
      </g>
    </svg>
  );
}

/** Classical bust on a plinth — profile, hair bun, fillet. */
export function BustSketch({ className, size = 60 }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size * 1.25} viewBox="0 0 48 60" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* profile */}
        <path d="M30 6 C20 6 13 13 13 22 C13 27 15 30 15 33 C15 35 12 35 12 37 C12 39 15 39 15 41 C15 44 17 46 21 46" />
        <path d="M30 6 C37 8 40 14 39 22 C38 29 34 34 30 36" />
        {/* hair bun + fillet */}
        <path d="M36 14 C41 12 44 15 43 19 C42 22 39 23 37 21" />
        <path d="M16 16 C22 12 30 12 36 15" />
        {/* eye + mouth */}
        <path d="M20 24 h4 M19 33 h5" />
        {/* shoulders + plinth */}
        <path d="M21 46 C15 48 11 50 9 54 H39 C38 50 35 47 30 46" />
        <path d="M7 54 H41 M9 58 H39" />
      </g>
    </svg>
  );
}
