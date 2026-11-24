import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { dayNumber } from '../../shared/dates';
import { hashSeed, mulberry32, shuffled } from '../lib/rng';
import { minesToday, readGames, recordMines, type GameMode } from '../lib/gamesStore';
import { sfx } from '../lib/audio';
import { haptic } from '../lib/settings';
import { ScreenHead, Segmented } from '../components/ui';
import { useT } from '../lib/i18n';

const SIZE = 9;
const MINES = 10;
const EMPTY = SIZE * SIZE - MINES;

interface Cell {
  mine: boolean;
  open: boolean;
  flag: boolean;
  near: number;
}

type Status = 'ready' | 'playing' | 'won' | 'lost';

function blank(): Cell[] {
  return Array.from({ length: SIZE * SIZE }, () => ({ mine: false, open: false, flag: false, near: 0 }));
}

function around(i: number): number[] {
  const r = Math.floor(i / SIZE);
  const c = i % SIZE;
  const out: number[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const rr = r + dr;
      const cc = c + dc;
      if (rr < 0 || rr >= SIZE || cc < 0 || cc >= SIZE) continue;
      out.push(rr * SIZE + cc);
    }
  }
  return out;
}

function seedMines(cells: Cell[], safe: number, seed: number): void {
  const rnd = mulberry32(seed);
  const banned = new Set([safe, ...around(safe)]);
  const pool = shuffled(
    Array.from({ length: SIZE * SIZE }, (_, i) => i).filter((i) => !banned.has(i)),
    rnd,
  );
  for (const i of pool.slice(0, MINES)) cells[i].mine = true;
  for (let i = 0; i < cells.length; i++) {
    cells[i].near = around(i).filter((j) => cells[j].mine).length;
  }
}

function floodOpen(cells: Cell[], start: number): void {
  const stack = [start];
  while (stack.length) {
    const i = stack.pop()!;
    const cell = cells[i];
    if (cell.open || cell.flag) continue;
    cell.open = true;
    if (cell.near === 0 && !cell.mine) {
      for (const j of around(i)) if (!cells[j].open) stack.push(j);
    }
  }
}

export function Mines({ navigate }: { navigate: (path: string) => void }) {
  const t = useT();
  const day = dayNumber();
  const [mode, setMode] = useState<GameMode>('daily');
  const seed = useMemo(() => hashSeed('mines', mode, day), [mode, day]);

  const [cells, setCells] = useState<Cell[]>(blank);
  const [status, setStatus] = useState<Status>('ready');
  const [flagMode, setFlagMode] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [round, setRound] = useState(0);
  const [best, setBest] = useState<number | null>(null);
  const [cascade, setCascade] = useState<number | null>(null);
  const [history, setHistory] = useState<{ cells: Cell[]; status: Status; startedAt: number | null }[]>([]);
  const cascadeTimer = useRef<number | null>(null);

  const pressTimer = useRef<number | null>(null);
  const suppressClick = useRef(false);

  useEffect(() => {
    if (status !== 'playing' || startedAt === null) return;
    const id = setInterval(() => setElapsed(Date.now() - startedAt), 120);
    return () => clearInterval(id);
  }, [status, startedAt]);

  useEffect(() => {
    if (status !== 'won' && status !== 'lost') return;
    recordMines(day, status === 'won', elapsed, mode);
    if (status === 'won') {
      sfx.complete();
      haptic(24);
    } else {
      sfx.tier('lost');
      haptic(12);
    }
  }, [status, day, elapsed, mode]);

  useEffect(() => {
    const store = readGames().mines;
    setBest(mode === 'daily' ? store.best[String(day)] ?? null : store.bestFree);
  }, [mode, day, status]);

  const reset = useCallback(() => {
    setCells(blank());
    setStatus('ready');
    setFlagMode(false);
    setStartedAt(null);
    setElapsed(0);
    setHistory([]);
    setRound((r) => r + 1);
  }, []);

  const remember = useCallback(() => {
    setHistory((h) => [...h.slice(-40), { cells, status, startedAt }]);
  }, [cells, status, startedAt]);

  const toggleFlag = useCallback(
    (i: number) => {
      if (cells[i].open) return;
      remember();
      setCells((prev) => {
        if (prev[i].open) return prev;
        const next = prev.map((c) => ({ ...c }));
        next[i].flag = !next[i].flag;
        return next;
      });
      sfx.tap();
      haptic(5);
    },
    [cells, remember],
  );

  const undo = useCallback(() => {
    setHistory((h) => {
      if (!h.length) return h;
      const last = h[h.length - 1];
      setCells(last.cells.map((c) => ({ ...c })));
      setStatus(last.status);
      setStartedAt(last.startedAt);
      sfx.remove();
      haptic(6);
      return h.slice(0, -1);
    });
  }, []);

  const dig = useCallback(
    (i: number) => {
      if (status === 'won' || status === 'lost') return;
      if (flagMode) {
        toggleFlag(i);
        return;
      }
      const next = cells.map((c) => ({ ...c }));
      if (next[i].open || next[i].flag) return;
      remember();

      if (status === 'ready') {
        seedMines(next, i, seed + round * 7919);
        setStartedAt(Date.now());
        setStatus('playing');
      }

      if (next[i].mine) {
        for (const c of next) if (c.mine) c.open = true;
        next[i].open = true;
        setCells(next);
        setStatus('lost');
        sfx.balloonPop();
        return;
      }

      floodOpen(next, i);
      const opened = next.filter((c) => c.open).length;
      const fresh = opened - cells.filter((c) => c.open).length;
      if (fresh > 1) {
        setCascade(fresh);
        if (cascadeTimer.current !== null) clearTimeout(cascadeTimer.current);
        cascadeTimer.current = window.setTimeout(() => setCascade(null), 1400);
      }
      setCells(next);
      if (opened === EMPTY) {
        setStatus('won');
        setElapsed(startedAt === null ? 0 : Date.now() - startedAt);
      } else {
        sfx.place();
        haptic(4);
      }
    },
    [cells, status, flagMode, toggleFlag, seed, round, startedAt, remember],
  );

  /* Classic chording: a number whose flags are all planted opens its neighbours. */
  const chord = useCallback(
    (i: number) => {
      if (status !== 'playing') return;
      const cell = cells[i];
      if (!cell.open || cell.mine || cell.near === 0) return;
      const ring = around(i);
      if (ring.filter((j) => cells[j].flag).length !== cell.near) return;
      const targets = ring.filter((j) => !cells[j].open && !cells[j].flag);
      if (!targets.length) return;
      remember();
      const next = cells.map((c) => ({ ...c }));
      let hitMine = false;
      for (const j of targets) {
        if (next[j].mine) {
          hitMine = true;
          for (const c of next) if (c.mine) c.open = true;
          next[j].open = true;
          break;
        }
        floodOpen(next, j);
      }
      setCells(next);
      if (hitMine) {
        setStatus('lost');
        sfx.balloonPop();
        return;
      }
      if (next.every((c) => c.open || c.mine)) {
        setStatus('won');
        setElapsed(startedAt === null ? 0 : Date.now() - startedAt);
        return;
      }
      sfx.place();
      haptic(4);
    },
    [cells, status, startedAt, remember],
  );

  const onPointerDown = (i: number) => {
    suppressClick.current = false;
    if (status === 'won' || status === 'lost') return;
    pressTimer.current = window.setTimeout(() => {
      suppressClick.current = true;
      toggleFlag(i);
    }, 430);
  };

  const clearPress = () => {
    if (pressTimer.current !== null) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const flags = cells.filter((c) => c.flag).length;
  const opened = cells.filter((c) => c.open && !c.mine).length;
  const today = minesToday(day);
  const seconds = Math.floor(elapsed / 1000);

  return (
    <main className="main">
      <div className="wrap" style={{ maxWidth: 640 }}>
        <ScreenHead
          eyebrow={t('Mines · Night {n}', { n: String(day).padStart(3, '0') })}
          title={t('The buried sky')}
        >
          {t(
            'Ten fallen stars are buried under the field. Clear every other square; the first tap is always safe, so a blind start never costs you. Long-press (or right-click) plants a lantern.',
          )}
        </ScreenHead>

        <div className="mini-modes">
          <Segmented
            label="Mines mode"
            value={mode}
            options={[
              { value: 'daily', label: 'Daily' },
              { value: 'free', label: 'Free' },
            ]}
            onChange={(value) => {
              setMode(value);
              reset();
              sfx.tap();
            }}
          />
          <span className="chess-note">
            {mode === 'daily'
              ? t('The same board for everyone today')
              : t('Fresh board every reset')}
          </span>
        </div>

        <div className="mini-hud">
          <span className="chip">
            <span className="mono">{String(MINES - flags).padStart(2, '0')}</span>{' '}
            {t('stars unmarked')}
          </span>
          <span className="chip">
            <span className="mono">{String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</span>
          </span>
          <span className="chip">
            {mode === 'daily'
              ? today
                ? today.won
                  ? t('Today {n}s', { n: (today.ms / 1000).toFixed(1) })
                  : t('Today lost')
                : t('Unplayed today')
              : t('Free play')}
          </span>
          <span className="chip">
            {best === null ? t('No best yet') : t('Best {n}s', { n: (best / 1000).toFixed(1) })}
          </span>
          <span className="chip">
            {t('Cleared')} <span className="mono">{opened}</span> / {EMPTY}
          </span>
          {cascade ? (
            <span className="chip is-flash">{t('Cascade +{n}', { n: cascade })}</span>
          ) : null}
        </div>

        <div className="mines-progress" aria-hidden="true">
          <span style={{ width: `${(opened / EMPTY) * 100}%` }} />
        </div>

        <div className={`mines-board${status === 'lost' ? ' is-lost' : ''}${status === 'won' ? ' is-won' : ''}`}>
          <div className="mines-grid" role="group" aria-label={t('Minesweeper board, 9 by 9')}>
            {cells.map((cell, i) => {
              const label = cell.open
                ? cell.mine
                  ? 'mine'
                  : `${cell.near} nearby`
                : cell.flag
                  ? 'flagged'
                  : 'hidden';
              return (
                <button
                  key={i}
                  type="button"
                  className={[
                    'mines-cell',
                    cell.open ? 'is-open' : '',
                    cell.flag ? 'is-flag' : '',
                    cell.open && cell.mine ? 'is-mine' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  data-n={cell.open && !cell.mine ? cell.near : undefined}
                  aria-label={t('Row {r}, column {c}: {state}', {
                    r: Math.floor(i / SIZE) + 1,
                    c: (i % SIZE) + 1,
                    state:
                      label === 'mine'
                        ? t('mine')
                        : label === 'flagged'
                          ? t('flagged')
                          : label === 'hidden'
                            ? t('hidden')
                            : t('{n} nearby', { n: cell.near }),
                  })}
                  onClick={() => {
                    if (suppressClick.current) {
                      suppressClick.current = false;
                      return;
                    }
                    if (cell.open) chord(i);
                    else dig(i);
                  }}
                  onPointerDown={() => onPointerDown(i)}
                  onPointerUp={clearPress}
                  onPointerLeave={clearPress}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (status !== 'won' && status !== 'lost') toggleFlag(i);
                  }}
                >
                  {cell.open ? (cell.mine ? '✸' : cell.near || '') : cell.flag ? '⚑' : ''}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mini-actions">
          <button
            className={`btn btn-sm${flagMode ? ' btn-primary' : ' btn-ghost'}`}
            aria-pressed={flagMode}
            onClick={() => {
              setFlagMode((f) => !f);
              sfx.tap();
            }}
          >
            {flagMode ? t('Flagging') : t('Flag mode')}
          </button>
          <button className="btn btn-sm btn-ghost" onClick={undo} disabled={!history.length}>
            {t('Undo')}
          </button>
          <button className="btn btn-sm btn-ghost" onClick={reset}>
            {t('New board')}
          </button>
          <button className="btn btn-sm btn-ghost" onClick={() => navigate('/')}>
            {t('Menu')}
          </button>
        </div>

        {status === 'won' || status === 'lost' ? (
          <div className="mini-banner" role="status">
            <strong>
              {status === 'won'
                ? t('Cleared in {n}s', { n: (elapsed / 1000).toFixed(1) })
                : t('A mine. Try again.')}
            </strong>
            <button className="btn btn-sm btn-primary" onClick={reset}>
              {t('Play again')}
            </button>
          </div>
        ) : null}
      </div>
    </main>
  );
}
