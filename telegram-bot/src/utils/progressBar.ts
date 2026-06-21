/** Modern rounded progress bar. Example: progressBar(3, 10) → "▰▰▰▱▱▱▱▱▱▱" */
export function progressBar(current: number, total: number, width = 10): string {
  if (total <= 0) return '▱'.repeat(width);
  const ratio = Math.max(0, Math.min(1, current / total));
  const filled = Math.min(width, Math.round(ratio * width));
  return '▰'.repeat(filled) + '▱'.repeat(width - filled);
}

/** Standard section divider — same width on every screen for a consistent look. */
export const DIVIDER = '━━━━━━━━━━━━';

/**
 * Title header: "📊 <b>Title</b>  ·  <i>subtitle</i>" followed by a divider.
 * Caller adds the trailing blank line(s).
 */
export function header(emoji: string, title: string, subtitle?: string): string {
  const sub = subtitle ? `  ·  <i>${subtitle}</i>` : '';
  return `${emoji} <b>${title}</b>${sub}\n${DIVIDER}`;
}

/**
 * Progress header for quiz / flashcards / vocab:
 * "▰▰▰▱▱▱▱  3/10  ·  Label" followed by a divider.
 */
export function progressHeader(current: number, total: number, label: string): string {
  return `<code>${progressBar(current, total)}</code>  <b>${current}/${total}</b>  ·  ${label}\n${DIVIDER}`;
}

/** Telegram message effect IDs (Bot API 7.8+, released 2024) */
export const MESSAGE_EFFECTS = {
  FIRE: '5104841245755180586',
  THUMBS_UP: '5107584321108051014',
  THUMBS_DOWN: '5104858069142078462',
  HEART: '5159385139981059251',
  PARTY: '5046509860389126442',
  POOP: '5046589136895476101',
} as const;
