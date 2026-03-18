import cron from 'node-cron';
import { bot } from './bot';
import { getUsersWithReminder } from './services/userService';

export function startScheduler(): void {
  // Check every minute for due reminders
  cron.schedule('* * * * *', async () => {
    try {
      const users = await getUsersWithReminder();
      const now = new Date();

      for (const user of users) {
        if (!user.remind_time) continue;

        // Get current time in user's timezone (defaults to Moscow)
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
            await bot.telegram.sendMessage(
              user.telegram_id,
              `🔔 *Время учиться!*\n\nНе забудь пройти квиз или повторить флеш-карточки сегодня.`,
              {
                parse_mode: 'Markdown',
                reply_markup: {
                  inline_keyboard: [
                    [
                      { text: '📝 Квиз', callback_data: 'menu:quiz' },
                      { text: '🃏 Карточки', callback_data: 'menu:flashcards' },
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
