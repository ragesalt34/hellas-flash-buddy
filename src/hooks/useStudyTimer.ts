import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Tracks study time for the current session.
 * Only counts time while the user is actively interacting (click / keydown / touch).
 * After 2 minutes of no interaction the current segment is saved and the timer
 * pauses — the next interaction starts a fresh segment.
 * Uses fetch with keepalive for reliable saves during navigation/unload.
 */

const INACTIVITY_MS = 2 * 60 * 1000; // 2 minutes

export function useStudyTimer(activityType: string = 'quiz') {
  const { user } = useAuth();
  const startTimeRef = useRef<number | null>(null);
  const savedRef = useRef(false);
  const inactivityRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    // Extract project ID from the Supabase URL (e.g. https://<project-id>.supabase.co)
    const projectId = (import.meta.env.VITE_SUPABASE_URL || '').match(/\/\/([^.]+)\./)?.[1] || '';
    const storageKey = `sb-${projectId}-auth-token`;
    const stored = localStorage.getItem(storageKey);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored);
      const token = parsed.access_token;
      if (token) sendViaFetch(payload, token);
    } catch {}
  }, [buildPayload, sendViaFetch]);

  const clearInactivity = useCallback(() => {
    if (inactivityRef.current) {
      clearTimeout(inactivityRef.current);
      inactivityRef.current = null;
    }
  }, []);

  const scheduleInactivity = useCallback((onInactive: () => void) => {
    clearInactivity();
    inactivityRef.current = setTimeout(onInactive, INACTIVITY_MS);
  }, [clearInactivity]);

  useEffect(() => {
    if (!user) return;

    startTimeRef.current = Date.now();
    savedRef.current = false;

    const onInactive = () => {
      // User hasn't interacted for 5 min — save and pause
      saveAsync();
    };

    // Schedule initial inactivity check
    scheduleInactivity(onInactive);

    const handleActivity = () => {
      // If session was saved (paused due to inactivity), restart it
      if (savedRef.current || !startTimeRef.current) {
        startTimeRef.current = Date.now();
        savedRef.current = false;
      }
      // Reset the inactivity countdown
      scheduleInactivity(onInactive);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearInactivity();
        saveAsync();
      } else {
        // Tab is visible again — restart timer and inactivity check
        startTimeRef.current = Date.now();
        savedRef.current = false;
        scheduleInactivity(onInactive);
      }
    };

    const handleBeforeUnload = () => {
      saveSync();
    };

    // Only genuine interactions count as study activity
    const ACTIVITY_EVENTS = ['click', 'keydown', 'touchstart'] as const;
    ACTIVITY_EVENTS.forEach(e => document.addEventListener(e, handleActivity, { passive: true }));
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInactivity();
      saveAsync(); // SPA navigation — page still alive
      ACTIVITY_EVENTS.forEach(e => document.removeEventListener(e, handleActivity));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user, saveAsync, saveSync, scheduleInactivity, clearInactivity]);
}
