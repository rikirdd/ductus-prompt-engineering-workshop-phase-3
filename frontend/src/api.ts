import { getUserId } from "./identity";

export interface Meme {
  id: string;
  caption: string;
  imageUrl: string;
}

export type Direction = "like" | "nope";

export interface SwipeResult {
  memeId: string;
  direction: Direction;
  /** How many memes the user has swiped in total, counted from stored swipes. */
  swipeCount: number;
}

/** The `error` text from the API's JSON error body, or a generic message with the status code. */
async function errorMessage(res: Response): Promise<string> {
  try {
    const { error } = await res.json();
    if (typeof error === "string" && error) return error;
  } catch {
    // No JSON body: fall through to the generic message.
  }
  return `Request failed (HTTP ${res.status})`;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { ...init.headers, "X-User-Id": getUserId() },
  });
  if (!res.ok) throw new Error(await errorMessage(res));
  return res.status === 204 ? (undefined as T) : res.json();
}

/** Resolves to null when the user has swiped every meme. */
export async function fetchNextMeme(): Promise<Meme | null> {
  const { meme } = await request<{ meme: Meme | null }>("/api/memes/next");
  return meme;
}

export async function sendSwipe(memeId: string, direction: Direction): Promise<SwipeResult> {
  return request<SwipeResult>("/api/swipes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ memeId, direction }),
  });
}

/** The memes the user has liked, in a stable order. */
export async function fetchLikes(): Promise<Meme[]> {
  const { memes } = await request<{ memes: Meme[] }>("/api/likes");
  return memes;
}

/** Removes all of the user's swipes, including likes. */
export async function resetSwipes(): Promise<void> {
  await request("/api/swipes", { method: "DELETE" });
}

export interface Profile {
  nickname: string;
  emoji: string;
}

/** The user's profile. A user without one gets a generated profile from the backend. */
export async function fetchProfile(): Promise<Profile> {
  const { profile } = await request<{ profile: Profile }>("/api/profile");
  return profile;
}

/** Rejects with the API's error text when the nickname or emoji is invalid or the nickname is taken. */
export async function saveProfile(profile: Profile): Promise<Profile> {
  const saved = await request<{ profile: Profile }>("/api/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
  return saved.profile;
}

/** Signs in with a nickname only. Resolves to the user id and profile behind it; rejects when the nickname is unknown. */
export async function login(nickname: string): Promise<{ userId: string; profile: Profile }> {
  return request("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nickname }),
  });
}
