export type Mode = 'daily' | 'practice' | 'archive';

export interface RoundView {
  index: number;
  size: number;
  region: number[];
  givens: number[];
}

export interface TodayResponse {
  day: number;
  date: string;
  nextResetAt: number;
  now: number;
  roundCount: number;
  sizes: number[];
  played: boolean;
  score: number | null;
  rating: string | null;
  streak: number;
  bestStreak: number;
  active: boolean;
  global: GlobalToday;
}

export interface GlobalToday {
  started: number;
  completed: number;
  avgScore: number;
}

export interface StartResponse {
  sessionId: string;
  mode: Mode;
  day: number | null;
  roundIndex: number;
  rounds: RoundView[];
  score: number;
  hintsLeft: number;
  resumed: boolean;
}

export interface RoundRecord {
  index: number;
  size: number;
  region: number[];
  points: number;
  timeMs: number;
  hintUsed: boolean;
  solution: number[];
}

export interface Summary {
  sessionId: string;
  mode: Mode;
  day: number | null;
  score: number;
  maxScore: number;
  rating: string;
  rounds: RoundRecord[];
  timeMs: number;
  hints: number;
  streak: number;
  bestStreak: number;
  rank: number | null;
  percentile: number | null;
  global: GlobalToday;
  personalBest: boolean;
}

export interface RoundResponse {
  ok: boolean;
  reason?: string;
  points?: number;
  solution?: number[];
  nextIndex?: number;
  score?: number;
  hintsLeft?: number;
  finished?: boolean;
  summary?: Summary;
}

export interface HintResponse {
  cell: number;
  hintsLeft: number;
}

export interface LeaderRow {
  rank: number;
  name: string;
  score: number;
  streak: number;
  me: boolean;
}

export interface LeaderboardResponse {
  scope: 'today' | 'week' | 'all';
  rows: LeaderRow[];
  me: LeaderRow | null;
  totalPlayers: number;
}

export interface ArchiveEntry {
  day: number;
  date: string;
  score: number | null;
  difficulty: number | null;
  playable: boolean;
}

import type { ArcadeGame } from './arcade';

export interface ArcadeScoreResponse {
  ok: true;
  game: ArcadeGame;
  day: number;
  /** the best score this player has on the table today */
  best: number;
  plays: number;
  rank: number;
}

export interface ArcadeLeaderboardResponse {
  game: ArcadeGame;
  scope: 'today' | 'week' | 'all';
  rows: LeaderRow[];
  me: LeaderRow | null;
  totalPlayers: number;
}

export interface ArcadeStat {
  game: ArcadeGame;
  plays: number;
  best: number;
  total: number;
  lastDay: number;
}

export interface StatsResponse {
  played: number;
  dailyCompleted: number;
  currentStreak: number;
  bestStreak: number;
  avgScore: number;
  bestScore: number;
  perfectDays: number;
  totalScore: number;
  hintsUsed: number;
  distribution: { from: number; to: number; count: number }[];
  recent: { day: number; date: string; score: number; rating: string }[];
  calendar: { day: number; date: string; score: number | null }[];
  practiceRounds: number;
  archivePlayed: number;
  arcade: ArcadeStat[];
}

export interface MeResponse {
  id: string;
  name: string | null;
  joined: string;
}
