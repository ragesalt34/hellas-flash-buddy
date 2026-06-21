import { Context } from 'grammy';
import { supabase } from '../supabase';
import { TOPIC_LABELS } from '../services/questionService';

interface HistoryRow {
  topic: string;
  score: number;
  questions: { id: string }[];
  completed_at: string;
}

export async function handleHistory(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  const { data, error } = await supabase
    .from('telegram_quiz_sessions')
    .select('topic, score, questions, completed_at')
    .eq('telegram_id', from.id)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('history fetch error:', error);
    await ctx.reply('❌ Δεν ήταν δυνατή η φόρτωση του ιστορικού.');
    return;
  }

  const sessions = (data ?? []) as HistoryRow[];

  if (sessions.length === 0) {
    await ctx.reply(
      `<b>📜 Το ιστορικό είναι κενό</b>\n\n<i>Δεν έχεις κάνει ακόμα κουίζ.</i>`,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[
            { text: '📝 Κάνε το πρώτο κουίζ', callback_data: 'menu:quiz', style: 'primary' as const },
          ]],
        },
      }
    );
    return;
  }

  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const rows = sessions.map((s, i) => {
    const total = s.questions.length;
    const pct = total > 0 ? Math.round((s.score / total) * 100) : 0;
    const label = TOPIC_LABELS[s.topic] ?? s.topic;
    const date = new Date(s.completed_at).toLocaleDateString('el-GR', {
      day: '2-digit',
      month: 'short',
    });
    const time = new Date(s.completed_at).toLocaleTimeString('el-GR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    let icon = '😅';
    if (pct >= 80) icon = '🏆';
    else if (pct >= 60) icon = '👍';
    return `| ${i + 1} | ${icon} **${s.score}/${total}** | ${label} | ${date} · ${time} |`;
  }).join('\n');

  const markdown =
    `## 📜 Τελευταία κουίζ\n\n` +
    `| # | Αποτέλεσμα | Θέμα | Ημερομηνία |\n` +
    `|:-:|:----------:|:-----|:----------:|\n` +
    rows;

  await ctx.api.sendRichMessage(
    chatId,
    { markdown },
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '📝 Νέο κουίζ',   callback_data: 'menu:quiz',   style: 'primary' as const },
            { text: '📊 Στατιστικά', callback_data: 'menu:stats' },
          ],
          [{ text: '🏠 Μενού', callback_data: 'menu:home' }],
        ],
      },
    }
  );
}
