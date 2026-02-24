-- Add next_review_at column for spaced repetition
ALTER TABLE public.user_progress
  ADD COLUMN IF NOT EXISTS next_review_at TIMESTAMPTZ;

-- Back-fill existing rows: compute next_review_at from last_reviewed_at + performance
UPDATE public.user_progress
SET next_review_at = CASE
  WHEN incorrect_count > correct_count          THEN now()                                        -- still struggling → due now
  WHEN correct_count = 0                        THEN now()                                        -- never answered correctly → due now
  WHEN correct_count = 1                        THEN COALESCE(last_reviewed_at, now()) + INTERVAL '1 day'
  WHEN correct_count = 2                        THEN COALESCE(last_reviewed_at, now()) + INTERVAL '3 days'
  WHEN correct_count BETWEEN 3 AND 4            THEN COALESCE(last_reviewed_at, now()) + INTERVAL '7 days'
  ELSE                                               COALESCE(last_reviewed_at, now()) + INTERVAL '14 days'
END
WHERE next_review_at IS NULL;

-- Update upsert_progress: add spaced-repetition interval + computed is_known
CREATE OR REPLACE FUNCTION public.upsert_progress(
  p_user_id     uuid,
  p_question_id uuid,
  p_correct     boolean,
  p_known       boolean DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_correct_count   INTEGER := 0;
  v_incorrect_count INTEGER := 0;
  v_new_correct     INTEGER;
  v_new_incorrect   INTEGER;
  v_next_review     TIMESTAMPTZ;
  v_is_known        BOOLEAN;
BEGIN
  -- Read existing counts (NULL if first answer)
  SELECT correct_count, incorrect_count
  INTO   v_correct_count, v_incorrect_count
  FROM   public.user_progress
  WHERE  user_id = p_user_id AND question_id = p_question_id;

  -- New running totals
  v_new_correct   := v_correct_count   + CASE WHEN p_correct THEN 1 ELSE 0 END;
  v_new_incorrect := v_incorrect_count + CASE WHEN p_correct THEN 0 ELSE 1 END;

  -- Simplified SRS intervals:
  --   wrong answer, OR still more errors than correct → review tomorrow
  --   1 correct  → +1 day
  --   2 correct  → +3 days
  --   3–4 correct → +7 days
  --   5+ correct  → +14 days
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

  -- is_known: only when clearly mastered (≥3 correct AND correct ≥ incorrect × 2)
  v_is_known := v_new_correct >= 3 AND v_new_correct >= v_new_incorrect * 2;

  INSERT INTO public.user_progress (
    user_id, question_id,
    correct_count, incorrect_count,
    is_known, last_reviewed_at, next_review_at
  )
  VALUES (
    p_user_id, p_question_id,
    CASE WHEN p_correct THEN 1 ELSE 0 END,
    CASE WHEN p_correct THEN 0 ELSE 1 END,
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
