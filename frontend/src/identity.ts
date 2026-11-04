const STORAGE_KEY = "meme-tinder-user-id";

/** Returns the anonymous user id, creating and persisting it on first visit. */
export function getUserId(): string {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    // localStorage unavailable (e.g. blocked): fall back to an id for this page load only.
    return (memoryId ??= crypto.randomUUID());
  }
}

/** Switches this device to another user id, for example after signing in with a username. */
export function setUserId(id: string): void {
  memoryId = id;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // localStorage unavailable: the id lasts for this page load only.
  }
}

let memoryId: string | undefined;
