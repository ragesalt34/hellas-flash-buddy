import { api } from './api';

let current: HTMLAudioElement | null = null;

/** Plays Greek pronunciation for `text`, cached server-side under `cacheKey`. Fire-and-forget. */
export async function speakGreek(text: string, cacheKey: string): Promise<void> {
  try {
    current?.pause();
    const { audioUrl } = await api.tts(text, cacheKey);
    current = new Audio(audioUrl);
    await current.play();
  } catch {
    /* non-critical UX — ignore playback/network failures */
  }
}
