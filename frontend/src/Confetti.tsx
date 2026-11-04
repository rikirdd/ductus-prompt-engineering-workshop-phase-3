import { useEffect, useState } from "react";
import { prefersReducedMotion } from "./motion";

/** How long (in ms) the confetti and the streak message stay on screen. */
export const CONFETTI_DURATION_MS = 2000;

const PIECE_COUNT = 40;
const COLORS = ["#e5484d", "#1fa463", "#f5a623", "#3e63dd", "#d6409f"];

interface ConfettiProps {
  /** The streak being celebrated, shown in the message. */
  streak: number;
}

/**
 * A short burst of CSS confetti with a streak message. Remount it (change its key) to fire again.
 * Users who prefer reduced motion get only the message.
 */
export function Confetti({ streak }: ConfettiProps) {
  const [visible, setVisible] = useState(true);
  const [reducedMotion] = useState(prefersReducedMotion);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), CONFETTI_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="confetti">
      <p role="status" className="streak-message">
        🔥 {streak} likes in a row!
      </p>
      {!reducedMotion && (
        <div className="confetti-pieces" aria-hidden="true" data-testid="confetti-pieces">
          {Array.from({ length: PIECE_COUNT }, (_, index) => (
            <span
              key={index}
              className="confetti-piece"
              style={{
                left: `${(index * 37) % 100}%`,
                background: COLORS[index % COLORS.length],
                animationDelay: `${(index % 10) * 60}ms`,
                animationDuration: `${1200 + (index % 7) * 100}ms`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
