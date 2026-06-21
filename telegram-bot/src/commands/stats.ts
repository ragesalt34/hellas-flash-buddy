import { Context } from 'grammy';
import { getUserStats, getUserStreak } from '../services/sessionService';
import { TOPIC_LABELS } from '../services/questionService';

export async function handleStats(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  const [stats, streak] = await Promise.all([
    getUserStats(from.id),
    getUserStreak(from.id).catch(() => 0),
  ]);

  if (stats.total_sessions === 0) {
    await ctx.reply(
      `<b>📊 Τα στατιστικά είναι κενά</b>\n\n` +
        `Δεν έχεις κάνει ακόμα κουίζ. Ξεκίνα τώρα!`,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[
            { text: '📝 Ξεκίνα κουίζ', callback_data: 'menu:quiz', style: 'primary' as const },
          ]],
        },
      }
    );
    return;
  }

  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const pct = stats.total_questions > 0
    ? Math.round((stats.total_correct / stats.total_questions) * 100)
    : 0;

  const streakLine = streak >= 2
    ? `🔥 **${streak} ${streak === 1 ? 'μέρα' : 'μέρες'} σερί**\n\n`
    : '';

  const topicRows = Object.entries(stats.by_topic)
    .map(([topic, data]) => {
      const topicPct = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
      const label = TOPIC_LABELS[topic] ?? topic;
      return `| ${label} | ${data.sessions} | ${data.correct}/${data.total} | **${topicPct}%** |`;
    })
    .join('\n');

  const lastDate = stats.last_activity
    ? new Date(stats.last_activity).toLocaleDateString('el-GR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '—';

  const markdown =
    `## 📊 Τα στατιστικά σου\n\n` +
    streakLine +
    `**${pct}%** επιτυχία · **${stats.total_sessions}** κουίζ · **${stats.total_correct}**/**${stats.total_questions}** σωστές\n\n` +
    (topicRows
      ? `| Θέμα | Κουίζ | Σωστά/Σύν | % |\n` +
        `|:-----|------:|----------:|--:|\n` +
        topicRows + `\n\n`
      : '') +
    `📅 *${lastDate}*`;

  await ctx.api.sendRichMessage(
    chatId,
    { markdown },
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '📝 Κάνε κουίζ', callback_data: 'menu:quiz',       style: 'primary' as const },
            { text: '🎴 Κάρτες',     callback_data: 'menu:flashcards', style: 'primary' as const },
          ],
          [
            { text: '📜 Ιστορικό', callback_data: 'menu:history' },
            { text: '🏠 Μενού',    callback_data: 'menu:home' },
          ],
        ],
      },
    }
  );
}
