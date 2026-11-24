import { useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, api } from '../lib/api';
import type { StartResponse, Summary } from '../../shared/types';
import { Board, findConflicts } from '../components/Board';
import { Toast } from '../components/ui';
import { sfx } from '../lib/audio';
import { haptic } from '../lib/settings';
import { HINT_COST, parMs } from '../../shared/score';

interface PlayProps {
  mode: 'daily' | 'practice' | 'archive';
  level?: number;
  day?: number;
  onFinish: (summary: Summary) => void;
  onExit: () => void;
  onTutorial: () => void;
  onToday?: () => void;
}

function clock(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function Play({ mode, level, day, onFinish, onExit, onTutorial, onToday }: PlayProps) {
  const [session, setSession] = useState<StartResponse | null>(null);
  const [phase, setPhase] = useState<'loading' | 'playing' | 'solving' | 'error'>('loading');
  const [error, setError] = useState('');
  const [errorKind, setErrorKind] = useState<'generic' | 'archive' | 'offline'>('generic');
  const [index, setIndex] = useState(0);
  const [sparks, setSparks] = useState<number[]>([]);
  const [excluded, setExcluded] = useState<number[]>([]);
  const [hinted, setHinted] = useState<number[]>([]);
  const [hintsLeft, setHintsLeft] = useState(3);
  const [score, setScore] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [hintOpen, setHintOpen] = useState(false);

  const roundStart = useRef(Date.now());
  const busy = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const puzzle = session?.rounds[index] ?? null;

  function flash(message: string): void {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }

  useEffect(() => {
    let alive = true;
    const starter =
      mode === 'daily'
        ? api.dailyStart()
        : mode === 'practice'
          ? api.practiceStart(level ?? 2)
          : api.archiveStart(day ?? 1);

    starter
      .then((s) => {
        if (!alive) return;
        setSession(s);
        setIndex(s.roundIndex);
        setScore(s.score);
        setHintsLeft(s.hintsLeft);
        setSparks(s.rounds[s.roundIndex]?.givens ?? []);
        roundStart.current = Date.now();
        setPhase('playing');
      })
      .catch((err: unknown) => {
        if (!alive) return;
        if (err instanceof ApiError && err.status === 409) {
          const body = err.body as { summary?: Summary } | null;
          if (body?.summary) {
            sfx.complete();
            onFinish(body.summary);
            return;
          }
        }
        const archiveMiss = err instanceof ApiError && err.status === 400;
        setErrorKind(
          archiveMiss ? 'archive' : err instanceof ApiError && err.status === 0 ? 'offline' : 'generic',
        );
        setError(
          archiveMiss
            ? `Board #${day ?? 1} is not in the archive. The drawer keeps the last 365 nights.`
            : err instanceof ApiError && err.status === 0
              ? 'You appear to be offline. The daily board needs a connection.'
              : 'That board could not be opened. Try again.',
        );
        setPhase('error');
      });

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase !== 'playing') return;
    const id = setInterval(() => setElapsed(Date.now() - roundStart.current), 200);
    return () => clearInterval(id);
  }, [phase, index]);

  const conflicts = useMemo(
    () => (puzzle ? findConflicts(puzzle.size, puzzle.region, sparks) : new Set<number>()),
    [puzzle, sparks],
  );

  const complete = Boolean(puzzle) && sparks.length === puzzle!.size && conflicts.size === 0;

  async function submit(cells: number[]): Promise<void> {
    if (!session || busy.current) return;
    busy.current = true;
    try {
      const res = await api.submitRound(session.sessionId, index, cells);
      if (!res.ok) {
        busy.current = false;
        setAttempts((a) => a + 1);
        flash('Those sparks don’t fit the rules yet — nothing lost, keep going.');
        return;
      }
      setScore(res.score ?? score);
      setPhase('solving');
      sfx.solve();
      haptic(24);
      const solveIndex = index;
      const activeSession = session;
      setTimeout(() => {
        if (res.finished && res.summary) {
          sfx.complete();
          onFinish(res.summary);
          return;
        }
        const next = res.nextIndex ?? solveIndex + 1;
        setIndex(next);
        setSparks(activeSession.rounds[next]?.givens ?? []);
        setExcluded([]);
        setHinted([]);
        setHintOpen(false);
        setPhase('playing');
        busy.current = false;
        roundStart.current = Date.now();
        setElapsed(0);
        setBanner(`Round ${next + 1}`);
        setTimeout(() => setBanner(null), 820);
      }, 700);
    } catch (err) {
      busy.current = false;
      if (err instanceof ApiError && err.status === 429) {
        flash('One moment…');
        setTimeout(() => void submit(cells), 700);
        return;
      }
      flash('Connection hiccup. Your board is still here — tap a spark to retry.');
    }
  }

  useEffect(() => {
    if (phase !== 'playing' || !puzzle || !complete) return;
    const t = setTimeout(() => void submit(sparks), 240);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complete, sparks, phase, puzzle]);

  function toggle(cell: number): void {
    if (!puzzle || phase !== 'playing') return;
    if (puzzle.givens.includes(cell) || hinted.includes(cell)) {
      sfx.blocked();
      flash('That spark came pre-lit — it is part of the answer.');
      return;
    }
    if (sparks.includes(cell)) {
      setSparks((s) => s.filter((c) => c !== cell));
      sfx.remove();
      haptic(6);
    } else {
      setSparks((s) => [...s, cell]);
      sfx.place();
      haptic(10);
    }
  }

  function exclude(cell: number): void {
    if (!puzzle || phase !== 'playing') return;
    if (sparks.includes(cell)) return;
    setExcluded((e) => (e.includes(cell) ? e.filter((c) => c !== cell) : [...e, cell]));
    sfx.tap();
    haptic(5);
  }

  async function takeHint(): Promise<void> {
    if (!session || !puzzle) return;
    if (hintsLeft <= 0) {
      flash('No hints left today. The boards are fair — trust your eliminations.');
      setHintOpen(false);
      return;
    }
    if (hinted.length > 0) {
      setHintOpen(false);
      return;
    }
    try {
      const res = await api.hint(session.sessionId, sparks);
      setHintsLeft(res.hintsLeft);
      setHinted((h) => [...h, res.cell]);
      setSparks((s) => [...new Set([...s, res.cell])]);
      sfx.hint();
      setHintOpen(false);
      flash(`A spark is revealed. −${HINT_COST} points.`);
    } catch {
      flash('Hints are unavailable right now.');
      setHintOpen(false);
    }
  }

  if (phase === 'loading') {
    return (
      <main className="main">
        <div className="wrap" style={{ textAlign: 'center', paddingTop: 60 }}>
          <div className="eyebrow">Preparing the board</div>
          <p className="lede" style={{ margin: '10px auto 0' }}>
            Checking the solution is still unique…
          </p>
        </div>
      </main>
    );
  }

  if (phase === 'error' || !session || !puzzle) {
    return (
      <main className="main">
        <div className="wrap" style={{ maxWidth: 480 }}>
          <div className="card stack gap-14">
            <h1 style={{ fontSize: 'var(--step-2)' }}>
              {errorKind === 'archive' ? 'Not in the archive' : 'Board unavailable'}
            </h1>
            <p className="par-note">{error}</p>
            <div className="row gap-10" style={{ flexWrap: 'wrap' }}>
              {errorKind === 'archive' ? (
                <>
                  <button className="btn btn-primary" onClick={onExit}>
                    Open the archive
                  </button>
                  {onToday ? (
                    <button className="btn btn-ghost" onClick={onToday}>
                      Play today’s board
                    </button>
                  ) : null}
                </>
              ) : (
                <>
                  <button className="btn btn-primary" onClick={() => window.location.reload()}>
                    Try again
                  </button>
                  <button className="btn btn-ghost" onClick={onExit}>
                    Back home
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    );
  }

  const modeLabel = mode === 'daily' ? 'Daily' : mode === 'practice' ? 'Practice' : `Archive #${day}`;
  const par = parMs(puzzle.size);
  const elapsedRatio = Math.min(1.6, elapsed / par);

  return (
    <main className="main">
      <div className="wrap">
        <div className="play-grid">
          <div className="play-main">
            <div className="play-head">
              <div className="row gap-10">
                <button className="icon-btn" onClick={onExit} aria-label="Leave this board">
                  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                    <path d="M9.5 2 4 7l5.5 5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <div className="stack">
                  <span className="eyebrow">{modeLabel} · The lantern grid</span>
                  <span className="mono" style={{ fontSize: '0.8125rem' }}>
                    Board {index + 1} of {session.rounds.length} · {puzzle.size}×{puzzle.size}
                  </span>
                </div>
              </div>
              <div className="row gap-10">
                <div className="round-dots" aria-hidden="true">
                  {session.rounds.map((_, i) => (
                    <span
                      key={i}
                      className="round-dot"
                      data-state={i < index ? 'done' : i === index ? 'now' : 'todo'}
                    />
                  ))}
                </div>
                <span className={`timer${elapsedRatio > 1 ? ' is-over' : ''}`} aria-label="Time on this board">
                  {clock(elapsed)}
                </span>
              </div>
            </div>

            <div
              className="board-glow"
              data-placed={sparks.length}
            >
            <Board
              key={`${session.sessionId}-${index}`}
              size={puzzle.size}
              region={puzzle.region}
              givens={puzzle.givens}
              sparks={sparks}
              excluded={excluded}
              hinted={hinted}
              solved={complete || phase === 'solving'}
              locked={phase === 'solving'}
              label={`Board ${index + 1}, ${puzzle.size} by ${puzzle.size}. ${sparks.length} of ${puzzle.size} sparks placed.`}
              onToggle={toggle}
              onExclude={exclude}
            />
            </div>

            <div className="play-tools">
              <button
                className="btn btn-sm"
                onClick={() => setHintOpen(true)}
                disabled={phase !== 'playing' || hintsLeft <= 0 || hinted.length > 0}
              >
                Hint
                <span className="hint-cost">−{HINT_COST}</span>
                <span className="chip" style={{ padding: '1px 7px', fontSize: '0.6875rem' }}>
                  {hintsLeft}
                </span>
              </button>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => {
                  setSparks(puzzle.givens);
                  setExcluded([]);
                  sfx.remove();
                }}
                disabled={phase !== 'playing'}
              >
                Clear
              </button>
              <button className="btn btn-sm btn-ghost" onClick={onTutorial}>
                Rules
              </button>
            </div>

            <p className="par-note" style={{ textAlign: 'center', maxWidth: '40ch' }}>
              {conflicts.size > 0
                ? 'Two sparks are touching or sharing a line. Move one.'
                : sparks.length === puzzle.size
                  ? 'Checking…'
                  : `${puzzle.size - sparks.length} spark${puzzle.size - sparks.length === 1 ? '' : 's'} to place`}
              {hinted.length > 0 ? ' · hint used on this board' : ''}
            </p>
          </div>

          <aside className="play-side">
            <div className="card stack gap-14">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="eyebrow">Score</span>
                <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                  par {Math.round(par / 1000)}s
                </span>
              </div>
              <div className="score-big" style={{ fontSize: '2.25rem' }}>
                {score}
              </div>
              <div className="stack gap-6">
                {session.rounds.map((r, i) => (
                  <div
                    key={i}
                    className="row"
                    style={{ justifyContent: 'space-between', fontSize: '0.8125rem', color: i === index ? 'var(--text)' : 'var(--muted)' }}
                  >
                    <span className="mono">
                      {String(i + 1).padStart(2, '0')} · {r.size}×{r.size}
                    </span>
                    <span className="mono">
                      {i < index ? 'done' : i === index ? 'now' : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-flat stack gap-10">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="eyebrow">The lanterns</span>
                <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                  {sparks.length}/{puzzle.size} sparks
                </span>
              </div>
              <div className="lantern-strip" aria-hidden="true">
                {session.rounds.map((r, i) => (
                  <span
                    key={i}
                    className="lantern"
                    data-state={i < index ? 'lit' : i === index ? 'now' : 'dark'}
                    data-size={r.size}
                  />
                ))}
              </div>
              <p className="par-note" style={{ margin: 0 }}>
                Board {index + 1} of {session.rounds.length}: {sparks.length} of {puzzle.size} sparks
                placed. Each board you finish lights its lantern.
              </p>
            </div>

            <div className="card-flat stack gap-10">
              <span className="eyebrow">The rule</span>
              <p className="par-note" style={{ margin: 0 }}>
                One spark per row, column and tone. No two sparks touch — including diagonally.
                Locked sparks are part of the answer.
              </p>
              <div className="board-legend" style={{ justifyContent: 'flex-start' }}>
                <span className="legend-item">
                  <span className="legend-swatch" style={{ background: 'var(--accent)' }} /> spark
                </span>
                <span className="legend-item">
                  <span className="legend-swatch" style={{ background: 'var(--surface-2)' }} /> ✕ ruled out
                </span>
              </div>
            </div>

            {attempts > 0 ? (
              <p className="par-note">Rejected placements: {attempts}. They cost time, never points.</p>
            ) : null}
          </aside>
        </div>
      </div>

      {banner ? (
        <div className="round-banner" aria-hidden="true">
          <div className="round-banner-inner">
            <div className="eyebrow">{banner}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--step-3)' }}>
              {puzzle.size} × {puzzle.size}
            </div>
          </div>
        </div>
      ) : null}

      {hintOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setHintOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="Use a hint" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2 className="modal-title">Reveal a spark?</h2>
              <button className="icon-btn" onClick={() => setHintOpen(false)} aria-label="Close">
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="stack gap-14">
              <p className="par-note" style={{ margin: 0 }}>
                One correct spark is lit for you on this board, and you lose the clean-board bonus.
                It costs <strong style={{ color: 'var(--text)' }}>{HINT_COST} points</strong> plus the{' '}
                <strong style={{ color: 'var(--text)' }}>25-point</strong> clean bonus. You have{' '}
                {hintsLeft} hint{hintsLeft === 1 ? '' : 's'} left today.
              </p>
              <div className="row gap-10">
                <button className="btn btn-primary" onClick={() => void takeHint()}>
                  Reveal it (−{HINT_COST})
                </button>
                <button className="btn btn-ghost" onClick={() => setHintOpen(false)}>
                  Keep thinking
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <Toast message={toast} />
    </main>
  );
}
