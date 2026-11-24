import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { SparkGlyph } from './ui';
import { TONE_NAMES } from '../brand';

export interface BoardProps {
  size: number;
  region: number[];
  givens: number[];
  sparks: number[];
  excluded: number[];
  hinted: number[];
  solved: boolean;
  locked?: boolean;
  label?: string;
  onToggle: (cell: number) => void;
  onExclude: (cell: number) => void;
}

export function findConflicts(size: number, region: number[], sparks: number[]): Set<number> {
  const bad = new Set<number>();
  for (let i = 0; i < sparks.length; i++) {
    for (let j = i + 1; j < sparks.length; j++) {
      const a = sparks[i];
      const b = sparks[j];
      const ar = Math.floor(a / size);
      const ac = a % size;
      const br = Math.floor(b / size);
      const bc = b % size;
      const touching = Math.abs(ar - br) <= 1 && Math.abs(ac - bc) <= 1;
      const clash = ar === br || ac === bc || region[a] === region[b] || touching;
      if (clash) {
        bad.add(a);
        bad.add(b);
      }
    }
  }
  return bad;
}

export function Board({
  size,
  region,
  givens,
  sparks,
  excluded,
  hinted,
  solved,
  locked = false,
  label,
  onToggle,
  onExclude,
}: BoardProps) {
  const [focus, setFocus] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const longPress = useRef<{ cell: number; timer: ReturnType<typeof setTimeout> } | null>(null);
  const suppressClick = useRef(false);

  const conflicts = useMemo(() => findConflicts(size, region, sparks), [size, region, sparks]);
  const sparkSet = useMemo(() => new Set(sparks), [sparks]);
  const excludedSet = useMemo(() => new Set(excluded), [excluded]);
  const hintedSet = useMemo(() => new Set(hinted), [hinted]);

  useEffect(() => {
    refs.current = refs.current.slice(0, size * size);
  }, [size]);

  useEffect(() => {
    return () => {
      if (longPress.current) clearTimeout(longPress.current.timer);
    };
  }, []);

  function moveFocus(row: number, col: number): void {
    const r = Math.max(0, Math.min(size - 1, row));
    const c = Math.max(0, Math.min(size - 1, col));
    const next = r * size + c;
    setFocus(next);
    refs.current[next]?.focus();
  }

  function handleKey(e: KeyboardEvent<HTMLButtonElement>, cell: number): void {
    const r = Math.floor(cell / size);
    const c = cell % size;
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        moveFocus(r - 1, c);
        break;
      case 'ArrowDown':
        e.preventDefault();
        moveFocus(r + 1, c);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        moveFocus(r, c - 1);
        break;
      case 'ArrowRight':
        e.preventDefault();
        moveFocus(r, c + 1);
        break;
      case ' ':
      case 'Enter':
        e.preventDefault();
        if (!locked) onToggle(cell);
        break;
      case 'x':
      case 'X':
      case 'Backspace':
        e.preventDefault();
        if (!locked) onExclude(cell);
        break;
      default:
        break;
    }
  }

  function startPress(cell: number): void {
    if (locked) return;
    suppressClick.current = false;
    const timer = setTimeout(() => {
      suppressClick.current = true;
      onExclude(cell);
    }, 420);
    longPress.current = { cell, timer };
  }

  function endPress(): void {
    if (longPress.current) {
      clearTimeout(longPress.current.timer);
      longPress.current = null;
    }
  }

  return (
    <div className="board-frame">
      <div
        className={`board${solved ? ' is-solved' : ''}`}
        style={{ ['--n' as string]: size }}
        role="grid"
        aria-label={label ?? `${size} by ${size} board`}
        aria-rowcount={size}
        aria-colcount={size}
        onContextMenu={(e) => e.preventDefault()}
      >
        {Array.from({ length: size * size }, (_, cell) => {
          const r = Math.floor(cell / size);
          const c = cell % size;
          const hasSpark = sparkSet.has(cell);
          const isGiven = givens.includes(cell);
          const isHinted = hintedSet.has(cell);
          const isExcluded = excludedSet.has(cell);
          const conflict = conflicts.has(cell);
          const topEdge = r > 0 && region[cell] !== region[cell - size];
          const leftEdge = c > 0 && region[cell] !== region[cell - 1];
          const edge = topEdge && leftEdge ? 'both' : topEdge ? 'top' : leftEdge ? 'left' : undefined;
          const state = hasSpark ? 'spark' : isExcluded ? 'excluded' : 'empty';

          return (
            <button
              key={cell}
              ref={(el) => {
                refs.current[cell] = el;
              }}
              className={[
                'cell',
                isGiven ? 'is-given' : '',
                isHinted ? 'is-hinted' : '',
                conflict ? 'is-conflict' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={{ ['--tone' as string]: `var(--tone-${region[cell] % 7})` }}
              data-edge={edge}
              role="gridcell"
              tabIndex={cell === focus ? 0 : -1}
              aria-label={`Row ${r + 1}, column ${c + 1}, ${TONE_NAMES[region[cell] % 7]} tone, ${state}${conflict ? ', conflict' : ''}${isGiven ? ', pre-lit' : ''}`}
              aria-pressed={hasSpark}
              disabled={locked && !hasSpark}
              onFocus={() => setFocus(cell)}
              onKeyDown={(e) => handleKey(e, cell)}
              onPointerDown={() => startPress(cell)}
              onPointerUp={endPress}
              onPointerLeave={endPress}
              onPointerCancel={endPress}
              onClick={() => {
                if (suppressClick.current) {
                  suppressClick.current = false;
                  return;
                }
                if (!locked) onToggle(cell);
              }}
            >
              {hasSpark ? (
                <span className="spark">
                  <span className="spark-glow" />
                  <SparkGlyph />
                </span>
              ) : isExcluded ? (
                <span className="excluded" aria-hidden="true">
                  ✕
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
