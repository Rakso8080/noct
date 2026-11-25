import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { dayNumber } from '../../shared/dates';
import {
  C4_COLS,
  C4_ROWS,
  c4Bot,
  c4Drop,
  c4Index,
  c4LegalColumns,
  c4Status,
  c4WinningLine,
  startConnect4,
  type C4Board,
  type C4Player,
} from '../lib/connect4';
import { readGames, recordConnect4, resetConnect4, type TableResult } from '../lib/gamesStore';
import { hashSeed, mulberry32 } from '../lib/rng';
import { sfx } from '../lib/audio';
import { haptic } from '../lib/settings';
import { ScreenHead, Segmented } from '../components/ui';
import { useT } from '../lib/i18n';

export function Connect4({ navigate }: { navigate: (path: string) => void }) {
  const t = useT();
  const day = dayNumber();
  const [board, setBoard] = useState<C4Board>(startConnect4);
  const [turn, setTurn] = useState<C4Player>(1);
  const [level, setLevel] = useState<1 | 2>(2);
  const [moves, setMoves] = useState(0);
  const [over, setOver] = useState<C4Player | 'draw' | null>(null);
  const [bestWin, setBestWin] = useState<number | null>(() => readGames().connect4.bestWin);
  const recorded = useRef(false);
  const legal = useMemo(() => c4LegalColumns(board), [board]);
  const winning = useMemo(() => c4WinningLine(board), [board]);
  const record = readGames().connect4;

  const finish = useCallback(
    (result: TableResult, plies: number) => {
      setOver(result === 'win' ? 1 : result === 'loss' ? 2 : 'draw');
      if (recorded.current) return;
      recorded.current = true;
      recordConnect4(day, result, plies);
      setBestWin(readGames().connect4.bestWin);
      if (result === 'win') {
        sfx.moonrise();
        haptic(24);
      } else {
        sfx.tier(result === 'draw' ? 'draw' : 'lost');
        haptic(12);
      }
    },
    [day],
  );

  const play = useCallback(
    (col: number) => {
      if (over || turn !== 1 || !legal.includes(col)) return;
      const next = c4Drop(board, col, 1);
      if (!next) return;
      const nextMoves = moves + 1;
      setBoard(next);
      setMoves(nextMoves);
      sfx.place();
      haptic(6);
      const status = c4Status(next);
      if (status === 1) finish('win', nextMoves);
      else if (status === 'draw') finish('draw', nextMoves);
      else setTurn(2);
    },
    [board, finish, legal, moves, over, turn],
  );

  useEffect(() => {
    if (over || turn !== 2) return;
    const col = c4Bot(
      board,
      2,
      level,
      mulberry32(hashSeed('connect4', day, moves, board.filter(Boolean).length)),
    );
    if (col === null) {
      finish('draw', moves);
      return;
    }
    const next = c4Drop(board, col, 2);
    if (!next) {
      finish('draw', moves);
      return;
    }
    const nextMoves = moves + 1;
    setBoard(next);
    setMoves(nextMoves);
    sfx.place();
    haptic(4);
    const status = c4Status(next);
    if (status === 2) finish('loss', nextMoves);
    else if (status === 'draw') finish('draw', nextMoves);
    else setTurn(1);
  }, [board, day, finish, level, moves, over, turn]);

  const newGame = useCallback(() => {
    setBoard(startConnect4());
    setTurn(1);
    setMoves(0);
    setOver(null);
    recorded.current = false;
    sfx.tap();
  }, []);

  const yourDiscs = board.filter((cell) => cell === 1).length;
  const botDiscs = board.filter((cell) => cell === 2).length;
  const status =
    over === 1
      ? t('You win — four in a row.')
      : over === 2
        ? t('The bot wins this one.')
        : over === 'draw'
          ? t('A draw. The board is full.')
          : turn === 1
            ? t('Your turn. Choose a column.')
            : t('The bot is lining up four.');

  return (
    <main className="main">
      <div className="wrap" style={{ maxWidth: 680 }}>
        <ScreenHead
          eyebrow={t('Connect Four · Night {n}', { n: String(day).padStart(3, '0') })}
          title={t('The lantern column')}
        >
          {t(
            'Drop a lantern into one of seven columns. Four of your colour in a row — straight or diagonal — wins. The bot takes an immediate four, blocks yours, and otherwise builds toward the middle.',
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
              setLevel(Number(value) as 1 | 2);
              sfx.tap();
            }}
          />
          <span className="chess-note">{t('Seven columns · six rows')}</span>
        </div>

        <div className="mini-hud">
          <span className="chip">
            <span className="mono">{yourDiscs}</span> {t('your discs')}
          </span>
          <span className="chip">
            <span className="mono">{botDiscs}</span> {t('bot discs')}
          </span>
          <span className="chip">
            <span className="mono">{moves}</span> {t('drops')}
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

        <div className="c4-board-wrap">
          <div className="c4-drops" role="group" aria-label={t('Drop a disc into a column')}>
            {Array.from({ length: C4_COLS }, (_, col) => (
              <button
                key={col}
                type="button"
                className="c4-drop"
                disabled={over !== null || turn !== 1 || !legal.includes(col)}
                aria-label={t('Drop in column {n}{full}', {
                  n: col + 1,
                  full: legal.includes(col) ? '' : t(', full'),
                })}
                onClick={() => play(col)}
              >
                <span aria-hidden="true">▼</span>
              </button>
            ))}
          </div>

          <div
            className={`c4-board${over ? ' is-over' : ''}`}
            role="grid"
            aria-label={t('Connect Four board, 7 columns by 6 rows')}
            aria-rowcount={C4_ROWS}
            aria-colcount={C4_COLS}
          >
            {Array.from({ length: C4_ROWS }, (_, row) => (
              <div className="c4-row" role="row" key={row}>
                {Array.from({ length: C4_COLS }, (_, col) => {
                  const i = c4Index(row, col);
                  const cell = board[i];
                  const isWin = winning?.includes(i) ?? false;
                  return (
                    <div
                      key={col}
                      role="gridcell"
                      aria-label={t('Row {r}, column {c}: {state}', {
                        r: row + 1,
                        c: col + 1,
                        state: cell === 1 ? t('your disc') : cell === 2 ? t('bot disc') : t('empty'),
                      })}
                      className={[
                        'c4-cell',
                        cell === 1 ? 'is-you' : '',
                        cell === 2 ? 'is-bot' : '',
                        isWin ? 'is-win' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {cell ? <span className="c4-disc" aria-hidden="true" /> : null}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="mini-actions">
          <button className="btn btn-sm" onClick={newGame}>
            {t('New game')}
          </button>
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => {
              resetConnect4();
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
          {t('Tab moves between the seven columns, Enter drops. Each column button says where it will land.')}
        </p>
      </div>
    </main>
  );
}
