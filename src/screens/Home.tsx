import { useEffect, useState } from 'react';
import { api, type TodayResponse } from '../lib/api';
import { Countdown, formatDate } from '../components/ui';
import { MAX_SCORE } from '../../shared/score';

interface HomeProps {
  navigate: (path: string) => void;
  onTutorial: () => void;
}

const PRACTICE_LEVELS = [
  { level: 1, label: 'Gentle' },
  { level: 2, label: 'Easy' },
  { level: 3, label: 'Steady' },
  { level: 4, label: 'Tricky' },
  { level: 5, label: 'Barbed' },
];

export function Home({ navigate, onTutorial }: HomeProps) {
  const [today, setToday] = useState<TodayResponse | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .today()
      .then((t) => {
        if (alive) setToday(t);
      })
      .catch(() => {
        if (alive) setError(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const sizes = today?.sizes ?? [5, 6, 6, 7];

  return (
    <main className="main">
      <div className="wrap">
        <section className="hero">
          <div className="fade-up">
            <div className="eyebrow" style={{ marginBottom: 14 }}>
              The daily spark puzzle
            </div>
            <h1 className="hero-title" style={{ marginBottom: 18 }}>
              Noct
              <span className="dot" aria-hidden="true" />
            </h1>
            <p className="hero-sub">
              One spark in every row, every column and every tone. Never let two sparks touch.
            </p>
            <p className="lede" style={{ marginTop: 16 }}>
              Four small boards, about two minutes, the same for everyone. A new set at midnight UTC.
              No account, no ads, nothing to install.
            </p>
            <div className="row gap-10" style={{ marginTop: 24, flexWrap: 'wrap' }}>
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/play')}>
                {today?.played ? 'Today’s result' : today?.active ? 'Continue today’s board' : 'Play today’s board'}
              </button>
              <button className="btn btn-ghost" onClick={onTutorial}>
                How to play
              </button>
            </div>
          </div>

          <aside className="today-card fade-up" aria-live="polite">
            <div className="today-top">
              <div>
                <div className="eyebrow">Board #{today ? String(today.day).padStart(3, '0') : '—'}</div>
                <div className="today-num" style={{ marginTop: 4 }}>
                  {today ? formatDate(today.date) : '—'}
                </div>
              </div>
              <span className="chip chip-ember">
                <span className="chip-dot" aria-hidden="true" />
                {today?.played ? 'Done' : 'Live'}
              </span>
            </div>

            <div className="row gap-10" style={{ flexWrap: 'wrap' }}>
              {sizes.map((s, i) => (
                <span key={i} className="chip mono">
                  {s}×{s}
                </span>
              ))}
            </div>

            {error ? (
              <p className="par-note">
                Can’t reach the server. Check your connection — the daily board needs to be online.
              </p>
            ) : today?.played ? (
              <div className="stack gap-10">
                <div className="result-score">
                  <span className="score-big">{today.score}</span>
                  <span className="result-max">/ {MAX_SCORE}</span>
                </div>
                <div className="rating-word">{today.rating}</div>
                <button className="btn btn-primary btn-block" onClick={() => navigate('/results')}>
                  See your result
                </button>
              </div>
            ) : (
              <div className="stack gap-10">
                <p className="par-note">
                  {today?.active
                    ? 'You have a board in progress. Your clock is still running.'
                    : 'Not played yet today. Four boards, gently harder each time.'}
                </p>
                <button className="btn btn-primary btn-block" onClick={() => navigate('/play')}>
                  {today?.active ? 'Continue' : 'Start'}
                </button>
              </div>
            )}

            <hr className="hairline" />

            <div className="row gap-14" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <div className="stack">
                <span className="eyebrow">Streak</span>
                <span className="mono" style={{ fontSize: '1.25rem' }}>
                  {today?.streak ?? 0} day{(today?.streak ?? 0) === 1 ? '' : 's'}
                </span>
              </div>
              <div className="stack" style={{ alignItems: 'flex-end' }}>
                <span className="eyebrow">Next board</span>
                {today ? <Countdown to={today.nextResetAt} /> : <span className="timer">--:--:--</span>}
              </div>
            </div>
          </aside>
        </section>

        <section style={{ marginTop: 52 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>
            How a board works
          </div>
          <div className="card">
            <ol className="rule-list">
              <li>
                <p>
                  <strong>One spark per line.</strong> Every row, every column and every shaded tone
                  holds exactly one spark.
                </p>
              </li>
              <li>
                <p>
                  <strong>Sparks repel.</strong> No two sparks may sit next to each other — not
                  sideways, not diagonally.
                </p>
              </li>
              <li>
                <p>
                  <strong>Some sparks are pre-lit.</strong> Locked sparks are part of the answer. Use
                  them to reason your way through.
                </p>
              </li>
            </ol>
            <hr className="hairline" style={{ margin: '20px 0 16px' }} />
            <div className="row gap-14" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <p className="par-note" style={{ maxWidth: '52ch' }}>
                Tap to light a spark, tap again to take it back. Long-press or press X to mark a cell
                as ruled out. Right-click does the same on a computer.
              </p>
              <button className="btn btn-sm btn-ghost" onClick={onTutorial}>
                Try the 30-second tutorial
              </button>
            </div>
          </div>
        </section>

        <section style={{ marginTop: 40 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>
            Keep playing
          </div>
          <div
            style={{
              display: 'grid',
              gap: 12,
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            }}
          >
            <div className="card stack gap-10">
              <h2 style={{ fontSize: '1.25rem' }}>Practice</h2>
              <p className="par-note">
                Fresh boards, never expired, no streak at risk. Aim for the fastest clean solve.
              </p>
              <div className="row gap-6" style={{ flexWrap: 'wrap' }}>
                {PRACTICE_LEVELS.map((p) => (
                  <button
                    key={p.level}
                    className="tab"
                    onClick={() => navigate(`/practice?level=${p.level}`)}
                    title={`${p.label} — boards from ${4 + p.level}×${4 + p.level}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="card stack gap-10">
              <h2 style={{ fontSize: '1.25rem' }}>Archive</h2>
              <p className="par-note">
                Every past board, kept like a small collection. Replay them without touching
                today’s streak.
              </p>
              <button className="btn btn-sm" onClick={() => navigate('/archive')}>
                Open the archive
              </button>
            </div>
            <div className="card stack gap-10">
              <h2 style={{ fontSize: '1.25rem' }}>Standings</h2>
              <p className="par-note">
                Today, this week and all time. Ranked on score — one honest attempt per board.
              </p>
              <button className="btn btn-sm" onClick={() => navigate('/leaderboard')}>
                See the standings
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
