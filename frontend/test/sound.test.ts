import { afterEach, describe, expect, it, vi } from "vitest";
import { playFireworksSound } from "../src/sound";
import { createFakeAudioContext } from "./audio";

afterEach(() => vi.unstubAllGlobals());

describe("playFireworksSound", () => {
  it("does nothing where Web Audio is missing", () => {
    vi.stubGlobal("AudioContext", undefined);

    expect(playFireworksSound(3, 0.5)).toBeNull();
  });

  it("plays one whistle and one bang per burst, spaced by the interval", () => {
    const { context, AudioContext } = createFakeAudioContext();
    vi.stubGlobal("AudioContext", AudioContext);

    expect(playFireworksSound(3, 0.5)).toBe(context);

    const whistles = context.createOscillator.mock.results.map((result) => result.value);
    const bangs = context.createBufferSource.mock.results.map((result) => result.value);
    expect(whistles).toHaveLength(3);
    expect(bangs).toHaveLength(3);
    expect(whistles.map((whistle) => whistle.start.mock.calls[0][0])).toEqual([0, 0.5, 1]);
    expect(bangs.map((bang) => bang.start.mock.calls[0][0])).toEqual([0.5, 1, 1.5]);
  });

  it("never throws when the audio system fails", () => {
    vi.stubGlobal(
      "AudioContext",
      vi.fn(function () {
        throw new Error("audio blocked");
      }),
    );

    expect(playFireworksSound(3, 0.5)).toBeNull();
  });
});
