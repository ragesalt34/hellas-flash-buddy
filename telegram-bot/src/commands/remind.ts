import { Context } from 'grammy';
import { setReminder } from '../services/userService';
import { DIVIDER } from '../utils/progressBar';

const TIME_REGEX = /^([01]?\d|2[0-3]):([0-5]\d)$/;

const TZ_ALIASES: Record<string, string> = {
  // Russian
  'мск': 'Europe/Moscow',
  'москва': 'Europe/Moscow',
  'афины': 'Europe/Athens',
  'греция': 'Europe/Athens',
  'кипр': 'Asia/Nicosia',
  'прага': 'Europe/Prague',
  'чехия': 'Europe/Prague',
  // Greek
  'αθήνα': 'Europe/Athens',
  'αθηνα': 'Europe/Athens',
  'ελλάδα': 'Europe/Athens',
  'ελλαδα': 'Europe/Athens',
  'κύπρος': 'Asia/Nicosia',
  'κυπρος': 'Asia/Nicosia',
  'πράγα': 'Europe/Prague',
  'πραγα': 'Europe/Prague',
  'μόσχα': 'Europe/Moscow',
  'μοσχα': 'Europe/Moscow',
  // Latin
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
      `⏰ <b>Καθημερινή υπενθύμιση</b>\n` +
        `${DIVIDER}\n\n` +
        `Χρήση: <code>/remind ΩΩ:ΛΛ [ζώνη ώρας]</code>\n\n` +
        `<b>Παραδείγματα:</b>\n` +
        `<code>/remind 09:00</code> — ώρα Μόσχας\n` +
        `<code>/remind 09:00 Πράγα</code> — ώρα Πράγας\n` +
        `<code>/remind 09:00 Αθήνα</code> — ώρα Αθήνας\n` +
        `<code>/remind 19:30 Europe/Athens</code>\n\n` +
        `<i>Ζώνες ώρας: Μόσχα, Πράγα, Αθήνα, Ελλάδα, ή IANA</i>\n\n` +
        `Για απενεργοποίηση: <code>/remind off</code>`,
      { parse_mode: 'HTML' }
    );
    return;
  }

  if (firstArg === 'off' || firstArg === 'выкл') {
    await setReminder(from.id, null);
    await ctx.reply('🔕 Οι υπενθυμίσεις απενεργοποιήθηκαν.');
    return;
  }

  if (!TIME_REGEX.test(firstArg)) {
    await ctx.reply(
      `❌ Λάθος μορφή ώρας. Χρησιμοποίησε ΩΩ:ΛΛ, π.χ.: <code>/remind 09:00</code>`,
      { parse_mode: 'HTML' }
    );
    return;
  }

  const tzInput = args.slice(1).join(' ').trim() || undefined;
  const resolved = resolveTimezone(tzInput, from.language_code);

  // If user provided a timezone but it's invalid, show error
  if (tzInput && !resolved) {
    await ctx.reply(
      `❌ Άγνωστη ζώνη ώρας: "<b>${tzInput}</b>"\n\n` +
        `<i>Διαθέσιμες: Μόσχα, Πράγα, Αθήνα, Ελλάδα, Κύπρος, ή IANA (Europe/Athens)</i>`,
      { parse_mode: 'HTML' }
    );
    return;
  }

  const tz = resolved || 'Europe/Athens';

  await setReminder(from.id, firstArg, tz);

  const TZ_LABELS: Record<string, string> = {
    'Europe/Moscow': 'Μόσχα',
    'Europe/Athens': 'Αθήνα',
    'Europe/Prague': 'Πράγα',
    'Asia/Nicosia': 'Κύπρος',
  };
  const tzLabel = TZ_LABELS[tz] || tz;
  await ctx.reply(
    `✅ <b>Η υπενθύμιση ορίστηκε</b>\n` +
      `${DIVIDER}\n\n` +
      `🕐 Ώρα: <b>${firstArg}</b>  ·  📍 ${tzLabel}\n\n` +
      `<i>Κάθε μέρα αυτή την ώρα θα σου θυμίζω να μελετήσεις.</i>`,
    {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📝 Δοκίμασε κουίζ τώρα', callback_data: 'menu:quiz', style: 'primary' as const }],
          [{ text: '🏠 Μενού', callback_data: 'menu:home' }],
        ],
      },
    }
  );
}
