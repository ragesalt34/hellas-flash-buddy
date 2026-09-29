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
// Each clip is levelled by how loud it *sounds*, not by a raw sample measure.
// Peak says nothing about loudness, and whole-clip RMS was not much better:
// a clip with a long quiet decay (grade-know, complete) gets a low average,
// is turned UP to reach the target, and its attack then lands 4–8 dB louder
// than the short clips. What the ear compares between UI sounds is the loudest
// moment, weighted for frequency. So: K-weighting (ITU-R BS.1770 — the ear
// hears 2–4 kHz as louder than bass at the same energy), then the loudest
// 50ms window, levelled to a per-effect target in LUFS. The window has to be
// short: tap is two 10ms clicks, and a 200ms window averaged them with the
// silence around them, judged the clip quiet, and left each click as loud as
// a correct/wrong chime.
//
// Targets are deliberately unequal: feedback on an answer is the main event,
// the finish fanfare may stand out a little, grades repeat on every card and
// sit lower, and the tap under every button is the quietest of all.
const TARGET_LUFS: Record<string, number> = {
  correct: -22,
  wrong: -22,
  complete: -21,
  'grade-hard': -24,
  'grade-good': -24,
  'grade-know': -24,
  tap: -36,
};
const DEFAULT_LUFS = -24;
// Clip guard only — it never raises a level, just keeps a peaky click from
// being pushed hard while chasing its target.
const PEAK_CEILING = 0.5;
// Amplification is capped hard, because normalizing UP is what made a quiet
// clip sound dirty before: the old grade-hard read a "low-level rattle" once
// its gain passed roughly 2.7× (+8.6 dB).
const MAX_GAIN = 2.5;
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

type Biquad = { b: [number, number, number]; a: [number, number] };

/** BS.1770 K-weighting at any sample rate: a +4 dB shelf above ~1.7 kHz
 * (the head's acoustic effect) and a ~38 Hz high-pass. */
function kWeighting(sr: number): Biquad[] {
  const shelf = (f0: number, gainDb: number, q: number): Biquad => {
    const A = 10 ** (gainDb / 40);
    const w = (2 * Math.PI * f0) / sr;
    const c = Math.cos(w);
    const s = 2 * Math.sqrt(A) * (Math.sin(w) / (2 * q));
    const a0 = A + 1 - (A - 1) * c + s;
    return {
      b: [
        (A * (A + 1 + (A - 1) * c + s)) / a0,
        (-2 * A * (A - 1 + (A + 1) * c)) / a0,
        (A * (A + 1 + (A - 1) * c - s)) / a0,
      ],
      a: [(2 * (A - 1 - (A + 1) * c)) / a0, (A + 1 - (A - 1) * c - s) / a0],
    };
  };
  const highpass = (f0: number, q: number): Biquad => {
    const w = (2 * Math.PI * f0) / sr;
    const c = Math.cos(w);
    const al = Math.sin(w) / (2 * q);
    const a0 = 1 + al;
    return {
      b: [(1 + c) / 2 / a0, -(1 + c) / a0, (1 + c) / 2 / a0],
      a: [(-2 * c) / a0, (1 - al) / a0],
    };
  };
  return [shelf(1681.97, 3.99984, 0.7071752), highpass(38.13547, 0.500327)];
}

/** Loudness (LUFS) of the loudest 50ms of the clip — mono by the time this
 * is called. A clip shorter than the window is measured as if padded with
 * silence, so a tiny click is not judged as loud as a sustained tone. */
function loudnessOf(buf: AudioBuffer): number {
  const src = buf.getChannelData(0);
  let x = Float64Array.from(src);
  for (const { b, a } of kWeighting(buf.sampleRate)) {
    const y = new Float64Array(x.length);
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < x.length; i++) {
      const v = b[0] * x[i] + b[1] * x1 + b[2] * x2 - a[0] * y1 - a[1] * y2;
      x2 = x1; x1 = x[i]; y2 = y1; y1 = v;
      y[i] = v;
    }
    x = y;
  }
  const win = Math.round(buf.sampleRate * 0.05);
  const hop = Math.round(buf.sampleRate * 0.0125);
  const sq = new Float64Array(x.length + 1); // prefix sums of squares
  for (let i = 0; i < x.length; i++) sq[i + 1] = sq[i] + x[i] * x[i];
  let max = x.length <= win ? sq[x.length] / win : 0;
  for (let i = 0; i + win <= x.length; i += hop) max = Math.max(max, (sq[i + win] - sq[i]) / win);
  return -0.691 + 10 * Math.log10(Math.max(max, 1e-12));
}

/** Gain that lands this clip's loudest moment on its target, never pushing
 * its peak past PEAK_CEILING and never amplifying more than MAX_GAIN. */
function normGain(name: string, buf: AudioBuffer): number {
  const peak = peakOf(buf);
  if (peak <= 0.0001) return 0; // silent file
  const target = TARGET_LUFS[name] ?? DEFAULT_LUFS;
  return Math.min(10 ** ((target - loudnessOf(buf)) / 20), PEAK_CEILING / peak, MAX_GAIN);
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
const SOUND_VERSION = 4;

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
      buffers.set(name, { buf, gain: normGain(name, buf) });
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
// Only reached when a sound file is missing or still preloading. Trimmed so a
// fallback sits at or under the levelled real clip it stands in for (their
// peaks now land around 0.2–0.35).
const SYNTH_TRIM = 0.35;

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
  tone(660, 0, 0.05, 'sine', 0.05);
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
