import { useEffect, useMemo, useState } from 'react';
import { api, type StatsResponse, type TodayResponse } from '../lib/api';
import { dayNumber, dayToISO } from '../../shared/dates';
import { PlaceGlyph } from '../components/PlaceGlyph';
import { ScreenHead, formatDay } from '../components/ui';
import { useLang, useT } from '../lib/i18n';
import { readGames } from '../lib/gamesStore';
import { sfx } from '../lib/audio';
import { PlaceScene } from '../components/PlaceScene';
import {
  PAGE_TIER_LABEL,
  SIGHTINGS,
  journalProgress,
  pageIsUnlocked,
  pageText,
  pagesFor,
  readSightings,
} from '../lib/journal';
import {
  CHAPTERS,
  PLACES,
  PLACE_BY_ID,
  allPlaceViews,
  nightRoute,
  noctSnapshot,
  placesForChapter,
  readRouteStamps,
  recordRouteStamp,
  routeComplete,
  routeLitCount,
  routeWeather,
  surveySnapshot,
  type PlaceId,
  type PlaceView,
} from '../lib/atlas';

function placeMarksTone(marks: PlaceView['marks']): string {
  const count = Number(marks.waymark) + Number(marks.night) + Number(marks.keepsake);
  return String(count);
}

export function Atlas({ navigate }: { navigate: (path: string) => void }) {
  const t = useT();
  const lang = useLang();
  const day = dayNumber();
  const [games] = useState(() => readGames());
  const [today, setToday] = useState<TodayResponse | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [selected, setSelected] = useState<PlaceId>(() => {
    const requested = new URLSearchParams(window.location.search).get('place');
    return requested && requested in PLACE_BY_ID
      ? (requested as PlaceId)
      : nightRoute(day)[0]?.id ?? 'common';
  });
  const [stamps, setStamps] = useState<number[]>(() => readRouteStamps());
  const [sightings] = useState(() => readSightings());
  const weather = routeWeather(day);

  useEffect(() => {
    sfx.soundscape('atlas');
    return () => sfx.soundscape(null);
  }, []);

  useEffect(() => {
    let alive = true;
    api
      .today()
      .then((value) => {
        if (alive) setToday(value);
      })
      .catch(() => undefined);
    api
      .stats()
      .then((value) => {
        if (alive) setStats(value);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [day]);

  const sources = useMemo(
    () => ({
      day,
      games,
      common: surveySnapshot('common', day),
      rare: surveySnapshot('rare', day),
      noct: noctSnapshot(today, stats),
    }),
    [day, games, today, stats],
  );
  const views = useMemo(() => allPlaceViews(sources), [sources]);
  const viewById = useMemo(() => new Map(views.map((view) => [view.id, view])), [views]);
  const route = useMemo(() => nightRoute(day), [day]);
  const routeViews = route
    .map((place) => viewById.get(place.id))
    .filter((view): view is PlaceView => Boolean(view));
  const routeDone = routeComplete(routeViews);
  const routeLit = routeLitCount(routeViews);
  const totalMarks = views.reduce(
    (sum, view) => sum + Number(view.marks.waymark) + Number(view.marks.night) + Number(view.marks.keepsake),
    0,
  );
  const nightCount = views.filter((view) => view.marks.night).length;
  const keepsakeCount = views.filter((view) => view.marks.keepsake).length;
  const selectedView = viewById.get(selected) ?? views[0];
  const selectedChapter = CHAPTERS.find((chapter) => chapter.id === selectedView.chapter) ?? CHAPTERS[0];
  const progress = journalProgress(sources, sightings);
  const selectedNumber = PLACES.findIndex((place) => place.id === selectedView.id) + 1;
  const selectedRouteIndex = route.findIndex((place) => place.id === selectedView.id);

  useEffect(() => {
    if (!routeDone) return;
    if (recordRouteStamp(day)) setStamps(readRouteStamps());
  }, [day, routeDone]);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('place');
    if (!requested || !window.matchMedia('(max-width: 760px)').matches) return;
    document.getElementById('atlas-detail')?.scrollIntoView({ block: 'start', behavior: 'auto' });
  }, []);

  const selectPlace = (id: PlaceId) => {
    setSelected(id);
    if (window.matchMedia('(max-width: 760px)').matches) {
      document.getElementById('atlas-detail')?.scrollIntoView({ block: 'start', behavior: 'auto' });
    }
  };

  return (
    <main className="main atlas-main">
      <div className="wrap">
        <div className="atlas-plate">
          <ScreenHead eyebrow="The Hollow Atlas" title="The Long Road">
            {t(
              'Nineteen places on one road: seven nightly boards and twelve side tables. The map only remembers what you have already played.',
            )}
          </ScreenHead>
          <span className="atlas-compass" aria-hidden="true">
            <i />
            <i />
          </span>
        </div>

        <div className="atlas-summary" aria-label={t('The road so far')}>
          <span className="chip chip-ember">
            <span className="mono">{totalMarks}</span> / {PLACES.length * 3} {t('marks')}
          </span>
          <span className="chip">
            <span className="mono">{nightCount}</span> {t('lit tonight')}
          </span>
          <span className="chip">
            <span className="mono">{keepsakeCount}</span> {t('keepsakes')}
          </span>
        </div>

        <section className={`atlas-route${routeDone ? ' is-complete' : ''}`} aria-labelledby="atlas-route-title">
          <div className="atlas-route-head">
            <div>
              <span className="eyebrow">{t('Tonight’s road')}</span>
              <h2 id="atlas-route-title">{t('Three stops, one night')}</h2>
              <p className="atlas-weather-line" aria-label={t('Weather over the road')}>
                <span className="atlas-weather-dot" data-weather={weather.id} aria-hidden="true" />
                <strong>{t(weather.name)}</strong> — {t(weather.note)}
              </p>
            </div>
            <span className="atlas-route-count">
              {routeDone ? t('Sealed for tonight') : t('{n} of 3 lit', { n: routeLit })}
            </span>
          </div>
          <ol className="atlas-route-list">
            {route.map((place, index) => {
              const view = viewById.get(place.id);
              const lit = Boolean(view?.marks.night);
              return (
                <li key={place.id}>
                  <button
                    type="button"
                    className={`atlas-route-stop${lit ? ' is-lit' : ''}`}
                    onClick={() => selectPlace(place.id)}
                    aria-current={lit ? 'step' : undefined}
                  >
                    <span className="atlas-route-number">0{index + 1}</span>
                    <span className="atlas-route-copy">
                      <strong>{t(place.name)}</strong>
                      <small>{t(place.placeName)}</small>
                    </span>
                    <span className="atlas-route-state">{lit ? t('Lit') : t('Not yet')}</span>
                  </button>
                </li>
              );
            })}
          </ol>
          <p className="par-note atlas-route-note">
            {routeDone
              ? t('The road is sealed for tonight. It will be a different three stops tomorrow.')
              : t('A suggestion, not a duty: no streak, no lock, no penalty. Play one stop or all three.')}
          </p>
        </section>

        <div className="atlas-layout">
          <section className="atlas-fold" aria-label={t('The map of nineteen places')}>
            <span className="atlas-fold-corner atlas-fold-corner--tl" aria-hidden="true" />
            <span className="atlas-fold-corner atlas-fold-corner--br" aria-hidden="true" />
            <div className="atlas-chapters">
              {CHAPTERS.map((chapter) => {
                const places = placesForChapter(chapter.id);
                return (
                  <section className="atlas-chapter" key={chapter.id} aria-labelledby={`atlas-chapter-${chapter.id}`}>
                    <header className="atlas-chapter-head">
                      <span className="atlas-numeral" aria-hidden="true">
                        {chapter.numeral}
                      </span>
                      <div>
                        <span className="eyebrow">{t('Chapter')} {chapter.numeral}</span>
                        <h2 id={`atlas-chapter-${chapter.id}`}>{t(chapter.name)}</h2>
                        <p className="par-note">{t(chapter.note)}</p>
                      </div>
                    </header>
                    <ol className="atlas-stops">
                      {places.map((place) => {
                        const view = viewById.get(place.id);
                        if (!view) return null;
                        const markCount =
                          Number(view.marks.waymark) +
                          Number(view.marks.night) +
                          Number(view.marks.keepsake);
                        return (
                          <li key={place.id}>
                            <button
                              type="button"
                              className="atlas-place"
                              data-night={view.marks.night ? 'true' : 'false'}
                              data-marks={placeMarksTone(view.marks)}
                              data-selected={selected === place.id ? 'true' : 'false'}
                              aria-pressed={selected === place.id}
                              aria-current={route.some((stop) => stop.id === place.id) ? 'step' : undefined}
                              aria-label={`${t(place.name)}, ${t(place.placeName)} — ${t('{n} of 3 marks', { n: markCount })}`}
                              onClick={() => selectPlace(place.id)}
                            >
                              <span className="atlas-place-index">
                                {String(PLACES.findIndex((item) => item.id === place.id) + 1).padStart(2, '0')}
                              </span>
                              <span className="atlas-place-glyph">
                                <PlaceGlyph shape={place.shape} size={22} />
                              </span>
                              <span className="atlas-place-copy">
                                <strong>{t(place.name)}</strong>
                                <small>{t(place.placeName)}</small>
                              </span>
                              <span className="atlas-marks" aria-hidden="true">
                                <i className={view.marks.waymark ? 'is-on' : ''} />
                                <i className={view.marks.night ? 'is-on' : ''} />
                                <i className={view.marks.keepsake ? 'is-on' : ''} />
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ol>
                  </section>
                );
              })}
            </div>
            <p className="atlas-marginalia">{t('The map is drawn by walking it.')}</p>
          </section>

          <aside className="atlas-detail" id="atlas-detail" aria-live="polite">
            <span className="eyebrow">
              {t('Place {n} · {chapter}', {
                n: selectedNumber,
                chapter: t(selectedChapter.name),
              })}
            </span>
            <div className="atlas-detail-title">
              <span className="atlas-art-plate" data-place={selectedView.id}>
                <PlaceScene place={selectedView.id} weather={weather.id} variant="plate" />
              </span>
              <div>
                <h2>{t(selectedView.placeName)}</h2>
                <p className="atlas-detail-name">{t(selectedView.name)}</p>
              </div>
            </div>
            <p className="atlas-detail-note">{t(selectedView.note)}</p>

            <div className="atlas-detail-record">
              <span className="eyebrow">{t('The record')}</span>
              <strong>
                {selectedView.record
                  ? t(selectedView.record.key, selectedView.record.vars)
                  : t('No record yet')}
              </strong>
              <span className="par-note">
                {selectedView.marks.night ? t('Played tonight') : t('Not played today')}
              </span>
            </div>

            <ul className="atlas-mark-list">
              <li data-on={selectedView.marks.waymark ? 'true' : 'false'}>
                <span className="atlas-mark-dot" aria-hidden="true" />
                <span>
                  <strong>{t('Waymark')}</strong>
                  <small>{t('A record exists in this place.')}</small>
                </span>
              </li>
              <li data-on={selectedView.marks.night ? 'true' : 'false'}>
                <span className="atlas-mark-dot" aria-hidden="true" />
                <span>
                  <strong>{t('Night')}</strong>
                  <small>{t('Played today, before the reset.')}</small>
                </span>
              </li>
              <li data-on={selectedView.marks.keepsake ? 'true' : 'false'}>
                <span className="atlas-mark-dot" aria-hidden="true" />
                <span>
                  <strong>{t('Keepsake')}</strong>
                  <small>{t('A personal best, win or comparable mark.')}</small>
                </span>
              </li>
            </ul>

            {selectedRouteIndex >= 0 ? (
              <p className="atlas-detail-route">
                {t('This is stop {n} of tonight’s road.', { n: selectedRouteIndex + 1 })}
              </p>
            ) : null}

            <button className="btn btn-primary atlas-open" type="button" onClick={() => navigate(selectedView.path)}>
              {t('Open {name}', { name: t(selectedView.name) })}
            </button>
          </aside>
        </div>

        <section className="atlas-stamps" aria-labelledby="atlas-stamps-title">
          <div className="atlas-stamps-head">
            <div>
              <span className="eyebrow">{t('Night seals')}</span>
              <h2 id="atlas-stamps-title">{t('The road keeps its evenings')}</h2>
            </div>
            <span className="chip">
              {stamps.length ? t('{n} sealed', { n: stamps.length }) : t('No seals yet')}
            </span>
          </div>
          {stamps.length ? (
            <ol className="atlas-stamp-list" aria-label={t('The last seven night seals')}>
              {stamps.slice(-7).map((stamp) => (
                <li key={stamp}>
                  <span className="atlas-stamp" aria-hidden="true">
                    <i />
                  </span>
                  <span>{formatDay(dayToISO(stamp))}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="par-note">
              {t('Finish all three stops on a night and the atlas keeps the seal here. No streak is lost by resting.')}
            </p>
          )}
        </section>

        <section className="atlas-journal" aria-labelledby="atlas-journal-title">
          <div className="atlas-journal-head">
            <div>
              <span className="eyebrow">{t('Field book')}</span>
              <h2 id="atlas-journal-title">{t('Notes from the valley')}</h2>
            </div>
            <span className="chip">
              {t('{n} of {total} found', { n: progress.found, total: progress.total })}
            </span>
          </div>
          <details className="atlas-journal-body">
            <summary>{t('Open the field book')}</summary>
            <ol className="atlas-notes">
              {PLACES.map((place) => (
                <li key={place.id} className="atlas-page-set">
                  <strong>{t(place.placeName)}</strong>
                  <ol className="atlas-page-list">
                    {pagesFor(place.id).map((page) => {
                      const open = pageIsUnlocked(page, sources);
                      return (
                        <li key={page.tier} data-found={open ? 'true' : 'false'}>
                          <span className="atlas-page-tier">{PAGE_TIER_LABEL[page.tier][lang]}</span>
                          <small>{open ? pageText(page, lang) : t('Not yet found')}</small>
                        </li>
                      );
                    })}
                  </ol>
                </li>
              ))}
            </ol>
            <div className="atlas-sightings">
              <span className="eyebrow">{t('Sightings')}</span>
              <p className="par-note atlas-sightings-note">
                {t('Six small things to notice around the valley. They live on the front page.')}
              </p>
              <ul>
                {SIGHTINGS.map((sighting) => {
                  const seen = sightings.includes(sighting.id);
                  return (
                    <li key={sighting.id} data-found={seen ? 'true' : 'false'}>
                      <strong>{t(sighting.title)}</strong>
                      <small>{seen ? t(sighting.text) : t('Not yet found')}</small>
                    </li>
                  );
                })}
              </ul>
            </div>
            <p className="par-note atlas-journal-note">{t('Every mark is a memory, not a duty.')}</p>
          </details>
        </section>

        {totalMarks === PLACES.length * 3 ? (
          <section className="atlas-keeper" aria-label={t('Atlas Keeper')}>
            <span className="eyebrow">{t('All thirty-nine marks')}</span>
            <h2>{t('Atlas Keeper')}</h2>
            <p className="par-note">
              {t('You have walked every place in the valley and kept something from each one. The road is yours now.')}
            </p>
          </section>
        ) : null}
      </div>
    </main>
  );
}
