import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// grade: 1=Again, 2=Good, 3=Easy
// Accepts boolean for backward compat with Quiz.tsx (true→2, false→1)
//
// NOTE: The DB currently has the binary upsert_progress(p_correct boolean).
// Until supabase/migrations/20260227000000_srs_grades.sql is applied, grades
// 1 (Again) map to p_correct=false and grades 2/3 (Good/Easy) map to
// p_correct=true.  The 3-grade interval logic will activate automatically
// once the migration runs — no code change needed.
export async function upsertProgress(
  userId: string,
  questionId: string,
  gradeOrCorrect: 1 | 2 | 3 | boolean,
) {
  const grade = typeof gradeOrCorrect === 'boolean'
    ? (gradeOrCorrect ? 2 : 1)
    : gradeOrCorrect;

  // Grade 1 = Again (incorrect); Grade 2/3 = Good/Easy (correct)
  const pCorrect = grade !== 1;

  const { error } = await supabase.rpc('upsert_progress', {
    p_user_id: userId,
    p_question_id: questionId,
    p_correct: pCorrect,
  });
  if (error) {
    console.error('Error saving progress:', error);
    toast.error('Ошибка записи прогресса', { description: error.message });
  }
}
