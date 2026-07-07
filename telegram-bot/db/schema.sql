-- ============================================================================
-- Hellas Study — independent database schema
-- ============================================================================
-- Run this once in your OWN Supabase project (Dashboard → SQL Editor) — NOT the
-- Lovable-managed one. It has zero Telegram coupling: identity is a first-class
-- `accounts` row (UUID), and every piece of progress references that UUID.
--
-- After running it, migrate the question content from the old project (see
-- db/MIGRATION.md) and point the bot's SUPABASE_URL / SUPABASE_SERVICE_KEY at
-- this project.
-- ============================================================================

-- UUID generator (built in on Supabase, safe to re-run)
create extension if not exists "pgcrypto";

-- ---- Accounts: username + password, owned by us (no Telegram, no Lovable) ----
create table if not exists accounts (
  id            uuid primary key default gen_random_uuid(),
  username      text unique not null,
  -- lowercase copy for case-insensitive login/uniqueness
  username_ci   text unique not null,
  password_hash text not null,               -- bcrypt/scrypt hash, never plaintext
  display_name  text,
  is_guest      boolean not null default false,
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);

-- ---- Question bank: bilingual RU/EL content ----
create table if not exists questions (
  id                uuid primary key default gen_random_uuid(),
  topic             text not null check (topic in ('history','culture','laws','geography')),
  question_ru       text,
  question_el       text,
  correct_answer_ru text,
  correct_answer_el text,
  wrong_answers_ru  text[] not null default '{}',
  wrong_answers_el  text[] not null default '{}',
  explanation_ru    text,
  explanation_el    text,
  created_at        timestamptz not null default now()
);
create index if not exists questions_topic_idx on questions (topic);

-- ---- Completed quiz sessions (history + aggregate stats) ----
create table if not exists quiz_sessions (
  id           uuid primary key default gen_random_uuid(),
  account_id   uuid not null references accounts(id) on delete cascade,
  topic        text not null,
  score        int  not null default 0,
  total        int  not null default 0,
  answers      jsonb not null default '[]',
  completed_at timestamptz not null default now()
);
create index if not exists quiz_sessions_account_idx on quiz_sessions (account_id, completed_at desc);

-- ---- Spaced-repetition progress for quiz questions / flashcards ----
create table if not exists question_progress (
  account_id     uuid not null references accounts(id) on delete cascade,
  question_id    uuid not null references questions(id) on delete cascade,
  level          int  not null default 0,   -- SRS level
  correct_count  int  not null default 0,
  seen_count     int  not null default 0,
  next_review_at timestamptz,
  updated_at     timestamptz not null default now(),
  primary key (account_id, question_id)
);
create index if not exists question_progress_due_idx on question_progress (account_id, next_review_at);

-- ---- Spaced-repetition progress for the vocabulary list ----
-- vocab items themselves live in code (src/data/vocabulary.ts); only per-account
-- progress is stored here, keyed by the numeric vocab id from that file.
create table if not exists vocab_progress (
  account_id     uuid not null references accounts(id) on delete cascade,
  vocab_id       int  not null,
  level          int  not null default 0,
  next_review_at timestamptz,
  updated_at     timestamptz not null default now(),
  primary key (account_id, vocab_id)
);
create index if not exists vocab_progress_due_idx on vocab_progress (account_id, next_review_at);

-- ---- Streak: derived from distinct active days, but cache last activity ----
-- (Streak is computed from quiz_sessions.completed_at dates; no extra table
--  needed. Kept as a comment so the model is explicit.)
