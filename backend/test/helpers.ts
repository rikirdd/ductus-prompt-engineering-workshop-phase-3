import { createApp, type AppOptions } from "../src/app.js";
import { createMemeCatalog } from "../src/memes/catalog.js";
import { createInMemoryMemeRepository } from "../src/memes/repository.js";
import { seedMemeRepository, type SeedMeme } from "../src/memes/seed.js";
import { createPeopleService } from "../src/people/service.js";
import { createInMemoryProfileRepository } from "../src/profiles/repository.js";
import { createProfileService } from "../src/profiles/service.js";
import { createInMemorySwipeRepository } from "../src/swipes/repository.js";
import { createSwipeService } from "../src/swipes/service.js";

/** A catalog in memory with the given seed memes, or with the real seed memes when none are given. */
export function createTestCatalog(seeds?: SeedMeme[]) {
  return createMemeCatalog(seedMemeRepository(createInMemoryMemeRepository(), seeds));
}

/** The whole backend in memory with fresh state, plus the repositories so a test can set up data directly. */
export function createTestBackend(options: AppOptions = {}, catalog = createTestCatalog()) {
  const swipes = createInMemorySwipeRepository();
  const profiles = createInMemoryProfileRepository();
  const app = createApp(
    createSwipeService(catalog, swipes),
    createProfileService(profiles),
    createPeopleService(profiles, swipes, catalog),
    options,
  );
  return { app, swipes, profiles, catalog };
}
