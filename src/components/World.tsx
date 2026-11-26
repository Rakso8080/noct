import { useEffect, useRef, type ReactNode } from 'react';
import { useT } from '../lib/i18n';
import { preferReducedMotion } from '../lib/settings';
import type { SightingId } from '../lib/journal';

/**
 * Pixel sprites for the night scene.
 *
 * Each sprite is an ASCII grid — one character per pixel, filled with
 * currentColor — so the art stays on the pixel grid and edits are readable.
 */
interface SpriteProps {
  grid: string[];
  className?: string;
}

export function Sprite({ grid, className }: SpriteProps) {
  const rows = grid.length;
  const cols = Math.max(...grid.map((row) => row.length));
  const rects: ReactNode[] = [];

  grid.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (row[x] === 'X') {
        let width = 1;
        while (row[x + width] === 'X') width++;
        rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={width} height={1} fill="currentColor" />);
        x += width;
      } else {
        x++;
      }
    }
  });

  return (
    <svg
      viewBox={`0 0 ${cols} ${rows}`}
      className={`sprite${className ? ` ${className}` : ''}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      {rects}
    </svg>
  );
}

const BIRD = ['X.......X', 'XX.....XX', '.XXXXXXX.', '..XX.XX..'];

/** A stag on the ridge: antlers right, body left, four legs below. */
const DEER = [
  '...........X..X',
  '............XXX',
  '...........XXXX',
  '..........XXXX.',
  '....XXXXXXXXX..',
  '...XXXXXXXXXX..',
  '...XXXXXXXXXX..',
  '....X..X...X...',
  '...XX.XX..XX...',
];

const CAT = ['.X....X.', 'XXXXXXX.', 'XXXXXXX.', 'XXXXXXX.', 'XXXXXXXX', 'XXXXXXXX', '.X....X.'];

const FISH = ['..XXXX.', 'XXXXXXX', '..XXXX.'];

const CLOUD = [
  '....XXXX......',
  '..XXXXXXXX....',
  '.XXXXXXXXXX...',
  'XXXXXXXXXXXXXX',
  '.XXXXXXXXXXXX.',
];

const MUSHROOM = ['.XXX.', 'XXXXX', '..X..', '..X..'];

const GRASS = ['X..X..X', 'X.XX.XX', 'XXXXXXX'];

const SNAIL = ['..XXX..', '.XXXXX.', 'XXXXXXX', 'XXXXXXX'];

const WANDERER = [
  '..XXX..',
  '.XXXXX.',
  '..XXX..',
  '.XXXXX.',
  '..XXX..',
  '..X.X..',
  '.XX.XX.',
];

/** The night scene behind the wordmark: sky, village, water and wildlife. */
export function HeroWorld() {
  const art = useRef<HTMLDivElement | null>(null);

  /* Two or three pixels of lean, never more; touch and reduced motion stay still. */
  useEffect(() => {
    if (!window.matchMedia('(hover: hover)').matches || preferReducedMotion()) return;
    let frame = 0;
    const onMove = (event: PointerEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const el = art.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        el.style.setProperty('--hero-x', ((event.clientX - rect.left) / Math.max(1, rect.width) - 0.5).toFixed(3));
        el.style.setProperty('--hero-y', ((event.clientY - rect.top) / Math.max(1, rect.height) - 0.5).toFixed(3));
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={art} className="hero-art" aria-hidden="true">
      <span className="hero-stars" />
      <span className="hero-stars hero-stars-twinkle" />
      <span className="hero-moon" />

      <span className="hero-cloud hero-cloud-1">
        <Sprite grid={CLOUD} />
      </span>
      <span className="hero-cloud hero-cloud-2">
        <Sprite grid={CLOUD} />
      </span>

      <span className="hero-bird hero-bird-1">
        <Sprite grid={BIRD} />
      </span>
      <span className="hero-bird hero-bird-2">
        <Sprite grid={BIRD} />
      </span>

      <span className="hero-shooting-star" />

      <span className="hero-hill hero-hill-back" />
      <span className="hero-hill hero-hill-front" />

      <svg className="hero-castle" viewBox="0 0 96 76" shapeRendering="crispEdges" focusable="false">
        <path
          fill="currentColor"
          d="M4 72V36h8v-8h5v8h7v-8h5v8h7V26h7V10h6v16h7v10h7v-8h5v8h7v-8h5v8h8v36H4Z"
        />
        <path fill="currentColor" d="M38 72V54h20v18H38Z" />
        <g fill="#f5c95c" opacity="0.8">
          <rect x="15" y="46" width="4" height="6" />
          <rect x="29" y="47" width="4" height="6" />
          <rect x="44" y="32" width="4" height="6" />
          <rect x="52" y="32" width="4" height="6" />
          <rect x="66" y="46" width="4" height="6" />
          <rect x="79" y="47" width="4" height="6" />
        </g>
      </svg>

      <span className="hero-pines">
        <i />
        <i />
        <i />
        <i />
        <i />
      </span>

      <span className="hero-water" />
      <span className="hero-bridge" />
      <span className="hero-fish">
        <Sprite grid={FISH} />
      </span>

      <span className="hero-houses" />
      <span className="hero-fireflies" />
      <span className="hero-fireflies hero-fireflies-2" />

      <span className="hero-grass hero-grass-1">
        <Sprite grid={GRASS} />
      </span>
      <span className="hero-grass hero-grass-2">
        <Sprite grid={GRASS} />
      </span>

      <span className="hero-deer">
        <Sprite grid={DEER} />
      </span>
      <span className="hero-wanderer">
        <Sprite grid={WANDERER} />
        <i className="hero-wanderer-lantern" />
      </span>
    </div>
  );
}

interface FindSpot {
  id: SightingId;
  title: string;
  left: string;
  bottom: string;
}

/** Stood where the art already is, so the eye finds them without a label. */
const HERO_FINDS: readonly FindSpot[] = [
  { id: 'tower', title: 'the tower window', left: '10%', bottom: '44%' },
  { id: 'fireflies', title: 'the fireflies', left: '30%', bottom: '39%' },
  { id: 'deer', title: 'the stag', left: '8%', bottom: '3%' },
  { id: 'wanderer', title: 'the wanderer', left: '84%', bottom: '15%' },
];

const STRIP_FINDS: readonly FindSpot[] = [
  { id: 'cat', title: 'the cat', left: '58%', bottom: '26px' },
  { id: 'snail', title: 'the snail', left: '40%', bottom: '9px' },
];

/**
 * The six small things worth noticing. Real buttons, keyboard reachable and
 * labelled — the art behind them stays decorative.
 */
export function WorldFinds({
  variant,
  found,
  onFind,
}: {
  variant: 'hero' | 'strip';
  found: readonly SightingId[];
  onFind: (id: SightingId) => void;
}) {
  const t = useT();
  const spots = variant === 'hero' ? HERO_FINDS : STRIP_FINDS;

  return (
    <div className={`world-finds world-finds--${variant}`}>
      {spots.map((spot) => {
        const seen = found.includes(spot.id);
        return (
          <button
            key={spot.id}
            type="button"
            className="world-find"
            data-found={seen ? 'true' : 'false'}
            style={{ left: spot.left, bottom: spot.bottom }}
            aria-pressed={seen}
            aria-label={t(seen ? 'Sit with {name} again' : 'Look closer at {name}', {
              name: t(spot.title),
            })}
            onClick={() => onFind(spot.id)}
          >
            <span aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}

/** A thin meadow under the menu, so the world carries past the hero. */
export function WorldStrip() {
  return (
    <div className="world-strip" aria-hidden="true">
      <div className="strip-sky" />
      <div className="strip-ground" />
      <span className="strip-grass strip-grass-1">
        <Sprite grid={GRASS} />
      </span>
      <span className="strip-grass strip-grass-2">
        <Sprite grid={GRASS} />
      </span>
      <span className="strip-mushroom strip-mushroom-1">
        <Sprite grid={MUSHROOM} />
      </span>
      <span className="strip-mushroom strip-mushroom-2">
        <Sprite grid={MUSHROOM} />
      </span>
      <span className="strip-cat">
        <Sprite grid={CAT} />
      </span>
      <span className="strip-snail">
        <Sprite grid={SNAIL} />
      </span>
    </div>
  );
}
