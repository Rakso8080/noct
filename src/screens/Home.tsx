import { useEffect, useState } from 'react';
import { api, type TodayResponse } from '../lib/api';
import { Countdown } from '../components/ui';
import { PlaceGlyph } from '../components/PlaceGlyph';
import { HeroWorld, WorldFinds, WorldStrip } from '../components/World';
import { dailyRunFor, streakFor, type SurveyRun } from '../lib/surveyStore';
import { dayNumber, nextResetAt } from '../../shared/dates';
import { MAX_SCORE } from '../../shared/score';
import { readGames, type GamesStore } from '../lib/gamesStore';
import {
  nightRoute,
  marksFor,
  recordRouteStamp,
  routeWeather,
  surveySnapshot,
  type PlaceShape,
} from '../lib/atlas';
import { addSighting, readSightings, type SightingId } from '../lib/journal';
import { sfx } from '../lib/audio';
import { useT } from '../lib/i18n';

interface HomeProps {
  navigate: (path: string) => void;
  onTutorial: () => void;
}

interface TileProps {
  index: string;
  kind: string;
  name: string;
  line: string;
  meta: string;
  tone:
    | 'ember'
    | 'moss'
    | 'slate'
    | 'violet'
    | 'rust'
    | 'teal'
    | 'sand'
    | 'orchard'
    | 'amber'
    | 'stone'
    | 'clay'
    | 'channel'
    | 'ivory';
  shape: PlaceShape;
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
          <PlaceGlyph shape={shape} />
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
  const [sightings, setSightings] = useState<SightingId[]>(() => readSightings());
  const weather = routeWeather(day);

  useEffect(() => {
    sfx.soundscape('atlas');
    return () => sfx.soundscape(null);
  }, []);

  const findSighting = (id: SightingId) => {
    if (addSighting(id)) setSightings(readSightings());
  };

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

  const commonStatus = common ? t('{n} pts', { n: common.score }) : t('Unplayed');
  const rareStatus = rare ? t('{n} pts', { n: rare.score }) : t('Unplayed');
  const noctStatus = today?.played
    ? `${today.score}/${MAX_SCORE}`
    : today?.active
      ? t('In progress')
      : t('Unplayed');
  const noctAction = today?.played ? t('See result') : today?.active ? t('Continue') : t('Play');

  const key = String(day);
  const chessDay = games.chess.daily[key];
  const chessSaved = games.chess.saved;
  const minesDay = games.mines.daily[key];
  const pairsDay = games.pairs.daily[key];
  const lightsDay = games.lights.daily[key];

  const chessStatus = chessDay
    ? chessDay.result === 'win'
      ? t('Won · {n} plies', { n: chessDay.plies })
      : chessDay.result === 'loss'
        ? t('Lost today')
        : t('Drawn today')
    : chessSaved && chessSaved.moves.length
      ? t('In progress')
      : t('Unplayed');
  const minesStatus = minesDay
    ? minesDay.won
      ? t('{n}s', { n: (minesDay.ms / 1000).toFixed(1) })
      : t('Lost today')
    : t('Unplayed');
  const pairsStatus = pairsDay ? t('{n} moves', { n: pairsDay.moves }) : t('Unplayed');
  const lightsStatus = lightsDay ? t('{n} presses', { n: lightsDay.moves }) : t('Unplayed');
  const snakeStatus =
    games.snake.best === null ? t('Unplayed') : t('Best {n} steps', { n: games.snake.best });
  const numbersStatus =
    games.numbers.bestScore === null ? t('Unplayed') : t('Best {n}', { n: games.numbers.bestScore });
  const reversiStatus =
    games.reversi.wins + games.reversi.losses + games.reversi.draws
      ? t('{wins}W · {losses}L', {
          wins: games.reversi.wins,
          losses: games.reversi.losses,
        })
      : t('Unplayed');
  const checkersDay = games.checkers.daily[key];
  const connect4Day = games.connect4.daily[key];
  const dominoesDay = games.dominoes.daily[key];
  const checkersStatus = checkersDay
    ? checkersDay.result === 'win'
      ? t('Won · {n} plies', { n: checkersDay.plies })
      : checkersDay.result === 'loss'
        ? t('Lost today')
        : t('Drawn today')
    : games.checkers.wins + games.checkers.losses + games.checkers.draws
      ? t('{wins}W · {losses}L', { wins: games.checkers.wins, losses: games.checkers.losses })
      : t('Unplayed');
  const connect4Status = connect4Day
    ? connect4Day.result === 'win'
      ? t('Won · {n} drops', { n: connect4Day.moves })
      : connect4Day.result === 'loss'
        ? t('Lost today')
        : t('Drawn today')
    : games.connect4.wins + games.connect4.losses + games.connect4.draws
      ? t('{wins}W · {losses}L', { wins: games.connect4.wins, losses: games.connect4.losses })
      : t('Unplayed');
  const dominoesStatus = dominoesDay
    ? dominoesDay.result === 'win'
      ? t('Won · +{n}', { n: dominoesDay.margin })
      : dominoesDay.result === 'loss'
        ? t('Lost today')
        : t('Drawn today')
    : games.dominoes.wins + games.dominoes.losses + games.dominoes.draws
      ? t('{wins}W · {losses}L', { wins: games.dominoes.wins, losses: games.dominoes.losses })
      : t('Unplayed');

  const route = nightRoute(day);
  const routeSources = {
    day,
    games,
    common: surveySnapshot('common', day),
    rare: surveySnapshot('rare', day),
    noct: {
      playedToday: Boolean(today?.played),
      activeToday: Boolean(today?.active),
      bestScore: null,
      completedDays: 0,
    },
  };
  const routeMarks = route.map((place) => marksFor(place.id, routeSources));
  const routeDone = routeMarks.every((marks) => marks.night);

  useEffect(() => {
    if (routeDone) recordRouteStamp(day);
  }, [day, routeDone]);

  return (
    <main className="main">
      <div className="wrap">
        <section className="home-hero">
          <HeroWorld />
          <WorldFinds variant="hero" found={sightings} onFind={findSighting} />

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
                'Thirteen places on one road: seven nightly boards and six side tables. Twenty-five seconds a prompt, one attempt each.',
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

        <section className={`home-road${routeDone ? ' is-complete' : ''}`} aria-labelledby="home-road-title">
          <div className="home-road-head">
            <div>
              <span className="eyebrow">{t('Tonight’s road')}</span>
              <h2 id="home-road-title">{t('Three stops, one night')}</h2>
              <p className="atlas-weather-line">
                <span className="atlas-weather-dot" data-weather={weather.id} aria-hidden="true" />
                {t('Tonight: {weather}', { weather: t(weather.name) })}
              </p>
            </div>
            <button className="btn btn-sm btn-ghost" onClick={() => navigate('/atlas')}>
              {t('Open the atlas')}
            </button>
          </div>
          <ol className="home-road-list">
            {route.map((place, index) => {
              const marks = routeMarks[index];
              const lit = Boolean(marks?.night);
              return (
                <li key={place.id}>
                  <button
                    type="button"
                    className={`home-road-stop${lit ? ' is-lit' : ''}`}
                    onClick={() => navigate(place.path)}
                    aria-label={`${t('Open {name}', { name: t(place.name) })} — ${t(lit ? 'Lit' : 'Not yet')}`}
                  >
                    <span className="home-road-number">0{index + 1}</span>
                    <span className="home-road-copy">
                      <strong>{t(place.name)}</strong>
                      <small>{t(place.placeName)}</small>
                    </span>
                    <span className="home-road-state">{t(lit ? 'Lit' : 'Not yet')}</span>
                  </button>
                </li>
              );
            })}
          </ol>
          <p className="par-note home-road-note">
            {routeDone
              ? t('The road is sealed for tonight. It will be a different three stops tomorrow.')
              : t('A suggestion, not a duty: no streak, no lock, no penalty. Play one stop or all three.')}
          </p>
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
            line="Every rule, no clock. Face tonight’s bot, or open a private table and send a friend the code."
            meta="bot · private room"
            tone="violet"
            shape="rook"
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
            shape="star"
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
            shape="cards"
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
            shape="window"
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
            shape="apple"
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
            shape="spark"
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
          <GameTile
            index="11"
            kind="draughts"
            name="Checkers"
            line="The quiet draughts table: forced captures, long jump chains and a crown waiting on the far rank."
            meta="8×8 · forced captures"
            tone="clay"
            shape="crown"
            status={checkersStatus}
            action="Play"
            onPlay={() => navigate('/checkers')}
          />
          <GameTile
            index="12"
            kind="columns"
            name="Connect Four"
            line="The lantern column: drop, stack and line up four before the bot seals the middle."
            meta="7×6 · four in a row"
            tone="channel"
            shape="drop"
            status={connect4Status}
            action="Play"
            onPlay={() => navigate('/connect4')}
          />
          <GameTile
            index="13"
            kind="line"
            name="Dominoes"
            line="The long table: match either open end, draw from the boneyard, and empty your hand first."
            meta="double-six · one opponent"
            tone="ivory"
            shape="domino"
            status={dominoesStatus}
            action="Play"
            onPlay={() => navigate('/dominoes')}
          />
        </div>

        <div className="menu-row">
          <button className="tab" onClick={() => navigate('/atlas')}>
            {t('Atlas')}
          </button>
          <button className="tab" onClick={() => navigate('/practice?level=2')}>
            {t('Practice')}
          </button>
          <button className="tab" onClick={() => navigate('/archive')}>
            {t('Archive')}
          </button>
          <button className="tab" onClick={() => navigate('/leaderboard')}>
            {t('Standings')}
          </button>
          <button className="tab" onClick={() => navigate('/stats')}>
            {t('Stats')}
          </button>
          <button className="tab" onClick={() => navigate('/settings')}>
            {t('Settings')}
          </button>
        </div>

        <div className="world-strip-frame">
          <WorldStrip />
          <WorldFinds variant="strip" found={sightings} onFind={findSighting} />
        </div>
      </div>
    </main>
  );
}
