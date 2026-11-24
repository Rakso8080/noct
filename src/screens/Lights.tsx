import { useCallback, useEffect, useMemo, useState } from 'react';
import { dayNumber } from '../../shared/dates';
import { solveLights } from '../lib/lights';
import { hashSeed, mulberry32, shuffled } from '../lib/rng';
import { lightsToday, readGames, recordLights, type GameMode } from '../lib/gamesStore';
import { sfx } from '../lib/audio';
import { haptic } from '../lib/settings';
import { ScreenHead, Segmented } from '../components/ui';
import { useT } from '../lib/i18n';

const SIZE = 5;
const CELLS = SIZE * SIZE;

function neighbours(i: number): number[] {
  const r = Math.floor(i / SIZE);
  const c = i % SIZE;
  const out = [i];
  if (r > 0) out.push(i - SIZE);
  if (r < SIZE - 1) out.push(i + SIZE);
  if (c > 0) out.push(i - 1);
  if (c < SIZE - 1) out.push(i + 1);
  return out;
}

function press(cells: boolean[], i: number): boolean[] {
  const next = cells.slice();
  for (const j of neighbours(i)) next[j] = !next[j];
  return next;
}

function scramble(seed: number): { cells: boolean[]; par: number } {
  const rnd = mulberry32(seed);
  const presses = shuffled(Array.from({ length: CELLS }, (_, i) => i), rnd).slice(0, 9);
  let cells = Array<boolean>(CELLS).fill(false);
  for (const i of presses) cells = press(cells, i);
  if (cells.every((c) => !c)) cells = press(cells, presses[0]);
  /* Par is the shortest solution from this board, not the length of the scramble. */
  return { cells, par: solveLights(cells)?.length ?? presses.length };
}

export function Lights({ navigate }: { navigate: (path: string) => void }) {
  const t = useT();
  const day = dayNumber();
  const [mode, setMode] = useState<GameMode>('daily');

  const initial = useMemo(() => scramble(hashSeed('lights', 'daily', day, 0)), [day]);
  const [cells, setCells] = useState<boolean[]>(initial.cells);
  const [par, setPar] = useState(initial.par);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const [round, setRound] = useState(0);
  const [best, setBest] = useState<number | null>(null);
  const [history, setHistory] = useState<boolean[][]>([]);
  const [hints, setHints] = useState(0);
  const [hintSquare, setHintSquare] = useState<number | null>(null);
  const sky = useMemo(() => {
    const rnd = mulberry32(hashSeed('lights-sky', day));
    return Array.from({ length: CELLS }, () => ({
      x: 3 + rnd() * 94,
      y: 8 + rnd() * 84,
      size: 0.8 + rnd() * 1.5,
    }));
  }, [day]);

  useEffect(() => {
    if (!won) return;
    recordLights(day, moves, mode);
    sfx.complete();
    haptic(24);
  }, [won, day, moves, mode]);

  useEffect(() => {
    const store = readGames().lights;
    setBest(mode === 'daily' ? store.bestMoves : store.bestFree);
  }, [mode, won]);

  const toggle = (i: number) => {
    if (won) return;
    setHistory((h) => [...h, cells]);
    setHintSquare(null);
    const next = press(cells, i);
    setCells(next);
    setMoves((m) => m + 1);
    sfx.place();
    haptic(5);
    if (next.every((c) => !c)) {
      setWon(true);
      sfx.moonrise();
    }
  };

  const undo = () => {
    if (!history.length) return;
    setCells(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
    setMoves((m) => Math.max(0, m - 1));
    setHintSquare(null);
    setWon(false);
    sfx.remove();
    haptic(6);
  };

  /* A hint is one press of the shortest solution, and it says how many are left. */
  const left = useMemo(() => solveLights(cells)?.length ?? null, [cells]);
  const hint = () => {
    const solution = solveLights(cells);
    if (!solution || !solution.length) return;
    setHintSquare(solution[0]);
    setHints((h) => h + 1);
    sfx.hint();
    haptic(6);
  };

  const reset = useCallback(
    (nextMode: GameMode = mode) => {
      const next = scramble(hashSeed('lights', nextMode, day, round + 1));
      setCells(next.cells);
      setPar(next.par);
      setMoves(0);
      setWon(false);
      setHistory([]);
      setHints(0);
      setHintSquare(null);
      setRound((r) => r + 1);
    },
    [mode, day, round],
  );

  const today = lightsToday(day);
  const lit = cells.filter(Boolean).length;
  const dark = CELLS - lit;

  return (
    <main className="main">
      <div className="wrap" style={{ maxWidth: 600 }}>
        <ScreenHead
          eyebrow={t('Lights · Night {n}', { n: String(day).padStart(3, '0') })}
          title={t('The observatory windows')}
        >
          {t(
            'Every press flips its window and the four beside it. Shut them all, and the sky behind them comes through. The daily board is always solvable — the scramble starts from dark.',
          )}
        </ScreenHead>

        <div className="mini-modes">
          <Segmented
            label="Lights mode"
            value={mode}
            options={[
              { value: 'daily', label: 'Daily' },
              { value: 'free', label: 'Free' },
            ]}
            onChange={(value) => {
              setMode(value);
              reset(value);
              sfx.tap();
            }}
          />
          <span className="chess-note">
            {mode === 'daily'
              ? t('The same board for everyone today')
              : t('Fresh scramble every reset')}
          </span>
        </div>

        <div className="mini-hud">
          <span className="chip">
            <span className="mono">{moves}</span> {t('{n} presses', { n: moves })}
          </span>
          <span className="chip">{t('Par {n} presses', { n: par })}</span>
          <span className="chip">
            {t('Shortest left')} <span className="mono">{left ?? '—'}</span>
          </span>
          {hints > 0 ? <span className="chip">{t('Hints {n}', { n: hints })}</span> : null}
          <span className="chip">
            {mode === 'daily'
              ? today
                ? t('Your best today {n}', { n: today.moves })
                : t('Unplayed today')
              : t('Free play')}
          </span>
          <span className="chip">
            {best === null ? t('No best yet') : t('Best {n} presses', { n: best })}
          </span>
          <span className="chip">
            {t('Windows dark')} <span className="mono">{dark}</span> / {CELLS}
          </span>
        </div>

        <div className={`lights-board${won ? ' is-won' : ''}`}>
          <div className={`lights-sky${won ? ' is-full' : ''}`} aria-hidden="true">
            {sky.map((star, i) => (
              <span
                key={i}
                className={`lights-star${i < dark ? ' is-visible' : ''}`}
                style={{ left: `${star.x}%`, top: `${star.y}%`, fontSize: `${star.size * 10}px` }}
              >
                ✦
              </span>
            ))}
            <span className="lights-sky-line" />
          </div>
          <div className="lights-grid" role="group" aria-label={t('Lights-out board, 5 by 5')}>
            {cells.map((on, i) => (
              <button
                key={i}
                type="button"
                className={`lights-cell${on ? ' is-on' : ''}${hintSquare === i ? ' is-hint' : ''}`}
                aria-pressed={on}
                aria-label={t('Square {r}, {c}: {state}{hint}', {
                  r: Math.floor(i / SIZE) + 1,
                  c: (i % SIZE) + 1,
                  state: on ? t('lit') : t('dark'),
                  hint: hintSquare === i ? t(', suggested press') : '',
                })}
                onClick={() => toggle(i)}
              />
            ))}
          </div>
        </div>

        <div className="mini-actions">
          <button className="btn btn-sm" onClick={hint} disabled={won || !left}>
            {t('Hint')}
          </button>
          <button className="btn btn-sm btn-ghost" onClick={undo} disabled={!history.length}>
            {t('Undo')}
          </button>
          <button className="btn btn-sm btn-ghost" onClick={() => reset()}>
            {t('New shuffle')}
          </button>
          <button className="btn btn-sm btn-ghost" onClick={() => navigate('/')}>
            {t('Menu')}
          </button>
        </div>

        {won ? (
          <div className="mini-banner" role="status">
            <strong>
              {t('Dark in {n} presses', { n: moves })}
            </strong>
            <button className="btn btn-sm btn-primary" onClick={() => reset()}>
              {t('Play again')}
            </button>
          </div>
        ) : null}
      </div>
    </main>
  );
}
