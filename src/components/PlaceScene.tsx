import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Sprite } from './World';
import {
  CREATURE_ART,
  artFor,
  type ArtCreature,
  type ArtGlint,
  type ArtKey,
  type ArtPiece,
} from '../lib/placeArt';
import type { WeatherId } from '../lib/atlas';
import { sceneFor } from '../lib/scenes';
import { preferReducedMotion } from '../lib/settings';

interface PlaceSceneProps {
  place: ArtKey;
  weather?: WeatherId;
  /** thumb: a 48 px chip; plate: the atlas plate; band: a wide header strip */
  variant?: 'thumb' | 'plate' | 'band';
  className?: string;
}

function Layer({ pieces, className }: { pieces: readonly ArtPiece[]; className: string }) {
  return (
    <>
      {pieces.map((piece, index) => (
        <span
          key={index}
          className={`place-piece ${className}${piece.tone === 'ink' ? ' is-ink' : ''}${
            piece.fx ? ` fx-${piece.fx}` : ''
          }`}
          style={
            {
              left: `${piece.x}%`,
              bottom: `${piece.y}%`,
              width: `${piece.w}%`,
              color: piece.color,
              animationDelay: piece.fx ? `${-(index % 6) * 0.9}s` : undefined,
            } as CSSProperties
          }
        >
          <Sprite grid={piece.grid} />
        </span>
      ))}
    </>
  );
}

function Creatures({ creatures }: { creatures: readonly ArtCreature[] }) {
  return (
    <>
      {creatures.map((creature, index) => (
        <span
          key={`${creature.kind}-${index}`}
          className={`place-creature place-creature--${creature.kind}`}
          style={
            {
              left: `${creature.x}%`,
              bottom: `${creature.y}%`,
              width: `${creature.size}%`,
              animationDelay: `${-(index % 4) * 1.7}s`,
            } as CSSProperties
          }
        >
          <Sprite grid={CREATURE_ART[creature.kind]} />
        </span>
      ))}
    </>
  );
}

function Glints({ glints }: { glints: readonly ArtGlint[] }) {
  return (
    <>
      {glints.map((glint, index) => (
        <i
          key={index}
          className="place-glint"
          data-fx={glint.fx ?? 'flicker'}
          style={
            {
              left: `${glint.x}%`,
              bottom: `${glint.y}%`,
              width: `${glint.size}%`,
              animationDelay: `${-(index % 7) * 0.8}s`,
            } as CSSProperties
          }
        />
      ))}
    </>
  );
}

/**
 * A place as a picture. Decorative: the room's name is always written next to
 * it, so the scene is hidden from assistive tech and never carries meaning on
 * its own.
 */
export function PlaceScene({ place, weather = 'clear', variant = 'thumb', className }: PlaceSceneProps) {
  const art = artFor(place);
  const scene = sceneFor(place);
  const root = useRef<HTMLSpanElement | null>(null);
  const frame = useRef<number | null>(null);
  const [paused, setPaused] = useState(false);

  /* A hidden tab keeps its pixels but stops every drift. */
  useEffect(() => {
    if (typeof document === 'undefined') return;
    setPaused(document.hidden);
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  /* The atlas plate leans a few pixels with the pointer; touch and reduced motion do not. */
  function move(event: { clientX: number; clientY: number }): void {
    if (variant !== 'plate' || preferReducedMotion()) return;
    if (!window.matchMedia('(hover: hover)').matches) return;
    const el = root.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (event.clientX - rect.left) / Math.max(1, rect.width) - 0.5;
    const py = (event.clientY - rect.top) / Math.max(1, rect.height) - 0.5;
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      el.style.setProperty('--par-x', px.toFixed(3));
      el.style.setProperty('--par-y', py.toFixed(3));
    });
  }

  function settle(): void {
    const el = root.current;
    if (!el) return;
    el.style.setProperty('--par-x', '0');
    el.style.setProperty('--par-y', '0');
  }
  const style = {
    '--place-top': scene.sky[0],
    '--place-bottom': scene.sky[1],
    '--place-glow': scene.glow,
    '--place-tint': scene.tint,
    '--place-ground': art.ground,
  } as CSSProperties;

  return (
    <span
      ref={root}
      className={`place-scene place-scene--${variant}${className ? ` ${className}` : ''}`}
      data-place={place}
      data-weather={weather}
      data-wind={art.wind ?? 'calm'}
      data-paused={paused ? 'true' : 'false'}
      style={style}
      onPointerMove={move}
      onPointerLeave={settle}
      aria-hidden="true"
    >
      <span className="place-sky" />
      <span className="place-stars" />
      <span className="place-ground" />
      <span className="place-stage">
        <Layer pieces={art.far} className="place-far" />
        <Layer pieces={art.mid} className="place-mid" />
        <Layer pieces={art.near} className="place-near" />
        <Glints glints={art.glints ?? []} />
        <Creatures creatures={art.creatures ?? []} />
        <span className="place-wind" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span
          className="place-light"
          style={{ left: `${art.light.x}%`, top: `${art.light.y}%` }}
        />
      </span>
      <span className="place-weather" />
    </span>
  );
}
