import type { Meme, MemeCatalog } from "../memes/catalog.js";
import type { ProfileRepository } from "../profiles/repository.js";
import type { Swipe, SwipeRepository } from "../swipes/repository.js";

export class UnknownPersonError extends Error {
  constructor(nickname: string) {
    super(`No person with the nickname "${nickname}"`);
  }
}

export interface Compatibility {
  /** Whole percent of shared swipes where both made the same choice, or null when they share none. */
  score: number | null;
  /** How many memes both people have swiped. */
  sharedSwipes: number;
}

/** Another person as shown in the "People like you" list. The user id is never exposed. */
export interface Person {
  nickname: string;
  emoji: string;
  /** A seeded demo person, not a real user. */
  demo: boolean;
  /** Same as `Compatibility.score`: null while nobody has swiped a meme in common. */
  compatibility: number | null;
  sharedSwipes: number;
}

export interface PeopleService {
  /**
   * How alike two people are: of the memes both swiped, the percentage where they made the same
   * choice (both liked or both noped). Counts from the first shared swipe, so early scores are noisy.
   * Symmetric: the order of the two user ids does not matter.
   */
  compatibility(userId: string, otherUserId: string): Compatibility;
  /** Everyone except the user, best match first. People with no shared swipes come last. Everyone can see everyone. */
  listPeople(userId: string): Person[];
  /** The memes both the user and the person with this nickname (ignoring case) liked, in catalog order. Throws UnknownPersonError. */
  listSharedLikes(userId: string, nickname: string): Meme[];
}

function compare(a: Swipe[], b: Swipe[]): Compatibility {
  const other = new Map(b.map((swipe) => [swipe.memeId, swipe.direction]));
  let sharedSwipes = 0;
  let same = 0;
  for (const swipe of a) {
    const direction = other.get(swipe.memeId);
    if (direction === undefined) continue;
    sharedSwipes++;
    if (direction === swipe.direction) same++;
  }
  return { score: sharedSwipes === 0 ? null : Math.round((same / sharedSwipes) * 100), sharedSwipes };
}

export function createPeopleService(
  profiles: ProfileRepository,
  swipes: SwipeRepository,
  catalog: MemeCatalog,
): PeopleService {
  const likedIds = (userId: string) =>
    new Set(
      swipes
        .listByUser(userId)
        .filter((swipe) => swipe.direction === "like")
        .map((swipe) => swipe.memeId),
    );

  return {
    compatibility: (userId, otherUserId) => compare(swipes.listByUser(userId), swipes.listByUser(otherUserId)),

    listPeople(userId) {
      const mine = swipes.listByUser(userId);
      return profiles
        .list()
        .filter((stored) => stored.userId !== userId)
        .map(({ userId: otherId, profile, demo }): Person => {
          const { score, sharedSwipes } = compare(mine, swipes.listByUser(otherId));
          return { nickname: profile.nickname, emoji: profile.emoji, demo, compatibility: score, sharedSwipes };
        })
        .sort(
          (a, b) =>
            (b.compatibility ?? -1) - (a.compatibility ?? -1) ||
            b.sharedSwipes - a.sharedSwipes ||
            a.nickname.localeCompare(b.nickname),
        );
    },

    listSharedLikes(userId, nickname) {
      const otherId = profiles.findUserIdByNickname(nickname.trim());
      if (otherId === undefined) throw new UnknownPersonError(nickname);
      const mine = likedIds(userId);
      const theirs = likedIds(otherId);
      return catalog.list().filter((meme) => mine.has(meme.id) && theirs.has(meme.id));
    },
  };
}
