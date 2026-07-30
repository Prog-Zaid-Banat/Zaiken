/**
 * SQLite Session repository
 * Copyright © 2026 Zaid Bilal Banat
 */
import { eq, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { getDb, getSqlite } from '../client';
import { playSessions, games } from '../schema';
import type { ISessionRepository, SessionEntity } from '../../../domain/repositories/ISessionRepository';
import { applyPlaytimeXp, computeRank } from '../../../domain/services/RankCalculator';
import { profiles } from '../schema';

function mapRow(row: typeof playSessions.$inferSelect): SessionEntity {
  return {
    id: row.id,
    gameId: row.gameId,
    minutes: row.minutes,
    kills: row.kills ?? 0,
    deaths: row.deaths ?? 0,
    wins: row.wins ?? 0,
    losses: row.losses ?? 0,
    matches: row.matches ?? 0,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    createdAt: row.createdAt,
  };
}

export class SqliteSessionRepository implements ISessionRepository {
  async add(input: Omit<SessionEntity, 'id'> & { id?: string }): Promise<SessionEntity> {
    const id = input.id || randomUUID();
    const minutes = Math.max(0, Math.round(Number(input.minutes) || 0));
    const endedAt = input.endedAt || new Date().toISOString();

    const conn = getSqlite();
    const tx = conn.transaction(() => {
      getDb()
        .insert(playSessions)
        .values({
          id,
          gameId: input.gameId,
          minutes,
          kills: input.kills ?? 0,
          deaths: input.deaths ?? 0,
          wins: input.wins ?? 0,
          losses: input.losses ?? 0,
          matches: input.matches ?? 0,
          startedAt: input.startedAt ?? null,
          endedAt,
        })
        .run();

      // update aggregate on game
      const game = getDb().select().from(games).where(eq(games.id, input.gameId)).get();
      if (game) {
        getDb()
          .update(games)
          .set({
            totalMinutes: (game.totalMinutes || 0) + minutes,
            lastPlayedAt: endedAt,
            kills: (game.kills || 0) + (input.kills || 0),
            deaths: (game.deaths || 0) + (input.deaths || 0),
            wins: (game.wins || 0) + (input.wins || 0),
            losses: (game.losses || 0) + (input.losses || 0),
            matches: (game.matches || 0) + (input.matches || 0),
            updatedAt: new Date().toISOString(),
          })
          .where(eq(games.id, input.gameId))
          .run();
      }

      // XP on profile
      if (minutes > 0) {
        const profile = getDb().select().from(profiles).all()[0];
        if (profile) {
          const next = applyPlaytimeXp(
            { xp: profile.xp, xpMax: profile.xpMax, level: profile.level },
            minutes
          );
          const rank = computeRank({
            totalWins: profile.totalWins,
            totalKills: profile.totalKills,
            level: next.level,
          });
          getDb()
            .update(profiles)
            .set({
              xp: next.xp,
              xpMax: next.xpMax,
              level: next.level,
              rank,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(profiles.id, profile.id))
            .run();
        }
      }
    });
    tx();

    const row = getDb().select().from(playSessions).where(eq(playSessions.id, id)).get();
    return mapRow(row!);
  }

  async findByGame(gameId: string): Promise<SessionEntity[]> {
    return getDb()
      .select()
      .from(playSessions)
      .where(eq(playSessions.gameId, gameId))
      .all()
      .map(mapRow);
  }

  async findRecent(limit: number): Promise<SessionEntity[]> {
    return getDb()
      .select()
      .from(playSessions)
      .orderBy(desc(playSessions.endedAt))
      .limit(limit)
      .all()
      .map(mapRow);
  }

  async dailyStats(days = 7): Promise<Array<{ date: string; minutes: number; sessions: number }>> {
    const all = getDb().select().from(playSessions).all();
    return Array.from({ length: days }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const dateStr = d.toISOString().split('T')[0];
      const day = all.filter((s) => s.endedAt && s.endedAt.startsWith(dateStr));
      return {
        date: dateStr,
        minutes: day.reduce((a, s) => a + (s.minutes || 0), 0),
        sessions: day.length,
      };
    });
  }
}
