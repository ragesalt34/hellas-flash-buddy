import { useId } from 'react';

/* Hand-drawn vector ornaments that sit beside the watercolour PNG set in
   greek/common. All are decorative: aria-hidden and .hs-deco, so the square
   theme hides them. */

type Pt = { x: number; y: number };

function cubic(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

const LEAF = '#9fb08a';
const LEAF_DARK = '#7d9166';
const GOLD = '#d4b15c';
const GOLD_DARK = '#b38d3a';

/** Olive twig with fruit: a curved stem, alternating narrow leaves, olives hanging below. */
export function OliveSprig({ className, flip = false }: { className?: string; flip?: boolean }) {
  const p0 = { x: 6, y: 50 };
  const p1 = { x: 40, y: 44 };
  const p2 = { x: 78, y: 26 };
  const p3 = { x: 134, y: 12 };
  const at = (t: number) => {
    const a = cubic(p0, p1, p2, p3, t);
    const b = cubic(p0, p1, p2, p3, Math.min(1, t + 0.01));
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    return { ...a, ang };
  };
  const leaves = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9].map((t, i) => {
    const { x, y, ang } = at(t);
    const side = i % 2 === 0 ? -1 : 1;
    const len = 13 - t * 4;
    const tilt = ang + side * 0.62;
    const cx = x + Math.cos(tilt) * len * 0.85;
    const cy = y + Math.sin(tilt) * len * 0.85;
    return { cx, cy, rx: len, rot: (tilt * 180) / Math.PI, dark: i % 3 === 0 };
  });
  const olives = [0.32, 0.56, 0.78].map((t, i) => {
    const { x, y } = at(t);
    return { cx: x + 2, cy: y + 10 - t * 2, dark: i === 1 };
  });
  return (
    <svg
      className={`hs-deco olive-sprig${className ? ` ${className}` : ''}`}
      viewBox="0 0 140 64"
      aria-hidden="true"
      focusable="false"
      style={flip ? { transform: 'scaleX(-1)' } : undefined}
    >
      <path
        d={`M${p0.x} ${p0.y} C${p1.x} ${p1.y} ${p2.x} ${p2.y} ${p3.x} ${p3.y}`}
        stroke="#8a7a57"
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
      />
      {leaves.map((l, i) => (
        <ellipse
          key={i}
          cx={l.cx}
          cy={l.cy}
          rx={l.rx}
          ry={3.3}
          fill={l.dark ? LEAF_DARK : LEAF}
          transform={`rotate(${l.rot} ${l.cx} ${l.cy})`}
        />
      ))}
      {olives.map((o, i) => (
        <g key={i}>
          <line x1={o.cx} y1={o.cy - 7} x2={o.cx - 1} y2={o.cy - 4} stroke="#8a7a57" strokeWidth="1.2" />
          <ellipse cx={o.cx} cy={o.cy} rx={4.4} ry={5.4} fill={o.dark ? '#58486a' : '#76853f'} />
          <ellipse cx={o.cx - 1.4} cy={o.cy - 1.8} rx={1.3} ry={1.7} fill="#fff" opacity={0.45} />
        </g>
      ))}
    </svg>
  );
}

/** Open laurel wreath (gap at the top), drawn around whatever it frames. */
export function LaurelWreath({ className, gold = false }: { className?: string; gold?: boolean }) {
  const c = 100;
  const r = 82;
  const fill = gold ? GOLD : LEAF;
  const dark = gold ? GOLD_DARK : LEAF_DARK;
  const leaves: { cx: number; cy: number; rx: number; rot: number; d: boolean }[] = [];
  const berries: Pt[] = [];
  const n = 11;
  for (const side of [-1, 1]) {
    for (let i = 0; i < n; i++) {
      // 100° (just off the bottom) sweeping up to 245° on the left; mirrored right.
      const deg = 100 + (i * 145) / (n - 1);
      const a = (deg * Math.PI) / 180;
      const px = side === -1 ? c + Math.cos(a) * r : c - Math.cos(a) * r;
      const py = c + Math.sin(a) * r;
      const tangent = side === -1 ? a + Math.PI / 2 : Math.PI - (a + Math.PI / 2);
      const size = 13 - (i / (n - 1)) * 5;
      for (const k of [-1, 1]) {
        const tilt = tangent + k * 0.55;
        const cx = px + Math.cos(tilt) * size * 0.8;
        const cy = py + Math.sin(tilt) * size * 0.8;
        leaves.push({ cx, cy, rx: size, rot: (tilt * 180) / Math.PI, d: (i + (k === 1 ? 1 : 0)) % 2 === 0 });
      }
      if (i === 3 || i === 7) berries.push({ x: px, y: py });
    }
  }
  return (
    <svg
      className={`hs-deco laurel-wreath${className ? ` ${className}` : ''}`}
      viewBox="0 0 200 200"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d={`M${c + Math.cos((100 * Math.PI) / 180) * r} ${c + Math.sin((100 * Math.PI) / 180) * r} A${r} ${r} 0 0 1 ${c + Math.cos((245 * Math.PI) / 180) * r} ${c + Math.sin((245 * Math.PI) / 180) * r}`}
        stroke={dark}
        strokeWidth="1.6"
        fill="none"
      />
      <path
        d={`M${c - Math.cos((100 * Math.PI) / 180) * r} ${c + Math.sin((100 * Math.PI) / 180) * r} A${r} ${r} 0 0 0 ${c - Math.cos((245 * Math.PI) / 180) * r} ${c + Math.sin((245 * Math.PI) / 180) * r}`}
        stroke={dark}
        strokeWidth="1.6"
        fill="none"
      />
      {leaves.map((l, i) => (
        <ellipse
          key={i}
          cx={l.cx}
          cy={l.cy}
          rx={l.rx}
          ry={l.rx * 0.36}
          fill={l.d ? dark : fill}
          transform={`rotate(${l.rot} ${l.cx} ${l.cy})`}
        />
      ))}
      {berries.map((b, i) => (
        <circle key={i} cx={b.x} cy={b.y} r={3.4} fill={gold ? '#c0392b' : '#58486a'} opacity={0.85} />
      ))}
    </svg>
  );
}

/** Greek key band at any height; colour from currentColor. */
export function MeanderBand({ className, height = 10 }: { className?: string; height?: number }) {
  const id = useId().replace(/:/g, '');
  const u = height / 10;
  return (
    <svg
      className={`hs-deco meander-band${className ? ` ${className}` : ''}`}
      width="100%"
      height={height}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <pattern id={id} patternUnits="userSpaceOnUse" width={16 * u} height={height}>
          <path
            d={`M0 ${9.4 * u} H${16 * u} M${2 * u} ${9.4 * u} V${2 * u} H${12 * u} V${7 * u} H${6 * u} V${4.6 * u}`}
            stroke="currentColor"
            strokeWidth={1.2 * u}
            fill="none"
            strokeLinecap="square"
          />
        </pattern>
      </defs>
      <rect width="100%" height={height} fill={`url(#${id})`} />
    </svg>
  );
}
