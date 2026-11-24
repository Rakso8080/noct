import { useEffect, useState } from 'react';
import { api, type TodayResponse } from '../lib/api';
import { Countdown } from '../components/ui';
import { HeroWorld, WorldStrip } from '../components/World';
import { dailyRunFor, streakFor, type SurveyRun } from '../lib/surveyStore';
import { dayNumber, nextResetAt } from '../../shared/dates';
import { MAX_SCORE } from '../../shared/score';
import { readGames, type GamesStore } from '../lib/gamesStore';
import { useT } from '../lib/i18n';

interface HomeProps {
  navigate: (path: string) => void;
  onTutorial: () => void;
}

type Shape = 'up' | 'down' | 'diamond' | 'ring';

/** Tiny 8×8 pixel glyphs, so the tiles read like a cartridge menu. */
const SHAPES: Record<Shape, number[][]> = {
  up: [[3, 0, 2], [2, 1, 4], [1, 2, 6], [0, 3, 8], [3, 4, 2], [3, 5, 2], [3, 6, 2]],
  down: [[3, 0, 2], [3, 1, 2], [3, 2, 2], [0, 3, 8], [1, 4, 6], [2, 5, 4], [3, 6, 2]],
  diamond: [[3, 0, 2], [2, 1, 4], [1, 2, 6], [0, 3, 8], [1, 4, 6], [2, 5, 4], [3, 6, 2]],
  ring: [
    [2, 0, 4],
    [1, 1, 2],
    [5, 1, 2],
    [1, 2, 2],
    [5, 2, 2],
    [1, 3, 2],
    [5, 3, 2],
    [1, 4, 2],
    [5, 4, 2],
    [1, 5, 2],
    [5, 5, 2],
    [2, 6, 4],
  ],
};

function PixelIcon({ shape }: { shape: Shape }) {
  return (
    <svg viewBox="0 0 8 8" width="26" height="26" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
      {SHAPES[shape].map(([x, y, w], i) => (
        <rect key={i} x={x} y={y} width={w} height={1} fill="currentColor" />
      ))}
    </svg>
  );
}

interface TileProps {
  index: string;
  kind: string;
  name: string;
  line: string;
  meta: string;
  tone: 'ember' | 'moss' | 'slate' | 'violet' | 'rust' | 'teal' | 'sand' | 'orchard' | 'amber' | 'stone';
  shape: Shape;
  status: string;
  action: string;
  onPlay: () => void;
}

function GameTile({ index, kind, name, line, meta, tone, shape, status, action, onPlay }: TileProps) {
  const t = useT();
  return (
    <article className="game-card" data-tone={tone}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <span className="eyebrow">
          {index} · {t(kind)}
        </span>
        <span className="game-status">{t(status)}</span>
      </div>
      <div className="row gap-10" style={{ alignItems: 'center' }}>
        <span className="game-icon">
          <PixelIcon shape={shape} />
        </span>
        <h2 className="game-name">{t(name)}</h2>
      </div>
      <p className="par-note" style={{ margin: 0, flex: 1 }}>
        {t(line)}
      </p>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 6 }}>
        <span className="par-note mono" style={{ margin: 0, fontSize: '0.9375rem' }}>
          {t(meta)}
        </span>
        <button className="btn btn-sm" onClick={onPlay}>
          {t(action)}
        </button>
      </div>
    </article>
  );
}

export function Home({ navigate, onTutorial }: HomeProps) {
  const t = useT();
  const [today, setToday] = useState<TodayResponse | null>(null);
  const [common, setCommon] = useState<SurveyRun | null>(null);
  const [rare, setRare] = useState<SurveyRun | null>(null);

  const day = dayNumber();
  const [games] = useState<GamesStore>(() => readGames());

  useEffect(() => {
    let alive = true;
    api
      .today()
      .then((t) => {
        if (alive) setToday(t);
      })
      .catch(() => undefined);
    setCommon(dailyRunFor('common', day));
    setRare(dailyRunFor('rare', day));
    return () => {
      alive = false;
    };
  }, [day]);

  const streak = Math.max(streakFor('common', day).current, streakFor('rare', day).current);

  const commonStatus = common ? `${common.score} pts` : 'Unplayed';
  const rareStatus = rare ? `${rare.score} pts` : 'Unplayed';
  const noctStatus = today?.played ? `${today.score}/${MAX_SCORE}` : today?.active ? 'In progress' : 'Unplayed';
  const noctAction = today?.played ? 'See result' : today?.active ? 'Continue' : 'Play';

  const key = String(day);
  const chessDay = games.chess.daily[key];
  const chessSaved = games.chess.saved;
  const minesDay = games.mines.daily[key];
  const pairsDay = games.pairs.daily[key];
  const lightsDay = games.lights.daily[key];

  const chessStatus = chessDay
    ? chessDay.result === 'win'
      ? `Won · ${chessDay.plies} plies`
      : chessDay.result === 'loss'
        ? 'Lost today'
        : 'Drawn today'
    : chessSaved && chessSaved.moves.length
      ? 'In progress'
      : 'Unplayed';
  const minesStatus = minesDay ? (minesDay.won ? `${(minesDay.ms / 1000).toFixed(1)}s` : 'Lost today') : 'Unplayed';
  const pairsStatus = pairsDay ? `${pairsDay.moves} moves` : 'Unplayed';
  const lightsStatus = lightsDay ? `${lightsDay.moves} presses` : 'Unplayed';
  const snakeStatus = games.snake.best === null ? 'Unplayed' : `Best ${games.snake.best} steps`;
  const numbersStatus = games.numbers.bestScore === null ? 'Unplayed' : `Best ${games.numbers.bestScore}`;
  const reversiStatus =
    games.reversi.wins + games.reversi.losses + games.reversi.draws
      ? `${games.reversi.wins}W · ${games.reversi.losses}L`
      : 'Unplayed';

  return (
    <main className="main">
      <div className="wrap">
        <section className="home-hero">
          <HeroWorld />

          <div className="home-hero-inner">
            <div className="hero-hud">
              <span className="hud-pill">{t('Night {n}', { n: String(day).padStart(3, '0') })}</span>
              <span className="hud-pill is-gold">
                <span className="chip-dot" aria-hidden="true" />
                {t('{n}-day streak', { n: streak })}
              </span>
              <span className="hud-pill">
                {t('Next set')} <Countdown to={today ? today.nextResetAt : nextResetAt()} />
              </span>
            </div>

            <h1 className="wordmark">Noct</h1>
            <p className="hero-line">
              {t(
                'Seven boards for the night and three arcade tables behind them. Twenty-five seconds a prompt, one attempt each.',
              )}
            </p>

            <div className="row gap-10" style={{ flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/common')}>
                {t('Play today')}
              </button>
              <button className="btn btn-ghost" onClick={onTutorial}>
                {t('How to play')}
              </button>
            </div>
          </div>
        </section>

        <div className="menu-grid" style={{ marginTop: 20 }} aria-label={t('Choose a game')}>
          <GameTile
            index="01"
            kind="choir"
            name="Common"
            line="The night choir: everyone sings the same note. The loudest answer in the crowd pays best."
            meta="7 prompts · 25s"
            tone="ember"
            shape="up"
            status={commonStatus}
            action={common ? 'See result' : 'Play'}
            onPlay={() => navigate('/common')}
          />
          <GameTile
            index="02"
            kind="hall"
            name="Rare"
            line="The empty hall: one voice in the dark. The quietest answer on the board pays best."
            meta="7 prompts · 25s"
            tone="moss"
            shape="down"
            status={rareStatus}
            action={rare ? 'See result' : 'Play'}
            onPlay={() => navigate('/rare')}
          />
          <GameTile
            index="03"
            kind="lanterns"
            name="Noct"
            line="The lantern grid: four boards of dark windows. One spark per row, column and tone; never let two touch."
            meta="4 boards · 2 min"
            tone="slate"
            shape="diamond"
            status={noctStatus}
            action={noctAction}
            onPlay={() => navigate('/play')}
          />
          <GameTile
            index="04"
            kind="board"
            name="Chess"
            line="Every rule, no clock. Threats, captures and a bot that answers the same for all of us tonight."
            meta="daily bot · 3 levels"
            tone="violet"
            shape="ring"
            status={chessStatus}
            action={chessDay || (chessSaved && chessSaved.moves.length) ? 'Open' : 'Play'}
            onPlay={() => navigate('/chess')}
          />
          <GameTile
            index="05"
            kind="sky"
            name="Mines"
            line="Ten fallen stars under a 9×9 field. The first tap is always safe."
            meta="9×9 · 10 buried stars"
            tone="rust"
            shape="diamond"
            status={minesStatus}
            action={minesDay ? 'Play again' : 'Play'}
            onPlay={() => navigate('/mines')}
          />
          <GameTile
            index="06"
            kind="keepsakes"
            name="Pairs"
            line="Twelve keepsakes face down. Turn two; a match goes on the shelf."
            meta="24 cards · 12 keepsakes"
            tone="teal"
            shape="down"
            status={pairsStatus}
            action={pairsDay ? 'Play again' : 'Play'}
            onPlay={() => navigate('/pairs')}
          />
          <GameTile
            index="07"
            kind="windows"
            name="Lights"
            line="Twenty-five lit windows. Every press flips its neighbours too; each one shut lets a star through."
            meta="5×5 · clear the sky"
            tone="sand"
            shape="up"
            status={lightsStatus}
            action={lightsDay ? 'Play again' : 'Play'}
            onPlay={() => navigate('/lights')}
          />
          <GameTile
            index="08"
            kind="orchard"
            name="Snake"
            line="The glass orchard: one press, one step. Twelve apples before the walls or your tail."
            meta="15×11 · 12 apples"
            tone="orchard"
            shape="up"
            status={snakeStatus}
            action="Play"
            onPlay={() => navigate('/snake')}
          />
          <GameTile
            index="09"
            kind="room"
            name="2048"
            line="The doubling room: slide the lanterns, fuse equals, light a 512 tile."
            meta="4×4 · goal 512"
            tone="amber"
            shape="diamond"
            status={numbersStatus}
            action="Play"
            onPlay={() => navigate('/numbers')}
          />
          <GameTile
            index="10"
            kind="table"
            name="Reversi"
            line="The turning table: trap the bot’s lines, flip the discs, own the most stones."
            meta="8×8 · you are white"
            tone="stone"
            shape="ring"
            status={reversiStatus}
            action="Play"
            onPlay={() => navigate('/reversi')}
          />
        </div>

        <div className="menu-row">
          <button className="tab" onClick={() => navigate('/practice?level=2')}>
            Practice
          </button>
          <button className="tab" onClick={() => navigate('/archive')}>
            Archive
          </button>
          <button className="tab" onClick={() => navigate('/leaderboard')}>
            Standings
          </button>
          <button className="tab" onClick={() => navigate('/stats')}>
            Stats
          </button>
          <button className="tab" onClick={() => navigate('/settings')}>
            Settings
          </button>
        </div>

        <WorldStrip />
      </div>
    </main>
  );
}
