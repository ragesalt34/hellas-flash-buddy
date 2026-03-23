import { Context } from 'telegraf';
import { setReminder } from '../services/userService';

const TIME_REGEX = /^([01]?\d|2[0-3]):([0-5]\d)$/;

const TZ_ALIASES: Record<string, string> = {
  'мск': 'Europe/Moscow',
  'москва': 'Europe/Moscow',
  'афины': 'Europe/Athens',
  'греция': 'Europe/Athens',
  'кипр': 'Asia/Nicosia',
  'прага': 'Europe/Prague',
  'чехия': 'Europe/Prague',
  'prague': 'Europe/Prague',
  'czech': 'Europe/Prague',
  'moscow': 'Europe/Moscow',
  'athens': 'Europe/Athens',
  'greece': 'Europe/Athens',
};

function resolveTimezone(input?: string, languageCode?: string): string {
  if (input) {
    const normalized = input.trim().toLowerCase();
    if (TZ_ALIASES[normalized]) return TZ_ALIASES[normalized];
    // Try as IANA timezone directly
    try {
      Intl.DateTimeFormat(undefined, { timeZone: input.trim() });
      return input.trim();
    } catch {
      return '';
    }
  }
  // Auto-detect from Telegram language code
  if (languageCode === 'el') return 'Europe/Athens';
  return 'Europe/Moscow';
}

export async function handleRemind(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  const text = ctx.message && 'text' in ctx.message ? (ctx.message as { text: string }).text : '';
  const args = text.split(' ').slice(1);
  const firstArg = args[0]?.trim();

  if (!firstArg) {
    await ctx.reply(
      `*Ежедневное напоминание*\n\n` +
        `Использование: \`/remind ЧЧ:ММ [часовой пояс]\`\n\n` +
        `Примеры:\n` +
        `/remind 09:00 — по Москве\n` +
        `/remind 09:00 Прага — по Праге\n` +
        `/remind 09:00 Афины — по Афинам\n` +
        `/remind 19:30 Europe/Athens\n\n` +
        `Часовые пояса: мск, Прага, Чехия, Афины, Греция, или IANA\n\n` +
        `Для отключения: /remind off`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  if (firstArg === 'off' || firstArg === 'выкл') {
    await setReminder(from.id, null);
    await ctx.reply('Напоминания отключены.');
    return;
  }

  if (!TIME_REGEX.test(firstArg)) {
    await ctx.reply(
      `Неверный формат времени. Используй ЧЧ:ММ, например: /remind 09:00`
    );
    return;
  }

  const tzInput = args.slice(1).join(' ').trim() || undefined;
  const resolved = resolveTimezone(tzInput, from.language_code);

  // If user provided a timezone but it's invalid, show error
  if (tzInput && !resolved) {
    await ctx.reply(
      `Неизвестный часовой пояс: "${tzInput}"\n\n` +
        `Доступные: мск, Прага, Чехия, Афины, Греция, или IANA формат (Europe/Prague)`
    );
    return;
  }

  const tz = resolved || 'Europe/Moscow';

  await setReminder(from.id, firstArg, tz);

  const TZ_LABELS: Record<string, string> = {
    'Europe/Moscow': 'МСК',
    'Europe/Athens': 'Афины',
    'Europe/Prague': 'Прага',
    'Asia/Nicosia': 'Кипр',
  };
  const tzLabel = TZ_LABELS[tz] || tz;
  await ctx.reply(
    `Напоминание установлено на *${firstArg}* (${tzLabel}).\n\n` +
      `Каждый день в это время я напомню тебе позаниматься.`,
    { parse_mode: 'Markdown' }
  );
}
