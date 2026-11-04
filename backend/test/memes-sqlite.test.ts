import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createMemeCatalog } from "../src/memes/catalog.js";
import { createInMemoryMemeRepository } from "../src/memes/repository.js";
import { seedMemeRepository, seedMemes } from "../src/memes/seed.js";
import { createSqliteMemeRepository } from "../src/memes/sqlite.js";

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const meme = (id: string) => ({ id, caption: `Caption ${id}`, imageUrl: `/api/memes/images/${id}.svg` });

const repositories = [
  ["in-memory", () => createInMemoryMemeRepository()],
  ["sqlite", () => createSqliteMemeRepository(":memory:")],
] as const;

describe.each(repositories)("%s meme repository", (_name, create) => {
  it("lists memes in the order they were added", () => {
    const repo = create();
    repo.add(meme("b"));
    repo.add(meme("a"));
    expect(repo.list().map((m) => m.id)).toEqual(["b", "a"]);
  });

  it("finds a meme by id and returns undefined for an unknown id", () => {
    const repo = create();
    repo.add(meme("a"));
    expect(repo.getById("a")).toEqual(meme("a"));
    expect(repo.getById("nope")).toBeUndefined();
  });

  it("keeps the existing meme when the same id is added again", () => {
    const repo = create();
    repo.add(meme("a"));
    repo.add({ ...meme("a"), caption: "Changed" });
    expect(repo.list()).toEqual([meme("a")]);
  });
});

describe("seeding", () => {
  it("loads all seed memes into an empty repository", () => {
    const repo = seedMemeRepository(createSqliteMemeRepository(":memory:"));
    expect(repo.list()).toHaveLength(seedMemes.length);
    expect(repo.getById("works-on-my-machine")?.imageUrl).toBe("/api/memes/images/works-on-my-machine.svg");
  });

  it("does not duplicate seed memes on a restart and keeps memes added since", () => {
    const dir = mkdtempSync(join(tmpdir(), "meme-tinder-"));
    dirs.push(dir);
    const path = join(dir, "meme-tinder.db");

    const first = seedMemeRepository(createSqliteMemeRepository(path));
    first.add(meme("posted-later"));
    first.close();

    const second = seedMemeRepository(createSqliteMemeRepository(path));
    const ids = createMemeCatalog(second).list().map((m) => m.id);
    expect(ids).toHaveLength(seedMemes.length + 1);
    expect(ids.at(-1)).toBe("posted-later");
    second.close();
  });
});
