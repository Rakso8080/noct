import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { WeatherId } from '../lib/atlas';
import { hashSeed, mulberry32 } from '../lib/rng';
import { SCENES, type SceneKey } from '../lib/scenes';

interface Mote {
  left: number;
  top: number;
  delay: number;
  duration: number;
  size: number;
  opacity: number;
  drift: number;
}

/**
 * Deterministic motes: the same place looks the same on every render, so a
 * re-render never makes the air jump. Seeded once per place.
 */
function buildMotes(count: number, drift: number, seed: string): Mote[] {
  const rnd = mulberry32(hashSeed('scene', seed));
  return Array.from({ length: count }, () => ({
    left: rnd() * 100,
    top: rnd() * 100,
    delay: -rnd() * drift,
    duration: drift * (0.7 + rnd() * 0.9),
    size: 2 + Math.round(rnd() * 2),
    opacity: 0.22 + rnd() * 0.45,
    drift: Math.round((rnd() * 2 - 1) * 34),
  }));
}

/**
 * One valley, one weather, thirteen different rooms. Decoration only: the
 * layer is invisible to assistive tech and never takes a click.
 */
export function SceneLayer({ place, weather }: { place: SceneKey; weather: WeatherId }) {
  const scene = SCENES[place];
  const motes = useMemo(
    () => buildMotes(scene.density, scene.drift, place),
    [scene.density, scene.drift, place],
  );
  const [paused, setPaused] = useState(() => typeof document !== 'undefined' && document.hidden);

  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const style = {
    '--scene-top': scene.sky[0],
    '--scene-bottom': scene.sky[1],
    '--scene-glow': scene.glow,
    '--scene-tint': scene.tint,
  } as CSSProperties;

  return (
    <div
      className="scene-layer"
      data-place={place}
      data-mote={scene.mote}
      data-weather={weather}
      data-paused={paused ? 'true' : 'false'}
      style={style}
      aria-hidden="true"
    >
      <span className="scene-wash" />
      <span className="scene-tint" />
      <span className="scene-haze" />
      <span className="scene-weather" />
      {motes.map((mote, index) => (
        <span
          key={index}
          className="scene-mote"
          style={
            {
              left: `${mote.left}%`,
              top: `${mote.top}%`,
              width: mote.size,
              height: mote.size,
              opacity: mote.opacity,
              animationDelay: `${mote.delay}s`,
              animationDuration: `${mote.duration}s`,
              '--mote-drift': `${mote.drift}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
