import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { dayNumber } from '../../shared/dates';
import { SNAKE_H, SNAKE_TARGET, SNAKE_W, startSnake, stepSnake, type Dir, type SnakeState } from '../lib/snake';
import {
  clearSnakeRound,
  readGames,
  recordSnake,
  resetSnake,
  saveSnakeRound,
  type SavedSnakeRound,
} from '../lib/gamesStore';
import { ResumeCard } from '../components/ResumeCard';
import { hashSeed, mulberry32 } from '../lib/rng';
import { sfx } from '../lib/audio';
import { haptic } from '../lib/settings';
import { ScreenHead } from '../components/ui';
import { useT } from '../lib/i18n';
import { LeaveGame } from '../components/LeaveGame';

const KEY_DIR: Record<string, Dir> = {
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

export function Snake({ navigate }: { navigate: (path: string) => void }) {
  const t = useT();
  const day = dayNumber();
  const [round, setRound] = useState(0);
  const [state, setState] = useState<SnakeState>(() => startSnake(mulberry32(hashSeed('snake', day, 0))));
  const [best, setBest] = useState<number | null>(() => readGames().snake.best);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [resume, setResume] = useState<SavedSnakeRound | null>(() => {
    const saved = readGames().snake.saved;
    return saved && saved.day === day ? saved : null;
  });
  const recorded = useRef(false);

  useEffect(() => {
    const store = readGames().snake;
    setBest(store.best);
  }, [round, state.won, state.alive]);

  useEffect(() => {
    if (startedAt === null || state.won || !state.alive) return;
    const id = setInterval(() => setElapsed(Date.now() - startedAt), 500);
    return () => clearInterval(id);
  }, [startedAt, state.won, state.alive]);

  useEffect(() => {
    if (state.won || !state.alive) return;
    recorded.current = false;
  }, [state.won, state.alive]);

  useEffect(() => {
    if ((!state.won && state.alive) || recorded.current) return;
    recorded.current = true;
    recordSnake(day, state.steps, state.apples, state.won);
    setBest(readGames().snake.best);
    if (state.won) {
      sfx.moonrise();
      haptic(24);
    } else {
      sfx.blocked();
      haptic(12);
    }
  }, [day, state.won, state.alive, state.steps, state.apples]);

  useEffect(() => {
    if (state.steps === 0) return;
    if (state.alive && !state.won) {
      saveSnakeRound({
        day,
        snake: state.snake,
        food: state.food,
        steps: state.steps,
        apples: state.apples,
        dir: state.dir,
      });
    } else {
      clearSnakeRound();
    }
  }, [day, state]);

  const reset = useCallback(() => {
    const nextRound = round + 1;
    setRound(nextRound);
    setState(startSnake(mulberry32(hashSeed('snake', day, nextRound))));
    setStartedAt(null);
    setElapsed(0);
    recorded.current = false;
    setResume(null);
    clearSnakeRound();
    sfx.tap();
  }, [day, round]);

  const step = useCallback(
    (dir: Dir) => {
      if (resume) return;
      setState((current) => {
        if (!current.alive || current.won) return current;
        const rnd = mulberry32(hashSeed('snake-food', day, round, current.steps));
        const next = stepSnake(current, dir, rnd);
        if (next.apples > current.apples) {
          sfx.place();
          haptic(5);
        } else if (!next.alive) {
          sfx.blocked();
        } else {
          sfx.tap();
        }
        return next;
      });
      setStartedAt((start) => start ?? Date.now());
    },
    [day, resume, round],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === 'Escape') {
        if (leaveOpen) return;
        event.preventDefault();
        if (state.steps > 0 && state.alive && !state.won) setLeaveOpen(true);
        else navigate('/arcade');
        return;
      }
      if (event.key === 'Enter' && (state.won || !state.alive)) {
        event.preventDefault();
        reset();
        return;
      }
      const dir = KEY_DIR[event.key];
      if (!dir) return;
      event.preventDefault();
      step(dir);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [leaveOpen, navigate, reset, state.alive, state.steps, state.won, step]);

  const head = state.snake[0];
  const body = useMemo(() => new Set(state.snake.slice(1)), [state.snake]);
  const applesLeft = Math.max(0, SNAKE_TARGET - state.apples);
  const seconds = Math.floor(elapsed / 1000);
  const headRow = Math.floor(head / SNAKE_W) + 1;
  const headCol = (head % SNAKE_W) + 1;
  const foodRow = Math.floor(state.food / SNAKE_W) + 1;
  const foodCol = (state.food % SNAKE_W) + 1;
  const status = state.won
    ? t('Garden full in {steps} steps', { steps: state.steps })
    : !state.alive
      ? t('Caught in the glass')
      : t(
          '{left} apples left · {steps} steps · head row {hr}, column {hc} · apple row {ar}, column {ac}',
          { left: applesLeft, steps: state.steps, hr: headRow, hc: headCol, ar: foodRow, ac: foodCol },
        );

  const cellLabel = (i: number): string => {
    const parts = [t('row {r}, column {c}', { r: Math.floor(i / SNAKE_W) + 1, c: (i % SNAKE_W) + 1 })];
    if (i === head) parts.push(t('head'));
    else if (body.has(i)) parts.push(t('body'));
    if (i === state.food) parts.push(t('apple'));
    return parts.join(', ');
  };

  return (
    <main className="main">
      <div className="wrap" style={{ maxWidth: 640 }}>
        <ScreenHead
          eyebrow={t('Snake · Night {n}', { n: String(day).padStart(3, '0') })}
          title={t('The glass orchard')}
        >
          {t(
            'One press, one step: the snake moves only when you do, so every apple is a decision. Collect {target} and the orchard is yours; a wall or your own tail ends the night. {keys}',
            {
              target: SNAKE_TARGET,
              keys: t('Arrows or WASD step, Enter restarts, Escape leaves the table.'),
            },
          )}
        </ScreenHead>

        <div className="mini-hud">
          <span className="chip">
            <span className="mono">{state.apples}</span> / {SNAKE_TARGET} {t('apples')}
          </span>
          <span className="chip">
            <span className="mono">{state.steps}</span> {t('steps')}
          </span>
          <span className="chip">
            <span className="mono">{state.snake.length}</span> {t('long')}
          </span>
          <span className="chip">
            <span className="mono">
              {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
            </span>
          </span>
          <span className="chip">{best === null ? t('No best yet') : t('Best {n} steps', { n: best })}</span>
          <span className="chip">{state.won ? t('Won') : state.alive ? t('Alive') : t('Lost')}</span>
        </div>

        <p className="par-note snake-status" aria-live="polite" style={{ margin: '0 0 10px' }}>
          {status}
        </p>

        {resume ? (
          <ResumeCard
            title={t('An orchard is already open')}
            body={t('You left this run mid-step. Continue it, or start a fresh orchard for today.')}
            meta={t('{apples} / {target} apples · {steps} steps', {
              apples: resume.apples,
              target: SNAKE_TARGET,
              steps: resume.steps,
            })}
            onContinue={() => {
              setState({
                snake: resume.snake,
                food: resume.food,
                steps: resume.steps,
                apples: resume.apples,
                alive: true,
                won: false,
                dir: resume.dir,
              });
              setStartedAt(Date.now());
              setResume(null);
              sfx.tap();
            }}
            onDiscard={() => {
              clearSnakeRound();
              setResume(null);
              sfx.remove();
            }}
          />
        ) : (
        <div
          className={`snake-board${state.won ? ' is-won' : ''}${!state.alive ? ' is-lost' : ''}`}
          style={{ gridTemplateColumns: `repeat(${SNAKE_W}, 1fr)` }}
          role="grid"
          aria-label={t('Snake board, {w} by {h}. {apples} of {target} apples eaten, {steps} steps.', {
            w: SNAKE_W,
            h: SNAKE_H,
            apples: state.apples,
            target: SNAKE_TARGET,
            steps: state.steps,
          })}
        >
          {Array.from({ length: SNAKE_H }, (_, row) => (
            <div role="row" key={row} style={{ display: 'contents' }}>
              {Array.from({ length: SNAKE_W }, (_, col) => {
                const i = row * SNAKE_W + col;
                return (
                  <span
                    key={i}
                    role="gridcell"
                    aria-label={cellLabel(i)}
                    className={`snake-cell${i === head ? ' is-head' : ''}${body.has(i) ? ' is-body' : ''}${i === state.food ? ' is-food' : ''}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
        )}

        <div className="snake-pad" role="group" aria-label={t('Step the snake')} style={resume ? { display: 'none' } : undefined}>
          <button type="button" className="btn btn-sm btn-ghost" aria-label={t('Step up')} onClick={() => step('up')}>
            ↑
          </button>
          <div className="row gap-6">
            <button type="button" className="btn btn-sm btn-ghost" aria-label={t('Step left')} onClick={() => step('left')}>
              ←
            </button>
            <button type="button" className="btn btn-sm btn-ghost" aria-label={t('Step down')} onClick={() => step('down')}>
              ↓
            </button>
            <button type="button" className="btn btn-sm btn-ghost" aria-label={t('Step right')} onClick={() => step('right')}>
              →
            </button>
          </div>
        </div>

        <div className="mini-actions">
          <button className="btn btn-sm" onClick={reset}>
            {t('New orchard')}
          </button>
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => {
              resetSnake();
              setBest(null);
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
          title={t('Leave the orchard?')}
          body={t('Your run is saved for today. You can pick it up from this table, or discard it here.')}
          onStay={() => setLeaveOpen(false)}
          onLeave={() => navigate('/arcade')}
        />

        {state.won || !state.alive ? (
          <div className="mini-banner" role="status">
            <strong>
              {state.won
                ? t('Orchard cleared in {steps} steps', { steps: state.steps })
                : t('Caught after {apples} apples · {steps} steps', { apples: state.apples, steps: state.steps })}
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
