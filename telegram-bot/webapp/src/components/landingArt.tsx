import type { ReactNode } from 'react';

/* Scenes and small pieces for the landing page. Scenery is .hs-deco (the square
   theme hides it); coins and icons carry meaning and render in both themes.
   Colours live in styles.css under "Landing art". */

const CYPRESS = (x: number, y: number, h: number) =>
  `M${x} ${y} C${x - h * 0.13} ${y - h * 0.35} ${x - h * 0.09} ${y - h * 0.76} ${x} ${y - h} C${x + h * 0.09} ${y - h * 0.76} ${x + h * 0.13} ${y - h * 0.35} ${x} ${y} Z`;

/** Midday sun with slowly turning rays, peeking out behind the demo card. */
export function HeroSun() {
  const rays = Array.from({ length: 14 }, (_, i) => (i * 360) / 14);
  return (
    <svg className="hs-deco lp-sun" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
      <g className="s-rays">
        {rays.map((a) => (
          <line key={a} x1="100" y1="22" x2="100" y2="6" transform={`rotate(${a} 100 100)`} />
        ))}
      </g>
      <circle className="s-sun" cx="100" cy="100" r="58" />
    </svg>
  );
}

/** A panorama along the bottom of the hero: hills, the sea, the temple on its
 * rock and a few cypresses. Layers shift a little with the pointer (see
 * --px/--py set on .lp-hero). */
export function HeroPanorama() {
  return (
    <svg
      className="hs-deco lp-panorama"
      viewBox="0 0 1200 200"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      focusable="false"
    >
      <g className="lp-layer l-far">
        <path className="s-hill-far" d="M0 118 C150 88 300 108 450 90 C620 70 760 102 900 84 C1020 70 1110 88 1200 78 V200 H0 Z" />
      </g>
      <g className="lp-layer l-mid">
        <path className="s-sea" d="M0 136 C200 128 420 140 640 132 C860 124 1040 136 1200 130 V172 H0 Z" />
        <path className="s-wave" d="M120 150 q14 -6 28 0 t28 0 M460 156 q14 -6 28 0 t28 0 M700 148 q14 -6 28 0 t28 0" />
        <path className="s-rock" d="M770 178 C806 128 856 110 935 106 C1014 104 1064 126 1114 178 Z" />
        <g className="s-temple">
          <path d="M858 70 L935 45 L1012 70 Z" />
          <rect x="858" y="70" width="154" height="8" rx="1" />
          {Array.from({ length: 8 }, (_, i) => (
            <rect key={i} x={866 + i * 18.6} y="78" width="7" height="30" rx="1" />
          ))}
          <rect x="852" y="108" width="166" height="6" rx="1" />
        </g>
        <path className="s-rock" d="M30 184 C70 152 130 144 190 150 C236 156 270 168 300 184 Z" />
        {[
          [104, 164, 62],
          [124, 168, 46],
          [790, 166, 50],
          [1086, 168, 58],
          [1104, 172, 40],
        ].map(([x, y, h], i) => (
          <path key={i} className={`s-cypress${i % 2 ? ' dark' : ''}`} d={CYPRESS(x, y, h)} />
        ))}
      </g>
      <g className="lp-layer l-near">
        <path className="s-ground" d="M0 186 C200 172 420 188 640 178 C860 168 1040 182 1200 174 V200 H0 Z" />
      </g>
    </svg>
  );
}

const LEAF = 'M0 0 C4 -5 13 -5 18 0 C13 5 4 5 0 0 Z';

/** A handful of olive leaves drifting down through the hero. */
export function FallingLeaves() {
  return (
    <div className="hs-deco lp-leaves" aria-hidden="true">
      {Array.from({ length: 7 }, (_, i) => (
        <span key={i} className={`lp-leaf k${i + 1}`}>
          <svg viewBox="-2 -7 22 14">
            <path d={LEAF} />
            <path className="vein" d="M1 0 H16" />
          </svg>
        </span>
      ))}
    </div>
  );
}

function Svg({ className, children }: { className: string; children: ReactNode }) {
  return (
    <svg className={`ha ${className}`} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

/** A lyre sounding — pronunciation. */
export function SoundLyre({ className = '' }: { className?: string }) {
  return (
    <Svg className={`ha-lyre ${className}`}>
      <path className="ha-soft" d="M6.5 21 C6.5 26.5 17.5 26.5 17.5 21 Z" />
      <path d="M6.5 21 C6.5 26.5 17.5 26.5 17.5 21 Z" />
      <path d="M8 21 C4.5 17 4.2 11.4 7 8.8 C8.2 7.8 9.6 8.2 9.7 9.6 M16 21 C19.5 17 19.8 11.4 17 8.8 C15.8 7.8 14.4 8.2 14.3 9.6" />
      <path d="M5.6 11.4 H18.4 M10 11.4 V22.6 M12 11.4 V23 M14 11.4 V22.6" />
      <path className="ha-wave w1" d="M22 12.5 C23.6 14.4 23.6 17.6 22 19.5" />
      <path className="ha-wave w2" d="M25 10 C28 13.6 28 18.4 25 22" />
    </Svg>
  );
}

/** Sunset over the sea with the temple in silhouette — the closing call to action. */
export function SunsetScene() {
  return (
    <svg className="hs-deco lp-sunset" viewBox="0 0 1000 170" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      <circle className="u-sun" cx="500" cy="128" r="74" />
      <path className="u-sea" d="M0 132 H1000 V170 H0 Z" />
      <path className="u-glint" d="M440 142 H560 M462 152 H538 M484 161 H516" />
      <path className="u-hill" d="M640 132 C700 96 760 84 830 86 C900 88 950 108 1000 118 V132 Z" />
      <g className="u-temple">
        <path d="M760 70 L806 56 L852 70 Z" />
        <rect x="760" y="70" width="92" height="5" />
        {Array.from({ length: 6 }, (_, i) => (
          <rect key={i} x={764 + i * 16.2} y="75" width="4.5" height="15" />
        ))}
        <rect x="756" y="90" width="100" height="4" />
      </g>
      <path className="u-hill" d="M0 132 C60 112 120 104 190 110 C250 115 300 124 340 132 Z" />
      {[
        [96, 112, 40],
        [118, 110, 30],
        [230, 118, 34],
      ].map(([x, y, h], i) => (
        <path key={i} className="u-cypress" d={CYPRESS(x, y, h)} />
      ))}
      <path className="u-bird" d="M300 46 q6 -6 12 0 q6 -6 12 0 M340 32 q4 -4 8 0 q4 -4 8 0 M660 40 q5 -5 10 0 q5 -5 10 0" />
    </svg>
  );
}
