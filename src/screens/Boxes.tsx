import { useCallback, useEffect, useRef, useState } from 'react';
import { dayNumber } from '../../shared/dates';
import {
  BOXES_COLS,
  BOXES_DOTS,
  boxesBot,
  boxesHEdge,
  boxesRemaining,
  boxesScore,
  boxesVEdge,
  boxesWinner,
  claimEdge,
  startBoxes,
  type BoxesLevel,
  type BoxesState,
} from '../lib/boxes';
import { boxesToday, readGames, recordBoxes, type GameMode } from '../lib/gamesStore';
import { hashSeed, mulberry32 } from '../lib/rng';
import { sfx } from '../lib/audio';
import { haptic } from '../lib/settings';
import { ScreenHead, Segmented } from '../components/ui';
import { useT } from '../lib/i18n';

type Cell =
  | { kind: 'dot'; row: number; col: number }
  | { kind: 'edge'; edge: number; row: number; col: number; orientation: 'h' | 'v' }
  | { kind: 'box'; box: number };

function boardCells(): Cell[] {
  const cells: Cell[] = [];
  for (let row = 0; row < BOXES_DOTS * 2 - 1; row++) {
    for (let col = 0; col < BOXES_DOTS * 2 - 1; col++) {
      if (row % 2 === 0 && col % 2 === 0) {
        cells.push({ kind: 'dot', row: row / 2, col: col / 2 });
      } else if (row % 2 === 0) {
        const r = row / 2;
        const c = (col - 1) / 2;
        cells.push({ kind: 'edge', edge: boxesHEdge(r, c), row: r, col: c, orientation: 'h' });
      } else if (col % 2 === 0) {
        const r = (row - 1) / 2;
        const c = col / 2;
        cells.push({ kind: 'edge', edge: boxesVEdge(r, c), row: r, col: c, orientation: 'v' });
      } else {
        const r = (row - 1) / 2;
        const c = (col - 1) / 2;
        cells.push({ kind: 'box', box: r * BOXES_COLS + c });
      }
    }
  }
  return cells;
}

const CELLS = boardCells();

export function Boxes({ navigate }: { navigate: (path: string) => void }) {
  const t = useT();
  const day = dayNumber();
  const [mode, setMode] = useState<GameMode>('daily');
  const [level, setLevel] = useState<BoxesLevel>(2);
  const [round, setRound] = useState(0);
  const [state, setState] = useState<BoxesState>(startBoxes);
  const [bestMargin, setBestMargin] = useState<number | null>(() => readGames().boxes.bestMargin);
  const recorded = useRef(false);

  const over = boxesWinner(state);
  const you = boxesScore(state, 1);
  const loom = boxesScore(state, 2);
  const remaining = boxesRemaining(state);
  const today = boxesToday(day);

  useEffect(() => {
    setBestMargin(readGames().boxes.bestMargin);
  }, [over]);

  useEffect(() => {
    if (!over || recorded.current) return;
    recorded.current = true;
    const margin = you - loom;
    recordBoxes(day, over === 'draw' ? 'draw' : over === 1 ? 'win' : 'loss', margin, you, mode);
    setBestMargin(readGames().boxes.bestMargin);
    if (over === 1) {
      sfx.moonrise();
      haptic(24);
    } else if (over === 'draw') {
      sfx.tier('draw');
      haptic(12);
    } else {
      sfx.tier('lost');
      haptic(12);
    }
  }, [day, loom, mode, over, you]);

  const reset = useCallback(() => {
    setState(startBoxes());
    setRound((value) => value + 1);
    recorded.current = false;
    sfx.tap();
  }, []);

  const claim = useCallback(
    (edge: number, byLoom = false) => {
      const result = claimEdge(state, edge);
      if (!result) {
        if (!byLoom) {
          sfx.blocked();
          haptic(4);
        }
        return;
      }
      setState(result.state);
      if (byLoom) {
        sfx.place();
        haptic(5);
      } else if (result.boxes.length) {
        sfx.place();
        haptic(9);
      } else {
        sfx.tap();
        haptic(4);
      }
    },
    [state],
  );

  /* The loom takes a short breath, then answers. A closed box buys it another. */
  useEffect(() => {
    if (over || state.turn !== 2) return;
    const id = window.setTimeout(() => {
      const edge = boxesBot(
        state,
        level,
        mulberry32(hashSeed('boxes', day, level, round, state.edgeOwners.filter(Boolean).length)),
      );
      if (edge !== null) claim(edge, true);
    }, 480);
    return () => window.clearTimeout(id);
  }, [claim, day, level, over, round, state]);

  const status = over
    ? over === 1
      ? t('You win the loom, {you}–{loom}.', { you, loom })
      : over === 2
        ? t('The loom wins this one, {loom}–{you}.', { loom, you })
        : t('A draw at {you}–{loom}. The last thread belongs to neither of you.', { you, loom })
    : state.turn === 2
      ? t('The loom is thinking.')
      : t('Your turn. Draw a line; close a box to keep the turn.');

  const margin = you - loom;

  return (
    <main className="main">
      <div className="wrap" style={{ maxWidth: 700 }}>
        <ScreenHead
          eyebrow={t('Dots & Boxes · Night {n}', { n: String(day).padStart(3, '0') })}
          title={t('The thread loom')}
        >
          {t(
            'Draw one thread between two dots. Close the fourth side of a box to claim it and take another turn. The loom answers in kind; the fuller side of the cloth wins.',
          )}
        </ScreenHead>

        <div className="mini-modes boxes-modes">
          <Segmented
            label={t('Dots & Boxes mode')}
            value={mode}
            options={[
              { value: 'daily', label: 'Daily' },
              { value: 'free', label: 'Free' },
            ]}
            onChange={(value) => {
              setMode(value);
              reset();
            }}
          />
          <Segmented
            label={t('Bot strength')}
            value={String(level) as '1' | '2'}
            options={[
              { value: '1', label: 'Steady' },
              { value: '2', label: 'Sharp' },
            ]}
            onChange={(value) => {
              setLevel(Number(value) as BoxesLevel);
              sfx.tap();
            }}
          />
          <span className="chess-note">
            {mode === 'daily' ? t('The same loom for everyone today') : t('Free play')}
          </span>
        </div>

        <div className="mini-hud">
          <span className="chip">
            <span className="mono">{you}</span> {t('yours')}
          </span>
          <span className="chip">
            <span className="mono">{loom}</span> {t('loom')}
          </span>
          <span className="chip">
            <span className="mono">{remaining}</span> {t('threads left')}
          </span>
          <span className="chip">
            {mode === 'daily'
              ? today
                ? t('Today {n} boxes', { n: today.boxes })
                : t('Unplayed today')
              : t('Free play')}
          </span>
          <span className="chip">
            {bestMargin === null ? t('No best yet') : t('Best +{n}', { n: bestMargin })}
          </span>
          {over ? (
            <span className="chip">
              {t('Final {you}–{loom}', { you, loom })}
            </span>
          ) : null}
        </div>

        <div className={`boxes-board${over ? ' is-over' : ''}`} role="group" aria-label={t('Dots & Boxes board, four by four boxes')}>
          {CELLS.map((cell) => {
            if (cell.kind === 'dot') {
              return <span key={`dot-${cell.row}-${cell.col}`} className="boxes-dot" aria-hidden="true" />;
            }
            if (cell.kind === 'box') {
              const owner = state.owners[cell.box];
              return (
                <span
                  key={`box-${cell.box}`}
                  className={`boxes-box${owner === 1 ? ' is-yours' : owner === 2 ? ' is-loom' : ''}`}
                  aria-hidden="true"
                >
                  {owner === 1 ? '◆' : owner === 2 ? '◇' : ''}
                </span>
              );
            }
            const owner = state.edgeOwners[cell.edge];
            const disabled = owner !== 0 || state.turn !== 1 || Boolean(over);
            return (
              <button
                key={`edge-${cell.edge}`}
                type="button"
                className={`boxes-edge boxes-edge--${cell.orientation}${
                  owner !== 0 ? ' is-drawn' : ''
                }${owner === 1 ? ' is-yours' : owner === 2 ? ' is-loom' : ''}`}
                data-owner={owner}
                disabled={disabled}
                onClick={() => claim(cell.edge)}
                aria-label={
                  cell.orientation === 'h'
                    ? t('Horizontal thread at row {row}, column {col}', { row: cell.row + 1, col: cell.col + 1 })
                    : t('Vertical thread at row {row}, column {col}', { row: cell.row + 1, col: cell.col + 1 })
                }
              />
            );
          })}
        </div>

        <p className="par-note boxes-status" aria-live="polite">
          {status}
        </p>

        <div className="mini-actions">
          <button className="btn btn-sm btn-ghost" onClick={() => reset()}>
            {t('New cloth')}
          </button>
          <button className="btn btn-sm btn-ghost" onClick={() => navigate('/')}>
            {t('Menu')}
          </button>
        </div>

        {over ? (
          <div className="mini-banner" role="status">
            <strong>
              {over === 1
                ? t('You win {you}–{loom} · margin +{margin}', { you, loom, margin })
                : over === 2
                  ? t('The loom wins {loom}–{you}', { loom, you })
                  : t('A draw at {you}–{loom}', { you, loom })}
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
