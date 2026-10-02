export type PlanPhase = 'none' | 'past' | 'learn' | 'final';
export type PlanPace = 'none' | 'done' | 'final' | 'behind' | 'tight' | 'calm';

export interface PlanInput {
  interviewDate: string | null;
  today: string;
  totalQuestions: number;
  seenQuestions: number;
  totalWords: number;
  seenWords: number;
  /** Still to review today: due by the end of the day and not touched today. */
  dueCards: number;
  dueWords: number;
  /** Reviews already done today (touched today, not first seen today). */
  doneCards?: number;
  doneWords?: number;
  /** Material first seen today; still counted in seenQuestions / seenWords. */
  newQuestionsToday?: number;
  newWordsToday?: number;
}

export interface PlanToday {
  newQuestions: { done: number; target: number };
  newWords: { done: number; target: number };
  reviews: { done: number; left: number };
  /** Everything planned for today is done. */
  complete: boolean;
}

export interface StudyPlan {
  date: string | null;
  daysLeft: number | null;
  phase: PlanPhase;
  pace: PlanPace;
  newQuestions: number;
  newWords: number;
  reviews: { cards: number; words: number };
  unseen: { questions: number; words: number };
  minutes: number;
  finishNewBy: string | null;
  today: PlanToday;
}

export const PLAN_SECONDS = { newQuestion: 40, reviewQuestion: 15, newWord: 15, reviewWord: 8 } as const;
const DAY_MS = 86_400_000;
const dayNumber = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / DAY_MS;
};
const dayKey = (n: number) => new Date(n * DAY_MS).toISOString().slice(0, 10);

export function computePlan(i: PlanInput): StudyPlan {
  const unseen = {
    questions: Math.max(0, i.totalQuestions - i.seenQuestions),
    words: Math.max(0, i.totalWords - i.seenWords),
  };
  const reviews = { cards: i.dueCards, words: i.dueWords };
  const newToday = { q: i.newQuestionsToday ?? 0, w: i.newWordsToday ?? 0 };
  // Today's share is fixed at the start of the day: what was unseen this
  // morning, so learning new material during the day does not move the target.
  const unseenAtStart = { questions: unseen.questions + newToday.q, words: unseen.words + newToday.w };
  const reviewsDone = (i.doneCards ?? 0) + (i.doneWords ?? 0);
  const todayFor = (targetQ: number, targetW: number): PlanToday => {
    const leftQ = Math.max(0, targetQ - newToday.q);
    const leftW = Math.max(0, targetW - newToday.w);
    return {
      newQuestions: { done: newToday.q, target: targetQ },
      newWords: { done: newToday.w, target: targetW },
      reviews: { done: reviewsDone, left: reviews.cards + reviews.words },
      complete: leftQ === 0 && leftW === 0 && reviews.cards + reviews.words === 0,
    };
  };
  const minutesFor = (q: number, w: number) =>
    Math.ceil(
      (q * PLAN_SECONDS.newQuestion +
        reviews.cards * PLAN_SECONDS.reviewQuestion +
        w * PLAN_SECONDS.newWord +
        reviews.words * PLAN_SECONDS.reviewWord) /
        60
    );
  const idle = {
    date: i.interviewDate, unseen, reviews, newQuestions: 0, newWords: 0, minutes: minutesFor(0, 0), finishNewBy: null,
    today: todayFor(0, 0),
  };
  if (!i.interviewDate) return { ...idle, daysLeft: null, phase: 'none', pace: 'none' };
  const daysLeft = dayNumber(i.interviewDate) - dayNumber(i.today);
  if (daysLeft < 0) return { ...idle, daysLeft, phase: 'past', pace: 'none' };

  const buffer = Math.min(21, Math.floor(daysLeft * 0.15));
  const learnDays = daysLeft - buffer;
  const spread = learnDays > 0 ? learnDays : Math.max(1, daysLeft);
  const targetQ = unseenAtStart.questions ? Math.ceil(unseenAtStart.questions / spread) : 0;
  const targetW = unseenAtStart.words ? Math.ceil(unseenAtStart.words / spread) : 0;
  const today = todayFor(targetQ, targetW);
  // What is left of today's new material; the minutes are what is left of today.
  const newQuestions = Math.max(0, targetQ - newToday.q);
  const newWords = Math.max(0, targetW - newToday.w);
  const minutes = minutesFor(newQuestions, newWords);
  // Pace judges only the day's new-material target against the date: a pile of
  // due reviews is today's load (it clears as it is worked through), not lateness.
  const newMinutes = Math.ceil((targetQ * PLAN_SECONDS.newQuestion + targetW * PLAN_SECONDS.newWord) / 60);
  const phase: PlanPhase = learnDays > 0 ? 'learn' : 'final';
  const left = unseenAtStart.questions + unseenAtStart.words;
  const pace: PlanPace =
    left === 0 ? (phase === 'final' ? 'final' : 'done')
    : phase === 'final' || newMinutes > 20 ? 'behind'
    : newMinutes > 10 ? 'tight'
    : 'calm';
  return {
    date: i.interviewDate, daysLeft, phase, pace, newQuestions, newWords, reviews, unseen, minutes,
    finishNewBy: dayKey(dayNumber(i.interviewDate) - buffer),
    today,
  };
}
