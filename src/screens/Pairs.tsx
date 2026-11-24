import { useCallback, useEffect, useRef, useState } from 'react';
import { dayNumber } from '../../shared/dates';
import { hashSeed, mulberry32, shuffled } from '../lib/rng';
import { pairsToday, readGames, recordPairs, type GameMode } from '../lib/gamesStore';
import { sfx } from '../lib/audio';
import { haptic } from '../lib/settings';
import { ScreenHead, Segmented } from '../components/ui';

const SYMBOLS = ['☾', '✦', '✧', '❄', '♠', '♣', '♥', '♦', '✿', '☂', '⚑', '◈'];

interface Card {
  id: number;
  symbol: string;
}

function buildDeck(seed: number): Card[] {
  const rnd = mulberry32(seed);
  return shuffled(
    [...SYMBOLS, ...SYMBOLS].map((symbol, id) => ({ id, symbol })),
    rnd,
  );
}

export function Pairs({ navigate }: { navigate: (path: string) => void }) {
  const day = dayNumber();
  const [mode, setMode] = useState<GameMode>('daily');

  const [deck, setDeck] = useState<Card[]>(() => buildDeck(hashSeed('pairs', 'daily', day, 0)));
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [won, setWon] = useState(false);
  const [round, setRound] = useState(0);
  const [best, setBest] = useState<number | null>(null);
  const [bestMs, setBestMs] = useState<number | null>(null);
  const [keepsakes, setKeepsakes] = useState<string[]>([]);

  const timeout = useRef<number | null>(null);

  useEffect(() => {
    if (won || startedAt === null) return;
    const id = setInterval(() => setElapsed(Date.now() - startedAt), 200);
    return () => clearInterval(id);
  }, [won, startedAt]);

  useEffect(() => {
    if (!won) return;
    recordPairs(day, moves, elapsed, mode);
    sfx.complete();
    haptic(24);
  }, [won, day, moves, elapsed, mode]);

  useEffect(() => {
    const store = readGames().pairs;
    setBest(mode === 'daily' ? store.bestMoves : store.bestFreeMoves);
    setBestMs(mode === 'daily' ? store.bestMs : store.bestFreeMs);
  }, [mode, won]);

  useEffect(() => () => {
    if (timeout.current !== null) clearTimeout(timeout.current);
  }, []);

  const reset = useCallback(
    (nextMode: GameMode = mode) => {
      if (timeout.current !== null) clearTimeout(timeout.current);
      setDeck(buildDeck(hashSeed('pairs', nextMode, day, round + 1)));
      setFlipped([]);
      setMatched(new Set());
      setMoves(0);
      setStartedAt(null);
      setElapsed(0);
      setWon(false);
      setKeepsakes([]);
      setRound((r) => r + 1);
    },
    [mode, day, round],
  );

  const flip = (index: number) => {
    if (won || flipped.length === 2 || flipped.includes(index) || matched.has(index)) return;
    if (startedAt === null) setStartedAt(Date.now());

    const next = [...flipped, index];
    setFlipped(next);
    sfx.tap();
    haptic(5);

    if (next.length < 2) return;

    const [a, b] = next;
    setMoves((m) => m + 1);
    if (deck[a].symbol === deck[b].symbol) {
      timeout.current = window.setTimeout(() => {
        const merged = new Set(matched);
        merged.add(a);
        merged.add(b);
        setMatched(merged);
        setFlipped([]);
        setKeepsakes((prev) => (prev.includes(deck[a].symbol) ? prev : [...prev, deck[a].symbol]));
        if (merged.size === deck.length) {
          setWon(true);
          setElapsed(startedAt === null ? 0 : Date.now() - startedAt);
          sfx.moonrise();
        }
      }, 420);
    } else {
      timeout.current = window.setTimeout(() => {
        setFlipped([]);
        sfx.blocked();
      }, 760);
    }
  };

  const today = pairsToday(day);
  const seconds = Math.floor(elapsed / 1000);

  return (
    <main className="main">
      <div className="wrap" style={{ maxWidth: 760 }}>
        <ScreenHead eyebrow={`Pairs · Night ${String(day).padStart(3, '0')}`} title="The keepsake table">
          Twelve keepsakes lie face down. Turn two; a match goes on the shelf, a miss turns back.
          Same layout for everyone today.
        </ScreenHead>

        <div className="mini-modes">
          <Segmented
            label="Pairs mode"
            value={mode}
            options={[
              { value: 'daily', label: 'Daily' },
              { value: 'free', label: 'Free' },
            ]}
            onChange={(value) => {
              setMode(value);
              reset(value);
              sfx.tap();
            }}
          />
          <span className="chess-note">
            {mode === 'daily' ? 'The same layout for everyone today' : 'Fresh shuffle every reset'}
          </span>
        </div>

        <div className="pairs-shelf" aria-label={`Keepsakes ${keepsakes.length} of ${SYMBOLS.length}`}>
          <span className="pairs-shelf-label">Keepsakes</span>
          {SYMBOLS.map((symbol, i) => {
            const found = keepsakes.includes(symbol);
            return (
              <span
                key={symbol}
                className={`pairs-slot pair-${i}${found ? ' is-found' : ''}`}
                aria-hidden="true"
              >
                {found ? symbol : '·'}
              </span>
            );
          })}
        </div>

        <div className="mini-hud">
          <span className="chip">
            <span className="mono">{moves}</span> moves
          </span>
          <span className="chip">
            <span className="mono">
              {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
            </span>
          </span>
          <span className="chip">
            {mode === 'daily' ? (today ? `Today ${today.moves} moves` : 'Unplayed today') : 'Free play'}
          </span>
          <span className="chip">{matched.size / 2} / {SYMBOLS.length} on the shelf</span>
          <span className="chip">{best === null ? 'No best yet' : `Best ${best} moves`}</span>
          {bestMs !== null ? <span className="chip">Best time {(bestMs / 1000).toFixed(1)}s</span> : null}
        </div>

        <div className="pairs-grid">
          {deck.map((card, index) => {
            const isUp = flipped.includes(index) || matched.has(index);
            return (
              <button
                key={card.id}
                type="button"
                className={`pairs-card${isUp ? ' is-up' : ''}${matched.has(index) ? ' is-matched' : ''}`}
                onClick={() => flip(index)}
                aria-label={isUp ? `Card shows ${card.symbol}` : 'Hidden card'}
                aria-pressed={isUp}
              >
                <span className="pairs-face is-back" aria-hidden="true">
                  ✦
                </span>
                <span className={`pairs-face is-front pair-${SYMBOLS.indexOf(card.symbol)}`} aria-hidden="true">
                  {card.symbol}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mini-actions">
          <button className="btn btn-sm btn-ghost" onClick={() => reset()}>
            New shuffle
          </button>
          <button className="btn btn-sm btn-ghost" onClick={() => navigate('/')}>
            Menu
          </button>
        </div>

        {won ? (
          <div className="mini-banner" role="status">
            <strong>
              Cleared in {moves} moves · {(elapsed / 1000).toFixed(1)}s
            </strong>
            <button className="btn btn-sm btn-primary" onClick={() => reset()}>
              Play again
            </button>
          </div>
        ) : null}
      </div>
    </main>
  );
}
