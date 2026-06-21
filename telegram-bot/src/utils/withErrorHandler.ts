import { Context } from 'grammy';

export function withErrorHandler(
  handler: (ctx: Context) => Promise<void>
): (ctx: Context) => Promise<void> {
  return async (ctx) => {
    try {
      await handler(ctx);
    } catch (err) {
      console.error(`Command error [${ctx.from?.id}]:`, err);
      try {
        await ctx.reply('Παρουσιάστηκε σφάλμα. Δοκίμασε ξανά ή γράψε /start');
      } catch {}
    }
  };
}
