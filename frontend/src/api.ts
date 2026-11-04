import { getUserId } from "./identity";

export interface Meme {
  id: string;
  caption: string;
  imageUrl: string;
}

export type Direction = "like" | "nope";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { ...init.headers, "X-User-Id": getUserId() },
  });
  if (!res.ok) throw new Error(`Request failed (HTTP ${res.status})`);
  return res.status === 204 ? (undefined as T) : res.json();
}

/** Resolves to null when the user has swiped every meme. */
export async function fetchNextMeme(): Promise<Meme | null> {
  const { meme } = await request<{ meme: Meme | null }>("/api/memes/next");
  return meme;
}

export async function sendSwipe(memeId: string, direction: Direction): Promise<void> {
  await request("/api/swipes", {
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

/** Largest image the backend accepts, checked here too so people get an answer without uploading. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_CAPTION_LENGTH = 140;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the image"));
    reader.readAsDataURL(file);
  });
}

/** Posts a new meme that everyone will get in their pile. Rejects with the server's error message. */
export async function postMeme(caption: string, image: File): Promise<Meme> {
  const res = await fetch("/api/memes", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-User-Id": getUserId() },
    body: JSON.stringify({ caption, image: await readAsDataUrl(image) }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Request failed (HTTP ${res.status})`);
  }
  return (await res.json()).meme;
}
