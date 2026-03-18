import { Context } from 'telegraf';

export function withErrorHandler(
  handler: (ctx: Context) => Promise<void>
): (ctx: Context) => Promise<void> {
  return async (ctx) => {
    try {
      await handler(ctx);
    } catch (err) {
      console.error(`Command error [${ctx.from?.id}]:`, err);
      try {
        await ctx.reply('Произошла ошибка. Попробуй ещё раз или напиши /start');
      } catch {}
    }
  };
}
