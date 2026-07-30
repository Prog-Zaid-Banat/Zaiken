export interface ProfileEntity {
  id: string;
  userId?: string | null;
  username: string;
  avatarPath?: string | null;
  rank: string;
  level: number;
  xp: number;
  xpMax: number;
  bio?: string | null;
  country?: string | null;
  totalWins: number;
  totalLosses: number;
  totalKills: number;
  totalDeaths: number;
  totalMatches: number;
  winStreak: number;
  bestWinStreak: number;
  reactionTimeMs: number;
  reactionSamples: number;
  joinDate: string;
}

export interface IProfileRepository {
  get(): Promise<ProfileEntity>;
  save(data: Partial<ProfileEntity>): Promise<ProfileEntity>;
}
