export interface Profile {
  nickname: string;
  emoji: string;
}

/** Nicknames are unique ignoring case, so "Sara" and "sara" are the same person. */
export function nicknameKey(nickname: string): string {
  return nickname.toLowerCase();
}

/** A stored profile together with the user id that owns it and whether it belongs to a demo person. */
export interface StoredProfile {
  userId: string;
  profile: Profile;
  /** Demo people are seeded so there is always someone to compare with. They are not real users. */
  demo: boolean;
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
  /** Every profile, real and demo, in the order they were created. */
  list(): StoredProfile[];
  /**
   * Adds a demo person. Does nothing when the user id already has a profile. Returns false and stores
   * nothing when another user already has the nickname (ignoring case).
   */
  saveDemo(userId: string, profile: Profile): boolean;
}

export function createInMemoryProfileRepository(): ProfileRepository {
  const profiles = new Map<string, Profile>();
  const demoUserIds = new Set<string>();
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
    list: () => [...profiles].map(([userId, profile]) => ({ userId, profile: { ...profile }, demo: demoUserIds.has(userId) })),
    saveDemo: (userId, profile) => {
      if (profiles.has(userId)) return true;
      const owner = findUserId(profile.nickname);
      if (owner !== undefined) return false;
      profiles.set(userId, { ...profile });
      demoUserIds.add(userId);
      return true;
    },
  };
}
