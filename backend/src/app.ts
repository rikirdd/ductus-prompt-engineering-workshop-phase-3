import express, { type NextFunction, type Request, type Response } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { IMAGE_PATH } from "./memes/catalog.js";
import type { ImageStore } from "./memes/images.js";
import { InvalidMemeError, ImageTooLargeError, type MemeService } from "./memes/service.js";
import { DIRECTIONS, type Direction } from "./swipes/repository.js";
import { UnknownMemeError, type SwipeService } from "./swipes/service.js";

const assetsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../assets/memes");

/** Returns the user id from the X-User-Id header, or sends 400 and returns null. */
function requireUserId(req: Request, res: Response): string | null {
  const userId = req.header("X-User-Id")?.trim();
  if (!userId) {
    res.status(400).json({ error: "Missing X-User-Id header" });
    return null;
  }
  return userId;
}

function isDirection(value: unknown): value is Direction {
  return DIRECTIONS.includes(value as Direction);
}

export interface AppOptions {
  /** Directory with the built frontend. When set, it is served as static files with an SPA fallback. */
  staticDir?: string;
}

/** Posted images are base64 in JSON, which is about a third larger than the file (limit is 5 MB of image). */
const MEME_UPLOAD_BODY_LIMIT = "8mb";

export function createApp(
  swipeService: SwipeService,
  memeService: MemeService,
  imageStore: ImageStore,
  options: AppOptions = {},
) {
  const app = express();
  const defaultJson = express.json();
  const memeUploadJson = express.json({ limit: MEME_UPLOAD_BODY_LIMIT });
  app.use((req, res, next) => (req.method === "POST" && req.path === "/api/memes" ? memeUploadJson : defaultJson)(req, res, next));

  app.use(IMAGE_PATH, express.static(assetsDir));
  // Uploaded images. nosniff keeps browsers from treating a file as anything other than the type it is served as.
  app.use(IMAGE_PATH, express.static(imageStore.directory, { setHeaders: (res) => res.setHeader("X-Content-Type-Options", "nosniff") }));

  // 200 with { meme }. When the user has swiped every meme, meme is null.
  app.get("/api/memes/next", (req, res) => {
    const userId = requireUserId(req, res);
    if (!userId) return;
    res.json({ meme: swipeService.getNextMeme(userId) });
  });

  // 201 with { meme }. Body: { caption, image } where image is the file as base64 (a data URL is fine too).
  app.post("/api/memes", (req, res) => {
    const userId = requireUserId(req, res);
    if (!userId) return;
    const { caption, image } = req.body ?? {};
    if (typeof caption !== "string" || !caption.trim()) {
      res.status(400).json({ error: "caption is required" });
      return;
    }
    if (typeof image !== "string" || !image) {
      res.status(400).json({ error: "image is required" });
      return;
    }
    const base64 = image.replace(/^data:[^,]*;base64,/, "");
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
      res.status(400).json({ error: "image must be base64 encoded" });
      return;
    }
    try {
      res.status(201).json({ meme: memeService.postMeme({ caption, image: Buffer.from(base64, "base64") }) });
    } catch (err) {
      if (err instanceof ImageTooLargeError) {
        res.status(413).json({ error: err.message });
        return;
      }
      if (err instanceof InvalidMemeError) {
        res.status(400).json({ error: err.message });
        return;
      }
      throw err;
    }
  });

  // 200 with the stored swipe. Swiping the same meme twice keeps the first swipe.
  app.post("/api/swipes", (req, res) => {
    const userId = requireUserId(req, res);
    if (!userId) return;
    const { memeId, direction } = req.body ?? {};
    if (typeof memeId !== "string" || !memeId) {
      res.status(400).json({ error: "memeId is required" });
      return;
    }
    if (!isDirection(direction)) {
      res.status(400).json({ error: `direction must be one of: ${DIRECTIONS.join(", ")}` });
      return;
    }
    try {
      res.json(swipeService.recordSwipe(userId, memeId, direction));
    } catch (err) {
      if (err instanceof UnknownMemeError) {
        res.status(404).json({ error: err.message });
        return;
      }
      throw err;
    }
  });

  // 200 with { memes }: the user's liked memes in catalog order, or an empty list.
  app.get("/api/likes", (req, res) => {
    const userId = requireUserId(req, res);
    if (!userId) return;
    res.json({ memes: swipeService.listLikedMemes(userId) });
  });

  // 204 No Content. Removes all of the user's swipes, including likes. Safe to repeat.
  app.delete("/api/swipes", (req, res) => {
    const userId = requireUserId(req, res);
    if (!userId) return;
    swipeService.resetSwipes(userId);
    res.status(204).end();
  });

  // Built frontend (production only). Registered after the API routes and never answers /api paths.
  if (options.staticDir) {
    const staticDir = path.resolve(options.staticDir);
    app.use(express.static(staticDir));
    app.use((req, res, next) => {
      const isApiPath = req.path === "/api" || req.path.startsWith("/api/");
      if ((req.method !== "GET" && req.method !== "HEAD") || isApiPath) {
        next();
        return;
      }
      res.sendFile(path.join(staticDir, "index.html"));
    });
  }

  // Malformed JSON bodies and other client errors from middleware get a JSON error too.
  app.use((err: { status?: number; message?: string }, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status && err.status < 500 ? err.status : 500;
    res.status(status).json({ error: status < 500 ? "Invalid request" : "Internal server error" });
  });

  return app;
}
