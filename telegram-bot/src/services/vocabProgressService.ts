import { supabase } from '../supabase';
import { nextLevel, nextReviewAt } from '../srs';

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
  const seen = new Map<number, { due: number; level: number }>();
  for (const r of (data ?? []) as Row[]) {
    seen.set(r.vocab_id, {
      due: r.next_review_at ? Date.parse(r.next_review_at) : 0,
      level: r.level ?? 0,
    });
  }

  const due: { id: number; level: number }[] = [];
  const unseen: { id: number; level: number }[] = [];
  for (const id of allIds) {
    const s = seen.get(id);
    if (!s) unseen.push({ id, level: 0 });
    else if (s.due <= now) due.push({ id, level: s.level });
  }

  const result = [...due];
  if (result.length < limit) result.push(...shuffle(unseen).slice(0, limit - result.length));
  return result.slice(0, limit);
}

export async function gradeVocab(accountId: string, vocabId: number, grade: number): Promise<void> {
  const { data } = await supabase
    .from('vocab_progress')
    .select('level')
    .eq('account_id', accountId)
    .eq('vocab_id', vocabId)
    .maybeSingle();

  const level = nextLevel((data as { level: number } | null)?.level ?? 0, grade);
  const { error } = await supabase.from('vocab_progress').upsert(
    {
      account_id: accountId,
      vocab_id: vocabId,
      level,
      next_review_at: nextReviewAt(level),
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
