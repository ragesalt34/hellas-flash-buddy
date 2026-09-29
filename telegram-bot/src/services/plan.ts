export type PlanPhase = 'none' | 'past' | 'learn' | 'final';
export type PlanPace = 'none' | 'done' | 'final' | 'behind' | 'tight' | 'calm';

export interface PlanInput {
  interviewDate: string | null;
  today: string;
  totalQuestions: number;
  seenQuestions: number;
  totalWords: number;
  seenWords: number;
  dueCards: number;
  dueWords: number;
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
  const minutesFor = (q: number, w: number) =>
    Math.ceil(
      (q * PLAN_SECONDS.newQuestion +
        reviews.cards * PLAN_SECONDS.reviewQuestion +
        w * PLAN_SECONDS.newWord +
        reviews.words * PLAN_SECONDS.reviewWord) /
        60
    );
  const idle = { date: i.interviewDate, unseen, reviews, newQuestions: 0, newWords: 0, minutes: minutesFor(0, 0), finishNewBy: null };
  if (!i.interviewDate) return { ...idle, daysLeft: null, phase: 'none', pace: 'none' };
  const daysLeft = dayNumber(i.interviewDate) - dayNumber(i.today);
  if (daysLeft < 0) return { ...idle, daysLeft, phase: 'past', pace: 'none' };

  const buffer = Math.min(21, Math.floor(daysLeft * 0.15));
  const learnDays = daysLeft - buffer;
  const spread = learnDays > 0 ? learnDays : Math.max(1, daysLeft);
  const newQuestions = unseen.questions ? Math.ceil(unseen.questions / spread) : 0;
  const newWords = unseen.words ? Math.ceil(unseen.words / spread) : 0;
  const minutes = minutesFor(newQuestions, newWords);
  // Pace judges only the new material against the date: a pile of due reviews is
  // today's load (it clears as it is worked through), not a sign of being late.
  const newMinutes = Math.ceil((newQuestions * PLAN_SECONDS.newQuestion + newWords * PLAN_SECONDS.newWord) / 60);
  const phase: PlanPhase = learnDays > 0 ? 'learn' : 'final';
  const left = unseen.questions + unseen.words;
  const pace: PlanPace =
    left === 0 ? (phase === 'final' ? 'final' : 'done')
    : phase === 'final' || newMinutes > 20 ? 'behind'
    : newMinutes > 10 ? 'tight'
    : 'calm';
  return {
    date: i.interviewDate, daysLeft, phase, pace, newQuestions, newWords, reviews, unseen, minutes,
    finishNewBy: dayKey(dayNumber(i.interviewDate) - buffer),
  };
}
