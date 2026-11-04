import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LoveHeart, NEW_HEART_SCALE, heartScale } from "../src/LoveHeart";

describe("LoveHeart", () => {
  it("shows the percentage inside a heart", () => {
    render(<LoveHeart stats={{ likes: 87, total: 100, percentage: 87 }} />);

    const heart = screen.getByRole("img", { name: "87% of people loved this" });
    expect(heart).toHaveTextContent("87%");
  });

  it("grows with the percentage", () => {
    expect(heartScale(0)).toBeCloseTo(0.55);
    expect(heartScale(50)).toBeCloseTo(0.775);
    expect(heartScale(100)).toBe(1);
    expect(heartScale(0)).toBeLessThan(heartScale(87));
  });

  it("sizes the heart for its percentage", () => {
    render(<LoveHeart stats={{ likes: 1, total: 1, percentage: 100 }} />);

    expect(screen.getByRole("img", { name: "100% of people loved this" })).toHaveStyle({ transform: "scale(1)" });
  });

  it("shows 0% in the smallest heart when everyone noped it", () => {
    render(<LoveHeart stats={{ likes: 0, total: 5, percentage: 0 }} />);

    expect(screen.getByRole("img", { name: "0% of people loved this" })).toHaveStyle({ transform: "scale(0.55)" });
  });

  it("shows a small NEW heart instead of a number while nobody has swiped the meme", () => {
    render(<LoveHeart stats={{ likes: 0, total: 0, percentage: null }} />);

    const heart = screen.getByRole("img", { name: "New meme: nobody has judged it yet" });
    expect(heart).toHaveTextContent("NEW");
    expect(heart).not.toHaveTextContent("%");
    expect(heart).toHaveStyle({ transform: `scale(${NEW_HEART_SCALE})` });
  });
});
