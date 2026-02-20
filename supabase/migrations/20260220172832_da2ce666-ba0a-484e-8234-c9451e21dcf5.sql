
-- Table to track daily study sessions
CREATE TABLE public.study_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  activity_type TEXT NOT NULL DEFAULT 'quiz',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own sessions"
ON public.study_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions"
ON public.study_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
ON public.study_sessions FOR UPDATE
USING (auth.uid() = user_id);

-- Index for efficient daily queries
CREATE INDEX idx_study_sessions_user_date ON public.study_sessions (user_id, started_at);
