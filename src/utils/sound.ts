let ctx: AudioContext | null = null;

export function playPing() {
  try {
    if (!ctx) ctx = new AudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    // sweep down: 1050 Hz → 620 Hz over 70ms — классический "blop"
    osc.frequency.setValueAtTime(1050, now);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.07);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

    osc.start(now);
    osc.stop(now + 0.07);
  } catch {
    // ignore if AudioContext unavailable
  }
}
