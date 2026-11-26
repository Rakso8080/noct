import { useEffect, useState } from 'react';
import { LOCAL_MODE, api } from '../lib/api';
import { ARCADE_GAMES, ARCADE_LABELS, type ArcadeGame } from '../../shared/arcade';
import type { LeaderRow } from '../../shared/types';
import { ScreenHead } from '../components/ui';
import { useT } from '../lib/i18n';

type Scope = 'today' | 'week' | 'all';
type Board = 'nightly' | ArcadeGame;

interface Table {
  rows: LeaderRow[];
  me: LeaderRow | null;
  totalPlayers: number;
}

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
  const t = useT();
  const [scope, setScope] = useState<Scope>('today');
  const [board, setBoard] = useState<Board>('nightly');
  const [data, setData] = useState<Table | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setFailed(false);
    (board === 'nightly' ? api.leaderboard(scope) : api.arcadeLeaderboard(board, scope))
      .then((d) => {
        if (alive) {
          setData({ rows: d.rows, me: d.me, totalPlayers: d.totalPlayers });
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
  }, [scope, board]);

  const rows = data?.rows ?? [];
  const meInRows = rows.some((r) => r.me);

  return (
    <main className="main">
      <div className="wrap" style={{ maxWidth: 760 }}>
        <ScreenHead eyebrow="Standings" title="One attempt, one place">
          {t('Ranked on score, then on speed. No retries, so the table means something.')}
        </ScreenHead>

        {LOCAL_MODE ? (
          <p className="par-note" style={{ marginBottom: 16 }}>
            {t(
              'This copy of Noct runs entirely in your browser, so there is no shared table — the row below is your own result on this device.',
            )}
          </p>
        ) : null}

        <div className="lb-tabs" style={{ marginBottom: 10 }}>
          <button
            className="tab"
            aria-selected={board === 'nightly'}
            role="tab"
            onClick={() => setBoard('nightly')}
          >
            {t('Nightly')}
          </button>
          {ARCADE_GAMES.map((game) => (
            <button
              key={game}
              className="tab"
              aria-selected={board === game}
              role="tab"
              onClick={() => setBoard(game)}
            >
              {t(ARCADE_LABELS[game])}
            </button>
          ))}
        </div>

        <div className="lb-tabs" style={{ marginBottom: 16 }}>
          {SCOPES.map((s) => (
            <button
              key={s.value}
              className="tab"
              aria-selected={scope === s.value}
              role="tab"
              onClick={() => setScope(s.value)}
            >
              {t(s.label)}
            </button>
          ))}
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div className="empty">
              <span className="eyebrow">{t('Reading the ledger…')}</span>
            </div>
          ) : failed ? (
            <div className="empty">
              <span className="eyebrow">{t('Standings unavailable')}</span>
              <p>{t('The leaderboard could not be reached. Your own result is safe.')}</p>
              <button className="btn btn-sm" onClick={() => setScope(scope)}>
                {t('Try again')}
              </button>
            </div>
          ) : rows.length === 0 ? (
            <div className="empty">
              <span className="eyebrow">
                {t(board === 'nightly' ? EMPTY[scope].title : 'No scores on this table tonight')}
              </span>
              <p style={{ maxWidth: '36ch' }}>
                {t(
                  board === 'nightly'
                    ? EMPTY[scope].body
                    : 'Finish a Word Well or a Memory Bell run today and it lands here, with the board it was played on.',
                )}
              </p>
              <button
                className="btn btn-primary"
                onClick={() => navigate(board === 'nightly' ? '/play' : `/${board}`)}
              >
                {t(board === 'nightly' ? 'Play today’s board' : 'Play this table')}
              </button>
            </div>
          ) : (
            <>
              {rows.map((r) => (
                <div key={`${r.rank}-${r.name}`} className={`lb-row${r.me ? ' is-me' : ''}`}>
                  <span className="lb-rank">{String(r.rank).padStart(2, '0')}</span>
                  <span className="lb-name">
                    {r.name}
                    {r.me ? <span className="chip" style={{ marginLeft: 8, padding: '1px 8px', fontSize: '0.6875rem' }}>{t('you')}</span> : null}
                  </span>
                  <span className="lb-score">{r.score}</span>
                </div>
              ))}
              {data?.me && !meInRows ? (
                <div className="lb-row is-me" style={{ borderTop: '1px solid var(--line)' }}>
                  <span className="lb-rank">{String(data.me.rank).padStart(2, '0')}</span>
                  <span className="lb-name">{t('You · {n}-day streak', { n: data.me.streak })}</span>
                  <span className="lb-score">{data.me.score}</span>
                </div>
              ) : null}
            </>
          )}
        </div>

        {data && data.totalPlayers > 0 ? (
          <p className="par-note" style={{ marginTop: 14 }}>
            {t('{n} players on the {scope} table.', {
              n: data.totalPlayers,
              scope:
                scope === 'today'
                  ? t('daily')
                  : scope === 'week'
                    ? t('weekly')
                    : t('all-time'),
            })}{' '}
            {t('Guests show a player number until they choose a name in Settings.')}
          </p>
        ) : null}
      </div>
    </main>
  );
}
