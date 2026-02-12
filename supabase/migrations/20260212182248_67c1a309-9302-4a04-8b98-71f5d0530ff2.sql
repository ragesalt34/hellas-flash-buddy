-- Add Greek translation columns to questions table
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS question_el text,
  ADD COLUMN IF NOT EXISTS correct_answer_el text,
  ADD COLUMN IF NOT EXISTS wrong_answers_el text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS explanation_el text;
