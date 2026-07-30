/**
 * SQLite Game repository
 * Copyright © 2026 Zaid Bilal Banat
 */
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { getDb } from '../client';
import { games } from '../schema';
import type { GameEntity, IGameRepository } from '../../../domain/repositories/IGameRepository';

function mapRow(row: typeof games.$inferSelect): GameEntity {
  return {
    id: row.id,
    name: row.name,
    genre: row.genre,
    exePath: row.exePath,
    coverImage: row.coverImage,
    emoji: row.emoji,
    platform: row.platform,
    steamAppId: row.steamAppId,
    logPath: row.logPath,
    notes: row.notes,
    totalMinutes: row.totalMinutes,
    kills: row.kills,
    deaths: row.deaths,
    wins: row.wins,
    losses: row.losses,
    matches: row.matches,
    lastPlayedAt: row.lastPlayedAt,
    addedAt: row.addedAt,
    updatedAt: row.updatedAt,
  };
}

export class SqliteGameRepository implements IGameRepository {
  async findAll(): Promise<GameEntity[]> {
    const rows = getDb().select().from(games).all();
    return rows.map(mapRow);
  }

  async findById(id: string): Promise<GameEntity | null> {
    const row = getDb().select().from(games).where(eq(games.id, id)).get();
    return row ? mapRow(row) : null;
  }

  async add(input: Partial<GameEntity> & { name: string }): Promise<GameEntity> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const entity = {
      id,
      name: input.name || 'New Game',
      genre: input.genre ?? 'Unknown',
      exePath: input.exePath ?? '',
      coverImage: input.coverImage ?? '',
      emoji: input.emoji ?? '🎮',
      platform: input.platform ?? 'custom',
      steamAppId: input.steamAppId ?? null,
      logPath: input.logPath ?? '',
      notes: input.notes ?? '',
      totalMinutes: 0,
      kills: 0,
      deaths: 0,
      wins: 0,
      losses: 0,
      matches: 0,
      lastPlayedAt: null,
      addedAt: now,
      updatedAt: now,
    };
    getDb().insert(games).values(entity).run();
    return mapRow(entity as any);
  }

  async update(id: string, data: Partial<GameEntity>): Promise<GameEntity | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const { id: _i, addedAt: _a, ...rest } = data as any;
    const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (rest.name !== undefined) patch.name = rest.name;
    if (rest.genre !== undefined) patch.genre = rest.genre;
    if (rest.exePath !== undefined) patch.exePath = rest.exePath;
    if (rest.coverImage !== undefined) patch.coverImage = rest.coverImage;
    if (rest.emoji !== undefined) patch.emoji = rest.emoji;
    if (rest.platform !== undefined) patch.platform = rest.platform;
    if (rest.steamAppId !== undefined) patch.steamAppId = rest.steamAppId;
    if (rest.logPath !== undefined) patch.logPath = rest.logPath;
    if (rest.notes !== undefined) patch.notes = rest.notes;
    if (rest.totalMinutes !== undefined) patch.totalMinutes = rest.totalMinutes;
    if (rest.kills !== undefined) patch.kills = rest.kills;
    if (rest.deaths !== undefined) patch.deaths = rest.deaths;
    if (rest.wins !== undefined) patch.wins = rest.wins;
    if (rest.losses !== undefined) patch.losses = rest.losses;
    if (rest.matches !== undefined) patch.matches = rest.matches;
    if (rest.lastPlayedAt !== undefined) patch.lastPlayedAt = rest.lastPlayedAt;

    getDb().update(games).set(patch).where(eq(games.id, id)).run();
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    getDb().delete(games).where(eq(games.id, id)).run();
    return true;
  }
}
