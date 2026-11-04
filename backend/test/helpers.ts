import { createApp, type AppOptions } from "../src/app.js";
import { createInMemoryImageStore, type ImageStore } from "../src/memes/images.js";
import { createMemeService } from "../src/memes/service.js";
import { createInMemorySwipeRepository } from "../src/swipes/repository.js";
import { createSwipeService } from "../src/swipes/service.js";
import { createMemeCatalog } from "../src/memes/catalog.js";
import { createInMemoryMemeRepository } from "../src/memes/repository.js";
import { seedMemeRepository, type SeedMeme } from "../src/memes/seed.js";

/** A catalog in memory with the given seed memes, or with the real seed memes when none are given. */
export function createTestCatalog(seeds?: SeedMeme[]) {
  return createMemeCatalog(seedMemeRepository(createInMemoryMemeRepository(), seeds));
}

/** The whole app in memory with the seed memes. Every call builds fresh state, so tests are independent. */
export function createTestApp(options?: AppOptions, imageStore: ImageStore = createInMemoryImageStore()) {
  const memes = seedMemeRepository(createInMemoryMemeRepository());
  return createApp(
    createSwipeService(createMemeCatalog(memes), createInMemorySwipeRepository()),
    createMemeService(memes, imageStore),
    imageStore,
    options,
  );
}
