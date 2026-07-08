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

// Client-side memo: the signed URL (and the decoded audio behind it) is reused
// on repeat plays, so tapping 🔊 twice doesn't re-hit the API or re-download
// the mp3. Entries expire before the signed URL does (1h server-side).
const URL_TTL_MS = 50 * 60 * 1000;
const memo = new Map<string, { audio: HTMLAudioElement; ts: number }>();

/** Plays Greek pronunciation for `text`, cached server-side under `cacheKey`. Fire-and-forget. */
export async function speakGreek(text: string, cacheKey: string): Promise<void> {
  try {
    current?.pause();
    const hit = memo.get(cacheKey);
    if (hit && Date.now() - hit.ts < URL_TTL_MS) {
      current = hit.audio;
      current.currentTime = 0;
      await current.play();
      return;
    }
    const { audioUrl } = await api.tts(text, cacheKey);
    current = new Audio(audioUrl);
    memo.set(cacheKey, { audio: current, ts: Date.now() });
    await current.play();
  } catch {
    memo.delete(cacheKey); // don't memoize a failed fetch/playback
  }
}
