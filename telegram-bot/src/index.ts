import 'dotenv/config';
import { bot } from './bot';
import { handleStart } from './commands/start';
import { handleQuiz } from './commands/quiz';
import { handleFlashcards, handleFlashcardCallback, cleanupStaleSessions } from './commands/flashcards';
import { handleStats } from './commands/stats';
import { handleRemind } from './commands/remind';
import {
  handleQuizAnswer,
  handleNext,
  handleAbandon,
  handleRestart,
} from './callbacks/quizAnswer';
import { startScheduler } from './scheduler';
import { withErrorHandler } from './utils/withErrorHandler';

// Commands
bot.start(withErrorHandler(handleStart));
bot.command('quiz', withErrorHandler(handleQuiz));
bot.command('flashcards', withErrorHandler(handleFlashcards));
bot.command('stats', withErrorHandler(handleStats));
bot.command('remind', withErrorHandler(handleRemind));
bot.command('help', (ctx) =>
  ctx.reply(
    `*Команды бота:*\n\n` +
      `/quiz — викторина (10 вопросов)\n` +
      `/quiz история|культура|право|география — по теме\n` +
      `/flashcards — флеш-карточки с SRS\n` +
      `/stats — твоя статистика\n` +
      `/remind ЧЧ:ММ [часовой пояс] — ежедневное напоминание\n` +
      `/remind off — отключить напоминание`,
    { parse_mode: 'Markdown' }
  )
);

// Callback query routing
bot.on('callback_query', async (ctx) => {
  const data =
    ctx.callbackQuery && 'data' in ctx.callbackQuery
      ? ctx.callbackQuery.data
      : null;
  if (!data) return;

  try {
    if (data.startsWith('a:')) {
      await handleQuizAnswer(ctx, data.slice(2));
    } else if (data === 'next') {
      await handleNext(ctx);
    } else if (data.startsWith('abandon:')) {
      await handleAbandon(ctx, data.slice(8));
    } else if (data.startsWith('restart:')) {
      await handleRestart(ctx, data.slice(8));
    } else if (data.startsWith('fc:')) {
      await handleFlashcardCallback(ctx, data.slice(3));
    } else if (data === 'menu:quiz') {
      await handleQuiz(ctx);
    } else if (data === 'menu:flashcards') {
      await handleFlashcards(ctx);
    } else if (data === 'menu:stats') {
      await handleStats(ctx);
    } else {
      await ctx.answerCbQuery();
    }
  } catch (err) {
    console.error('Callback error:', err);
    try {
      await ctx.answerCbQuery('Произошла ошибка. Попробуй ещё раз.');
    } catch {}
  }
});

// Error handler
bot.catch((err, ctx) => {
  console.error(`Error for update ${ctx.update.update_id}:`, err);
  ctx
    .reply('Что-то пошло не так. Попробуй ещё раз или напиши /start')
    .catch(() => {});
});

// Start
async function main() {
  startScheduler();

  // Cleanup stale flashcard sessions every 10 minutes
  setInterval(() => {
    const cleaned = cleanupStaleSessions();
    if (cleaned > 0) console.log(`Cleaned ${cleaned} stale flashcard sessions`);
  }, 10 * 60 * 1000);

  const webhookUrl = process.env.WEBHOOK_URL;
  if (webhookUrl && process.env.NODE_ENV === 'production') {
    await bot.launch({
      webhook: {
        domain: webhookUrl,
        port: parseInt(process.env.PORT ?? '3000'),
      },
    });
    console.log(`Bot started with webhook: ${webhookUrl}`);
  } else {
    await bot.launch();
    console.log('Bot started with long polling');
  }
}

main().catch(console.error);

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
