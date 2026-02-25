import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export async function upsertProgress(
  userId: string,
  questionId: string,
  correct: boolean,
  known?: boolean
) {
  const { error } = await supabase.rpc('upsert_progress', {
    p_user_id: userId,
    p_question_id: questionId,
    p_correct: correct,
    p_known: known ?? null,
  });
  if (error) {
    console.error('Error saving progress:', error);
    toast.error('Ошибка записи прогресса', { description: error.message });
  }
}
