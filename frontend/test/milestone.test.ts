import { describe, expect, it } from "vitest";
import { SWIPE_MILESTONE, reachedSwipeMilestone } from "../src/milestone";

const M = SWIPE_MILESTONE;

describe("reachedSwipeMilestone", () => {
  it("is the 30th swipe", () => {
    expect(SWIPE_MILESTONE).toBe(30);
  });

  it("fires when a swipe reaches the milestone", () => {
    expect(reachedSwipeMilestone(M - 1, M)).toBe(true);
    expect(reachedSwipeMilestone(null, M)).toBe(true);
  });

  it("does not fire on the swipe before or after it", () => {
    expect(reachedSwipeMilestone(M - 2, M - 1)).toBe(false);
    expect(reachedSwipeMilestone(M, M + 1)).toBe(false);
  });

  it("does not fire twice when the count stays at the milestone", () => {
    expect(reachedSwipeMilestone(M, M)).toBe(false);
  });
});
