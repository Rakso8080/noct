import type {
  ArchiveEntry,
  HintResponse,
  LeaderboardResponse,
  MeResponse,
  RoundResponse,
  StartResponse,
  StatsResponse,
  TodayResponse,
} from '../../shared/types';

/** The whole client/server contract, implemented twice: over HTTP and in the tab. */
export interface NoctApi {
  today(): Promise<TodayResponse>;
  dailyStart(): Promise<StartResponse>;
  practiceStart(level: number): Promise<StartResponse>;
  archiveStart(day: number): Promise<StartResponse>;
  submitRound(sessionId: string, index: number, cells: number[]): Promise<RoundResponse>;
  hint(sessionId: string, placed: number[]): Promise<HintResponse>;
  archive(limit?: number): Promise<{ entries: ArchiveEntry[] }>;
  leaderboard(scope: 'today' | 'week' | 'all'): Promise<LeaderboardResponse>;
  stats(): Promise<StatsResponse>;
  me(): Promise<MeResponse>;
  setName(name: string): Promise<{ ok: boolean; name: string | null }>;
  deleteMe(): Promise<{ ok: boolean }>;
}
