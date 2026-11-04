import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { MemeRepository } from "./repository.js";

export interface SqliteMemeRepository extends MemeRepository {
  /** Closes the database file. Not needed by the app, which keeps it open until exit. */
  close(): void;
}

/** A MemeRepository backed by a SQLite file. Pass ":memory:" for a throwaway database. */
export function createSqliteMemeRepository(path: string): SqliteMemeRepository {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });

  const db = new DatabaseSync(path);
  db.exec(`
    CREATE TABLE IF NOT EXISTS memes (
      id TEXT PRIMARY KEY,
      caption TEXT NOT NULL,
      image_url TEXT NOT NULL
    )
  `);

  const list = db.prepare("SELECT id, caption, image_url FROM memes ORDER BY rowid");
  const get = db.prepare("SELECT id, caption, image_url FROM memes WHERE id = ?");
  const insert = db.prepare("INSERT OR IGNORE INTO memes (id, caption, image_url) VALUES (?, ?, ?)");

  const toMeme = (row: Record<string, unknown>) => ({
    id: String(row.id),
    caption: String(row.caption),
    imageUrl: String(row.image_url),
  });

  return {
    list: () => list.all().map(toMeme),
    getById: (id) => {
      const row = get.get(id);
      return row ? toMeme(row) : undefined;
    },
    add: (meme) => {
      insert.run(meme.id, meme.caption, meme.imageUrl);
    },
    close: () => db.close(),
  };
}
