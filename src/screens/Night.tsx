import { useEffect, useMemo, useState } from 'react';
import { dayNumber, dayToISO } from '../../shared/dates';
import { marksFor, nightRoute, routeWeather, surveySnapshot } from '../lib/atlas';
import { nightDispatch, seasonNight, SEASON_LENGTH } from '../lib/dispatch';
import { readGames } from '../lib/gamesStore';
import { getLang, useT } from '../lib/i18n';
import { PlaceGlyph } from '../components/PlaceGlyph';
import { PlaceScene } from '../components/PlaceScene';
import { ScreenHead, formatDay } from '../components/ui';
import { api, type TodayResponse } from '../lib/api';
import { sfx } from '../lib/audio';

function parseDay(today: number): number {
  const raw = new URLSearchParams(window.location.search).get('day');
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 1) return today;
  return Math.min(today, Math.max(1, Math.floor(value)));
}

export function Night({ navigate }: { navigate: (path: string) => void }) {
  const t = useT();
  const today = dayNumber();
  const day = parseDay(today);
  const lang = getLang();
  const weather = routeWeather(day);
  const route = nightRoute(day);
  const [todayState, setTodayState] = useState<TodayResponse | null>(null);
  const [games] = useState(() => readGames());

  useEffect(() => {
    sfx.soundscape('atlas');
    return () => sfx.soundscape(null);
  }, []);

  useEffect(() => {
    if (day !== today) {
      setTodayState(null);
      return;
    }
    let alive = true;
    api
      .today()
      .then((value) => {
        if (alive) setTodayState(value);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [day, today]);

  const dispatch = useMemo(
    () =>
      nightDispatch({
        day,
        weatherName: t(weather.name),
        stops: route.map((place) => t(place.placeName)),
        lang,
      }),
    [day, lang, route, t, weather.name],
  );

  const sources = useMemo(
    () => ({
      day,
      games,
      common: surveySnapshot('common', day),
      rare: surveySnapshot('rare', day),
      noct: {
        playedToday: Boolean(todayState?.played) && day === today,
        activeToday: Boolean(todayState?.active) && day === today,
        bestScore: todayState?.score ?? null,
        completedDays: todayState?.played ? 1 : 0,
      },
    }),
    [day, games, today, todayState],
  );

  const marks = route.map((place) => marksFor(place.id, sources));
  const lit = marks.filter((mark) => mark.night).length;
  const { season, night } = seasonNight(day);
  const firstStop = route[0];

  const points =
    (sources.common.today?.score ?? 0) + (sources.rare.today?.score ?? 0) + (todayState?.score ?? 0);

  const neighbours = [day - 1, day + 1].filter((value) => value > 0 && value <= today);
  const recent = Array.from({ length: 7 }, (_, index) => day - 6 + index).filter(
    (value) => value > 0 && value <= today,
  );

  function openDay(value: number): void {
    sfx.tap();
    window.history.pushState({}, '', `?day=${value}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  return (
    <main className="main night-main">
      <div className="wrap" style={{ maxWidth: 820 }}>
        <PlaceScene place={firstStop.id} weather={weather.id} variant="band" className="night-band" />

        <div className="night-masthead">
          <ScreenHead
            eyebrow={t('The Long Road · Volume {season} · Night {n}', {
              season,
              n: String(night).padStart(2, '0'),
            })}
            title={t('Night {n}', { n: String(day).padStart(3, '0') })}
          >
            {formatDay(dayToISO(day))} · {t(weather.name)}
          </ScreenHead>
        </div>

        <article className="night-dispatch">
          <div className="night-voice">
            <span className="eyebrow">{t(dispatch.title)}</span>
            <span className="night-voice-rule" aria-hidden="true" />
          </div>
          <p className="night-body">{dispatch.body}</p>
        </article>

        <section className="night-road" aria-labelledby="night-road-title">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
            <h2 id="night-road-title" style={{ fontSize: 'var(--step-1)' }}>
              {t('Tonight’s three stops')}
            </h2>
            <span className="chip">
              {t('{n} of 3 lit', { n: lit })}
            </span>
          </div>
          <ol className="night-stops">
            {route.map((place, index) => (
              <li key={place.id}>
                <button
                  type="button"
                  className={`night-stop${marks[index]?.night ? ' is-lit' : ''}`}
                  onClick={() => {
                    sfx.tap();
                    navigate(place.path);
                  }}
                >
                  <span className="night-stop-index">0{index + 1}</span>
                  <span className="night-stop-glyph">
                    <PlaceGlyph shape={place.shape} size={20} />
                  </span>
                  <span className="night-stop-copy">
                    <strong>{t(place.name)}</strong>
                    <small>{t(place.placeName)}</small>
                  </span>
                  <span className="night-stop-state">{t(marks[index]?.night ? 'Lit' : 'Not yet')}</span>
                </button>
              </li>
            ))}
          </ol>
        </section>

        <section className="night-you" aria-label={t('Your line')}>
          <span className="eyebrow">{t('Your line')}</span>
          <p>
            {day === today ? (
              lit > 0 || points > 0 ? (
                <>
                  {t('You lit {lit} of 3 stops tonight', { lit })}
                  {points > 0 ? <> · {t('{n} points across the night', { n: points })}</> : null}
                  {todayState?.streak ? <> · {t('{n}-day streak', { n: todayState.streak })}</> : null}
                </>
              ) : (
                <>{t('You have not lit a stop tonight. The road is still open until midnight.')}</>
              )
            ) : (
              <>
                {t('This night kept {lit} lit stops in this browser. The dispatch stays the same; only your line changes.', {
                  lit,
                })}
              </>
            )}
          </p>
          <div className="row gap-10" style={{ flexWrap: 'wrap', marginTop: 10 }}>
            <button className="btn btn-sm btn-primary" onClick={() => navigate('/play')}>
              {t('Play today’s board')}
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => navigate('/atlas')}>
              {t('Open the atlas')}
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => navigate('/common')}>
              {t('Enter the choir')}
            </button>
          </div>
        </section>

        <nav className="night-nav" aria-label={t('The season')}>
          <div className="row gap-10" style={{ flexWrap: 'wrap' }}>
            {day > 1 ? (
              <button className="btn btn-sm btn-ghost" onClick={() => openDay(day - 1)}>
                ← {t('Night {n}', { n: day - 1 })}
              </button>
            ) : null}
            {day < today ? (
              <button className="btn btn-sm btn-ghost" onClick={() => openDay(day + 1)}>
                {t('Night {n}', { n: day + 1 })} →
              </button>
            ) : null}
            <span className="night-nav-count">
              {t('Volume {season} · {n} of {total} nights written', {
                season,
                n: night,
                total: SEASON_LENGTH,
              })}
            </span>
          </div>
          <ol className="night-recent" aria-label={t('The last seven nights')}>
            {recent.map((value) => (
              <li key={value}>
                <button
                  type="button"
                  aria-current={value === day ? 'page' : undefined}
                  data-current={value === day ? 'true' : 'false'}
                  onClick={() => openDay(value)}
                >
                  <span className="mono">{String(value).padStart(3, '0')}</span>
                  <small>{formatDay(dayToISO(value))}</small>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <p className="par-note night-foot">
          {t(
            'Dispatches are written from the night, not from your score: the same date reads the same everywhere. Your line is the only part that is yours.',
          )}
          {neighbours.length === 0 ? ` ${t('This is the first night of the road.')}` : ''}
        </p>
      </div>
    </main>
  );
}
