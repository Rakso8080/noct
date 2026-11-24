import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { dayNumber } from '../../shared/dates';
import {
  REV_SIZE,
  botMove,
  legalMoves,
  place,
  scores,
  startReversi,
  type Disc,
} from '../lib/reversi';
import { readGames, recordReversi, resetReversi } from '../lib/gamesStore';
import { hashSeed, mulberry32 } from '../lib/rng';
import { sfx } from '../lib/audio';
import { haptic } from '../lib/settings';
import { ScreenHead } from '../components/ui';

const FILES = 'abcdefgh';

function squareName(i: number): string {
  return `${FILES[i % REV_SIZE]}${REV_SIZE - Math.floor(i / REV_SIZE)}`;
}

export function Reversi({ navigate }: { navigate: (path: string) => void }) {
  const day = dayNumber();
  const [board, setBoard] = useState<Disc[]>(startReversi);
  const [turn, setTurn] = useState<Disc>(1);
  const [cursor, setCursor] = useState(27);
  const [moves, setMoves] = useState(0);
  const [over, setOver] = useState(false);
  const [bestMargin, setBestMargin] = useState<number | null>(() => readGames().reversi.bestMargin);
  const [thinking, setThinking] = useState(false);
  const recorded = useRef(false);

  const whiteLegal = useMemo(() => legalMoves(board, 1), [board]);
  const blackLegal = useMemo(() => legalMoves(board, 2), [board]);
  const counts = useMemo(() => scores(board), [board]);

  useEffect(() => {
    setBestMargin(readGames().reversi.bestMargin);
  }, []);

  const finish = useCallback(
    (final: Disc[], finalMoves: number) => {
      setOver(true);
      setThinking(false);
      if (recorded.current) return;
      recorded.current = true;
      const tally = scores(final);
      const margin = tally.white - tally.black;
      recordReversi(margin > 0 ? 'win' : margin < 0 ? 'loss' : 'draw', margin);
      setBestMargin(readGames().reversi.bestMargin);
      if (margin > 0) {
        sfx.moonrise();
        haptic(24);
      } else {
        sfx.tier('lost');
        haptic(12);
      }
      setMoves(finalMoves);
    },
    [],
  );

  /* After your move: black answers, or passes when it has no legal move. */
  useEffect(() => {
    if (over || turn !== 2) return;
    if (!blackLegal.length) {
      if (!whiteLegal.length) {
        finish(board, moves);
      } else {
        setTurn(1);
      }
      return;
    }
    setThinking(true);
    const timer = window.setTimeout(() => {
      const rnd = mulberry32(hashSeed('reversi-bot', day, moves, counts.white + counts.black));
      const pick = botMove(board, 2, rnd);
      if (pick === null) {
        setThinking(false);
        setTurn(1);
        return;
      }
      const next = place(board, pick, 2);
      if (!next) {
        setThinking(false);
        setTurn(1);
        return;
      }
      const nextBoard = next as Disc[];
      setBoard(nextBoard);
      setMoves((m) => m + 1);
      setThinking(false);
      sfx.place();
      haptic(4);
      if (!legalMoves(nextBoard, 1).length) {
        if (!legalMoves(nextBoard, 2).length) finish(nextBoard, moves + 1);
        else setTurn(2);
      } else {
        setTurn(1);
      }
    }, 420);
    return () => {
      clearTimeout(timer);
      setThinking(false);
    };
  }, [board, blackLegal.length, counts.black, counts.white, day, finish, moves, over, turn, whiteLegal.length]);

  const play = useCallback(
    (index: number) => {
      if (over || turn !== 1) return;
      const next = place(board, index, 1);
      if (!next) return;
      const nextBoard = next as Disc[];
      setBoard(nextBoard);
      setMoves((m) => m + 1);
      sfx.place();
      haptic(6);
      if (!legalMoves(nextBoard, 2).length && !legalMoves(nextBoard, 1).length) {
        finish(nextBoard, moves + 1);
      } else {
        setTurn(2);
      }
    },
    [board, finish, moves, over, turn],
  );

  const newGame = useCallback(() => {
    setBoard(startReversi());
    setTurn(1);
    setMoves(0);
    setOver(false);
    setCursor(27);
    recorded.current = false;
    sfx.tap();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key;
      if (key === 'Enter') {
        event.preventDefault();
        if (over) newGame();
        else play(cursor);
        return;
      }
      if (key === 'Escape') {
        event.preventDefault();
        newGame();
        return;
      }
      const deltas: Record<string, number> = {
        ArrowUp: -REV_SIZE,
        ArrowDown: REV_SIZE,
        ArrowLeft: -1,
        ArrowRight: 1,
        w: -REV_SIZE,
        s: REV_SIZE,
        a: -1,
        d: 1,
      };
      const delta = deltas[key];
      if (delta === undefined) return;
      event.preventDefault();
      setCursor((c) => {
        const row = Math.floor(c / REV_SIZE);
        const col = c % REV_SIZE;
        if (delta === -REV_SIZE) return (row + REV_SIZE - 1) % REV_SIZE * REV_SIZE + col;
        if (delta === REV_SIZE) return ((row + 1) % REV_SIZE) * REV_SIZE + col;
        if (delta === -1) return row * REV_SIZE + ((col + REV_SIZE - 1) % REV_SIZE);
        return row * REV_SIZE + ((col + 1) % REV_SIZE);
      });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cursor, newGame, over, play]);

  const margin = counts.white - counts.black;
  const status = over
    ? margin > 0
      ? `You win ${counts.white}–${counts.black}`
      : margin < 0
        ? `The bot wins ${counts.black}–${counts.white}`
        : `Drawn ${counts.white}–${counts.black}`
    : turn === 1
      ? 'Your turn · white'
      : thinking
        ? 'The bot is turning discs'
        : 'The bot passes';

  return (
    <main className="main">
      <div className="wrap" style={{ maxWidth: 640 }}>
        <ScreenHead eyebrow={`Reversi · Night ${String(day).padStart(3, '0')}`} title="The turning table">
          Trap a line of the bot’s discs to turn them white. You are white; the table ends when neither
          side can move, and the most discs wins. Arrows move the cursor, Enter places, Escape starts over.
        </ScreenHead>

        <div className="mini-hud">
          <span className="chip">
            <span className="mono">{counts.white}</span> white
          </span>
          <span className="chip">
            <span className="mono">{counts.black}</span> black
          </span>
          <span className="chip">
            <span className="mono">{moves}</span> moves
          </span>
          <span className="chip">
            {turn === 1 || over ? 'You' : 'Bot'} turn
          </span>
          <span className="chip">{bestMargin === null ? 'No best yet' : `Best margin +${bestMargin}`}</span>
          <span className="chip">{over ? (margin > 0 ? 'Won' : margin < 0 ? 'Lost' : 'Draw') : 'Playing'}</span>
        </div>

        <p className="par-note" aria-live="polite" style={{ margin: '0 0 10px' }}>
          {status}
        </p>

        <div className={`rev-board${over ? ' is-over' : ''}`} role="grid" aria-label="Reversi board, 8 by 8">
          {board.map((disc, i) => {
            const legal = !over && turn === 1 && whiteLegal.includes(i);
            const label = `${squareName(i)}: ${
              disc === 1 ? 'white disc' : disc === 2 ? 'black disc' : legal ? 'legal move' : 'empty'
            }${cursor === i ? ', cursor' : ''}`;
            return (
              <button
                key={i}
                type="button"
                role="gridcell"
                className={`rev-cell${disc === 1 ? ' is-white' : ''}${disc === 2 ? ' is-black' : ''}${
                  legal ? ' is-legal' : ''
                }${cursor === i ? ' is-cursor' : ''}`}
                aria-label={label}
                aria-pressed={false}
                onClick={() => {
                  setCursor(i);
                  play(i);
                }}
              >
                {disc ? <span className="rev-disc" aria-hidden="true" /> : null}
                {legal ? <span className="rev-hint" aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>

        <div className="mini-actions">
          <button className="btn btn-sm" onClick={newGame}>
            New game
          </button>
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => {
              resetReversi();
              setBestMargin(null);
              sfx.remove();
            }}
          >
            Reset best
          </button>
          <button className="btn btn-sm btn-ghost" onClick={() => navigate('/')}>
            Menu
          </button>
        </div>

        {over ? (
          <div className="mini-banner" role="status">
            <strong>{status} · {moves} moves</strong>
            <button className="btn btn-sm btn-primary" onClick={newGame}>
              Play again
            </button>
          </div>
        ) : null}
      </div>
    </main>
  );
}
