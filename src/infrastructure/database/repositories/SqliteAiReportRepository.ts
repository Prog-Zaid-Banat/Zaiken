// Copyright © 2026 Zaid Bilal Banat. All rights reserved. Zaiken

import { randomUUID } from "crypto";
import { getDatabase } from "../../../main/ipc/databaseProvider";

export interface AiReportRecord {
  id: string;
  gameName: string | null;
  title: string | null;
  content: string;
  provider: string | null;
  model: string | null;
  createdAt: string;
}

export class SqliteAiReportRepository {
  private db() {
    return getDatabase().getConnection();
  }

  getAll(limit = 50): AiReportRecord[] {
    const n = Math.max(1, Math.min(500, Math.floor(limit) || 50));
    return this.db()
      .prepare(
        `
SELECT id, game_name AS gameName, title, content, provider, model, created_at AS createdAt
FROM ai_reports
ORDER BY created_at DESC
LIMIT ?
`
      )
      .all(n) as AiReportRecord[];
  }

  save(input: { gameName?: string | null; title?: string | null; content: string; provider?: string | null; model?: string | null }): AiReportRecord {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const record: AiReportRecord = {
      id,
      gameName: input.gameName ?? null,
      title: input.title ?? null,
      content: String(input.content || ""),
      provider: input.provider ?? null,
      model: input.model ?? null,
      createdAt,
    };
    this.db()
      .prepare(
        `
INSERT INTO ai_reports (id, game_name, title, content, provider, model, created_at)
VALUES (?, ?, ?, ?, ?, ?, ?)
`
      )
      .run(record.id, record.gameName, record.title, record.content, record.provider, record.model, record.createdAt);
    return record;
  }
}
