import { useMemo, useState } from 'react';
import { Board, findConflicts } from '../components/Board';
import { ScreenHead } from '../components/ui';
import { sfx } from '../lib/audio';
import { haptic } from '../lib/settings';

const SIZE = 4;
const REGION = [0, 0, 1, 1, 0, 0, 1, 1, 2, 2, 3, 3, 2, 2, 3, 3];
// Pre-lit cell (row 2, column 4). The board has exactly one completion from here.
const GIVEN = [7];

function isComplete(sparks: number[]): boolean {
  if (sparks.length !== SIZE) return false;
  if (findConflicts(SIZE, REGION, sparks).size > 0) return false;
  const rows = new Set(sparks.map((c) => Math.floor(c / SIZE)));
  const cols = new Set(sparks.map((c) => c % SIZE));
  const regs = new Set(sparks.map((c) => REGION[c]));
  return rows.size === SIZE && cols.size === SIZE && regs.size === SIZE;
}

export function HowTo({ navigate }: { navigate: (path: string) => void }) {
  const [sparks, setSparks] = useState<number[]>(GIVEN);
  const [excluded, setExcluded] = useState<number[]>([]);

  const conflicts = useMemo(() => findConflicts(SIZE, REGION, sparks), [sparks]);
  const solved = isComplete(sparks);
  const placed = sparks.length - GIVEN.length;

  const caption = solved
    ? {
        title: 'That is the whole game',
        body: 'One spark per row, column and tone, none touching. Bigger boards ask the same question, just with more places to look.',
      }
    : conflicts.size > 0
      ? {
          title: 'They repel',
          body: 'Those two share a row, a column or a tone — or they touch. That red outline is the only thing to fix.',
        }
      : placed === 0
        ? {
            title: 'Tap a tile',
            body: 'Light a spark anywhere. The dashed ring marks a pre-lit spark: it is part of the answer and cannot move.',
          }
        : {
            title: `${placed + GIVEN.length} of ${SIZE} placed`,
            body: 'Keep going. Each shaded tone needs exactly one spark, and each row and column too.',
          };

  return (
    <main className="main">
      <div className="wrap" style={{ maxWidth: 560 }}>
        <ScreenHead eyebrow="How to play · 30 seconds" title="Three rules, then you know it">
          This board is small on purpose. Solve it once and every daily board makes sense.
        </ScreenHead>

        <div className="card stack gap-14">
          <Board
            size={SIZE}
            region={REGION}
            givens={GIVEN}
            sparks={sparks}
            excluded={excluded}
            hinted={[]}
            solved={solved}
            label="Tutorial board, 4 by 4"
            onToggle={(cell) => {
              if (GIVEN.includes(cell)) {
                sfx.blocked();
                return;
              }
              setSparks((s) => (s.includes(cell) ? s.filter((c) => c !== cell) : [...s, cell]));
              sfx.place();
              haptic(9);
            }}
            onExclude={(cell) => {
              setExcluded((e) => (e.includes(cell) ? e.filter((c) => c !== cell) : [...e, cell]));
              sfx.tap();
            }}
          />

          <div className="tut-caption" aria-live="polite">
            <h3>{caption.title}</h3>
            <p className="par-note" style={{ margin: 0 }}>
              {caption.body}
            </p>
          </div>

          <div className="tut-actions">
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => {
                setSparks(GIVEN);
                setExcluded([]);
              }}
            >
              Reset board
            </button>
            <div className="row gap-10">
              <button className="btn btn-sm btn-ghost" onClick={() => navigate('/')}>
                Skip
              </button>
              <button className={`btn btn-sm${solved ? ' btn-primary' : ''}`} onClick={() => navigate('/play')}>
                Play today’s board
              </button>
            </div>
          </div>
        </div>

        <div className="card-flat stack gap-14" style={{ marginTop: 20 }}>
          <span className="eyebrow">Scoring, quickly</span>
          <p className="par-note" style={{ margin: 0 }}>
            Every board gives a base score plus a time bonus that fades to zero at par. Finish a board
            without a hint for 25 extra. A hint costs 80 and forfeits that bonus — the price is always
            shown before you take it.
          </p>
          <p className="par-note" style={{ margin: 0 }}>
            Wrong placements cost nothing but seconds. Only the clock and your own patience decide the
            score, and the clock is measured by the server, not your browser.
          </p>
          <div className="row gap-10" style={{ flexWrap: 'wrap' }}>
            <span className="chip">4 boards daily</span>
            <span className="chip">5×5 → 7×7</span>
            <span className="chip">3 hints a day</span>
            <span className="chip">Reset 00:00 UTC</span>
          </div>
        </div>
      </div>
    </main>
  );
}
