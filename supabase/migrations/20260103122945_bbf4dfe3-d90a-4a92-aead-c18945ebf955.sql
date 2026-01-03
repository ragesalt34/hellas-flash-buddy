-- Add new columns to exam_results for expanded exam simulation
ALTER TABLE public.exam_results 
  ADD COLUMN IF NOT EXISTS questions_data JSONB,
  ADD COLUMN IF NOT EXISTS topics_breakdown JSONB,
  ADD COLUMN IF NOT EXISTS flagged_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS selected_topics TEXT[],
  ADD COLUMN IF NOT EXISTS question_count INTEGER;