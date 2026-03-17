import { Context } from 'telegraf';
import { getUserStats } from '../services/sessionService';
import { TOPIC_LABELS } from '../services/questionService';

export async function handleStats(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  const stats = await getUserStats(from.id);

  if (stats.total_sessions === 0) {
    await ctx.reply(
      'У тебя пока нет завершённых квизов.\n\nНачни с команды /quiz!',
      {
        reply_markup: {
          inline_keyboard: [[{ text: '📝 Начать квиз', callback_data: 'menu:quiz' }]],
        },
      }
    );
    return;
  }

  const pct =
    stats.total_questions > 0
      ? Math.round((stats.total_correct / stats.total_questions) * 100)
      : 0;

  const topicLines = Object.entries(stats.by_topic)
    .map(([topic, data]) => {
      const topicPct = data.total > 0
        ? Math.round((data.correct / data.total) * 100)
        : 0;
      const label = TOPIC_LABELS[topic] ?? topic;
      return `${label.padEnd(20)} — ${data.sessions} викт., ${topicPct}%`;
    })
    .join('\n');

  const lastDate = stats.last_activity
    ? new Date(stats.last_activity).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'нет данных';

  const text =
    `📊 *Твоя статистика*\n` +
    `━━━━━━━━━━━━━━━\n\n` +
    `Всего викторин: *${stats.total_sessions}*\n` +
    `Всего вопросов: *${stats.total_questions}*\n` +
    `Верных ответов: *${stats.total_correct}* (${pct}%)\n\n` +
    `*По темам:*\n` +
    `\`\`\`\n${topicLines}\n\`\`\`\n\n` +
    `Последняя активность: ${lastDate}`;

  await ctx.reply(text, { parse_mode: 'Markdown' });
}
