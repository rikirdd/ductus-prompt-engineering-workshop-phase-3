import type { Meme } from "./catalog.js";

/** Storage seam for memes. Memes keep the order in which they were added. */
export interface MemeRepository {
  list(): Meme[];
  getById(id: string): Meme | undefined;
  /** Adds a meme. A meme with an id that already exists is left unchanged. */
  add(meme: Meme): void;
}

export function createInMemoryMemeRepository(initial: Meme[] = []): MemeRepository {
  const memes: Meme[] = [];
  const repository: MemeRepository = {
    list: () => [...memes],
    getById: (id) => memes.find((meme) => meme.id === id),
    add: (meme) => {
      if (!repository.getById(meme.id)) memes.push(meme);
    },
  };
  initial.forEach(repository.add);
  return repository;
}
