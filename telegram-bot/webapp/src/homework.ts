/* Homework sets live in this browser (localStorage), not in the database: the
 * tutor's notes are personal, and a new table would need a migration. The cost
 * is that a set does not follow the account to another device. */

export type HwStatus = 'correct' | 'almost' | 'wrong';

export interface HwItem {
  id: string;
  question: string;
  answer: string; // the tutor's model answer, may be empty
  note: string; // the tutor's remarks
  status?: HwStatus;
}

export interface HwSet {
  id: string;
  title: string;
  createdAt: number;
  items: HwItem[];
}

const KEY = 'hs_homework_v1';

export function loadSets(): HwSet[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(v) ? (v as HwSet[]) : [];
  } catch {
    return [];
  }
}

export function saveSets(sets: HwSet[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(sets));
  } catch {
    /* private mode / quota: the session still works, it just will not persist */
  }
}

export const newId = (): string => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
