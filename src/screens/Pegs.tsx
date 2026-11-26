import { useCallback, useMemo, useRef, useState } from 'react';
import { dayNumber } from '../../shared/dates';
import {
  PEG_SIZE,
  newPegs,
  pegApply,
  pegCount,
  pegFinished,
  pegHint,
  pegMoves,
  type PegBoard,
  type PegMove,
} from '../lib/pegs';
import { readGames, recordPegs } from '../lib/gamesStore';
import { sfx } from '../lib/audio';
import { haptic } from '../lib/settings';
import { ScreenHead } from '../components/ui';
import { TableChallengeBanner, TableResultCard } from '../components/TableShare';
import { useT } from '../lib/i18n';
import type { TableChallenge } from '../lib/challenge';

export function Pegs({
  navigate,
  challenge = null,
}: {
  navigate: (path: string) => void;
  challenge?: TableChallenge | null;
}) {
  const t = useT();
  const today = dayNumber();
  const day = challenge?.day ?? today;
  const [board, setBoard] = useState<PegBoard>(() => newPegs());
  const [selected, setSelected] = useState<number | null>(null);
  const [hintTo, setHintTo] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [history, setHistory] = useState<PegBoard[]>([]);
  const [over, setOver] = useState(false);
  const recorded = useRef(false);
  const [record, setRecord] = useState(() => readGames().pegs);

  const movesFrom = useMemo(
    () => (selected === null ? [] : pegMoves(board).filter((move) => move.from === selected)),
    [board, selected],
  );
  const pegTotal = pegCount(board);

  const finish = useCallback(
    (next: PegBoard, plies: number) => {
      setOver(true);
      setSelected(null);
      setHintTo(null);
      if (recorded.current) return;
      recorded.current = true;
      const left = pegCount(next);
      const mode = challenge && challenge.day !== today ? 'free' : 'daily';
      recordPegs(day, left, plies, left === 1, mode);
      setRecord(readGames().pegs);
      if (left === 1) {
        sfx.moonrise();
        haptic(24);
      } else {
        sfx.tier('done');
        haptic(10);
      }
    },
    [challenge, day, today],
  );

  const apply = useCallback(
    (move: PegMove) => {
      const next = pegApply(board, move);
      const nextMoves = moves + 1;
      setHistory((items) => [...items, board]);
      setBoard(next);
      setMoves(nextMoves);
      setSelected(null);
      setHintTo(null);
      sfx.place();
      haptic(5);
      if (pegFinished(next)) finish(next, nextMoves);
    },
    [board, finish, moves],
  );

  function click(cell: number) {
    if (over) return;
    if (board[cell] === 1) {
      setSelected(cell === selected ? null : cell);
      setHintTo(null);
      sfx.tap();
      return;
    }
    const move = movesFrom.find((candidate) => candidate.to === cell);
    if (move) apply(move);
  }

  function undo() {
    if (over || history.length === 0) return;
    const previous = history[history.length - 1];
    setBoard(previous);
    setHistory((items) => items.slice(0, -1));
    setMoves((value) => Math.max(0, value - 1));
    setSelected(null);
    setHintTo(null);
    sfx.tap();
  }

  function restart() {
    setBoard(newPegs());
    setSelected(null);
    setHintTo(null);
    setMoves(0);
    setHistory([]);
    setOver(false);
    recorded.current = false;
    sfx.tap();
  }

  function hint() {
    if (over) return;
    const move = pegHint(board);
    if (!move) return;
    setSelected(move.from);
    setHintTo(move.to);
    sfx.tap();
  }

  const status = over
    ? pegTotal === 1
      ? t('One peg left. The hermit would approve.')
      : t('No more jumps. {n} pegs remain.', { n: pegTotal })
    : selected === null
      ? t('Choose a peg, then an empty hole two steps away.')
      : t('{n} jumps open from this peg.', { n: movesFrom.length });

  return (
    <main className="main">
      <div className="wrap" style={{ maxWidth: 680 }}>
        <ScreenHead
          eyebrow={t('Peg solitaire · Night {n}', { n: String(day).padStart(3, '0') })}
          title={t('The hermit’s cross')}
        >
          {t(
            'A jump takes one peg over its neighbour and into an empty hole, removing the jumped peg. Clear the cross down to a single peg. The centre starts empty; the rest is patience.',
          )}
        </ScreenHead>

        <TableChallengeBanner challenge={challenge} />

        <div className="mini-hud">
          <span className="chip">
            {pegTotal === 1 ? (
              t('1 peg left')
            ) : (
              <>
                <span className="mono">{pegTotal}</span> {t('pegs left')}
              </>
            )}
          </span>
          <span className="chip">
            <span className="mono">{moves}</span> {t('jumps')}
          </span>
          <span className="chip">
            {record.bestPegs === null
              ? t('No best yet')
              : record.bestPegs === 1
                ? t('Best 1 peg')
                : t('Best {n} pegs', { n: record.bestPegs })}
          </span>
          <span className="chip">
            {record.wins === 1 ? (
              t('1 perfect cross')
            ) : (
              <>
                <span className="mono">{record.wins}</span> {t('perfect crosses')}
              </>
            )}
          </span>
        </div>

        <p className="par-note" aria-live="polite" style={{ margin: '0 0 12px' }}>
          {status}
        </p>

        <div className="pegs-board" role="group" aria-label={t('Peg solitaire cross')}>
          {Array.from({ length: PEG_SIZE * PEG_SIZE }, (_, cell) => {
            const valid = board[cell] !== -1;
            if (!valid) return <span key={cell} className="pegs-hole pegs-hole--stone" aria-hidden="true" />;
            const peg = board[cell] === 1;
            const isSelected = selected === cell;
            const isHint = hintTo === cell;
            const target = movesFrom.some((move) => move.to === cell);
            const row = Math.floor(cell / PEG_SIZE) + 1;
            const col = (cell % PEG_SIZE) + 1;
            return (
              <button
                key={cell}
                type="button"
                className="pegs-hole"
                data-peg={peg ? 'true' : 'false'}
                data-selected={isSelected ? 'true' : 'false'}
                data-target={target ? 'true' : 'false'}
                data-hint={isHint ? 'true' : 'false'}
                disabled={over}
                aria-label={t(peg ? 'Peg at row {row}, column {col}' : 'Empty hole at row {row}, column {col}', {
                  row,
                  col,
                })}
                onClick={() => click(cell)}
              >
                {peg ? <span aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>

        {over ? (
          <TableResultCard
            run={{ game: 'pegs', day, pegs: pegTotal, moves }}
            board={board}
            challenge={challenge}
          />
        ) : null}

        <div className="row gap-10" style={{ flexWrap: 'wrap', marginTop: 16 }}>
          <button type="button" className="btn btn-primary" onClick={restart}>
            {t('New board')}
          </button>
          <button type="button" className="btn btn-ghost" onClick={undo} disabled={over || history.length === 0}>
            {t('Undo')}
          </button>
          <button type="button" className="btn btn-ghost" onClick={hint} disabled={over}>
            {t('Hint')}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/arcade')}>
            {t('Back to the arcade')}
          </button>
        </div>
        <p className="par-note" style={{ marginTop: 12 }}>
          {t('The hermit keeps only your best cross in this browser.')}
        </p>
      </div>
    </main>
  );
}
