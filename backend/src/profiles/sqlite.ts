import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { nicknameKey, type ProfileRepository } from "./repository.js";

export interface SqliteProfileRepository extends ProfileRepository {
  /** Closes the database file. Not needed by the app, which keeps it open until exit. */
  close(): void;
}

/** A ProfileRepository backed by a SQLite file. Pass ":memory:" for a throwaway database. */
export function createSqliteProfileRepository(path: string): SqliteProfileRepository {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });

  const db = new DatabaseSync(path);
  // nickname_key is the lowercase nickname; its unique index makes the "no duplicate nicknames" rule hold even for concurrent requests.
  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      user_id TEXT PRIMARY KEY,
      nickname TEXT NOT NULL,
      nickname_key TEXT NOT NULL UNIQUE,
      emoji TEXT NOT NULL
    )
  `);

  const get = db.prepare("SELECT nickname, emoji FROM profiles WHERE user_id = ?");
  const findByKey = db.prepare("SELECT user_id FROM profiles WHERE nickname_key = ?");
  const upsert = db.prepare(`
    INSERT INTO profiles (user_id, nickname, nickname_key, emoji) VALUES (?, ?, ?, ?)
    ON CONFLICT (user_id) DO UPDATE SET nickname = excluded.nickname, nickname_key = excluded.nickname_key, emoji = excluded.emoji
  `);

  return {
    getByUserId: (userId) => {
      const row = get.get(userId);
      return row ? { nickname: String(row.nickname), emoji: String(row.emoji) } : undefined;
    },
    findUserIdByNickname: (nickname) => {
      const row = findByKey.get(nicknameKey(nickname));
      return row ? String(row.user_id) : undefined;
    },
    save: (userId, profile) => {
      try {
        upsert.run(userId, profile.nickname, nicknameKey(profile.nickname), profile.emoji);
        return true;
      } catch (err) {
        // The unique index rejected the nickname because another user has it.
        if (err instanceof Error && /UNIQUE constraint failed/.test(err.message)) return false;
        throw err;
      }
    },
    close: () => db.close(),
  };
}
