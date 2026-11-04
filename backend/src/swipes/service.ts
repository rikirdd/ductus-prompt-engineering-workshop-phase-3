import type { Meme, MemeCatalog } from "../memes/catalog.js";
import type { Direction, Swipe, SwipeRepository } from "./repository.js";

/** Fewer swipes than this give no percentage. Raise it to hide early, noisy numbers. */
export const MIN_SWIPES_FOR_PERCENTAGE = 1;

/** How much people love a meme, across all users. */
export interface MemeStats {
  likes: number;
  total: number;
  /** Whole-number share of likes, or null while there are fewer than MIN_SWIPES_FOR_PERCENTAGE swipes. */
  percentage: number | null;
}

/** A meme with its stats, as served to the swipe card. */
export interface MemeWithStats extends Meme {
  stats: MemeStats;
}

export class UnknownMemeError extends Error {
  constructor(memeId: string) {
    super(`Unknown meme id: ${memeId}`);
  }
}

export interface SwipeService {
  /** The next meme the user has not swiped yet, with its stats, or null when all memes have been swiped. */
  getNextMeme(userId: string): MemeWithStats | null;
  /** Likes, total swipes and like percentage for one meme across all users. */
  getMemeStats(memeId: string): MemeStats;
  /**
   * Records a swipe. Swiping the same meme again is idempotent: the first swipe is kept
   * and returned. Throws UnknownMemeError if the meme does not exist.
   */
  recordSwipe(userId: string, memeId: string, direction: Direction): Swipe;
  /** How many memes the user has swiped (likes and nopes). Repeat swipes of a meme count once. */
  countSwipes(userId: string): number;
  /** The memes the user has liked, in catalog order (a stable order that does not depend on the repository). */
  listLikedMemes(userId: string): Meme[];
  /** Removes all of the user's swipes, including likes. Safe to call repeatedly. */
  resetSwipes(userId: string): void;
}

export function createSwipeService(catalog: MemeCatalog, repository: SwipeRepository): SwipeService {
  function getMemeStats(memeId: string): MemeStats {
    const { likes, total } = repository.countByMeme(memeId);
    const percentage = total >= MIN_SWIPES_FOR_PERCENTAGE ? Math.round((likes / total) * 100) : null;
    return { likes, total, percentage };
  }

  return {
    getNextMeme(userId) {
      const seen = new Set(repository.listByUser(userId).map((swipe) => swipe.memeId));
      const meme = catalog.list().find((candidate) => !seen.has(candidate.id));
      return meme ? { ...meme, stats: getMemeStats(meme.id) } : null;
    },

    getMemeStats,

    recordSwipe(userId, memeId, direction) {
      if (!catalog.getById(memeId)) throw new UnknownMemeError(memeId);
      const existing = repository.listByUser(userId).find((swipe) => swipe.memeId === memeId);
      if (existing) return existing;
      const swipe = { memeId, direction };
      repository.add(userId, swipe);
      return swipe;
    },

    countSwipes(userId) {
      return repository.listByUser(userId).length;
    },

    listLikedMemes(userId) {
      const liked = new Set(
        repository
          .listByUser(userId)
          .filter((swipe) => swipe.direction === "like")
          .map((swipe) => swipe.memeId),
      );
      return catalog.list().filter((meme) => liked.has(meme.id));
    },

    resetSwipes(userId) {
      repository.clearByUser(userId);
    },
  };
}
