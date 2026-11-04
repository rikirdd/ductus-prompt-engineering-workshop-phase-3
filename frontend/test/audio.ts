import { vi } from "vitest";

/** A minimal fake of the Web Audio nodes that the fireworks sound uses. */
export function createFakeAudioContext() {
  const param = () => ({ setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() });
  const node = () => {
    const created = { connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
    created.connect.mockImplementation((target: unknown) => target);
    return created;
  };
  const context = {
    currentTime: 0,
    sampleRate: 8000,
    destination: {},
    createOscillator: vi.fn(() => ({ ...node(), type: "", frequency: param() })),
    createGain: vi.fn(() => ({ ...node(), gain: param() })),
    createBiquadFilter: vi.fn(() => ({ ...node(), type: "", frequency: param() })),
    createBufferSource: vi.fn(() => ({ ...node(), buffer: null })),
    createBuffer: vi.fn((_channels: number, length: number) => ({ getChannelData: () => new Float32Array(length) })),
    close: vi.fn().mockResolvedValue(undefined),
  };
  // A regular function, so `new AudioContext()` returns the fake.
  const AudioContext = vi.fn(function () {
    return context;
  });
  return { context, AudioContext };
}
