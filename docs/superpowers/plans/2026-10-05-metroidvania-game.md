# Hellas Quest (metroidvania) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A side-view metroidvania for PC (`telegram-bot/game/`) where answering Greek vocabulary and exam questions from the user's SRS queue unlocks abilities, shields, hearts and the boss fight.

**Architecture:** Standalone Vite + React 18 + Phaser 3 app. Three layers that only talk through a typed event bus: Phaser world (`src/world/`), pure-TS learning core (`src/learning/`), React overlay (`src/ui/`). Shared web-app modules (`api.ts`, `auth.ts`, `speech.ts`, `i18n.tsx`) are imported through the `@shared` alias; the backend is not changed. Tauri 2 packages the build as an `.exe`.

**Tech Stack:** Vite 5, React 18, TypeScript 5 (strict), Phaser 3.90 (Arcade physics), Vitest 2, Tauri 2.

**Spec:** `docs/superpowers/specs/2026-10-05-metroidvania-game-design.md`

## Global Constraints

- All paths below are relative to `telegram-bot/game/` unless they start with `telegram-bot/` or `docs/`.
- No backend changes. Endpoints used: `GET /api/me`, `GET /api/flashcards`, `GET /api/vocab`, `POST /api/flashcards/grade`, `POST /api/vocab/grade`, `POST /api/auth/login`, `POST /api/auth/register` — always through `@shared/api`'s `api` object.
- Grades: 3 = correct, 1 = wrong. Only the first attempt at an item per day is graded; practice-mode answers are never sent.
- New (level 0 / missing level) items per pool per day: at most 5.
- Wrong answer never costs HP; the object cools down 30 000 ms.
- Placeholder art only (rectangles + text). Room size 960 x 540. Dev server port 5174.
- UI strings in RU and EL, chosen by `getStoredLanguage()` (`localStorage['hs_lang']`, default `'el'`).
- Save key `hs_game_save_<accountId>`; grade buffer `hs_game_grades_<accountId>`; daily cache `hs_game_today_<accountId>`; cached `/me` `hs_game_me`; guest flag `hs_game_guest`.
- TypeScript strict with `noUnusedLocals` / `noUnusedParameters` (same as the web app). `npm run build` and `npm test` must pass at the end of every task.
- Commits: one per task, staging only files under `telegram-bot/game/` (plus `.claude/launch.json` where stated). Never stage `mobile/`.

---

### Task 1: Scaffold the game app, storage helper and event bus

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/vite-env.d.ts`, `src/main.tsx`, `src/kv.ts`, `src/bus.ts`, `src/learning/types.ts`
- Test: `src/bus.test.ts`

**Interfaces:**
- Produces: `KV`, `memoryKV()`, `readJSON<T>(store, key)`, `writeJSON(store, key, value)` (`src/kv.ts`); `Bus`, `bus`, `BusEvents`, `HudState`, `ChallengeSource`, `ToastKey` (`src/bus.ts`); `StudyItem`, `Challenge`, `ChallengeKind`, `fromFlashcard`, `fromVocab` (`src/learning/types.ts`).

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "hellas-quest",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "test": "vitest run",
    "tauri": "tauri"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run (in `telegram-bot/game`): `npm install phaser@^3.90.0 react@^18.3.1 react-dom@^18.3.1 && npm install -D @types/react@^18.3.5 @types/react-dom@^18.3.0 @vitejs/plugin-react@^4.3.1 typescript@^5.5.4 vite@^5.4.2 vitest@^2.1.0`
Expected: exit 0, `node_modules/phaser` exists. The web app's own deps must already be installed (`telegram-bot/webapp/node_modules` exists) because shared files are type-checked from there.

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": { "@shared/*": ["../webapp/src/*"] }
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create `vite.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const shared = fileURLToPath(new URL('../webapp/src', import.meta.url));

export default defineConfig({
  plugins: [react()],
  // Reuse the web app's .env (VITE_API_BASE, VITE_APP_SECRET) — one config, two clients.
  envDir: '../webapp',
  // Inline empty PostCSS config so Vite does not pick up the Tailwind config further up the tree.
  css: { postcss: {} },
  resolve: {
    alias: { '@shared': shared },
    // Shared modules live under ../webapp and would otherwise load a second React from its node_modules.
    dedupe: ['react', 'react-dom'],
  },
  // Tauri serves dist/ from its own origin; relative asset URLs keep that working.
  base: './',
  server: { port: 5174, strictPort: true, fs: { allow: ['..'] } },
  test: { include: ['src/**/*.test.ts'] },
});
```

- [ ] **Step 5: Create `index.html`, `src/vite-env.d.ts`, `src/main.tsx`**

`index.html`:
```html
<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Hellas Quest</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/vite-env.d.ts`:
```ts
/// <reference types="vite/client" />
```

`src/main.tsx` (temporary; Task 7 replaces the body):
```tsx
import { createRoot } from 'react-dom/client';

createRoot(document.getElementById('root')!).render(<p>Hellas Quest</p>);
```

- [ ] **Step 6: Create `src/kv.ts`**

```ts
/** Minimal key-value storage: localStorage in the app, an in-memory map in tests. */
export type KV = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function memoryKV(): KV {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: (k) => void m.delete(k),
  };
}

export function readJSON<T>(store: KV, key: string): T | null {
  try {
    const s = store.getItem(key);
    return s ? (JSON.parse(s) as T) : null;
  } catch {
    return null;
  }
}

export function writeJSON(store: KV, key: string, value: unknown): void {
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode — progress on the server is unaffected */
  }
}
```

- [ ] **Step 7: Create `src/learning/types.ts`**

```ts
import type { Flashcard, VocabCard } from '@shared/api';

export type ChallengeKind = 'word' | 'exam';

/** One thing to recall: a vocab word or an exam question, normalised. */
export interface StudyItem {
  key: string; // 'w:<vocabId>' | 'q:<questionId>'
  kind: ChallengeKind;
  id: string | number; // what the grade endpoint expects
  prompt: string;
  answer: string;
  explanation: string | null;
  topic: string | null;
  level: number; // SRS level, 0 = never seen
}

export interface Challenge {
  item: StudyItem;
  options: string[]; // shuffled, always contains item.answer
  graded: boolean; // false = practice, never sent to the server
}

export function fromFlashcard(f: Flashcard): StudyItem {
  return {
    key: `q:${f.question_id}`,
    kind: 'exam',
    id: f.question_id,
    prompt: f.question,
    answer: f.correct_answer,
    explanation: f.explanation,
    topic: f.topic,
    level: f.level ?? 0,
  };
}

export function fromVocab(v: VocabCard): StudyItem {
  return {
    key: `w:${v.id}`,
    kind: 'word',
    id: v.id,
    prompt: v.word,
    answer: v.ru,
    explanation: v.note,
    topic: v.topic,
    level: v.level ?? 0,
  };
}
```

- [ ] **Step 8: Write the failing bus test `src/bus.test.ts`**

```ts
import { describe, expect, it, vi } from 'vitest';
import { Bus } from './bus';

describe('Bus', () => {
  it('delivers payloads to subscribers', () => {
    const b = new Bus();
    const fn = vi.fn();
    b.on('challenge:result', fn);
    b.emit('challenge:result', { requestId: 'r1', correct: true });
    expect(fn).toHaveBeenCalledWith({ requestId: 'r1', correct: true });
  });

  it('stops delivering after unsubscribe', () => {
    const b = new Bus();
    const fn = vi.fn();
    const off = b.on('game:pause', fn);
    off();
    b.emit('game:pause', { paused: true });
    expect(fn).not.toHaveBeenCalled();
  });

  it('ignores events nobody listens to', () => {
    expect(() => new Bus().emit('game:pause', { paused: false })).not.toThrow();
  });
});
```

- [ ] **Step 9: Run it to verify it fails**

Run: `npx vitest run src/bus.test.ts`
Expected: FAIL — cannot resolve `./bus`.

- [ ] **Step 10: Implement `src/bus.ts`**

```ts
import type { ChallengeKind } from './learning/types';

export type ChallengeSource = 'altar' | 'shield' | 'amphora' | 'boss';
export type ToastKey =
  | 'abilityDash'
  | 'abilityDoubleJump'
  | 'altarProgress'
  | 'heartUp'
  | 'wallBroken'
  | 'shieldDown'
  | 'died';

export interface HudState {
  hp: number;
  maxHp: number;
  dash: boolean;
  doubleJump: boolean;
  room: string;
}

export interface BusEvents {
  'challenge:request': {
    requestId: string;
    source: ChallengeSource;
    kind: ChallengeKind | 'any';
    preferTopics?: string[];
  };
  'challenge:result': { requestId: string; correct: boolean };
  'hud:update': HudState;
  'game:pause': { paused: boolean };
  toast: { key: ToastKey; value?: string };
  'boss:defeated': { room: string };
}

type Handler<T> = (payload: T) => void;

/** Tiny typed pub/sub — the only channel between the Phaser world and the React overlay. */
export class Bus {
  private handlers = new Map<keyof BusEvents, Set<Handler<never>>>();

  on<K extends keyof BusEvents>(event: K, fn: Handler<BusEvents[K]>): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    const handlers = set as Set<Handler<BusEvents[K]>>;
    handlers.add(fn);
    return () => {
      handlers.delete(fn);
    };
  }

  emit<K extends keyof BusEvents>(event: K, payload: BusEvents[K]): void {
    const set = this.handlers.get(event) as Set<Handler<BusEvents[K]>> | undefined;
    if (!set) return;
    for (const fn of [...set]) fn(payload);
  }
}

export const bus = new Bus();
```

- [ ] **Step 11: Run tests and build**

Run: `npm test && npm run build`
Expected: 3 tests PASS; build exit 0.

- [ ] **Step 12: Commit**

```bash
git add telegram-bot/game/package.json telegram-bot/game/package-lock.json telegram-bot/game/tsconfig.json telegram-bot/game/vite.config.ts telegram-bot/game/index.html telegram-bot/game/src
git commit -m "game: scaffold Vite + Phaser app with typed event bus"
```

---

### Task 2: Multiple-choice options

**Files:**
- Create: `src/learning/options.ts`
- Test: `src/learning/options.test.ts`

**Interfaces:**
- Consumes: `StudyItem` (Task 1).
- Produces: `shuffle<T>(arr: T[], rng: () => number): T[]`, `buildOptions(item: StudyItem, pool: StudyItem[], rng?: () => number): string[]`.

- [ ] **Step 1: Write the failing test `src/learning/options.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { buildOptions } from './options';
import type { StudyItem } from './types';

const item = (key: string, answer: string, topic = 'home'): StudyItem => ({
  key,
  kind: 'word',
  id: key,
  prompt: `p-${key}`,
  answer,
  explanation: null,
  topic,
  level: 0,
});
const first = () => 0;

describe('buildOptions', () => {
  it('returns the answer plus three unique distractors', () => {
    const target = item('a', 'дом');
    const pool = [target, item('b', 'кот'), item('c', 'мама'), item('d', 'вода'), item('e', 'хлеб')];
    const opts = buildOptions(target, pool, first);
    expect(opts).toHaveLength(4);
    expect(opts).toContain('дом');
    expect(new Set(opts).size).toBe(4);
  });

  it('takes distractors from the same topic first', () => {
    const target = item('a', 'дом', 'home');
    const pool = [
      target,
      item('b', 'окно', 'home'),
      item('c', 'дверь', 'home'),
      item('d', 'стол', 'home'),
      item('e', 'море', 'nature'),
      item('f', 'гора', 'nature'),
    ];
    const opts = buildOptions(target, pool, first);
    expect(opts.sort()).toEqual(['дверь', 'дом', 'окно', 'стол'].sort());
  });

  it('skips answers that only differ by case or spaces', () => {
    const target = item('a', 'дом');
    const pool = [target, item('b', ' Дом '), item('c', 'кот')];
    expect(buildOptions(target, pool, first).sort()).toEqual(['дом', 'кот'].sort());
  });

  it('returns fewer options when the pool is small', () => {
    const target = item('a', 'дом');
    expect(buildOptions(target, [target, item('b', 'кот')], first)).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/learning/options.test.ts`
Expected: FAIL — cannot resolve `./options`.

- [ ] **Step 3: Implement `src/learning/options.ts`**

```ts
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
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/learning/options.test.ts`
Expected: 4 PASS.

- [ ] **Step 5: Commit**

```bash
git add telegram-bot/game/src/learning/options.ts telegram-bot/game/src/learning/options.test.ts
git commit -m "game: build multiple-choice options from the card pool"
```

---

### Task 3: Daily queue

**Files:**
- Create: `src/learning/queue.ts`
- Test: `src/learning/queue.test.ts`

**Interfaces:**
- Consumes: `buildOptions` (Task 2), `StudyItem`, `Challenge`, `ChallengeKind` (Task 1).
- Produces: `NEW_CAP = 5`, `selectToday(items: StudyItem[]): StudyItem[]`, `class DailyQueue { constructor(words: StudyItem[], exams: StudyItem[], rng?: () => number); readonly total: number; done: number; get remaining(): number; next(kind: ChallengeKind | 'any', preferTopics?: string[]): Challenge | null; answer(challenge: Challenge, correct: boolean): void }`.

- [ ] **Step 1: Write the failing test `src/learning/queue.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { DailyQueue, NEW_CAP, selectToday } from './queue';
import type { ChallengeKind, StudyItem } from './types';

const mk = (kind: ChallengeKind, n: number, level = 1, topic: string | null = 'history'): StudyItem => ({
  key: `${kind}:${n}`,
  kind,
  id: kind === 'word' ? n : `q${n}`,
  prompt: `prompt ${kind} ${n}`,
  answer: `answer ${kind} ${n}`,
  explanation: null,
  topic,
  level,
});
const range = (kind: ChallengeKind, count: number, level = 1) =>
  Array.from({ length: count }, (_, i) => mk(kind, i + 1, level));
const first = () => 0;

describe('selectToday', () => {
  it('keeps every review and caps new items', () => {
    const items = [...range('word', 2, 3), ...range('word', 9, 0).map((i) => ({ ...i, key: `new:${i.key}` }))];
    const picked = selectToday(items);
    expect(picked.filter((i) => i.level >= 1)).toHaveLength(2);
    expect(picked.filter((i) => i.level === 0)).toHaveLength(NEW_CAP);
  });
});

describe('DailyQueue', () => {
  it('hands out a graded challenge whose options contain the answer', () => {
    const q = new DailyQueue(range('word', 4), [], first);
    const c = q.next('word')!;
    expect(c.graded).toBe(true);
    expect(c.options).toContain(c.item.answer);
    expect(q.total).toBe(4);
  });

  it('counts a correct answer as done', () => {
    const q = new DailyQueue(range('word', 2), [], first);
    q.answer(q.next('word')!, true);
    expect(q.done).toBe(1);
    expect(q.remaining).toBe(1);
  });

  it('sends a wrong answer to the back and does not grade it twice', () => {
    const q = new DailyQueue(range('word', 2), [], first);
    const c = q.next('word')!;
    q.answer(c, false);
    expect(q.next('word')!.item.key).not.toBe(c.item.key);
    q.answer(q.next('word')!, true);
    const retry = q.next('word')!;
    expect(retry.item.key).toBe(c.item.key);
    expect(retry.graded).toBe(false);
    q.answer(retry, true);
    expect(q.done).toBe(2);
    expect(q.remaining).toBe(0);
  });

  it('switches to ungraded practice when the queue is empty', () => {
    const q = new DailyQueue(range('word', 1), [], first);
    q.answer(q.next('word')!, true);
    const p = q.next('word')!;
    expect(p.graded).toBe(false);
    q.answer(p, true);
    expect(q.done).toBe(1);
  });

  it('prefers the requested topics', () => {
    const exams = [mk('exam', 1, 1, 'geography'), mk('exam', 2, 1, 'laws')];
    const q = new DailyQueue([], exams, first);
    expect(q.next('exam', ['laws'])!.item.topic).toBe('laws');
  });

  it('for "any" picks the kind with more items due', () => {
    const q = new DailyQueue(range('word', 1), range('exam', 3), first);
    expect(q.next('any')!.item.kind).toBe('exam');
  });

  it('falls back to the other kind when the requested pool is empty', () => {
    const q = new DailyQueue([], range('exam', 1), first);
    expect(q.next('word')!.item.kind).toBe('exam');
  });

  it('returns null when there are no cards at all', () => {
    expect(new DailyQueue([], [], first).next('any')).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/learning/queue.test.ts`
Expected: FAIL — cannot resolve `./queue`.

- [ ] **Step 3: Implement `src/learning/queue.ts`**

```ts
import { buildOptions } from './options';
import type { Challenge, ChallengeKind, StudyItem } from './types';

export const NEW_CAP = 5;

/** Today's items from one pool: every due review plus at most NEW_CAP unseen. */
export function selectToday(items: StudyItem[]): StudyItem[] {
  const reviews = items.filter((i) => i.level >= 1);
  const fresh = items.filter((i) => i.level < 1).slice(0, NEW_CAP);
  return [...reviews, ...fresh];
}

export class DailyQueue {
  private readonly pool: Record<ChallengeKind, StudyItem[]>;
  private readonly pending: Record<ChallengeKind, StudyItem[]>;
  private readonly finished: Record<ChallengeKind, StudyItem[]> = { word: [], exam: [] };
  private readonly graded = new Set<string>();
  readonly total: number;
  done = 0;

  constructor(words: StudyItem[], exams: StudyItem[], private readonly rng: () => number = Math.random) {
    this.pool = { word: words, exam: exams };
    this.pending = { word: selectToday(words), exam: selectToday(exams) };
    this.total = this.pending.word.length + this.pending.exam.length;
  }

  get remaining(): number {
    return this.pending.word.length + this.pending.exam.length;
  }

  next(kind: ChallengeKind | 'any', preferTopics: string[] = []): Challenge | null {
    const k = this.resolveKind(kind);
    if (!k) return null;
    const pending = this.pending[k];
    if (pending.length > 0) {
      const item = pending.find((i) => i.topic !== null && preferTopics.includes(i.topic)) ?? pending[0];
      return { item, options: buildOptions(item, this.pool[k], this.rng), graded: !this.graded.has(item.key) };
    }
    // Nothing due: practise what was already answered today, never graded.
    const practice = this.finished[k].length > 0 ? this.finished[k] : this.pool[k];
    const item = practice[Math.floor(this.rng() * practice.length)];
    return { item, options: buildOptions(item, this.pool[k], this.rng), graded: false };
  }

  answer(challenge: Challenge, correct: boolean): void {
    const { item } = challenge;
    const pending = this.pending[item.kind];
    const idx = pending.findIndex((i) => i.key === item.key);
    if (idx === -1) return; // practice item — nothing to track
    this.graded.add(item.key);
    pending.splice(idx, 1);
    if (correct) {
      this.finished[item.kind].push(item);
      this.done++;
    } else {
      pending.push(item); // comes back at the end of the queue
    }
  }

  private resolveKind(kind: ChallengeKind | 'any'): ChallengeKind | null {
    let order: ChallengeKind[];
    if (kind === 'any') order = this.pending.exam.length > this.pending.word.length ? ['exam', 'word'] : ['word', 'exam'];
    else order = kind === 'word' ? ['word', 'exam'] : ['exam', 'word'];
    return order.find((k) => this.pool[k].length > 0) ?? null;
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/learning/queue.test.ts`
Expected: 9 PASS.

- [ ] **Step 5: Commit**

```bash
git add telegram-bot/game/src/learning/queue.ts telegram-bot/game/src/learning/queue.test.ts
git commit -m "game: daily SRS queue with requeue and practice mode"
```

---

### Task 4: Grader with offline buffer

**Files:**
- Create: `src/learning/grader.ts`
- Test: `src/learning/grader.test.ts`

**Interfaces:**
- Consumes: `KV`, `readJSON`, `writeJSON`, `memoryKV` (Task 1), `ChallengeKind`.
- Produces: `interface Grade { kind: ChallengeKind; id: string | number; grade: 1 | 3 }`, `interface GradeSender { exam(id: string, grade: number): Promise<unknown>; word(id: number, grade: number): Promise<unknown> }`, `class Grader { constructor(sender: GradeSender, store: KV, accountId: string); submit(g: Grade): Promise<void>; flush(): Promise<number>; pending(): Grade[] }`.

- [ ] **Step 1: Write the failing test `src/learning/grader.test.ts`**

```ts
import { describe, expect, it, vi } from 'vitest';
import { memoryKV } from '../kv';
import { Grader } from './grader';

const ok = () => vi.fn(async () => ({ ok: true }));
const fail = () => vi.fn(async () => { throw new Error('offline'); });

describe('Grader', () => {
  it('sends exam and word grades to their endpoints', async () => {
    const sender = { exam: ok(), word: ok() };
    const g = new Grader(sender, memoryKV(), 'acc');
    await g.submit({ kind: 'exam', id: 'q1', grade: 3 });
    await g.submit({ kind: 'word', id: 7, grade: 1 });
    expect(sender.exam).toHaveBeenCalledWith('q1', 3);
    expect(sender.word).toHaveBeenCalledWith(7, 1);
    expect(g.pending()).toEqual([]);
  });

  it('buffers grades that fail to send', async () => {
    const g = new Grader({ exam: fail(), word: fail() }, memoryKV(), 'acc');
    await g.submit({ kind: 'word', id: 7, grade: 3 });
    expect(g.pending()).toEqual([{ kind: 'word', id: 7, grade: 3 }]);
  });

  it('flush sends buffered grades and keeps only the failures', async () => {
    const store = memoryKV();
    await new Grader({ exam: fail(), word: fail() }, store, 'acc').submit({ kind: 'word', id: 1, grade: 3 });
    await new Grader({ exam: fail(), word: fail() }, store, 'acc').submit({ kind: 'exam', id: 'q2', grade: 1 });
    const sender = { exam: fail(), word: ok() };
    const g = new Grader(sender, store, 'acc');
    expect(await g.flush()).toBe(1);
    expect(g.pending()).toEqual([{ kind: 'exam', id: 'q2', grade: 1 }]);
  });

  it('keeps buffers separate per account', async () => {
    const store = memoryKV();
    await new Grader({ exam: fail(), word: fail() }, store, 'a').submit({ kind: 'word', id: 1, grade: 3 });
    expect(new Grader({ exam: ok(), word: ok() }, store, 'b').pending()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/learning/grader.test.ts`
Expected: FAIL — cannot resolve `./grader`.

- [ ] **Step 3: Implement `src/learning/grader.ts`**

```ts
import { readJSON, writeJSON, type KV } from '../kv';
import type { ChallengeKind } from './types';

export interface Grade {
  kind: ChallengeKind;
  id: string | number;
  grade: 1 | 3;
}

export interface GradeSender {
  exam(id: string, grade: number): Promise<unknown>;
  word(id: number, grade: number): Promise<unknown>;
}

/** Sends SRS grades; anything that fails is kept in storage and retried by flush(). */
export class Grader {
  private readonly key: string;

  constructor(private readonly sender: GradeSender, private readonly store: KV, accountId: string) {
    this.key = `hs_game_grades_${accountId}`;
  }

  async submit(g: Grade): Promise<void> {
    try {
      await this.send(g);
    } catch {
      this.save([...this.pending(), g]);
    }
  }

  /** Retry buffered grades in order; returns how many went through. */
  async flush(): Promise<number> {
    const list = this.pending();
    if (list.length === 0) return 0;
    const left: Grade[] = [];
    let sent = 0;
    for (const g of list) {
      try {
        await this.send(g);
        sent++;
      } catch {
        left.push(g);
      }
    }
    this.save(left);
    return sent;
  }

  pending(): Grade[] {
    return readJSON<Grade[]>(this.store, this.key) ?? [];
  }

  private save(list: Grade[]): void {
    if (list.length > 0) writeJSON(this.store, this.key, list);
    else this.store.removeItem(this.key);
  }

  private send(g: Grade): Promise<unknown> {
    return g.kind === 'exam' ? this.sender.exam(String(g.id), g.grade) : this.sender.word(Number(g.id), g.grade);
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/learning/grader.test.ts`
Expected: 4 PASS.

- [ ] **Step 5: Commit**

```bash
git add telegram-bot/game/src/learning/grader.ts telegram-bot/game/src/learning/grader.test.ts
git commit -m "game: grade sender with offline buffer"
```

---

### Task 5: Loader with retries and offline cache

**Files:**
- Create: `src/learning/loader.ts`
- Test: `src/learning/loader.test.ts`

**Interfaces:**
- Consumes: `fromFlashcard`, `fromVocab`, `StudyItem` (Task 1), `KV`, `readJSON`, `writeJSON`.
- Produces: `interface RetryOptions { attempts?: number; delayMs?: number; sleep?: (ms: number) => Promise<void>; onRetry?: (attempt: number) => void }`, `withRetry<T>(fn: () => Promise<T>, opts?: RetryOptions): Promise<T>`, `interface Fetchers { flashcards(): Promise<{ cards: Flashcard[] }>; vocab(): Promise<{ cards: VocabCard[] }> }`, `interface Today { words: StudyItem[]; exams: StudyItem[]; offline: boolean }`, `loadToday(f: Fetchers, store: KV, accountId: string, opts?: RetryOptions): Promise<Today>`.

- [ ] **Step 1: Write the failing test `src/learning/loader.test.ts`**

```ts
import { describe, expect, it, vi } from 'vitest';
import type { Flashcard, VocabCard } from '@shared/api';
import { memoryKV } from '../kv';
import { loadToday, withRetry } from './loader';

const card: Flashcard = { question_id: 'q1', question: 'Ποια;', correct_answer: 'Αθήνα', explanation: null, topic: 'geography', level: 2 };
const word: VocabCard = { id: 5, word: 'σπίτι', ru: 'дом', note: null, topic: 'home', level: 0 };
const noSleep = async () => {};
const good = () => ({
  flashcards: vi.fn(async () => ({ cards: [card] })),
  vocab: vi.fn(async () => ({ cards: [word] })),
});
const down = () => ({
  flashcards: vi.fn(async (): Promise<{ cards: Flashcard[] }> => { throw new Error('down'); }),
  vocab: vi.fn(async (): Promise<{ cards: VocabCard[] }> => { throw new Error('down'); }),
});

describe('withRetry', () => {
  it('retries until success and reports each retry', async () => {
    let calls = 0;
    const onRetry = vi.fn();
    const v = await withRetry(async () => { if (++calls < 3) throw new Error('x'); return 'ok'; }, { sleep: noSleep, onRetry });
    expect(v).toBe('ok');
    expect(onRetry).toHaveBeenCalledTimes(2);
  });

  it('throws after the last attempt', async () => {
    await expect(withRetry(async () => { throw new Error('x'); }, { attempts: 2, sleep: noSleep })).rejects.toThrow('x');
  });
});

describe('loadToday', () => {
  it('maps cards to study items and caches them', async () => {
    const store = memoryKV();
    const t = await loadToday(good(), store, 'acc', { sleep: noSleep });
    expect(t.offline).toBe(false);
    expect(t.exams[0]).toMatchObject({ key: 'q:q1', kind: 'exam', answer: 'Αθήνα', level: 2 });
    expect(t.words[0]).toMatchObject({ key: 'w:5', kind: 'word', prompt: 'σπίτι', answer: 'дом' });
    expect(store.getItem('hs_game_today_acc')).not.toBeNull();
  });

  it('falls back to the cache when the API stays down', async () => {
    const store = memoryKV();
    await loadToday(good(), store, 'acc', { sleep: noSleep });
    const t = await loadToday(down(), store, 'acc', { attempts: 2, sleep: noSleep });
    expect(t.offline).toBe(true);
    expect(t.words).toHaveLength(1);
  });

  it('throws no_data when the API is down and nothing is cached', async () => {
    await expect(loadToday(down(), memoryKV(), 'acc', { attempts: 1, sleep: noSleep })).rejects.toThrow('no_data');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/learning/loader.test.ts`
Expected: FAIL — cannot resolve `./loader`.

- [ ] **Step 3: Implement `src/learning/loader.ts`**

```ts
import type { Flashcard, VocabCard } from '@shared/api';
import { readJSON, writeJSON, type KV } from '../kv';
import { fromFlashcard, fromVocab, type StudyItem } from './types';

export interface RetryOptions {
  attempts?: number;
  delayMs?: number;
  sleep?: (ms: number) => Promise<void>;
  onRetry?: (attempt: number) => void;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Defaults cover a sleeping Render instance: 18 tries x 5 s = 90 s. */
export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const { attempts = 18, delayMs = 5000, sleep = defaultSleep, onRetry } = opts;
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i >= attempts) throw e;
      onRetry?.(i);
      await sleep(delayMs);
    }
  }
}

export interface Fetchers {
  flashcards(): Promise<{ cards: Flashcard[] }>;
  vocab(): Promise<{ cards: VocabCard[] }>;
}

export interface Today {
  words: StudyItem[];
  exams: StudyItem[];
  offline: boolean;
}

export async function loadToday(f: Fetchers, store: KV, accountId: string, opts: RetryOptions = {}): Promise<Today> {
  const key = `hs_game_today_${accountId}`;
  try {
    const [fc, vc] = await withRetry(() => Promise.all([f.flashcards(), f.vocab()]), opts);
    const today = { words: vc.cards.map(fromVocab), exams: fc.cards.map(fromFlashcard) };
    writeJSON(store, key, today);
    return { ...today, offline: false };
  } catch {
    const cached = readJSON<Omit<Today, 'offline'>>(store, key);
    if (cached) return { ...cached, offline: true };
    throw new Error('no_data');
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/learning/loader.test.ts`
Expected: 5 PASS.

- [ ] **Step 5: Commit**

```bash
git add telegram-bot/game/src/learning/loader.ts telegram-bot/game/src/learning/loader.test.ts
git commit -m "game: load today's cards with retries and offline cache"
```

---

### Task 6: Challenge controller

**Files:**
- Create: `src/learning/controller.ts`
- Test: `src/learning/controller.test.ts`

**Interfaces:**
- Consumes: `Bus`, `ChallengeSource` (Task 1), `DailyQueue` (Task 3), `Grade` (Task 4), `Challenge`.
- Produces: `interface ActiveChallenge { requestId: string; source: ChallengeSource; challenge: Challenge; picked: string | null; correct: boolean }`, `class ChallengeController { constructor(queue: DailyQueue, grader: Pick<Grader, 'submit'>, bus: Bus); start(): () => void; current(): ActiveChallenge | null; version(): number; subscribe(fn: () => void): () => void; progress(): { done: number; total: number }; answer(choice: string): boolean; close(): void }`.

- [ ] **Step 1: Write the failing test `src/learning/controller.test.ts`**

```ts
import { describe, expect, it, vi } from 'vitest';
import { Bus } from '../bus';
import { ChallengeController } from './controller';
import { DailyQueue } from './queue';
import type { StudyItem } from './types';

const word = (n: number): StudyItem => ({
  key: `w:${n}`, kind: 'word', id: n, prompt: `λέξη${n}`, answer: `слово${n}`, explanation: null, topic: 't', level: 1,
});

function setup(words: StudyItem[]) {
  const bus = new Bus();
  const submit = vi.fn(async () => {});
  const c = new ChallengeController(new DailyQueue(words, [], () => 0), { submit }, bus);
  c.start();
  const results: { requestId: string; correct: boolean }[] = [];
  bus.on('challenge:result', (r) => results.push(r));
  const request = (requestId: string) => bus.emit('challenge:request', { requestId, source: 'altar', kind: 'word' });
  return { c, submit, results, request };
}

describe('ChallengeController', () => {
  it('opens a challenge, grades a correct answer and reports it on close', () => {
    const { c, submit, results, request } = setup([word(1), word(2)]);
    request('r1');
    const a = c.current()!;
    expect(c.answer(a.challenge.item.answer)).toBe(true);
    expect(submit).toHaveBeenCalledWith({ kind: 'word', id: a.challenge.item.id, grade: 3 });
    expect(results).toEqual([]);
    c.close();
    expect(results).toEqual([{ requestId: 'r1', correct: true }]);
    expect(c.current()).toBeNull();
    expect(c.progress()).toEqual({ done: 1, total: 2 });
  });

  it('grades a wrong answer with 1 and reports failure', () => {
    const { c, submit, results, request } = setup([word(1), word(2)]);
    request('r1');
    expect(c.answer('nope')).toBe(false);
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ grade: 1 }));
    c.close();
    expect(results).toEqual([{ requestId: 'r1', correct: false }]);
  });

  it('ignores a second answer to the same challenge', () => {
    const { c, submit, request } = setup([word(1), word(2)]);
    request('r1');
    c.answer('nope');
    c.answer(c.current()!.challenge.item.answer);
    expect(submit).toHaveBeenCalledTimes(1);
    expect(c.current()!.correct).toBe(false);
  });

  it('does not grade practice answers', () => {
    const { c, submit, request } = setup([word(1)]);
    request('r1');
    c.answer(c.current()!.challenge.item.answer);
    c.close();
    request('r2');
    expect(c.current()!.challenge.graded).toBe(false);
    c.answer(c.current()!.challenge.item.answer);
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it('lets the game through when there are no cards at all', () => {
    const { c, results, request } = setup([]);
    request('r1');
    expect(c.current()).toBeNull();
    expect(results).toEqual([{ requestId: 'r1', correct: true }]);
  });

  it('rejects a second request while a dialog is open', () => {
    const { results, request } = setup([word(1), word(2)]);
    request('r1');
    request('r2');
    expect(results).toEqual([{ requestId: 'r2', correct: false }]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/learning/controller.test.ts`
Expected: FAIL — cannot resolve `./controller`.

- [ ] **Step 3: Implement `src/learning/controller.ts`**

```ts
import type { Bus, BusEvents, ChallengeSource } from '../bus';
import type { Grader } from './grader';
import type { DailyQueue } from './queue';
import type { Challenge } from './types';

export interface ActiveChallenge {
  requestId: string;
  source: ChallengeSource;
  challenge: Challenge;
  picked: string | null;
  correct: boolean;
}

/** Turns world requests into dialogs: queue -> UI -> grade -> result back to the world. */
export class ChallengeController {
  private active: ActiveChallenge | null = null;
  private ver = 0;
  private readonly listeners = new Set<() => void>();

  constructor(
    private readonly queue: DailyQueue,
    private readonly grader: Pick<Grader, 'submit'>,
    private readonly bus: Bus,
  ) {}

  start(): () => void {
    return this.bus.on('challenge:request', (r) => this.handle(r));
  }

  current(): ActiveChallenge | null {
    return this.active;
  }

  /** Bumps on every change — a stable snapshot for useSyncExternalStore. */
  version(): number {
    return this.ver;
  }

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  progress(): { done: number; total: number } {
    return { done: this.queue.done, total: this.queue.total };
  }

  answer(choice: string): boolean {
    const a = this.active;
    if (!a) return false;
    if (a.picked !== null) return a.correct;
    const { challenge } = a;
    a.picked = choice;
    a.correct = choice === challenge.item.answer;
    this.queue.answer(challenge, a.correct);
    if (challenge.graded) {
      void this.grader.submit({ kind: challenge.item.kind, id: challenge.item.id, grade: a.correct ? 3 : 1 });
    }
    this.notify();
    return a.correct;
  }

  close(): void {
    const a = this.active;
    if (!a || a.picked === null) return;
    this.active = null;
    this.notify();
    this.bus.emit('challenge:result', { requestId: a.requestId, correct: a.correct });
  }

  private handle(req: BusEvents['challenge:request']): void {
    if (this.active) {
      this.bus.emit('challenge:result', { requestId: req.requestId, correct: false });
      return;
    }
    const challenge = this.queue.next(req.kind, req.preferTopics);
    if (!challenge) {
      // No cards at all (fresh offline install): never block the game.
      this.bus.emit('challenge:result', { requestId: req.requestId, correct: true });
      return;
    }
    this.active = { requestId: req.requestId, source: req.source, challenge, picked: null, correct: false };
    this.notify();
  }

  private notify(): void {
    this.ver++;
    for (const fn of [...this.listeners]) fn();
  }
}
```

- [ ] **Step 4: Run all tests and build**

Run: `npm test && npm run build`
Expected: all PASS (bus 3, options 4, queue 9, grader 4, loader 5, controller 6); build exit 0.

- [ ] **Step 5: Commit**

```bash
git add telegram-bot/game/src/learning/controller.ts telegram-bot/game/src/learning/controller.test.ts
git commit -m "game: challenge controller between world, queue and UI"
```

---

### Task 7: Save data, rooms and physics constants

**Files:**
- Create: `src/save.ts`, `src/world/constants.ts`, `src/world/rooms.ts`
- Test: `src/save.test.ts`, `src/world/rooms.test.ts`

**Interfaces:**
- Consumes: `KV`, `readJSON`, `writeJSON`, `memoryKV`.
- Produces:
  - `save.ts`: `type AbilityId = 'dash' | 'doubleJump'`, `interface SaveData { version: 1; room: string; x: number; y: number; abilities: Record<AbilityId, boolean>; maxHp: number; altarProgress: Record<AbilityId, number>; amphorae: string[]; walls: string[]; bossDefeated: boolean }`, `newSave(): SaveData`, `loadSave(store: KV, accountId: string): SaveData`, `writeSave(store: KV, accountId: string, data: SaveData): void`.
  - `constants.ts`: `W`, `H`, `FLOOR_Y`, `GROUND_Y`, `GRAVITY`, `PLAYER`, `COOLDOWN_MS`, `COLORS`, `jumpHeight()`, `jumpDistance()`, `dashDistance()`.
  - `rooms.ts`: `type RoomId`, `interface Rect`, `interface Exit`, `interface RoomDef`, `ROOMS: Record<RoomId, RoomDef>`, `START_ROOM: RoomId`.

- [ ] **Step 1: Write the failing save test `src/save.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { memoryKV } from './kv';
import { loadSave, newSave, writeSave } from './save';

describe('save', () => {
  it('starts a new game when nothing is stored', () => {
    expect(loadSave(memoryKV(), 'a')).toEqual(newSave());
  });

  it('starts a new game when the stored data is corrupt', () => {
    const store = memoryKV();
    store.setItem('hs_game_save_a', '{oops');
    expect(loadSave(store, 'a')).toEqual(newSave());
  });

  it('round-trips and keeps accounts apart', () => {
    const store = memoryKV();
    const s = newSave();
    s.abilities.dash = true;
    s.amphorae.push('amph_harbor');
    writeSave(store, 'a', s);
    expect(loadSave(store, 'a')).toEqual(s);
    expect(loadSave(store, 'b')).toEqual(newSave());
  });

  it('hands out independent copies of the new game', () => {
    newSave().amphorae.push('x');
    expect(newSave().amphorae).toEqual([]);
  });
});
```

- [ ] **Step 2: Write the failing rooms test `src/world/rooms.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { FLOOR_Y, H, W, dashDistance, jumpDistance, jumpHeight } from './constants';
import { ROOMS, START_ROOM, type RoomId } from './rooms';

const ids = Object.keys(ROOMS) as RoomId[];

describe('rooms', () => {
  it('every exit leads to a room with an exit back', () => {
    for (const id of ids) {
      for (const e of ROOMS[id].exits) {
        const target = ROOMS[e.to];
        expect(target, `${id} -> ${e.to}`).toBeDefined();
        expect(target.exits.some((b) => b.to === id), `${e.to} has no way back to ${id}`).toBe(true);
        expect(e.toX).toBeGreaterThan(0);
        expect(e.toX).toBeLessThan(W);
        expect(e.toY).toBeLessThan(H);
      }
    }
  });

  it('object ids are unique across the world', () => {
    const all = ids.flatMap((id) => [
      ...(ROOMS[id].walls ?? []).map((w) => w.id),
      ...(ROOMS[id].amphorae ?? []).map((a) => a.id),
      ...(ROOMS[id].enemies ?? []).map((e) => e.id),
    ]);
    expect(new Set(all).size).toBe(all.length);
  });

  it('has exactly 4 amphorae, one boss and both altars', () => {
    expect(ids.flatMap((id) => ROOMS[id].amphorae ?? [])).toHaveLength(4);
    expect(ids.filter((id) => ROOMS[id].boss)).toHaveLength(1);
    expect(ids.flatMap((id) => (ROOMS[id].altars ?? []).map((a) => a.id)).sort()).toEqual(['dash', 'doubleJump']);
    expect(ROOMS[START_ROOM]).toBeDefined();
  });

  it('the Plaka gap needs the dash', () => {
    const [left, right] = ROOMS.K3.platforms.filter((p) => p.y === FLOOR_Y);
    const gap = right.x - (left.x + left.w);
    expect(jumpDistance()).toBeLessThan(gap);
    expect(jumpDistance() + dashDistance()).toBeGreaterThan(gap + 30);
  });

  it('the Agora wall needs the double jump', () => {
    const block = ROOMS.A3.platforms.find((p) => p.x === 760)!;
    const rise = FLOOR_Y - block.y;
    expect(jumpHeight()).toBeLessThan(rise);
    expect(2 * jumpHeight()).toBeGreaterThan(rise + 20);
  });
});
```

- [ ] **Step 3: Run them to verify they fail**

Run: `npx vitest run src/save.test.ts src/world/rooms.test.ts`
Expected: FAIL — cannot resolve `./save`, `./constants`, `./rooms`.

- [ ] **Step 4: Implement `src/save.ts`**

```ts
import { readJSON, writeJSON, type KV } from './kv';

export type AbilityId = 'dash' | 'doubleJump';

/** World progress only — learning progress lives on the server. */
export interface SaveData {
  version: 1;
  room: string; // checkpoint: the last room entered...
  x: number; // ...and where the player entered it
  y: number;
  abilities: Record<AbilityId, boolean>;
  maxHp: number;
  altarProgress: Record<AbilityId, number>;
  amphorae: string[];
  walls: string[];
  bossDefeated: boolean;
}

export function newSave(): SaveData {
  return {
    version: 1,
    room: 'P1',
    x: 320,
    y: 470,
    abilities: { dash: false, doubleJump: false },
    maxHp: 3,
    altarProgress: { dash: 0, doubleJump: 0 },
    amphorae: [],
    walls: [],
    bossDefeated: false,
  };
}

const key = (accountId: string) => `hs_game_save_${accountId}`;

export function loadSave(store: KV, accountId: string): SaveData {
  const s = readJSON<SaveData>(store, key(accountId));
  return s && s.version === 1 ? { ...newSave(), ...s } : newSave();
}

export function writeSave(store: KV, accountId: string, data: SaveData): void {
  writeJSON(store, key(accountId), data);
}
```

- [ ] **Step 5: Implement `src/world/constants.ts`**

```ts
export const W = 960;
export const H = 540;
export const FLOOR_Y = 500; // top of the ground
export const GROUND_Y = 470; // spawn height that lands on the ground
export const GRAVITY = 1400;
export const COOLDOWN_MS = 30_000;

export const PLAYER = {
  w: 24,
  h: 40,
  run: 220,
  jump: -560,
  jumpCut: -200,
  dashSpeed: 650,
  dashMs: 180,
  dashCooldown: 450,
  attackMs: 120,
  attackCooldown: 300,
} as const;

export const COLORS = {
  platform: 0x8a7f6a,
  wall: 0xb5651d,
  altar: 0xe0b84c,
  amphora: 0xc8553d,
  slime: 0x6ab04c,
  bearer: 0x7d5a44,
  shield: 0xd9d9d9,
  sphinx: 0x8e6bbf,
  player: 0xf2e8cf,
  shot: 0xff7043,
} as const;

/** Peak height of a full single jump (px). */
export const jumpHeight = () => (PLAYER.jump * PLAYER.jump) / (2 * GRAVITY);
/** Horizontal reach of a full single jump on flat ground (px). */
export const jumpDistance = () => ((2 * -PLAYER.jump) / GRAVITY) * PLAYER.run;
/** Extra reach a mid-air dash adds (gravity is off while dashing). */
export const dashDistance = () => (PLAYER.dashSpeed * PLAYER.dashMs) / 1000;
```

- [ ] **Step 6: Implement `src/world/rooms.ts`**

```ts
import { FLOOR_Y, GROUND_Y, H, W } from './constants';

export type RoomId = 'P1' | 'P2' | 'K1' | 'K2' | 'K3' | 'A1' | 'A2' | 'A3' | 'R1' | 'R2';

/** Top-left based rectangle. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Exit {
  side: 'left' | 'right';
  yMin: number;
  yMax: number;
  to: RoomId;
  toX: number;
  toY: number;
}

export interface RoomDef {
  id: RoomId;
  name: { ru: string; el: string };
  bg: number;
  platforms: Rect[];
  exits: Exit[];
  walls?: { id: string; rect: Rect }[];
  altars?: { id: 'dash' | 'doubleJump'; x: number }[];
  amphorae?: { id: string; x: number; y: number }[]; // y = surface it stands on
  enemies?: { type: 'slime' | 'shield'; id: string; x: number }[];
  boss?: { x: number };
}

const floor = (x1: number, x2: number): Rect => ({ x: x1, y: FLOOR_Y, w: x2 - x1, h: H - FLOOR_Y });
const ledge = (x: number, y: number, w: number): Rect => ({ x, y, w, h: 16 });
const ANY = { yMin: -200, yMax: H + 200 };
const toLeftEdge = { toX: 930, toY: GROUND_Y };
const toRightEdge = { toX: 30, toY: GROUND_Y };

const PIRAEUS = 0x1d2a3a;
const PLAKA = 0x2a2238;
const AGORA = 0x2f2a1e;
const ACROPOLIS = 0x1e2a24;

export const START_ROOM: RoomId = 'P1';

export const ROOMS: Record<RoomId, RoomDef> = {
  P1: {
    id: 'P1',
    name: { ru: 'Пирей · Гавань', el: 'Πειραιάς · Λιμάνι' },
    bg: PIRAEUS,
    platforms: [floor(0, W), ledge(520, 420, 120)],
    walls: [{ id: 'wall_harbor', rect: { x: 160, y: 380, w: 24, h: 120 } }],
    amphorae: [{ id: 'amph_harbor', x: 70, y: FLOOR_Y }],
    exits: [{ side: 'right', ...ANY, to: 'P2', ...toRightEdge }],
  },
  P2: {
    id: 'P2',
    name: { ru: 'Пирей · Доки', el: 'Πειραιάς · Αποβάθρες' },
    bg: PIRAEUS,
    platforms: [floor(0, W), ledge(780, 320, 180)],
    amphorae: [{ id: 'amph_docks', x: 880, y: 320 }],
    enemies: [
      { type: 'slime', id: 'slime_p2a', x: 400 },
      { type: 'slime', id: 'slime_p2b', x: 620 },
    ],
    exits: [
      { side: 'left', ...ANY, to: 'P1', ...toLeftEdge },
      { side: 'right', ...ANY, to: 'K1', ...toRightEdge },
    ],
  },
  K1: {
    id: 'K1',
    name: { ru: 'Плака · Лестницы', el: 'Πλάκα · Σκαλιά' },
    bg: PLAKA,
    platforms: [floor(0, W), ledge(200, 440, 120), ledge(380, 380, 120), ledge(560, 320, 120), ledge(760, 150, 200)],
    amphorae: [{ id: 'amph_stairs', x: 880, y: 150 }],
    exits: [
      { side: 'left', ...ANY, to: 'P2', ...toLeftEdge },
      { side: 'right', ...ANY, to: 'K2', ...toRightEdge },
    ],
  },
  K2: {
    id: 'K2',
    name: { ru: 'Плака · Святилище', el: 'Πλάκα · Ιερό' },
    bg: PLAKA,
    platforms: [floor(0, W), ledge(140, 400, 100), ledge(720, 400, 100)],
    altars: [{ id: 'dash', x: 480 }],
    exits: [
      { side: 'left', ...ANY, to: 'K1', ...toLeftEdge },
      { side: 'right', ...ANY, to: 'K3', ...toRightEdge },
    ],
  },
  K3: {
    id: 'K3',
    name: { ru: 'Плака · Обрыв', el: 'Πλάκα · Γκρεμός' },
    bg: PLAKA,
    platforms: [floor(0, 360), floor(600, W)],
    exits: [
      { side: 'left', ...ANY, to: 'K2', ...toLeftEdge },
      { side: 'right', ...ANY, to: 'A1', ...toRightEdge },
    ],
  },
  A1: {
    id: 'A1',
    name: { ru: 'Агора · Рынок', el: 'Αγορά · Παζάρι' },
    bg: AGORA,
    platforms: [floor(0, W), ledge(300, 420, 160)],
    enemies: [
      { type: 'slime', id: 'slime_a1', x: 200 },
      { type: 'shield', id: 'bearer_a1', x: 640 },
    ],
    exits: [
      { side: 'left', ...ANY, to: 'K3', ...toLeftEdge },
      { side: 'right', ...ANY, to: 'A2', ...toRightEdge },
    ],
  },
  A2: {
    id: 'A2',
    name: { ru: 'Агора · Стоя', el: 'Αγορά · Στοά' },
    bg: AGORA,
    platforms: [floor(0, W), ledge(620, 300, 100)],
    altars: [{ id: 'doubleJump', x: 300 }],
    amphorae: [{ id: 'amph_stoa', x: 670, y: 300 }],
    exits: [
      { side: 'left', ...ANY, to: 'A1', ...toLeftEdge },
      { side: 'right', ...ANY, to: 'A3', ...toRightEdge },
    ],
  },
  A3: {
    id: 'A3',
    name: { ru: 'Агора · Стена', el: 'Αγορά · Τείχος' },
    bg: AGORA,
    platforms: [floor(0, W), { x: 760, y: 320, w: 200, h: 180 }],
    enemies: [{ type: 'slime', id: 'slime_a3', x: 400 }],
    exits: [
      { side: 'left', ...ANY, to: 'A2', ...toLeftEdge },
      { side: 'right', yMin: -200, yMax: 320, to: 'R1', ...toRightEdge },
    ],
  },
  R1: {
    id: 'R1',
    name: { ru: 'Акрополь · Пропилеи', el: 'Ακρόπολη · Προπύλαια' },
    bg: ACROPOLIS,
    platforms: [floor(0, W), ledge(300, 400, 80), ledge(600, 400, 80)],
    enemies: [
      { type: 'shield', id: 'bearer_r1a', x: 450 },
      { type: 'shield', id: 'bearer_r1b', x: 760 },
    ],
    exits: [
      { side: 'left', ...ANY, to: 'A3', toX: 900, toY: 290 },
      { side: 'right', ...ANY, to: 'R2', ...toRightEdge },
    ],
  },
  R2: {
    id: 'R2',
    name: { ru: 'Акрополь · Парфенон', el: 'Ακρόπολη · Παρθενώνας' },
    bg: ACROPOLIS,
    platforms: [floor(0, W), ledge(160, 380, 120), ledge(680, 380, 120)],
    boss: { x: 720 },
    exits: [{ side: 'left', ...ANY, to: 'R1', ...toLeftEdge }],
  },
};
```

- [ ] **Step 7: Run tests and build**

Run: `npm test && npm run build`
Expected: all PASS (save 4, rooms 5 added); build exit 0.

- [ ] **Step 8: Commit**

```bash
git add telegram-bot/game/src/save.ts telegram-bot/game/src/save.test.ts telegram-bot/game/src/world
git commit -m "game: save data, room map and physics constants"
```

---

### Task 8: React shell — strings, login, loading, session bootstrap

**Files:**
- Create: `src/ui/strings.ts`, `src/session.ts`, `src/ui/Login.tsx`, `src/ui/Loading.tsx`, `src/App.tsx`, `src/styles.css`; plus a `game` entry in the session's `.claude/launch.json` (outside the repo, not committed)
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: `api`, `MeResponse` from `@shared/api`; `getToken`, `setToken`, `clearToken` from `@shared/auth`; `getStoredLanguage` from `@shared/i18n`; `withRetry`, `loadToday` (Task 5); `Grader` (Task 4); `DailyQueue` (Task 3); `ChallengeController` (Task 6); `bus` (Task 1).
- Produces: `s(key: StringKey, value?: string): string`, `setLanguage(lang: Language): void` (`strings.ts`); `interface Session { accountId: string; streak: number; offline: boolean; controller: ChallengeController; stop(): void }`, `startSession(onRetry: (attempt: number) => void): Promise<Session>`, `logout(): void` (`session.ts`); `App` component with phases `login | loading | error | play` — `play` renders a placeholder `<div className="stage" />` that Task 9 fills.

- [ ] **Step 1: Create `src/ui/strings.ts`**

```ts
import { getStoredLanguage, type Language } from '@shared/i18n';

const STRINGS = {
  ru: {
    title: 'Hellas Quest',
    username: 'Ник',
    password: 'Пароль',
    login: 'Войти',
    register: 'Создать аккаунт',
    guest: 'Играть гостем',
    loginFailed: 'Неверный ник или пароль',
    userExists: 'Такой ник уже занят',
    networkError: 'Нет связи с сервером',
    loading: 'Корабль отплывает…',
    retrying: 'Сервер просыпается, попытка {v}',
    retry: 'Повторить',
    offline: 'офлайн',
    today: 'Сегодня',
    streak: 'Серия',
    continueHint: 'Enter — дальше',
    correct: 'Верно!',
    wrong: 'Неверно',
    rightAnswer: 'Правильный ответ',
    practice: 'Практика',
    review: 'Повторение',
    fresh: 'Новое',
    src_altar: 'Алтарь',
    src_shield: 'Щит',
    src_amphora: 'Амфора',
    src_boss: 'Сфинкс',
    paused: 'Пауза',
    resume: 'Продолжить',
    language: 'Язык: русский',
    logout: 'Выйти из аккаунта',
    controls: 'A/D — ходьба · Space — прыжок · J — удар · K — рывок · E — действие · 1–4 — ответ · Esc — пауза',
    victory: 'Сфинкс повержен!',
    victoryText: 'Акрополь пройден. Возвращайся завтра — очередь повторений обновится.',
    abilityDash: 'Новая способность: рывок (K)',
    abilityDoubleJump: 'Новая способность: двойной прыжок',
    altarProgress: 'Алтарь: {v}/3',
    heartUp: '+1 сердце',
    wallBroken: 'Стена рухнула',
    shieldDown: 'Щит сбит!',
    died: 'Ты пал… Возвращение к чекпоинту',
    dash: 'Рывок',
    doubleJump: 'Двойной прыжок',
  },
  el: {
    title: 'Hellas Quest',
    username: 'Ψευδώνυμο',
    password: 'Κωδικός',
    login: 'Είσοδος',
    register: 'Νέος λογαριασμός',
    guest: 'Παίξε ως επισκέπτης',
    loginFailed: 'Λάθος ψευδώνυμο ή κωδικός',
    userExists: 'Το ψευδώνυμο υπάρχει ήδη',
    networkError: 'Δεν υπάρχει σύνδεση με τον διακομιστή',
    loading: 'Το πλοίο σαλπάρει…',
    retrying: 'Ο διακομιστής ξυπνά, προσπάθεια {v}',
    retry: 'Ξανά',
    offline: 'εκτός σύνδεσης',
    today: 'Σήμερα',
    streak: 'Σερί',
    continueHint: 'Enter — συνέχεια',
    correct: 'Σωστά!',
    wrong: 'Λάθος',
    rightAnswer: 'Σωστή απάντηση',
    practice: 'Εξάσκηση',
    review: 'Επανάληψη',
    fresh: 'Νέο',
    src_altar: 'Βωμός',
    src_shield: 'Ασπίδα',
    src_amphora: 'Αμφορέας',
    src_boss: 'Σφίγγα',
    paused: 'Παύση',
    resume: 'Συνέχεια',
    language: 'Γλώσσα: ελληνικά',
    logout: 'Αποσύνδεση',
    controls: 'A/D — κίνηση · Space — άλμα · J — χτύπημα · K — ορμή · E — ενέργεια · 1–4 — απάντηση · Esc — παύση',
    victory: 'Η Σφίγγα νικήθηκε!',
    victoryText: 'Η Ακρόπολη είναι δική σου. Έλα αύριο — οι επαναλήψεις ανανεώνονται.',
    abilityDash: 'Νέα ικανότητα: ορμή (K)',
    abilityDoubleJump: 'Νέα ικανότητα: διπλό άλμα',
    altarProgress: 'Βωμός: {v}/3',
    heartUp: '+1 καρδιά',
    wallBroken: 'Ο τοίχος γκρεμίστηκε',
    shieldDown: 'Η ασπίδα έπεσε!',
    died: 'Έπεσες… Επιστροφή στο σημείο ελέγχου',
    dash: 'Ορμή',
    doubleJump: 'Διπλό άλμα',
  },
} as const;

export type StringKey = keyof (typeof STRINGS)['ru'];

export function s(key: StringKey, value?: string): string {
  const text: string = STRINGS[getStoredLanguage()][key];
  return value === undefined ? text : text.replace('{v}', value);
}

/** Same key the web app uses, so the API also returns cards in this language. */
export function setLanguage(lang: Language): void {
  try {
    localStorage.setItem('hs_lang', lang);
  } catch {
    /* ignore */
  }
}
```

- [ ] **Step 2: Create `src/session.ts`**

```ts
import { api, clearCache, type MeResponse } from '@shared/api';
import { clearToken } from '@shared/auth';
import { bus } from './bus';
import { readJSON, writeJSON } from './kv';
import { ChallengeController } from './learning/controller';
import { Grader } from './learning/grader';
import { loadToday, withRetry } from './learning/loader';
import { DailyQueue } from './learning/queue';

export const GUEST_KEY = 'hs_game_guest';
const ME_KEY = 'hs_game_me';

export interface Session {
  accountId: string;
  streak: number;
  offline: boolean;
  controller: ChallengeController;
  stop(): void;
}

async function loadMe(onRetry: (attempt: number) => void): Promise<{ me: MeResponse; offline: boolean }> {
  try {
    const me = await withRetry(() => api.me(), { onRetry });
    writeJSON(localStorage, ME_KEY, me);
    return { me, offline: false };
  } catch {
    const me = readJSON<MeResponse>(localStorage, ME_KEY);
    if (!me) throw new Error('no_data');
    return { me, offline: true };
  }
}

export async function startSession(onRetry: (attempt: number) => void): Promise<Session> {
  const store = localStorage;
  const { me, offline } = await loadMe(onRetry);
  const accountId = me.user.id;
  const today = await loadToday(
    { flashcards: api.flashcards, vocab: api.vocab },
    store,
    accountId,
    offline ? { attempts: 1 } : { onRetry },
  );

  const grader = new Grader({ exam: api.flashcardGrade, word: api.vocabGrade }, store, accountId);
  void grader.flush();
  const flushTimer = window.setInterval(() => void grader.flush(), 60_000);

  const controller = new ChallengeController(new DailyQueue(today.words, today.exams), grader, bus);
  const unsubscribe = controller.start();

  return {
    accountId,
    streak: me.streak,
    offline: offline || today.offline,
    controller,
    stop() {
      unsubscribe();
      window.clearInterval(flushTimer);
    },
  };
}

export function logout(): void {
  clearToken();
  clearCache();
  localStorage.removeItem(GUEST_KEY);
  localStorage.removeItem(ME_KEY);
  window.location.reload();
}
```

- [ ] **Step 3: Create `src/ui/Login.tsx`**

```tsx
import { useState, type FormEvent } from 'react';
import { api } from '@shared/api';
import { setToken } from '@shared/auth';
import { GUEST_KEY } from '../session';
import { s } from './strings';

export function Login({ onDone }: { onDone: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(mode: 'login' | 'register') {
    if (!username.trim() || !password) return;
    setBusy(true);
    setError(null);
    try {
      const r = mode === 'login' ? await api.login(username.trim(), password) : await api.register(username.trim(), password);
      setToken(r.token);
      localStorage.removeItem(GUEST_KEY);
      onDone();
    } catch (e) {
      const msg = String(e);
      setError(msg.includes('409') ? s('userExists') : msg.includes('API 4') ? s('loginFailed') : s('networkError'));
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void submit('login');
  }

  return (
    <div className="screen">
      <form className="panel login" onSubmit={onSubmit}>
        <h1>{s('title')}</h1>
        <input placeholder={s('username')} value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
        <input placeholder={s('password')} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={busy}>{s('login')}</button>
        <button type="button" disabled={busy} onClick={() => void submit('register')}>{s('register')}</button>
        <button
          type="button"
          className="ghost"
          onClick={() => {
            localStorage.setItem(GUEST_KEY, '1');
            onDone();
          }}
        >
          {s('guest')}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Create `src/ui/Loading.tsx`**

```tsx
import { s } from './strings';

export function Loading({ attempt, error, onRetry }: { attempt: number; error?: boolean; onRetry?: () => void }) {
  return (
    <div className="screen">
      <div className="panel">
        <div className="ship">⛵</div>
        {error ? (
          <>
            <p>{s('networkError')}</p>
            <button onClick={onRetry}>{s('retry')}</button>
          </>
        ) : (
          <>
            <p>{s('loading')}</p>
            {attempt > 0 && <p className="muted">{s('retrying', String(attempt))}</p>}
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create `src/App.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { getToken } from '@shared/auth';
import { GUEST_KEY, startSession, type Session } from './session';
import { Loading } from './ui/Loading';
import { Login } from './ui/Login';

type Phase =
  | { name: 'login' }
  | { name: 'loading'; attempt: number }
  | { name: 'error' }
  | { name: 'play'; session: Session };

const initialPhase = (): Phase =>
  getToken() || localStorage.getItem(GUEST_KEY) ? { name: 'loading', attempt: 0 } : { name: 'login' };

export function App() {
  const [phase, setPhase] = useState<Phase>(initialPhase);

  useEffect(() => {
    if (phase.name !== 'loading') return;
    let cancelled = false;
    startSession((attempt) => {
      if (!cancelled) setPhase({ name: 'loading', attempt });
    })
      .then((session) => {
        if (cancelled) session.stop();
        else setPhase({ name: 'play', session });
      })
      .catch(() => {
        if (!cancelled) setPhase({ name: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [phase.name]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'F11') return;
      e.preventDefault();
      if (document.fullscreenElement) void document.exitFullscreen();
      else void document.documentElement.requestFullscreen();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  switch (phase.name) {
    case 'login':
      return <Login onDone={() => setPhase({ name: 'loading', attempt: 0 })} />;
    case 'loading':
      return <Loading attempt={phase.attempt} />;
    case 'error':
      return <Loading attempt={0} error onRetry={() => setPhase({ name: 'loading', attempt: 0 })} />;
    case 'play':
      return <div className="stage" />;
  }
}
```

- [ ] **Step 6: Create `src/styles.css` and wire `src/main.tsx`**

`src/styles.css`:
```css
:root {
  --bg: #0f1620;
  --panel: #1b2633;
  --ink: #f2e8cf;
  --muted: #9aa7b4;
  --accent: #2f6fd6;
  --good: #4caf6a;
  --bad: #d9534f;
  --gold: #e0b84c;
  color-scheme: dark;
}
* { box-sizing: border-box; }
html, body, #root { margin: 0; height: 100%; }
body { background: var(--bg); color: var(--ink); font: 16px/1.4 system-ui, 'Segoe UI', sans-serif; overflow: hidden; }
button { font: inherit; color: var(--ink); background: var(--accent); border: 0; border-radius: 6px; padding: 10px 14px; cursor: pointer; }
button:disabled { opacity: .5; cursor: default; }
button.ghost { background: transparent; border: 1px solid var(--muted); }
input { font: inherit; color: var(--ink); background: #0b1118; border: 1px solid #2c3a49; border-radius: 6px; padding: 10px 12px; }
.screen { height: 100%; display: grid; place-items: center; padding: 16px; }
.panel { background: var(--panel); border-radius: 12px; padding: 24px; min-width: 320px; max-width: 640px; display: flex; flex-direction: column; gap: 12px; text-align: center; }
.login h1 { margin: 0 0 8px; }
.error { color: var(--bad); margin: 0; }
.muted { color: var(--muted); margin: 0; }
.ship { font-size: 48px; animation: bob 2s ease-in-out infinite; }
@keyframes bob { 50% { transform: translateY(-6px); } }
.stage { position: relative; width: 100%; height: 100%; }
.canvas { position: absolute; inset: 0; }
.overlay { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(0, 0, 0, .55); }
.hud { position: absolute; top: 10px; left: 12px; right: 12px; display: flex; gap: 16px; align-items: center; pointer-events: none; text-shadow: 0 1px 2px #000; }
.hud .hearts { color: var(--bad); letter-spacing: 2px; font-size: 20px; }
.hud .spacer { flex: 1; }
.hud .badge { background: rgba(0, 0, 0, .4); border-radius: 6px; padding: 2px 8px; }
.hud .off { background: var(--bad); }
.dialog { background: var(--panel); border-radius: 12px; padding: 24px; width: min(640px, calc(100% - 32px)); display: flex; flex-direction: column; gap: 12px; }
.dialog .meta { display: flex; gap: 8px; color: var(--muted); font-size: 14px; }
.dialog .prompt { font-size: 26px; font-weight: 600; }
.dialog .options { display: grid; gap: 8px; }
.dialog .options button { text-align: left; background: #26364a; }
.dialog .options button.right { background: var(--good); }
.dialog .options button.wrong { background: var(--bad); }
.dialog .verdict.good { color: var(--good); }
.dialog .verdict.bad { color: var(--bad); }
.toasts { position: absolute; top: 56px; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; gap: 6px; pointer-events: none; }
.toast { background: rgba(0, 0, 0, .7); border: 1px solid var(--gold); color: var(--gold); border-radius: 8px; padding: 6px 14px; }
```

`src/main.tsx`:
```tsx
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

// No StrictMode: its double mount would boot two Phaser games.
createRoot(document.getElementById('root')!).render(<App />);
```

- [ ] **Step 7: Build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 8: Add a preview entry and verify in the browser**

Add to the session's `.claude/launch.json` (create if missing) a configuration:
```json
{
  "name": "game",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["--prefix", "C:/Users/user/Desktop/hellas-flash-buddy/telegram-bot/game", "run", "dev"],
  "port": 5174
}
```
Start it with `preview_start {name: "game"}`. Check:
- With no token: login screen renders in Greek or Russian (per `hs_lang`).
- "Играть гостем" → loading screen → empty stage (no errors in `read_console_messages`; network shows `/api/me`, `/api/flashcards`, `/api/vocab` 200).

- [ ] **Step 9: Commit**

```bash
git add telegram-bot/game/src
git commit -m "game: login, loading and session bootstrap"
```

---

### Task 9: Overlay UI — challenge dialog, HUD, toasts, pause, victory

**Files:**
- Create: `src/ui/ChallengeDialog.tsx`, `src/ui/Hud.tsx`, `src/ui/Toasts.tsx`, `src/ui/PauseMenu.tsx`, `src/ui/Victory.tsx`, `src/ui/useBus.ts`, `src/ui/Play.tsx`
- Modify: `src/App.tsx` (render `<Play session={phase.session} />` instead of the placeholder)

**Interfaces:**
- Consumes: `Session` (Task 8), `ChallengeController`, `ActiveChallenge` (Task 6), `bus`, `HudState`, `ToastKey` (Task 1), `s`, `setLanguage` (Task 8), `speakGreek`, `hasGreek`, `textKey` from `@shared/speech`, `ROOMS` (Task 7).
- Produces: `useBusEvent<K>(event: K, fn: (p: BusEvents[K]) => void): void`, `Play({ session }: { session: Session })` — renders the stage with a `<div className="canvas" />` slot that Task 10 fills via `GameCanvas`.

- [ ] **Step 1: Create `src/ui/useBus.ts`**

```ts
import { useEffect, useRef } from 'react';
import { bus, type BusEvents } from '../bus';

/** Subscribe to a bus event for the component's lifetime; the latest `fn` is always used. */
export function useBusEvent<K extends keyof BusEvents>(event: K, fn: (payload: BusEvents[K]) => void): void {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => bus.on(event, (p) => ref.current(p)), [event]);
}
```

- [ ] **Step 2: Create `src/ui/ChallengeDialog.tsx`**

```tsx
import { useEffect, useSyncExternalStore } from 'react';
import { hasGreek, speakGreek, textKey } from '@shared/speech';
import type { ChallengeController } from '../learning/controller';
import { s, type StringKey } from './strings';

function speakPrompt(kind: 'word' | 'exam', id: string | number, text: string) {
  if (hasGreek(text)) void speakGreek(text, kind === 'word' ? `vocab_${id}` : `q_${id}`);
}

export function ChallengeDialog({ controller }: { controller: ChallengeController }) {
  useSyncExternalStore(controller.subscribe, () => controller.version());
  const active = controller.current();

  useEffect(() => {
    if (active) speakPrompt(active.challenge.item.kind, active.challenge.item.id, active.challenge.item.prompt);
    // Only when a new dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.requestId]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (active.picked === null) {
        const n = Number(e.key);
        const opt = active.challenge.options[n - 1];
        if (opt !== undefined) choose(opt);
      } else if (e.key === 'Enter' || e.key === ' ' || e.key.toLowerCase() === 'e') {
        e.preventDefault();
        controller.close();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!active) return null;
  const { challenge, picked, correct, source } = active;
  const { item } = challenge;

  function choose(opt: string) {
    const ok = controller.answer(opt);
    if (!ok && hasGreek(item.answer)) void speakGreek(item.answer, textKey(item.answer, 'a'));
  }

  const badge: StringKey = !challenge.graded ? 'practice' : item.level >= 1 ? 'review' : 'fresh';
  const cls = (opt: string) => (picked === null ? '' : opt === item.answer ? 'right' : opt === picked ? 'wrong' : '');

  return (
    <div className="overlay">
      <div className="dialog">
        <div className="meta">
          <span>{s(`src_${source}` as StringKey)}</span>
          <span>·</span>
          <span>{s(badge)}</span>
        </div>
        <div className="prompt">{item.prompt}</div>
        <div className="options">
          {challenge.options.map((opt, i) => (
            <button key={opt} className={cls(opt)} disabled={picked !== null} onClick={() => choose(opt)}>
              {i + 1}. {opt}
            </button>
          ))}
        </div>
        {picked !== null && (
          <>
            <div className={`verdict ${correct ? 'good' : 'bad'}`}>
              {correct ? s('correct') : `${s('wrong')} — ${s('rightAnswer')}: ${item.answer}`}
            </div>
            {item.explanation && <div className="muted">{item.explanation}</div>}
            <button onClick={() => controller.close()}>{s('continueHint')}</button>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/ui/Hud.tsx`**

```tsx
import { useState, useSyncExternalStore } from 'react';
import { getStoredLanguage } from '@shared/i18n';
import type { HudState } from '../bus';
import type { Session } from '../session';
import { ROOMS, type RoomId } from '../world/rooms';
import { s } from './strings';
import { useBusEvent } from './useBus';

export function Hud({ session }: { session: Session }) {
  const [hud, setHud] = useState<HudState | null>(null);
  useBusEvent('hud:update', setHud);
  const { controller } = session;
  useSyncExternalStore(controller.subscribe, () => controller.version());
  const { done, total } = controller.progress();
  if (!hud) return null;
  const room = ROOMS[hud.room as RoomId];
  return (
    <div className="hud">
      <span className="hearts">{'♥'.repeat(Math.max(0, hud.hp))}{'♡'.repeat(Math.max(0, hud.maxHp - hud.hp))}</span>
      <span className="badge">{room ? room.name[getStoredLanguage()] : hud.room}</span>
      {hud.dash && <span className="badge">{s('dash')}</span>}
      {hud.doubleJump && <span className="badge">{s('doubleJump')}</span>}
      <span className="spacer" />
      <span className="badge">{s('today')}: {done}/{total}</span>
      <span className="badge">{s('streak')}: {session.streak}</span>
      {session.offline && <span className="badge off">{s('offline')}</span>}
    </div>
  );
}
```

- [ ] **Step 4: Create `src/ui/Toasts.tsx`**

```tsx
import { useState } from 'react';
import { s } from './strings';
import { useBusEvent } from './useBus';

interface Toast { id: number; text: string }
let seq = 0;

export function Toasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  useBusEvent('toast', ({ key, value }) => {
    const t = { id: ++seq, text: s(key, value) };
    setToasts((list) => [...list, t]);
    window.setTimeout(() => setToasts((list) => list.filter((x) => x.id !== t.id)), 2500);
  });
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className="toast">{t.text}</div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Create `src/ui/PauseMenu.tsx`**

```tsx
import { useState } from 'react';
import { getStoredLanguage } from '@shared/i18n';
import { logout } from '../session';
import { s, setLanguage } from './strings';

export function PauseMenu({ onResume }: { onResume: () => void }) {
  const [, rerender] = useState(0);
  return (
    <div className="overlay">
      <div className="panel">
        <h2>{s('paused')}</h2>
        <button onClick={onResume}>{s('resume')}</button>
        <button
          className="ghost"
          onClick={() => {
            setLanguage(getStoredLanguage() === 'ru' ? 'el' : 'ru');
            rerender((n) => n + 1);
          }}
        >
          {s('language')}
        </button>
        <button className="ghost" onClick={logout}>{s('logout')}</button>
        <p className="muted">{s('controls')}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create `src/ui/Victory.tsx`**

```tsx
import { useEffect } from 'react';
import { s } from './strings';

export function Victory({ done, total, onClose }: { done: number; total: number; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="overlay">
      <div className="panel">
        <h2>{s('victory')}</h2>
        <p>{s('victoryText')}</p>
        <p className="muted">{s('today')}: {done}/{total}</p>
        <button onClick={onClose}>{s('continueHint')}</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Create `src/ui/Play.tsx`**

```tsx
import { useCallback, useEffect, useState } from 'react';
import { bus } from '../bus';
import type { Session } from '../session';
import { ChallengeDialog } from './ChallengeDialog';
import { Hud } from './Hud';
import { PauseMenu } from './PauseMenu';
import { Toasts } from './Toasts';
import { useBusEvent } from './useBus';
import { Victory } from './Victory';

export function Play({ session }: { session: Session }) {
  const [paused, setPaused] = useState(false);
  const [victory, setVictory] = useState(false);
  useBusEvent('boss:defeated', () => setVictory(true));

  const setPause = useCallback((p: boolean) => {
    setPaused(p);
    bus.emit('game:pause', { paused: p });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || session.controller.current() || victory) return;
      setPause(!paused);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paused, victory, session, setPause]);

  const { done, total } = session.controller.progress();
  return (
    <div className="stage">
      <div className="canvas" />
      <Hud session={session} />
      <Toasts />
      <ChallengeDialog controller={session.controller} />
      {paused && <PauseMenu onResume={() => setPause(false)} />}
      {victory && <Victory done={done} total={total} onClose={() => setVictory(false)} />}
    </div>
  );
}
```

- [ ] **Step 8: Use `Play` in `src/App.tsx`**

Replace the `play` case:
```tsx
    case 'play':
      return <Play session={phase.session} />;
```
and add the import `import { Play } from './ui/Play';`.

- [ ] **Step 9: Build and verify the dialog in the browser**

Run: `npm run build` → exit 0.
In the running preview (`preview_start {name: "game"}`, reload), open the console with `javascript_tool` and simulate a world request — the bus is a module singleton, so import it through Vite:
```js
const { bus } = await import('/src/bus.ts');
bus.on('challenge:result', (r) => console.log('RESULT', JSON.stringify(r)));
bus.emit('challenge:request', { requestId: 't1', source: 'altar', kind: 'word' });
```
Expected: the dialog shows a Greek word with up to 4 numbered options; pressing `1` marks right/wrong; `Enter` closes it; console logs `RESULT {"requestId":"t1","correct":...}`; no console errors. Screenshot the open dialog.

- [ ] **Step 10: Commit**

```bash
git add telegram-bot/game/src
git commit -m "game: challenge dialog, HUD, toasts, pause and victory overlays"
```

---

### Task 10: Phaser world — player, rooms, exits, walls, altars, amphorae

**Files:**
- Create: `src/world/Player.ts`, `src/world/GameScene.ts`, `src/world/createGame.ts`, `src/ui/GameCanvas.tsx`
- Modify: `src/ui/Play.tsx` (replace `<div className="canvas" />` with `<GameCanvas accountId={session.accountId} />`)

**Interfaces:**
- Consumes: `W`, `H`, `GRAVITY`, `PLAYER`, `COLORS`, `COOLDOWN_MS`, `ROOMS`, `RoomId`, `RoomDef`, `Rect` (Task 7); `SaveData`, `AbilityId`, `loadSave`, `writeSave` (Task 7); `Bus`, `ChallengeSource` (Task 1); `ChallengeKind`.
- Produces: `class Player { rect; body; facing; hp; maxHp; abilities; swing: number; update(time, input: PlayerInput): void; attackBox(time): Phaser.Geom.Rectangle | null; hurt(time, dmg, fromX): boolean; place(x, y): void }`; `interface SceneDeps { bus: Bus; save: SaveData; persist(save: SaveData): void }`; `class GameScene` with protected hooks `buildEnemies(room: RoomDef): void`, `updateEnemies(time: number): void`, `hitEnemies(box: Phaser.Geom.Rectangle, time: number): void`, `clearEnemies(): void` (empty in this task, filled in Task 11–12); `createGame(parent: HTMLElement, deps: SceneDeps): Phaser.Game`.

- [ ] **Step 1: Create `src/world/Player.ts`**

```ts
import Phaser from 'phaser';
import { COLORS, PLAYER } from './constants';

export interface PlayerInput {
  left: boolean;
  right: boolean;
  jumpDown: boolean;
  jumpHeld: boolean;
  attackDown: boolean;
  dashDown: boolean;
}

export interface Abilities {
  dash: boolean;
  doubleJump: boolean;
}

export class Player {
  readonly rect: Phaser.GameObjects.Rectangle;
  readonly body: Phaser.Physics.Arcade.Body;
  facing: 1 | -1 = 1;
  hp: number;
  swing = 0; // increments per attack so a target is hit once per swing
  private jumpsLeft = 0;
  private wasOnFloor = false;
  private dashUntil = 0;
  private dashReadyAt = 0;
  private airDashUsed = false;
  private attackUntil = 0;
  private attackReadyAt = 0;
  private invulnUntil = 0;
  private knockUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, public abilities: Abilities, public maxHp: number) {
    this.rect = scene.add.rectangle(x, y, PLAYER.w, PLAYER.h, COLORS.player).setDepth(10);
    scene.physics.add.existing(this.rect);
    this.body = this.rect.body as Phaser.Physics.Arcade.Body;
    this.body.setCollideWorldBounds(true);
    this.body.setMaxVelocityY(900);
    this.hp = maxHp;
  }

  update(time: number, input: PlayerInput): void {
    this.rect.setAlpha(time < this.invulnUntil && Math.floor(time / 80) % 2 === 0 ? 0.35 : 1);
    const onFloor = this.body.blocked.down;
    const maxJumps = this.abilities.doubleJump ? 2 : 1;
    if (onFloor) {
      this.jumpsLeft = maxJumps;
      this.airDashUsed = false;
    } else if (this.wasOnFloor && this.body.velocity.y >= 0) {
      this.jumpsLeft = maxJumps - 1; // walked off a ledge: the ground jump is gone
    }
    this.wasOnFloor = onFloor;

    if (time < this.dashUntil) return; // the dash owns the body until it ends
    this.body.setAllowGravity(true);
    if (time < this.knockUntil) return;

    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    this.body.setVelocityX(dir * PLAYER.run);
    if (dir !== 0) this.facing = dir > 0 ? 1 : -1;

    if (input.jumpDown && this.jumpsLeft > 0) {
      this.body.setVelocityY(PLAYER.jump);
      this.jumpsLeft--;
    }
    if (!input.jumpHeld && this.body.velocity.y < PLAYER.jumpCut) this.body.setVelocityY(PLAYER.jumpCut);

    if (input.dashDown && this.abilities.dash && time >= this.dashReadyAt && !this.airDashUsed) {
      this.dashUntil = time + PLAYER.dashMs;
      this.dashReadyAt = time + PLAYER.dashCooldown;
      if (!onFloor) this.airDashUsed = true;
      this.body.setAllowGravity(false);
      this.body.setVelocity(this.facing * PLAYER.dashSpeed, 0);
    }

    if (input.attackDown && time >= this.attackReadyAt) {
      this.attackUntil = time + PLAYER.attackMs;
      this.attackReadyAt = time + PLAYER.attackCooldown;
      this.swing++;
    }
  }

  attackBox(time: number): Phaser.Geom.Rectangle | null {
    if (time >= this.attackUntil) return null;
    const w = 44;
    const x = this.facing > 0 ? this.rect.x + PLAYER.w / 2 : this.rect.x - PLAYER.w / 2 - w;
    return new Phaser.Geom.Rectangle(x, this.rect.y - 16, w, 32);
  }

  /** Returns true if the hit landed (not invulnerable). */
  hurt(time: number, dmg: number, fromX: number): boolean {
    if (time < this.invulnUntil || time < this.dashUntil) return false;
    this.hp = Math.max(0, this.hp - dmg);
    this.invulnUntil = time + 1000;
    this.knockUntil = time + 200;
    this.body.setAllowGravity(true);
    this.body.setVelocity((this.rect.x >= fromX ? 1 : -1) * 250, -250);
    return true;
  }

  place(x: number, y: number): void {
    this.body.reset(x, y);
    this.dashUntil = 0;
    this.knockUntil = 0;
    this.body.setAllowGravity(true);
  }
}
```

- [ ] **Step 2: Create `src/world/GameScene.ts`**

```ts
import Phaser from 'phaser';
import type { Bus, ChallengeSource, ToastKey } from '../bus';
import type { ChallengeKind } from '../learning/types';
import type { AbilityId, SaveData } from '../save';
import { COLORS, COOLDOWN_MS, H, W } from './constants';
import { Player } from './Player';
import { ROOMS, type Rect, type RoomDef, type RoomId } from './rooms';

export interface SceneDeps {
  bus: Bus;
  save: SaveData;
  persist(save: SaveData): void;
}

type KeyName = 'left' | 'right' | 'a' | 'd' | 'jump' | 'up' | 'attack' | 'dash' | 'interact';

interface Breakable { id: string; rect: Phaser.GameObjects.Rectangle; hits: number; lastSwing: number }
interface Altar { id: AbilityId; rect: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text }
interface Amphora { id: string; rect: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text }

export class GameScene extends Phaser.Scene {
  protected player!: Player;
  protected room!: RoomDef;
  protected platforms!: Phaser.Physics.Arcade.StaticGroup;
  protected roomObjects: Phaser.GameObjects.GameObject[] = [];
  protected roomColliders: Phaser.Physics.Arcade.Collider[] = [];
  protected cooldowns = new Map<string, number>();
  private keys!: Record<KeyName, Phaser.Input.Keyboard.Key>;
  private walls: Breakable[] = [];
  private altars: Altar[] = [];
  private amphorae: Amphora[] = [];
  private frozen = false;
  private interactLockUntil = 0;
  private pendingResults = new Map<string, (correct: boolean) => void>();
  private requestSeq = 0;
  private entry = { x: 0, y: 0 };

  constructor(protected readonly deps: SceneDeps) {
    super('game');
  }

  get save(): SaveData {
    return this.deps.save;
  }

  create(): void {
    const kb = this.input.keyboard!;
    this.keys = kb.addKeys({
      left: 'LEFT', right: 'RIGHT', a: 'A', d: 'D', jump: 'SPACE', up: 'UP', attack: 'J', dash: 'K', interact: 'E',
    }) as Record<KeyName, Phaser.Input.Keyboard.Key>;
    this.platforms = this.physics.add.staticGroup();
    this.player = new Player(this, this.save.x, this.save.y, { ...this.save.abilities }, this.save.maxHp);
    this.physics.add.collider(this.player.rect, this.platforms);

    const offResult = this.deps.bus.on('challenge:result', ({ requestId, correct }) => {
      const resolve = this.pendingResults.get(requestId);
      if (!resolve) return;
      this.pendingResults.delete(requestId);
      resolve(correct);
    });
    const offPause = this.deps.bus.on('game:pause', ({ paused }) => this.setFrozen(paused));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      offResult();
      offPause();
    });

    this.loadRoom(this.save.room as RoomId, this.save.x, this.save.y);
  }

  update(time: number): void {
    if (this.frozen) return;
    const k = this.keys;
    const JD = Phaser.Input.Keyboard.JustDown;
    this.player.update(time, {
      left: k.left.isDown || k.a.isDown,
      right: k.right.isDown || k.d.isDown,
      jumpDown: JD(k.jump) || JD(k.up),
      jumpHeld: k.jump.isDown || k.up.isDown,
      attackDown: JD(k.attack),
      dashDown: JD(k.dash),
    });
    const interact = JD(k.interact) && time >= this.interactLockUntil;

    if (this.checkExits()) return;
    if (this.player.rect.y > H + 40) {
      this.damagePlayer(time, 1, this.player.rect.x, true);
      if (this.player.hp > 0) this.player.place(this.entry.x, this.entry.y);
      return;
    }
    this.updateEnemies(time);
    const box = this.player.attackBox(time);
    if (box) {
      this.hitWalls(box);
      this.hitEnemies(box, time);
    }
    this.updateLabels(time);
    if (interact) void this.tryInteract(time);
  }

  // ---- hooks for enemies / boss (Tasks 11–12) ----
  protected buildEnemies(_room: RoomDef): void {}
  protected updateEnemies(_time: number): void {}
  protected hitEnemies(_box: Phaser.Geom.Rectangle, _time: number): void {}
  protected clearEnemies(): void {}
  protected nearInteractables(_time: number): Array<{ id: string; x: number; y: number; run: () => Promise<void> }> {
    return [];
  }

  // ---- rooms ----
  protected loadRoom(id: RoomId, x: number, y: number): void {
    this.clearRoom();
    const room = ROOMS[id];
    this.room = room;
    this.entry = { x, y };
    this.cameras.main.setBackgroundColor(room.bg);

    for (const p of room.platforms) this.addPlatform(p, COLORS.platform);
    for (const w of room.walls ?? []) {
      if (this.save.walls.includes(w.id)) continue;
      const rect = this.addPlatform(w.rect, COLORS.wall);
      this.walls.push({ id: w.id, rect, hits: 0, lastSwing: -1 });
    }
    for (const a of room.altars ?? []) {
      if (this.save.abilities[a.id]) continue;
      const rect = this.track(this.add.rectangle(a.x, 470, 40, 60, COLORS.altar));
      this.altars.push({ id: a.id, rect, label: this.makeLabel(a.x, 420) });
    }
    for (const a of room.amphorae ?? []) {
      if (this.save.amphorae.includes(a.id)) continue;
      const rect = this.track(this.add.rectangle(a.x, a.y - 14, 20, 28, COLORS.amphora));
      this.amphorae.push({ id: a.id, rect, label: this.makeLabel(a.x, a.y - 48) });
    }
    const has = (side: 'left' | 'right') => room.exits.some((e) => e.side === side);
    this.physics.world.setBounds(0, 0, W, H);
    this.physics.world.setBoundsCollision(!has('left'), !has('right'), true, false);
    this.buildEnemies(room); // after the bounds: the boss room overrides them

    this.player.place(x, y);
    this.save.room = id;
    this.save.x = x;
    this.save.y = y;
    this.persist();
    this.emitHud();
  }

  private clearRoom(): void {
    this.clearEnemies();
    this.roomColliders.forEach((c) => c.destroy());
    this.roomColliders = [];
    this.platforms.clear(true, true);
    this.roomObjects.forEach((o) => o.destroy());
    this.roomObjects = [];
    this.walls = [];
    this.altars = [];
    this.amphorae = [];
  }

  private addPlatform(r: Rect, color: number): Phaser.GameObjects.Rectangle {
    const rect = this.add.rectangle(r.x + r.w / 2, r.y + r.h / 2, r.w, r.h, color);
    this.platforms.add(rect);
    return rect;
  }

  protected track<T extends Phaser.GameObjects.GameObject>(obj: T): T {
    this.roomObjects.push(obj);
    return obj;
  }

  protected makeLabel(x: number, y: number): Phaser.GameObjects.Text {
    return this.track(
      this.add.text(x, y, 'E', { fontSize: '16px', color: '#f2e8cf', backgroundColor: '#00000088', padding: { x: 4, y: 1 } })
        .setOrigin(0.5)
        .setDepth(20)
        .setVisible(false),
    );
  }

  private checkExits(): boolean {
    const { x, y } = this.player.rect;
    const side = x < -4 ? 'left' : x > W + 4 ? 'right' : null;
    if (!side) return false;
    const exit = this.room.exits.find((e) => e.side === side && y >= e.yMin && y <= e.yMax);
    if (!exit) {
      this.player.place(side === 'left' ? 12 : W - 12, y);
      return false;
    }
    this.loadRoom(exit.to, exit.toX, exit.toY);
    return true;
  }

  // ---- combat with walls ----
  private hitWalls(box: Phaser.Geom.Rectangle): void {
    for (const w of [...this.walls]) {
      if (w.lastSwing === this.player.swing) continue;
      if (!Phaser.Geom.Intersects.RectangleToRectangle(box, w.rect.getBounds())) continue;
      w.lastSwing = this.player.swing;
      w.hits++;
      this.tweens.add({ targets: w.rect, alpha: 0.4, yoyo: true, duration: 60 });
      if (w.hits >= 3) {
        this.platforms.remove(w.rect, true, true);
        this.walls = this.walls.filter((x) => x !== w);
        this.save.walls.push(w.id);
        this.persist();
        this.toast('wallBroken');
      }
    }
  }

  // ---- interactions ----
  protected isNear(x: number, y: number): boolean {
    return Math.abs(this.player.rect.x - x) < 50 && Math.abs(this.player.rect.y - y) < 60;
  }

  protected ready(id: string, time: number): boolean {
    return (this.cooldowns.get(id) ?? 0) <= time;
  }

  protected coolDown(id: string): void {
    this.cooldowns.set(id, this.time.now + COOLDOWN_MS);
  }

  private updateLabels(time: number): void {
    for (const a of this.altars) a.label.setVisible(this.isNear(a.rect.x, a.rect.y) && this.ready(a.id, time));
    for (const a of this.amphorae) a.label.setVisible(this.isNear(a.rect.x, a.rect.y) && this.ready(a.id, time));
  }

  private async tryInteract(time: number): Promise<void> {
    const altar = this.altars.find((a) => this.isNear(a.rect.x, a.rect.y) && this.ready(a.id, time));
    if (altar) {
      const ok = await this.requestChallenge('altar', altar.id === 'dash' ? 'word' : 'exam');
      if (!ok) return this.coolDown(altar.id);
      this.save.altarProgress[altar.id]++;
      if (this.save.altarProgress[altar.id] >= 3) this.grant(altar);
      else this.toast('altarProgress', String(this.save.altarProgress[altar.id]));
      this.persist();
      return;
    }
    const amph = this.amphorae.find((a) => this.isNear(a.rect.x, a.rect.y) && this.ready(a.id, time));
    if (amph) {
      const ok = await this.requestChallenge('amphora', 'any');
      if (!ok) return this.coolDown(amph.id);
      this.save.amphorae.push(amph.id);
      this.save.maxHp++;
      this.player.maxHp = this.save.maxHp;
      this.player.hp = this.player.maxHp;
      amph.rect.destroy();
      amph.label.destroy();
      this.amphorae = this.amphorae.filter((a) => a !== amph);
      this.persist();
      this.toast('heartUp');
      this.emitHud();
      return;
    }
    const other = this.nearInteractables(time).find((o) => this.isNear(o.x, o.y));
    if (other) await other.run();
  }

  private grant(altar: Altar): void {
    this.save.abilities[altar.id] = true;
    this.player.abilities[altar.id] = true;
    altar.rect.destroy();
    altar.label.destroy();
    this.altars = this.altars.filter((a) => a !== altar);
    this.toast(altar.id === 'dash' ? 'abilityDash' : 'abilityDoubleJump');
    this.emitHud();
  }

  /** Freeze the world, ask the overlay for a challenge, resume with the result. */
  protected requestChallenge(source: ChallengeSource, kind: ChallengeKind | 'any', preferTopics?: string[]): Promise<boolean> {
    const requestId = `r${++this.requestSeq}`;
    this.setFrozen(true);
    return new Promise((resolve) => {
      this.pendingResults.set(requestId, (correct) => {
        this.setFrozen(false);
        resolve(correct);
      });
      this.deps.bus.emit('challenge:request', { requestId, source, kind, preferTopics });
    });
  }

  private setFrozen(frozen: boolean): void {
    this.frozen = frozen;
    const kb = this.input.keyboard!;
    if (frozen) {
      this.physics.pause();
      kb.enabled = false;
    } else {
      this.physics.resume();
      kb.enabled = true;
      kb.resetKeys();
      this.interactLockUntil = this.time.now + 300; // the key that closed the dialog must not re-open one
    }
  }

  // ---- player state ----
  protected damagePlayer(time: number, dmg: number, fromX: number, force = false): void {
    if (force) this.player.hp = Math.max(0, this.player.hp - dmg);
    else if (!this.player.hurt(time, dmg, fromX)) return;
    this.emitHud();
    if (this.player.hp <= 0) this.die();
  }

  private die(): void {
    this.toast('died');
    this.player.hp = this.player.maxHp;
    this.loadRoom(this.save.room as RoomId, this.save.x, this.save.y);
  }

  protected emitHud(): void {
    this.deps.bus.emit('hud:update', {
      hp: this.player.hp,
      maxHp: this.player.maxHp,
      dash: this.save.abilities.dash,
      doubleJump: this.save.abilities.doubleJump,
      room: this.room.id,
    });
  }

  protected toast(key: ToastKey, value?: string): void {
    this.deps.bus.emit('toast', { key, value });
  }

  protected persist(): void {
    this.deps.persist(this.save);
  }
}
```

- [ ] **Step 3: Create `src/world/createGame.ts`**

```ts
import Phaser from 'phaser';
import { GRAVITY, H, W } from './constants';
import { GameScene, type SceneDeps } from './GameScene';

export function createGame(parent: HTMLElement, deps: SceneDeps): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: W,
    height: H,
    backgroundColor: '#1d2a3a',
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: GRAVITY }, debug: false } },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [new GameScene(deps)],
  });
}
```

- [ ] **Step 4: Create `src/ui/GameCanvas.tsx` and use it in `Play.tsx`**

```tsx
import { useEffect, useRef } from 'react';
import { bus } from '../bus';
import { loadSave, writeSave } from '../save';
import { createGame } from '../world/createGame';

export function GameCanvas({ accountId }: { accountId: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const save = loadSave(localStorage, accountId);
    const game = createGame(ref.current!, { bus, save, persist: (s) => writeSave(localStorage, accountId, s) });
    return () => game.destroy(true);
  }, [accountId]);
  return <div ref={ref} className="canvas" />;
}
```

In `src/ui/Play.tsx` replace `<div className="canvas" />` with `<GameCanvas accountId={session.accountId} />` and add `import { GameCanvas } from './GameCanvas';`.

- [ ] **Step 5: Build**

Run: `npm run build && npm test`
Expected: exit 0, all tests PASS.

- [ ] **Step 6: Verify in the browser**

Reload the `game` preview (log in as guest). Check, with screenshots where useful:
- P1 renders: floor, ledge, orange wall at left, red amphora behind it. HUD shows 3 hearts, "Пирей · Гавань" / "Πειραιάς · Λιμάνι", "Сегодня: 0/N".
- A/D moves, Space jumps (cannot clear the wall), J three times on the wall destroys it (toast), E at the amphora opens the dialog; a right answer adds a heart; a wrong one shows the answer and the amphora's "E" disappears for 30 s.
- Walking right goes P2 → K1 → K2; the altar in K2 asks a word question; 3 right answers → toast "рывок", HUD badge.
- K3: the gap cannot be jumped without K; with a mid-air K it can. Falling into the pit costs a heart and returns to the room entry.
- Reload the page: you start in the last room entered, the wall stays broken, the ability stays.
- `read_console_messages` shows no errors.

- [ ] **Step 7: Commit**

```bash
git add telegram-bot/game/src
git commit -m "game: Phaser world with rooms, abilities, walls and amphorae"
```

---

### Task 11: Enemies — slime and shield-bearer

**Files:**
- Create: `src/world/enemies.ts`, `src/world/WorldScene.ts`
- Modify: `src/world/createGame.ts` (use `WorldScene` instead of `GameScene`)

**Interfaces:**
- Consumes: `GameScene` hooks and protected members (`player`, `platforms`, `roomColliders`, `track`, `makeLabel`, `ready`, `coolDown`, `requestChallenge`, `damagePlayer`, `toast`) (Task 10); `COLORS` (Task 7).
- Produces: `class Slime { rect; alive; update(time): void; hit(time, fromX): boolean; destroy(): void }`, `class ShieldBearer { id; rect; alive; shielded; update(time, playerX, showLabel): void; hit(time, fromX): boolean; dropShield(): void; destroy(): void }`, `class WorldScene extends GameScene` (Task 12 extends it with the boss).

- [ ] **Step 1: Create `src/world/enemies.ts`**

```ts
import Phaser from 'phaser';
import { COLORS, FLOOR_Y } from './constants';

type Body = Phaser.Physics.Arcade.Body;

function knock(body: Body, x: number, fromX: number) {
  body.setVelocity((x >= fromX ? 1 : -1) * 180, -150);
}

/** Plain enemy: patrols ±120 px around home, 2 hits. */
export class Slime {
  readonly rect: Phaser.GameObjects.Rectangle;
  private readonly body: Body;
  alive = true;
  private hp = 2;
  private dir = 1;
  private hurtUntil = 0;

  constructor(scene: Phaser.Scene, private readonly home: number) {
    this.rect = scene.add.rectangle(home, FLOOR_Y - 10, 32, 20, COLORS.slime);
    scene.physics.add.existing(this.rect);
    this.body = this.rect.body as Body;
    this.body.setCollideWorldBounds(true);
  }

  update(time: number): void {
    if (!this.alive || time < this.hurtUntil) return;
    if (this.rect.x > this.home + 120 || this.body.blocked.right) this.dir = -1;
    if (this.rect.x < this.home - 120 || this.body.blocked.left) this.dir = 1;
    this.body.setVelocityX(this.dir * 60);
  }

  hit(time: number, fromX: number): boolean {
    if (!this.alive || time < this.hurtUntil) return false;
    this.hurtUntil = time + 250;
    knock(this.body, this.rect.x, fromX);
    if (--this.hp <= 0) this.destroy();
    return true;
  }

  destroy(): void {
    this.alive = false;
    this.rect.destroy();
  }
}

/** Carries a word shield: a right translation drops it (1 hit left), otherwise 4 hits. */
export class ShieldBearer {
  readonly rect: Phaser.GameObjects.Rectangle;
  private readonly body: Body;
  private shield: Phaser.GameObjects.Rectangle | null;
  readonly label: Phaser.GameObjects.Text;
  alive = true;
  shielded = true;
  private hp = 4;
  private facing = -1;
  private hurtUntil = 0;

  constructor(scene: Phaser.Scene, readonly id: string, x: number, label: Phaser.GameObjects.Text) {
    this.rect = scene.add.rectangle(x, FLOOR_Y - 22, 28, 44, COLORS.bearer);
    scene.physics.add.existing(this.rect);
    this.body = this.rect.body as Body;
    this.body.setCollideWorldBounds(true);
    this.shield = scene.add.rectangle(x - 18, FLOOR_Y - 22, 8, 36, COLORS.shield);
    this.label = label;
  }

  update(time: number, playerX: number, showLabel: boolean): void {
    if (!this.alive) return;
    this.facing = playerX < this.rect.x ? -1 : 1;
    const dist = Math.abs(playerX - this.rect.x);
    if (time >= this.hurtUntil) this.body.setVelocityX(dist < 320 && dist > 30 ? this.facing * 40 : 0);
    this.shield?.setPosition(this.rect.x + this.facing * 18, this.rect.y);
    this.label.setPosition(this.rect.x, this.rect.y - 44).setVisible(this.shielded && showLabel);
  }

  hit(time: number, fromX: number): boolean {
    if (!this.alive || time < this.hurtUntil) return false;
    this.hurtUntil = time + 250;
    knock(this.body, this.rect.x, fromX);
    if (--this.hp <= 0) this.destroy();
    return true;
  }

  dropShield(): void {
    this.shielded = false;
    this.hp = 1;
    this.shield?.destroy();
    this.shield = null;
    this.label.setVisible(false);
  }

  destroy(): void {
    this.alive = false;
    this.rect.destroy();
    this.shield?.destroy();
    this.label.setVisible(false);
  }
}
```

- [ ] **Step 2: Create `src/world/WorldScene.ts`**

```ts
import Phaser from 'phaser';
import { GameScene } from './GameScene';
import { ShieldBearer, Slime } from './enemies';
import type { RoomDef } from './rooms';

const overlaps = (a: Phaser.GameObjects.Rectangle, b: Phaser.GameObjects.Rectangle) =>
  Phaser.Geom.Intersects.RectangleToRectangle(a.getBounds(), b.getBounds());

/** GameScene + regular enemies. */
export class WorldScene extends GameScene {
  protected slimes: Slime[] = [];
  protected bearers: ShieldBearer[] = [];

  protected override buildEnemies(room: RoomDef): void {
    for (const e of room.enemies ?? []) {
      if (e.type === 'slime') {
        const s = new Slime(this, e.x);
        this.slimes.push(s);
        this.roomColliders.push(this.physics.add.collider(s.rect, this.platforms));
      } else {
        const b = new ShieldBearer(this, e.id, e.x, this.makeLabel(e.x, 0));
        this.bearers.push(b);
        this.roomColliders.push(this.physics.add.collider(b.rect, this.platforms));
      }
    }
  }

  protected override updateEnemies(time: number): void {
    const p = this.player.rect;
    for (const s of this.slimes) {
      s.update(time);
      if (s.alive && overlaps(s.rect, p)) this.damagePlayer(time, 1, s.rect.x);
    }
    for (const b of this.bearers) {
      b.update(time, p.x, this.isNear(b.rect.x, b.rect.y) && this.ready(b.id, time));
      if (b.alive && overlaps(b.rect, p)) this.damagePlayer(time, 1, b.rect.x);
    }
  }

  protected override hitEnemies(box: Phaser.Geom.Rectangle, time: number): void {
    const hits = (r: Phaser.GameObjects.Rectangle) => Phaser.Geom.Intersects.RectangleToRectangle(box, r.getBounds());
    for (const s of this.slimes) if (s.alive && hits(s.rect)) s.hit(time, this.player.rect.x);
    for (const b of this.bearers) if (b.alive && hits(b.rect)) b.hit(time, this.player.rect.x);
  }

  protected override nearInteractables(time: number) {
    return this.bearers
      .filter((b) => b.alive && b.shielded && this.ready(b.id, time))
      .map((b) => ({
        id: b.id,
        x: b.rect.x,
        y: b.rect.y,
        run: async () => {
          const ok = await this.requestChallenge('shield', 'word');
          if (ok) {
            b.dropShield();
            this.toast('shieldDown');
          } else {
            this.coolDown(b.id);
          }
        },
      }));
  }

  protected override clearEnemies(): void {
    this.slimes.forEach((s) => s.alive && s.destroy());
    this.bearers.forEach((b) => b.alive && b.destroy());
    this.slimes = [];
    this.bearers = [];
  }
}
```

Note: `makeLabel()` already tracks the text object, so `clearRoom` destroys it; `ShieldBearer.destroy` only hides it.

- [ ] **Step 3: Switch `createGame.ts` to `WorldScene`**

Replace `import { GameScene, type SceneDeps } from './GameScene';` with:
```ts
import type { SceneDeps } from './GameScene';
import { WorldScene } from './WorldScene';
```
and `scene: [new GameScene(deps)]` with `scene: [new WorldScene(deps)]`.

- [ ] **Step 4: Build and test**

Run: `npm run build && npm test`
Expected: exit 0, all PASS.

- [ ] **Step 5: Verify in the browser**

Reload the preview. Check:
- P2: two slimes patrol; touching one costs a heart with knock-back and a blink; two sword hits kill a slime.
- A1 (reach it with the dash; for a quick check set the save in the console: `localStorage.setItem('hs_game_save_<id>', ...)` with `room: 'A1'` and `abilities.dash: true`): the shield-bearer walks toward you; "E" appears when close; a right translation drops the shield (toast) and one hit kills it; a wrong one keeps the shield and the "E" hides for 30 s; four hits kill a shielded bearer.
- Leaving and re-entering a room respawns enemies. No console errors.

- [ ] **Step 6: Commit**

```bash
git add telegram-bot/game/src/world
git commit -m "game: slime and shield-bearer enemies"
```

---

### Task 12: Boss — the Sphinx

**Files:**
- Create: `src/world/Sphinx.ts`, `src/world/BossScene.ts`
- Modify: `src/world/createGame.ts` (use `BossScene`)

**Interfaces:**
- Consumes: `WorldScene` (Task 11) and its protected members; `COLORS`, `FLOOR_Y`, `W` (Task 7); bus event `boss:defeated` (Task 1).
- Produces: `class Sphinx { rect; hp; maxHp; state: 'fight' | 'quiz' | 'dead'; shots: Phaser.GameObjects.Rectangle[]; update(time, playerX): void; hit(time): void; quizDamage(): void; endQuiz(): void; destroy(): void }`, `class BossScene extends WorldScene`.

- [ ] **Step 1: Create `src/world/Sphinx.ts`**

```ts
import Phaser from 'phaser';
import { COLORS, FLOOR_Y, W } from './constants';

type Body = Phaser.Physics.Arcade.Body;
export type SphinxState = 'fight' | 'quiz' | 'dead';

/** 30 HP, 3 stages. Quiz breaks at 20 and 10 HP; each right answer there removes 3 HP. */
export class Sphinx {
  readonly rect: Phaser.GameObjects.Rectangle;
  private readonly body: Body;
  readonly maxHp = 30;
  hp = 30;
  state: SphinxState = 'fight';
  shots: Phaser.GameObjects.Rectangle[] = [];
  private stage = 1;
  private nextLeapAt = 0;
  private nextShotAt = 0;
  private hurtUntil = 0;

  constructor(private readonly scene: Phaser.Scene, x: number) {
    this.rect = scene.add.rectangle(x, FLOOR_Y - 50, 80, 100, COLORS.sphinx);
    scene.physics.add.existing(this.rect);
    this.body = this.rect.body as Body;
    this.body.setCollideWorldBounds(true);
  }

  update(time: number, playerX: number): void {
    this.shots = this.shots.filter((s) => {
      if (s.x > -20 && s.x < W + 20) return true;
      s.destroy();
      return false;
    });
    if (this.state !== 'fight') {
      this.body.setVelocityX(0);
      return;
    }
    const dir = playerX < this.rect.x ? -1 : 1;
    if (this.body.blocked.down) {
      this.body.setVelocityX(0);
      if (time >= this.nextLeapAt) {
        this.body.setVelocity(dir * (160 + 40 * this.stage), -520);
        this.nextLeapAt = time + 2000 - 400 * (this.stage - 1);
      }
    }
    if (this.stage >= 2 && time >= this.nextShotAt) {
      const shot = this.scene.add.rectangle(this.rect.x, this.rect.y + 20, 16, 8, COLORS.shot);
      this.scene.physics.add.existing(shot);
      const b = shot.body as Body;
      b.setAllowGravity(false);
      b.setVelocityX(dir * 260);
      this.shots.push(shot);
      this.nextShotAt = time + 1500;
    }
  }

  hit(time: number): void {
    if (this.state !== 'fight' || time < this.hurtUntil) return;
    this.hurtUntil = time + 200;
    this.hp = Math.max(0, this.hp - 1);
    this.scene.tweens.add({ targets: this.rect, alpha: 0.4, yoyo: true, duration: 60 });
    if (this.hp <= 0) this.state = 'dead';
    else if ((this.stage === 1 && this.hp <= 20) || (this.stage === 2 && this.hp <= 10)) this.state = 'quiz';
  }

  quizDamage(): void {
    this.hp = Math.max(0, this.hp - 3);
  }

  endQuiz(): void {
    if (this.hp <= 0) {
      this.state = 'dead';
      return;
    }
    this.stage++;
    this.state = 'fight';
  }

  destroy(): void {
    this.shots.forEach((s) => s.destroy());
    this.shots = [];
    this.rect.destroy();
  }
}
```

- [ ] **Step 2: Create `src/world/BossScene.ts`**

```ts
import Phaser from 'phaser';
import { W } from './constants';
import type { RoomDef } from './rooms';
import { Sphinx } from './Sphinx';
import { WorldScene } from './WorldScene';

const BAR_W = 400;

/** WorldScene + the Sphinx fight in the Parthenon. */
export class BossScene extends WorldScene {
  private sphinx: Sphinx | null = null;
  private barFill: Phaser.GameObjects.Rectangle | null = null;
  private quizRunning = false;

  protected override buildEnemies(room: RoomDef): void {
    super.buildEnemies(room);
    if (!room.boss || this.save.bossDefeated) return;
    const sphinx = new Sphinx(this, room.boss.x);
    this.sphinx = sphinx;
    this.roomColliders.push(this.physics.add.collider(sphinx.rect, this.platforms));
    this.track(this.add.rectangle(W / 2 - BAR_W / 2, 24, BAR_W, 10, 0x000000, 0.5).setOrigin(0, 0.5).setDepth(30));
    this.barFill = this.track(this.add.rectangle(W / 2 - BAR_W / 2, 24, BAR_W, 10, 0x8e6bbf).setOrigin(0, 0.5).setDepth(31));
    // No running away mid-fight.
    this.physics.world.setBoundsCollision(true, true, true, false);
  }

  protected override updateEnemies(time: number): void {
    super.updateEnemies(time);
    const sphinx = this.sphinx;
    if (!sphinx) return;
    sphinx.update(time, this.player.rect.x);
    const p = this.player.rect.getBounds();
    if (sphinx.state === 'fight') {
      if (Phaser.Geom.Intersects.RectangleToRectangle(sphinx.rect.getBounds(), p)) this.damagePlayer(time, 1, sphinx.rect.x);
      for (const s of sphinx.shots) {
        if (Phaser.Geom.Intersects.RectangleToRectangle(s.getBounds(), p)) this.damagePlayer(time, 1, s.x);
      }
    }
    this.barFill?.setSize((BAR_W * sphinx.hp) / sphinx.maxHp, 10);
    if (sphinx.state === 'quiz' && !this.quizRunning) void this.runQuiz(sphinx);
    if (sphinx.state === 'dead') this.defeat(sphinx);
  }

  protected override hitEnemies(box: Phaser.Geom.Rectangle, time: number): void {
    super.hitEnemies(box, time);
    if (this.sphinx && Phaser.Geom.Intersects.RectangleToRectangle(box, this.sphinx.rect.getBounds())) this.sphinx.hit(time);
  }

  protected override clearEnemies(): void {
    super.clearEnemies();
    this.sphinx?.destroy();
    this.sphinx = null;
    this.barFill = null;
    this.quizRunning = false;
  }

  /** Three exam questions between phases, history and laws first. */
  private async runQuiz(sphinx: Sphinx): Promise<void> {
    this.quizRunning = true;
    for (let i = 0; i < 3 && sphinx.hp > 0; i++) {
      const ok = await this.requestChallenge('boss', 'exam', ['history', 'laws']);
      if (this.sphinx !== sphinx) return; // the room changed under us (death)
      if (ok) sphinx.quizDamage();
    }
    sphinx.endQuiz();
    this.quizRunning = false;
  }

  private defeat(sphinx: Sphinx): void {
    sphinx.destroy();
    this.sphinx = null;
    this.barFill?.setVisible(false);
    this.save.bossDefeated = true;
    this.persist();
    this.physics.world.setBoundsCollision(false, true, true, false);
    this.deps.bus.emit('boss:defeated', { room: this.room.id });
  }
}
```

- [ ] **Step 3: Switch `createGame.ts` to `BossScene`**

Replace `import { WorldScene } from './WorldScene';` with `import { BossScene } from './BossScene';` and `new WorldScene(deps)` with `new BossScene(deps)`.

- [ ] **Step 4: Build and test**

Run: `npm run build && npm test`
Expected: exit 0, all PASS.

- [ ] **Step 5: Verify in the browser**

Set a save in R2 with both abilities (console: edit `hs_game_save_<id>` → `room: 'R2', x: 120, y: 470, abilities: {dash: true, doubleJump: true}`), reload. Check:
- Boss bar appears; the Sphinx leaps toward you; contact costs a heart; the left edge is blocked.
- At 20 HP the fight freezes and 3 exam questions follow; right answers shrink the bar by 3 each; the fight resumes faster and with orange shots.
- Second break at 10 HP; at 0 HP the Victory overlay shows "Сфинкс повержен!" with today's count. Reload: the boss does not come back.
- Dying in R2 resets the fight (boss at full HP). No console errors.

- [ ] **Step 6: Commit**

```bash
git add telegram-bot/game/src/world
git commit -m "game: Sphinx boss with quiz phases"
```

---

### Task 13: Full play-through check and Tauri .exe

**Files:**
- Create: `src-tauri/` (generated by `tauri init`), `README.md`
- Modify: `src-tauri/tauri.conf.json`

**Interfaces:**
- Consumes: the built `dist/` from all previous tasks.
- Produces: `src-tauri/target/release/hellas-quest.exe` and an installer under `src-tauri/target/release/bundle/`.

- [ ] **Step 1: Play the whole slice in the browser**

Clear the save (`localStorage.removeItem('hs_game_save_<id>')`), reload, and play P1 → R2 without console edits: wall + amphora in P1, slimes in P2, dash altar in K2, gap in K3, shield-bearer in A1, double-jump altar + amphora in A2, wall in A3, back to P2 and K1 for the two high amphorae, then R1 and the boss. Note anything that blocks progress and fix it before packaging (adjust room numbers in `rooms.ts`; the rooms test must still pass).

- [ ] **Step 2: Check the Rust toolchain**

Run: `cargo --version`
Expected: a version line. If the command is missing, STOP and ask the user to install Rust from https://rustup.rs (default options, which also pull the MSVC build tools) and restart the terminal; WebView2 ships with Windows 11. Do not download or run installers on the user's behalf.

- [ ] **Step 3: Add the Tauri CLI and initialise**

Run (in `telegram-bot/game`):
```bash
npm install -D @tauri-apps/cli@^2
npx tauri init --ci --app-name "Hellas Quest" --window-title "Hellas Quest" --frontend-dist ../dist --dev-url http://localhost:5174 --before-dev-command "npm run dev" --before-build-command "npm run build"
```
Expected: `src-tauri/` created with `tauri.conf.json`, `Cargo.toml`, `src/main.rs`, `icons/`, and its own `.gitignore` containing `/target`.

- [ ] **Step 4: Edit `src-tauri/tauri.conf.json`**

Set these fields (leave the rest as generated):
```json
{
  "productName": "Hellas Quest",
  "identifier": "com.hellas.quest",
  "app": {
    "windows": [
      { "title": "Hellas Quest", "width": 1280, "height": 720, "minWidth": 960, "minHeight": 540, "resizable": true, "center": true }
    ]
  }
}
```

- [ ] **Step 5: Build the exe**

Run: `npm run tauri build`
Expected: exit 0 (first build compiles Rust crates, several minutes); `src-tauri/target/release/hellas-quest.exe` (or `Hellas Quest.exe`) exists, plus `bundle/nsis/*.exe` and/or `bundle/msi/*.msi`.

- [ ] **Step 6: Smoke-test the exe**

Launch the release exe. Check: window opens at 1280x720; login screen; sign in (the user types their own credentials) or play as guest; loading → P1; an altar or amphora question opens and is graded (`/api/flashcards/grade` or `/api/vocab/grade` shows up as progress in the web app afterwards); F11 toggles fullscreen; closing and reopening keeps the save.

- [ ] **Step 7: Write `README.md`**

```markdown
# Hellas Quest

Side-view metroidvania that drills Greek words and exam questions from the same SRS queue as the web app.

- Dev: `npm run dev` → http://localhost:5174 (uses `../webapp/.env`)
- Tests: `npm test`
- Exe: `npm run tauri build` → `src-tauri/target/release/` (needs Rust from rustup.rs)

Controls: A/D move · Space jump · J attack · K dash · E interact · 1–4 answer · Esc pause · F11 fullscreen.
Design: `docs/superpowers/specs/2026-10-05-metroidvania-game-design.md`.
```

- [ ] **Step 8: Commit**

```bash
git add telegram-bot/game/package.json telegram-bot/game/package-lock.json telegram-bot/game/src-tauri telegram-bot/game/README.md
git commit -m "game: Tauri desktop build"
```
