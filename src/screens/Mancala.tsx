import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { dayNumber } from '../../shared/dates';
import {
  MANCALA_STORE,
  mancalaBot,
  mancalaLegal,
  mancalaSow,
  newMancala,
  type MancalaBoard,
  type MancalaPlayer,
  type MancalaWinner,
} from '../lib/mancala';
import { readGames, recordMancala } from '../lib/gamesStore';
import { hashSeed, mulberry32 } from '../lib/rng';
import { sfx } from '../lib/audio';
import { haptic } from '../lib/settings';
import { ScreenHead, Segmented } from '../components/ui';
import { TableChallengeBanner, TableResultCard } from '../components/TableShare';
import { useT } from '../lib/i18n';
import type { TableChallenge } from '../lib/challenge';

const TOP = [12, 11, 10, 9, 8, 7];
const BOTTOM = [0, 1, 2, 3, 4, 5];

function Pips({ n }: { n: number }) {
  return (
    <span className="mancala-stones" aria-hidden="true">
      {Array.from({ length: Math.min(n, 12) }, (_, i) => (
        <i key={i} />
      ))}
    </span>
  );
}

export function Mancala({
  navigate,
  challenge = null,
}: {
  navigate: (path: string) => void;
  challenge?: TableChallenge | null;
}) {
  const t = useT();
  const today = dayNumber();
  const day = challenge?.day ?? today;
  const [board, setBoard] = useState<MancalaBoard>(newMancala);
  const [turn, setTurn] = useState<MancalaPlayer>(0);
  const [level, setLevel] = useState<1 | 2>(challenge?.game === 'mancala' ? challenge.level : 2);
  const [moves, setMoves] = useState(0);
  const [over, setOver] = useState<MancalaWinner>(null);
  const [note, setNote] = useState<string | null>(null);
  const recorded = useRef(false);
  const record = readGames().mancala;
  const legal = useMemo(() => mancalaLegal(board, 0), [board]);

  const finish = useCallback(
    (next: MancalaBoard, plies: number, winner: MancalaWinner) => {
      setOver(winner);
      setNote(null);
      if (recorded.current) return;
      recorded.current = true;
      const result = winner === 0 ? 'win' : winner === 1 ? 'loss' : 'draw';
      const mode = challenge && challenge.day !== today ? 'free' : 'daily';
      recordMancala(day, result, next[MANCALA_STORE[0]], plies, mode);
      if (winner === 0) {
        sfx.moonrise();
        haptic(24);
      } else {
        sfx.tier(winner === 'draw' ? 'draw' : 'lost');
        haptic(12);
      }
    },
    [challenge, day, today],
  );

  const play = useCallback(
    (pit: number) => {
      if (over || turn !== 0 || !legal.includes(pit)) return;
      const result = mancalaSow(board, 0, pit);
      if (!result) return;
      const nextMoves = moves + 1;
      setBoard(result.board);
      setMoves(nextMoves);
      setNote(result.extra ? t('Extra turn — the last stone reached your store.') : null);
      sfx.place();
      haptic(6);
      if (result.finished) finish(result.board, nextMoves, result.winner);
      else if (!result.extra) setTurn(1);
    },
    [board, finish, legal, moves, over, t, turn],
  );

  useEffect(() => {
    if (over !== null || turn !== 1) return;
    const id = window.setTimeout(() => {
      const pit = mancalaBot(board, 1, level, mulberry32(hashSeed('mancala', day, moves)));
      if (pit === null) {
        finish(board, moves, 'draw');
        return;
      }
      const result = mancalaSow(board, 1, pit);
      if (!result) return;
      const nextMoves = moves + 1;
      setBoard(result.board);
      setMoves(nextMoves);
      sfx.place();
      haptic(4);
      if (result.finished) finish(result.board, nextMoves, result.winner);
      else if (!result.extra) setTurn(0);
    }, 480);
    return () => window.clearTimeout(id);
  }, [board, day, finish, level, moves, over, turn]);

  const newGame = useCallback(() => {
    setBoard(newMancala());
    setTurn(0);
    setMoves(0);
    setOver(null);
    setNote(null);
    recorded.current = false;
    sfx.tap();
  }, []);

  const status =
    over === 0
      ? t('Your store is fuller. The circle is yours.')
      : over === 1
        ? t('The bot keeps the fuller store.')
        : over === 'draw'
          ? t('Two even stores. The stones call it a draw.')
          : turn === 0
            ? note ?? t('Your turn. Choose one of your six cups.')
            : t('The bot is sowing.');

  return (
    <main className="main">
      <div className="wrap" style={{ maxWidth: 760 }}>
        <ScreenHead
          eyebrow={t('Mancala · Night {n}', { n: String(day).padStart(3, '0') })}
          title={t('The stone circle')}
        >
          {t(
            'Sow stones counter-clockwise from one of your six cups. The last stone in your own store buys another turn; the last stone in an empty cup takes the opposite cup. When one side runs dry, the fuller store wins.',
          )}
        </ScreenHead>

        <TableChallengeBanner challenge={challenge} />

        <div className="mini-modes">
          {challenge ? (
            <span className="chip">
              {t('Shared circle · {level} bot', {
                level: t(level === 2 ? 'Sharp' : 'Steady'),
              })}
            </span>
          ) : (
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
          )}
          <span className="chess-note">{t('Six cups each · four stones')}</span>
        </div>

        <div className="mini-hud">
          <span className="chip">
            <span className="mono">{board[MANCALA_STORE[0]]}</span> {t('your store')}
          </span>
          <span className="chip">
            <span className="mono">{board[MANCALA_STORE[1]]}</span> {t('bot store')}
          </span>
          <span className="chip">
            <span className="mono">{moves}</span> {t('sowings')}
          </span>
          <span className="chip">
            {record.bestStones === null ? t('No best yet') : t('Best {n} stones', { n: record.bestStones })}
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

        <div className="mancala-board" aria-label={t('Mancala board')}>
          <div className="mancala-store" data-side="bot">
            <small>{t('Bot')}</small>
            <strong>{board[MANCALA_STORE[1]]}</strong>
            <Pips n={board[MANCALA_STORE[1]]} />
          </div>

          <div className="mancala-centre">
            <div className="mancala-row" data-row="bot">
              {TOP.map((pit) => (
                <div key={pit} className="mancala-pit" data-side="bot">
                  <span className="mancala-count">{board[pit]}</span>
                  <Pips n={board[pit]} />
                </div>
              ))}
            </div>
            <div className="mancala-row" data-row="you">
              {BOTTOM.map((pit) => (
                <button
                  key={pit}
                  type="button"
                  className="mancala-pit"
                  data-side="you"
                  data-playable={turn === 0 && !over && board[pit] > 0 ? 'true' : 'false'}
                  disabled={turn !== 0 || over !== null || board[pit] === 0}
                  aria-label={t('Sow cup {n}: {count} stones', {
                    n: pit + 1,
                    count: board[pit],
                  })}
                  onClick={() => play(pit)}
                >
                  <span className="mancala-count">{board[pit]}</span>
                  <Pips n={board[pit]} />
                </button>
              ))}
            </div>
          </div>

          <div className="mancala-store" data-side="you">
            <small>{t('You')}</small>
            <strong>{board[MANCALA_STORE[0]]}</strong>
            <Pips n={board[MANCALA_STORE[0]]} />
          </div>
        </div>

        {over !== null ? (
          <TableResultCard
            run={{
              game: 'mancala',
              day,
              level,
              result: over === 0 ? 'win' : over === 1 ? 'loss' : 'draw',
              stones: board[MANCALA_STORE[0]],
              moves,
            }}
            board={board}
            challenge={challenge}
          />
        ) : null}

        <div className="row gap-10" style={{ flexWrap: 'wrap', marginTop: 16 }}>
          <button type="button" className="btn btn-primary" onClick={newGame}>
            {over === null ? t('Restart the circle') : t('Play again')}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/arcade')}>
            {t('Back to the arcade')}
          </button>
        </div>
        <p className="par-note" style={{ marginTop: 12 }}>
          {t('Four stones in every cup when the circle opens. The daily circle is kept in this browser.')}
        </p>
      </div>
    </main>
  );
}
