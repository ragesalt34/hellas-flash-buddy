import { api } from './api';
import { kWeightedMono, lufs, windowPowers } from './loudness';

// Playback level for TTS. Played through the Web Audio API (GainNode) rather
// than <audio>.volume, because iOS Safari ignores HTMLMediaElement.volume — a
// GainNode is the only way to actually turn the voice down on iPhone.
//
// Every clip is levelled to the same perceived loudness, not the same peak.
// Peak-levelling (the old way) left 4–6 dB between clips: a word with one sharp
// consonant got turned down, a soft sentence did not. Now each clip's
// integrated loudness (ITU-R BS.1770: K-weighting, 400ms blocks, gated) is
// brought to TARGET_LUFS. -23.4 is the median level the peak-levelled library
// played at after the two 10% cuts, so the overall volume stays where it was
// set; only the spread goes.
const TARGET_LUFS = -23.4;
const PEAK_CEILING = 0.9; // never push a clip's peak past this
const MAX_GAIN = 2; // don't over-amplify a near-silent clip (would raise noise)
const FALLBACK_VOLUME = 0.405; // <audio> path (no Web Audio): plain volume
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

/** Gain that brings a clip to TARGET_LUFS, within the peak ceiling and MAX_GAIN.
 * Integrated loudness: 400ms blocks with 75% overlap, absolute gate -70 LUFS,
 * relative gate -10 LU (a clip shorter than a block is measured over itself). */
function loudnessGain(buf: AudioBuffer): number {
  const { x, peak } = kWeightedMono(buf);
  if (peak <= 0.0001) return 1; // silent: nothing to level
  const win = Math.min(Math.round(buf.sampleRate * 0.4), Math.max(1, x.length));
  const blocks = windowPowers(x, win, Math.round(buf.sampleRate * 0.1));
  const mean = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / Math.max(1, arr.length);
  const loud = blocks.filter((p) => lufs(p) > -70);
  if (!loud.length) return 1;
  const rel = lufs(mean(loud)) - 10;
  const gated = loud.filter((p) => lufs(p) > rel);
  const level = lufs(mean(gated.length ? gated : loud));
  return Math.min(10 ** ((TARGET_LUFS - level) / 20), PEAK_CEILING / peak, MAX_GAIN);
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

/** Does this string actually contain Greek letters?
 *
 * The TTS voice is Greek-only, so pronouncing text with no Greek in it is
 * useless — and expensive. In RU mode every quiz question and all four options
 * are Russian, yet the speak buttons rendered anyway and the prefetch fired for
 * all five on every question: a Greek voice reading Cyrillic, billed per
 * character at the provider and then cached forever. (EL mode can hit this too:
 * questionService falls back to the Russian column when a question has no Greek
 * translation.) Gate both playback and prefetch on this instead of on the UI
 * language, so the vocabulary screen — where the word is Greek whatever the
 * interface language — keeps working. */
export function hasGreek(text: string): boolean {
  return /[Ͱ-Ͽἀ-῿]/.test(text);
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
    entry = { buf, gain: loudnessGain(buf), ts: Date.now() };
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
  if (!text?.trim() || !hasGreek(text)) return;
  if (bufCache.has(cacheKey)) return; // already warm
  const c = audioCtx();
  if (!c) return;
  loadBuffer(c, text, cacheKey).catch(() => bufCache.delete(cacheKey));
}

/** Plays Greek pronunciation for `text`, cached server-side under `cacheKey`.
 * Fire-and-forget; failures are non-critical UX and ignored. */
export async function speakGreek(text: string, cacheKey: string): Promise<void> {
  if (!text?.trim() || !hasGreek(text)) return;
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
    currentEl.volume = FALLBACK_VOLUME;
    await currentEl.play();
  } catch {
    bufCache.delete(cacheKey); // don't memoize a failed fetch/decode/playback
  }
}
