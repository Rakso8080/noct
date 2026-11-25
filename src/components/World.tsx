import type { ReactNode } from 'react';

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
  return (
    <div className="hero-art" aria-hidden="true">
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
