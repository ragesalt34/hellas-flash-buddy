-- Telegram users table for bot integration
CREATE TABLE public.telegram_users (
  telegram_id  BIGINT PRIMARY KEY,
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  username     TEXT,
  display_name TEXT,
  link_code    TEXT,                          -- temporary linking code
  link_code_expires_at TIMESTAMPTZ,
  remind_time  TIME,                          -- daily reminder time (NULL = off)
  remind_tz    TEXT NOT NULL DEFAULT 'Europe/Moscow',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.telegram_users ENABLE ROW LEVEL SECURITY;
-- No policies = service_role only (bot uses service_role key)

-- Allow web app users to see their own linked telegram account
CREATE POLICY "Users can view their own telegram link"
  ON public.telegram_users FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own telegram link"
  ON public.telegram_users FOR UPDATE
  USING (user_id = auth.uid());
