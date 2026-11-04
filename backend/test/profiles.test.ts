import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createMemeCatalog } from "../src/memes/catalog.js";
import { seedMemeRepository } from "../src/memes/seed.js";
import { createSqliteMemeRepository } from "../src/memes/sqlite.js";
import { createPeopleService } from "../src/people/service.js";
import { createInMemoryProfileRepository, type ProfileRepository } from "../src/profiles/repository.js";
import {
  createProfileService,
  InvalidProfileError,
  NicknameTakenError,
  UnknownNicknameError,
} from "../src/profiles/service.js";
import { createSqliteProfileRepository } from "../src/profiles/sqlite.js";
import { createSwipeService } from "../src/swipes/service.js";
import { createSqliteSwipeRepository } from "../src/swipes/sqlite.js";
import { createTestBackend } from "./helpers.js";

const repositories: [string, () => ProfileRepository][] = [
  ["in-memory", createInMemoryProfileRepository],
  ["SQLite", () => createSqliteProfileRepository(":memory:")],
];

describe.each(repositories)("profile service on the %s repository", (_name, createRepository) => {
  const setup = () => createProfileService(createRepository());

  it("gives a user without a profile a generated one and keeps it", () => {
    const service = setup();

    const profile = service.getProfile("u1");

    expect(profile.nickname).toMatch(/^Meme Fan \d{4}$/);
    expect(profile.emoji).not.toBe("");
    expect(service.getProfile("u1")).toEqual(profile);
  });

  it("generates a different nickname when the first one is taken", () => {
    const numbers = [0, 0.1234, 0, 0.1234, 0.5678];
    const service = createProfileService(createRepository(), () => numbers.shift() ?? 0.9);

    const first = service.getProfile("u1");
    const second = service.getProfile("u2");

    expect(first.nickname).toBe("Meme Fan 1234");
    expect(second.nickname).toBe("Meme Fan 5678");
  });

  it("sets a nickname and an emoji and reads them back", () => {
    const service = setup();

    expect(service.updateProfile("u1", { nickname: "  Sara ", emoji: "🐸" })).toEqual({ nickname: "Sara", emoji: "🐸" });
    expect(service.getProfile("u1")).toEqual({ nickname: "Sara", emoji: "🐸" });
  });

  it("lets a user change their own nickname, including only its casing", () => {
    const service = setup();
    service.updateProfile("u1", { nickname: "sara", emoji: "🐸" });

    expect(service.updateProfile("u1", { nickname: "Sara", emoji: "🦄" })).toEqual({ nickname: "Sara", emoji: "🦄" });
  });

  it("rejects a nickname that another user has, whatever the casing", () => {
    const service = setup();
    service.updateProfile("u1", { nickname: "Sara", emoji: "🐸" });

    expect(() => service.updateProfile("u2", { nickname: "SARA", emoji: "🦄" })).toThrow(NicknameTakenError);
    expect(service.getProfile("u1").nickname).toBe("Sara");
  });

  it.each([
    ["a missing nickname", { emoji: "🐸" }],
    ["a blank nickname", { nickname: "   ", emoji: "🐸" }],
    ["a nickname that is not text", { nickname: 5, emoji: "🐸" }],
    ["a nickname that is too long", { nickname: "x".repeat(21), emoji: "🐸" }],
    ["a missing emoji", { nickname: "Sara" }],
    ["an emoji that is plain text", { nickname: "Sara", emoji: "a" }],
    ["two emojis", { nickname: "Sara", emoji: "🐸🦄" }],
  ])("rejects %s", (_label, input) => {
    expect(() => setup().updateProfile("u1", input)).toThrow(InvalidProfileError);
  });

  it("accepts an emoji made of several code points", () => {
    expect(setup().updateProfile("u1", { nickname: "Sara", emoji: "👩‍💻" }).emoji).toBe("👩‍💻");
  });

  it("signs in with a nickname, ignoring case, and returns the user id behind it", () => {
    const service = setup();
    service.updateProfile("laptop", { nickname: "Sara", emoji: "🐸" });

    expect(service.signIn("  sara ")).toEqual({ userId: "laptop", profile: { nickname: "Sara", emoji: "🐸" } });
  });

  it("does not sign in an unknown nickname", () => {
    expect(() => setup().signIn("nobody")).toThrow(UnknownNicknameError);
    expect(() => setup().signIn(undefined)).toThrow(InvalidProfileError);
  });
});

describe("profile endpoints", () => {
  const setup = () => createTestBackend().app;
  const put = (app: ReturnType<typeof setup>, userId: string, body: object) =>
    request(app).put("/api/profile").set("X-User-Id", userId).send(body);

  it("returns a generated profile on first contact", async () => {
    const res = await request(setup()).get("/api/profile").set("X-User-Id", "u1");

    expect(res.status).toBe(200);
    expect(res.body.profile).toEqual({ nickname: expect.stringMatching(/^Meme Fan \d+$/), emoji: expect.any(String) });
  });

  it("saves a profile and returns it on the next read", async () => {
    const app = setup();

    const saved = await put(app, "u1", { nickname: "Sara", emoji: "🐸" });
    const read = await request(app).get("/api/profile").set("X-User-Id", "u1");

    expect(saved.status).toBe(200);
    expect(saved.body.profile).toEqual({ nickname: "Sara", emoji: "🐸" });
    expect(read.body.profile).toEqual({ nickname: "Sara", emoji: "🐸" });
  });

  it("answers 409 with an error when the nickname is taken", async () => {
    const app = setup();
    await put(app, "u1", { nickname: "Sara", emoji: "🐸" });

    const res = await put(app, "u2", { nickname: "sara", emoji: "🦄" });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already taken/);
  });

  it.each([
    ["no nickname", { emoji: "🐸" }],
    ["a nickname that is too long", { nickname: "x".repeat(21), emoji: "🐸" }],
    ["no emoji", { nickname: "Sara" }],
  ])("answers 400 with an error for %s", async (_label, body) => {
    const res = await put(setup(), "u1", body);

    expect(res.status).toBe(400);
    expect(res.body.error).toEqual(expect.any(String));
  });

  it("needs a user id to read or save a profile", async () => {
    const app = setup();

    expect((await request(app).get("/api/profile")).status).toBe(400);
    expect((await request(app).put("/api/profile").send({ nickname: "Sara", emoji: "🐸" })).status).toBe(400);
  });

  it("signs in on another device: same user id, same likes", async () => {
    const app = setup();
    await put(app, "laptop", { nickname: "Sara", emoji: "🐸" });
    const meme = (await request(app).get("/api/memes/next").set("X-User-Id", "laptop")).body.meme;
    await request(app).post("/api/swipes").set("X-User-Id", "laptop").send({ memeId: meme.id, direction: "like" });

    const login = await request(app).post("/api/login").send({ nickname: "SARA" });
    const likes = await request(app).get("/api/likes").set("X-User-Id", login.body.userId);

    expect(login.status).toBe(200);
    expect(login.body).toEqual({ userId: "laptop", profile: { nickname: "Sara", emoji: "🐸" } });
    expect(likes.body.memes).toEqual([meme]);
  });

  it("answers 404 for an unknown nickname and 400 without one", async () => {
    const app = setup();

    const unknown = await request(app).post("/api/login").send({ nickname: "nobody" });
    const missing = await request(app).post("/api/login").send({});

    expect(unknown.status).toBe(404);
    expect(unknown.body.error).toEqual(expect.any(String));
    expect(missing.status).toBe(400);
  });
});

describe("profiles and swipes in one database file", () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  /** Starts the backend on a database file, like the real one. */
  function startBackend(databasePath: string) {
    const memes = seedMemeRepository(createSqliteMemeRepository(databasePath));
    const swipes = createSqliteSwipeRepository(databasePath);
    const profiles = createSqliteProfileRepository(databasePath);
    const catalog = createMemeCatalog(memes);
    return {
      app: createApp(
        createSwipeService(catalog, swipes),
        createProfileService(profiles),
        createPeopleService(profiles, swipes, catalog),
      ),
      close: () => {
        memes.close();
        swipes.close();
        profiles.close();
      },
    };
  }

  it("keeps the likes of someone who swiped before profiles existed and gives them a profile", async () => {
    const dir = mkdtempSync(join(tmpdir(), "meme-tinder-"));
    dirs.push(dir);
    const databasePath = join(dir, "meme-tinder.db");
    // A database from before profiles: swipes only, no profiles table content.
    const old = createSqliteSwipeRepository(databasePath);
    old.add("chaz", { memeId: "works-on-my-machine", direction: "like" });
    old.add("chaz", { memeId: "friday-deploy", direction: "nope" });
    old.close();

    const first = startBackend(databasePath);
    const profile = (await request(first.app).get("/api/profile").set("X-User-Id", "chaz")).body.profile;
    first.close();
    const second = startBackend(databasePath);
    const again = (await request(second.app).get("/api/profile").set("X-User-Id", "chaz")).body.profile;
    const likes = (await request(second.app).get("/api/likes").set("X-User-Id", "chaz")).body.memes;
    const login = await request(second.app).post("/api/login").send({ nickname: profile.nickname });
    second.close();

    expect(profile.nickname).toMatch(/^Meme Fan \d+$/);
    expect(again).toEqual(profile);
    expect(likes.map((meme: { id: string }) => meme.id)).toEqual(["works-on-my-machine"]);
    expect(login.body.userId).toBe("chaz");
  });

  it("keeps a chosen profile across a restart and does not let a nickname be reused", async () => {
    const dir = mkdtempSync(join(tmpdir(), "meme-tinder-"));
    dirs.push(dir);
    const databasePath = join(dir, "meme-tinder.db");

    const first = startBackend(databasePath);
    await request(first.app).put("/api/profile").set("X-User-Id", "u1").send({ nickname: "Sara", emoji: "🐸" });
    first.close();
    const second = startBackend(databasePath);
    const read = await request(second.app).get("/api/profile").set("X-User-Id", "u1");
    const taken = await request(second.app).put("/api/profile").set("X-User-Id", "u2").send({ nickname: "sara", emoji: "🦄" });
    second.close();

    expect(read.body.profile).toEqual({ nickname: "Sara", emoji: "🐸" });
    expect(taken.status).toBe(409);
  });
});
