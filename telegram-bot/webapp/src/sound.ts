// Game-feel UI sounds (Duolingo-style). Each effect plays a real audio file
// from /sounds/ when present, and otherwise falls back to a synthesized Web
// Audio tone so the app always has feedback even before assets are added.
//
// Drop-in your own (licensed / CC0) files to override any effect — no code
// change needed:
//   public/sounds/tap.mp3         — answer / button tap     (present)
//   public/sounds/correct.mp3     — correct answer          (present)
//   public/sounds/wrong.mp3       — wrong answer             (present)
//   public/sounds/complete.mp3    — quiz / deck finished     (present)
//   public/sounds/grade-hard.mp3  — SRS grade: hard          (present)
//   public/sounds/grade-good.mp3  — SRS grade: good          (present)
//   public/sounds/grade-know.mp3  — SRS grade: know it       (present)
// Keep them short (0.1–1s) and soft — they repeat a lot.

type Ctx = AudioContext;
let ctx: Ctx | null = null;

function ac(): Ctx | null {
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume(); // iOS: resume inside the tap gesture
    return ctx;
  } catch {
    return null;
  }
}

// ---- File-backed samples (preloaded, decoded once for zero-latency playback) ----
// `undefined` = not tried yet, `null` = tried and unavailable (use synth).
//
// Every clip is peak-normalized to TARGET_PEAK at decode time, so all effects
// play at the same level regardless of how loud the source file happens to be.
// Before this, each effect had its own hand-tuned multiplier (0.4–0.6) applied on
// top of whatever the file's own loudness was — two unrelated variables, so the
// set never actually matched. One target instead: lower it to make everything
// quieter together. 0.25 puts every effect ~4 dB below the previous 0.4.
const TARGET_PEAK = 0.25;
// Amplification is capped hard, because normalising UP is what made the quiet
// clips sound dirty: grade-hard peaks at 0.148 and was being multiplied by 2.7
// (+8.6 dB), which lifted its low-level rattle right into audibility, and
// grade-know by 1.74 (+4.8 dB). Measured envelopes show their noise floors are
// fine (−82…−86 dBFS) — the boost was the problem, not the source. 1.5 keeps the
// set within ~1 dB of each other while never raising a clip's own floor much.
const MAX_GAIN = 1.5;
const buffers = new Map<string, { buf: AudioBuffer; gain: number } | null>();

/** Peak sample amplitude (0..1) — mono by the time this is called. */
function peakOf(buf: AudioBuffer): number {
  const data = buf.getChannelData(0);
  let peak = 0;
  for (let i = 0; i < data.length; i++) {
    const a = data[i] < 0 ? -data[i] : data[i];
    if (a > peak) peak = a;
  }
  return peak;
}

/** Gain that lands this clip's loudest sample on TARGET_PEAK. */
function normGain(buf: AudioBuffer): number {
  const peak = peakOf(buf);
  if (peak <= 0.0001) return TARGET_PEAK; // silent → neutral
  return Math.min(TARGET_PEAK / peak, MAX_GAIN);
}

/** Downmix to mono so a lopsided stereo asset (e.g. sound only in the right
 * channel — some generated SFX come that way) plays equally in both ears.
 * The mix is re-normalized to the original peak so loudness is preserved. */
function toMono(c: Ctx, buf: AudioBuffer): AudioBuffer {
  if (buf.numberOfChannels <= 1) return buf;
  const len = buf.length;
  const mono = c.createBuffer(1, len, buf.sampleRate);
  const out = mono.getChannelData(0);
  let inPeak = 0;
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      out[i] += data[i] / buf.numberOfChannels;
      const a = data[i] < 0 ? -data[i] : data[i];
      if (a > inPeak) inPeak = a;
    }
  }
  let outPeak = 0;
  for (let i = 0; i < len; i++) {
    const a = out[i] < 0 ? -out[i] : out[i];
    if (a > outPeak) outPeak = a;
  }
  if (outPeak > 0.0001 && inPeak > outPeak) {
    const g = Math.min(inPeak / outPeak, 2);
    for (let i = 0; i < len; i++) out[i] *= g;
  }
  return mono;
}

/** Cut the inaudible tail and fade the edges.
 *
 * The generated clips carry a long reverb decay: the three grade sounds run a
 * full 2s, of which the last ~1s sits below −50 dBFS. Alone that is inaudible,
 * but the grade buttons get tapped in quick succession, so the tails stack and
 * smear into a wash — which is most of what reads as "extra noise" on every
 * sound. Trimming keeps the musical decay and drops only the part that
 * contributes nothing but accumulation.
 *
 * Both edges get a fade: 40ms out so the cut cannot click, 3ms in because some
 * of the clips start on a non-zero sample. */
const TAIL_FLOOR = 0.0032; // ≈ −50 dBFS
function trimTail(c: Ctx, buf: AudioBuffer): AudioBuffer {
  const d = buf.getChannelData(0);
  const sr = buf.sampleRate;
  const win = Math.max(1, Math.round(sr * 0.02));
  let end = d.length;
  for (let i = d.length - win; i >= 0; i -= win) {
    let s = 0;
    for (let j = i; j < i + win; j++) s += d[j] * d[j];
    if (Math.sqrt(s / win) > TAIL_FLOOR) {
      end = Math.min(d.length, i + win);
      break;
    }
  }
  const fade = Math.round(sr * 0.04);
  const len = Math.max(win, Math.min(d.length, end + fade));
  const out = c.createBuffer(1, len, sr);
  const o = out.getChannelData(0);
  o.set(d.subarray(0, len));
  for (let i = 0; i < fade && i < len; i++) {
    // raised cosine — no click, and no audible level step either
    o[len - fade + i] *= 0.5 * (1 + Math.cos((Math.PI * i) / fade));
  }
  const fin = Math.round(sr * 0.003);
  for (let i = 0; i < fin && i < len; i++) o[i] *= i / fin;
  return out;
}

// Bump when swapping any file in public/sounds/ — busts the CDN edge cache
// immediately instead of waiting out its max-age (see public/_headers).
const SOUND_VERSION = 2;

function preload(name: string): void {
  const c = ac();
  if (!c || buffers.has(name)) return;
  buffers.set(name, null); // mark as "attempted" so we don't refetch on failure
  fetch(`/sounds/${name}.mp3?v=${SOUND_VERSION}`)
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error('missing'))))
    .then((a) => c.decodeAudioData(a))
    .then((b) => {
      // mono → trim → measure: trimming never touches the loudest part, so the
      // gain is still computed against the real peak.
      const buf = trimTail(c, toMono(c, b));
      buffers.set(name, { buf, gain: normGain(buf) });
    })
    .catch(() => {
      /* no file (or undecodable) — the synth fallback covers it */
    });
}

// Warm the cache after the page has finished loading (~180KB of mp3s must not
// compete with the JS/CSS/fonts needed for first paint). Playback before the
// preload lands falls back to the synth tones, so nothing is silent meanwhile.
function warmSamples(): void {
  ['tap', 'correct', 'wrong', 'complete', 'grade-hard', 'grade-good', 'grade-know'].forEach(preload);
}
if (document.readyState === 'complete') warmSamples();
else window.addEventListener('load', warmSamples, { once: true });

// The instance currently sounding for each effect, so a retrigger can retire it.
const active = new Map<string, { src: AudioBufferSourceNode; g: GainNode }>();

/** Effects that must never sound together. The three grades are one control —
 * you answer a card once — so tapping "hard" then "good" should replace, not
 * layer. Everything else only cancels itself. */
function voiceOf(name: string): string {
  return name.startsWith('grade-') ? 'grade' : name;
}

/** Play a preloaded sample at the shared normalized level.
 * Returns false if none is available (→ use synth). */
function playSample(name: string): boolean {
  const c = ac();
  const entry = c ? buffers.get(name) : null;
  if (!c || !entry) return false;

  // Retire the previous instance of THIS effect first. Tapping a grade three
  // times in a second used to leave three decays running on top of each other,
  // and the pile-up is what sounds like noise rather than any one clip being
  // dirty. Ramped down over 30ms instead of stopped dead, so the handover is
  // inaudible rather than a click.
  const voice = voiceOf(name);
  const prev = active.get(voice);
  if (prev) {
    const t = c.currentTime;
    try {
      prev.g.gain.cancelScheduledValues(t);
      prev.g.gain.setValueAtTime(prev.g.gain.value, t);
      prev.g.gain.linearRampToValueAtTime(0.0001, t + 0.03);
      prev.src.stop(t + 0.04);
    } catch {
      /* already ended — nothing to retire */
    }
  }

  const src = c.createBufferSource();
  const g = c.createGain();
  src.buffer = entry.buf;
  g.gain.value = entry.gain;
  src.connect(g);
  g.connect(c.destination);
  src.start();
  active.set(voice, { src, g });
  src.onended = () => {
    if (active.get(voice)?.src === src) active.delete(voice);
  };
  return true;
}

// ---- Synthesized fallbacks ----
// Only reached when a sound file is missing or still preloading. Their peaks are
// scaled by the same factor the samples were quietened by, so a fallback can't
// come out louder than the real clip it stands in for.
// Scaled with TARGET_PEAK: 0.8 matched the old 0.4 target, so 0.25 needs 0.5.
const SYNTH_TRIM = 0.5;

// A single oscillator with a percussive envelope.
function tone(
  freq: number,
  startAt: number,
  dur: number,
  type: OscillatorType = 'triangle',
  peak = 0.16
): void {
  const c = ac();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  o.connect(g);
  g.connect(c.destination);
  const t = c.currentTime + startAt;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak * SYNTH_TRIM, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.start(t);
  o.stop(t + dur + 0.02);
}

// A bell/marimba-like note: fundamental + a couple of quieter overtones with a
// fast attack and exponential decay. Stacking these gives the bright, rounded
// "ding" that reads as a game-style correct/reward cue.
function bell(freq: number, startAt: number, dur: number, peak = 0.18): void {
  const c = ac();
  if (!c) return;
  const partials: [number, number][] = [
    [1, 1],
    [2, 0.5],
    [3, 0.28],
    [4.2, 0.14], // slightly inharmonic top partial → metallic shimmer
  ];
  const t = c.currentTime + startAt;
  for (const [mult, amp] of partials) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.value = freq * mult;
    o.connect(g);
    g.connect(c.destination);
    const p = peak * amp * SYNTH_TRIM;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(p, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
}

/** Soft UI tick — answer/option tap, reveal, next. */
export function playTap(): void {
  if (playSample('tap')) return;
  tone(660, 0, 0.05, 'sine', 0.09);
}

/** Correct answer — bright ascending bell arpeggio if no file. */
export function playCorrect(): void {
  if (playSample('correct')) return;
  // E5 → G#5 → B5 → E6: a rising major chord, the classic "you got it!" cue.
  bell(659, 0, 0.5, 0.16); // E5
  bell(831, 0.09, 0.5, 0.16); // G#5
  bell(988, 0.18, 0.6, 0.17); // B5
  bell(1319, 0.28, 0.7, 0.13); // E6 sparkle
}

/** Wrong answer — gentle low double note if no file (never harsh). */
export function playWrong(): void {
  if (playSample('wrong')) return;
  tone(196, 0, 0.22, 'sine', 0.16); // G3
  tone(147, 0.1, 0.3, 'sine', 0.14); // D3 — a soft downward "no"
}

/** SRS grade tap — pitch rises with confidence (1=hard … 3=know it). */
export function playGrade(grade: number): void {
  const name = grade >= 3 ? 'grade-know' : grade === 2 ? 'grade-good' : 'grade-hard';
  if (playSample(name)) return;
  const freq = grade >= 3 ? 587 : grade === 2 ? 440 : 330; // D5 / A4 / E4
  bell(freq, 0, 0.35, 0.14);
}

/** Quiz / deck finished — short celebratory fanfare if no file. */
export function playComplete(): void {
  if (playSample('complete')) return;
  // C5 → E5 → G5 → C6 rising fanfare with a bell timbre.
  bell(523, 0, 0.4, 0.15); // C5
  bell(659, 0.12, 0.4, 0.15); // E5
  bell(784, 0.24, 0.45, 0.16); // G5
  bell(1047, 0.38, 0.8, 0.17); // C6
}
