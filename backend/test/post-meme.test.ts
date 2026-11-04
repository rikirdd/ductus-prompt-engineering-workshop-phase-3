import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { createFileImageStore } from "../src/memes/images.js";
import { MAX_CAPTION_LENGTH, MAX_IMAGE_BYTES } from "../src/memes/service.js";
import { createTestApp } from "./helpers.js";

// Smallest valid-looking files: only the signature bytes matter, because the server detects the type from them.
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from("rest of png")]);
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from("rest of jpg")]);

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const post = (app: ReturnType<typeof createTestApp>, body: object, userId = "poster") =>
  request(app).post("/api/memes").set("X-User-Id", userId).send(body);

const nextIds = async (app: ReturnType<typeof createTestApp>, userId: string) => {
  // Swipe through the whole pile and return the ids in the order they were served.
  const ids: string[] = [];
  for (;;) {
    const { meme } = (await request(app).get("/api/memes/next").set("X-User-Id", userId)).body;
    if (!meme) return ids;
    ids.push(meme.id);
    await request(app).post("/api/swipes").set("X-User-Id", userId).send({ memeId: meme.id, direction: "nope" });
  }
};

describe("POST /api/memes", () => {
  it.each([
    ["PNG", PNG, ".png"],
    ["JPEG", JPG, ".jpg"],
  ])("posts a %s with a caption and returns the new meme", async (_name, file, extension) => {
    const res = await post(createTestApp(), { caption: "  My meme  ", image: file.toString("base64") });

    expect(res.status).toBe(201);
    expect(res.body.meme).toEqual({
      id: expect.any(String),
      caption: "My meme",
      imageUrl: expect.stringContaining(extension),
    });
  });

  it("accepts the image as a data URL", async () => {
    const res = await post(createTestApp(), {
      caption: "Data URL",
      image: `data:image/png;base64,${PNG.toString("base64")}`,
    });
    expect(res.status).toBe(201);
  });

  it("shows the new meme in other users' piles, not only the poster's", async () => {
    const app = createTestApp();
    const { meme } = (await post(app, { caption: "For everyone", image: PNG.toString("base64") })).body;

    expect(await nextIds(app, "mum")).toContain(meme.id);
    expect(await nextIds(app, "poster")).toContain(meme.id);
  });

  it("serves the posted image with the bytes that were uploaded", async () => {
    const dir = mkdtempSync(join(tmpdir(), "meme-tinder-uploads-"));
    dirs.push(dir);
    const app = createTestApp(undefined, createFileImageStore(dir));
    const { meme } = (await post(app, { caption: "Serve me", image: PNG.toString("base64") })).body;

    const res = await request(app).get(meme.imageUrl).buffer(true).parse((r, cb) => {
      const chunks: Buffer[] = [];
      r.on("data", (c: Buffer) => chunks.push(c));
      r.on("end", () => cb(null, Buffer.concat(chunks)));
    });
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("image/png");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.body.equals(PNG)).toBe(true);
  });

  it("can be swiped like any other meme", async () => {
    const app = createTestApp();
    const { meme } = (await post(app, { caption: "Likeable", image: PNG.toString("base64") })).body;

    await request(app).post("/api/swipes").set("X-User-Id", "mum").send({ memeId: meme.id, direction: "like" }).expect(200);
    const likes = await request(app).get("/api/likes").set("X-User-Id", "mum");
    expect(likes.body.memes.map((m: { id: string }) => m.id)).toEqual([meme.id]);
  });

  it("detects the type from the bytes, not from what the client says", async () => {
    const res = await post(createTestApp(), {
      caption: "Not an image",
      image: `data:image/png;base64,${Buffer.from("<script>alert(1)</script>").toString("base64")}`,
    });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "image must be a PNG or JPEG file" });
  });

  it.each([
    ["missing caption", { image: PNG.toString("base64") }, "caption is required"],
    ["blank caption", { caption: "   ", image: PNG.toString("base64") }, "caption is required"],
    ["missing image", { caption: "No image" }, "image is required"],
    ["image that is not base64", { caption: "Bad", image: "not base64 !!" }, "image must be base64 encoded"],
    [
      "caption that is too long",
      { caption: "x".repeat(MAX_CAPTION_LENGTH + 1), image: PNG.toString("base64") },
      `caption must be at most ${MAX_CAPTION_LENGTH} characters`,
    ],
  ])("returns 400 for a %s", async (_name, body, error) => {
    const res = await post(createTestApp(), body);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error });
  });

  it("returns 413 when the image is too large", async () => {
    const big = Buffer.concat([PNG, Buffer.alloc(MAX_IMAGE_BYTES)]);
    const res = await post(createTestApp(), { caption: "Huge", image: big.toString("base64") });
    expect(res.status).toBe(413);
    expect(res.body).toEqual({ error: "image must be at most 5 MB" });
  });

  it("returns 400 without a user id", async () => {
    const res = await request(createTestApp()).post("/api/memes").send({ caption: "Hi", image: PNG.toString("base64") });
    expect(res.status).toBe(400);
  });

  it("does not add a meme when the post is rejected", async () => {
    const app = createTestApp();
    const before = await nextIds(app, "a");
    await post(app, { caption: "Bad", image: Buffer.from("nope").toString("base64") });
    expect(await nextIds(app, "b")).toEqual(before);
  });
});
