import { useCallback, useEffect, useState } from "react";
import { fetchLikes, fetchNextMeme, resetSwipes, sendSwipe, type Direction, type Meme } from "./api";
import { Confetti } from "./Confetti";
import { EmptyState } from "./EmptyState";
import { LikesView } from "./LikesView";
import { MemeCard } from "./MemeCard";
import { ProfileView } from "./ProfileView";
import { isStreakMilestone, nextStreak } from "./streak";

type View = "swipe" | "likes" | "profile";

export function App() {
  const [view, setView] = useState<View>("swipe");
  const [meme, setMeme] = useState<Meme | null>(null);
  const [likes, setLikes] = useState<Meme[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [swiping, setSwiping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  /** The latest streak milestone. A new id remounts the confetti so it fires again. */
  const [celebration, setCelebration] = useState<{ id: number; streak: number } | null>(null);

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

  /** Another user's data now applies to this device, so everything shown is reloaded. */
  async function signedIn() {
    setStreak(0);
    setLikes(null);
    setLoading(true);
    await load();
  }

  async function swipe(direction: Direction) {
    if (!meme || swiping) return;
    setError(null);
    setSwiping(true);
    try {
      await sendSwipe(meme.id, direction);
      const streakAfter = nextStreak(streak, direction);
      setStreak(streakAfter);
      if (isStreakMilestone(streakAfter)) {
        setCelebration((previous) => ({ id: (previous?.id ?? 0) + 1, streak: streakAfter }));
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSwiping(false);
    }
  }

  async function reset() {
    setError(null);
    try {
      await resetSwipes();
      setStreak(0);
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
        <button type="button" aria-current={view === "profile" ? "page" : undefined} onClick={() => setView("profile")}>
          Profile
        </button>
      </nav>
      {celebration && <Confetti key={celebration.id} streak={celebration.streak} />}
      {error && <p role="alert">Something went wrong: {error}. Is the backend running?</p>}
      {view === "profile" && <ProfileView onSignedIn={signedIn} />}
      {view === "likes" && !error && (likes ? <LikesView memes={likes} /> : <p>Loading…</p>)}
      {view === "swipe" && loading && !error && <p>Loading…</p>}
      {view === "swipe" && !loading && !error && !meme && <EmptyState onReset={reset} />}
      {view === "swipe" && meme && (
        <MemeCard key={meme.id} meme={meme} onSwipe={swipe} disabled={swiping} />
      )}
    </main>
  );
}
