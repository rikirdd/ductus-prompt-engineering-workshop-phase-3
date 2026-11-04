import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STAMP_DURATION_MS, SWIPE_THRESHOLD, MemeCard } from "../src/MemeCard";

const meme = { id: "m1", caption: "It works on my machine", imageUrl: "/api/memes/images/m1.svg" };

function setup(disabled = false) {
  const onSwipe = vi.fn();
  render(<MemeCard meme={meme} onSwipe={onSwipe} disabled={disabled} />);
  return { onSwipe, card: screen.getByRole("img", { name: meme.caption }).closest("figure")! };
}

/** Lets the stamp finish so the swipe is reported. */
function finishStamp() {
  act(() => vi.advanceTimersByTime(STAMP_DURATION_MS));
}

function drag(card: HTMLElement, distance: number) {
  fireEvent.pointerDown(card, { clientX: 200, pointerId: 1 });
  fireEvent.pointerMove(card, { clientX: 200 + distance, pointerId: 1 });
  fireEvent.pointerUp(card, { clientX: 200 + distance, pointerId: 1 });
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("MemeCard", () => {
  it("shows how much people loved the meme when stats are given", () => {
    render(<MemeCard meme={{ ...meme, stats: { likes: 2, total: 3, percentage: 67 } }} onSwipe={vi.fn()} />);

    expect(screen.getByRole("img", { name: "67% of people loved this" })).toHaveTextContent("67%");
  });

  it("shows no love heart without stats", () => {
    setup();

    expect(screen.queryByRole("img", { name: /loved this|judged/ })).not.toBeInTheDocument();
  });

  it("shows the meme image with the caption as alt text", () => {
    setup();

    expect(screen.getByRole("img", { name: meme.caption })).toHaveAttribute("src", meme.imageUrl);
  });

  it.each([
    ["Like", "like"],
    ["Nope", "nope"],
  ])("calls onSwipe with %s when its button is clicked", (label, direction) => {
    const { onSwipe } = setup();

    fireEvent.click(screen.getByRole("button", { name: label }));
    finishStamp();

    expect(onSwipe).toHaveBeenCalledExactlyOnceWith(direction);
  });

  it.each([
    ["ArrowRight", "like"],
    ["ArrowLeft", "nope"],
  ])("calls onSwipe when %s is pressed", (key, direction) => {
    const { onSwipe } = setup();

    fireEvent.keyDown(window, { key });
    finishStamp();

    expect(onSwipe).toHaveBeenCalledExactlyOnceWith(direction);
  });

  it("ignores other keys", () => {
    const { onSwipe } = setup();

    fireEvent.keyDown(window, { key: "ArrowUp" });
    finishStamp();

    expect(onSwipe).not.toHaveBeenCalled();
  });

  it.each([
    [SWIPE_THRESHOLD, "like"],
    [-SWIPE_THRESHOLD, "nope"],
  ])("calls onSwipe when dragged %ipx", (distance, direction) => {
    const { onSwipe, card } = setup();

    drag(card, distance);
    finishStamp();

    expect(onSwipe).toHaveBeenCalledExactlyOnceWith(direction);
  });

  it("follows the pointer while dragging and snaps back when released before the threshold", () => {
    const { onSwipe, card } = setup();

    fireEvent.pointerDown(card, { clientX: 200, pointerId: 1 });
    fireEvent.pointerMove(card, { clientX: 250, pointerId: 1 });
    expect(card.style.transform).toContain("translateX(50px)");
    fireEvent.pointerUp(card, { clientX: 250, pointerId: 1 });

    expect(onSwipe).not.toHaveBeenCalled();
    expect(card.style.transform).toContain("translateX(0px)");
  });

  it("does nothing when disabled", () => {
    const { onSwipe, card } = setup(true);

    drag(card, SWIPE_THRESHOLD * 2);
    fireEvent.keyDown(window, { key: "ArrowRight" });
    finishStamp();

    expect(onSwipe).not.toHaveBeenCalled();
    expect(screen.queryByText("LIKE")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Like" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Nope" })).toBeDisabled();
  });

  describe("stamps", () => {
    it("shows no stamp before a swipe", () => {
      setup();

      expect(screen.queryByText("LIKE")).not.toBeInTheDocument();
      expect(screen.queryByText("NOPE")).not.toBeInTheDocument();
    });

    it.each([
      [50, "LIKE", "0.5"],
      [-25, "NOPE", "0.25"],
      [SWIPE_THRESHOLD * 2, "LIKE", "1"],
    ])("fades in while dragging %ipx: %s at opacity %s", (distance, label, opacity) => {
      const { card } = setup();

      fireEvent.pointerDown(card, { clientX: 200, pointerId: 1 });
      fireEvent.pointerMove(card, { clientX: 200 + distance, pointerId: 1 });

      expect(screen.getByText(label)).toHaveStyle({ opacity });
    });

    it("hides the stamp when a short drag snaps back", () => {
      const { card } = setup();

      drag(card, SWIPE_THRESHOLD / 2);

      expect(screen.queryByText("LIKE")).not.toBeInTheDocument();
    });

    it.each([
      [SWIPE_THRESHOLD, "LIKE", "like"],
      [-SWIPE_THRESHOLD, "NOPE", "nope"],
    ])("shows the full stamp after a %ipx drag before reporting the swipe", (distance, label, direction) => {
      const { onSwipe, card } = setup();

      drag(card, distance);

      expect(screen.getByText(label)).toHaveStyle({ opacity: "1" });
      expect(onSwipe).not.toHaveBeenCalled();
      finishStamp();
      expect(onSwipe).toHaveBeenCalledExactlyOnceWith(direction);
    });

    it.each([
      ["Like", "LIKE"],
      ["Nope", "NOPE"],
    ])("shows the %s stamp when its button is clicked", (button, label) => {
      setup();

      fireEvent.click(screen.getByRole("button", { name: button }));

      expect(screen.getByText(label)).toHaveStyle({ opacity: "1" });
    });

    it.each([
      ["ArrowRight", "LIKE"],
      ["ArrowLeft", "NOPE"],
    ])("shows the stamp when %s is pressed", (key, label) => {
      setup();

      fireEvent.keyDown(window, { key });

      expect(screen.getByText(label)).toHaveStyle({ opacity: "1" });
    });

    it("ignores further input while the stamp shows", () => {
      const { onSwipe } = setup();

      fireEvent.keyDown(window, { key: "ArrowRight" });
      fireEvent.keyDown(window, { key: "ArrowLeft" });
      fireEvent.click(screen.getByRole("button", { name: "Nope" }));
      finishStamp();

      expect(onSwipe).toHaveBeenCalledExactlyOnceWith("like");
      expect(screen.queryByText("NOPE")).not.toBeInTheDocument();
    });

    it("clears the stamp and accepts input again once the swipe has settled", async () => {
      const onSwipe = vi.fn().mockResolvedValue(undefined);
      render(<MemeCard meme={meme} onSwipe={onSwipe} />);
      fireEvent.keyDown(window, { key: "ArrowRight" });

      await act(async () => vi.advanceTimersByTime(STAMP_DURATION_MS));

      expect(screen.queryByText("LIKE")).not.toBeInTheDocument();
      fireEvent.keyDown(window, { key: "ArrowLeft" });
      finishStamp();
      expect(onSwipe).toHaveBeenLastCalledWith("nope");
    });
  });

  describe("transitions", () => {
    it("springs in when it appears", () => {
      const { card } = setup();

      expect(card).toHaveClass("meme-card");
      expect(card).not.toHaveClass("leaving");
    });

    const swipes: [string, string, (card: HTMLElement) => void][] = [
      ["the Like button", "like", () => fireEvent.click(screen.getByRole("button", { name: "Like" }))],
      ["the Nope button", "nope", () => fireEvent.click(screen.getByRole("button", { name: "Nope" }))],
      ["the right arrow", "like", () => fireEvent.keyDown(window, { key: "ArrowRight" })],
      ["the left arrow", "nope", () => fireEvent.keyDown(window, { key: "ArrowLeft" })],
      ["a right drag", "like", (card) => drag(card, SWIPE_THRESHOLD)],
      ["a left drag", "nope", (card) => drag(card, -SWIPE_THRESHOLD)],
    ];

    it.each(swipes)("flies off in the swipe direction after %s", (_, direction, swipe) => {
      const { card } = setup();

      swipe(card);

      expect(card).toHaveClass("leaving");
      expect(card.style.transform).toContain(direction === "like" ? "translateX(600px)" : "translateX(-600px)");
      expect(card.style.opacity).toBe("0");
    });

    it("fades out without flying off when the user prefers reduced motion", () => {
      vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));
      const { card } = setup();

      fireEvent.click(screen.getByRole("button", { name: "Like" }));

      expect(card).toHaveClass("leaving");
      expect(card.style.transform).toContain("translateX(0px)");
      expect(card.style.opacity).toBe("0");
    });

    it("comes back when the swipe has settled without replacing the card", async () => {
      const onSwipe = vi.fn().mockResolvedValue(undefined);
      render(<MemeCard meme={meme} onSwipe={onSwipe} />);
      const card = screen.getByRole("img", { name: meme.caption }).closest("figure")!;
      fireEvent.click(screen.getByRole("button", { name: "Like" }));

      await act(async () => vi.advanceTimersByTime(STAMP_DURATION_MS));

      expect(card).not.toHaveClass("leaving");
      expect(card.style.transform).toContain("translateX(0px)");
    });
  });
});
