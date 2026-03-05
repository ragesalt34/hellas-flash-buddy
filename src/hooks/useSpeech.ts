import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`;

// In-memory cache of audio URLs across component instances
const urlCache = new Map<string, string>();
// Tracks in-flight fetches to prevent duplicate requests for the same key
const pendingKeys = new Set<string>();

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

      // Skip if an identical request is already in-flight
      if (cacheKey && pendingKeys.has(cacheKey)) {
        setIsSpeaking(false);
        return;
      }
      if (cacheKey) pendingKeys.add(cacheKey);

      // Get user's JWT token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        if (cacheKey) pendingKeys.delete(cacheKey);
        throw new Error("Not authenticated");
      }

      let response: Response;
      try {
        response = await fetch(TTS_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ text, cacheKey }),
        });
      } finally {
        // Always release the key, even on network error — so retries work
        if (cacheKey) pendingKeys.delete(cacheKey);
      }

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
        // Got raw audio blob; revoke any previous blob for this key to avoid memory leak
        const blob = await response.blob();
        const existing = cacheKey ? urlCache.get(cacheKey) : undefined;
        if (existing?.startsWith('blob:')) URL.revokeObjectURL(existing);
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
      // Clear stale cache entry so retry attempts re-fetch fresh audio
      if (cacheKey) {
        const cached = urlCache.get(cacheKey);
        if (cached?.startsWith('blob:')) URL.revokeObjectURL(cached);
        urlCache.delete(cacheKey);
      }
      setIsSpeaking(false);
      const lang = localStorage.getItem('language') || 'ru';
      toast.error(
        lang === 'ru' ? 'Ошибка воспроизведения' : 'Σφάλμα αναπαραγωγής',
        { description: lang === 'ru' ? 'Не удалось загрузить аудио' : 'Αδυναμία φόρτωσης ήχου' },
      );
    }
  }, [stop]);

  // Stop audio playback when component unmounts (e.g. user navigates away mid-TTS)
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { speak, stop, isSpeaking, isSupported: true };
}
