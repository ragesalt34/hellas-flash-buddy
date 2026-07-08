// Game-feel UI sounds (Duolingo-style). Each effect plays a real audio file
// from /sounds/ when present, and otherwise falls back to a synthesized Web
// Audio tone so the app always has feedback even before assets are added.
//
// Drop-in your own (licensed / CC0) files to override any effect — no code
// change needed:
//   public/sounds/tap.mp3       — answer / button tap
//   public/sounds/correct.mp3   — correct answer            (present)
//   public/sounds/wrong.mp3     — wrong answer              (present)
//   public/sounds/complete.mp3  — quiz / deck finished
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
const buffers = new Map<string, AudioBuffer | null>();

function preload(name: string): void {
  const c = ac();
  if (!c || buffers.has(name)) return;
  buffers.set(name, null); // mark as "attempted" so we don't refetch on failure
  fetch(`/sounds/${name}.mp3`)
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error('missing'))))
    .then((a) => c.decodeAudioData(a))
    .then((b) => buffers.set(name, b))
    .catch(() => {
      /* no file (or undecodable) — the synth fallback covers it */
    });
}

// Warm the cache up front (safe while the context is still suspended on iOS).
['tap', 'correct', 'wrong', 'complete'].forEach(preload);

/** Play a preloaded sample. Returns false if none is available (→ use synth). */
function playSample(name: string, volume = 1): boolean {
  const c = ac();
  const buf = c ? buffers.get(name) : null;
  if (!c || !buf) return false;
  const src = c.createBufferSource();
  const g = c.createGain();
  src.buffer = buf;
  g.gain.value = volume;
  src.connect(g);
  g.connect(c.destination);
  src.start();
  return true;
}

// ---- Synthesized fallbacks ----
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
  g.gain.linearRampToValueAtTime(peak, t + 0.012);
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
    const p = peak * amp;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(p, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
}

/** Soft UI tick — answer/option tap, reveal, next. */
export function playTap(): void {
  if (playSample('tap', 0.5)) return;
  tone(660, 0, 0.05, 'sine', 0.09);
}

/** Correct answer — bright ascending bell arpeggio if no file. */
export function playCorrect(): void {
  if (playSample('correct', 0.4)) return;
  // E5 → G#5 → B5 → E6: a rising major chord, the classic "you got it!" cue.
  bell(659, 0, 0.5, 0.16); // E5
  bell(831, 0.09, 0.5, 0.16); // G#5
  bell(988, 0.18, 0.6, 0.17); // B5
  bell(1319, 0.28, 0.7, 0.13); // E6 sparkle
}

/** Wrong answer — gentle low double note if no file (never harsh). */
export function playWrong(): void {
  if (playSample('wrong', 0.6)) return;
  tone(196, 0, 0.22, 'sine', 0.16); // G3
  tone(147, 0.1, 0.3, 'sine', 0.14); // D3 — a soft downward "no"
}

/** SRS grade tap — pitch rises with confidence (1=hard … 3=know it). */
export function playGrade(grade: number): void {
  const freq = grade >= 3 ? 587 : grade === 2 ? 440 : 330; // D5 / A4 / E4
  bell(freq, 0, 0.35, 0.14);
}

/** Quiz / deck finished — short celebratory fanfare if no file. */
export function playComplete(): void {
  if (playSample('complete', 0.5)) return;
  // C5 → E5 → G5 → C6 rising fanfare with a bell timbre.
  bell(523, 0, 0.4, 0.15); // C5
  bell(659, 0.12, 0.4, 0.15); // E5
  bell(784, 0.24, 0.45, 0.16); // G5
  bell(1047, 0.38, 0.8, 0.17); // C6
}
