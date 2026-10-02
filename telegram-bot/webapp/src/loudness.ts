// Perceived-loudness helpers (ITU-R BS.1770), shared by the UI sounds
// (sound.ts) and spoken Greek (speech.ts) so both level audio the same way.

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

/** The clip mixed to mono and K-weighted, plus its sample peak. */
export function kWeightedMono(buf: AudioBuffer): { x: Float64Array; peak: number } {
  const n = buf.length;
  let x = new Float64Array(n);
  let peak = 0;
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < n; i++) {
      x[i] += d[i] / buf.numberOfChannels;
      const a = d[i] < 0 ? -d[i] : d[i];
      if (a > peak) peak = a;
    }
  }
  for (const { b, a } of kWeighting(buf.sampleRate)) {
    const y = new Float64Array(n);
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < n; i++) {
      const v = b[0] * x[i] + b[1] * x1 + b[2] * x2 - a[0] * y1 - a[1] * y2;
      x2 = x1; x1 = x[i]; y2 = y1; y1 = v;
      y[i] = v;
    }
    x = y;
  }
  return { x, peak };
}

/** Mean power of every window of `win` samples, stepping by `hop`. A signal
 * shorter than one window is measured as if padded with silence. */
export function windowPowers(x: Float64Array, win: number, hop: number): number[] {
  const n = x.length;
  const sq = new Float64Array(n + 1); // prefix sums of squares
  for (let i = 0; i < n; i++) sq[i + 1] = sq[i] + x[i] * x[i];
  if (n < win) return [sq[n] / Math.max(1, win)];
  const out: number[] = [];
  for (let i = 0; i + win <= n; i += hop) out.push((sq[i + win] - sq[i]) / win);
  return out;
}

export const lufs = (power: number): number => -0.691 + 10 * Math.log10(Math.max(power, 1e-12));
