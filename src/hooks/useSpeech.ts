import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';

const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`;

// In-memory cache of audio URLs across component instances
const urlCache = new Map<string, string>();
// Tracks in-flight fetches to prevent duplicate requests for the same key
const pendingKeys = new Set<string>();

export function useSpeech() {
  const { language } = useLanguage();
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

      const response = await fetch(TTS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text, cacheKey }),
      });

      if (cacheKey) pendingKeys.delete(cacheKey);

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
      setIsSpeaking(false);
      toast.error(
        language === 'ru' ? 'Ошибка воспроизведения' : 'Σφάλμα αναπαραγωγής',
        { description: language === 'ru' ? 'Не удалось загрузить аудио' : 'Αδυναμία φόρτωσης ήχου' },
      );
    }
  }, [stop]);

  return { speak, stop, isSpeaking, isSupported: true };
}
