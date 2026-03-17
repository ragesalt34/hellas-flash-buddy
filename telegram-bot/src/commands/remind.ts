import { Context } from 'telegraf';
import { setReminder } from '../services/userService';

const TIME_REGEX = /^([01]?\d|2[0-3]):([0-5]\d)$/;

export async function handleRemind(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  const text = 'text' in ctx.message! ? (ctx.message as { text: string }).text : '';
  const args = text.split(' ').slice(1).join(' ').trim();

  if (!args) {
    await ctx.reply(
      `⏰ *Ежедневное напоминание*\n\n` +
        `Использование: \`/remind ЧЧ:ММ\`\n\n` +
        `Примеры:\n` +
        `/remind 09:00\n` +
        `/remind 19:30\n\n` +
        `Для отключения: /remind off`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  if (args === 'off' || args === 'выкл') {
    await setReminder(from.id, null);
    await ctx.reply('✅ Напоминания отключены.');
    return;
  }

  if (!TIME_REGEX.test(args)) {
    await ctx.reply(
      `Неверный формат времени. Используй ЧЧ:ММ, например: /remind 09:00`
    );
    return;
  }

  await setReminder(from.id, args);
  await ctx.reply(
    `✅ Напоминание установлено на *${args}* (МСК).\n\n` +
      `Каждый день в это время я напомню тебе позаниматься.`,
    { parse_mode: 'Markdown' }
  );
}
