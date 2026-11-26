import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { challengeLink } from '../lib/challenge';
import type { Summary } from '../../shared/types';
import { MAX_SCORE, parMs, speedTier } from '../../shared/score';
import { dayToISO } from '../../shared/dates';
import { Board } from '../components/Board';
import { formatDate, formatDuration, useCountUp } from '../components/ui';
import { sfx } from '../lib/audio';
import { translate, useT } from '../lib/i18n';

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
        ? `${translate('Noct archive')} #${summary.day}`
        : translate('Noct practice');
  const grid = summary.rounds.map((r) => tierGlyph(speedTier(r.timeMs, r.size))).join('');
  const streak =
    summary.mode === 'daily' && summary.streak > 0
      ? ` · ${translate('{n}-day streak', { n: summary.streak })}`
      : '';
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
      ? `${translate('BOARD')} ${String(summary.day ?? 1).padStart(3, '0')} · ${summary.day ? dayToISO(summary.day) : ''}`
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
  ctx.fillText(translate(summary.rating), 104, 800);

  ctx.fillStyle = '#8e9aa9';
  ctx.font = '400 34px ui-sans-serif, system-ui, sans-serif';
  const line2 =
    summary.mode === 'daily'
      ? `${translate('{n}-day streak', { n: summary.streak })} · ${translate('{n} boards', { n: summary.rounds.length })} · ${formatDuration(summary.timeMs)}`
      : `${translate('{n} boards', { n: summary.rounds.length })} · ${formatDuration(summary.timeMs)}`;
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
  const t = useT();
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [nightCopied, setNightCopied] = useState(false);
  const [playerName, setPlayerName] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .me()
      .then((me) => {
        if (alive) setPlayerName(me.name);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  const counted = useCountUp(summary?.score ?? 0, 900);

  if (!summary) {
    return (
      <main className="main">
        <div className="wrap" style={{ maxWidth: 520 }}>
          <div className="card stack gap-14">
            <h1 style={{ fontSize: 'var(--step-2)' }}>{t('No result to show')}</h1>
            <p className="par-note">
              {t(
                'Results appear once you finish a board. Play today’s, or open one from the archive.',
              )}
            </p>
            <div className="row gap-10" style={{ flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => navigate('/play')}>
                {t('Play today’s board')}
              </button>
              <button className="btn btn-ghost" onClick={() => navigate('/archive')}>
                {t('Browse the archive')}
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

  async function handleChallenge(): Promise<void> {
    const base = import.meta.env.BASE_URL.replace(/\/+$/, '');
    const link = challengeLink(
      { name: playerName ?? t('A player'), score: summary!.score },
      window.location.origin,
      base,
    );
    const ok = await copyText(t('{name} scored {score}. Beat it: {link}', {
      name: playerName ?? t('A player'),
      score: summary!.score,
      link,
    }));
    setNightCopied(ok);
    if (ok) sfx.tap();
    setTimeout(() => setNightCopied(false), 2400);
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
                {isDaily
                  ? `${t('Board #{n}', { n: String(summary.day ?? 1).padStart(3, '0') })} · ${dateLabel}`
                  : summary.mode === 'archive'
                    ? `${t('Archive #{n}', { n: summary.day ?? 1 })} · ${dateLabel}`
                    : t('Practice run')}
              </div>
              <div className="result-score">
                <span className="score-big">{counted}</span>
                <span className="result-max">/ {summary.maxScore}</span>
              </div>
              <div className="rating-word">{t(summary.rating)}</div>
              <div className="row gap-6" style={{ flexWrap: 'wrap' }}>
                {isDaily ? (
                  <span className={`chip${summary.streak > 0 ? ' chip-ember' : ''}`}>
                    <span className="chip-dot" aria-hidden="true" />
                    {t('{n}-day streak', { n: summary.streak })}
                  </span>
                ) : (
                  <span className="chip">{t('Not counted towards your streak')}</span>
                )}
                {summary.personalBest && isDaily ? (
                  <span className="chip">{t('Personal best')}</span>
                ) : null}
                {summary.hints > 0 ? (
                  <span className="chip">{t('{n} hints', { n: summary.hints })}</span>
                ) : (
                  <span className="chip">{t('No hints')}</span>
                )}
                <span className="chip">{t('{time} total', { time: formatDuration(summary.timeMs) })}</span>
              </div>
            </header>

            <section className="card stack gap-14">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="eyebrow">{t('Your boards')}</span>
                <span className="eyebrow">{t('points · time')}</span>
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
                {t('Fastest board:')}{' '}
                <strong style={{ color: 'var(--text)' }}>{formatDuration(best.timeMs)}</strong>{' '}
                {t('on {size}×{size}. Par is {par}s per board — beat it for the full time bonus.', {
                  size: best.size,
                  par: Math.round(parMs(best.size) / 1000),
                })}
              </p>
            </section>

            {isDaily && summary.global.completed > 0 ? (
              <section className="card stack gap-14">
                <span className="eyebrow">{t('Today, worldwide')}</span>
                <div className="stat-grid">
                  <div className="stat" style={{ border: 0, padding: 0, background: 'transparent' }}>
                    <div className="stat-label">{t('Finished')}</div>
                    <div className="stat-value">{finishedRate}%</div>
                    <div className="stat-note">
                      {t('{done} of {started} players', {
                        done: summary.global.completed,
                        started: summary.global.started,
                      })}
                    </div>
                  </div>
                  <div className="stat" style={{ border: 0, padding: 0, background: 'transparent' }}>
                    <div className="stat-label">{t('Average score')}</div>
                    <div className="stat-value">{summary.global.avgScore}</div>
                    <div className="stat-note">{t('all finished boards')}</div>
                  </div>
                  <div className="stat" style={{ border: 0, padding: 0, background: 'transparent' }}>
                    <div className="stat-label">{t('Your rank')}</div>
                    <div className="stat-value">#{summary.rank ?? '—'}</div>
                    <div className="stat-note">
                      {summary.percentile !== null
                        ? t('top {n}%', { n: summary.percentile })
                        : t('unranked')}
                    </div>
                  </div>
                  <div className="stat" style={{ border: 0, padding: 0, background: 'transparent' }}>
                    <div className="stat-label">{t('Best streak')}</div>
                    <div className="stat-value">{summary.bestStreak}</div>
                    <div className="stat-note">{t('days in a row')}</div>
                  </div>
                </div>
              </section>
            ) : null}

            <section className="card stack gap-14">
              <div className="row" style={{ justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <span className="eyebrow">{t('Solutions')}</span>
                <button className="btn btn-sm btn-ghost" onClick={() => setRevealed((v) => !v)} aria-expanded={revealed}>
                  {revealed ? t('Hide') : t('Reveal the answers')}
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
                          label={t('Solution for board {n}', { n: r.index + 1 })}
                          onToggle={() => undefined}
                          onExclude={() => undefined}
                        />
                      </div>
                      <span className="eyebrow">{t('Board {n}', { n: r.index + 1 })}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="par-note" style={{ margin: 0 }}>
                  {t(
                    'Answers stay hidden while today is live so nobody can spoil it. Reveal only when you have finished.',
                  )}
                </p>
              )}
            </section>
          </div>

          <aside className="stack gap-14">
            <div
              className="card stack gap-14"
              style={{ background: 'linear-gradient(155deg, var(--surface-2), var(--surface))' }}
            >
              <span className="eyebrow">{t('Share card')}</span>
              <div className="stack gap-10" aria-label={t('Shareable result')}>
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
                <div className="share-grid" aria-label={t('Board speed: {grid}', { grid })}>
                  {grid}
                </div>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span>{summary.rating}</span>
                  {isDaily ? <span className="par-note">{t('{n}-day', { n: summary.streak })}</span> : null}
                </div>
              </div>
              <hr className="hairline" />
              <div className="stack gap-10">
                <button className="btn btn-primary btn-block" onClick={() => void handleShare()}>
                  {copied ? t('Copied') : t('Share result')}
                </button>
                <div className="row gap-10">
                  <button className="btn btn-sm btn-ghost" style={{ flex: 1 }} onClick={() => void handleCopy()}>
                    {t('Copy text')}
                  </button>
                  <button className="btn btn-sm btn-ghost" style={{ flex: 1 }} onClick={() => downloadCard(summary)}>
                    {t('Save image')}
                  </button>
                </div>
                <p className="par-note" style={{ fontSize: '0.75rem' }}>
                  {t('The card never shows answers — only your score, speed and streak.')}
                </p>
              </div>
            </div>

            {isDaily ? (
              <div className="card stack gap-10">
                <span className="eyebrow">{t('Send the night')}</span>
                <p className="par-note" style={{ margin: 0 }}>
                  {t(
                    'A link to today’s board with your score on it. Whoever opens it sees the line, not your streak.',
                  )}
                </p>
                <button className="btn btn-sm btn-block" onClick={() => void handleChallenge()}>
                  {nightCopied ? t('Link copied') : t('Copy challenge link')}
                </button>
              </div>
            ) : null}

            <div className="card stack gap-10">
              <span className="eyebrow">{t('Next')}</span>
              <button className="btn btn-block" onClick={() => navigate(isDaily ? '/practice?level=3' : '/play')}>
                {isDaily ? t('Practice another board') : t('Play today’s board')}
              </button>
              <button className="btn btn-sm btn-ghost btn-block" onClick={() => navigate('/leaderboard')}>
                {t('See the standings')}
              </button>
              <button className="btn btn-sm btn-ghost btn-block" onClick={() => navigate('/stats')}>
                {t('Your statistics')}
              </button>
              <button className="btn btn-sm btn-ghost btn-block" onClick={() => navigate('/archive')}>
                {t('Archive')}
              </button>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
