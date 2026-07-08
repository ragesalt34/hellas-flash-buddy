import { api } from './api';

let current: HTMLAudioElement | null = null;

/** Stable, cache-safe key for arbitrary Greek text (answer options have no id).
 * FNV-1a → base36, prefixed. Same text always maps to the same cached audio. */
export function textKey(text: string, prefix = 't'): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `${prefix}_${(h >>> 0).toString(36)}`;
}

/** Plays Greek pronunciation for `text`, cached server-side under `cacheKey`. Fire-and-forget. */
export async function speakGreek(text: string, cacheKey: string): Promise<void> {
  try {
    current?.pause();
    const { audioUrl } = await api.tts(text, cacheKey);
    current = new Audio(audioUrl);
    await current.play();
  } catch {
    /* non-critical UX — ignore playback/network failures */
  }
}
