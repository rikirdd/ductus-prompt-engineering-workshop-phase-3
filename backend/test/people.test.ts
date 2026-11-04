import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { createMemeCatalog } from "../src/memes/catalog.js";
import { seedMemeRepository } from "../src/memes/seed.js";
import { createSqliteMemeRepository } from "../src/memes/sqlite.js";
import { demoPeople, seedDemoPeople } from "../src/people/demo.js";
import { createPeopleService, UnknownPersonError } from "../src/people/service.js";
import { createInMemoryProfileRepository, type ProfileRepository } from "../src/profiles/repository.js";
import { createSqliteProfileRepository } from "../src/profiles/sqlite.js";
import { createInMemorySwipeRepository, type Direction, type SwipeRepository } from "../src/swipes/repository.js";
import { createSqliteSwipeRepository } from "../src/swipes/sqlite.js";
import { createTestBackend, createTestCatalog } from "./helpers.js";

/** Gives a user the given swipes, for example { a: "like", b: "nope" }. */
function swipe(swipes: SwipeRepository, userId: string, choices: Record<string, Direction>) {
  for (const [memeId, direction] of Object.entries(choices)) swipes.add(userId, { memeId, direction });
}

function setupService() {
  const swipes = createInMemorySwipeRepository();
  const profiles = createInMemoryProfileRepository();
  const catalog = createTestCatalog([
    { id: "a", caption: "A", file: "a.svg" },
    { id: "b", caption: "B", file: "b.svg" },
    { id: "c", caption: "C", file: "c.svg" },
    { id: "d", caption: "D", file: "d.svg" },
  ]);
  profiles.save("me", { nickname: "Me", emoji: "🐸" });
  profiles.save("sara", { nickname: "Sara", emoji: "🦄" });
  profiles.save("johan", { nickname: "Johan", emoji: "🤠" });
  profiles.save("lonely", { nickname: "Lonely", emoji: "🐙" });
  return { swipes, profiles, service: createPeopleService(profiles, swipes, catalog) };
}

describe("compatibility", () => {
  it("scores a single shared swipe straight away", () => {
    const { swipes, service } = setupService();
    swipe(swipes, "me", { a: "like" });
    swipe(swipes, "sara", { a: "like" });
    swipe(swipes, "johan", { a: "nope" });

    expect(service.compatibility("me", "sara")).toEqual({ score: 100, sharedSwipes: 1 });
    expect(service.compatibility("me", "johan")).toEqual({ score: 0, sharedSwipes: 1 });
  });

  it("gives no score instead of 0% when nothing is shared", () => {
    const { swipes, service } = setupService();
    swipe(swipes, "me", { a: "like" });
    swipe(swipes, "sara", { b: "like" });

    expect(service.compatibility("me", "sara")).toEqual({ score: null, sharedSwipes: 0 });
    expect(service.compatibility("me", "nobody-swiped")).toEqual({ score: null, sharedSwipes: 0 });
  });

  it("counts both liking and both noping as the same choice and rounds to whole percent", () => {
    const { swipes, service } = setupService();
    swipe(swipes, "me", { a: "like", b: "nope", c: "like" });
    swipe(swipes, "sara", { a: "like", b: "nope", c: "nope", d: "like" });

    // 2 of 3 shared swipes match; d is not shared and does not count.
    expect(service.compatibility("me", "sara")).toEqual({ score: 67, sharedSwipes: 3 });
  });

  it("is symmetric", () => {
    const { swipes, service } = setupService();
    swipe(swipes, "me", { a: "like", b: "nope", c: "like" });
    swipe(swipes, "sara", { a: "like", b: "like", d: "like" });

    expect(service.compatibility("sara", "me")).toEqual(service.compatibility("me", "sara"));
  });

  it("rises with the same choices and falls with different ones", () => {
    const { swipes, service } = setupService();
    swipe(swipes, "me", { a: "like", b: "like", c: "like", d: "like" });
    swipe(swipes, "sara", { a: "like", b: "like", c: "like", d: "nope" });
    swipe(swipes, "johan", { a: "like", b: "nope", c: "nope", d: "nope" });

    const sara = service.compatibility("me", "sara").score ?? 0;
    const johan = service.compatibility("me", "johan").score ?? 0;
    expect(sara).toBeGreaterThan(johan);
  });
});

describe("listPeople", () => {
  it("excludes the user and lists the best match first", () => {
    const { swipes, service } = setupService();
    swipe(swipes, "me", { a: "like", b: "like" });
    swipe(swipes, "sara", { a: "like", b: "nope" });
    swipe(swipes, "johan", { a: "like", b: "like" });

    const people = service.listPeople("me");

    expect(people.map((person) => person.nickname)).toEqual(["Johan", "Sara", "Lonely"]);
    expect(people.map((person) => person.compatibility)).toEqual([100, 50, null]);
  });

  it("puts people with no shared swipes last, with no score", () => {
    const { swipes, service } = setupService();
    swipe(swipes, "me", { a: "like" });
    swipe(swipes, "sara", { b: "like" });
    swipe(swipes, "johan", { a: "nope" });

    const people = service.listPeople("me");

    expect(people.map((person) => person.nickname)).toEqual(["Johan", "Lonely", "Sara"]);
    expect(people.at(-1)).toMatchObject({ compatibility: null, sharedSwipes: 0 });
  });

  it("ranks the person with more shared swipes first when scores tie", () => {
    const { swipes, service } = setupService();
    swipe(swipes, "me", { a: "like", b: "like", c: "like" });
    swipe(swipes, "sara", { a: "like" });
    swipe(swipes, "johan", { a: "like", b: "like", c: "like" });

    expect(service.listPeople("me").map((person) => person.nickname).slice(0, 2)).toEqual(["Johan", "Sara"]);
  });

  it("does not expose user ids and works for a user without a profile", () => {
    const { swipes, service } = setupService();
    swipe(swipes, "sara", { a: "like" });

    const people = service.listPeople("brand-new");

    expect(people).toHaveLength(4);
    expect(JSON.stringify(people)).not.toMatch(/"userId"|"sara"|"johan"/);
  });

  it("marks demo people", () => {
    const { profiles, service } = setupService();
    profiles.saveDemo("demo-1", { nickname: "Demo One", emoji: "🍕" });

    const people = service.listPeople("me");

    expect(people.find((person) => person.nickname === "Demo One")?.demo).toBe(true);
    expect(people.find((person) => person.nickname === "Sara")?.demo).toBe(false);
  });
});

describe("listSharedLikes", () => {
  it("returns only the memes both liked, in catalog order", () => {
    const { swipes, service } = setupService();
    swipe(swipes, "me", { d: "like", a: "like", b: "like", c: "nope" });
    swipe(swipes, "sara", { a: "like", b: "nope", c: "like", d: "like" });

    expect(service.listSharedLikes("me", "Sara").map((meme) => meme.id)).toEqual(["a", "d"]);
  });

  it("finds the person ignoring case and returns an empty list when nothing is shared", () => {
    const { swipes, service } = setupService();
    swipe(swipes, "me", { a: "like" });
    swipe(swipes, "sara", { b: "like" });

    expect(service.listSharedLikes("me", " sARA ")).toEqual([]);
  });

  it("throws for an unknown nickname", () => {
    expect(() => setupService().service.listSharedLikes("me", "nobody")).toThrow(UnknownPersonError);
  });
});

describe("demo people", () => {
  const catalog = () => createTestCatalog();

  it("adds profiles marked as demo, each with swipes", () => {
    const profiles = createInMemoryProfileRepository();
    const swipes = createInMemorySwipeRepository();

    seedDemoPeople(profiles, swipes, catalog());

    const stored = profiles.list();
    expect(stored.map((entry) => entry.profile.nickname)).toEqual(demoPeople.map((person) => person.nickname));
    expect(stored.every((entry) => entry.demo)).toBe(true);
    for (const person of demoPeople) expect(swipes.listByUser(person.userId).length).toBeGreaterThan(0);
  });

  it("does not duplicate anything when run again", () => {
    const profiles = createInMemoryProfileRepository();
    const swipes = createInMemorySwipeRepository();
    seedDemoPeople(profiles, swipes, catalog());
    const before = demoPeople.map((person) => swipes.listByUser(person.userId));

    seedDemoPeople(profiles, swipes, catalog());

    expect(profiles.list()).toHaveLength(demoPeople.length);
    expect(demoPeople.map((person) => swipes.listByUser(person.userId))).toEqual(before);
  });

  it("gives people different tastes, so scores differ", () => {
    const profiles = createInMemoryProfileRepository();
    const swipes = createInMemorySwipeRepository();
    const memes = catalog();
    seedDemoPeople(profiles, swipes, memes);
    const service = createPeopleService(profiles, swipes, memes);
    for (const meme of memes.list()) swipes.add("me", { memeId: meme.id, direction: "like" });

    const scores = service.listPeople("me").map((person) => person.compatibility);

    expect(new Set(scores).size).toBeGreaterThan(2);
    expect(scores.every((score) => score !== null)).toBe(true);
  });

  it("skips a demo person whose nickname a real user already took", () => {
    const profiles = createInMemoryProfileRepository();
    const swipes = createInMemorySwipeRepository();
    profiles.save("real-sara", { nickname: "SARA (demo)", emoji: "🐸" });

    seedDemoPeople(profiles, swipes, catalog());

    expect(profiles.list()).toHaveLength(demoPeople.length);
    expect(swipes.listByUser("demo-sara")).toEqual([]);
    expect(profiles.getByUserId("real-sara")?.nickname).toBe("SARA (demo)");
  });

  it("gives the only real user someone to compare with on a fresh backend", async () => {
    const { app, swipes, profiles, catalog: memes } = createTestBackend();
    seedDemoPeople(profiles, swipes, memes);
    const first = (await request(app).get("/api/memes/next").set("X-User-Id", "alone")).body.meme;
    await request(app).post("/api/swipes").set("X-User-Id", "alone").send({ memeId: first.id, direction: "like" });

    const res = await request(app).get("/api/people").set("X-User-Id", "alone");

    expect(res.body.people.length).toBe(demoPeople.length);
    expect(res.body.people.every((person: { demo: boolean }) => person.demo)).toBe(true);
  });
});

describe("profile repository additions", () => {
  const repositories: [string, () => ProfileRepository][] = [
    ["in-memory", createInMemoryProfileRepository],
    ["SQLite", () => createSqliteProfileRepository(":memory:")],
  ];

  describe.each(repositories)("%s", (_name, create) => {
    it("lists every profile in creation order, flagging demo people", () => {
      const repository = create();
      repository.save("u1", { nickname: "Sara", emoji: "🦄" });
      repository.saveDemo("d1", { nickname: "Demo", emoji: "🍕" });

      expect(repository.list()).toEqual([
        { userId: "u1", profile: { nickname: "Sara", emoji: "🦄" }, demo: false },
        { userId: "d1", profile: { nickname: "Demo", emoji: "🍕" }, demo: true },
      ]);
    });

    it("keeps a demo person unchanged when saved again, and refuses a taken nickname", () => {
      const repository = create();
      repository.saveDemo("d1", { nickname: "Demo", emoji: "🍕" });
      repository.save("u1", { nickname: "Sara", emoji: "🦄" });

      expect(repository.saveDemo("d1", { nickname: "Other", emoji: "🐸" })).toBe(true);
      expect(repository.getByUserId("d1")).toEqual({ nickname: "Demo", emoji: "🍕" });
      expect(repository.saveDemo("d2", { nickname: "SARA", emoji: "🐸" })).toBe(false);
      expect(repository.list()).toHaveLength(2);
    });

    it("keeps the demo flag when a demo person changes their own profile", () => {
      const repository = create();
      repository.saveDemo("d1", { nickname: "Demo", emoji: "🍕" });

      repository.save("d1", { nickname: "Demo 2", emoji: "🍕" });

      expect(repository.list()[0].demo).toBe(true);
    });
  });
});

describe("a database from before demo people existed", () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  it("gets the demo column added and keeps its profiles", () => {
    const dir = mkdtempSync(join(tmpdir(), "meme-tinder-"));
    dirs.push(dir);
    const path = join(dir, "meme-tinder.db");
    const old = new DatabaseSync(path);
    old.exec(`CREATE TABLE profiles (
      user_id TEXT PRIMARY KEY, nickname TEXT NOT NULL, nickname_key TEXT NOT NULL UNIQUE, emoji TEXT NOT NULL
    )`);
    old.prepare("INSERT INTO profiles VALUES ('u1', 'Sara', 'sara', '🦄')").run();
    old.close();

    const repository = createSqliteProfileRepository(path);
    const reopened = createSqliteProfileRepository(path);

    expect(repository.list()).toEqual([{ userId: "u1", profile: { nickname: "Sara", emoji: "🦄" }, demo: false }]);
    expect(reopened.list()).toHaveLength(1);
    repository.close();
    reopened.close();
  });

  it("seeds demo people into the real SQLite repositories without duplicating on restart", () => {
    const dir = mkdtempSync(join(tmpdir(), "meme-tinder-"));
    dirs.push(dir);
    const path = join(dir, "meme-tinder.db");
    const run = () => {
      const memes = seedMemeRepository(createSqliteMemeRepository(path));
      const profiles = createSqliteProfileRepository(path);
      const swipes = createSqliteSwipeRepository(path);
      seedDemoPeople(profiles, swipes, createMemeCatalog(memes));
      const result = {
        people: profiles.list().length,
        swipes: demoPeople.map((person) => swipes.listByUser(person.userId).length),
      };
      memes.close();
      profiles.close();
      swipes.close();
      return result;
    };

    const first = run();
    const second = run();

    expect(first.people).toBe(demoPeople.length);
    expect(second).toEqual(first);
  });
});

describe("people endpoints", () => {
  function setup() {
    const backend = createTestBackend();
    const [one, two] = backend.catalog.list();
    return { ...backend, one, two };
  }
  const get = (app: ReturnType<typeof setup>["app"], path: string, userId = "me") =>
    request(app).get(path).set("X-User-Id", userId);

  it("lists people with their compatibility, best match first", async () => {
    const { app, swipes, profiles, one, two } = setup();
    profiles.save("sara", { nickname: "Sara", emoji: "🦄" });
    profiles.save("johan", { nickname: "Johan", emoji: "🤠" });
    swipe(swipes, "me", { [one.id]: "like", [two.id]: "like" });
    swipe(swipes, "sara", { [one.id]: "like", [two.id]: "nope" });
    swipe(swipes, "johan", { [one.id]: "like", [two.id]: "like" });

    const res = await get(app, "/api/people");

    expect(res.status).toBe(200);
    expect(res.body.people).toEqual([
      { nickname: "Johan", emoji: "🤠", demo: false, compatibility: 100, sharedSwipes: 2 },
      { nickname: "Sara", emoji: "🦄", demo: false, compatibility: 50, sharedSwipes: 2 },
    ]);
  });

  it("returns an empty list when there is nobody else", async () => {
    const { app, profiles } = setup();
    profiles.save("me", { nickname: "Me", emoji: "🐸" });

    const res = await get(app, "/api/people");

    expect(res.body).toEqual({ people: [] });
  });

  it("returns the memes both people liked", async () => {
    const { app, swipes, profiles, one, two } = setup();
    profiles.save("sara", { nickname: "Sara Lee", emoji: "🦄" });
    swipe(swipes, "me", { [one.id]: "like", [two.id]: "like" });
    swipe(swipes, "sara", { [one.id]: "nope", [two.id]: "like" });

    const res = await get(app, `/api/people/${encodeURIComponent("Sara Lee")}/shared-memes`);

    expect(res.status).toBe(200);
    expect(res.body.memes).toEqual([two]);
  });

  it("answers 404 with an error for an unknown person", async () => {
    const res = await get(setup().app, "/api/people/nobody/shared-memes");

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/nobody/);
  });

  it("needs a user id", async () => {
    const { app } = setup();

    expect((await request(app).get("/api/people")).status).toBe(400);
    expect((await request(app).get("/api/people/x/shared-memes")).status).toBe(400);
  });
});
