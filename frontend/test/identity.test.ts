import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const KEY = "meme-tinder-user-id";

// identity.ts keeps a module-level fallback, so each test loads a fresh copy (like a fresh page load).
async function loadIdentity() {
  vi.resetModules();
  return import("../src/identity");
}

describe("getUserId", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("creates an id on first visit and stores it", async () => {
    const { getUserId } = await loadIdentity();
    const id = getUserId();
    expect(id).not.toBe("");
    expect(localStorage.getItem(KEY)).toBe(id);
  });

  it("returns the same id on every call and after a page reload", async () => {
    const first = (await loadIdentity()).getUserId();
    expect((await loadIdentity()).getUserId()).toBe(first);
    expect((await loadIdentity()).getUserId()).toBe(first);
  });

  it("reuses an id that is already stored", async () => {
    localStorage.setItem(KEY, "existing-id");
    expect((await loadIdentity()).getUserId()).toBe("existing-id");
  });

  it("falls back to one id per page load when localStorage is unavailable", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const { getUserId } = await loadIdentity();
    const id = getUserId();
    expect(id).not.toBe("");
    expect(getUserId()).toBe(id);
  });
});

describe("setUserId", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("makes this device use another user id, also after a page reload", async () => {
    const identity = await loadIdentity();
    identity.getUserId();

    identity.setUserId("laptop-id");

    expect(identity.getUserId()).toBe("laptop-id");
    expect((await loadIdentity()).getUserId()).toBe("laptop-id");
  });

  it("still switches user for this page load when localStorage is unavailable", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const { getUserId, setUserId } = await loadIdentity();

    setUserId("laptop-id");

    expect(getUserId()).toBe("laptop-id");
  });
});
