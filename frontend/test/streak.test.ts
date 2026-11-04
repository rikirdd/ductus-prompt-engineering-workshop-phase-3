import { describe, expect, it } from "vitest";
import { STREAK_THRESHOLD, isStreakMilestone, nextStreak } from "../src/streak";

describe("streak", () => {
  it("grows with each like", () => {
    expect(nextStreak(0, "like")).toBe(1);
    expect(nextStreak(4, "like")).toBe(5);
  });

  it("resets on a nope", () => {
    expect(nextStreak(4, "nope")).toBe(0);
    expect(nextStreak(0, "nope")).toBe(0);
  });

  it("celebrates at the threshold and at every multiple of it", () => {
    expect(isStreakMilestone(STREAK_THRESHOLD)).toBe(true);
    expect(isStreakMilestone(STREAK_THRESHOLD * 2)).toBe(true);
  });

  it("does not celebrate between milestones or without a streak", () => {
    expect(isStreakMilestone(0)).toBe(false);
    expect(isStreakMilestone(STREAK_THRESHOLD - 1)).toBe(false);
    expect(isStreakMilestone(STREAK_THRESHOLD + 1)).toBe(false);
  });

  it("reaches a milestone after threshold likes in a row but not when a nope breaks it", () => {
    const likes = Array<"like">(STREAK_THRESHOLD).fill("like");
    expect(isStreakMilestone(likes.reduce(nextStreak, 0))).toBe(true);

    const broken = [...likes.slice(1), "nope" as const];
    expect(isStreakMilestone(broken.reduce(nextStreak, 0))).toBe(false);
  });
});
