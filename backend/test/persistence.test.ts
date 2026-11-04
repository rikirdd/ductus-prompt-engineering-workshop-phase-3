import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createMemeCatalog } from "../src/memes/catalog.js";
import { seedMemeRepository } from "../src/memes/seed.js";
import { createSqliteMemeRepository } from "../src/memes/sqlite.js";
import { createInMemoryProfileRepository } from "../src/profiles/repository.js";
import { createProfileService } from "../src/profiles/service.js";
import { createSwipeService } from "../src/swipes/service.js";
import { createSqliteSwipeRepository } from "../src/swipes/sqlite.js";

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** Builds the app on a database file, like starting the backend. Call close() to stop it. */
function startBackend(databasePath: string) {
  const memes = seedMemeRepository(createSqliteMemeRepository(databasePath));
  const swipes = createSqliteSwipeRepository(databasePath);
  const app = createApp(createSwipeService(createMemeCatalog(memes), swipes), createProfileService(createInMemoryProfileRepository()));
  return {
    app,
    close: () => {
      memes.close();
      swipes.close();
    },
  };
}

describe("persistence across a backend restart", () => {
  it("keeps a user's likes and does not show swiped memes again", async () => {
    const dir = mkdtempSync(join(tmpdir(), "meme-tinder-"));
    dirs.push(dir);
    const databasePath = join(dir, "meme-tinder.db");
    const user = "chaz";

    const before = startBackend(databasePath);
    const first = (await request(before.app).get("/api/memes/next").set("X-User-Id", user)).body.meme;
    const second = (await request(before.app).get("/api/memes/next").set("X-User-Id", user)).body.meme;
    expect(second.id).toBe(first.id);
    await request(before.app)
      .post("/api/swipes")
      .set("X-User-Id", user)
      .send({ memeId: first.id, direction: "like" })
      .expect(200);
    before.close();

    const after = startBackend(databasePath);
    const likes = await request(after.app).get("/api/likes").set("X-User-Id", user);
    expect(likes.body.memes.map((meme: { id: string }) => meme.id)).toEqual([first.id]);

    const nextMeme = (await request(after.app).get("/api/memes/next").set("X-User-Id", user)).body.meme;
    expect(nextMeme.id).not.toBe(first.id);

    const otherUserLikes = await request(after.app).get("/api/likes").set("X-User-Id", "mum");
    expect(otherUserLikes.body.memes).toEqual([]);
    after.close();
  });

  it("keeps counting a user's swipes after a restart", async () => {
    const dir = mkdtempSync(join(tmpdir(), "meme-tinder-"));
    dirs.push(dir);
    const databasePath = join(dir, "meme-tinder.db");
    const swipeNext = async (app: ReturnType<typeof startBackend>["app"]) => {
      const meme = (await request(app).get("/api/memes/next").set("X-User-Id", "chaz")).body.meme;
      return request(app).post("/api/swipes").set("X-User-Id", "chaz").send({ memeId: meme.id, direction: "nope" });
    };

    const before = startBackend(databasePath);
    await swipeNext(before.app);
    expect((await swipeNext(before.app)).body.swipeCount).toBe(2);
    before.close();

    const after = startBackend(databasePath);
    expect((await swipeNext(after.app)).body.swipeCount).toBe(3);
    after.close();
  });
});
