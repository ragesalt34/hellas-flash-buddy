// Generated from design-handoff/landing-editorial-assets-v1/manifest.json (contentBoundsSampled).
// Each picture keeps its whole canvas; it is placed so that the visible drawing fills a box of
// `aspect` (visible w/h): img width = w%, left = l%, top = t% of that box (PLACEMENT_GUIDE.md).
// `vw`/`vh` = the visible size on a 1440px page, in px, used as the default display size.
export interface LandingArtSpec {
  file: string;
  aspect: number;
  w: number;
  l: number;
  t: number;
  vw: number;
  vh: number;
}

export const LANDING_ART = {
  'hero-collage': { file: 'hero-collage.webp', aspect: 1.3633, w: 103.725, l: -2.292, t: -3.516, vw: 892, vh: 655 },
  'fact-questions': { file: 'fact-questions.webp', aspect: 1.0606, w: 127.959, l: -14.694, t: -19.913, vw: 161, vh: 146 },
  'fact-vocabulary': { file: 'fact-vocabulary.webp', aspect: 1.2917, w: 112.366, l: -7.168, t: -24.074, vw: 174, vh: 131 },
  'fact-topics': { file: 'fact-topics.webp', aspect: 1.0256, w: 130.625, l: -15.417, t: -17.094, vw: 144, vh: 131 },
  'fact-srs': { file: 'fact-srs.webp', aspect: 1.2284, w: 110.000, l: -6.316, t: -18.103, vw: 146, vh: 127 },
  'step-choose': { file: 'step-choose.webp', aspect: 1.9594, w: 106.153, l: -3.368, t: -12.690, vw: 406, vh: 208 },
  'step-repeat': { file: 'step-repeat.webp', aspect: 2.3202, w: 107.385, l: -3.874, t: -16.854, vw: 402, vh: 205 },
  'step-progress': { file: 'step-progress.webp', aspect: 2.0854, w: 106.867, l: -3.855, t: -6.030, vw: 402, vh: 218 },
  'feature-tests': { file: 'feature-tests.webp', aspect: 1.6348, w: 107.732, l: -4.124, t: -39.326, vw: 250, vh: 181 },
  'feature-flashcards': { file: 'feature-flashcards.webp', aspect: 1.5077, w: 106.633, l: -3.401, t: -30.769, vw: 248, vh: 174 },
  'feature-vocabulary': { file: 'feature-vocabulary.webp', aspect: 1.6941, w: 108.854, l: -5.208, t: -42.941, vw: 246, vh: 168 },
  'feature-pronunciation': { file: 'feature-pronunciation.webp', aspect: 1.5348, w: 109.233, l: -6.272, t: -36.898, vw: 248, vh: 161 },
  'feature-plan': { file: 'feature-plan.webp', aspect: 1.3835, w: 110.000, l: -5.614, t: -28.155, vw: 253, vh: 189 },
  'feature-progress': { file: 'feature-progress.webp', aspect: 1.5134, w: 110.777, l: -6.007, t: -41.711, vw: 246, vh: 164 },
  'faq-column-olive': { file: 'faq-column-olive.webp', aspect: 2.6333, w: 104.589, l: -2.532, t: -4.444, vw: 419, vh: 136 },
  'closing-banner': { file: 'closing-banner.webp', aspect: 3.8583, w: 103.265, l: -1.633, t: -28.346, vw: 1355, vh: 350 },
  'surface-facts-ribbon': { file: 'surface-facts-ribbon.webp', aspect: 7.1803, w: 104.909, l: -2.740, t: -127.869, vw: 1356, vh: 179 },
  'surface-plan-wash': { file: 'surface-plan-wash.webp', aspect: 3.7664, w: 105.233, l: -2.713, t: -16.788, vw: 666, vh: 206 },
  'surface-word-card': { file: 'surface-word-card.webp', aspect: 2.1484, w: 108.951, l: -5.627, t: -14.286, vw: 285, vh: 161 },
} as const satisfies Record<string, LandingArtSpec>;

export type LandingArtKey = keyof typeof LANDING_ART;
