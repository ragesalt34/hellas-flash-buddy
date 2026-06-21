import 'dotenv/config';
import http from 'http';
import { webhookCallback } from 'grammy';
import { bot } from './bot';
import { handleStart } from './commands/start';
import { handleQuiz, showTopicMenu, startQuiz } from './commands/quiz';
import { cleanupStaleQuizSessions } from './services/sessionService';
import { handleFlashcards, handleFlashcardCallback, cleanupStaleSessions } from './commands/flashcards';
import { handleStats } from './commands/stats';
import { handleRemind } from './commands/remind';
import { handleHistory } from './commands/history';
import { handleQotd, handleQotdAnswer } from './commands/qotd';
import { handleVocab, handleVocabCallback } from './commands/vocab';
import {
  handleQuizAnswer,
  handleNext,
  handleSkip,
  handleAbandon,
  handleRestart,
} from './callbacks/quizAnswer';
import { startScheduler } from './scheduler';
import { withErrorHandler } from './utils/withErrorHandler';
import { DIVIDER } from './utils/progressBar';
import { startApiServer } from './api/server';

// Shared text — used by both /help command and the menu:help button
const HELP_TEXT =
  `📖 <b>Εντολές του bot</b>\n` +
  `${DIVIDER}\n\n` +
  `📝 /quiz — διάλεξε θέμα και ξεκίνα κουίζ\n` +
  `🎴 /flashcards — κάρτες με SRS\n` +
  `📚 /vocab — μάθε λεξιλόγιο (150 λέξεις με SRS)\n` +
  `🌅 /qotd — μία ερώτηση της ημέρας\n` +
  `📊 /stats — τα στατιστικά σου\n` +
  `📜 /history — τα τελευταία 10 κουίζ\n` +
  `⏰ /remind <code>ΩΩ:ΛΛ</code> — καθημερινή υπενθύμιση\n` +
  `   <i>π.χ.: /remind 09:00 Αθήνα</i>\n` +
  `❓ /help — αυτή η βοήθεια\n\n` +
  `<i>Το bot βασίζεται σε SRS — οι κάρτες επιστρέφουν τη σωστή στιγμή για καλύτερη απομνημόνευση.</i>`;

const REMIND_INFO_TEXT =
  `⏰ <b>Καθημερινή υπενθύμιση</b>\n` +
  `${DIVIDER}\n\n` +
  `Χρησιμοποίησε την εντολή:\n` +
  `<code>/remind 09:00</code> — ώρα Μόσχας\n` +
  `<code>/remind 09:00 Αθήνα</code> — ώρα Αθήνας\n` +
  `<code>/remind 09:00 Πράγα</code> — ώρα Πράγας\n` +
  `<code>/remind off</code> — απενεργοποίηση\n\n` +
  `<i>Ζώνες ώρας: Μόσχα, Πράγα, Αθήνα, Ελλάδα, ή IANA (Europe/Athens)</i>`;

// Commands
bot.command('start', withErrorHandler(handleStart));
bot.command('quiz', withErrorHandler(handleQuiz));
bot.command('flashcards', withErrorHandler(handleFlashcards));
bot.command('stats', withErrorHandler(handleStats));
bot.command('remind', withErrorHandler(handleRemind));
bot.command('history', withErrorHandler(handleHistory));
bot.command('qotd', withErrorHandler(handleQotd));
bot.command('vocab', withErrorHandler(handleVocab));
bot.command('help', withErrorHandler(async (ctx) => {
  await ctx.reply(HELP_TEXT, { parse_mode: 'HTML' });
}));
bot.command('app', withErrorHandler(async (ctx) => {
  const url = process.env.WEBAPP_URL;
  if (!url) {
    await ctx.reply('Η εφαρμογή δεν είναι διαθέσιμη αυτή τη στιγμή.');
    return;
  }
  await ctx.reply('🚀 <b>Hellas Study</b> — όλα σε μία εφαρμογή:', {
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: [[{ text: '🚀 Άνοιγμα', web_app: { url } }]] },
  });
}));

// Callback query routing
bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;
  if (!data) return;

  try {
    // Quiz answers
    if (data.startsWith('a:')) {
      await handleQuizAnswer(ctx, data.slice(2));
    } else if (data === 'next') {
      await handleNext(ctx);
    } else if (data === 'skip') {
      await handleSkip(ctx);
    } else if (data.startsWith('qotd:')) {
      await handleQotdAnswer(ctx, data.slice(5));
    } else if (data === 'menu:history') {
      await handleHistory(ctx);
    } else if (data === 'menu:qotd') {
      await handleQotd(ctx);
    } else if (data === 'menu:vocab') {
      await handleVocab(ctx);
    } else if (data.startsWith('vocab:')) {
      await handleVocabCallback(ctx, data.slice(6));
    } else if (data.startsWith('abandon:')) {
      await handleAbandon(ctx, data.slice(8));
    } else if (data.startsWith('restart:')) {
      await handleRestart(ctx, data.slice(8));

    // Topic selection
    } else if (data.startsWith('topic:')) {
      const from = ctx.from;
      if (!from) return;
      await ctx.answerCallbackQuery();
      const topic = data.slice(6);
      await startQuiz(ctx, from.id, topic);

    // Flashcard callbacks
    } else if (data.startsWith('fc:')) {
      await handleFlashcardCallback(ctx, data.slice(3));

    // Menu navigation
    } else if (data === 'menu:quiz') {
      await ctx.answerCallbackQuery();
      await showTopicMenu(ctx);
    } else if (data === 'menu:flashcards') {
      await handleFlashcards(ctx);
    } else if (data === 'menu:stats') {
      await handleStats(ctx);
    } else if (data === 'menu:remind') {
      await ctx.answerCallbackQuery();
      await ctx.reply(REMIND_INFO_TEXT, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [[{ text: '🏠 Μενού', callback_data: 'menu:home' }]] },
      });
    } else if (data === 'menu:help') {
      await ctx.answerCallbackQuery();
      await ctx.reply(HELP_TEXT, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [[{ text: '🏠 Μενού', callback_data: 'menu:home' }]] },
      });
    } else if (data === 'menu:home') {
      await ctx.answerCallbackQuery();
      await handleStart(ctx);
    } else {
      await ctx.answerCallbackQuery();
    }
  } catch (err) {
    console.error('Callback error:', err);
    try {
      await ctx.answerCallbackQuery('Παρουσιάστηκε σφάλμα. Δοκίμασε ξανά.');
    } catch {}
  }
});

// Error handler
bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Error for update ${ctx.update.update_id}:`, err.error);
  ctx
    .reply('Κάτι πήγε στραβά. Δοκίμασε ξανά ή γράψε /start')
    .catch(() => {});
});

// Start
async function main() {
  startScheduler();

  // Mini App REST API (used by the Telegram Web App frontend)
  startApiServer(Number(process.env.API_PORT ?? 3001));

  // Cleanup stale flashcard sessions every 10 minutes
  setInterval(() => {
    const cleaned = cleanupStaleSessions();
    if (cleaned > 0) console.log(`Cleaned ${cleaned} stale flashcard sessions`);
  }, 10 * 60 * 1000);

  // Cleanup quiz sessions left open >24h (e.g. from crashed deploys)
  cleanupStaleQuizSessions().then(n => {
    if (n > 0) console.log(`Cleaned ${n} stale quiz session(s) on startup`);
  });

  // Register commands menu (the "Menu" button bottom-left + autocomplete on /)
  bot.api.setMyCommands([
    { command: 'start',      description: '🏠 Κύριο μενού' },
    { command: 'quiz',       description: '📝 Κάνε κουίζ' },
    { command: 'flashcards', description: '🎴 Κάρτες' },
    { command: 'vocab',      description: '📚 Λεξιλόγιο (150 λέξεις)' },
    { command: 'qotd',       description: '🌅 Ερώτηση της ημέρας' },
    { command: 'stats',      description: '📊 Τα στατιστικά μου' },
    { command: 'history',    description: '📜 Ιστορικό κουίζ' },
    { command: 'remind',     description: '⏰ Καθημερινή υπενθύμιση' },
    { command: 'app',        description: '🚀 Άνοιξε την εφαρμογή' },
    { command: 'help',       description: '❓ Βοήθεια' },
  ]).catch(err => console.error('setMyCommands error:', err));

  // Point the chat menu button at the Mini App (launches the Web App in one tap)
  const webappUrl = process.env.WEBAPP_URL;
  if (webappUrl) {
    bot.api
      .setChatMenuButton({
        menu_button: { type: 'web_app', text: '🚀 Εφαρμογή', web_app: { url: webappUrl } },
      })
      .catch((err) => console.error('setChatMenuButton error:', err));
  }

  const webhookUrl = process.env.WEBHOOK_URL;
  if (webhookUrl && process.env.NODE_ENV === 'production') {
    const port = parseInt(process.env.PORT ?? '3000');
    await bot.api.setWebhook(webhookUrl);
    http.createServer(webhookCallback(bot, 'http')).listen(port);
    console.log(`Bot started with webhook on port ${port}`);
  } else {
    await bot.start({
      onStart: (me) => console.log(`@${me.username} started (grammY · Bot API 10.1)`),
    });
  }
}

main().catch(console.error);

process.once('SIGINT', () => bot.stop());
process.once('SIGTERM', () => bot.stop());
