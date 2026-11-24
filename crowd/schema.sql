-- Crowd aggregates. Counts only: no free text, no accounts, no IP addresses.

CREATE TABLE IF NOT EXISTS answers (
  day INTEGER NOT NULL,
  game TEXT NOT NULL,
  prompt_id TEXT NOT NULL,
  answer_key TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, game, prompt_id, answer_key)
);

CREATE INDEX IF NOT EXISTS answers_by_prompt ON answers (day, prompt_id);

CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  day INTEGER NOT NULL,
  game TEXT NOT NULL,
  mode TEXT NOT NULL,
  score INTEGER NOT NULL,
  height INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS runs_by_day ON runs (day, game);

-- Per-device daily caps, so one browser cannot become the crowd.
CREATE TABLE IF NOT EXISTS usage (
  day INTEGER NOT NULL,
  device TEXT NOT NULL,
  kind TEXT NOT NULL,
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, device, kind)
);
