import type { MemeRepository } from "./repository.js";

export interface Meme {
  id: string;
  caption: string;
  imageUrl: string;
}

export const IMAGE_PATH = "/api/memes/images";

export interface MemeCatalog {
  list(): Meme[];
  getById(id: string): Meme | undefined;
}

/** The memes people can swipe, read from a repository. */
export function createMemeCatalog(repository: MemeRepository): MemeCatalog {
  return {
    list: () => repository.list(),
    getById: (id) => repository.getById(id),
  };
}
