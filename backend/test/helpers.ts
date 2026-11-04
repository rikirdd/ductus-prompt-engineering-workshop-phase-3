import { createMemeCatalog } from "../src/memes/catalog.js";
import { createInMemoryMemeRepository } from "../src/memes/repository.js";
import { seedMemeRepository, type SeedMeme } from "../src/memes/seed.js";

/** A catalog in memory with the given seed memes, or with the real seed memes when none are given. */
export function createTestCatalog(seeds?: SeedMeme[]) {
  return createMemeCatalog(seedMemeRepository(createInMemoryMemeRepository(), seeds));
}
