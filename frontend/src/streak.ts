import type { Direction } from "./api";

/** Consecutive likes needed to celebrate. Every multiple (5, 10, 15, ...) celebrates again. */
export const STREAK_THRESHOLD = 5;

/** The streak after a swipe: a like extends it, a nope breaks it. */
export function nextStreak(streak: number, direction: Direction): number {
  return direction === "like" ? streak + 1 : 0;
}

/** True when the streak has just reached a celebration point. */
export function isStreakMilestone(streak: number, threshold = STREAK_THRESHOLD): boolean {
  return streak > 0 && streak % threshold === 0;
}
