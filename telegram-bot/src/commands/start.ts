import { Context } from 'telegraf';
import { upsertUser } from '../services/userService';

export async function handleStart(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  try {
    await upsertUser(
      from.id,
      from.username,
      [from.first_name, from.last_name].filter(Boolean).join(' ') || undefined
    );
  } catch (err) {
    console.error('upsertUser error:', err);
  }

  const name = from.first_name || 'друг';

  await ctx.reply(
    `Привет, ${name}! 👋\n\n` +
      `Я помогу тебе подготовиться к экзамену на греческое гражданство.\n\n` +
      `Выбери что хочешь сделать:`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📝 Квиз', callback_data: 'menu:quiz' }],
          [{ text: '🃏 Флеш-карточки', callback_data: 'menu:flashcards' }],
          [{ text: '📊 Статистика', callback_data: 'menu:stats' }],
          [{ text: '⏰ Напоминание', callback_data: 'menu:remind' }],
          [{ text: '❓ Помощь', callback_data: 'menu:help' }],
        ],
      },
    }
  );
}
