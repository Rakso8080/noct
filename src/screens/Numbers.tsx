import { useCallback, useEffect, useRef, useState } from 'react';
import { dayNumber } from '../../shared/dates';
import {
  NUM_GOAL,
  NUM_SIZE,
  canMove,
  maxTile,
  slide,
  spawn,
  startBoard,
  type NumDir,
} from '../lib/g2048';
import { readGames, recordNumbers, resetNumbers } from '../lib/gamesStore';
import { hashSeed, mulberry32 } from '../lib/rng';
import { sfx } from '../lib/audio';
import { haptic } from '../lib/settings';
import { ScreenHead } from '../components/ui';

const KEY_DIR: Record<string, NumDir> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  a: 'left',
  s: 'down',
  d: 'right',
  W: 'up',
  A: 'left',
  S: 'down',
  D: 'right',
};

type Phase = 'playing' | 'won' | 'lost';

export function Numbers({ navigate }: { navigate: (path: string) => void }) {
  const day = dayNumber();
  const [round, setRound] = useState(0);
  const [board, setBoard] = useState<number[]>(() => startBoard(mulberry32(hashSeed('numbers', day, 0))));
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [phase, setPhase] = useState<Phase>('playing');
  const [best, setBest] = useState<number | null>(() => readGames().numbers.bestScore);
  const [bestTile, setBestTile] = useState<number | null>(() => readGames().numbers.bestTile);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const recorded = useRef(false);

  useEffect(() => {
    if (startedAt === null || phase !== 'playing') return;
    const id = setInterval(() => setElapsed(Date.now() - startedAt), 500);
    return () => clearInterval(id);
  }, [startedAt, phase]);

  useEffect(() => {
    const store = readGames().numbers;
    setBest(store.bestScore);
    setBestTile(store.bestTile);
  }, [round]);

  useEffect(() => {
    if (phase === 'playing' || recorded.current) return;
    recorded.current = true;
    recordNumbers(score, maxTile(board), phase === 'won');
    const store = readGames().numbers;
    setBest(store.bestScore);
    setBestTile(store.bestTile);
    if (phase === 'won') {
      sfx.moonrise();
      haptic(24);
    } else {
      sfx.blocked();
      haptic(12);
    }
  }, [phase, score, board]);

  const reset = useCallback(() => {
    const nextRound = round + 1;
    setRound(nextRound);
    setBoard(startBoard(mulberry32(hashSeed('numbers', day, nextRound))));
    setScore(0);
    setMoves(0);
    setPhase('playing');
    setStartedAt(null);
    setElapsed(0);
    recorded.current = false;
    sfx.tap();
  }, [day, round]);

  const move = useCallback(
    (dir: NumDir) => {
      setBoard((current) => {
        const result = slide(current, dir);
        if (!result.moved) return current;
        const withTile = spawn(result.board, mulberry32(hashSeed('numbers-spawn', day, round, moves + 1, result.gained)));
        setScore((s) => s + result.gained);
        setMoves((m) => m + 1);
        setStartedAt((start) => start ?? Date.now());
        if (maxTile(withTile) >= NUM_GOAL) {
          setPhase((p) => (p === 'playing' ? 'won' : p));
          sfx.moonrise();
        } else if (!canMove(withTile)) {
          setPhase('lost');
          sfx.blocked();
        } else {
          sfx.tap();
        }
        haptic(4);
        return withTile;
      });
    },
    [day, moves, round],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === 'Enter' && phase !== 'playing') {
        event.preventDefault();
        reset();
        return;
      }
      const dir = KEY_DIR[event.key];
      if (!dir) return;
      event.preventDefault();
      if (phase !== 'playing') return;
      move(dir);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move, phase, reset]);

  const max = maxTile(board);
  const seconds = Math.floor(elapsed / 1000);
  const status =
    phase === 'won'
      ? `A ${NUM_GOAL} lantern is lit`
      : phase === 'lost'
        ? 'The room is full and nothing doubles'
        : `Next goal ${Math.min(NUM_GOAL, Math.max(4, max * 2))}`;

  return (
    <main className="main">
      <div className="wrap" style={{ maxWidth: 600 }}>
        <ScreenHead eyebrow={`2048 · Night ${String(day).padStart(3, '0')}`} title="The doubling room">
          Slide every lantern; equal neighbours fuse into the next power. The room is lit at a{' '}
          {NUM_GOAL} tile, and the night ends when nothing can move. Arrows, WASD or the pad below.
        </ScreenHead>

        <div className="mini-hud">
          <span className="chip">
            <span className="mono">{score}</span> points
          </span>
          <span className="chip">
            <span className="mono">{moves}</span> moves
          </span>
          <span className="chip">Max {max}</span>
          <span className="chip">
            <span className="mono">
              {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
            </span>
          </span>
          <span className="chip">{best === null ? 'No best yet' : `Best ${best}`}</span>
          <span className="chip">{bestTile === null ? 'Best tile —' : `Best tile ${bestTile}`}</span>
        </div>

        <p className="par-note" aria-live="polite" style={{ margin: '0 0 10px' }}>
          {status}
        </p>

        <div
          className={`num-grid${phase === 'won' ? ' is-won' : ''}${phase === 'lost' ? ' is-lost' : ''}`}
          role="grid"
          aria-label={`2048 board, 4 by 4. ${score} points, ${moves} moves, largest tile ${max}.`}
        >
          {board.map((value, i) => (
            <div
              key={i}
              className={`num-cell${value ? ` num-${Math.min(value, 2048)}` : ''}`}
              aria-label={`Row ${Math.floor(i / NUM_SIZE) + 1}, column ${(i % NUM_SIZE) + 1}: ${value || 'empty'}`}
            >
              {value || ''}
            </div>
          ))}
        </div>

        <div className="snake-pad" role="group" aria-label="Slide the room">
          <button type="button" className="btn btn-sm btn-ghost" aria-label="Slide up" onClick={() => move('up')}>
            ↑
          </button>
          <div className="row gap-6">
            <button type="button" className="btn btn-sm btn-ghost" aria-label="Slide left" onClick={() => move('left')}>
              ←
            </button>
            <button type="button" className="btn btn-sm btn-ghost" aria-label="Slide down" onClick={() => move('down')}>
              ↓
            </button>
            <button type="button" className="btn btn-sm btn-ghost" aria-label="Slide right" onClick={() => move('right')}>
              →
            </button>
          </div>
        </div>

        <div className="mini-actions">
          <button className="btn btn-sm" onClick={reset}>
            New room
          </button>
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => {
              resetNumbers();
              setBest(null);
              setBestTile(null);
              sfx.remove();
            }}
          >
            Reset best
          </button>
          <button className="btn btn-sm btn-ghost" onClick={() => navigate('/')}>
            Menu
          </button>
        </div>

        {phase !== 'playing' ? (
          <div className="mini-banner" role="status">
            <strong>
              {phase === 'won' ? `Room lit · ${score} points` : `No moves left · ${score} points`}
            </strong>
            <button className="btn btn-sm btn-primary" onClick={reset}>
              Play again
            </button>
          </div>
        ) : null}
      </div>
    </main>
  );
}
