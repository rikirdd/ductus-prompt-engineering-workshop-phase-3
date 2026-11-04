import type { MemeCatalog } from "../memes/catalog.js";
import type { ProfileRepository } from "../profiles/repository.js";
import type { Direction, SwipeRepository } from "../swipes/repository.js";

export interface DemoPerson {
  /** Fixed user id, so seeding again finds the same person. */
  userId: string;
  nickname: string;
  emoji: string;
  /** Share of swiped memes this person likes, between 0 and 1. Different tastes give different scores. */
  likeRate: number;
  /** How many memes they have swiped. */
  swipes: number;
  /** Makes their swipes different from the other demo people. */
  seed: number;
}

export const demoPeople: DemoPerson[] = [
  { userId: "demo-sara", nickname: "Sara (demo)", emoji: "🦄", likeRate: 0.7, swipes: 24, seed: 11 },
  { userId: "demo-johan", nickname: "Johan (demo)", emoji: "🤠", likeRate: 0.5, swipes: 28, seed: 23 },
  { userId: "demo-mei", nickname: "Mei (demo)", emoji: "🐙", likeRate: 0.3, swipes: 20, seed: 37 },
  { userId: "demo-omar", nickname: "Omar (demo)", emoji: "😎", likeRate: 0.6, swipes: 30, seed: 53 },
  { userId: "demo-lena", nickname: "Lena (demo)", emoji: "🐸", likeRate: 0.4, swipes: 16, seed: 71 },
];

/** A small deterministic random number generator (mulberry32), so demo swipes are the same on every start. */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Makes sure the demo people exist with their profiles and swipes, so there is always someone to compare with,
 * even for the only real user. Safe on every start: nothing is duplicated and existing swipes are kept.
 * A demo person is skipped when a real user already took their nickname.
 */
export function seedDemoPeople(
  profiles: ProfileRepository,
  swipes: SwipeRepository,
  catalog: MemeCatalog,
  people: DemoPerson[] = demoPeople,
): void {
  const memes = catalog.list();
  for (const person of people) {
    if (!profiles.saveDemo(person.userId, { nickname: person.nickname, emoji: person.emoji })) continue;
    const already = new Set(swipes.listByUser(person.userId).map((swipe) => swipe.memeId));
    const random = seededRandom(person.seed);
    // Every person swipes a different selection of memes, in a different order.
    const chosen = memes
      .map((meme) => ({ meme, order: random() }))
      .sort((a, b) => a.order - b.order)
      .slice(0, person.swipes);
    for (const { meme } of chosen) {
      const direction: Direction = random() < person.likeRate ? "like" : "nope";
      if (!already.has(meme.id)) swipes.add(person.userId, { memeId: meme.id, direction });
    }
  }
}
