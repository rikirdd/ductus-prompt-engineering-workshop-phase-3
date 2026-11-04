/** The swipe count that gets its own celebration. */
export const SWIPE_MILESTONE = 30;

/**
 * True when a swipe has just brought the user to the milestone. `before` is the count from the
 * previous swipe response (null when there was none), so a repeated count at the milestone does not fire again.
 */
export function reachedSwipeMilestone(before: number | null, after: number, milestone = SWIPE_MILESTONE): boolean {
  return after === milestone && before !== milestone;
}
