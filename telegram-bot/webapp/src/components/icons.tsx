// Brand marks drawn for Hellas Study — custom SVGs instead of stock icon-set
// glyphs, so the logo doesn't look like every other lucide app.

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
