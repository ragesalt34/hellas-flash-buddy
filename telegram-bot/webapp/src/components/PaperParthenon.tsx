import { useId } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { templeConstruction } from './templeConstruction';

type Topic = { topic: string; label: string; pct: number };
const ART = `${import.meta.env.BASE_URL}assets/progress-editorial-v1/parthenon.webp`;
// Bounds measured against the full 1633 x 963 transparent source, normalized
// to 1000 x 590. All layers reuse the same image, so masonry always aligns.
const SHAFT_TOP = 190;
const BASE_TOP = 511;
const BOUNDARIES = [0, 277, 497, 724, 1000];

export function PaperParthenon({ topics }: { topics: Topic[] }) {
  const id = useId().replace(/:/g, '');
  const reduced = useReducedMotion();
  const { columns, roof } = templeConstruction(topics.map((topic) => topic.pct));
  const transition = { duration: reduced ? 0 : 0.65, ease: [0.16, 1, 0.3, 1] as const };
  return (
    <svg className="pe-temple-art" viewBox="0 0 1000 590" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={`${id}-base`}><rect x="0" y={BASE_TOP} width="1000" height={590 - BASE_TOP} /></clipPath>
        <clipPath id={`${id}-roof`}><rect x="0" y="0" width="1000" height={SHAFT_TOP} /></clipPath>
        {topics.slice(0, 4).map((topic, index) => {
          const height = (BASE_TOP - SHAFT_TOP) * columns[index];
          return (
            <clipPath id={`${id}-column-${index}`} key={topic.topic}>
              <motion.rect x={BOUNDARIES[index]} width={BOUNDARIES[index + 1] - BOUNDARIES[index]}
                initial={reduced ? false : { y: BASE_TOP - Math.max(0, height - 45), height: Math.max(0, height - 45) }} animate={{ y: BASE_TOP - height, height }} transition={{ ...transition, delay: reduced ? 0 : index * 0.055 }} />
            </clipPath>
          );
        })}
      </defs>
      <image href={ART} width="1000" height="590" opacity="0.13" />
      <path className="pe-temple-outline" d="M60 117 L500 8 L940 117 M82 186 H918" />
      <image href={ART} width="1000" height="590" clipPath={`url(#${id}-base)`} />
      {topics.slice(0, 4).map((topic, index) => (
        <image key={topic.topic} href={ART} width="1000" height="590" clipPath={`url(#${id}-column-${index})`} />
      ))}
      <motion.g initial={false} animate={{ opacity: roof ? 1 : 0 }} transition={transition}>
        <image href={ART} width="1000" height="590" clipPath={`url(#${id}-roof)`} />
      </motion.g>
    </svg>
  );
}
