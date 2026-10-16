import { supabase } from '../supabase';
import { dayKeyIn, prevDayKey, isValidTimeZone } from './sessionService';
import { MAX_REPORT_SECONDS, summariseStudyTime, type StudyMode, type StudyTime, type StudyTimeRow } from './studyTime';

/* Active study time in supabase/sql/study_time.sql: seconds per day and mode, on the learner's own
   calendar day. The totals are computed in studyTime.ts. */

export { isStudyMode } from './studyTime';

export async function recordStudyTime(accountId: string, mode: StudyMode, seconds: number, tz = 'UTC'): Promise<void> {
  const zone = isValidTimeZone(tz) ? tz : 'UTC';
  const s = Math.min(MAX_REPORT_SECONDS, Math.max(0, Math.floor(seconds)));
  if (s === 0) return;
  const { error } = await supabase.rpc('add_study_time', {
    p_account_id: accountId,
    p_day: dayKeyIn(new Date(), zone),
    p_mode: mode,
    p_seconds: s,
  });
  if (error) throw error;
}

/** Study time over the last `days` days; null when the table does not exist yet. */
export async function getStudyTime(accountId: string, tz = 'UTC', days = 35, now = new Date()): Promise<StudyTime | null> {
  const zone = isValidTimeZone(tz) ? tz : 'UTC';
  const todayKey = dayKeyIn(now, zone);
  let since = todayKey;
  for (let i = 1; i < days; i++) since = prevDayKey(since);
  const { data, error } = await supabase
    .from('study_time')
    .select('day, mode, seconds')
    .eq('account_id', accountId)
    .gte('day', since);
  if (error || !data) return null;
  return summariseStudyTime(data as StudyTimeRow[], todayKey);
}
