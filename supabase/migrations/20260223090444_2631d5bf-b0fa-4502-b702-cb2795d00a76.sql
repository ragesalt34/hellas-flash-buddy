
-- Add unique constraint for upsert logic
ALTER TABLE public.user_progress ADD CONSTRAINT user_progress_user_question_unique UNIQUE (user_id, question_id);

-- Create upsert_progress RPC function
CREATE OR REPLACE FUNCTION public.upsert_progress(
  p_user_id uuid,
  p_question_id uuid,
  p_correct boolean,
  p_known boolean default null
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_progress (user_id, question_id, correct_count, incorrect_count, is_known, last_reviewed_at)
  VALUES (
    p_user_id,
    p_question_id,
    CASE WHEN p_correct THEN 1 ELSE 0 END,
    CASE WHEN p_correct THEN 0 ELSE 1 END,
    COALESCE(p_known, false),
    now()
  )
  ON CONFLICT (user_id, question_id) DO UPDATE SET
    correct_count = user_progress.correct_count + CASE WHEN p_correct THEN 1 ELSE 0 END,
    incorrect_count = user_progress.incorrect_count + CASE WHEN p_correct THEN 0 ELSE 1 END,
    is_known = CASE WHEN p_known IS NOT NULL THEN p_known ELSE user_progress.is_known END,
    last_reviewed_at = now(),
    updated_at = now();
END;
$$;
