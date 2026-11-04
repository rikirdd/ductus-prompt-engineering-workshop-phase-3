import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FIREWORKS_DURATION_MS, Fireworks } from "../src/Fireworks";
import { createFakeAudioContext } from "./audio";

let audio: ReturnType<typeof createFakeAudioContext>;

beforeEach(() => {
  vi.useFakeTimers();
  audio = createFakeAudioContext();
  vi.stubGlobal("AudioContext", audio.AudioContext);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Fireworks", () => {
  it("shows the message and the bursts", () => {
    render(<Fireworks message="30 memes swiped!" />);

    expect(screen.getByRole("status")).toHaveTextContent("30 memes swiped!");
    expect(screen.getByTestId("fireworks-bursts").children.length).toBeGreaterThan(1);
  });

  it("plays the fireworks sound once", () => {
    render(<Fireworks message="30 memes swiped!" />);

    expect(audio.AudioContext).toHaveBeenCalledTimes(1);
    expect(audio.context.createBufferSource).toHaveBeenCalled();
  });

  it("disappears after its duration", () => {
    render(<Fireworks message="30 memes swiped!" />);

    act(() => vi.advanceTimersByTime(FIREWORKS_DURATION_MS));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("stops the sound when it is removed", () => {
    const { unmount } = render(<Fireworks message="30 memes swiped!" />);

    unmount();

    expect(audio.context.close).toHaveBeenCalled();
  });

  it("still shows the message without Web Audio", () => {
    vi.stubGlobal("AudioContext", undefined);

    render(<Fireworks message="30 memes swiped!" />);

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows the message and plays the sound without animation when the user prefers reduced motion", () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));

    render(<Fireworks message="30 memes swiped!" />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByTestId("fireworks-bursts")).not.toBeInTheDocument();
    expect(audio.AudioContext).toHaveBeenCalledTimes(1);
  });
});
