export type Direction = "like" | "nope";

export const DIRECTIONS: readonly Direction[] = ["like", "nope"];

export interface Swipe {
  memeId: string;
  direction: Direction;
}

/** How one meme was swiped across all users. */
export interface SwipeCounts {
  likes: number;
  total: number;
}

/** Storage seam for swipes. Replace the in-memory implementation to use a real database. */
export interface SwipeRepository {
  listByUser(userId: string): Swipe[];
  add(userId: string, swipe: Swipe): void;
  clearByUser(userId: string): void;
  /** Likes and total swipes for one meme, across all users. */
  countByMeme(memeId: string): SwipeCounts;
}

export function createInMemorySwipeRepository(): SwipeRepository {
  const swipesByUser = new Map<string, Swipe[]>();
  return {
    listByUser: (userId) => [...(swipesByUser.get(userId) ?? [])],
    add: (userId, swipe) => {
      swipesByUser.set(userId, [...(swipesByUser.get(userId) ?? []), swipe]);
    },
    clearByUser: (userId) => {
      swipesByUser.delete(userId);
    },
    countByMeme: (memeId) => {
      const counts = { likes: 0, total: 0 };
      for (const swipes of swipesByUser.values()) {
        const swipe = swipes.find((candidate) => candidate.memeId === memeId);
        if (!swipe) continue;
        counts.total++;
        if (swipe.direction === "like") counts.likes++;
      }
      return counts;
    },
  };
}
