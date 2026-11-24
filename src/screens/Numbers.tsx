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
import {
  clearNumbersRound,
  readGames,
  recordNumbers,
  resetNumbers,
  saveNumbersRound,
  type SavedNumbersRound,
} from '../lib/gamesStore';
import { ResumeCard } from '../components/ResumeCard';
import { hashSeed, mulberry32 } from '../lib/rng';
import { sfx } from '../lib/audio';
import { haptic } from '../lib/settings';
import { ScreenHead } from '../components/ui';
import { useT } from '../lib/i18n';
import { LeaveGame } from '../components/LeaveGame';

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
  const t = useT();
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
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [resume, setResume] = useState<SavedNumbersRound | null>(() => {
    const saved = readGames().numbers.saved;
    return saved && saved.day === day ? saved : null;
  });
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
    recordNumbers(day, score, maxTile(board), phase === 'won');
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
  }, [board, day, phase, score]);

  useEffect(() => {
    if (moves === 0) return;
    if (phase === 'playing') {
      saveNumbersRound({ day, board, score, moves });
    } else {
      clearNumbersRound();
    }
  }, [board, day, moves, phase, score]);

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
    setResume(null);
    clearNumbersRound();
    sfx.tap();
  }, [day, round]);

  const move = useCallback(
    (dir: NumDir) => {
      if (resume) return;
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
    [day, moves, resume, round],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === 'Escape') {
        if (leaveOpen) return;
        event.preventDefault();
        if (moves > 0 && phase === 'playing') setLeaveOpen(true);
        else navigate('/arcade');
        return;
      }
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
  }, [leaveOpen, move, moves, navigate, phase, reset]);

  const max = maxTile(board);
  const seconds = Math.floor(elapsed / 1000);
  const status =
    phase === 'won'
      ? t('A {goal} lantern is lit', { goal: NUM_GOAL })
      : phase === 'lost'
        ? t('The room is full and nothing doubles')
        : t('Next goal {n}', { n: Math.min(NUM_GOAL, Math.max(4, max * 2)) });

  return (
    <main className="main">
      <div className="wrap" style={{ maxWidth: 600 }}>
        <ScreenHead
          eyebrow={t('2048 · Night {n}', { n: String(day).padStart(3, '0') })}
          title={t('The doubling room')}
        >
          {t(
            'Slide every lantern; equal neighbours fuse into the next power. The room is lit at a {goal} tile, and the night ends when nothing can move. Arrows, WASD or the pad below; {keys}',
            { goal: NUM_GOAL, keys: t('Enter restarts, Escape leaves the table.') },
          )}
        </ScreenHead>

        <div className="mini-hud">
          <span className="chip">
            <span className="mono">{score}</span> {t('points')}
          </span>
          <span className="chip">
            <span className="mono">{moves}</span> {t('moves')}
          </span>
          <span className="chip">{t('Max {n}', { n: max })}</span>
          <span className="chip">
            <span className="mono">
              {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
            </span>
          </span>
          <span className="chip">{best === null ? t('No best yet') : t('Best {n}', { n: best })}</span>
          <span className="chip">{bestTile === null ? t('Best tile —') : t('Best tile {n}', { n: bestTile })}</span>
        </div>

        <p className="par-note" aria-live="polite" style={{ margin: '0 0 10px' }}>
          {status}
        </p>

        {resume ? (
          <ResumeCard
            title={t('A room is already open')}
            body={t('You left this run mid-slide. Continue it, or start a fresh room for today.')}
            meta={t('{score} points · {moves} moves', {
              score: resume.score,
              moves: resume.moves,
            })}
            onContinue={() => {
              setBoard(resume.board);
              setScore(resume.score);
              setMoves(resume.moves);
              setStartedAt(Date.now());
              setResume(null);
              sfx.tap();
            }}
            onDiscard={() => {
              clearNumbersRound();
              setResume(null);
              sfx.remove();
            }}
          />
        ) : (
        <div
          className={`num-grid${phase === 'won' ? ' is-won' : ''}${phase === 'lost' ? ' is-lost' : ''}`}
          role="grid"
          aria-label={t('2048 board, 4 by 4. {score} points, {moves} moves, largest tile {max}.', {
            score,
            moves,
            max,
          })}
        >
          {Array.from({ length: NUM_SIZE }, (_, row) => (
            <div role="row" key={row} style={{ display: 'contents' }}>
              {Array.from({ length: NUM_SIZE }, (_, col) => {
                const i = row * NUM_SIZE + col;
                const value = board[i];
                return (
                  <div
                    key={i}
                    role="gridcell"
                    aria-readonly="true"
                    className={`num-cell${value ? ` num-${Math.min(value, 2048)}` : ''}`}
                    aria-label={t('Row {r}, column {c}: {state}', {
                      r: row + 1,
                      c: col + 1,
                      state: value || t('empty'),
                    })}
                  >
                    {value || ''}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        )}

        <div className="snake-pad" role="group" aria-label={t('Slide the room')} style={resume ? { display: 'none' } : undefined}>
          <button type="button" className="btn btn-sm btn-ghost" aria-label={t('Slide up')} onClick={() => move('up')}>
            ↑
          </button>
          <div className="row gap-6">
            <button type="button" className="btn btn-sm btn-ghost" aria-label={t('Slide left')} onClick={() => move('left')}>
              ←
            </button>
            <button type="button" className="btn btn-sm btn-ghost" aria-label={t('Slide down')} onClick={() => move('down')}>
              ↓
            </button>
            <button type="button" className="btn btn-sm btn-ghost" aria-label={t('Slide right')} onClick={() => move('right')}>
              →
            </button>
          </div>
        </div>

        <div className="mini-actions">
          <button className="btn btn-sm" onClick={reset}>
            {t('New room')}
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
            {t('Reset best')}
          </button>
          <button className="btn btn-sm btn-ghost" onClick={() => navigate('/')}>
            {t('Menu')}
          </button>
        </div>

        <LeaveGame
          open={leaveOpen}
          title={t('Leave the doubling room?')}
          body={t('Your run is saved for today. You can pick it up from this table, or discard it here.')}
          onStay={() => setLeaveOpen(false)}
          onLeave={() => navigate('/arcade')}
        />

        {phase !== 'playing' ? (
          <div className="mini-banner" role="status">
            <strong>
              {phase === 'won'
                ? t('Room lit · {score} points', { score })
                : t('No moves left · {score} points', { score })}
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
