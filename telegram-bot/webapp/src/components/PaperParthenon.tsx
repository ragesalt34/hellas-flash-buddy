import { useId, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { templeConstruction } from './templeConstruction';

type Topic = { topic: string; label: string; pct: number };
// Geometry in a 1000 x 590 viewBox (StatsEditorial layers its column buttons on the same numbers).
export const SHAFT_TOP = 190;
export const BASE_TOP = 511;
export const TEMPLE_H = 590;
export const BOUNDARIES = [0, 277, 497, 724, 1000];
/** Centre of each column. */
export const SHAFT_CENTERS = [150, 394, 610, 851];
/** A column counts as built at 85% (templeConstruction); the goal line marks that height. */
const GOAL = 0.85;

// Stone palette: a drawn model, not a photo. Light faces, warm shade, ink-brown lines.
const STONE = '#f1e2c4';
const STONE_SHADE = '#dcc196';
const STONE_DEEP = '#c4a171';
const LINE = '#9c7a4c';
const GHOST_FILL = 'rgba(214, 190, 150, 0.16)';
const GHOST_LINE = 'rgba(156, 122, 76, 0.45)';

const CAPITAL_H = 44; // abacus + echinus, at the top of the shaft area
const BASE_H = 16; // torus under the shaft
const SHAFT_W_BOTTOM = 84;
const SHAFT_W_TOP = 72; // a little entasis
const DRUMS = 7;

/** One Doric column drawn around centre `c`; `ghost` draws it as the unbuilt outline. */
function Column({ c, ghost, gradient }: { c: number; ghost?: boolean; gradient: string }) {
  const shaftTop = SHAFT_TOP + CAPITAL_H;
  const shaftBottom = BASE_TOP - BASE_H;
  const hb = SHAFT_W_BOTTOM / 2;
  const ht = SHAFT_W_TOP / 2;
  const fill = ghost ? GHOST_FILL : `url(#${gradient})`;
  const stroke = ghost ? GHOST_LINE : LINE;
  const dash = ghost ? '7 7' : undefined;
  const drumH = (shaftBottom - shaftTop) / DRUMS;
  const flutes: ReactNode[] = [];
  for (let i = 1; i < 6; i++) {
    const tb = -hb + (SHAFT_W_BOTTOM / 6) * i;
    const tt = -ht + (SHAFT_W_TOP / 6) * i;
    flutes.push(<line key={i} x1={c + tt} y1={shaftTop + 4} x2={c + tb} y2={shaftBottom - 2} stroke={stroke} strokeOpacity={ghost ? 0.5 : 0.38} strokeWidth="1.6" strokeDasharray={dash} />);
  }
  return (
    <g>
      {/* base: plinth + torus */}
      <rect x={c - hb - 10} y={BASE_TOP - 7} width={SHAFT_W_BOTTOM + 20} height="7" fill={ghost ? GHOST_FILL : STONE_SHADE} stroke={stroke} strokeWidth="2" strokeDasharray={dash} />
      <rect x={c - hb - 5} y={BASE_TOP - BASE_H} width={SHAFT_W_BOTTOM + 10} height={BASE_H - 7} rx="4" fill={ghost ? GHOST_FILL : STONE} stroke={stroke} strokeWidth="2" strokeDasharray={dash} />
      {/* shaft, tapering slightly */}
      <path d={`M${c - hb} ${shaftBottom} L${c - ht} ${shaftTop} L${c + ht} ${shaftTop} L${c + hb} ${shaftBottom} Z`} fill={fill} stroke={stroke} strokeWidth="2.2" strokeDasharray={dash} strokeLinejoin="round" />
      {flutes}
      {!ghost && Array.from({ length: DRUMS - 1 }, (_, i) => {
        const y = shaftTop + drumH * (i + 1);
        const t = (y - shaftTop) / (shaftBottom - shaftTop);
        const h = ht + (hb - ht) * t;
        return <line key={`d${i}`} x1={c - h} x2={c + h} y1={y} y2={y} stroke={LINE} strokeOpacity="0.45" strokeWidth="1.4" />;
      })}
      {/* capital: echinus (curved) + abacus (slab) */}
      <path d={`M${c - ht - 2} ${shaftTop} Q${c - ht - 8} ${SHAFT_TOP + 22} ${c - ht - 22} ${SHAFT_TOP + 16} L${c + ht + 22} ${SHAFT_TOP + 16} Q${c + ht + 8} ${SHAFT_TOP + 22} ${c + ht + 2} ${shaftTop} Z`}
        fill={ghost ? GHOST_FILL : STONE_SHADE} stroke={stroke} strokeWidth="2" strokeDasharray={dash} strokeLinejoin="round" />
      <rect x={c - ht - 28} y={SHAFT_TOP} width={SHAFT_W_TOP + 56} height="16" rx="2" fill={ghost ? GHOST_FILL : STONE} stroke={stroke} strokeWidth="2" strokeDasharray={dash} />
    </g>
  );
}

/** Entablature + pediment; drawn solid only when the roof is up, otherwise as the dashed plan. */
function Roof({ ghost }: { ghost?: boolean }) {
  const fill = ghost ? GHOST_FILL : STONE;
  const shade = ghost ? GHOST_FILL : STONE_SHADE;
  const stroke = ghost ? GHOST_LINE : LINE;
  const dash = ghost ? '8 8' : undefined;
  const sw = ghost ? 2 : 2.4;
  const triglyphs: ReactNode[] = [];
  for (let x = 92; x < 900; x += 54) {
    triglyphs.push(<rect key={x} x={x} y="152" width="22" height="30" fill={ghost ? 'none' : STONE_DEEP} stroke={stroke} strokeWidth="1.5" strokeDasharray={dash} opacity={ghost ? 0.7 : 0.9} />);
  }
  return (
    <g>
      {/* pediment: cornice + tympanum */}
      <path d="M58 118 L500 18 L942 118 Z" fill={shade} stroke={stroke} strokeWidth={sw} strokeDasharray={dash} strokeLinejoin="round" />
      <path d="M100 112 L500 34 L900 112 Z" fill={fill} stroke={stroke} strokeWidth="1.6" strokeDasharray={dash} strokeLinejoin="round" opacity="0.95" />
      {!ghost && <circle cx="500" cy="80" r="15" fill="none" stroke={LINE} strokeWidth="2" opacity="0.7" />}
      {/* cornice slab, frieze with triglyphs, architrave */}
      <rect x="52" y="118" width="896" height="20" fill={shade} stroke={stroke} strokeWidth={sw} strokeDasharray={dash} />
      <rect x="74" y="138" width="852" height="48" fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray={dash} />
      {triglyphs}
      <rect x="66" y="182" width="868" height="8" fill={shade} stroke={stroke} strokeWidth="1.6" strokeDasharray={dash} />
    </g>
  );
}

/** The temple: one column per topic, built in stone up to that topic's Greek coverage; the roof is laid
 * when all four columns stand. `active` highlights one column (outline, 85% goal line, current level);
 * the interactive controls live in StatsEditorial, layered over this drawing. */
export function PaperParthenon({ topics, active = -1 }: { topics: Topic[]; active?: number }) {
  const id = useId().replace(/:/g, '');
  const reduced = useReducedMotion();
  const { columns, roof } = templeConstruction(topics.map((topic) => topic.pct));
  const transition = { duration: reduced ? 0 : 0.65, ease: [0.16, 1, 0.3, 1] as const };
  const shaft = BASE_TOP - SHAFT_TOP;
  const shown = topics.slice(0, 4);
  return (
    <svg className="pe-temple-art" viewBox="0 0 1000 590" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-shaft`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={STONE_SHADE} />
          <stop offset="0.32" stopColor={STONE} />
          <stop offset="0.62" stopColor={STONE} />
          <stop offset="1" stopColor={STONE_DEEP} />
        </linearGradient>
        {shown.map((topic, index) => {
          const height = shaft * columns[index];
          return (
            <clipPath id={`${id}-column-${index}`} key={topic.topic}>
              <motion.rect x={BOUNDARIES[index]} width={BOUNDARIES[index + 1] - BOUNDARIES[index]}
                initial={reduced ? false : { y: BASE_TOP - Math.max(0, height - 45), height: Math.max(0, height - 45) }} animate={{ y: BASE_TOP - height, height }} transition={{ ...transition, delay: reduced ? 0 : index * 0.055 }} />
            </clipPath>
          );
        })}
      </defs>

      {/* ground shadow */}
      <ellipse cx="500" cy="584" rx="470" ry="10" fill="rgba(120, 90, 50, 0.16)" />

      {/* the outline of what is still to build */}
      <Roof ghost />
      {shown.map((topic, index) => <Column key={`g-${topic.topic}`} c={SHAFT_CENTERS[index]} ghost gradient={`${id}-shaft`} />)}

      {/* highlight behind the active column */}
      {shown.map((topic, index) => (
        <rect key={`glow-${topic.topic}`} className={`pe-col-glow pe-tone-${topic.topic}${index === active ? ' is-active' : ''}`}
          x={SHAFT_CENTERS[index] - 78} y={SHAFT_TOP - 14} width={156} height={shaft + 28} rx="30" />
      ))}

      {/* stylobate: three steps, always built */}
      <g stroke={LINE} strokeWidth="2.2" strokeLinejoin="round">
        <rect x="70" y={BASE_TOP} width="860" height="26" fill={STONE} />
        <rect x="48" y={BASE_TOP + 26} width="904" height="26" fill={STONE_SHADE} />
        <rect x="26" y={BASE_TOP + 52} width="948" height="27" fill={STONE_DEEP} />
        {[150, 300, 450, 600, 750].map((x) => <line key={x} x1={x + 20} x2={x + 20} y1={BASE_TOP} y2={BASE_TOP + 26} strokeOpacity="0.4" strokeWidth="1.4" />)}
        {[110, 270, 430, 590, 750, 900].map((x) => <line key={x} x1={x} x2={x} y1={BASE_TOP + 26} y2={BASE_TOP + 52} strokeOpacity="0.4" strokeWidth="1.4" />)}
      </g>

      {/* built stone, up to each topic's level */}
      {shown.map((topic, index) => (
        <g key={topic.topic} clipPath={`url(#${id}-column-${index})`}>
          <Column c={SHAFT_CENTERS[index]} gradient={`${id}-shaft`} />
        </g>
      ))}

      <motion.g initial={false} animate={{ opacity: roof ? 1 : 0 }} transition={transition}>
        <Roof />
      </motion.g>

      {/* for the highlighted column: where it counts as built, and how high it is now */}
      {shown.map((topic, index) => {
        if (index !== active) return null;
        const x1 = SHAFT_CENTERS[index] - 64;
        const x2 = SHAFT_CENTERS[index] + 64;
        const goalY = BASE_TOP - shaft * GOAL;
        const levelY = BASE_TOP - shaft * Math.min(columns[index], 1);
        return (
          <g key={`marks-${topic.topic}`} className={`pe-col-marks pe-tone-${topic.topic}`}>
            {columns[index] < 1 && <line className="pe-goal-line" x1={x1} x2={x2} y1={goalY} y2={goalY} />}
            {columns[index] < 1 && <text className="pe-goal-label" x={x2 + 8} y={goalY + 7}>85%</text>}
            <line className="pe-level-line" x1={x1} x2={x2} y1={levelY} y2={levelY} />
          </g>
        );
      })}
    </svg>
  );
}
