import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import type { Direction, Meme, MemeStats } from "./api";
import { LoveHeart } from "./LoveHeart";
import { prefersReducedMotion } from "./motion";

/** Horizontal drag distance (in px) a release must pass to count as a swipe. */
export const SWIPE_THRESHOLD = 100;

/** How long (in ms) the full LIKE or NOPE stamp shows before the swipe is reported. */
export const STAMP_DURATION_MS = 300;

const STAMP_LABELS: Record<Direction, string> = { like: "LIKE", nope: "NOPE" };

/** How far (in px) and how much (in degrees) a swiped card flies off. */
const FLY_DISTANCE = 600;
const FLY_ROTATION = 30;

interface MemeCardProps {
  /** The stats are optional, so the card also works for a meme without them. */
  meme: Meme & { stats?: MemeStats };
  /**
   * Called once the stamp has shown. If it returns a promise, the card is ready again when it settles,
   * so a failed swipe can be retried; a successful swipe normally replaces the card instead.
   */
  onSwipe: (direction: Direction) => void | Promise<void>;
  /** Ignores drags, buttons and arrow keys, e.g. while a swipe request is in flight. */
  disabled?: boolean;
}

export function MemeCard({ meme, onSwipe, disabled = false }: MemeCardProps) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  /** The direction of a swipe that is showing its stamp or waiting for the parent. */
  const [committed, setCommitted] = useState<Direction | null>(null);
  const startX = useRef(0);
  const committing = useRef(false);
  const mounted = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [reducedMotion] = useState(prefersReducedMotion);
  const inactive = disabled || committed !== null;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(timer.current);
    };
  }, []);

  const commit = useCallback(
    (direction: Direction) => {
      if (disabled || committing.current) return;
      committing.current = true;
      setCommitted(direction);
      timer.current = setTimeout(async () => {
        try {
          await onSwipe(direction);
        } finally {
          if (mounted.current) {
            committing.current = false;
            setCommitted(null);
            setOffset(0);
          }
        }
      }, STAMP_DURATION_MS);
    },
    [disabled, onSwipe],
  );

  useEffect(() => {
    if (inactive) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.key === "ArrowRight") commit("like");
      if (event.key === "ArrowLeft") commit("nope");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [inactive, commit]);

  function onPointerDown(event: PointerEvent<HTMLElement>) {
    if (inactive) return;
    startX.current = event.clientX;
    setDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLElement>) {
    if (dragging) setOffset(event.clientX - startX.current);
  }

  function onPointerUp(event: PointerEvent<HTMLElement>) {
    if (!dragging) return;
    const distance = event.clientX - startX.current;
    setDragging(false);
    if (distance >= SWIPE_THRESHOLD) commit("like");
    else if (distance <= -SWIPE_THRESHOLD) commit("nope");
    else setOffset(0);
  }

  function onPointerCancel() {
    setDragging(false);
    setOffset(0);
  }

  const stampDirection: Direction | null = committed ?? (offset > 0 ? "like" : offset < 0 ? "nope" : null);
  const stampOpacity = committed ? 1 : Math.min(Math.abs(offset) / SWIPE_THRESHOLD, 1);
  const sign = committed === "like" ? 1 : -1;
  // A committed card flies off in its direction; with reduced motion it fades out where it is.
  const transform =
    committed && !reducedMotion
      ? `translateX(${sign * FLY_DISTANCE}px) rotate(${sign * FLY_ROTATION}deg)`
      : `translateX(${offset}px) rotate(${offset / 20}deg)`;
  const className = ["meme-card", dragging && "dragging", committed && "leaving"].filter(Boolean).join(" ");

  return (
    <>
      <figure
        className={className}
        style={{ transform, opacity: committed ? 0 : undefined }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <div className="meme-image">
          <img src={meme.imageUrl} alt={meme.caption} draggable={false} />
          {meme.stats && <LoveHeart stats={meme.stats} />}
        </div>
        {stampDirection && (
          <span className={`stamp stamp-${stampDirection}`} style={{ opacity: stampOpacity }} aria-hidden="true">
            {STAMP_LABELS[stampDirection]}
          </span>
        )}
        <figcaption>{meme.caption}</figcaption>
      </figure>
      <div className="actions">
        <button type="button" className="nope" disabled={inactive} onClick={() => commit("nope")}>
          Nope
        </button>
        <button type="button" className="like" disabled={inactive} onClick={() => commit("like")}>
          Like
        </button>
      </div>
    </>
  );
}
