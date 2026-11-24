import { useState } from 'react';
import { dayNumber } from '../../shared/dates';
import { readGames } from '../lib/gamesStore';
import { ScreenHead } from '../components/ui';

interface Entry {
  path: string;
  name: string;
  kind: string;
  line: string;
  tone: string;
  best: (store: ReturnType<typeof readGames>, day: number) => string;
}

const GAMES: Entry[] = [
  {
    path: '/chess',
    name: 'Chess',
    kind: 'board',
    line: 'The quiet board: every rule, a material bar, threats and a bot on three levels.',
    tone: 'violet',
    best: (s) => (s.chess.wins + s.chess.losses + s.chess.draws ? `${s.chess.wins}W · ${s.chess.losses}L · ${s.chess.draws}D` : 'Unplayed'),
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
      return best == null ? 'Unplayed' : `Best ${(best / 1000).toFixed(1)}s`;
    },
  },
  {
    path: '/pairs',
    name: 'Pairs',
    kind: 'keepsakes',
    line: 'The keepsake table: twelve pairs, a shelf for every match, one honest peek.',
    tone: 'teal',
    best: (s) => (s.pairs.bestMoves == null ? 'Unplayed' : `Best ${s.pairs.bestMoves} moves`),
  },
  {
    path: '/lights',
    name: 'Lights',
    kind: 'windows',
    line: 'The observatory windows: solve it, and the sky comes through. Shortest distance shown.',
    tone: 'sand',
    best: (s) => (s.lights.bestMoves == null ? 'Unplayed' : `Best ${s.lights.bestMoves} presses`),
  },
  {
    path: '/snake',
    name: 'Snake',
    kind: 'orchard',
    line: 'The glass orchard: one press, one step, twelve apples before the walls or your tail.',
    tone: 'orchard',
    best: (s) => (s.snake.best == null ? 'Unplayed' : `Best ${s.snake.best} steps`),
  },
  {
    path: '/numbers',
    name: '2048',
    kind: 'room',
    line: 'The doubling room: slide the lanterns, fuse equals, light a 512 tile.',
    tone: 'amber',
    best: (s) =>
      s.numbers.bestScore == null
        ? 'Unplayed'
        : `Best ${s.numbers.bestScore} · tile ${s.numbers.bestTile ?? 0}`,
  },
  {
    path: '/reversi',
    name: 'Reversi',
    kind: 'table',
    line: 'The turning table: trap the bot’s lines, flip the discs, own the most stones.',
    tone: 'stone',
    best: (s) =>
      s.reversi.wins + s.reversi.losses + s.reversi.draws
        ? `Best +${s.reversi.bestMargin ?? 0} · ${s.reversi.wins}W`
        : 'Unplayed',
  },
];

export function Arcade({ navigate }: { navigate: (path: string) => void }) {
  const day = dayNumber();
  const [store] = useState(() => readGames());

  return (
    <main className="main">
      <div className="wrap">
        <ScreenHead eyebrow="Arcade · the side tables" title="Seven games beside the daily">
          Every table is played against the night, not against a scoreboard. Local records stay in this
          browser; each game can reset its own best without touching the others.
        </ScreenHead>

        <div className="menu-grid arcade-grid">
          {GAMES.map((game, i) => (
            <article className="game-card" data-tone={game.tone} key={game.path}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                <span className="eyebrow">
                  {String(i + 1).padStart(2, '0')} · {game.kind}
                </span>
                <span className="game-status">{game.best(store, day)}</span>
              </div>
              <h2 className="game-name">{game.name}</h2>
              <p className="par-note" style={{ margin: 0, flex: 1 }}>
                {game.line}
              </p>
              <div className="row" style={{ justifyContent: 'flex-end', marginTop: 6 }}>
                <button className="btn btn-sm" onClick={() => navigate(game.path)}>
                  Play {game.name}
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
