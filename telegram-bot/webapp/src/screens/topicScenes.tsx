import { Greek } from '../components/greek';

/* Per-topic illustration packs for the quiz screen (public/assets/topics/<topic>/).
   One composition for every topic, only the pictures change:
     centre      — the question card, nothing behind it
     left        — a wide vignette on top, a pair of objects at the bottom
     right       — a pair of objects on top, one object lower down
     top corners — light olive branches framing the page
     under card  — a long ornamental band
     one corner  — two tiny accents
   Everything is decorative (.hs-deco, aria-hidden). Topics without a pack keep
   the shared picker backdrop. */

type Scene = {
  vignette: string;
  left: string[]; // one or two pictures
  right: string[];
  side: string;
  accents: [string, string];
  band: string;
};

const SCENES: Record<string, Scene> = {
  history: {
    vignette: 'ruins',
    left: ['helmet', 'shield'],
    right: ['amphora', 'coin'],
    side: 'scroll',
    accents: ['leaf', 'star'],
    band: 'band',
  },
  // Tutor homework. One cluster per pair: the tablet with its inkwell on the
  // left, the sealed scroll on the right, Athena's owl on her books lower right.
  homework: {
    vignette: 'stoa',
    left: ['tablet'],
    right: ['scroll'],
    side: 'owl',
    accents: ['leaf', 'star'],
    band: 'band',
  },
};

export const hasTopicScene = (topic: string) => topic in SCENES;

function Art({ topic, name, className }: { topic: string; name: string; className: string }) {
  return (
    <img
      className={`hs-deco ts ${className}`}
      src={`${import.meta.env.BASE_URL}assets/topics/${topic}/${name}.webp`}
      alt=""
      aria-hidden="true"
      draggable={false}
      decoding="async"
    />
  );
}

export function TopicScene({ topic }: { topic: string }) {
  const s = SCENES[topic];
  if (!s) return null;
  return (
    <div className={`hs-deco topic-scene ts-${topic}`} aria-hidden="true">
      <Greek name="olive-branch" className="ts ts-olive-tl" />
      <Greek name="olive-branch" className="ts ts-olive-tr" />
      <Art topic={topic} name={s.vignette} className="ts-vignette" />
      <div className="ts-pair ts-pair-left">
        {s.left.map((n, i) => (
          <Art key={n} topic={topic} name={n} className={`ts-left-${'ab'[i]}`} />
        ))}
      </div>
      <div className="ts-pair ts-pair-right">
        {s.right.map((n, i) => (
          <Art key={n} topic={topic} name={n} className={`ts-right-${'ab'[i]}`} />
        ))}
      </div>
      <Art topic={topic} name={s.side} className="ts-side" />
      <Art topic={topic} name={s.accents[0]} className="ts-acc-a" />
      <Art topic={topic} name={s.accents[1]} className="ts-acc-b" />
    </div>
  );
}

/** The long ornament that sits under the question card. */
export function TopicBand({ topic }: { topic: string }) {
  const s = SCENES[topic];
  return s ? <Art topic={topic} name={s.band} className="ts-band" /> : null;
}
