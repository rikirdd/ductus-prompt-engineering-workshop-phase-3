type AudioContextConstructor = new () => AudioContext;

/** The browser's AudioContext, or undefined where Web Audio is missing (such as tests or old browsers). */
function getAudioContext(): AudioContextConstructor | undefined {
  const w = window as unknown as { AudioContext?: AudioContextConstructor; webkitAudioContext?: AudioContextConstructor };
  return w.AudioContext ?? w.webkitAudioContext;
}

/** A short burst of white noise, the raw material for a bang. */
function createNoise(context: AudioContext, seconds: number): AudioBuffer {
  const buffer = context.createBuffer(1, Math.floor(context.sampleRate * seconds), context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

/** A rising whistle (the rocket) followed by a crackling bang, starting at `start` seconds. */
function scheduleFirework(context: AudioContext, start: number, volume: number) {
  const whistle = context.createOscillator();
  const whistleGain = context.createGain();
  whistle.type = "sine";
  whistle.frequency.setValueAtTime(400, start);
  whistle.frequency.exponentialRampToValueAtTime(1600, start + 0.45);
  whistleGain.gain.setValueAtTime(0.0001, start);
  whistleGain.gain.exponentialRampToValueAtTime(0.05 * volume, start + 0.1);
  whistleGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.45);
  whistle.connect(whistleGain).connect(context.destination);
  whistle.start(start);
  whistle.stop(start + 0.5);

  const bangAt = start + 0.5;
  const bang = context.createBufferSource();
  const bangFilter = context.createBiquadFilter();
  const bangGain = context.createGain();
  bang.buffer = createNoise(context, 1.2);
  bangFilter.type = "lowpass";
  bangFilter.frequency.setValueAtTime(3000, bangAt);
  bangFilter.frequency.exponentialRampToValueAtTime(300, bangAt + 1);
  bangGain.gain.setValueAtTime(0.6 * volume, bangAt);
  bangGain.gain.exponentialRampToValueAtTime(0.0001, bangAt + 1.1);
  bang.connect(bangFilter).connect(bangGain).connect(context.destination);
  bang.start(bangAt);
}

/**
 * Plays synthesized fireworks (no audio files): one whistle and bang per burst, `interval` seconds apart.
 * Browsers only allow sound after a user action, which a swipe is.
 * Returns the AudioContext so the caller can close it, or null when no sound plays (no Web Audio, or an error).
 */
export function playFireworksSound(bursts: number, interval: number): AudioContext | null {
  const Context = getAudioContext();
  if (!Context) return null;
  try {
    const context = new Context();
    for (let i = 0; i < bursts; i++) scheduleFirework(context, context.currentTime + i * interval, i % 2 ? 0.7 : 1);
    return context;
  } catch {
    // Sound is a bonus; it must never break the celebration.
    return null;
  }
}
