// Visual theme: two complete looks the user picks between.
//
//   soft — Blue Pureplay. White ground, blue actions, cool hairline borders,
//          6/8px radii, Inter for Latin, Cyrillic and Greek.
//   brut — neo-brutalist, editorial. Near-white ground, 2px ink borders,
//          square corners, hard offset shadows in Greek colours (saffron,
//          terracotta, Aegean, olive), Aegean blue for the main action,
//          Source Serif 4 for titles over Inter.
//
// Everything visual in styles.css is already driven by custom properties, so a
// theme is mostly a block of token overrides under [data-theme='brut'] plus a
// few structural rules for things tokens cannot express (the sidebar shape, the
// hero composition). `soft` stays the default and keeps its stored identifier.

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
