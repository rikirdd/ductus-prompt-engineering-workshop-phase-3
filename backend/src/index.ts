import { createApp } from "./app.js";
import { createMemeCatalog } from "./memes/catalog.js";
import { seedMemeRepository } from "./memes/seed.js";
import { createSqliteMemeRepository } from "./memes/sqlite.js";
import { createSqliteSwipeRepository } from "./swipes/sqlite.js";
import { createSwipeService } from "./swipes/service.js";

const port = Number(process.env.PORT ?? 3000);

// Swipes and memes are stored in a SQLite file so they survive restarts. Set DATABASE_PATH to move it (the container uses a volume).
const databasePath = process.env.DATABASE_PATH ?? "data/meme-tinder.db";

// Memes live in the same database. The seed memes are added on first start and never duplicated.
const memeCatalog = createMemeCatalog(seedMemeRepository(createSqliteMemeRepository(databasePath)));

const swipeService = createSwipeService(memeCatalog, createSqliteSwipeRepository(databasePath));

// Set STATIC_DIR to the built frontend (frontend/dist) to serve it from this process, as the container does.
const staticDir = process.env.STATIC_DIR;

createApp(swipeService, { staticDir }).listen(port, () => {
  console.log(`Backend listening on http://localhost:${port} (database: ${databasePath})`);
});
