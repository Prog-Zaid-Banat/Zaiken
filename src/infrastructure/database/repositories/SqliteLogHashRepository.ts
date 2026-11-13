// Copyright © 2026 Zaid Bilal Banat. All rights reserved. Zaiken

import { randomUUID } from "crypto";
import { getDatabase } from "../../../main/ipc/databaseProvider";

export interface LogHashRecord {
  id: string;
  gameId: string | null;
  path: string;
  hash: string;
  size: number;
  createdAt: string;
}

export class SqliteLogHashRepository {
  private db() {
    return getDatabase().getConnection();
  }

  saveLogHash(input: { gameId: string | null; path: string; hash: string; size: number }): LogHashRecord {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    this.db()
      .prepare(
        `
INSERT INTO log_hashes (id, game_id, path, hash, size, created_at)
VALUES (?, ?, ?, ?, ?, ?)
`
      )
      .run(id, input.gameId, input.path, input.hash, input.size, createdAt);
    return {
      id,
      gameId: input.gameId,
      path: input.path,
      hash: input.hash,
      size: input.size,
      createdAt,
    };
  }

  getByGame(gameId: string, limit = 50): LogHashRecord[] {
    const n = Math.max(1, Math.min(500, Math.floor(limit) || 50));
    return this.db()
      .prepare(
        `
SELECT id, game_id AS gameId, path, hash, size, created_at AS createdAt
FROM log_hashes
WHERE game_id = ?
ORDER BY created_at DESC
LIMIT ?
`
      )
      .all(gameId, n) as LogHashRecord[];
  }

  latestHashForPath(path: string): string | null {
    const row = this.db()
      .prepare(
        `
SELECT hash FROM log_hashes
WHERE path = ?
ORDER BY created_at DESC
LIMIT 1
`
      )
      .get(path) as { hash: string } | undefined;
    return row ? row.hash : null;
  }
}
