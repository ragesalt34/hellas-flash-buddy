import { supabase } from '../supabase';

/* Optional columns the owner adds by SQL (see docs/superpowers/specs/
   2026-10-02-daily-plan-design.md):
     question_progress.first_seen_el_at  — first answer/grade in Greek
     vocab_progress.first_seen_at        — first time the word was graded
   Until they exist every read and write must work without them, so their
   presence is probed once and cached; a negative answer is re-checked every few
   minutes, so the feature switches on after the SQL without a restart. */

const RECHECK_MS = 5 * 60 * 1000;
const cache = new Map<string, { ok: boolean; at: number }>();

export async function hasColumn(table: 'question_progress' | 'vocab_progress', column: string): Promise<boolean> {
  const key = `${table}.${column}`;
  const hit = cache.get(key);
  if (hit && (hit.ok || Date.now() - hit.at < RECHECK_MS)) return hit.ok;
  const { error } = await supabase.from(table).select(column).limit(1);
  const ok = !error;
  cache.set(key, { ok, at: Date.now() });
  return ok;
}
