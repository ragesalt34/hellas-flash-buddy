import cron from 'node-cron';
import { bot } from './bot';
import { getUsersWithReminder } from './services/userService';
import { MESSAGE_EFFECTS, DIVIDER } from './utils/progressBar';

export function startScheduler(): void {
  // Check every minute for due reminders
  cron.schedule('* * * * *', async () => {
    try {
      const users = await getUsersWithReminder();
      const now = new Date();

      for (const user of users) {
        if (!user.remind_time) continue;

        const tz = user.remind_tz || 'Europe/Moscow';
        let userHH: string;
        let userMM: string;
        try {
          const userNow = new Date(now.toLocaleString('en-US', { timeZone: tz }));
          userHH = userNow.getHours().toString().padStart(2, '0');
          userMM = userNow.getMinutes().toString().padStart(2, '0');
        } catch {
          // Invalid timezone — fallback to Moscow
          const mskHours = (now.getUTCHours() + 3) % 24;
          userHH = mskHours.toString().padStart(2, '0');
          userMM = now.getUTCMinutes().toString().padStart(2, '0');
        }

        const [rh, rm] = user.remind_time.split(':');
        if (rh === userHH && rm === userMM) {
          try {
            await bot.api.sendMessage(
              user.telegram_id,
              `🔔 <b>Ώρα για μελέτη!</b>\n` +
                `${DIVIDER}\n\n` +
                `Μην ξεχάσεις να κάνεις κουίζ ή να επαναλάβεις τις κάρτες σήμερα. ` +
                `Κάθε μέρα — ένα βήμα πιο κοντά στις εξετάσεις.`,
              {
                parse_mode: 'HTML',
                message_effect_id: MESSAGE_EFFECTS.FIRE,
                reply_markup: {
                  inline_keyboard: [
                    [{ text: '🌅 Ερώτηση της ημέρας', callback_data: 'menu:qotd', style: 'success' as const }],
                    [
                      { text: '📝 Κουίζ',  callback_data: 'menu:quiz',       style: 'primary' as const },
                      { text: '🎴 Κάρτες', callback_data: 'menu:flashcards', style: 'primary' as const },
                    ],
                  ],
                },
              }
            );
          } catch (err) {
            // User may have blocked the bot
            console.error(`Failed to send reminder to ${user.telegram_id}:`, err);
          }
        }
      }
    } catch (err) {
      console.error('Scheduler error:', err);
    }
  });

  console.log('Scheduler started');
}
