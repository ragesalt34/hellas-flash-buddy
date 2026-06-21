import { Context } from 'grammy';
import { upsertUser } from '../services/userService';
import { getUserStreak } from '../services/sessionService';

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

  const name = from.first_name || 'φίλε';
  const streak = await getUserStreak(from.id).catch(() => 0);
  const streakLine = streak >= 2
    ? `🔥 <b>${streak} ${streak === 1 ? 'μέρα' : 'μέρες'} στη σειρά!</b>\n\n`
    : '';

  const webappUrl = process.env.WEBAPP_URL;
  const webappRow = webappUrl
    ? [[{ text: '🚀 Άνοιξε την εφαρμογή', web_app: { url: webappUrl } }]]
    : [];

  await ctx.reply(
    `🇬🇷 <b>Γεια σου, ${name}!</b>\n\n` +
      streakLine +
      `📚 <b>163</b> ερωτήσεις  ·  <b>4</b> θέματα\n` +
      `🗂 <b>150</b> λέξεις λεξιλογίου\n` +
      `🧠 <i>SRS — η σωστή ερώτηση τη σωστή στιγμή</i>\n\n` +
      `Διάλεξε ενότητα 👇`,
    {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          ...webappRow,
          [
            { text: '📝 Κουίζ',          callback_data: 'menu:quiz',       style: 'primary' as const },
            { text: '🎴 Κάρτες',         callback_data: 'menu:flashcards', style: 'primary' as const },
          ],
          [
            { text: '📚 Λεξιλόγιο',      callback_data: 'menu:vocab',      style: 'primary' as const },
            { text: '🌅 Ερώτηση ημέρας', callback_data: 'menu:qotd',       style: 'success' as const },
          ],
          [
            { text: '📊 Στατιστικά',     callback_data: 'menu:stats' },
            { text: '📜 Ιστορικό',       callback_data: 'menu:history' },
          ],
          [
            { text: '⏰ Υπενθύμιση',     callback_data: 'menu:remind' },
            { text: '❓ Βοήθεια',        callback_data: 'menu:help' },
          ],
        ],
      },
    }
  );
}
