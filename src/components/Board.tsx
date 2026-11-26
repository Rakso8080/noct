import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { SparkGlyph } from './ui';
import { TONE_NAMES } from '../brand';
import { useT } from '../lib/i18n';

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
  const t = useT();
  const [focus, setFocus] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const frame = useRef<HTMLDivElement | null>(null);
  const longPress = useRef<{ cell: number; timer: ReturnType<typeof setTimeout> } | null>(null);
  const suppressClick = useRef(false);
  const drag = useRef<{ active: boolean; cell: number; moved: boolean }>({ active: false, cell: -1, moved: false });

  const conflicts = useMemo(() => findConflicts(size, region, sparks), [size, region, sparks]);
  const sparkSet = useMemo(() => new Set(sparks), [sparks]);
  const excludedSet = useMemo(() => new Set(excluded), [excluded]);
  const hintedSet = useMemo(() => new Set(hinted), [hinted]);

  useEffect(() => {
    refs.current = refs.current.slice(0, size * size);
  }, [size]);

  useEffect(() => {
    const stop = () => {
      drag.current.active = false;
    };
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    return () => {
      if (longPress.current) clearTimeout(longPress.current.timer);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
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

  function startPress(cell: number, event: { button?: number }): void {
    if (locked) return;
    /* Right-click keeps its own meaning; dragging is a left-button gesture. */
    if (event.button !== undefined && event.button !== 0) return;
    suppressClick.current = false;
    drag.current = { active: true, cell, moved: false };
    const timer = setTimeout(() => {
      suppressClick.current = true;
      drag.current.active = false;
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

  /**
   * Dragging lights every empty cell it passes over; the click that follows is
   * swallowed. Touch pointers are captured by the cell that received the press,
   * so the cell under the finger is found by position, not by enter events.
   */
  function movePress(event: { clientX: number; clientY: number }): void {
    const current = drag.current;
    if (!current.active || locked) return;
    const hit = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-cell]');
    if (!hit || !frame.current?.contains(hit)) return;
    const cell = Number(hit.dataset.cell);
    if (!Number.isInteger(cell) || cell === current.cell) return;
    current.cell = cell;
    current.moved = true;
    suppressClick.current = true;
    if (longPress.current) {
      clearTimeout(longPress.current.timer);
      longPress.current = null;
    }
    if (!sparkSet.has(cell) && !givens.includes(cell)) onToggle(cell);
  }

  return (
    <div className="board-frame">
      <div
        ref={frame}
        className={`board${solved ? ' is-solved' : ''}`}
        style={{ ['--n' as string]: size }}
        onPointerMove={movePress}
        role="grid"
        aria-label={label ?? t('{size} by {size} board', { size })}
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
              aria-label={t('Row {r}, column {c}, {tone} tone, {state}{conflict}{given}', {
                r: r + 1,
                c: c + 1,
                tone: t(TONE_NAMES[region[cell] % 7]),
                state: state === 'spark' ? t('spark') : state === 'excluded' ? t('excluded') : t('empty'),
                conflict: conflict ? t(', conflict') : '',
                given: isGiven ? t(', pre-lit') : '',
              })}
              aria-pressed={hasSpark}
              disabled={locked && !hasSpark}
              onFocus={() => setFocus(cell)}
              onKeyDown={(e) => handleKey(e, cell)}
              data-cell={cell}
              onPointerDown={(event) => startPress(cell, event)}
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
