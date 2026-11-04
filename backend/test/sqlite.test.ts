import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createMemeCatalog } from "../src/memes/catalog.js";
import { createSqliteSwipeRepository } from "../src/swipes/sqlite.js";
import { createSwipeService } from "../src/swipes/service.js";

const dirs: string[] = [];
function tempDbPath() {
  const dir = mkdtempSync(join(tmpdir(), "meme-tinder-"));
  dirs.push(dir);
  return join(dir, "nested", "swipes.db");
}
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("sqlite swipe repository", () => {
  it("returns an empty list for a user without swipes", () => {
    expect(createSqliteSwipeRepository(":memory:").listByUser("u1")).toEqual([]);
  });

  it("returns swipes in the order they were added", () => {
    const repo = createSqliteSwipeRepository(":memory:");
    repo.add("u1", { memeId: "b", direction: "nope" });
    repo.add("u1", { memeId: "a", direction: "like" });
    expect(repo.listByUser("u1")).toEqual([
      { memeId: "b", direction: "nope" },
      { memeId: "a", direction: "like" },
    ]);
  });

  it("keeps the first swipe when the same meme is added twice", () => {
    const repo = createSqliteSwipeRepository(":memory:");
    repo.add("u1", { memeId: "a", direction: "like" });
    repo.add("u1", { memeId: "a", direction: "nope" });
    expect(repo.listByUser("u1")).toEqual([{ memeId: "a", direction: "like" }]);
  });

  it("keeps users separate and clears only the given user", () => {
    const repo = createSqliteSwipeRepository(":memory:");
    repo.add("u1", { memeId: "a", direction: "like" });
    repo.add("u2", { memeId: "a", direction: "nope" });
    repo.clearByUser("u1");
    repo.clearByUser("u1");
    expect(repo.listByUser("u1")).toEqual([]);
    expect(repo.listByUser("u2")).toEqual([{ memeId: "a", direction: "nope" }]);
  });

  it("keeps likes after the repository is reopened (a restart)", () => {
    const path = tempDbPath();
    const catalog = createMemeCatalog([
      { id: "a", caption: "A", file: "a.svg" },
      { id: "b", caption: "B", file: "b.svg" },
    ]);

    const first = createSqliteSwipeRepository(path);
    createSwipeService(catalog, first).recordSwipe("u1", "a", "like");
    first.close();

    const second = createSqliteSwipeRepository(path);
    const restarted = createSwipeService(catalog, second);
    expect(restarted.listLikedMemes("u1").map((meme) => meme.id)).toEqual(["a"]);
    expect(restarted.getNextMeme("u1")?.id).toBe("b");
    second.close();
  });
});
