/**
 * One schema, two runtimes: node:sqlite in `server/`, D1 in `worker/`.
 *
 * DDL only — no PRAGMA. The Node process sets journal mode and foreign keys
 * itself; D1 does not accept those pragmas inside a batch.
 */
export const SCHEMA = `
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

CREATE TABLE IF NOT EXISTS arcade_scores (
  player_id  TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  game       TEXT NOT NULL,
  day        INTEGER NOT NULL,
  score      INTEGER NOT NULL,
  plays      INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(player_id, game, day)
);

CREATE INDEX IF NOT EXISTS idx_arcade_game_day ON arcade_scores(game, day, score DESC);
`;

/** Tables and the columns the API reads or writes, for schema drift tests. */
export const TABLES: Record<string, string[]> = {
  players: ['id', 'name', 'created_at', 'last_seen', 'flags'],
  daily_challenges: [
    'day',
    'date',
    'rounds_json',
    'difficulty',
    'published',
    'created_at',
    'plays',
    'completes',
    'score_sum',
  ],
  sessions: [
    'id',
    'player_id',
    'mode',
    'day',
    'level',
    'rounds_json',
    'round_index',
    'started_at',
    'round_started_at',
    'finished_at',
    'hints_json',
    'score_sum',
    'status',
  ],
  round_plays: [
    'id',
    'session_id',
    'round_index',
    'cells_json',
    'ok',
    'points',
    'time_ms',
    'hint_used',
    'created_at',
  ],
  daily_results: ['player_id', 'day', 'score', 'rating', 'time_ms', 'hints', 'completed_at'],
  archive_results: ['player_id', 'day', 'best_score', 'best_time_ms', 'attempts', 'updated_at'],
  arcade_scores: ['player_id', 'game', 'day', 'score', 'plays', 'updated_at'],
};
