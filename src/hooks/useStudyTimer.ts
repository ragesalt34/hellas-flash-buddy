import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Tracks study time for the current session.
 * Uses fetch with keepalive for reliable saves during navigation/unload.
 */
export function useStudyTimer(activityType: string = 'quiz') {
  const { user } = useAuth();
  const startTimeRef = useRef<number | null>(null);
  const savedRef = useRef(false);

  const buildPayload = useCallback(() => {
    if (!user || !startTimeRef.current) return null;
    const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
    if (durationSeconds < 5) return null;
    return {
      user_id: user.id,
      duration_seconds: durationSeconds,
      activity_type: activityType,
      started_at: new Date(startTimeRef.current).toISOString(),
      ended_at: new Date().toISOString(),
    };
  }, [user, activityType]);

  const sendViaFetch = useCallback((payload: object, token: string) => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/study_sessions`;
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        'Authorization': `Bearer ${token}`,
        'Prefer': 'return=minimal',
      },
      keepalive: true,
      body: JSON.stringify(payload),
    }).catch(() => {});
  }, []);

  // Async save — gets fresh token, used for unmount & visibilitychange
  const saveAsync = useCallback(() => {
    if (savedRef.current) return;
    const payload = buildPayload();
    if (!payload) return;
    savedRef.current = true;

    supabase.auth.getSession().then(({ data }) => {
      const token = data.session?.access_token;
      if (token) sendViaFetch(payload, token);
    });
  }, [buildPayload, sendViaFetch]);

  // Sync save — reads token from localStorage, used for beforeunload
  const saveSync = useCallback(() => {
    if (savedRef.current) return;
    const payload = buildPayload();
    if (!payload) return;
    savedRef.current = true;

    const storageKey = `sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID}-auth-token`;
    const stored = localStorage.getItem(storageKey);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored);
      const token = parsed.access_token;
      if (token) sendViaFetch(payload, token);
    } catch {}
  }, [buildPayload, sendViaFetch]);

  useEffect(() => {
    if (!user) return;

    startTimeRef.current = Date.now();
    savedRef.current = false;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        saveAsync();
      } else {
        startTimeRef.current = Date.now();
        savedRef.current = false;
      }
    };

    const handleBeforeUnload = () => {
      saveSync();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      saveAsync(); // SPA navigation — page still alive
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user, saveAsync, saveSync]);
}
