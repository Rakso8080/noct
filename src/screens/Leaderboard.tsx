import { useEffect, useState } from 'react';
import { api, type LeaderboardResponse } from '../lib/api';
import { ScreenHead } from '../components/ui';

type Scope = 'today' | 'week' | 'all';

const SCOPES: { value: Scope; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'all', label: 'All time' },
];

const EMPTY: Record<Scope, { title: string; body: string }> = {
  today: {
    title: 'Nobody has finished today yet',
    body: 'Finish today’s boards and you take the first place. It will not last long.',
  },
  week: {
    title: 'No scores this week',
    body: 'The week starts with your first finished board. Seven days of dailies add up.',
  },
  all: {
    title: 'The table is empty',
    body: 'All-time standings begin with the first player. That could be you.',
  },
};

export function Leaderboard({ navigate }: { navigate: (path: string) => void }) {
  const [scope, setScope] = useState<Scope>('today');
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setFailed(false);
    api
      .leaderboard(scope)
      .then((d) => {
        if (alive) {
          setData(d);
          setLoading(false);
        }
      })
      .catch(() => {
        if (alive) {
          setFailed(true);
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
  }, [scope]);

  const rows = data?.rows ?? [];
  const meInRows = rows.some((r) => r.me);

  return (
    <main className="main">
      <div className="wrap" style={{ maxWidth: 760 }}>
        <ScreenHead eyebrow="Standings" title="One attempt, one place">
          Ranked on score, then on speed. No retries, so the table means something.
        </ScreenHead>

        <div className="lb-tabs" style={{ marginBottom: 16 }}>
          {SCOPES.map((s) => (
            <button
              key={s.value}
              className="tab"
              aria-selected={scope === s.value}
              role="tab"
              onClick={() => setScope(s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div className="empty">
              <span className="eyebrow">Reading the ledger…</span>
            </div>
          ) : failed ? (
            <div className="empty">
              <span className="eyebrow">Standings unavailable</span>
              <p>The leaderboard could not be reached. Your own result is safe.</p>
              <button className="btn btn-sm" onClick={() => setScope(scope)}>
                Try again
              </button>
            </div>
          ) : rows.length === 0 ? (
            <div className="empty">
              <span className="eyebrow">{EMPTY[scope].title}</span>
              <p style={{ maxWidth: '36ch' }}>{EMPTY[scope].body}</p>
              <button className="btn btn-primary" onClick={() => navigate('/play')}>
                Play today’s board
              </button>
            </div>
          ) : (
            <>
              {rows.map((r) => (
                <div key={`${r.rank}-${r.name}`} className={`lb-row${r.me ? ' is-me' : ''}`}>
                  <span className="lb-rank">{String(r.rank).padStart(2, '0')}</span>
                  <span className="lb-name">
                    {r.name}
                    {r.me ? <span className="chip" style={{ marginLeft: 8, padding: '1px 8px', fontSize: '0.6875rem' }}>you</span> : null}
                  </span>
                  <span className="lb-score">{r.score}</span>
                </div>
              ))}
              {data?.me && !meInRows ? (
                <div className="lb-row is-me" style={{ borderTop: '1px solid var(--line)' }}>
                  <span className="lb-rank">{String(data.me.rank).padStart(2, '0')}</span>
                  <span className="lb-name">You · {data.me.streak}-day streak</span>
                  <span className="lb-score">{data.me.score}</span>
                </div>
              ) : null}
            </>
          )}
        </div>

        {data && data.totalPlayers > 0 ? (
          <p className="par-note" style={{ marginTop: 14 }}>
            {data.totalPlayers} player{data.totalPlayers === 1 ? '' : 's'} on the {scope === 'today' ? 'daily' : scope === 'week' ? 'weekly' : 'all-time'} table.
            Guests show a player number until they choose a name in Settings.
          </p>
        ) : null}
      </div>
    </main>
  );
}
