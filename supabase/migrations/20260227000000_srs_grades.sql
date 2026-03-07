-- Update upsert_progress to support 3-grade SRS (Again=1, Good=2, Easy=3)
-- Backward compat: callers still passing p_correct boolean continue to work
-- (p_correct true → grade 2, p_correct false → grade 1)

-- Drop old fixed-signature version so we can replace with new optional-param signature
DROP FUNCTION IF EXISTS public.upsert_progress(uuid, uuid, boolean, boolean);
DROP FUNCTION IF EXISTS public.upsert_progress(uuid, uuid, boolean);

CREATE OR REPLACE FUNCTION public.upsert_progress(
  p_user_id     uuid,
  p_question_id uuid,
  p_grade       integer  DEFAULT NULL, -- 1=Again, 2=Good, 3=Easy; NULL → fall back to p_correct
  p_correct     boolean  DEFAULT NULL, -- legacy compat: used when p_grade IS NULL
  p_known       boolean  DEFAULT NULL  -- legacy (unused)
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_prev_correct   INTEGER;
  v_prev_incorrect INTEGER;
  v_new_correct    INTEGER;
  v_new_incorrect  INTEGER;
  v_next_review    TIMESTAMPTZ;
  v_is_known       BOOLEAN;
  v_grade          INTEGER;
BEGIN
  -- Resolve effective grade (support legacy p_correct boolean callers)
  v_grade := CASE
    WHEN p_grade IS NOT NULL THEN p_grade
    WHEN p_correct IS TRUE   THEN 2
    WHEN p_correct IS FALSE  THEN 1
    ELSE 2
  END;

  -- Read existing counts (NULL if first answer)
  SELECT correct_count, incorrect_count
  INTO   v_prev_correct, v_prev_incorrect
  FROM   public.user_progress
  WHERE  user_id = p_user_id AND question_id = p_question_id;

  v_prev_correct   := COALESCE(v_prev_correct, 0);
  v_prev_incorrect := COALESCE(v_prev_incorrect, 0);

  -- Compute new counts and next review interval based on grade
  IF v_grade = 1 THEN
    -- Again: incorrect, review in ~10 min (comes back in same/next session)
    v_new_correct   := v_prev_correct;
    v_new_incorrect := v_prev_incorrect + 1;
    v_next_review   := now() + INTERVAL '10 minutes';

  ELSIF v_grade = 2 THEN
    -- Good: correct, normal SM-2-style intervals
    v_new_correct   := v_prev_correct + 1;
    v_new_incorrect := v_prev_incorrect;
    IF v_prev_incorrect > v_new_correct THEN
      v_next_review := now() + INTERVAL '1 day';
    ELSIF v_new_correct <= 1 THEN
      v_next_review := now() + INTERVAL '1 day';
    ELSIF v_new_correct <= 2 THEN
      v_next_review := now() + INTERVAL '3 days';
    ELSIF v_new_correct <= 4 THEN
      v_next_review := now() + INTERVAL '7 days';
    ELSE
      v_next_review := now() + INTERVAL '14 days';
    END IF;

  ELSE
    -- Easy (grade 3): correct, accelerated intervals (skip tiers)
    v_new_correct   := v_prev_correct + 1;
    v_new_incorrect := v_prev_incorrect;
    IF v_new_correct <= 1 THEN
      v_next_review := now() + INTERVAL '4 days';
    ELSIF v_new_correct <= 2 THEN
      v_next_review := now() + INTERVAL '7 days';
    ELSIF v_new_correct <= 4 THEN
      v_next_review := now() + INTERVAL '14 days';
    ELSE
      v_next_review := now() + INTERVAL '21 days';
    END IF;
  END IF;

  -- is_known: clearly mastered (≥3 correct AND correct ≥ incorrect × 2)
  v_is_known := v_new_correct >= 3 AND v_new_correct >= v_new_incorrect * 2;

  INSERT INTO public.user_progress (
    user_id, question_id,
    correct_count, incorrect_count,
    is_known, last_reviewed_at, next_review_at
  )
  VALUES (
    p_user_id, p_question_id,
    v_new_correct,
    v_new_incorrect,
    v_is_known,
    now(),
    v_next_review
  )
  ON CONFLICT (user_id, question_id) DO UPDATE SET
    correct_count    = v_new_correct,
    incorrect_count  = v_new_incorrect,
    is_known         = v_is_known,
    last_reviewed_at = now(),
    next_review_at   = v_next_review,
    updated_at       = now();
END;
$$;
