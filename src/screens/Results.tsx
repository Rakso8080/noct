import { useState } from 'react';
import type { Summary } from '../../shared/types';
import { MAX_SCORE, parMs, speedTier } from '../../shared/score';
import { dayToISO } from '../../shared/dates';
import { Board } from '../components/Board';
import { formatDate, formatDuration, useCountUp } from '../components/ui';
import { sfx } from '../lib/audio';

interface ResultsProps {
  summary: Summary | null;
  navigate: (path: string) => void;
}

function tierGlyph(tier: 0 | 1 | 2): string {
  return tier === 0 ? '🟦' : tier === 1 ? '🟨' : '⬜';
}

function shareText(summary: Summary): string {
  const label =
    summary.mode === 'daily'
      ? `Noct #${String(summary.day ?? 1).padStart(3, '0')}`
      : summary.mode === 'archive'
        ? `Noct archive #${summary.day}`
        : 'Noct practice';
  const grid = summary.rounds.map((r) => tierGlyph(speedTier(r.timeMs, r.size))).join('');
  const streak = summary.mode === 'daily' && summary.streak > 0 ? ` · ${summary.streak}-day streak` : '';
  const date = summary.mode === 'daily' && summary.day ? ` — ${dayToISO(summary.day)}` : '';
  return `${label}${date}\n${grid}  ${summary.score}/${summary.maxScore}\n${summary.rating}${streak}\nnoct.game`;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

function downloadCard(summary: Summary): void {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#12161c');
  bg.addColorStop(1, '#08090b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = '#232b36';
  ctx.lineWidth = 3;
  ctx.strokeRect(48, 48, W - 96, H - 96);

  ctx.fillStyle = '#f2b33d';
  ctx.font = '600 26px ui-sans-serif, system-ui, sans-serif';
  ctx.fillText('N O C T', 104, 140);

  ctx.fillStyle = '#8e9aa9';
  ctx.font = '500 22px ui-sans-serif, system-ui, sans-serif';
  const label =
    summary.mode === 'daily'
      ? `BOARD ${String(summary.day ?? 1).padStart(3, '0')} · ${summary.day ? dayToISO(summary.day) : ''}`
      : summary.mode.toUpperCase();
  ctx.fillText(label, 104, 200);

  ctx.fillStyle = '#e9edf2';
  ctx.font = '700 200px ui-monospace, Menlo, monospace';
  ctx.fillText(String(summary.score), 100, 420);

  ctx.fillStyle = '#8e9aa9';
  ctx.font = '500 40px ui-monospace, Menlo, monospace';
  ctx.fillText(`/ ${summary.maxScore}`, 110, 480);

  const tiers = summary.rounds.map((r) => speedTier(r.timeMs, r.size));
  const colors = ['#5ac8a0', '#f2b33d', '#3a4453'];
  tiers.forEach((t, i) => {
    ctx.fillStyle = colors[t];
    const x = 104 + i * 132;
    ctx.beginPath();
    ctx.roundRect(x, 560, 108, 108, 18);
    ctx.fill();
  });

  ctx.fillStyle = '#e9edf2';
  ctx.font = '400 76px ui-serif, Georgia, serif';
  ctx.fillText(summary.rating, 104, 800);

  ctx.fillStyle = '#8e9aa9';
  ctx.font = '400 34px ui-sans-serif, system-ui, sans-serif';
  const line2 =
    summary.mode === 'daily'
      ? `${summary.streak}-day streak · ${summary.rounds.length} boards · ${formatDuration(summary.timeMs)}`
      : `${summary.rounds.length} boards · ${formatDuration(summary.timeMs)}`;
  ctx.fillText(line2, 104, 860);

  ctx.fillStyle = '#4a5563';
  ctx.font = '500 26px ui-sans-serif, system-ui, sans-serif';
  ctx.fillText('noct.game', 104, H - 120);

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `noct-${summary.day ?? 'practice'}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }, 'image/png');
}

export function Results({ summary, navigate }: ResultsProps) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const counted = useCountUp(summary?.score ?? 0, 900);

  if (!summary) {
    return (
      <main className="main">
        <div className="wrap" style={{ maxWidth: 520 }}>
          <div className="card stack gap-14">
            <h1 style={{ fontSize: 'var(--step-2)' }}>No result to show</h1>
            <p className="par-note">
              Results appear once you finish a board. Play today’s, or open one from the archive.
            </p>
            <div className="row gap-10" style={{ flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => navigate('/play')}>
                Play today’s board
              </button>
              <button className="btn btn-ghost" onClick={() => navigate('/archive')}>
                Browse the archive
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const isDaily = summary.mode === 'daily';
  const dateLabel = summary.day ? formatDate(dayToISO(summary.day)) : '';
  const grid = summary.rounds.map((r) => tierGlyph(speedTier(r.timeMs, r.size))).join('');
  const best = summary.rounds.reduce(
    (acc, r) => (r.points > acc.points ? r : acc),
    summary.rounds[0] ?? { index: 0, points: 0, size: 5, timeMs: 0, hintUsed: false, solution: [], region: [] },
  );
  const finishedRate =
    summary.global.started > 0
      ? Math.round((summary.global.completed / summary.global.started) * 100)
      : 0;

  async function handleCopy(): Promise<void> {
    const ok = await copyText(shareText(summary!));
    setCopied(ok);
    if (ok) sfx.tap();
    setTimeout(() => setCopied(false), 2200);
  }

  async function handleShare(): Promise<void> {
    const text = shareText(summary!);
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Noct', text });
        return;
      } catch {
        /* user cancelled */
      }
    }
    await handleCopy();
  }

  return (
    <main className="main">
      <div className="wrap">
        <div className="results-grid">
          <div className="stack gap-20">
            <header className="result-head fade-up">
              <div className="eyebrow">
                {isDaily ? `Board #${String(summary.day).padStart(3, '0')} · ${dateLabel}` : summary.mode === 'archive' ? `Archive #${summary.day} · ${dateLabel}` : 'Practice run'}
              </div>
              <div className="result-score">
                <span className="score-big">{counted}</span>
                <span className="result-max">/ {summary.maxScore}</span>
              </div>
              <div className="rating-word">{summary.rating}</div>
              <div className="row gap-6" style={{ flexWrap: 'wrap' }}>
                {isDaily ? (
                  <span className={`chip${summary.streak > 0 ? ' chip-ember' : ''}`}>
                    <span className="chip-dot" aria-hidden="true" />
                    {summary.streak}-day streak
                  </span>
                ) : (
                  <span className="chip">Not counted towards your streak</span>
                )}
                {summary.personalBest && isDaily ? <span className="chip">Personal best</span> : null}
                {summary.hints > 0 ? <span className="chip">{summary.hints} hint{summary.hints === 1 ? '' : 's'}</span> : <span className="chip">No hints</span>}
                <span className="chip">{formatDuration(summary.timeMs)} total</span>
              </div>
            </header>

            <section className="card stack gap-14">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="eyebrow">Your boards</span>
                <span className="eyebrow">points · time</span>
              </div>
              <div className="round-table">
                {summary.rounds.map((r) => {
                  const tier = speedTier(r.timeMs, r.size);
                  const share = Math.max(4, Math.round((r.points / (MAX_SCORE / summary.rounds.length)) * 100));
                  return (
                    <div className="round-row" key={r.index}>
                      <span className="mono" style={{ color: 'var(--muted)' }}>
                        {String(r.index + 1).padStart(2, '0')}
                      </span>
                      <div className="row gap-10" style={{ minWidth: 0 }}>
                        <span className={`round-dot`} data-state="done" aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%' }} />
                        <span className="bar" style={{ flex: 1 }} aria-hidden="true">
                          <i style={{ width: `${Math.min(100, share)}%`, background: tier === 0 ? 'var(--ok)' : tier === 1 ? 'var(--accent)' : 'var(--line-strong)' }} />
                        </span>
                        <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                          {r.size}×{r.size}
                        </span>
                      </div>
                      <span className="mono">{r.points}</span>
                      <span className={`mono ${tier === 0 ? 'tier-quick' : tier === 1 ? 'tier-par' : 'tier-slow'}`} style={{ fontSize: '0.8125rem' }}>
                        {formatDuration(r.timeMs)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <hr className="hairline" />
              <p className="par-note" style={{ margin: 0 }}>
                Fastest board: <strong style={{ color: 'var(--text)' }}>{formatDuration(best.timeMs)}</strong> on{' '}
                {best.size}×{best.size}. Par is {Math.round(parMs(best.size) / 1000)}s per board — beat it for the full
                time bonus.
              </p>
            </section>

            {isDaily && summary.global.completed > 0 ? (
              <section className="card stack gap-14">
                <span className="eyebrow">Today, worldwide</span>
                <div className="stat-grid">
                  <div className="stat" style={{ border: 0, padding: 0, background: 'transparent' }}>
                    <div className="stat-label">Finished</div>
                    <div className="stat-value">{finishedRate}%</div>
                    <div className="stat-note">
                      {summary.global.completed} of {summary.global.started} players
                    </div>
                  </div>
                  <div className="stat" style={{ border: 0, padding: 0, background: 'transparent' }}>
                    <div className="stat-label">Average score</div>
                    <div className="stat-value">{summary.global.avgScore}</div>
                    <div className="stat-note">all finished boards</div>
                  </div>
                  <div className="stat" style={{ border: 0, padding: 0, background: 'transparent' }}>
                    <div className="stat-label">Your rank</div>
                    <div className="stat-value">#{summary.rank ?? '—'}</div>
                    <div className="stat-note">
                      {summary.percentile !== null ? `top ${summary.percentile}%` : 'unranked'}
                    </div>
                  </div>
                  <div className="stat" style={{ border: 0, padding: 0, background: 'transparent' }}>
                    <div className="stat-label">Best streak</div>
                    <div className="stat-value">{summary.bestStreak}</div>
                    <div className="stat-note">days in a row</div>
                  </div>
                </div>
              </section>
            ) : null}

            <section className="card stack gap-14">
              <div className="row" style={{ justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <span className="eyebrow">Solutions</span>
                <button className="btn btn-sm btn-ghost" onClick={() => setRevealed((v) => !v)} aria-expanded={revealed}>
                  {revealed ? 'Hide' : 'Reveal the answers'}
                </button>
              </div>
              {revealed ? (
                <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))' }}>
                  {summary.rounds.map((r) => (
                    <div key={r.index} className="stack gap-6" style={{ alignItems: 'center' }}>
                      <div style={{ width: '100%', maxWidth: 150 }}>
                        <Board
                          size={r.size}
                          region={r.region}
                          givens={r.solution}
                          sparks={r.solution}
                          excluded={[]}
                          hinted={[]}
                          solved={false}
                          locked
                          label={`Solution for board ${r.index + 1}`}
                          onToggle={() => undefined}
                          onExclude={() => undefined}
                        />
                      </div>
                      <span className="eyebrow">Board {r.index + 1}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="par-note" style={{ margin: 0 }}>
                  Answers stay hidden while today is live so nobody can spoil it. Reveal only when you
                  have finished.
                </p>
              )}
            </section>
          </div>

          <aside className="stack gap-14">
            <div
              className="card stack gap-14"
              style={{ background: 'linear-gradient(155deg, var(--surface-2), var(--surface))' }}
            >
              <span className="eyebrow">Share card</span>
              <div className="stack gap-10" aria-label="Shareable result">
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="eyebrow" style={{ color: 'var(--accent)' }}>Noct</span>
                  <span className="eyebrow">
                    {isDaily ? `#${String(summary.day).padStart(3, '0')}` : summary.mode}
                  </span>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', lineHeight: 1 }}>
                  {summary.score}
                  <span style={{ fontSize: '0.9rem', color: 'var(--muted)', marginLeft: 8 }}>
                    / {summary.maxScore}
                  </span>
                </div>
                <div className="share-grid" aria-label={`Board speed: ${grid}`}>
                  {grid}
                </div>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span>{summary.rating}</span>
                  {isDaily ? <span className="par-note">{summary.streak}-day</span> : null}
                </div>
              </div>
              <hr className="hairline" />
              <div className="stack gap-10">
                <button className="btn btn-primary btn-block" onClick={() => void handleShare()}>
                  {copied ? 'Copied' : 'Share result'}
                </button>
                <div className="row gap-10">
                  <button className="btn btn-sm btn-ghost" style={{ flex: 1 }} onClick={() => void handleCopy()}>
                    Copy text
                  </button>
                  <button className="btn btn-sm btn-ghost" style={{ flex: 1 }} onClick={() => downloadCard(summary)}>
                    Save image
                  </button>
                </div>
                <p className="par-note" style={{ fontSize: '0.75rem' }}>
                  The card never shows answers — only your score, speed and streak.
                </p>
              </div>
            </div>

            <div className="card stack gap-10">
              <span className="eyebrow">Next</span>
              <button className="btn btn-block" onClick={() => navigate(isDaily ? '/practice?level=3' : '/play')}>
                {isDaily ? 'Practice another board' : 'Play today’s board'}
              </button>
              <button className="btn btn-sm btn-ghost btn-block" onClick={() => navigate('/leaderboard')}>
                See the standings
              </button>
              <button className="btn btn-sm btn-ghost btn-block" onClick={() => navigate('/stats')}>
                Your statistics
              </button>
              <button className="btn btn-sm btn-ghost btn-block" onClick={() => navigate('/archive')}>
                Archive
              </button>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
