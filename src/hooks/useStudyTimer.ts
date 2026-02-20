import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Tracks study time for the current session.
 * Automatically saves elapsed time to study_sessions when the session ends (unmount or pause).
 */
export function useStudyTimer(activityType: string = 'quiz') {
  const { user } = useAuth();
  const startTimeRef = useRef<number | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const savedRef = useRef(false);

  const saveSession = useCallback(async () => {
    if (!user || !startTimeRef.current || savedRef.current) return;
    
    const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
    if (durationSeconds < 5) return; // ignore very short sessions
    
    savedRef.current = true;

    try {
      await supabase.from('study_sessions').insert({
        user_id: user.id,
        duration_seconds: durationSeconds,
        activity_type: activityType,
        started_at: new Date(startTimeRef.current).toISOString(),
        ended_at: new Date().toISOString(),
      } as any);
    } catch (e) {
      console.error('Failed to save study session:', e);
    }
  }, [user, activityType]);

  useEffect(() => {
    if (!user) return;
    
    startTimeRef.current = Date.now();
    savedRef.current = false;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        saveSession();
      } else {
        // Resumed - start new tracking
        startTimeRef.current = Date.now();
        savedRef.current = false;
      }
    };

    const handleBeforeUnload = () => {
      saveSession();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      saveSession();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user, saveSession]);
}
