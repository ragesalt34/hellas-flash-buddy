// Tiny synthesized UI sounds (Web Audio) — no asset files, works offline.
// Short, soft, non-fatiguing — in the spirit of Duolingo/Drops feedback.

type Ctx = AudioContext;
let ctx: Ctx | null = null;

function ac(): Ctx | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume(); // iOS: resume inside the tap gesture
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, startAt: number, dur: number, type: OscillatorType = 'triangle', peak = 0.16): void {
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

/** Correct answer — bundled mp3, preloaded into a buffer for zero-latency playback. */
const CORRECT_VOL = 0.4;
let correctBuf: AudioBuffer | null = null;
let correctEl: HTMLAudioElement | null = null;

function preloadCorrect(): void {
  const c = ac();
  if (!c) return;
  fetch('/sounds/correct.mp3')
    .then((r) => r.arrayBuffer())
    .then((a) => c.decodeAudioData(a))
    .then((b) => {
      correctBuf = b;
    })
    .catch(() => {
      /* will fall back to <audio> */
    });
}
// Decode once up front (works even while the context is suspended on iOS).
preloadCorrect();

export function playCorrect(): void {
  const c = ac();
  if (c && correctBuf) {
    const src = c.createBufferSource();
    const g = c.createGain();
    src.buffer = correctBuf;
    g.gain.value = CORRECT_VOL;
    src.connect(g);
    g.connect(c.destination);
    src.start();
    return;
  }
  // fallback if the buffer isn't decoded yet
  try {
    if (!correctEl) {
      correctEl = new Audio('/sounds/correct.mp3');
      correctEl.volume = CORRECT_VOL;
    }
    correctEl.currentTime = 0;
    void correctEl.play();
  } catch {
    /* ignore */
  }
}

/** Wrong answer — soft low note (gentle, never harsh). */
export function playWrong(): void {
  tone(196, 0, 0.2, 'sine', 0.15);  // G3
  tone(155, 0.09, 0.24, 'sine', 0.13); // D#3
}

/** SRS grade tap — pitch rises with confidence (1=hard … 3=know it). */
export function playGrade(grade: number): void {
  const freq = grade >= 3 ? 587 : grade === 2 ? 440 : 330; // D5 / A4 / E4
  tone(freq, 0, 0.12, 'triangle', 0.14);
}
