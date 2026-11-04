import { createApp } from "./app.js";
import { createMemeCatalog } from "./memes/catalog.js";
import { createSqliteSwipeRepository } from "./swipes/sqlite.js";
import { createSwipeService } from "./swipes/service.js";

const port = Number(process.env.PORT ?? 3000);

// Swipes are stored in a SQLite file so they survive restarts. Set DATABASE_PATH to move it (the container uses a volume).
const databasePath = process.env.DATABASE_PATH ?? "data/meme-tinder.db";

const swipeService = createSwipeService(createMemeCatalog(), createSqliteSwipeRepository(databasePath));

// Set STATIC_DIR to the built frontend (frontend/dist) to serve it from this process, as the container does.
const staticDir = process.env.STATIC_DIR;

createApp(swipeService, { staticDir }).listen(port, () => {
  console.log(`Backend listening on http://localhost:${port} (database: ${databasePath})`);
});
