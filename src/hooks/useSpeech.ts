import { useState, useCallback, useRef } from 'react';

const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// In-memory cache of audio URLs across component instances
const urlCache = new Map<string, string>();

export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(async (text: string, cacheKey?: string) => {
    if (!text) return;

    stop();

    try {
      setIsSpeaking(true);

      // Check in-memory cache first
      if (cacheKey && urlCache.has(cacheKey)) {
        const audio = new Audio(urlCache.get(cacheKey)!);
        audioRef.current = audio;
        audio.onended = () => setIsSpeaking(false);
        audio.onerror = () => setIsSpeaking(false);
        await audio.play();
        return;
      }

      const response = await fetch(TTS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ANON_KEY}`,
        },
        body: JSON.stringify({ text, cacheKey }),
      });

      if (!response.ok) {
        throw new Error(`TTS failed: ${response.status}`);
      }

      const contentType = response.headers.get("Content-Type") || "";

      let audioUrl: string;

      if (contentType.includes("application/json")) {
        // Got cached URL back
        const data = await response.json();
        audioUrl = data.audioUrl;
      } else {
        // Got raw audio blob
        const blob = await response.blob();
        audioUrl = URL.createObjectURL(blob);
      }

      if (cacheKey) {
        urlCache.set(cacheKey, audioUrl);
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => setIsSpeaking(false);
      audio.onerror = () => setIsSpeaking(false);
      await audio.play();
    } catch (error) {
      console.error("Speech error:", error);
      setIsSpeaking(false);
    }
  }, [stop]);

  return { speak, stop, isSpeaking, isSupported: true };
}
