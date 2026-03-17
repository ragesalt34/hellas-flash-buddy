-- Telegram quiz sessions table
CREATE TABLE public.telegram_quiz_sessions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id          BIGINT NOT NULL REFERENCES public.telegram_users(telegram_id) ON DELETE CASCADE,
  topic                TEXT NOT NULL,         -- 'history'|'culture'|'laws'|'geography'|'mixed'
  questions            JSONB NOT NULL,        -- snapshot: [{id, question, correct_answer, wrong_answers, explanation}]
  current_index        INTEGER NOT NULL DEFAULT 0,
  score                INTEGER NOT NULL DEFAULT 0,
  answers              JSONB NOT NULL DEFAULT '[]', -- [{question_id, chosen, correct, correct_answer}]
  last_message_id      INTEGER,              -- Telegram message_id of current question
  current_answer_order JSONB,               -- shuffled answer list for current question
  started_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at         TIMESTAMPTZ
);

ALTER TABLE public.telegram_quiz_sessions ENABLE ROW LEVEL SECURITY;
-- No policies = service_role only

-- Fast lookup of active sessions per user
CREATE INDEX idx_tqs_active ON public.telegram_quiz_sessions (telegram_id)
  WHERE completed_at IS NULL;
