import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// grade: 1=Again, 2=Good, 3=Easy
// Backward compat: boolean true→2 (Good), false→1 (Again)
export async function upsertProgress(
  userId: string,
  questionId: string,
  gradeOrCorrect: 1 | 2 | 3 | boolean,
) {
  const grade = typeof gradeOrCorrect === 'boolean'
    ? (gradeOrCorrect ? 2 : 1)
    : gradeOrCorrect;

  const { error } = await supabase.rpc('upsert_progress', {
    p_user_id: userId,
    p_question_id: questionId,
    p_grade: grade,
  });
  if (error) {
    console.error('Error saving progress:', error);
    toast.error('Ошибка записи прогресса', { description: error.message });
  }
}
