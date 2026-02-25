-- RLS DELETE policies for tables that were missing them

-- study_sessions: RLS was enabled but DELETE policy was missing
CREATE POLICY "Users can delete their own sessions"
ON public.study_sessions FOR DELETE
USING (auth.uid() = user_id);

-- user_progress: add DELETE policy (RLS is enabled on this table)
CREATE POLICY "Users can delete their own progress"
ON public.user_progress FOR DELETE
USING (auth.uid() = user_id);

-- exam_results: add DELETE policy (RLS is enabled on this table)
CREATE POLICY "Users can delete their own exam results"
ON public.exam_results FOR DELETE
USING (auth.uid() = user_id);

-- Atomic reset function (SECURITY DEFINER ensures it always works even if
-- the per-table policies are later changed, and also validates ownership)
CREATE OR REPLACE FUNCTION public.reset_user_progress(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify the caller is resetting their own data only
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  DELETE FROM public.user_progress  WHERE user_id = p_user_id;
  DELETE FROM public.exam_results   WHERE user_id = p_user_id;
  DELETE FROM public.study_sessions WHERE user_id = p_user_id;
END;
$$;
