/* Active study time, the pure part (no database): the web app counts seconds only while a study
   screen is visible and the learner did something in the last two minutes, and reports them about
   once a minute. studyTimeService.ts stores and reads them. */

/** The calendar day before a YYYY-MM-DD key (same rule as sessionService.prevDayKey). */
function prevDay(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d) - 86_400_000).toISOString().slice(0, 10);
}

export const STUDY_MODES = ['quiz', 'flashcards', 'vocab', 'homework'] as const;
export type StudyMode = (typeof STUDY_MODES)[number];

/** One report covers about a minute; anything far above that is not a real report. */
export const MAX_REPORT_SECONDS = 300;

export const isStudyMode = (v: unknown): v is StudyMode =>
  typeof v === 'string' && (STUDY_MODES as readonly string[]).includes(v);

export interface StudyTime {
  /** Seconds today, all modes. */
  today: number;
  todayByMode: Record<StudyMode, number>;
  /** Seconds over the last 7 days, today included. */
  week: number;
  /** Seconds per day (YYYY-MM-DD) over the window read. */
  byDay: Record<string, number>;
}

export interface StudyTimeRow {
  day: string;
  mode: string;
  seconds: number;
}

/** Totals from raw rows. Pure, so the day boundaries can be tested without a database. */
export function summariseStudyTime(rows: StudyTimeRow[], todayKey: string): StudyTime {
  const todayByMode = { quiz: 0, flashcards: 0, vocab: 0, homework: 0 } as Record<StudyMode, number>;
  const byDay: Record<string, number> = {};
  const weekDays = new Set<string>();
  let key = todayKey;
  for (let i = 0; i < 7; i++) {
    weekDays.add(key);
    key = prevDay(key);
  }
  let today = 0;
  let week = 0;
  for (const r of rows) {
    const day = String(r.day).slice(0, 10);
    const s = Math.max(0, Math.floor(Number(r.seconds) || 0));
    byDay[day] = (byDay[day] ?? 0) + s;
    if (weekDays.has(day)) week += s;
    if (day === todayKey) {
      today += s;
      if (isStudyMode(r.mode)) todayByMode[r.mode] += s;
    }
  }
  return { today, todayByMode, week, byDay };
}
