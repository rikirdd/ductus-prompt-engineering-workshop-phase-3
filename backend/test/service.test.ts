import { describe, expect, it } from "vitest";
import { createInMemorySwipeRepository } from "../src/swipes/repository.js";
import { createSwipeService, MIN_SWIPES_FOR_PERCENTAGE, UnknownMemeError } from "../src/swipes/service.js";
import { createTestCatalog } from "./helpers.js";

function setup() {
  const catalog = createTestCatalog([
    { id: "a", caption: "A", file: "a.svg" },
    { id: "b", caption: "B", file: "b.svg" },
  ]);
  return createSwipeService(catalog, createInMemorySwipeRepository());
}

describe("swipe service", () => {
  it("returns the first meme to a user who has not swiped", () => {
    expect(setup().getNextMeme("u1")?.id).toBe("a");
  });

  it("skips memes the user has liked or noped", () => {
    const service = setup();
    service.recordSwipe("u1", "a", "like");
    expect(service.getNextMeme("u1")?.id).toBe("b");
    service.recordSwipe("u1", "b", "nope");
    expect(service.getNextMeme("u1")).toBeNull();
  });

  it("returns the recorded swipe", () => {
    expect(setup().recordSwipe("u1", "a", "like")).toEqual({ memeId: "a", direction: "like" });
  });

  it("keeps the first swipe when the same meme is swiped again", () => {
    const service = setup();
    service.recordSwipe("u1", "a", "like");

    expect(service.recordSwipe("u1", "a", "nope")).toEqual({ memeId: "a", direction: "like" });
    expect(service.getNextMeme("u1")?.id).toBe("b");
  });

  it("counts the user's swipes, likes and nopes alike", () => {
    const service = setup();
    expect(service.countSwipes("u1")).toBe(0);

    service.recordSwipe("u1", "a", "like");
    service.recordSwipe("u1", "b", "nope");

    expect(service.countSwipes("u1")).toBe(2);
    expect(service.countSwipes("u2")).toBe(0);
  });

  it("counts a repeat swipe of the same meme once and starts over after a reset", () => {
    const service = setup();
    service.recordSwipe("u1", "a", "like");
    service.recordSwipe("u1", "a", "nope");
    expect(service.countSwipes("u1")).toBe(1);

    service.resetSwipes("u1");

    expect(service.countSwipes("u1")).toBe(0);
  });

  describe("meme stats", () => {
    it("are empty for a meme nobody has swiped", () => {
      expect(setup().getMemeStats("a")).toEqual({ likes: 0, total: 0, percentage: null });
    });

    it("count likes and swipes across all users, as a rounded percentage", () => {
      const service = setup();
      service.recordSwipe("u1", "a", "like");
      service.recordSwipe("u2", "a", "like");
      service.recordSwipe("u3", "a", "nope");
      service.recordSwipe("u3", "b", "like");

      expect(service.getMemeStats("a")).toEqual({ likes: 2, total: 3, percentage: 67 });
    });

    it("give a percentage from the minimum number of swipes, and none below it", () => {
      const service = setup();
      for (let i = 1; i < MIN_SWIPES_FOR_PERCENTAGE; i++) service.recordSwipe(`u${i}`, "a", "like");
      expect(service.getMemeStats("a").percentage).toBeNull();

      service.recordSwipe("last", "a", "like");

      expect(service.getMemeStats("a")).toEqual({ likes: MIN_SWIPES_FOR_PERCENTAGE, total: MIN_SWIPES_FOR_PERCENTAGE, percentage: 100 });
    });

    it("count a repeat swipe once and drop a user's swipes after a reset", () => {
      const service = setup();
      service.recordSwipe("u1", "a", "like");
      service.recordSwipe("u1", "a", "nope");
      service.recordSwipe("u2", "a", "nope");
      service.recordSwipe("u3", "a", "nope");
      expect(service.getMemeStats("a")).toEqual({ likes: 1, total: 3, percentage: 33 });

      service.resetSwipes("u1");

      expect(service.getMemeStats("a")).toEqual({ likes: 0, total: 2, percentage: 0 });
    });

    it("come with the next meme", () => {
      const service = setup();
      service.recordSwipe("u2", "a", "like");

      expect(service.getNextMeme("u1")).toMatchObject({ id: "a", stats: { likes: 1, total: 1, percentage: 100 } });
    });
  });

  it("keeps swipe history separate per user", () => {
    const service = setup();
    service.recordSwipe("u1", "a", "like");
    expect(service.getNextMeme("u2")?.id).toBe("a");
  });

  it("makes previously swiped memes available again after a reset", () => {
    const service = setup();
    service.recordSwipe("u1", "a", "like");
    service.recordSwipe("u1", "b", "nope");
    expect(service.getNextMeme("u1")).toBeNull();

    service.resetSwipes("u1");

    expect(service.getNextMeme("u1")?.id).toBe("a");
  });

  it("clears likes and nopes on reset", () => {
    const service = setup();
    service.recordSwipe("u1", "a", "like");
    service.recordSwipe("u1", "b", "nope");

    service.resetSwipes("u1");

    // A fresh swipe is stored with its new direction, so nothing from before survived.
    expect(service.recordSwipe("u1", "a", "nope")).toEqual({ memeId: "a", direction: "nope" });
    expect(service.recordSwipe("u1", "b", "like")).toEqual({ memeId: "b", direction: "like" });
  });

  it("only resets the given user", () => {
    const service = setup();
    service.recordSwipe("u1", "a", "like");
    service.recordSwipe("u2", "a", "like");

    service.resetSwipes("u1");

    expect(service.getNextMeme("u1")?.id).toBe("a");
    expect(service.getNextMeme("u2")?.id).toBe("b");
  });

  it("does nothing harmful when resetting a user with no swipes", () => {
    const service = setup();

    expect(() => service.resetSwipes("u1")).not.toThrow();
    expect(() => service.resetSwipes("u1")).not.toThrow();
    expect(service.getNextMeme("u1")?.id).toBe("a");
  });

  it("rejects an unknown meme id", () => {
    expect(() => setup().recordSwipe("u1", "nope-such-meme", "like")).toThrow(UnknownMemeError);
  });

  describe("listLikedMemes", () => {
    function setupWithThree() {
      const catalog = createTestCatalog([
        { id: "a", caption: "A", file: "a.svg" },
        { id: "b", caption: "B", file: "b.svg" },
        { id: "c", caption: "C", file: "c.svg" },
      ]);
      return createSwipeService(catalog, createInMemorySwipeRepository());
    }
    const ids = (memes: { id: string }[]) => memes.map((meme) => meme.id);

    it("returns an empty list for a user with no swipes", () => {
      expect(setupWithThree().listLikedMemes("u1")).toEqual([]);
    });

    it("returns only liked memes, not nopes", () => {
      const service = setupWithThree();
      service.recordSwipe("u1", "a", "nope");
      service.recordSwipe("u1", "b", "like");

      expect(ids(service.listLikedMemes("u1"))).toEqual(["b"]);
    });

    it("returns full memes in a consistent order regardless of swipe order", () => {
      const service = setupWithThree();
      service.recordSwipe("u1", "c", "like");
      service.recordSwipe("u1", "a", "like");

      const likes = service.listLikedMemes("u1");

      expect(ids(likes)).toEqual(["a", "c"]);
      expect(likes[0]).toEqual({ id: "a", caption: "A", imageUrl: expect.stringMatching(/a\.svg$/) });
      expect(service.listLikedMemes("u1")).toEqual(likes);
    });

    it("keeps likes separate per user", () => {
      const service = setupWithThree();
      service.recordSwipe("u1", "a", "like");
      service.recordSwipe("u2", "b", "like");

      expect(ids(service.listLikedMemes("u1"))).toEqual(["a"]);
      expect(ids(service.listLikedMemes("u2"))).toEqual(["b"]);
    });

    it("keeps the first swipe when a liked meme is swiped as nope again", () => {
      const service = setupWithThree();
      service.recordSwipe("u1", "a", "like");
      service.recordSwipe("u1", "a", "nope");

      expect(ids(service.listLikedMemes("u1"))).toEqual(["a"]);
    });

    it("is empty again after a reset", () => {
      const service = setupWithThree();
      service.recordSwipe("u1", "a", "like");

      service.resetSwipes("u1");

      expect(service.listLikedMemes("u1")).toEqual([]);
    });
  });
});
