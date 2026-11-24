import type {
  ArchiveEntry,
  HintResponse,
  LeaderboardResponse,
  MeResponse,
  RoundResponse,
  StartResponse,
  StatsResponse,
  Summary,
  TodayResponse,
} from '../../shared/types';

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      credentials: 'same-origin',
      headers: init?.body ? { 'content-type': 'application/json' } : undefined,
      ...init,
    });
  } catch {
    throw new ApiError(0, 'offline', null);
  }
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const msg =
      body && typeof body === 'object' && 'error' in body
        ? String((body as { error: unknown }).error)
        : `request failed (${res.status})`;
    throw new ApiError(res.status, msg, body);
  }
  return body as T;
}

export const api = {
  today: () => request<TodayResponse>('/api/today'),
  dailyStart: () => request<StartResponse>('/api/daily/start', { method: 'POST', body: '{}' }),
  practiceStart: (level: number) =>
    request<StartResponse>('/api/practice/start', { method: 'POST', body: JSON.stringify({ level }) }),
  archiveStart: (day: number) =>
    request<StartResponse>(`/api/archive/${day}/start`, { method: 'POST', body: '{}' }),
  submitRound: (sessionId: string, index: number, cells: number[]) =>
    request<RoundResponse>(`/api/session/${sessionId}/round`, {
      method: 'POST',
      body: JSON.stringify({ index, cells }),
    }),
  hint: (sessionId: string, placed: number[]) =>
    request<HintResponse>(`/api/session/${sessionId}/hint`, {
      method: 'POST',
      body: JSON.stringify({ placed }),
    }),
  archive: (limit = 42) => request<{ entries: ArchiveEntry[] }>(`/api/archive?limit=${limit}`),
  leaderboard: (scope: 'today' | 'week' | 'all') =>
    request<LeaderboardResponse>(`/api/leaderboard?scope=${scope}`),
  stats: () => request<StatsResponse>('/api/stats'),
  me: () => request<MeResponse>('/api/me'),
  setName: (name: string) =>
    request<{ ok: boolean; name: string | null }>('/api/me', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  deleteMe: () => request<{ ok: boolean }>('/api/me', { method: 'DELETE' }),
};

export type { ArchiveEntry, LeaderboardResponse, RoundResponse, StartResponse, StatsResponse, Summary, TodayResponse };
