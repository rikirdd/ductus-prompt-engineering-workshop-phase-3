import type { MemeStats } from "./api";

/** Heart scale at 0% and at 100%, so even a low score stays readable. */
const MIN_SCALE = 0.55;
const MAX_SCALE = 1;
/** A NEW heart has no number to grow with, so it gets a fixed, clearly visible size. */
export const NEW_HEART_SCALE = 0.8;

/** The heart's size for a percentage: it grows with how much people loved the meme. */
export function heartScale(percentage: number): number {
  const clamped = Math.min(Math.max(percentage, 0), 100);
  return MIN_SCALE + (MAX_SCALE - MIN_SCALE) * (clamped / 100);
}

/**
 * A big red heart with the love percentage inside, growing with the number.
 * A meme nobody has swiped yet gets a small heart that says NEW instead of a misleading number.
 */
export function LoveHeart({ stats }: { stats: MemeStats }) {
  const fresh = stats.percentage === null;
  const label = fresh ? "New meme: nobody has judged it yet" : `${stats.percentage}% of people loved this`;
  const title = fresh ? label : `${label} (${stats.likes} of ${stats.total})`;
  return (
    <div
      className={`love-heart${fresh ? " love-heart-new" : ""}`}
      role="img"
      aria-label={label}
      title={title}
      style={{ transform: `scale(${fresh ? NEW_HEART_SCALE : heartScale(stats.percentage ?? 0)})` }}
    >
      <svg viewBox="0 0 32 29" aria-hidden="true">
        <path d="M16 29 2.7 15.9A8.2 8.2 0 0 1 14.3 4.3L16 6l1.7-1.7a8.2 8.2 0 0 1 11.6 11.6Z" />
      </svg>
      <span className="love-heart-number" aria-hidden="true">
        {fresh ? "NEW" : `${stats.percentage}%`}
      </span>
    </div>
  );
}
