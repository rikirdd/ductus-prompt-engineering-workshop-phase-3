import { randomUUID } from "node:crypto";
import { IMAGE_PATH, type Meme } from "./catalog.js";
import type { ImageStore } from "./images.js";
import type { MemeRepository } from "./repository.js";

export const MAX_CAPTION_LENGTH = 140;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** The input is not a valid meme (empty caption, unsupported image, and so on). */
export class InvalidMemeError extends Error {}

/** The image is larger than the allowed size. */
export class ImageTooLargeError extends InvalidMemeError {}

export interface MemeService {
  /**
   * Stores a new meme that every user will get in their pile. The image type is detected from the bytes,
   * not from anything the client claims. Throws InvalidMemeError (or ImageTooLargeError) for bad input.
   */
  postMeme(input: { caption: string; image: Buffer }): Meme;
}

const IMAGE_TYPES = [
  { extension: "png", matches: (b: Buffer) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { extension: "jpg", matches: (b: Buffer) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
] as const;

export function createMemeService(repository: MemeRepository, imageStore: ImageStore): MemeService {
  return {
    postMeme({ caption, image }) {
      const trimmed = caption.trim();
      if (!trimmed) throw new InvalidMemeError("caption is required");
      if (trimmed.length > MAX_CAPTION_LENGTH) {
        throw new InvalidMemeError(`caption must be at most ${MAX_CAPTION_LENGTH} characters`);
      }
      if (image.length === 0) throw new InvalidMemeError("image is required");
      if (image.length > MAX_IMAGE_BYTES) {
        throw new ImageTooLargeError(`image must be at most ${MAX_IMAGE_BYTES / (1024 * 1024)} MB`);
      }
      const type = IMAGE_TYPES.find((candidate) => candidate.matches(image));
      if (!type) throw new InvalidMemeError("image must be a PNG or JPEG file");

      const id = randomUUID();
      const fileName = `${id}.${type.extension}`;
      imageStore.save(fileName, image);
      const meme = { id, caption: trimmed, imageUrl: `${IMAGE_PATH}/${fileName}` };
      repository.add(meme);
      return meme;
    },
  };
}
