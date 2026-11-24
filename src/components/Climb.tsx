import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Sprite } from './World';
import { bandFor, ROUTE_KM } from '../../shared/survey';

/**
 * The climb: the whole game happens inside this scene. The ground falls away,
 * trunks and clouds pass, and the sky changes with altitude. Progress is the
 * fraction of the 14 km route; the camera is a CSS variable so every layer can
 * move at its own speed — and so the browser can tween it.
 */

const WALKER_A = [
  '...XXXX...',
  '..XXXXXX..',
  '..XX..XX..',
  '..XXXXXX..',
  '.XXXXXXXX.',
  '.XXXXXXXX.',
  'XXXXXXXXXX',
  'XXXXXXXXXX',
  'XXXXXXXXXX',
  '.XXXXXXXX.',
  '..XX..XX..',
  '..XX..XX..',
  '.XXX..XXX.',
];

const WALKER_B = [
  '...XXXX...',
  '..XXXXXX..',
  '..XX..XX..',
  '..XXXXXX..',
  '.XXXXXXXX.',
  '.XXXXXXXX.',
  'XXXXXXXXXX',
  'XXXXXXXXXX',
  'XXXXXXXXXX',
  '.XXXXXXXX.',
  '...XXXX...',
  '...XXXX...',
  '..XXXXXX..',
];

const BALLOON = ['..XXX..', '.XXXXX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..'];

const MOON = [
  '..XXXXX..',
  '.XXXXXXX.',
  'XXXXXXXXX',
  'XXX.XXXXX',
  'XXXXXXXXX',
  'XXXXXXXXX',
  'XXXXXX.XX',
  'XXXXXXXXX',
  '..XXXXX..',
];

const BANDS = [
  { id: 'forest', name: 'The Moss Woods', weather: 'fireflies' },
  { id: 'desert', name: 'The Amber Flats', weather: 'sand' },
  { id: 'tundra', name: 'The Glass Tundra', weather: 'snow' },
  { id: 'volcano', name: 'The Ember Ridge', weather: 'embers' },
];

interface ClimbProps {
  progress: number;
  balloons?: number;
  answer?: string;
  moving?: boolean;
  /** "start" is the ground-level scene on the start screen. */
  variant?: 'stage' | 'start';
}

export function Climb({
  progress,
  balloons = 3,
  answer = '',
  moving = false,
  variant = 'stage',
}: ClimbProps) {
  const k = Math.max(0, Math.min(1, progress));
  const band = BANDS[bandFor(k)];
  const style = { '--k': k } as CSSProperties;
  const shown = Math.max(0, Math.min(3, balloons));

  /* A balloon that just left pops in its old slot; one that came back swells in. */
  const last = useRef(shown);
  const [popping, setPopping] = useState(false);
  const [returned, setReturned] = useState<number | null>(null);

  useEffect(() => {
    const before = last.current;
    last.current = shown;
    if (shown < before) {
      setPopping(true);
      const id = setTimeout(() => setPopping(false), 640);
      return () => clearTimeout(id);
    }
    if (shown > before) {
      setReturned(shown - 1);
      const id = setTimeout(() => setReturned(null), 740);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [shown]);

  return (
    <div
      className={`climb climb--${variant}${moving ? ' is-rising' : ''}`}
      data-band={bandFor(k)}
      data-weather={band.weather}
      style={style}
    >
      <div className="climb-sky" />
      <div className="climb-stars" aria-hidden="true" />
      <span className="climb-shooting" aria-hidden="true" />
      <div className="climb-moon" aria-hidden="true">
        <Sprite grid={MOON} />
      </div>
      <div className="climb-space" aria-hidden="true" />

      <div className="climb-clouds" aria-hidden="true">
        <span className="climb-cloud climb-cloud--a" />
        <span className="climb-cloud climb-cloud--b" />
        <span className="climb-cloud climb-cloud--c" />
      </div>

      <div className="climb-canopy" aria-hidden="true" />

      <div className="climb-trees" aria-hidden="true">
        <span className="climb-tree climb-tree--left" />
        <span className="climb-tree climb-tree--right" />
      </div>

      <div className="climb-weather" aria-hidden="true" />

      <div className="climb-scroll" aria-hidden="true" />

      <div className="climb-ground" aria-hidden="true">
        <span className="climb-pond" />
        <span className="climb-reed climb-reed--a" />
        <span className="climb-reed climb-reed--b" />
        <span className="climb-reed climb-reed--c" />
      </div>

      <div className={`climb-figure${moving ? ' is-moving' : ''}`}>
        <div className="climb-balloons" aria-hidden="true">
          {Array.from({ length: shown }, (_, i) => (
            <span
              key={i}
              className={`climb-balloon${i === returned ? ' is-returning' : ''}`}
              style={{ animationDelay: `${i * 0.35}s` }}
            >
              <Sprite grid={BALLOON} />
            </span>
          ))}
          {popping ? (
            <span key={`pop-${shown}-${last.current}`} className="climb-balloon is-popping">
              <Sprite grid={BALLOON} />
            </span>
          ) : null}
          {popping ? <span className="climb-string" aria-hidden="true" /> : null}
        </div>
        <span className="climb-look">
          <span className="climb-frame climb-frame--a">
            <Sprite grid={WALKER_A} />
          </span>
          <span className="climb-frame climb-frame--b">
            <Sprite grid={WALKER_B} />
          </span>
        </span>
        {moving ? (
          <span className="climb-dust" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        ) : null}
        {answer ? <span className="climb-bubble">{answer}</span> : null}
      </div>

      {variant === 'stage' ? (
        <div className="climb-gauge" aria-hidden="true">
          <span className="climb-gauge-rail">
            <i />
            {/* Re-keyed on every height so the needle swings instead of sliding. */}
            <b key={Math.round(k * 400)} className="is-swinging" />
          </span>
          <span className="climb-gauge-mark">
            {Math.round(k * ROUTE_KM * 1000).toLocaleString('en-GB')} m
          </span>
        </div>
      ) : null}

      {variant === 'stage' ? (
        <span key={band.id} className="climb-zone" aria-hidden="true">
          {band.name}
        </span>
      ) : null}

      <span className="climb-band" aria-hidden="true">
        {band.name}
      </span>
    </div>
  );
}
