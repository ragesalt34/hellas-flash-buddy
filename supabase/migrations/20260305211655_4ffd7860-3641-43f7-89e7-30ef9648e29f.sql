
-- Fix: Add ownership check to upsert_progress to prevent cross-user progress manipulation
CREATE OR REPLACE FUNCTION public.upsert_progress(p_user_id uuid, p_question_id uuid, p_correct boolean, p_known boolean DEFAULT NULL::boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_correct_count   INTEGER;
  v_incorrect_count INTEGER;
  v_new_correct     INTEGER;
  v_new_incorrect   INTEGER;
  v_next_review     TIMESTAMPTZ;
  v_is_known        BOOLEAN;
BEGIN
  -- Ownership guard: only the authenticated user can update their own progress
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT correct_count, incorrect_count
  INTO   v_correct_count, v_incorrect_count
  FROM   public.user_progress
  WHERE  user_id = p_user_id AND question_id = p_question_id;

  v_new_correct   := COALESCE(v_correct_count, 0)   + CASE WHEN p_correct THEN 1 ELSE 0 END;
  v_new_incorrect := COALESCE(v_incorrect_count, 0) + CASE WHEN p_correct THEN 0 ELSE 1 END;

  IF NOT p_correct OR v_new_incorrect > v_new_correct THEN
    v_next_review := now() + INTERVAL '1 day';
  ELSIF v_new_correct = 1 THEN
    v_next_review := now() + INTERVAL '1 day';
  ELSIF v_new_correct = 2 THEN
    v_next_review := now() + INTERVAL '3 days';
  ELSIF v_new_correct <= 4 THEN
    v_next_review := now() + INTERVAL '7 days';
  ELSE
    v_next_review := now() + INTERVAL '14 days';
  END IF;

  v_is_known := v_new_correct >= 3 AND v_new_correct >= v_new_incorrect * 2;

  INSERT INTO public.user_progress (
    user_id, question_id, correct_count, incorrect_count,
    is_known, last_reviewed_at, next_review_at
  ) VALUES (
    p_user_id, p_question_id,
    CASE WHEN p_correct THEN 1 ELSE 0 END,
    CASE WHEN p_correct THEN 0 ELSE 1 END,
    v_is_known, now(), v_next_review
  )
  ON CONFLICT (user_id, question_id) DO UPDATE SET
    correct_count    = v_new_correct,
    incorrect_count  = v_new_incorrect,
    is_known         = v_is_known,
    last_reviewed_at = now(),
    next_review_at   = v_next_review,
    updated_at       = now();
END;
$function$;
