import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { dayNumber } from '../../shared/dates';
import {
  CHECKERS_SIZE,
  applyCheckersMove,
  checkersBot,
  checkersCounts,
  checkersMoves,
  checkersStatus,
  startCheckers,
  type CheckerResult,
  type CheckersLevel,
  type CheckerMove,
  type CheckersState,
} from '../lib/checkers';
import { readGames, recordCheckers, resetCheckers } from '../lib/gamesStore';
import { hashSeed, mulberry32 } from '../lib/rng';
import { sfx } from '../lib/audio';
import { haptic } from '../lib/settings';
import { ScreenHead, Segmented } from '../components/ui';
import { useT } from '../lib/i18n';

const FILES = 'abcdefgh';

function squareName(i: number): string {
  return `${FILES[i % CHECKERS_SIZE]}${CHECKERS_SIZE - Math.floor(i / CHECKERS_SIZE)}`;
}

function darkSquare(i: number): boolean {
  const row = Math.floor(i / CHECKERS_SIZE);
  const col = i % CHECKERS_SIZE;
  return (row + col) % 2 === 1;
}

export function Checkers({ navigate }: { navigate: (path: string) => void }) {
  const t = useT();
  const day = dayNumber();
  const [state, setState] = useState<CheckersState>(startCheckers);
  const [level, setLevel] = useState<CheckersLevel>(2);
  const [selected, setSelected] = useState<number | null>(null);
  const [plies, setPlies] = useState(0);
  const [over, setOver] = useState<CheckerResult | null>(null);
  const [bestWin, setBestWin] = useState<number | null>(() => readGames().checkers.bestWin);
  const recorded = useRef(false);

  const moves = useMemo(() => (over ? [] : checkersMoves(state)), [over, state]);
  const mine = useMemo(
    () => (selected === null ? [] : moves.filter((move) => move.from === selected)),
    [moves, selected],
  );
  const destinations = useMemo(() => new Set(mine.map((move) => move.to)), [mine]);
  const captured = useMemo(() => new Set(mine.flatMap((move) => move.captures)), [mine]);
  const counts = useMemo(() => checkersCounts(state.board), [state.board]);
  const record = readGames().checkers;

  useEffect(() => {
    const result = checkersStatus(state);
    if (!result || over) return;
    setOver(result);
    if (recorded.current) return;
    recorded.current = true;
    recordCheckers(day, result === 'w' ? 'win' : result === 'b' ? 'loss' : 'draw', plies);
    setBestWin(readGames().checkers.bestWin);
    if (result === 'w') {
      sfx.moonrise();
      haptic(24);
    } else {
      sfx.tier(result === 'draw' ? 'draw' : 'lost');
      haptic(12);
    }
  }, [day, over, plies, state]);

  useEffect(() => {
    if (over || state.turn !== 'b' || !checkersMoves(state).length) return;
    const pick = checkersBot(
      state,
      level,
      mulberry32(hashSeed('checkers', day, plies, state.board.filter(Boolean).length)),
    );
    if (!pick) return;
    setState(applyCheckersMove(state, pick));
    setPlies((n) => n + 1);
    sfx.place();
    haptic(4);
  }, [day, level, over, plies, state]);

  const choose = useCallback(
    (i: number) => {
      if (over || state.turn !== 'w') return;
      const piece = state.board[i];
      if (piece?.color === 'w') {
        setSelected(i);
        sfx.tap();
        return;
      }
      if (selected === null) return;
      const options = moves
        .filter((move) => move.from === selected && move.to === i)
        .sort((a, b) => b.captures.length - a.captures.length);
      if (!options.length) {
        sfx.blocked();
        return;
      }
      apply(options[0]);
    },
    [moves, over, selected, state],
  );

  const apply = (move: CheckerMove) => {
    setState(applyCheckersMove(state, move));
    setPlies((n) => n + 1);
    setSelected(null);
    sfx.place();
    haptic(6);
  };

  const newGame = useCallback(() => {
    setState(startCheckers());
    setSelected(null);
    setPlies(0);
    setOver(null);
    recorded.current = false;
    sfx.tap();
  }, []);

  const status = over
    ? over === 'w'
      ? t('You win — the table is yours.')
      : over === 'b'
        ? t('The bot wins this one.')
        : t('A draw. Both sides ran out of useful moves.')
    : state.turn === 'w'
      ? selected !== null && mine.length
        ? t('Choose a lit square. {n} legal move(s).', { n: mine.length })
        : t('Your turn. Pick a white piece.')
      : t('The bot is thinking.');

  return (
    <main className="main">
      <div className="wrap" style={{ maxWidth: 680 }}>
        <ScreenHead
          eyebrow={t('Checkers · Night {n}', { n: String(day).padStart(3, '0') })}
          title={t('The quiet draughts table')}
        >
          {t(
            'English draughts on an 8×8 table. Men move forward and capture forward; kings go both ways. Captures are forced, jump chains must finish, and a man on the far rank is crowned. No pieces or no legal move loses.',
          )}
        </ScreenHead>

        <div className="mini-modes">
          <Segmented
            label={t('Bot strength')}
            value={String(level) as '1' | '2'}
            options={[
              { value: '1', label: 'Steady' },
              { value: '2', label: 'Sharp' },
            ]}
            onChange={(value) => {
              setLevel(Number(value) as CheckersLevel);
              sfx.tap();
            }}
          />
          <span className="chess-note">{t('Captures are always forced')}</span>
        </div>

        <div className="mini-hud">
          <span className="chip">
            <span className="mono">{counts.white}</span> {t('white men')}
          </span>
          <span className="chip">
            <span className="mono">{counts.black}</span> {t('black men')}
          </span>
          <span className="chip">
            <span className="mono">{counts.whiteKings + counts.blackKings}</span> {t('crowns')}
          </span>
          <span className="chip">
            <span className="mono">{plies}</span> {t('plies')}
          </span>
          <span className="chip">
            {bestWin === null ? t('No best yet') : t('Fastest win {n}', { n: bestWin })}
          </span>
          <span className="chip">
            {t('{wins}W · {losses}L · {draws}D', {
              wins: record.wins,
              losses: record.losses,
              draws: record.draws,
            })}
          </span>
        </div>

        <p className="par-note" aria-live="polite" style={{ margin: '0 0 10px' }}>
          {status}
        </p>

        <div className={`checkers-board${over ? ' is-over' : ''}`} role="group" aria-label={t('Checkers board, 8 by 8')}>
          {state.board.map((piece, i) => {
            const dark = darkSquare(i);
            if (!dark) return <div key={i} className="checkers-square is-light" aria-hidden="true" />;
            const canChoose = !over && state.turn === 'w' && piece?.color === 'w';
            const legal = destinations.has(i);
            const willCapture = captured.has(i);
            const label = t('{square}: {piece}{state}', {
              square: squareName(i),
              piece: piece
                ? `${piece.color === 'w' ? t('white') : t('black')} ${piece.king ? t('king') : t('man')}`
                : t('empty dark square'),
              state: legal ? t(', legal move') : selected === i ? t(', selected') : '',
            });
            return (
              <button
                key={i}
                type="button"
                className={[
                  'checkers-square',
                  'is-dark',
                  legal ? 'is-legal' : '',
                  willCapture ? 'is-capture' : '',
                  selected === i ? 'is-selected' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-label={label}
                onClick={() => choose(i)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    setSelected(null);
                  }
                }}
                disabled={!canChoose && !legal}
              >
                {piece ? (
                  <span
                    className={`checkers-piece is-${piece.color}${piece.king ? ' is-king' : ''}`}
                    aria-hidden="true"
                  >
                    {piece.king ? '♛' : ''}
                  </span>
                ) : null}
                {legal ? <span className="checkers-hint" aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>

        <div className="mini-actions">
          <button className="btn btn-sm" onClick={newGame}>
            {t('New game')}
          </button>
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => {
              resetCheckers();
              setBestWin(null);
              sfx.remove();
            }}
          >
            {t('Reset best')}
          </button>
          <button className="btn btn-sm btn-ghost" onClick={() => navigate('/how-to')}>
            {t('How to play')}
          </button>
          <button className="btn btn-sm btn-ghost" onClick={() => navigate('/arcade')}>
            {t('Arcade')}
          </button>
        </div>

        {over ? (
          <div className="mini-banner" role="status">
            <strong>{status}</strong>
            <button className="btn btn-sm btn-primary" onClick={newGame}>
              {t('Play again')}
            </button>
          </div>
        ) : null}

        <p className="par-note" style={{ marginTop: 14 }}>
          {t('Tab moves between playable squares, Enter chooses, Escape clears the selection.')}
        </p>
      </div>
    </main>
  );
}
