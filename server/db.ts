import { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';
import { DATA_DIR } from './secret.ts';
import { SCHEMA } from '../shared/schema.ts';

export const db = new DatabaseSync(join(DATA_DIR, 'noct.db'));
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
db.exec(SCHEMA);

/** Additive migrations for databases created by an earlier build. */
function ensureColumn(table: string, column: string, ddl: string): void {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}

ensureColumn('daily_challenges', 'plays', 'plays INTEGER NOT NULL DEFAULT 0');
ensureColumn('daily_challenges', 'completes', 'completes INTEGER NOT NULL DEFAULT 0');
ensureColumn('daily_challenges', 'score_sum', 'score_sum INTEGER NOT NULL DEFAULT 0');
ensureColumn('sessions', 'level', 'level INTEGER');

export type Row = Record<string, unknown>;

export function one(sql: string, ...params: (string | number | null)[]): Row | null {
  const stmt = db.prepare(sql);
  const row = stmt.get(...params);
  return (row as Row | undefined) ?? null;
}

export function all(sql: string, ...params: (string | number | null)[]): Row[] {
  return db.prepare(sql).all(...params) as Row[];
}

export function run(sql: string, ...params: (string | number | null)[]): void {
  db.prepare(sql).run(...params);
}

export function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' ? v : typeof v === 'bigint' ? Number(v) : fallback;
}

export function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}
