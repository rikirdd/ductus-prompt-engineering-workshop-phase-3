import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createMemeCatalog } from "../src/memes/catalog.js";
import { createFileImageStore } from "../src/memes/images.js";
import { createMemeService } from "../src/memes/service.js";
import { seedMemeRepository } from "../src/memes/seed.js";
import { createSqliteMemeRepository } from "../src/memes/sqlite.js";
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
  const imageStore = createFileImageStore(join(dirname(databasePath), "uploads"));
  const app = createApp(
    createSwipeService(createMemeCatalog(memes), swipes),
    createMemeService(memes, imageStore),
    imageStore,
  );
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

  it("keeps a posted meme and its image, and serves it to other users", async () => {
    const dir = mkdtempSync(join(tmpdir(), "meme-tinder-"));
    dirs.push(dir);
    const databasePath = join(dir, "meme-tinder.db");
    const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from("png body")]);

    const before = startBackend(databasePath);
    const { meme } = (
      await request(before.app)
        .post("/api/memes")
        .set("X-User-Id", "chaz")
        .send({ caption: "Posted before restart", image: png.toString("base64") })
        .expect(201)
    ).body;
    before.close();

    const after = startBackend(databasePath);
    await request(after.app).get(meme.imageUrl).expect(200).expect("Content-Type", "image/png");
    await request(after.app).post("/api/swipes").set("X-User-Id", "mum").send({ memeId: meme.id, direction: "like" }).expect(200);
    const likes = await request(after.app).get("/api/likes").set("X-User-Id", "mum");
    expect(likes.body.memes).toEqual([meme]);
    after.close();
  });
});
