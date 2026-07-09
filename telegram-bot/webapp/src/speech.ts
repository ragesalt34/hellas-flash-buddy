import { api } from './api';

// Playback volume for TTS. Played through the Web Audio API (GainNode) rather
// than <audio>.volume, because iOS Safari ignores HTMLMediaElement.volume — a
// GainNode is the only way to actually turn the voice down on iPhone.
const VOICE_VOLUME = 0.5;
const CACHE_TTL_MS = 50 * 60 * 1000;

let ctx: AudioContext | null = null;
let currentSrc: AudioBufferSourceNode | null = null;
let currentEl: HTMLAudioElement | null = null; // fallback path
const bufCache = new Map<string, { buf: AudioBuffer; ts: number }>();

function audioCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume(); // iOS: resume inside the tap
    return ctx;
  } catch {
    return null;
  }
}

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

function stopCurrent(): void {
  try {
    currentSrc?.stop();
  } catch {
    /* already stopped */
  }
  currentSrc = null;
  currentEl?.pause();
  currentEl = null;
}

/** Plays Greek pronunciation for `text`, cached server-side under `cacheKey`.
 * Fire-and-forget; failures are non-critical UX and ignored. */
export async function speakGreek(text: string, cacheKey: string): Promise<void> {
  stopCurrent();
  const c = audioCtx();
  try {
    // Web Audio path (volume actually applies on all platforms incl. iOS).
    if (c) {
      let entry = bufCache.get(cacheKey);
      if (!entry || Date.now() - entry.ts > CACHE_TTL_MS) {
        const { audioUrl } = await api.tts(text, cacheKey);
        const arr = await fetch(audioUrl).then((r) => r.arrayBuffer());
        const buf = await c.decodeAudioData(arr);
        entry = { buf, ts: Date.now() };
        bufCache.set(cacheKey, entry);
      }
      const src = c.createBufferSource();
      const gain = c.createGain();
      gain.gain.value = VOICE_VOLUME;
      src.buffer = entry.buf;
      src.connect(gain);
      gain.connect(c.destination);
      currentSrc = src;
      src.start();
      return;
    }

    // Fallback (no Web Audio): <audio> with best-effort volume.
    const { audioUrl } = await api.tts(text, cacheKey);
    currentEl = new Audio(audioUrl);
    currentEl.volume = VOICE_VOLUME;
    await currentEl.play();
  } catch {
    bufCache.delete(cacheKey); // don't memoize a failed fetch/decode/playback
  }
}
