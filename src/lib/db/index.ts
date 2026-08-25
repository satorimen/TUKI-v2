import { MemoryDb } from './memory-db';
import type { DbRepository } from './repository';

export type DbKind = 'supabase' | 'memory';

/**
 * Repository factory — same pattern as the AI providers:
 * - Supabase env vars present → SupabaseDb
 * - otherwise → MemoryDb (dev/demo; data lives until server restart)
 */
export function getDb(): { db: DbRepository; kind: DbKind } {
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  ) {
    try {
      // lazy require to avoid loading supabase-js when unused
      const { SupabaseDb } = require('./supabase-db') as typeof import('./supabase-db');
      return { db: new SupabaseDb(), kind: 'supabase' };
    } catch (e) {
      console.error('[getDb] Supabase init failed, falling back to memory:', (e as Error).message);
    }
  }
  return { db: new MemoryDb(), kind: 'memory' };
}

export * from './types';
export * from './repository';
