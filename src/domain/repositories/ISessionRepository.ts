export interface SessionEntity {
  id: string;
  gameId: string;
  minutes: number;
  kills?: number;
  deaths?: number;
  wins?: number;
  losses?: number;
  matches?: number;
  startedAt?: string | null;
  endedAt: string;
  createdAt?: string;
}

export interface ISessionRepository {
  add(session: Omit<SessionEntity, 'id'> & { id?: string }): Promise<SessionEntity>;
  findByGame(gameId: string): Promise<SessionEntity[]>;
  findRecent(limit: number): Promise<SessionEntity[]>;
  dailyStats(days: number): Promise<Array<{ date: string; minutes: number; sessions: number }>>;
}
