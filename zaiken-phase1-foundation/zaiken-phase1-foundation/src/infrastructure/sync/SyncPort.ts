/**
 * Sync abstraction for future PostgreSQL / cloud sync
 * Local SQLite remains source of truth offline.
 */
export interface SyncChange {
  entity: string;
  id: string;
  op: 'upsert' | 'delete';
  payload?: Record<string, unknown>;
  updatedAt: string;
}

export interface SyncPort {
  push(changes: SyncChange[]): Promise<{ ok: boolean; error?: string }>;
  pull(since: string): Promise<{ ok: boolean; changes?: SyncChange[]; error?: string }>;
}

/** No-op implementation until cloud backend exists */
export class NullSyncPort implements SyncPort {
  async push(): Promise<{ ok: boolean }> {
    return { ok: true };
  }
  async pull(): Promise<{ ok: boolean; changes: SyncChange[] }> {
    return { ok: true, changes: [] };
  }
}
