let cached: SpeechSynthesisVoice | null = null;

function greekVoice(): SpeechSynthesisVoice | null {
  if (cached) return cached;
  try {
    cached = speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith('el')) ?? null;
  } catch {
    cached = null;
  }
  return cached;
}

/** Say a Greek line with the system's el-GR voice, if one is installed; silent otherwise. */
export function speak(text: string): void {
  try {
    const voice = greekVoice();
    if (!voice) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.voice = voice;
    u.lang = voice.lang;
    u.rate = 0.9;
    speechSynthesis.speak(u);
  } catch {
    /* no speech support */
  }
}
