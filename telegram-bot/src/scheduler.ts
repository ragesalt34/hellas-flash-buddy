import cron from 'node-cron';
import { bot } from './bot';
import { getUsersWithReminder } from './services/userService';

export function startScheduler(): void {
  // Check every minute for due reminders
  cron.schedule('* * * * *', async () => {
    try {
      const users = await getUsersWithReminder();
      const now = new Date();
      const nowHH = now.getUTCHours().toString().padStart(2, '0');
      const nowMM = now.getUTCMinutes().toString().padStart(2, '0');
      // Simple Moscow time offset (UTC+3)
      const mskHours = (now.getUTCHours() + 3) % 24;
      const mskHH = mskHours.toString().padStart(2, '0');
      const mskMM = nowMM;

      for (const user of users) {
        if (!user.remind_time) continue;

        // Compare HH:MM (stored as MSK by default)
        const [rh, rm] = user.remind_time.split(':');
        if (rh === mskHH && rm === mskMM) {
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
