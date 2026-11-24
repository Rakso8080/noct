import { useEffect, useState } from 'react';
import { api, type StatsResponse } from '../lib/api';
import { ScreenHead, StatBox, formatDay } from '../components/ui';
import { MAX_SCORE } from '../../shared/score';

function calendarLevel(score: number | null): '0' | '1' | '2' | '3' {
  if (score === null) return '0';
  const ratio = score / MAX_SCORE;
  if (ratio >= 0.75) return '3';
  if (ratio >= 0.55) return '2';
  return '1';
}

export function Stats({ navigate }: { navigate: (path: string) => void }) {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .stats()
      .then((s) => {
        if (alive) setStats(s);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (failed) {
    return (
      <main className="main">
        <div className="wrap">
          <ScreenHead eyebrow="Statistics" title="Statistics">
            Your numbers live on the server. They could not be loaded just now.
          </ScreenHead>
          <button className="btn" onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
      </main>
    );
  }

  if (!stats) {
    return (
      <main className="main">
        <div className="wrap">
          <ScreenHead eyebrow="Statistics" title="Statistics">
            Counting your sparks…
          </ScreenHead>
        </div>
      </main>
    );
  }

  if (stats.dailyCompleted === 0) {
    return (
      <main className="main">
        <div className="wrap">
          <ScreenHead eyebrow="Statistics" title="Nothing to count yet">
            Finish a daily board and this page starts filling in: streak, average, best, and every
            board you have ever solved.
          </ScreenHead>
          <button className="btn btn-primary" onClick={() => navigate('/play')}>
            Play today’s board
          </button>
        </div>
      </main>
    );
  }

  const maxBucket = Math.max(1, ...stats.distribution.map((d) => d.count));

  return (
    <main className="main">
      <div className="wrap">
        <ScreenHead eyebrow="Statistics" title="Your quiet record">
          Everything here is yours alone. Nothing is shared unless you put a name on the standings.
        </ScreenHead>

        <div className="stat-grid" style={{ marginBottom: 20 }}>
          <StatBox label="Current streak" value={stats.currentStreak} note="days in a row" />
          <StatBox label="Best streak" value={stats.bestStreak} note="personal record" />
          <StatBox label="Boards finished" value={stats.dailyCompleted} note={`${stats.played} sessions total`} />
          <StatBox label="Average score" value={stats.avgScore} note={`of ${MAX_SCORE} possible`} />
        </div>

        <div className="stat-grid" style={{ marginBottom: 28 }}>
          <StatBox label="Highest score" value={stats.bestScore} />
          <StatBox label="Total points" value={stats.totalScore} />
          <StatBox label="Perfect days" value={stats.perfectDays} note="87%+ of max" />
          <StatBox label="Archive boards" value={stats.archivePlayed} note={`${stats.practiceRounds} practice rounds`} />
        </div>

        <section className="card stack gap-14" style={{ marginBottom: 20 }}>
          <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <span className="eyebrow">Last 70 days</span>
            <div className="heat-legend">
              <span>less</span>
              <span className="cal-cell" data-level="1" style={{ width: 11, height: 11 }} />
              <span className="cal-cell" data-level="2" style={{ width: 11, height: 11 }} />
              <span className="cal-cell" data-level="3" style={{ width: 11, height: 11 }} />
              <span>more</span>
            </div>
          </div>
          <div className="calendar" role="img" aria-label="Daily completion calendar for the last 70 days">
            {stats.calendar.map((c) => (
              <span
                key={c.day}
                className="cal-cell"
                data-level={calendarLevel(c.score)}
                data-today={c.day === stats.calendar[stats.calendar.length - 1]?.day ? 'true' : 'false'}
                title={`${c.date}${c.score !== null ? ` · ${c.score}` : ' · not played'}`}
              />
            ))}
          </div>
          <p className="par-note" style={{ margin: 0 }}>
            {stats.calendar.filter((c) => c.score !== null).length} of the last 70 days played. Missing
            a day resets the streak, never the record.
          </p>
        </section>

        <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          <section className="card stack gap-14">
            <span className="eyebrow">Score distribution</span>
            <div className="dist" aria-label="Score distribution">
              {stats.distribution.map((d) => (
                <div
                  key={d.from}
                  className="dist-bar"
                  style={{ height: `${Math.max(4, (d.count / maxBucket) * 100)}%` }}
                  title={`${d.from}–${d.to}: ${d.count} board${d.count === 1 ? '' : 's'}`}
                >
                  <span style={{ height: `${(d.count / maxBucket) * 100}%` }} />
                </div>
              ))}
            </div>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="par-note">0</span>
              <span className="par-note">{MAX_SCORE}</span>
            </div>
            <p className="par-note" style={{ margin: 0 }}>
              {stats.hintsUsed} hint{stats.hintsUsed === 1 ? '' : 's'} used in total.
            </p>
          </section>

          <section className="card stack gap-14">
            <span className="eyebrow">Recent boards</span>
            <div className="stack">
              {stats.recent.map((r) => (
                <div
                  key={r.day}
                  className="row"
                  style={{ justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)' }}
                >
                  <span className="mono" style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>
                    #{String(r.day).padStart(3, '0')} · {formatDay(r.date)}
                  </span>
                  <span className="row gap-10">
                    <span className="par-note">{r.rating}</span>
                    <span className="mono">{r.score}</span>
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
