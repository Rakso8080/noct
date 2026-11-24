import { useEffect, useState } from 'react';
import { api, type TodayResponse } from '../lib/api';
import { Countdown } from '../components/ui';
import { HeroWorld, WorldStrip } from '../components/World';
import { dailyRunFor, streakFor, type SurveyRun } from '../lib/surveyStore';
import { dayNumber, nextResetAt } from '../../shared/dates';
import { MAX_SCORE } from '../../shared/score';

interface HomeProps {
  navigate: (path: string) => void;
  onTutorial: () => void;
}

type Shape = 'up' | 'down' | 'diamond';

/** Tiny 8×8 pixel glyphs, so the tiles read like a cartridge menu. */
const SHAPES: Record<Shape, number[][]> = {
  up: [[3, 0, 2], [2, 1, 4], [1, 2, 6], [0, 3, 8], [3, 4, 2], [3, 5, 2], [3, 6, 2]],
  down: [[3, 0, 2], [3, 1, 2], [3, 2, 2], [0, 3, 8], [1, 4, 6], [2, 5, 4], [3, 6, 2]],
  diamond: [[3, 0, 2], [2, 1, 4], [1, 2, 6], [0, 3, 8], [1, 4, 6], [2, 5, 4], [3, 6, 2]],
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
  tone: 'ember' | 'moss' | 'slate';
  shape: Shape;
  status: string;
  action: string;
  onPlay: () => void;
}

function GameTile({ index, kind, name, line, meta, tone, shape, status, action, onPlay }: TileProps) {
  return (
    <article className="game-card" data-tone={tone}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <span className="eyebrow">
          {index} · {kind}
        </span>
        <span className="game-status">{status}</span>
      </div>
      <div className="row gap-10" style={{ alignItems: 'center' }}>
        <span className="game-icon">
          <PixelIcon shape={shape} />
        </span>
        <h2 className="game-name">{name}</h2>
      </div>
      <p className="par-note" style={{ margin: 0, flex: 1 }}>
        {line}
      </p>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 6 }}>
        <span className="par-note mono" style={{ margin: 0, fontSize: '0.9375rem' }}>
          {meta}
        </span>
        <button className="btn btn-sm" onClick={onPlay}>
          {action}
        </button>
      </div>
    </article>
  );
}

export function Home({ navigate, onTutorial }: HomeProps) {
  const [today, setToday] = useState<TodayResponse | null>(null);
  const [common, setCommon] = useState<SurveyRun | null>(null);
  const [rare, setRare] = useState<SurveyRun | null>(null);

  const day = dayNumber();

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

  return (
    <main className="main">
      <div className="wrap">
        <section className="home-hero">
          <HeroWorld />

          <div className="home-hero-inner">
            <div className="hero-hud">
              <span className="hud-pill">Night {String(day).padStart(3, '0')}</span>
              <span className="hud-pill is-gold">
                <span className="chip-dot" aria-hidden="true" />
                {streak}-day streak
              </span>
              <span className="hud-pill">
                Next set <Countdown to={today ? today.nextResetAt : nextResetAt()} />
              </span>
            </div>

            <h1 className="wordmark">Noct</h1>
            <p className="hero-line">
              Three small games, the same for everyone. Twenty-five seconds a prompt, one attempt each.
            </p>

            <div className="row gap-10" style={{ flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/common')}>
                Play today
              </button>
              <button className="btn btn-ghost" onClick={onTutorial}>
                How to play
              </button>
            </div>
          </div>
        </section>

        <div className="menu-grid" style={{ marginTop: 20 }} aria-label="Choose a game">
          <GameTile
            index="01"
            kind="survey"
            name="Common"
            line="Give the answer everybody gives. The obvious one pays best."
            meta="7 prompts · 25s"
            tone="ember"
            shape="up"
            status={commonStatus}
            action={common ? 'See result' : 'Play'}
            onPlay={() => navigate('/common')}
          />
          <GameTile
            index="02"
            kind="survey"
            name="Rare"
            line="Give the answer nobody gives. The loneliest one pays best."
            meta="7 prompts · 25s"
            tone="moss"
            shape="down"
            status={rareStatus}
            action={rare ? 'See result' : 'Play'}
            onPlay={() => navigate('/rare')}
          />
          <GameTile
            index="03"
            kind="grid"
            name="Noct"
            line="One spark in every row, column and tone. Never let two touch."
            meta="4 boards · 2 min"
            tone="slate"
            shape="diamond"
            status={noctStatus}
            action={noctAction}
            onPlay={() => navigate('/play')}
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
