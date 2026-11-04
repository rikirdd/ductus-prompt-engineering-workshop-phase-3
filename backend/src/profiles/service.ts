import type { Profile, ProfileRepository } from "./repository.js";

export const MAX_NICKNAME_LENGTH = 20;

const GENERATED_EMOJIS = ["😂", "🤣", "😎", "🤠", "🐸", "🦄", "🐙", "🔥", "🚀", "🍕"];

export class InvalidProfileError extends Error {}

export class NicknameTakenError extends Error {
  constructor(nickname: string) {
    super(`The nickname "${nickname}" is already taken`);
  }
}

export class UnknownNicknameError extends Error {
  constructor(nickname: string) {
    super(`No profile with the nickname "${nickname}"`);
  }
}

export interface ProfileService {
  /**
   * The user's profile. A user who has none yet (for example someone who swiped before profiles
   * existed) gets a generated one, so their swipes stay attached to the same person.
   */
  getProfile(userId: string): Profile;
  /** Sets nickname and emoji. Throws InvalidProfileError or NicknameTakenError. */
  updateProfile(userId: string, input: { nickname?: unknown; emoji?: unknown }): Profile;
  /**
   * Signs in with a nickname only (no password, ignoring case) and returns the user id behind it.
   * Anyone who knows a nickname can sign in as that person. Throws InvalidProfileError or UnknownNicknameError.
   */
  signIn(nickname: unknown): { userId: string; profile: Profile };
}

function parseNickname(value: unknown): string {
  const nickname = typeof value === "string" ? value.trim() : "";
  if (!nickname) throw new InvalidProfileError("nickname is required");
  if ([...nickname].length > MAX_NICKNAME_LENGTH) {
    throw new InvalidProfileError(`nickname must be at most ${MAX_NICKNAME_LENGTH} characters`);
  }
  return nickname;
}

function parseEmoji(value: unknown): string {
  const emoji = typeof value === "string" ? value.trim() : "";
  const isOneEmoji =
    /\p{Extended_Pictographic}/u.test(emoji) && [...new Intl.Segmenter().segment(emoji)].length === 1;
  if (!isOneEmoji) throw new InvalidProfileError("emoji must be a single emoji");
  return emoji;
}

/** `random` returns a number in [0, 1) and can be replaced in tests. */
export function createProfileService(repository: ProfileRepository, random: () => number = Math.random): ProfileService {
  function generateProfile(userId: string): Profile {
    const emoji = GENERATED_EMOJIS[Math.floor(random() * GENERATED_EMOJIS.length)];
    // Four digits first; if they keep colliding, the number simply gets longer.
    for (let attempt = 0; ; attempt++) {
      const digits = 4 + Math.floor(attempt / 20);
      const number = Math.floor(random() * 10 ** digits).toString().padStart(digits, "0");
      const profile = { nickname: `Meme Fan ${number}`, emoji };
      if (repository.save(userId, profile)) return profile;
    }
  }

  return {
    getProfile(userId) {
      return repository.getByUserId(userId) ?? generateProfile(userId);
    },

    updateProfile(userId, input) {
      const profile = { nickname: parseNickname(input.nickname), emoji: parseEmoji(input.emoji) };
      if (!repository.save(userId, profile)) throw new NicknameTakenError(profile.nickname);
      return profile;
    },

    signIn(nickname) {
      const name = parseNickname(nickname);
      const userId = repository.findUserIdByNickname(name);
      const profile = userId === undefined ? undefined : repository.getByUserId(userId);
      if (userId === undefined || !profile) throw new UnknownNicknameError(name);
      return { userId, profile };
    },
  };
}
