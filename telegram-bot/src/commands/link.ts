import { Context } from 'telegraf';
import { getUser, saveLinkCode } from '../services/userService';

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function handleLink(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  const user = await getUser(from.id);

  if (user?.user_id) {
    await ctx.reply(
      `✅ Аккаунт уже привязан!\n\n` +
        `Твой Telegram подключён к веб-аккаунту на сайте.\n` +
        `Прогресс из квизов и флеш-карточек сохраняется автоматически.`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🗑 Отвязать аккаунт', callback_data: 'link:unlink' }],
          ],
        },
      }
    );
    return;
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 минут

  await saveLinkCode(from.id, code, expiresAt);

  await ctx.reply(
    `🔗 *Привязка аккаунта*\n\n` +
      `Твой код: \`${code}\`\n\n` +
      `*Как привязать:*\n` +
      `1. Войди на сайт hellas-flash-buddy\n` +
      `2. Перейди в *Профиль*\n` +
      `3. Введи этот код в поле "Привязать Telegram"\n\n` +
      `⏳ Код действует 15 минут.`,
    { parse_mode: 'Markdown' }
  );
}

export async function handleLinkCallback(
  ctx: Context,
  action: string
): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  if (action === 'unlink') {
    const { supabase } = await import('../supabase');
    await supabase
      .from('telegram_users')
      .update({ user_id: null, updated_at: new Date().toISOString() })
      .eq('telegram_id', from.id);

    await ctx.editMessageText('✅ Аккаунт отвязан.');
    await ctx.answerCbQuery('Аккаунт отвязан');
  }
}
