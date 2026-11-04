import { getUserId } from "./identity";

export interface Meme {
  id: string;
  caption: string;
  imageUrl: string;
}

/** How much people love a meme, across all users. */
export interface MemeStats {
  likes: number;
  total: number;
  /** Whole-number share of likes, or null while too few people have swiped it. */
  percentage: number | null;
}

/** The meme on the swipe card, with its stats. */
export interface MemeWithStats extends Meme {
  stats: MemeStats;
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
export async function fetchNextMeme(): Promise<MemeWithStats | null> {
  const { meme } = await request<{ meme: MemeWithStats | null }>("/api/memes/next");
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

/** Another person with their compatibility with the user. */
export interface Person {
  nickname: string;
  emoji: string;
  /** A seeded demo person, not a real user. */
  demo: boolean;
  /** Percentage, or null while you have swiped no meme in common. */
  compatibility: number | null;
  sharedSwipes: number;
}

/** Everyone else, best match first. */
export async function fetchPeople(): Promise<Person[]> {
  const { people } = await request<{ people: Person[] }>("/api/people");
  return people;
}

/** The memes both the user and the person with this nickname liked. */
export async function fetchSharedMemes(nickname: string): Promise<Meme[]> {
  const { memes } = await request<{ memes: Meme[] }>(`/api/people/${encodeURIComponent(nickname)}/shared-memes`);
  return memes;
}
