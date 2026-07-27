// Visual theme: two complete looks the user picks between.
//
//   soft — the original. Warm sand ground, white cards, hairline borders,
//          quiet ink shadows, 8/14/22px radii, Rubik + Onest.
//   brut — neo-brutalist. Paper ground, 2px ink borders, hard offset shadows,
//          near-square corners, lime + terracotta accents, Inter.
//
// Everything visual in styles.css is already driven by custom properties, so a
// theme is mostly a block of token overrides under [data-theme='brut'] plus a
// few structural rules for things tokens cannot express (the sidebar shape, the
// hero composition). `soft` stays the default: if the new look is rejected,
// nothing has to be unwound.

export type Theme = 'soft' | 'brut';

const KEY = 'hs_theme';

export function getStoredTheme(): Theme {
  return localStorage.getItem(KEY) === 'brut' ? 'brut' : 'soft';
}

/** Write the attribute the stylesheet keys off. Called before the first render
 * (see main.tsx) so the page never paints in one theme and swaps to the other. */
export function applyTheme(t: Theme): void {
  document.documentElement.dataset.theme = t;
}

export function setStoredTheme(t: Theme): void {
  localStorage.setItem(KEY, t);
  applyTheme(t);
}
