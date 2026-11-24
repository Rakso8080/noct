import { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';
import { DATA_DIR } from './secret.ts';

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS players (
  id          TEXT PRIMARY KEY,
  name        TEXT,
  created_at  INTEGER NOT NULL,
  last_seen   INTEGER NOT NULL,
  flags       INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS daily_challenges (
  day         INTEGER PRIMARY KEY,
  date        TEXT NOT NULL,
  rounds_json TEXT NOT NULL,
  difficulty  REAL NOT NULL,
  published   INTEGER NOT NULL DEFAULT 1,
  created_at  INTEGER NOT NULL,
  plays       INTEGER NOT NULL DEFAULT 0,
  completes   INTEGER NOT NULL DEFAULT 0,
  score_sum   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sessions (
  id               TEXT PRIMARY KEY,
  player_id        TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  mode             TEXT NOT NULL,
  day              INTEGER,
  level            INTEGER,
  rounds_json      TEXT NOT NULL,
  round_index      INTEGER NOT NULL DEFAULT 0,
  started_at       INTEGER NOT NULL,
  round_started_at INTEGER NOT NULL,
  finished_at      INTEGER,
  hints_json       TEXT NOT NULL DEFAULT '[]',
  score_sum        INTEGER NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'active'
);

CREATE INDEX IF NOT EXISTS idx_sessions_player_mode ON sessions(player_id, mode, day);

CREATE TABLE IF NOT EXISTS round_plays (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id  TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  round_index INTEGER NOT NULL,
  cells_json  TEXT NOT NULL,
  ok          INTEGER NOT NULL,
  points      INTEGER NOT NULL,
  time_ms     INTEGER NOT NULL,
  hint_used   INTEGER NOT NULL,
  created_at  INTEGER NOT NULL,
  UNIQUE(session_id, round_index)
);

CREATE TABLE IF NOT EXISTS daily_results (
  player_id    TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  day          INTEGER NOT NULL,
  score        INTEGER NOT NULL,
  rating       TEXT NOT NULL,
  time_ms      INTEGER NOT NULL,
  hints        INTEGER NOT NULL,
  completed_at INTEGER NOT NULL,
  PRIMARY KEY(player_id, day)
);

CREATE INDEX IF NOT EXISTS idx_daily_results_day ON daily_results(day, score DESC);

CREATE TABLE IF NOT EXISTS archive_results (
  player_id    TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  day          INTEGER NOT NULL,
  best_score   INTEGER NOT NULL,
  best_time_ms INTEGER NOT NULL,
  attempts     INTEGER NOT NULL DEFAULT 1,
  updated_at   INTEGER NOT NULL,
  PRIMARY KEY(player_id, day)
);
`;

export const db = new DatabaseSync(join(DATA_DIR, 'noct.db'));
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
