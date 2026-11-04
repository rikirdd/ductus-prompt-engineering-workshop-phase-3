import { useEffect, useState, type CSSProperties } from "react";
import { prefersReducedMotion } from "./motion";
import { playFireworksSound } from "./sound";

/** How long (in ms) the fireworks and the message stay on screen. */
export const FIREWORKS_DURATION_MS = 3500;

const BURSTS = [
  { left: 25, top: 30, color: "#f5a623" },
  { left: 70, top: 22, color: "#e5484d" },
  { left: 45, top: 45, color: "#3e63dd" },
  { left: 80, top: 50, color: "#1fa463" },
  { left: 18, top: 55, color: "#d6409f" },
];
const SPARKS_PER_BURST = 24;
const SPARK_DISTANCE = 120;
/** Seconds between bursts, shared by the animation and the sound. */
const BURST_INTERVAL = 0.45;
/** Seconds a rocket climbs before it bursts, matching the whistle before the bang. */
const RISE_TIME = 0.5;

interface FireworksProps {
  /** What is being celebrated, announced as a status message. */
  message: string;
}

/**
 * Fireworks with sound for big moments. Remount it (change its key) to fire again.
 * Users who prefer reduced motion get the message and the sound, without the animation.
 */
export function Fireworks({ message }: FireworksProps) {
  const [visible, setVisible] = useState(true);
  const [reducedMotion] = useState(prefersReducedMotion);

  useEffect(() => {
    const context = playFireworksSound(BURSTS.length, BURST_INTERVAL);
    const timer = setTimeout(() => setVisible(false), FIREWORKS_DURATION_MS);
    return () => {
      clearTimeout(timer);
      context?.close().catch(() => {});
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="fireworks">
      <p role="status" className="celebration-message">
        {message}
      </p>
      {!reducedMotion && (
        <div aria-hidden="true" data-testid="fireworks-bursts">
          {BURSTS.map((burst, index) => (
            <div
              key={index}
              className="firework-burst"
              style={{ left: `${burst.left}%`, top: `${burst.top}%`, color: burst.color }}
            >
              <span className="firework-rocket" style={{ animationDelay: `${index * BURST_INTERVAL}s` }} />
              {Array.from({ length: SPARKS_PER_BURST }, (_, spark) => {
                const angle = (spark / SPARKS_PER_BURST) * 2 * Math.PI;
                const style = {
                  "--dx": `${Math.round(Math.cos(angle) * SPARK_DISTANCE)}px`,
                  "--dy": `${Math.round(Math.sin(angle) * SPARK_DISTANCE)}px`,
                  animationDelay: `${index * BURST_INTERVAL + RISE_TIME}s`,
                } as CSSProperties;
                return <span key={spark} className="firework-spark" style={style} />;
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
