import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { dayNumber } from '../../shared/dates';
import {
  drawDomino,
  dominoBot,
  legalDominoMoves,
  passDomino,
  playDomino,
  scorePips,
  startDominoes,
  type Domino,
  type DominoMove,
  type DominoState,
} from '../lib/dominoes';
import { readGames, recordDominoes, resetDominoes } from '../lib/gamesStore';
import { hashSeed, mulberry32 } from '../lib/rng';
import { sfx } from '../lib/audio';
import { haptic } from '../lib/settings';
import { ScreenHead, Segmented } from '../components/ui';
import { useT } from '../lib/i18n';

const PIPS: Record<number, number[]> = {
  0: [],
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function Face({ value }: { value: number }) {
  const dots = PIPS[value] ?? [];
  return (
    <span className="domino-face" aria-hidden="true">
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className={dots.includes(i) ? 'domino-pip is-on' : 'domino-pip'} />
      ))}
    </span>
  );
}

function Tile({
  tile,
  small = false,
  label,
}: {
  tile: Domino;
  small?: boolean;
  label?: string;
}) {
  return (
    <span className={`domino-tile${small ? ' is-small' : ''}`} role="img" aria-label={label ?? `${tile.a}–${tile.b}`}>
      <Face value={tile.a} />
      <span className="domino-divider" aria-hidden="true" />
      <Face value={tile.b} />
    </span>
  );
}

export function Dominoes({ navigate }: { navigate: (path: string) => void }) {
  const t = useT();
  const day = dayNumber();
  const [round, setRound] = useState(0);
  const [state, setState] = useState<DominoState>(() =>
    startDominoes(mulberry32(hashSeed('dominoes', day, 0))),
  );
  const [level, setLevel] = useState<1 | 2>(2);
  const [selected, setSelected] = useState<string | null>(null);
  const [bestMargin, setBestMargin] = useState<number | null>(() => readGames().dominoes.bestMargin);
  const recorded = useRef(false);

  const playerMoves = useMemo(
    () => (state.result ? [] : legalDominoMoves(state.player, state.left, state.right)),
    [state.left, state.player, state.result, state.right],
  );
  const selectedMoves = useMemo(
    () => (selected ? playerMoves.filter((move) => move.tile.id === selected) : []),
    [playerMoves, selected],
  );
  const playableIds = new Set(playerMoves.map((move) => move.tile.id));
  const record = readGames().dominoes;

  useEffect(() => {
    if (!state.result || recorded.current) return;
    recorded.current = true;
    recordDominoes(day, state.result, state.margin);
    setBestMargin(readGames().dominoes.bestMargin);
    if (state.result === 'win') {
      sfx.moonrise();
      haptic(24);
    } else {
      sfx.tier(state.result === 'draw' ? 'draw' : 'lost');
      haptic(12);
    }
  }, [day, state]);

  useEffect(() => {
    if (state.result || state.turn !== 'bot') return;
    const action = dominoBot(
      state,
      level,
      mulberry32(hashSeed('dominoes-bot', day, round, state.chain.length, state.boneyard.length)),
    );
    if (action.kind === 'play') {
      setState(playDomino(state, action.move));
      sfx.place();
      haptic(4);
    } else if (action.kind === 'draw') {
      setState(drawDomino(state));
      sfx.tap();
    } else if (action.kind === 'pass') {
      setState(passDomino(state));
      sfx.blocked();
    }
  }, [day, level, round, state]);

  const play = useCallback(
    (move: DominoMove) => {
      if (state.result || state.turn !== 'player') return;
      const next = playDomino(state, move);
      if (next === state) return;
      setState(next);
      setSelected(null);
      sfx.place();
      haptic(6);
    },
    [state],
  );

  const drawOrPass = useCallback(() => {
    if (state.result || state.turn !== 'player' || playerMoves.length) return;
    if (state.boneyard.length) {
      setState(drawDomino(state));
      sfx.tap();
    } else {
      setState(passDomino(state));
      sfx.blocked();
    }
  }, [playerMoves.length, state]);

  const newGame = useCallback(() => {
    const nextRound = round + 1;
    setRound(nextRound);
    setState(startDominoes(mulberry32(hashSeed('dominoes', day, nextRound))));
    setSelected(null);
    recorded.current = false;
    sfx.tap();
  }, [day, round]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelected(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const status = state.result
    ? state.result === 'win'
      ? t('You win the table — the last tile is yours.')
      : state.result === 'loss'
        ? t('The bot empties its hand first.')
        : t('A blocked table. Equal pips, equal night.')
    : state.turn === 'player'
      ? playerMoves.length
        ? selected
          ? t('Choose an end for {tile}.', { tile: selected })
          : t('Your turn. Pick a lit tile.')
        : state.boneyard.length
          ? t('Nothing fits. Draw from the boneyard.')
          : t('Nothing fits. Pass the table.')
      : t('The bot is reading the ends.');

  return (
    <main className="main">
      <div className="wrap" style={{ maxWidth: 720 }}>
        <ScreenHead
          eyebrow={t('Dominoes · Night {n}', { n: String(day).padStart(3, '0') })}
          title={t('The long table')}
        >
          {t(
            'Double-six dominoes against one patient opponent. Match either open end, draw from the boneyard when nothing fits, and pass when it is empty. Empty your hand first; if both sides are blocked, the lower pip count wins.',
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
          <span className="chess-note">{t('Highest double opens')}</span>
        </div>

        <div className="mini-hud">
          <span className="chip">
            <span className="mono">{state.player.length}</span> {t('your tiles')}
          </span>
          <span className="chip">
            <span className="mono">{state.bot.length}</span> {t('bot tiles')}
          </span>
          <span className="chip">
            <span className="mono">{state.boneyard.length}</span> {t('in the boneyard')}
          </span>
          <span className="chip">
            {t('Your pips')} <span className="mono">{scorePips(state.player)}</span>
          </span>
          <span className="chip">
            {bestMargin === null ? t('No best yet') : t('Best margin +{n}', { n: bestMargin })}
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

        <section className="domino-table" aria-label={t('The domino table')}>
          <div className="domino-ends">
            <span className="chip">
              {t('Left end')} <span className="mono">{state.left ?? '—'}</span>
            </span>
            <span className="chip">
              {t('Right end')} <span className="mono">{state.right ?? '—'}</span>
            </span>
            <span className="chip">{t('The line')} <span className="mono">{state.chain.length}</span></span>
          </div>

          <div className="domino-chain" aria-label={t('Played dominoes, left to right')}>
            {state.chain.length ? (
              state.chain.map((tile, i) => (
                <Tile key={`${tile.id}-${i}`} tile={tile} small label={`${tile.a}–${tile.b}`} />
              ))
            ) : (
              <span className="par-note">{t('The table is empty. Start the line with any tile.')}</span>
            )}
          </div>
        </section>

        <section className="domino-hand-wrap" aria-label={t('Your hand')}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
            <span className="eyebrow">{t('Your hand')}</span>
            <span className="par-note" style={{ margin: 0 }}>
              {t('{n} pips', { n: scorePips(state.player) })}
            </span>
          </div>

          <div className="domino-hand">
            {state.player.map((tile) => {
              const playable = playableIds.has(tile.id) && !state.result && state.turn === 'player';
              return (
                <button
                  key={tile.id}
                  type="button"
                  className={`domino-button${playable ? ' is-playable' : ''}${
                    selected === tile.id ? ' is-selected' : ''
                  }`}
                  aria-label={t('{tile} domino{state}', {
                    tile: `${tile.a}–${tile.b}`,
                    state: playable ? t(', playable') : '',
                  })}
                  aria-pressed={selected === tile.id}
                  onClick={() => {
                    if (!playable) return;
                    setSelected(tile.id);
                    sfx.tap();
                  }}
                  disabled={!playable}
                >
                  <Tile tile={tile} />
                </button>
              );
            })}
          </div>

          {selected && selectedMoves.length ? (
            <div className="domino-choices" role="group" aria-label={t('Choose an open end')}>
              {state.chain.length === 0 ? (
                <button className="btn btn-sm btn-primary" onClick={() => play(selectedMoves[0])}>
                  {t('Start the line')}
                </button>
              ) : (
                <>
                  <button
                    className="btn btn-sm"
                    disabled={!selectedMoves.some((move) => move.end === 'left')}
                    onClick={() => {
                      const move = selectedMoves.find((m) => m.end === 'left');
                      if (move) play(move);
                    }}
                  >
                    {t('Play on left · {n}', { n: state.left ?? '—' })}
                  </button>
                  <button
                    className="btn btn-sm"
                    disabled={!selectedMoves.some((move) => move.end === 'right')}
                    onClick={() => {
                      const move = selectedMoves.find((m) => m.end === 'right');
                      if (move) play(move);
                    }}
                  >
                    {t('Play on right · {n}', { n: state.right ?? '—' })}
                  </button>
                </>
              )}
              <button className="btn btn-sm btn-ghost" onClick={() => setSelected(null)}>
                {t('Cancel')}
              </button>
            </div>
          ) : state.turn === 'player' && !state.result && !playerMoves.length ? (
            <div className="domino-choices">
              <button className="btn btn-sm btn-primary" onClick={drawOrPass}>
                {state.boneyard.length
                  ? t('Draw a tile · {n} left', { n: state.boneyard.length })
                  : t('Pass the table')}
              </button>
            </div>
          ) : null}
        </section>

        <div className="mini-actions">
          <button className="btn btn-sm" onClick={newGame}>
            {t('New game')}
          </button>
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => {
              resetDominoes();
              setBestMargin(null);
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

        {state.result ? (
          <div className="mini-banner" role="status">
            <strong>{status}</strong>
            <button className="btn btn-sm btn-primary" onClick={newGame}>
              {t('Play again')}
            </button>
          </div>
        ) : null}

        <p className="par-note" style={{ marginTop: 14 }}>
          {t('Every tile is a real button. Choose a lit tile, then pick the open end it should join. The line scrolls sideways if it grows past the table.')}
        </p>
      </div>
    </main>
  );
}
