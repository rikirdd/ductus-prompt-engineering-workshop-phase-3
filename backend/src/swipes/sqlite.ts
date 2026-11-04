import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { Direction, Swipe, SwipeCounts, SwipeRepository } from "./repository.js";

export interface SqliteSwipeRepository extends SwipeRepository {
  /** Closes the database file. Not needed by the app, which keeps it open until exit. */
  close(): void;
}

/**
 * A SwipeRepository backed by a SQLite file, so swipes survive restarts.
 * Uses the SQLite built into Node.js (no extra dependency). Pass ":memory:" for a throwaway database.
 */
export function createSqliteSwipeRepository(path: string): SqliteSwipeRepository {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });

  const db = new DatabaseSync(path);
  db.exec(`
    CREATE TABLE IF NOT EXISTS swipes (
      user_id TEXT NOT NULL,
      meme_id TEXT NOT NULL,
      direction TEXT NOT NULL CHECK (direction IN ('like', 'nope')),
      PRIMARY KEY (user_id, meme_id)
    )
  `);

  const list = db.prepare("SELECT meme_id, direction FROM swipes WHERE user_id = ? ORDER BY rowid");
  // First swipe wins, matching the in-memory repository and the service's idempotency rule.
  const insert = db.prepare("INSERT OR IGNORE INTO swipes (user_id, meme_id, direction) VALUES (?, ?, ?)");
  const clear = db.prepare("DELETE FROM swipes WHERE user_id = ?");
  const countMeme = db.prepare(
    "SELECT COUNT(*) AS total, COALESCE(SUM(direction = 'like'), 0) AS likes FROM swipes WHERE meme_id = ?",
  );

  return {
    listByUser: (userId) =>
      list.all(userId).map((row): Swipe => ({
        memeId: String(row.meme_id),
        direction: row.direction as Direction,
      })),
    add: (userId, swipe) => {
      insert.run(userId, swipe.memeId, swipe.direction);
    },
    clearByUser: (userId) => {
      clear.run(userId);
    },
    countByMeme: (memeId): SwipeCounts => {
      const row = countMeme.get(memeId);
      return { likes: Number(row?.likes ?? 0), total: Number(row?.total ?? 0) };
    },
    close: () => db.close(),
  };
}
