import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  applyMove,
  attacked,
  bestMove,
  chooseMove,
  initialState,
  inCheck,
  kingSquare,
  legalMoves,
  outcome,
  parseFen,
  PIECE_NAME,
  positionKey,
  sanFor,
  squareName,
  type ChessMove,
  type ChessState,
  type Kind,
  type MoveRecord,
  type Outcome,
} from '../lib/chess';
import { dayNumber } from '../../shared/dates';
import { sfx } from '../lib/audio';
import { haptic } from '../lib/settings';
import { hashSeed, mulberry32 } from '../lib/rng';
import {
  readGames,
  recordChess,
  saveChessGame,
  type ChessLevel,
  type ChessResult,
} from '../lib/gamesStore';
import { ScreenHead, Segmented } from '../components/ui';

/** Filled glyphs for both colours; CSS gives them their ink. */
const GLYPH: Record<Kind, string> = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };

const LEVEL_LABEL: Record<ChessLevel, string> = { 1: 'Novice', 2: 'Steady', 3: 'Sharp' };

function sameMove(a: ChessMove, b: ChessMove): boolean {
  return a.from === b.from && a.to === b.to && a.promo === b.promo && a.castle === b.castle && a.ep === b.ep;
}

function buildRecords(start: ChessState, moves: ChessMove[]): MoveRecord[] {
  let s = start;
  const out: MoveRecord[] = [];
  for (const move of moves) {
    const legal = legalMoves(s);
    const found = legal.find((m) => sameMove(m, move));
    if (!found) break;
    out.push({ move: found, san: sanFor(s, found, legal) });
    s = applyMove(s, found);
  }
  return out;
}

function outcomeText(result: Outcome, side: 'w' | 'b'): string {
  if (result.kind === 'checkmate') {
    return result.winner === side ? 'Checkmate. You win.' : 'Checkmate. The bot wins.';
  }
  if (result.kind === 'stalemate') return 'Stalemate. A draw.';
  if (result.kind === 'draw') {
    if (result.reason === 'material') return 'Draw: not enough material.';
    if (result.reason === 'fifty') return 'Draw: fifty moves without a capture.';
    return 'Draw by repetition.';
  }
  return '';
}

export function Chess({ navigate }: { navigate: (path: string) => void }) {
  const day = dayNumber();

  const initial = useMemo(() => {
    const store = readGames().chess;
    const saved = store.saved;
    /* /chess?fen=… opens a shared position as a free game; &side=w|b picks a seat. */
    const params = new URLSearchParams(window.location.search);
    const shared = params.get('fen');
    const parsed = shared ? parseFen(shared) : null;
    /* A saved game wins unless the link asks for a different position. */
    const savedFits = saved && (saved.mode === 'free' || saved.day === day) && (!parsed || saved.fen === shared);
    if (saved && savedFits) {
      return {
        mode: saved.mode,
        level: saved.level,
        side: saved.side,
        moves: saved.moves,
        fen: saved.fen ?? null,
        finished: saved.finished ?? false,
      };
    }
    if (shared && parsed) {
      const seat = params.get('side');
      const side = seat === 'w' || seat === 'b' ? seat : parsed.turn;
      return {
        mode: 'free' as const,
        level: store.level,
        side,
        moves: [] as ChessMove[],
        fen: shared,
        finished: false,
      };
    }
    return {
      mode: 'daily' as const,
      level: store.level,
      side: store.side,
      moves: [] as ChessMove[],
      fen: null,
      finished: false,
    };
  }, [day]);

  const [mode, setMode] = useState<'daily' | 'free'>(initial.mode);
  const [level, setLevel] = useState<ChessLevel>(initial.level);
  const [side, setSide] = useState<'w' | 'b'>(initial.side);
  const [fen, setFen] = useState<string | null>(initial.fen);
  const startState = useMemo(
    () => (fen ? parseFen(fen) ?? initialState() : initialState()),
    [fen],
  );
  const [records, setRecords] = useState<MoveRecord[]>(() => buildRecords(startState, initial.moves));
  const [selected, setSelected] = useState<number | null>(null);
  const [promo, setPromo] = useState<{ from: number; to: number } | null>(null);
  const [thinking, setThinking] = useState(false);
  const [hint, setHint] = useState<{ from: number; to: number } | null>(null);
  const [flipped, setFlipped] = useState(initial.side === 'b');
  const [recorded, setRecorded] = useState(initial.finished);
  const [threats, setThreats] = useState(false);
  const [coronation, setCoronation] = useState<number | null>(null);

  const listRef = useRef<HTMLOListElement>(null);
  const coronationTimer = useRef<number | null>(null);

  const state = useMemo<ChessState>(
    () => records.reduce((s, r) => applyMove(s, r.move), startState),
    [records, startState],
  );
  const legal = useMemo(() => legalMoves(state), [state]);
  const last = records.length ? records[records.length - 1].move : null;

  const repetition = useMemo(() => {
    let s = startState;
    const counts = new Map<string, number>();
    counts.set(positionKey(s), 1);
    for (const r of records) {
      s = applyMove(s, r.move);
      const key = positionKey(s);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts.get(positionKey(state)) ?? 1;
  }, [records, state, startState]);

  const result = useMemo(() => outcome(state, repetition), [state, repetition]);
  const over = result.kind !== 'playing';
  const myTurn = !over && state.turn === side;
  const checked = !over && inCheck(state);

  const selectedMoves = useMemo(
    () => (selected === null ? [] : legal.filter((m) => m.from === selected)),
    [legal, selected],
  );

  /* The balance of the board, in pawns — the oldest way to read a game. */
  const material = useMemo(() => {
    const value: Record<Kind, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    let white = 0;
    let black = 0;
    for (const piece of state.board) {
      if (!piece) continue;
      if (piece.c === 'w') white += value[piece.k];
      else black += value[piece.k];
    }
    return { white, black, diff: white - black };
  }, [state]);

  /* Your pieces that the other side is pointing at. */
  const threatSquares = useMemo(() => {
    const out = new Set<number>();
    if (!threats || over) return out;
    const enemy = side === 'w' ? 'b' : 'w';
    state.board.forEach((piece, i) => {
      if (piece && piece.c === side && attacked(state.board, i, enemy)) out.add(i);
    });
    return out;
  }, [threats, over, side, state]);

  const lastSan = records.length ? records[records.length - 1].san : null;

  useEffect(
    () => () => {
      if (coronationTimer.current !== null) clearTimeout(coronationTimer.current);
    },
    [],
  );

  useEffect(() => {
    saveChessGame({
      day,
      mode,
      level,
      side,
      moves: records.map((r) => r.move),
      fen: fen ?? undefined,
      finished: over,
    });
  }, [day, mode, level, side, records, fen, over]);

  const commit = useCallback(
    (move: ChessMove, quiet = false) => {
      const current = records.reduce((s, r) => applyMove(s, r.move), startState);
      const now = legalMoves(current);
      const found = now.find((m) => sameMove(m, move));
      if (!found) return;
      const nextState = applyMove(current, found);
      setRecords([...records, { move: found, san: sanFor(current, found, now) }]);
      setSelected(null);
      setHint(null);
      setPromo(null);
      if (found.promo) {
        setCoronation(found.to);
        if (coronationTimer.current !== null) clearTimeout(coronationTimer.current);
        coronationTimer.current = window.setTimeout(() => setCoronation(null), 900);
      }
      if (inCheck(nextState)) sfx.hint();
      else if (found.capture) sfx.balloonPop();
      else if (found.castle) sfx.tap();
      else sfx.place();
      /* The bot's move is not your tap, so it does not buzz your phone. */
      if (!quiet) haptic(found.capture ? 12 : 7);
    },
    [records, startState],
  );

  /* The bot answers on its own turn, once the board has painted. */
  useEffect(() => {
    if (over || state.turn === side) return;
    let cancelled = false;
    setThinking(true);
    const timer = setTimeout(() => {
      if (cancelled) return;
      const rnd = mulberry32(
        mode === 'daily'
          ? hashSeed('chess-bot', day, positionKey(state))
          : hashSeed('chess-bot', Date.now(), records.length),
      );
      const move = chooseMove(state, level, rnd);
      if (!cancelled && move) commit(move, true);
      setThinking(false);
    }, mode === 'daily' ? 340 : 420);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      setThinking(false);
    };
  }, [state, over, side, level, mode, day, records.length, commit]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [records.length]);

  useEffect(() => {
    if (!over || recorded) return;
    setRecorded(true);
    const outcomeValue: ChessResult =
      result.kind === 'checkmate' ? (result.winner === side ? 'win' : 'loss') : 'draw';
    recordChess(day, outcomeValue, level, records.length);
    if (outcomeValue === 'win') {
      sfx.complete();
      haptic(24);
    } else if (outcomeValue === 'loss') {
      sfx.tier('lost');
      haptic(12);
    } else {
      sfx.tap();
    }
  }, [over, recorded, result, side, level, records.length, day]);

  const resetGame = useCallback(
    (opts: { mode?: 'daily' | 'free'; level?: ChessLevel; side?: 'w' | 'b' } = {}) => {
      const nextMode = opts.mode ?? mode;
      const nextSide = opts.side ?? side;
      const nextLevel = opts.level ?? level;
      setMode(nextMode);
      setSide(nextSide);
      setLevel(nextLevel);
      setFen(null);
      setRecords([]);
      setSelected(null);
      setPromo(null);
      setHint(null);
      setRecorded(false);
      setFlipped(nextSide === 'b');
      saveChessGame({ day, mode: nextMode, level: nextLevel, side: nextSide, moves: [], finished: false });
      /* A new game is a normal game: drop the shared-position link from the address. */
      if (fen) {
        const url = new URL(window.location.href);
        url.searchParams.delete('fen');
        url.searchParams.delete('side');
        window.history.replaceState({}, '', url);
      }
    },
    [mode, side, level, day, fen],
  );

  const undo = useCallback(() => {
    if (thinking) return;
    const next = records.slice();
    if (next.length && next[next.length - 1].move.c !== side) next.pop();
    if (next.length && next[next.length - 1].move.c === side) next.pop();
    setRecords(next);
    setSelected(null);
    setPromo(null);
    setHint(null);
    /* Undo rewinds the moves, not the record: a game that already ended has
       been scored once, and taking the move back must not let it score again. */
    sfx.remove();
    haptic(8);
  }, [records, side, thinking]);

  const onSquare = (sq: number) => {
    if (over) {
      sfx.blocked();
      return;
    }
    if (!myTurn) {
      sfx.blocked();
      return;
    }
    const piece = state.board[sq];
    const targets = selectedMoves.filter((m) => m.to === sq);
    if (targets.length) {
      if (targets.length > 1 && targets.every((t) => t.promo)) {
        setPromo({ from: targets[0].from, to: sq });
        sfx.tap();
        return;
      }
      commit(targets[0]);
      return;
    }
    if (piece && piece.c === side) {
      if (sq === selected) {
        setSelected(null);
      } else {
        setSelected(sq);
        sfx.tap();
        haptic(6);
      }
      return;
    }
    if (selected !== null) {
      setSelected(null);
      sfx.blocked();
    }
  };

  const requestHint = () => {
    if (over || !myTurn || thinking) return;
    const move = bestMove(state);
    if (!move) return;
    setHint({ from: move.from, to: move.to });
    setSelected(move.from);
    sfx.hint();
    haptic(6);
    setTimeout(() => setHint(null), 2600);
  };

  const choosePromotion = (kind: Kind) => {
    if (!promo) return;
    const move = legal.find((m) => m.from === promo.from && m.to === promo.to && m.promo === kind);
    if (move) commit(move);
  };

  const order = useMemo(
    () => Array.from({ length: 64 }, (_, i) => (flipped ? 63 - i : i)),
    [flipped],
  );

  const captured = useMemo(() => {
    const byWhite: Kind[] = [];
    const byBlack: Kind[] = [];
    for (const r of records) {
      if (!r.move.capture) continue;
      if (r.move.c === 'w') byWhite.push(r.move.capture);
      else byBlack.push(r.move.capture);
    }
    return { w: byWhite, b: byBlack };
  }, [records]);

  const moveRows = useMemo(() => {
    const rows: { n: number; w?: string; b?: string }[] = [];
    for (let i = 0; i < records.length; i += 2) {
      rows.push({ n: i / 2 + 1, w: records[i]?.san, b: records[i + 1]?.san });
    }
    return rows;
  }, [records]);

  const checkKing = useMemo(() => {
    if (!checked) return -1;
    return kingSquare(state.board, state.turn);
  }, [checked, state]);

  const statusLine = over
    ? outcomeText(result, side)
    : thinking
      ? 'The bot is thinking…'
      : checked
        ? 'You are in check.'
        : myTurn
          ? 'Your move.'
          : 'Bot to move.';

  return (
    <main className="main">
      <div className="wrap" style={{ maxWidth: 1060 }}>
        <ScreenHead eyebrow={`Chess · Night ${String(day).padStart(3, '0')}`} title="The quiet board">
          The whole game, no clock. Every rule is in: castling, en passant, promotion, draws. The
          daily bot answers the same way for everyone.
        </ScreenHead>

        <div className="chess-layout">
          <div className="chess-main">
            <div className="chess-bar">
              <div className="chess-captured" aria-label="Pieces the bot has taken">
                <span className="chess-tray-label">Lost</span>
                {captured.b.length ? (
                  captured.b.map((k, i) => (
                    <span key={`${k}${i}`} className="chess-tray-piece is-w" aria-hidden="true">
                      {GLYPH[k]}
                    </span>
                  ))
                ) : (
                  <span className="chess-tray-empty">none</span>
                )}
              </div>
              <div className={`chess-turn${checked ? ' is-check' : ''}`} aria-live="polite">
                {statusLine}
                <span className="chess-lastmove">{lastSan ? ` · ${lastSan}` : ' · opening'}</span>
              </div>
              <div className="chess-captured" aria-label="Pieces you have taken">
                <span className="chess-tray-label">Taken</span>
                {captured.w.length ? (
                  captured.w.map((k, i) => (
                    <span key={`${k}${i}`} className="chess-tray-piece is-b" aria-hidden="true">
                      {GLYPH[k]}
                    </span>
                  ))
                ) : (
                  <span className="chess-tray-empty">none</span>
                )}
              </div>
            </div>

            <div className={`chess-board-wrap${over ? ' is-over' : ''}`}>
              <div
                className="chess-board"
                role="group"
                aria-label={`Chess board, ${side === 'w' ? 'you play white' : 'you play black'}`}
              >
                {order.map((sq) => {
                  const piece = state.board[sq];
                  const target = selectedMoves.find((m) => m.to === sq);
                  const isSelected = selected === sq;
                  const isLast = last !== null && (last.from === sq || last.to === sq);
                  const isCheck = checkKing === sq;
                  const isHint = hint !== null && (hint.from === sq || hint.to === sq);
                  const showRank = flipped ? sq % 8 === 7 : sq % 8 === 0;
                  const showFile = flipped ? sq < 8 : sq >= 56;
                  const label = `${squareName(sq)}, ${
                    piece ? `${piece.c === 'w' ? 'white' : 'black'} ${PIECE_NAME[piece.k]}` : 'empty'
                  }${target ? ', legal move' : ''}`;
                  return (
                    <button
                      key={sq}
                      type="button"
                      className={[
                        'chess-sq',
                        (sq + (sq >> 3)) % 2 === 0 ? 'is-light' : 'is-dark',
                        isSelected ? 'is-selected' : '',
                        target ? (target.capture || target.ep ? 'is-capture' : 'is-target') : '',
                        isLast ? 'is-last' : '',
                        isCheck ? 'is-check' : '',
                        isHint ? 'is-hint' : '',
                        threatSquares.has(sq) ? 'is-threat' : '',
                        coronation === sq ? 'is-coronation' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => onSquare(sq)}
                      aria-label={label}
                    >
                      {showRank ? (
                        <span className="chess-coord is-rank" aria-hidden="true">
                          {8 - (sq >> 3)}
                        </span>
                      ) : null}
                      {showFile ? (
                        <span className="chess-coord is-file" aria-hidden="true">
                          {squareName(sq)[0]}
                        </span>
                      ) : null}
                      {piece ? (
                        <span className={`chess-piece is-${piece.c}`} aria-hidden="true">
                          {GLYPH[piece.k]}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {promo ? (
                <div className="chess-promo" role="dialog" aria-label="Choose a promotion piece">
                  <span className="chess-promo-label">Promote to</span>
                  <div className="row gap-10">
                    {(['q', 'r', 'b', 'n'] as Kind[]).map((k) => (
                      <button
                        key={k}
                        type="button"
                        className={`chess-promo-btn is-${side}`}
                        onClick={() => choosePromotion(k)}
                        aria-label={`Promote to ${k}`}
                      >
                        {GLYPH[k]}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {over ? (
                <div className="chess-over" role="status">
                  <span className="chess-over-eyebrow">
                    {result.kind === 'checkmate' ? 'Checkmate' : result.kind === 'stalemate' ? 'Stalemate' : 'Draw'}
                  </span>
                  <strong>{outcomeText(result, side)}</strong>
                  <span className="chess-over-note">
                    {records.length} plies · level {level} · {mode === 'daily' ? 'daily' : 'free play'}
                  </span>
                  <div className="row gap-10" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
                    <button className="btn btn-sm btn-primary" onClick={() => resetGame()}>
                      Play again
                    </button>
                    <button className="btn btn-sm btn-ghost" onClick={undo}>
                      Undo
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="chess-under">
              <div className="row gap-10" style={{ flexWrap: 'wrap' }}>
                <button className="btn btn-sm" onClick={() => resetGame()} disabled={thinking}>
                  New game
                </button>
                <button className="btn btn-sm btn-ghost" onClick={undo} disabled={!records.length || thinking}>
                  Undo
                </button>
                <button className="btn btn-sm btn-ghost" onClick={requestHint} disabled={!myTurn || thinking}>
                  Hint
                </button>
                <button
                  className={`btn btn-sm${threats ? ' btn-primary' : ' btn-ghost'}`}
                  aria-pressed={threats}
                  onClick={() => {
                    setThreats((t) => !t);
                    sfx.tap();
                  }}
                >
                  Threats
                </button>
                <button className="btn btn-sm btn-ghost" onClick={() => setFlipped((f) => !f)}>
                  Flip
                </button>
                <button className="btn btn-sm btn-ghost" onClick={() => navigate('/')}>
                  Menu
                </button>
              </div>
              <span className="chess-note">
                {fen
                  ? 'Shared position · free play'
                  : mode === 'daily'
                    ? 'Daily bot · same reply for everyone today'
                    : 'Free play · bot varies'}
              </span>
            </div>
          </div>

          <aside className="chess-side">
            <div className="card-flat stack gap-14">
              <span className="eyebrow">Setup</span>
              <div className="stack gap-6">
                <span className="chess-field-label">Mode</span>
                <Segmented
                  label="Game mode"
                  value={mode}
                  options={[
                    { value: 'daily', label: 'Daily' },
                    { value: 'free', label: 'Free play' },
                  ]}
                  onChange={(value) => resetGame({ mode: value })}
                />
              </div>
              <div className="stack gap-6">
                <span className="chess-field-label">Bot</span>
                <Segmented
                  label="Bot level"
                  value={String(level)}
                  options={[
                    { value: '1', label: 'Novice' },
                    { value: '2', label: 'Steady' },
                    { value: '3', label: 'Sharp' },
                  ]}
                  onChange={(value) => setLevel(Number(value) as ChessLevel)}
                />
              </div>
              <div className="stack gap-6">
                <span className="chess-field-label">You play</span>
                <Segmented
                  label="Your side"
                  value={side}
                  options={[
                    { value: 'w', label: 'White' },
                    { value: 'b', label: 'Black' },
                  ]}
                  onChange={(value) => resetGame({ side: value as 'w' | 'b' })}
                />
              </div>
              <p className="par-note" style={{ margin: 0 }}>
                Level {level} · {LEVEL_LABEL[level]}. Changing side starts a new game; the bot level can change
                mid-game.
              </p>
            </div>

            <div className="card-flat stack gap-10 chess-material">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="eyebrow">The balance</span>
                <span className="chip">
                  {material.diff === 0
                    ? 'Even'
                    : `${material.diff > 0 ? 'White' : 'Black'} +${Math.abs(material.diff)}`}
                </span>
              </div>
              <div className="chess-material-bar" aria-hidden="true">
                <span
                  className="chess-material-fill"
                  style={{
                    width: `${(material.white / Math.max(1, material.white + material.black)) * 100}%`,
                  }}
                />
              </div>
              <div className="chess-material-legend">
                <span>White {material.white}</span>
                <span>Black {material.black}</span>
              </div>
            </div>

            <div className="card-flat stack gap-10">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="eyebrow">Moves</span>
                <span className="chip">{records.length} plies</span>
              </div>
              {moveRows.length ? (
                <ol className="chess-moves" ref={listRef} aria-label="Move list">
                  {moveRows.map((row) => (
                    <li key={row.n}>
                      <span className="chess-move-n">{row.n}.</span>
                      <span className={row.w && row.w.endsWith('#') ? 'is-mate' : undefined}>{row.w ?? '…'}</span>
                      <span className={row.b && row.b.endsWith('#') ? 'is-mate' : undefined}>{row.b ?? ''}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="par-note" style={{ margin: 0 }}>
                  No moves yet. Tap a piece; its legal squares light up.
                </p>
              )}
            </div>

          </aside>
        </div>
      </div>
    </main>
  );
}
