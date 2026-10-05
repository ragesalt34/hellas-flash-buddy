import type { StudyItem } from './types';

/** Fisher–Yates on a copy; `rng` is injectable so tests are deterministic. */
export function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const norm = (s: string) => s.trim().toLowerCase();

/** The correct answer plus up to 3 distractors from the same pool, same topic first. */
export function buildOptions(item: StudyItem, pool: StudyItem[], rng: () => number = Math.random): string[] {
  const others = pool.filter((p) => p.key !== item.key);
  const candidates = [
    ...shuffle(others.filter((p) => p.topic === item.topic), rng),
    ...shuffle(others.filter((p) => p.topic !== item.topic), rng),
  ];
  const seen = new Set([norm(item.answer)]);
  const distractors: string[] = [];
  for (const c of candidates) {
    if (distractors.length === 3) break;
    const n = norm(c.answer);
    if (seen.has(n)) continue;
    seen.add(n);
    distractors.push(c.answer);
  }
  return shuffle([item.answer, ...distractors], rng);
}
