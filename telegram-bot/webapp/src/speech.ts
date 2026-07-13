import { api } from './api';

// Playback level for TTS. Played through the Web Audio API (GainNode) rather
// than <audio>.volume, because iOS Safari ignores HTMLMediaElement.volume — a
// GainNode is the only way to actually turn the voice down on iPhone.
//
// TARGET_PEAK normalizes loudness: each clip's gain is set so its loudest
// sample lands at TARGET_PEAK, so questions (v3) and words (flash) — which the
// two models render at different baseline loudness — all play at the same level.
const TARGET_PEAK = 0.5;
const MAX_GAIN = 2; // don't over-amplify a near-silent clip (would raise noise)
const CACHE_TTL_MS = 50 * 60 * 1000;
// Decoded PCM is ~0.5MB per clip — cap the cache so a long session doesn't
// hold tens of MB of audio in memory (oldest entries are evicted first).
const CACHE_MAX = 40;

let ctx: AudioContext | null = null;
let currentSrc: AudioBufferSourceNode | null = null;
let currentEl: HTMLAudioElement | null = null; // fallback path
// Increments on every speak call: after the awaits, a stale call sees a newer
// generation and bails, so a rapid double-tap can't start two overlapping clips.
let generation = 0;
const bufCache = new Map<string, { buf: AudioBuffer; gain: number; ts: number }>();

/** Peak sample amplitude across all channels (0..1); used to normalize loudness. */
function peakGain(buf: AudioBuffer): number {
  let peak = 0;
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < data.length; i++) {
      const a = data[i] < 0 ? -data[i] : data[i];
      if (a > peak) peak = a;
    }
  }
  if (peak <= 0.0001) return TARGET_PEAK; // silent → neutral
  return Math.min(TARGET_PEAK / peak, MAX_GAIN);
}

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

/** Fetch + decode a clip into the in-memory cache (no playback). Shared by
 * speakGreek and prefetchGreek so a preloaded clip plays instantly on tap. */
async function loadBuffer(
  c: AudioContext,
  text: string,
  cacheKey: string
): Promise<{ buf: AudioBuffer; gain: number; ts: number }> {
  let entry = bufCache.get(cacheKey);
  if (!entry || Date.now() - entry.ts > CACHE_TTL_MS) {
    const { audioUrl } = await api.tts(text, cacheKey);
    const res = await fetch(audioUrl);
    if (!res.ok) throw new Error(`audio fetch ${res.status}`);
    const buf = await c.decodeAudioData(await res.arrayBuffer());
    entry = { buf, gain: peakGain(buf), ts: Date.now() };
    bufCache.delete(cacheKey); // re-insert at the end (freshest position)
    bufCache.set(cacheKey, entry);
    while (bufCache.size > CACHE_MAX) {
      const oldest = bufCache.keys().next().value;
      if (oldest === undefined) break;
      bufCache.delete(oldest);
    }
  }
  return entry;
}

/** Warm a clip ahead of a tap (on-screen question/word/answer) so playback is
 * instant. Fire-and-forget, coalesced by the cache; failures are ignored. */
export function prefetchGreek(text: string, cacheKey: string): void {
  if (!text?.trim()) return;
  if (bufCache.has(cacheKey)) return; // already warm
  const c = audioCtx();
  if (!c) return;
  loadBuffer(c, text, cacheKey).catch(() => bufCache.delete(cacheKey));
}

/** Plays Greek pronunciation for `text`, cached server-side under `cacheKey`.
 * Fire-and-forget; failures are non-critical UX and ignored. */
export async function speakGreek(text: string, cacheKey: string): Promise<void> {
  stopCurrent();
  const gen = ++generation;
  const c = audioCtx();
  try {
    // Web Audio path (volume actually applies on all platforms incl. iOS).
    if (c) {
      const entry = await loadBuffer(c, text, cacheKey);
      if (gen !== generation) return; // a newer tap superseded this one mid-fetch
      const src = c.createBufferSource();
      const gain = c.createGain();
      gain.gain.value = entry.gain;
      src.buffer = entry.buf;
      src.connect(gain);
      gain.connect(c.destination);
      currentSrc = src;
      src.start();
      return;
    }

    // Fallback (no Web Audio): <audio> with best-effort volume (ignored on iOS).
    const { audioUrl } = await api.tts(text, cacheKey);
    if (gen !== generation) return;
    currentEl = new Audio(audioUrl);
    currentEl.volume = TARGET_PEAK;
    await currentEl.play();
  } catch {
    bufCache.delete(cacheKey); // don't memoize a failed fetch/decode/playback
  }
}
