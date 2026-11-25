import { useState } from 'react';
import { dayNumber } from '../../shared/dates';
import { dayStreak, readGames, type GamesStore } from '../lib/gamesStore';
import { ScreenHead } from '../components/ui';
import { translate, useT } from '../lib/i18n';

interface Entry {
  path: string;
  name: string;
  kind: string;
  line: string;
  tone: string;
  best: (store: GamesStore, day: number) => string;
  today: (store: GamesStore, day: number) => string | null;
}

function minutes(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

function arcadeDays(store: GamesStore): number[] {
  return [
    ...Object.keys(store.snake.daily),
    ...Object.keys(store.numbers.daily),
    ...Object.keys(store.reversi.daily),
    ...Object.keys(store.checkers.daily),
    ...Object.keys(store.connect4.daily),
    ...Object.keys(store.dominoes.daily),
  ].map(Number);
}

const GAMES: Entry[] = [
  {
    path: '/chess',
    name: 'Chess',
    kind: 'board',
    line: 'The quiet board: every rule, a material bar, threats, a bot on three levels and private tables for a friend.',
    tone: 'violet',
    best: (s) =>
      s.chess.wins + s.chess.losses + s.chess.draws
        ? translate('{wins}W · {losses}L · {draws}D', {
            wins: s.chess.wins,
            losses: s.chess.losses,
            draws: s.chess.draws,
          })
        : translate('Unplayed'),
    today: (s, day) => {
      const entry = s.chess.daily[String(day)];
      if (!entry) return null;
      return entry.result === 'win'
        ? translate('Won in {plies} plies', { plies: entry.plies })
        : translate(entry.result === 'loss' ? 'Lost today' : 'Drawn today');
    },
  },
  {
    path: '/mines',
    name: 'Mines',
    kind: 'sky',
    line: 'The buried sky: ten fallen stars, a safe first tap, chording and a take-back.',
    tone: 'rust',
    best: (s, day) => {
      const today = s.mines.best[String(day)];
      const best = today ?? s.mines.bestFree;
      return best == null ? translate('Unplayed') : translate('Best {n}', { n: minutes(best) });
    },
    today: (s, day) => {
      const entry = s.mines.daily[String(day)];
      if (!entry) return null;
      return entry.won
        ? translate('Cleared in {time}', { time: minutes(entry.ms) })
        : translate('Lost today');
    },
  },
  {
    path: '/pairs',
    name: 'Pairs',
    kind: 'keepsakes',
    line: 'The keepsake table: twelve pairs, a shelf for every match, one honest peek.',
    tone: 'teal',
    best: (s) =>
      s.pairs.bestMoves == null
        ? translate('Unplayed')
        : translate('Best {n} moves', { n: s.pairs.bestMoves }),
    today: (s, day) => {
      const entry = s.pairs.daily[String(day)];
      return entry ? translate('{n} moves', { n: entry.moves }) : null;
    },
  },
  {
    path: '/lights',
    name: 'Lights',
    kind: 'windows',
    line: 'The observatory windows: solve it, and the sky comes through. Shortest distance shown.',
    tone: 'sand',
    best: (s) =>
      s.lights.bestMoves == null
        ? translate('Unplayed')
        : translate('Best {n} presses', { n: s.lights.bestMoves }),
    today: (s, day) => {
      const entry = s.lights.daily[String(day)];
      return entry ? translate('{n} presses', { n: entry.moves }) : null;
    },
  },
  {
    path: '/snake',
    name: 'Snake',
    kind: 'orchard',
    line: 'The glass orchard: one press, one step, twelve apples before the walls or your tail.',
    tone: 'orchard',
    best: (s) =>
      s.snake.best == null && s.snake.wins === 0
        ? translate('Unplayed')
        : translate('Best {steps} steps · {wins}W', {
            steps: s.snake.best ?? '—',
            wins: s.snake.wins,
          }),
    today: (s, day) => {
      const entry = s.snake.daily[String(day)];
      if (!entry) return null;
      return entry.won
        ? translate('Cleared in {steps} steps', { steps: entry.steps })
        : translate('{apples} apples · {steps} steps', { apples: entry.apples, steps: entry.steps });
    },
  },
  {
    path: '/numbers',
    name: '2048',
    kind: 'room',
    line: 'The doubling room: slide the lanterns, fuse equals, light a 512 tile.',
    tone: 'amber',
    best: (s) =>
      s.numbers.bestScore == null
        ? translate('Unplayed')
        : translate('Best {score} · tile {tile} · {wins}W', {
            score: s.numbers.bestScore,
            tile: s.numbers.bestTile ?? 0,
            wins: s.numbers.wins,
          }),
    today: (s, day) => {
      const entry = s.numbers.daily[String(day)];
      if (!entry) return null;
      return translate('{score} points · tile {tile}', { score: entry.score, tile: entry.tile });
    },
  },
  {
    path: '/reversi',
    name: 'Reversi',
    kind: 'table',
    line: 'The turning table: trap the bot’s lines, flip the discs, own the most stones.',
    tone: 'stone',
    best: (s) =>
      s.reversi.wins + s.reversi.losses + s.reversi.draws
        ? translate('Best +{margin} · {wins}W/{losses}L', {
            margin: s.reversi.bestMargin ?? 0,
            wins: s.reversi.wins,
            losses: s.reversi.losses,
          })
        : translate('Unplayed'),
    today: (s, day) => {
      const entry = s.reversi.daily[String(day)];
      if (!entry) return null;
      return translate('{margin} · {discs} discs', {
        margin: `${entry.margin >= 0 ? '+' : ''}${entry.margin}`,
        discs: entry.discs,
      });
    },
  },
  {
    path: '/checkers',
    name: 'Checkers',
    kind: 'draughts',
    line: 'The quiet draughts table: forced captures, long jump chains, crowns and a patient bot.',
    tone: 'clay',
    best: (s) =>
      s.checkers.wins + s.checkers.losses + s.checkers.draws
        ? translate('{wins}W · {losses}L · {draws}D', {
            wins: s.checkers.wins,
            losses: s.checkers.losses,
            draws: s.checkers.draws,
          })
        : translate('Unplayed'),
    today: (s, day) => {
      const entry = s.checkers.daily[String(day)];
      if (!entry) return null;
      return translate(entry.result === 'win' ? 'Won in {plies} plies' : entry.result === 'loss' ? 'Lost today' : 'Drawn today', {
        plies: entry.plies,
      });
    },
  },
  {
    path: '/connect4',
    name: 'Connect Four',
    kind: 'columns',
    line: 'The lantern column: gravity, seven choices, and four in a row in any direction.',
    tone: 'channel',
    best: (s) =>
      s.connect4.wins + s.connect4.losses + s.connect4.draws
        ? translate('{wins}W · {losses}L · {draws}D', {
            wins: s.connect4.wins,
            losses: s.connect4.losses,
            draws: s.connect4.draws,
          })
        : translate('Unplayed'),
    today: (s, day) => {
      const entry = s.connect4.daily[String(day)];
      if (!entry) return null;
      return translate(entry.result === 'win' ? 'Won in {moves} drops' : entry.result === 'loss' ? 'Lost today' : 'Drawn today', {
        moves: entry.moves,
      });
    },
  },
  {
    path: '/dominoes',
    name: 'Dominoes',
    kind: 'line',
    line: 'The long table: double-six, a boneyard, two open ends and one opponent.',
    tone: 'ivory',
    best: (s) =>
      s.dominoes.wins + s.dominoes.losses + s.dominoes.draws
        ? translate('{wins}W · {losses}L · {draws}D', {
            wins: s.dominoes.wins,
            losses: s.dominoes.losses,
            draws: s.dominoes.draws,
          })
        : translate('Unplayed'),
    today: (s, day) => {
      const entry = s.dominoes.daily[String(day)];
      if (!entry) return null;
      return translate(entry.result === 'win' ? 'Won · +{margin}' : entry.result === 'loss' ? 'Lost today' : 'Drawn today', {
        margin: entry.margin,
      });
    },
  },
];

export function Arcade({ navigate }: { navigate: (path: string) => void }) {
  const t = useT();
  const day = dayNumber();
  const [store] = useState(() => readGames());
  const streak = dayStreak(arcadeDays(store), day);
  const played = GAMES.filter((game) => game.today(store, day) !== null).length;

  return (
    <main className="main arcade-main">
      <span className="arcade-camp" aria-hidden="true">
        <i className="arcade-post" />
        <i className="arcade-sign arcade-sign--a" />
        <i className="arcade-sign arcade-sign--b" />
        <i className="arcade-fire" />
      </span>
      <div className="wrap">
        <ScreenHead eyebrow="Arcade · the side tables" title="Ten games beside the daily">
          Every table is played against the night, not against a scoreboard. Local records stay in this
          browser; each arcade table can reset its own best without touching the others.
        </ScreenHead>

        <div className="row gap-10" style={{ flexWrap: 'wrap', marginBottom: 16 }}>
          <span className="chip chip-ember">
            {streak > 0
              ? t('{n}-day arcade streak', { n: streak })
              : t('No arcade streak yet')}
          </span>
          <span className="chip">
            {t('{n} of {total} played today', { n: played, total: GAMES.length })}
          </span>
          <span className="chip">{t('Today and all-time, side by side')}</span>
        </div>

        <div className="menu-grid arcade-grid">
          {GAMES.map((game, i) => (
            <article className="game-card" data-tone={game.tone} key={game.path}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                <span className="eyebrow">
                  {String(i + 1).padStart(2, '0')} · {t(game.kind)}
                </span>
                <span className="game-status">{t(game.best(store, day))}</span>
              </div>
              <h2 className="game-name">{t(game.name)}</h2>
              <p className="par-note" style={{ margin: 0, flex: 1 }}>
                {t(game.line)}
              </p>
              <p className="par-note game-today" style={{ margin: 0 }}>
                {game.today(store, day) ?? t('Not played today')}
              </p>
              <div className="row" style={{ justifyContent: 'flex-end', marginTop: 6 }}>
                <button className="btn btn-sm" onClick={() => navigate(game.path)}>
                  {game.today(store, day)
                    ? t('Play {name} again', { name: t(game.name) })
                    : t('Play {name}', { name: t(game.name) })}
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
