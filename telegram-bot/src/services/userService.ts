import { supabase } from '../supabase';
import { TelegramUser } from '../types';

export async function upsertUser(
  telegramId: number,
  username: string | undefined,
  displayName: string | undefined
): Promise<TelegramUser> {
  const { data, error } = await supabase
    .from('telegram_users')
    .upsert(
      {
        telegram_id: telegramId,
        username: username ?? null,
        display_name: displayName ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'telegram_id', ignoreDuplicates: false }
    )
    .select()
    .single();

  if (error) throw error;
  return data as TelegramUser;
}

export async function getUser(telegramId: number): Promise<TelegramUser | null> {
  const { data, error } = await supabase
    .from('telegram_users')
    .select()
    .eq('telegram_id', telegramId)
    .maybeSingle();

  if (error) throw error;
  return data as TelegramUser | null;
}

export async function setReminder(
  telegramId: number,
  remindTime: string | null,
  tz?: string
): Promise<void> {
  const update: Record<string, unknown> = {
    remind_time: remindTime,
    updated_at: new Date().toISOString(),
  };
  if (tz) update.remind_tz = tz;

  const { error } = await supabase
    .from('telegram_users')
    .update(update)
    .eq('telegram_id', telegramId);

  if (error) throw error;
}

export async function getUsersWithReminder(): Promise<TelegramUser[]> {
  const { data, error } = await supabase
    .from('telegram_users')
    .select()
    .not('remind_time', 'is', null);

  if (error) throw error;
  return (data ?? []) as TelegramUser[];
}
