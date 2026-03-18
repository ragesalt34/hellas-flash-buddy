import 'dotenv/config';
import { bot } from './bot';
import { handleStart } from './commands/start';
import { handleQuiz, showTopicMenu, startQuiz } from './commands/quiz';
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
      `/quiz — выбрать тему и начать квиз\n` +
      `/flashcards — флеш-карточки с SRS\n` +
      `/stats — твоя статистика\n` +
      `/remind ЧЧ:ММ — ежедневное напоминание\n` +
      `/remind off — отключить напоминание\n` +
      `/help — эта справка`,
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
    // Quiz answers
    if (data.startsWith('a:')) {
      await handleQuizAnswer(ctx, data.slice(2));
    } else if (data === 'next') {
      await handleNext(ctx);
    } else if (data.startsWith('abandon:')) {
      await handleAbandon(ctx, data.slice(8));
    } else if (data.startsWith('restart:')) {
      await handleRestart(ctx, data.slice(8));

    // Topic selection
    } else if (data.startsWith('topic:')) {
      const from = ctx.from;
      if (!from) return;
      await ctx.answerCbQuery();
      const topic = data.slice(6); // 'mixed', 'history', 'culture', 'laws', 'geography'
      await startQuiz(ctx, from.id, topic);

    // Flashcard callbacks
    } else if (data.startsWith('fc:')) {
      await handleFlashcardCallback(ctx, data.slice(3));

    // Menu navigation
    } else if (data === 'menu:quiz') {
      await ctx.answerCbQuery();
      await showTopicMenu(ctx);
    } else if (data === 'menu:flashcards') {
      await handleFlashcards(ctx);
    } else if (data === 'menu:stats') {
      await handleStats(ctx);
    } else if (data === 'menu:remind') {
      await ctx.answerCbQuery();
      await ctx.reply(
        `*⏰ Ежедневное напоминание*\n\n` +
          `Напиши команду:\n` +
          `/remind 09:00 — по Москве\n` +
          `/remind 09:00 Афины — по Афинам\n` +
          `/remind off — отключить`,
        { parse_mode: 'Markdown' }
      );
    } else if (data === 'menu:help') {
      await ctx.answerCbQuery();
      await ctx.reply(
        `*Команды бота:*\n\n` +
          `/quiz — выбрать тему и начать квиз\n` +
          `/flashcards — флеш-карточки с SRS\n` +
          `/stats — твоя статистика\n` +
          `/remind ЧЧ:ММ — ежедневное напоминание\n` +
          `/help — эта справка`,
        { parse_mode: 'Markdown' }
      );
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
