export interface Profile {
  nickname: string;
  emoji: string;
}

/** Nicknames are unique ignoring case, so "Sara" and "sara" are the same person. */
export function nicknameKey(nickname: string): string {
  return nickname.toLowerCase();
}

/** Storage seam for profiles. A profile belongs to the user id that is sent in the X-User-Id header. */
export interface ProfileRepository {
  getByUserId(userId: string): Profile | undefined;
  /** The user id that owns this nickname (ignoring case), or undefined when nobody does. */
  findUserIdByNickname(nickname: string): string | undefined;
  /**
   * Stores or replaces the user's profile. Returns false and stores nothing when another user
   * already has the nickname (ignoring case).
   */
  save(userId: string, profile: Profile): boolean;
}

export function createInMemoryProfileRepository(): ProfileRepository {
  const profiles = new Map<string, Profile>();
  const findUserId = (nickname: string) =>
    [...profiles].find(([, profile]) => nicknameKey(profile.nickname) === nicknameKey(nickname))?.[0];
  return {
    getByUserId: (userId) => profiles.get(userId),
    findUserIdByNickname: findUserId,
    save: (userId, profile) => {
      const owner = findUserId(profile.nickname);
      if (owner !== undefined && owner !== userId) return false;
      profiles.set(userId, { ...profile });
      return true;
    },
  };
}
