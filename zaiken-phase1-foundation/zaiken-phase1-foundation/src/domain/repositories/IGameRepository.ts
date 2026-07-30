export interface GameEntity {
  id: string;
  name: string;
  genre?: string | null;
  exePath?: string | null;
  coverImage?: string | null;
  emoji?: string | null;
  platform: string;
  steamAppId?: string | null;
  logPath?: string | null;
  notes?: string | null;
  totalMinutes: number;
  kills: number;
  deaths: number;
  wins: number;
  losses: number;
  matches: number;
  lastPlayedAt?: string | null;
  addedAt: string;
  updatedAt?: string;
}

export interface IGameRepository {
  findAll(): Promise<GameEntity[]>;
  findById(id: string): Promise<GameEntity | null>;
  add(input: Partial<GameEntity> & { name: string }): Promise<GameEntity>;
  update(id: string, data: Partial<GameEntity>): Promise<GameEntity | null>;
  delete(id: string): Promise<boolean>;
}
