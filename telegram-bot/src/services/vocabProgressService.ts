import fs from 'fs';
import path from 'path';

const PROGRESS_FILE = path.join(__dirname, '..', '..', 'vocab_progress.json');

interface WordProgress {
  level: number;       // SRS level 0–6
  nextReview: number;  // Unix timestamp ms
}

// userId → vocabId → progress
type ProgressStore = Record<string, Record<number, WordProgress>>;

const SRS_INTERVALS_MS = [
  1 * 60 * 1000,              // level 0 → 1 min
  10 * 60 * 1000,             // level 1 → 10 min
  24 * 60 * 60 * 1000,        // level 2 → 1 day
  3 * 24 * 60 * 60 * 1000,   // level 3 → 3 days
  7 * 24 * 60 * 60 * 1000,   // level 4 → 7 days
  14 * 24 * 60 * 60 * 1000,  // level 5 → 14 days
  30 * 24 * 60 * 60 * 1000,  // level 6 → 30 days
];

let store: ProgressStore = {};

function load(): void {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      store = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
    }
  } catch (err) {
    // Corrupt/partial file (e.g. process hard-killed mid-write). Preserve it for
    // recovery instead of silently wiping every user's progress, then start fresh.
    console.error('vocab_progress load failed — backing up corrupt file:', err);
    try {
      fs.renameSync(PROGRESS_FILE, `${PROGRESS_FILE}.corrupt-${Date.now()}`);
    } catch (backupErr) {
      console.error('vocab_progress backup failed:', backupErr);
    }
    store = {};
  }
}

function save(): void {
  // Atomic write: write to a temp file then rename, so a crash mid-write can't
  // truncate/corrupt the live file (rename is atomic on the same filesystem).
  const tmp = `${PROGRESS_FILE}.tmp`;
  try {
    fs.writeFileSync(tmp, JSON.stringify(store), 'utf-8');
    fs.renameSync(tmp, PROGRESS_FILE);
  } catch (err) {
    console.error('vocab_progress save error:', err);
    try {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    } catch {
      /* ignore cleanup failure */
    }
  }
}

load();

/** Fisher–Yates shuffle (kept local so this DB-free service has no heavy deps). */
function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function getDueVocabIds(userId: number, allIds: number[], limit: number): number[] {
  const key = String(userId);
  const progress = store[key] ?? {};
  const now = Date.now();

  const due: number[] = [];
  const unseen: number[] = [];

  for (const id of allIds) {
    const p = progress[id];
    if (!p) {
      unseen.push(id);
    } else if (p.nextReview <= now) {
      due.push(id);
    }
  }

  const result = [...due];
  if (result.length < limit) {
    // shuffle unseen and fill up to limit
    const shuffled = shuffle(unseen);
    result.push(...shuffled.slice(0, limit - result.length));
  }
  return result.slice(0, limit);
}

export function gradeVocab(userId: number, vocabId: number, grade: number): void {
  const key = String(userId);
  if (!store[key]) store[key] = {};

  const current = store[key][vocabId]?.level ?? 0;
  let newLevel: number;
  if (grade === 1) {
    newLevel = 0;
  } else if (grade === 3) {
    newLevel = Math.min(current + 2, SRS_INTERVALS_MS.length - 1);
  } else {
    newLevel = Math.min(current + 1, SRS_INTERVALS_MS.length - 1);
  }

  store[key][vocabId] = {
    level: newLevel,
    nextReview: Date.now() + SRS_INTERVALS_MS[newLevel],
  };
  save();
}

export function getVocabStats(userId: number, allIds: number[]): { seen: number; mastered: number; total: number } {
  const key = String(userId);
  const progress = store[key] ?? {};
  const seen = allIds.filter(id => !!progress[id]).length;
  const mastered = allIds.filter(id => (progress[id]?.level ?? 0) >= 4).length;
  return { seen, mastered, total: allIds.length };
}
