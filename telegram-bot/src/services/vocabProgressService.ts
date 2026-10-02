import { supabase } from '../supabase';
import { isDueAt, reviewStep } from '../srs';

// Vocabulary items live in code (data/vocabulary.ts); only per-account SRS
// progress is stored here, in the durable `vocab_progress` table.

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

interface Row {
  vocab_id: number;
  level: number;
  next_review_at: string | null;
}

export async function getDueVocab(
  accountId: string,
  allIds: number[],
  limit: number
): Promise<{ id: number; level: number }[]> {
  const { data, error } = await supabase
    .from('vocab_progress')
    .select('vocab_id, level, next_review_at')
    .eq('account_id', accountId);
  if (error) throw error;

  const now = Date.now();
  const seen = new Map<number, { at: string | null; due: number; level: number }>();
  for (const r of (data ?? []) as Row[]) {
    // Sort key: a missing or unparseable time counts as due (isDueAt) and sorts
    // first, as the most overdue.
    const parsed = r.next_review_at ? Date.parse(r.next_review_at) : NaN;
    seen.set(r.vocab_id, {
      at: r.next_review_at,
      due: Number.isNaN(parsed) ? 0 : parsed,
      level: r.level ?? 0,
    });
  }

  const due: { id: number; level: number; due: number }[] = [];
  const unseen: { id: number; level: number }[] = [];
  for (const id of allIds) {
    const s = seen.get(id);
    if (!s) unseen.push({ id, level: 0 });
    else if (isDueAt(s.at, now)) due.push({ id, level: s.level, due: s.due });
  }

  // Most overdue first — otherwise the slice below took an arbitrary subset
  // whenever more words were due than the limit allows.
  due.sort((a, b) => a.due - b.due);

  const result: { id: number; level: number }[] = due.map(({ id, level }) => ({ id, level }));
  if (result.length < limit) result.push(...shuffle(unseen).slice(0, limit - result.length));
  return result.slice(0, limit);
}

export async function gradeVocab(accountId: string, vocabId: number, grade: number): Promise<void> {
  // Same guard as questions: a failed read must not reset the word to level 0.
  const { data, error: readError } = await supabase
    .from('vocab_progress')
    .select('level, next_review_at')
    .eq('account_id', accountId)
    .eq('vocab_id', vocabId)
    .maybeSingle();
  if (readError) throw readError;

  const step = reviewStep(data as { level: number; next_review_at: string | null } | null, grade);
  const { error } = await supabase.from('vocab_progress').upsert(
    {
      account_id: accountId,
      vocab_id: vocabId,
      level: step.level,
      next_review_at: step.next_review_at,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'account_id,vocab_id' }
  );
  if (error) throw error;
}

export async function getVocabStats(
  accountId: string,
  allIds: number[]
): Promise<{ seen: number; mastered: number; total: number }> {
  const { data, error } = await supabase
    .from('vocab_progress')
    .select('vocab_id, level')
    .eq('account_id', accountId);
  if (error) throw error;

  const rows = (data ?? []) as { vocab_id: number; level: number }[];
  const seenIds = new Set(rows.map((r) => r.vocab_id));
  const seen = allIds.filter((id) => seenIds.has(id)).length;
  const mastered = rows.filter((r) => r.level >= 4 && allIds.includes(r.vocab_id)).length;
  return { seen, mastered, total: allIds.length };
}
