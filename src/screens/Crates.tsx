import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { dayNumber } from '../../shared/dates';
import {
  crateSolved,
  crateTargetsLeft,
  crateMove,
  dailyCrate,
  freeCrate,
  loadCrateLevel,
  nextFreeCrate,
  type CrateLevel,
  type CrateState,
} from '../lib/crates';
import { cratesToday, readGames, recordCrates, type GameMode } from '../lib/gamesStore';
import { sfx } from '../lib/audio';
import { haptic } from '../lib/settings';
import { ScreenHead, Segmented } from '../components/ui';
import { useT } from '../lib/i18n';

const DIRS: Record<string, [number, number]> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  w: [0, -1],
  s: [0, 1],
  a: [-1, 0],
  d: [1, 0],
};

function levelFor(mode: GameMode, day: number, round: number): CrateLevel {
  return mode === 'daily' ? dailyCrate(day) : freeCrate(day, round);
}

function cellLabel(t: (key: string, vars?: Record<string, string | number>) => string, wall: boolean, target: boolean, crate: boolean, player: boolean): string {
  if (player) return t('you');
  if (crate && target) return t('crate on a mark');
  if (crate) return t('crate');
  if (target) return t('chalk mark');
  if (wall) return t('wall');
  return t('floor');
}

export function Crates({ navigate }: { navigate: (path: string) => void }) {
  const t = useT();
  const day = dayNumber();
  const [mode, setMode] = useState<GameMode>('daily');
  const [round, setRound] = useState(0);
  const [level, setLevel] = useState<CrateLevel>(() => dailyCrate(day));
  const [state, setState] = useState<CrateState>(() => loadCrateLevel(dailyCrate(day)));
  const [history, setHistory] = useState<CrateState[]>([]);
  const [bestMoves, setBestMoves] = useState<number | null>(null);
  const [bestFreeMoves, setBestFreeMoves] = useState<number | null>(null);
  const recorded = useRef(false);

  const won = crateSolved(state);
  const left = crateTargetsLeft(state);
  const today = cratesToday(day);

  useEffect(() => {
    const store = readGames().crates;
    setBestMoves(store.bestMoves);
    setBestFreeMoves(store.bestFreeMoves);
  }, [mode, won]);

  useEffect(() => {
    if (!won || recorded.current) return;
    recorded.current = true;
    recordCrates(day, state.moves, state.pushes, mode);
    setBestMoves(readGames().crates.bestMoves);
    setBestFreeMoves(readGames().crates.bestFreeMoves);
    sfx.moonrise();
    haptic(24);
  }, [day, mode, state.moves, state.pushes, won]);

  const restart = useCallback(() => {
    setState(loadCrateLevel(level));
    setHistory([]);
    recorded.current = false;
    sfx.tap();
  }, [level]);

  const reset = useCallback(
    (nextMode: GameMode = mode) => {
      let nextRound = round + 1;
      let nextLevel = levelFor(nextMode, day, nextRound);
      if (nextMode === 'free') {
        /* Free play should never open on the daily yard. */
        const choice = nextFreeCrate(day, nextRound, dailyCrate(day).id);
        nextRound = choice.round;
        nextLevel = choice.level;
      }
      setLevel(nextLevel);
      setState(loadCrateLevel(nextLevel));
      setRound(nextRound);
      setHistory([]);
      recorded.current = false;
      sfx.tap();
    },
    [day, mode, round],
  );

  const move = useCallback(
    (dx: number, dy: number) => {
      if (won) return;
      const result = crateMove(state, dx, dy);
      if (!result.moved) {
        sfx.blocked();
        haptic(4);
        return;
      }
      setHistory((h) => [...h, state]);
      setState(result.state);
      if (crateSolved(result.state)) {
        sfx.moonrise();
        haptic(20);
      } else if (result.pushed) {
        sfx.place();
        haptic(6);
      } else {
        sfx.tap();
        haptic(3);
      }
    },
    [state, won],
  );

  const undo = useCallback(() => {
    if (!history.length) return;
    const previous = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setState(previous);
    if (won) recorded.current = false;
    sfx.remove();
    haptic(5);
  }, [history, won]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
      ) {
        return;
      }
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if (key === 'z') {
        event.preventDefault();
        undo();
        return;
      }
      if (key === 'r') {
        event.preventDefault();
        restart();
        return;
      }
      const dir = DIRS[key];
      if (!dir) return;
      event.preventDefault();
      move(dir[0], dir[1]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move, restart, undo]);

  const cells = useMemo(() => {
    const crateSet = new Set(state.crates);
    return Array.from({ length: state.width * state.height }, (_, index) => ({
      index,
      wall: state.walls[index],
      target: state.targets[index],
      crate: crateSet.has(index),
      player: state.player === index,
    }));
  }, [state]);

  const best = mode === 'daily' ? bestMoves : bestFreeMoves;
  const status = won
    ? t('Yard cleared in {moves} moves and {pushes} pushes.', {
        moves: state.moves,
        pushes: state.pushes,
      })
    : t('{n} marks still waiting. Arrow keys or WASD move; Z undoes.', { n: left });

  return (
    <main className="main">
      <div className="wrap" style={{ maxWidth: 680 }}>
        <ScreenHead
          eyebrow={t('Crates · Night {n}', { n: String(day).padStart(3, '0') })}
          title={t('The crate yard')}
        >
          {t(
            'Push every crate onto a chalk mark. You can walk around freely, but you can only push, never pull. Undo is free; the daily yard is the same for everyone.',
          )}
        </ScreenHead>

        <div className="mini-modes">
          <Segmented
            label={t('Crates mode')}
            value={mode}
            options={[
              { value: 'daily', label: 'Daily' },
              { value: 'free', label: 'Free' },
            ]}
            onChange={(value) => {
              setMode(value);
              reset(value);
            }}
          />
          <span className="chess-note">
            {mode === 'daily'
              ? t('The same yard for everyone today')
              : t('A fresh yard every restart')}
          </span>
        </div>

        <div className="mini-hud">
          <span className="chip">
            <span className="mono">{state.moves}</span> {t('moves')}
          </span>
          <span className="chip">
            <span className="mono">{state.pushes}</span> {t('pushes')}
          </span>
          <span className="chip">
            <span className="mono">{left}</span> {t('marks left')}
          </span>
          <span className="chip">
            {mode === 'daily'
              ? today
                ? t('Best today {n} moves', { n: today.moves })
                : t('Unplayed today')
              : t('Free play')}
          </span>
          <span className="chip">
            {best === null ? t('No best yet') : t('Best {n} moves', { n: best })}
          </span>
          <span className="chip">{t('Yard {n}', { n: level.id.slice(-2) })}</span>
        </div>

        <div className={`crates-board${won ? ' is-won' : ''}`} role="grid" aria-label={t('Crate yard, 7 by 7')}>
          {cells.map((cell) => (
            <span
              key={cell.index}
              className={`crates-cell${cell.wall ? ' is-wall' : ''}${cell.target ? ' is-target' : ''}${
                cell.crate ? ' is-crate' : ''
              }${cell.player ? ' is-player' : ''}`}
              role="gridcell"
              aria-label={cellLabel(t, cell.wall, cell.target, cell.crate, cell.player)}
            >
              {cell.target ? <i className="crates-target" aria-hidden="true" /> : null}
              {cell.crate ? <span className="crates-crate" aria-hidden="true" /> : null}
              {cell.player ? <span className="crates-player" aria-hidden="true" /> : null}
            </span>
          ))}
        </div>

        <div className="crates-pad" aria-label={t('Move the crate keeper')}>
          <span />
          <button className="crates-pad-button" type="button" onClick={() => move(0, -1)} aria-label={t('Move up')}>
            ↑
          </button>
          <span />
          <button className="crates-pad-button" type="button" onClick={() => move(-1, 0)} aria-label={t('Move left')}>
            ←
          </button>
          <button className="crates-pad-button" type="button" onClick={() => move(0, 1)} aria-label={t('Move down')}>
            ↓
          </button>
          <button className="crates-pad-button" type="button" onClick={() => move(1, 0)} aria-label={t('Move right')}>
            →
          </button>
        </div>

        <p className="par-note crates-status" aria-live="polite">
          {status}
        </p>

        <div className="mini-actions">
          <button className="btn btn-sm btn-ghost" onClick={undo} disabled={!history.length || won}>
            {t('Undo')}
          </button>
          <button className="btn btn-sm btn-ghost" onClick={restart}>
            {t('Restart')}
          </button>
          {mode === 'free' ? (
            <button className="btn btn-sm btn-ghost" onClick={() => reset()}>
              {t('Next yard')}
            </button>
          ) : null}
          <button className="btn btn-sm btn-ghost" onClick={() => navigate('/')}>
            {t('Menu')}
          </button>
        </div>

        {won ? (
          <div className="mini-banner" role="status">
            <strong>
              {t('Yard cleared in {moves} moves and {pushes} pushes.', {
                moves: state.moves,
                pushes: state.pushes,
              })}
            </strong>
            <button className="btn btn-sm btn-primary" onClick={() => reset()}>
              {mode === 'free' ? t('Next yard') : t('Play again')}
            </button>
          </div>
        ) : null}
      </div>
    </main>
  );
}
