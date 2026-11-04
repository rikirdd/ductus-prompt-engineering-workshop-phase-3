import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CONFETTI_DURATION_MS, Confetti } from "../src/Confetti";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Confetti", () => {
  it("shows the streak message and confetti pieces", () => {
    render(<Confetti message="5 likes in a row!" />);

    expect(screen.getByRole("status")).toHaveTextContent("5 likes in a row!");
    expect(screen.getByTestId("confetti-pieces").children.length).toBeGreaterThan(0);
  });

  it("disappears after its duration", () => {
    render(<Confetti message="5 likes in a row!" />);

    act(() => vi.advanceTimersByTime(CONFETTI_DURATION_MS));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows only the message when the user prefers reduced motion", () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));

    render(<Confetti message="5 likes in a row!" />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByTestId("confetti-pieces")).not.toBeInTheDocument();
  });
});
