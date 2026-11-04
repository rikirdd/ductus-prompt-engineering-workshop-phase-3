import { useCallback, useEffect, useState } from "react";
import { fetchLikes, fetchNextMeme, resetSwipes, sendSwipe, type Direction, type Meme } from "./api";
import { Confetti } from "./Confetti";
import { EmptyState } from "./EmptyState";
import { Fireworks } from "./Fireworks";
import { LikesView } from "./LikesView";
import { MemeCard } from "./MemeCard";
import { reachedSwipeMilestone, SWIPE_MILESTONE } from "./milestone";
import { isStreakMilestone, nextStreak } from "./streak";

type View = "swipe" | "likes";

interface Celebration {
  id: number;
  /** Confetti for streaks, fireworks with sound for the swipe milestone. */
  kind: "confetti" | "fireworks";
  message: string;
}

export function App() {
  const [view, setView] = useState<View>("swipe");
  const [meme, setMeme] = useState<Meme | null>(null);
  const [likes, setLikes] = useState<Meme[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [swiping, setSwiping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  /** The swipe count from the last swipe response, or null before the first swipe. */
  const [swipeCount, setSwipeCount] = useState<number | null>(null);
  /** The latest celebration. A new id remounts the confetti so it fires again. */
  const [celebration, setCelebration] = useState<Celebration | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setMeme(await fetchNextMeme());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function showLikes() {
    setView("likes");
    setLikes(null);
    setError(null);
    try {
      setLikes(await fetchLikes());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  async function showSwipe() {
    setView("swipe");
    await load();
  }

  async function swipe(direction: Direction) {
    if (!meme || swiping) return;
    setError(null);
    setSwiping(true);
    try {
      const result = await sendSwipe(meme.id, direction);
      const streakAfter = nextStreak(streak, direction);
      setStreak(streakAfter);
      setSwipeCount(result.swipeCount);
      // The milestone swipe outranks a streak reached on the same swipe.
      if (reachedSwipeMilestone(swipeCount, result.swipeCount)) {
        celebrate("fireworks", `🎆 ${SWIPE_MILESTONE} memes swiped! You legend.`);
      } else if (isStreakMilestone(streakAfter)) {
        celebrate("confetti", `🔥 ${streakAfter} likes in a row!`);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSwiping(false);
    }
  }

  function celebrate(kind: Celebration["kind"], message: string) {
    setCelebration((previous) => ({ id: (previous?.id ?? 0) + 1, kind, message }));
  }

  async function reset() {
    setError(null);
    try {
      await resetSwipes();
      setStreak(0);
      setSwipeCount(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return;
    }
    await load();
  }

  return (
    <main>
      <h1>Meme-Tinder</h1>
      <nav>
        <button type="button" aria-current={view === "swipe" ? "page" : undefined} onClick={showSwipe}>
          Swipe
        </button>
        <button type="button" aria-current={view === "likes" ? "page" : undefined} onClick={showLikes}>
          Likes
        </button>
      </nav>
      {celebration?.kind === "confetti" && <Confetti key={celebration.id} message={celebration.message} />}
      {celebration?.kind === "fireworks" && <Fireworks key={celebration.id} message={celebration.message} />}
      {error && <p role="alert">Something went wrong: {error}. Is the backend running?</p>}
      {view === "likes" && !error && (likes ? <LikesView memes={likes} /> : <p>Loading…</p>)}
      {view === "swipe" && loading && !error && <p>Loading…</p>}
      {view === "swipe" && !loading && !error && !meme && <EmptyState onReset={reset} />}
      {view === "swipe" && meme && (
        <MemeCard key={meme.id} meme={meme} onSwipe={swipe} disabled={swiping} />
      )}
    </main>
  );
}
