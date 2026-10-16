import type { StudyPlan } from './api';

/** Seconds per item, the same estimates as the server plan (telegram-bot/src/services/plan.ts). */
const SECONDS = { newQuestion: 40, reviewQuestion: 15, newWord: 15, reviewWord: 8 } as const;

/** How much review time one day asks for. Past a break the due pile can be hours long; asking for all
 * of it at once is a goal nobody meets. The rest stays due and is picked up on the next days. */
export const REVIEW_BUDGET_SECONDS = 25 * 60;

export interface DayGoal {
  /** Reviews still asked for today (within the budget). */
  reviewsLeft: number;
  /** Due reviews beyond today's budget: they wait for the next days. */
  carried: number;
  /** All reviews that were due today (done + still due). */
  reviewsDue: number;
  /** Today's goal, done and total, for the progress bar. */
  done: number;
  total: number;
  minutes: number;
  complete: boolean;
}

/** Today's achievable share of the plan: the new material plus as many due reviews as fit the budget. */
export function dayGoal(plan: StudyPlan): DayGoal {
  const cards = plan.reviews.cards;
  const words = plan.reviews.words;
  const left = cards + words;
  const reviewsDone = plan.today?.reviews.done ?? 0;
  const reviewsDue = reviewsDone + left;
  // Average review time of what is still due; before any is due, a question/word middle ground.
  const avg = left > 0 ? (cards * SECONDS.reviewQuestion + words * SECONDS.reviewWord) / left : 12;
  // The cap uses one fixed per-review time, so the day's goal does not drift as the question/word mix
  // of what is left changes; the minutes use the real mix.
  const budget = Math.floor(REVIEW_BUDGET_SECONDS / 12);
  const reviewGoal = Math.min(reviewsDue, budget);
  const reviewsLeft = Math.max(0, reviewGoal - reviewsDone);
  const newLeft = plan.newQuestions + plan.newWords;
  const newDone = (plan.today?.newQuestions.done ?? 0) + (plan.today?.newWords.done ?? 0);
  const done = newDone + Math.min(reviewsDone, reviewGoal);
  return {
    reviewsLeft,
    carried: left - reviewsLeft,
    reviewsDue,
    done,
    total: done + newLeft + reviewsLeft,
    minutes: Math.ceil((plan.newQuestions * SECONDS.newQuestion + plan.newWords * SECONDS.newWord + reviewsLeft * avg) / 60),
    complete: newLeft === 0 && reviewsLeft === 0,
  };
}
