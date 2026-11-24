import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Countdown } from '../components/ui';
import { Journey, distanceFor } from '../components/Journey';
import { dayNumber, dayToISO, nextResetAt } from '../../shared/dates';
import {
  MAX_PER_PROMPT,
  PROMPTS_PER_DAY,
  ROUTE_KM,
  SECONDS_PER_PROMPT,
  TIERS,
  dailyPrompts,
  matchAnswer,
  maxPointsFor,
  rankFor,
  scoreFor,
  type SurveyMode,
  type SurveyPrompt,
  type Tier,
} from '../../shared/survey';
import { runFor, saveRun, streakFor, type LoggedAnswer, type SurveyRun } from '../lib/surveyStore';
import { sfx } from '../lib/audio';

const GAMES: Record<SurveyMode, { name: string; tagline: string; rule: string; scoring: string }> = {
  common: {
    name: 'Common',
    tagline: 'Give the answer everybody gives.',
    rule: `Seven prompts, ${SECONDS_PER_PROMPT} seconds each. Type the answer you think most people would give.`,
    scoring:
      'Answers are graded on a board of nine. The top answer is Moonrise and lifts you 100 points; lower answers lift less. Seven Moonrises is 700 points and a full 14 km route.',
  },
  rare: {
    name: 'Rare',
    tagline: 'Give the answer nobody gives.',
    rule: `Seven prompts, ${SECONDS_PER_PROMPT} seconds each. Type the answer you think hardly anybody would give.`,
    scoring:
      'The board is read from the bottom: the loneliest answer on it is Moonrise and lifts you 100 points. It still has to be an answer somebody gave.',
  },
};

function pad(day: number): string {
  return String(day).padStart(3, '0');
}

function verdict(score: number, max: number): string {
  const pct = max ? score / max : 0;
  if (pct >= 0.85) return 'Legendary';
  if (pct >= 0.7) return 'Excellent';
  if (pct >= 0.55) return 'Great';
  if (pct >= 0.35) return 'Good';
  return 'Warming up';
}

function glyph(points: number): string {
  if (points >= TIERS.moonrise.points) return '🌕';
  if (points >= TIERS.aurora.points) return '🟩';
  if (points >= TIERS.starlit.points) return '🟨';
  if (points >= TIERS.lantern.points) return '🟧';
  return '⬛';
}

function shareText(run: SurveyRun): string {
  const bars = run.answers.map((a) => glyph(a.points)).join('');
  const label = GAMES[run.mode].name;
  const km = distanceFor(run.max > 0 ? run.score / run.max : 0).toFixed(1);
  return `Noct ${label} #${pad(run.day)}\n${bars}  ${km} km · ${run.score}/${run.max}\n${verdict(run.score, run.max)}\nnoct.game`;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(area);
      return ok;
    } catch {
      return false;
    }
  }
}

export function Survey({ mode, navigate }: { mode: SurveyMode; navigate: (path: string) => void }) {
  const day = dayNumber();
  const prompts = useMemo(() => dailyPrompts(day, mode), [day, mode]);
  const [stored, setStored] = useState<SurveyRun | null>(() => runFor(mode, day));
  const [started, setStarted] = useState(false);

  useEffect(() => {
    setStored(runFor(mode, day));
    setStarted(false);
  }, [mode, day]);

  if (stored) return <SurveyResult run={stored} navigate={navigate} />;
  if (started) {
    return (
      <SurveyRunner
        mode={mode}
        day={day}
        prompts={prompts}
        onDone={(run) => {
          saveRun(run);
          setStored(run);
        }}
        onQuit={() => setStarted(false)}
      />
    );
  }
  return <SurveyIntro mode={mode} day={day} onStart={() => setStarted(true)} navigate={navigate} />;
}

function SurveyIntro({
  mode,
  day,
  onStart,
  navigate,
}: {
  mode: SurveyMode;
  day: number;
  onStart: () => void;
  navigate: (path: string) => void;
}) {
  const game = GAMES[mode];
  const streak = streakFor(mode, day);

  return (
    <main className="main">
      <div className="wrap survey-wrap">
        <div className="eyebrow">Survey · {mode === 'common' ? 'game one' : 'game two'}</div>
        <h1 className="hero-title" style={{ fontSize: 'var(--step-3)', margin: '10px 0 12px' }}>
          {game.name}
        </h1>
        <p className="lede">{game.tagline}</p>

        <div style={{ marginTop: 20 }}>
          <Journey progress={0} />
        </div>

        <div className="card stack gap-14">
          <p className="par-note" style={{ margin: 0 }}>
            {game.rule}
          </p>
          <p className="par-note" style={{ margin: 0 }}>
            {game.scoring}
          </p>
          <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
            <span className="chip">{PROMPTS_PER_DAY} prompts</span>
            <span className="chip">{SECONDS_PER_PROMPT}s each</span>
            <span className="chip">One attempt a day</span>
            <span className="chip chip-ember">
              <span className="chip-dot" aria-hidden="true" />
              {streak.current}-day streak
            </span>
          </div>
          <hr className="hairline" />
          <div className="row gap-10" style={{ flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-lg" onClick={onStart}>
              Begin the walk · #{pad(day)}
            </button>
            <button className="btn btn-ghost" onClick={() => navigate('/')}>
              Back to menu
            </button>
          </div>
          <p className="par-note" style={{ margin: 0, fontSize: '0.8125rem' }}>
            Same prompts for everyone today. Answers are scored on this device.
          </p>
        </div>
      </div>
    </main>
  );
}

interface Reveal {
  given: string;
  matched: string | null;
  weight: number | null;
  points: number;
  tier: Tier | null;
  rank: number | null;
  matchedIndex: number | null;
  timedOut: boolean;
}

function SurveyRunner({
  mode,
  day,
  prompts,
  onDone,
  onQuit,
}: {
  mode: SurveyMode;
  day: number;
  prompts: SurveyPrompt[];
  onDone: (run: SurveyRun) => void;
  onQuit: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState('');
  const [leftMs, setLeftMs] = useState(SECONDS_PER_PROMPT * 1000);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [log, setLog] = useState<LoggedAnswer[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const startedAt = useRef(Date.now());
  const locked = useRef(false);
  const prompt = prompts[index];

  useEffect(() => {
    setInput('');
    setReveal(null);
    setLeftMs(SECONDS_PER_PROMPT * 1000);
    startedAt.current = Date.now();
    locked.current = false;
    inputRef.current?.focus();
  }, [index]);

  const commit = useCallback(
    (raw: string, timedOut: boolean) => {
      if (locked.current) return;
      locked.current = true;
      const given = raw.trim();
      const matchedIndex = given ? matchAnswer(prompt, given) : null;
      const answer = matchedIndex === null ? null : prompt.answers[matchedIndex];
      const scored = answer ? scoreFor(mode, prompt, matchedIndex as number) : null;
      const points = scored ? scored.points : 0;
      const entry: LoggedAnswer = {
        promptId: prompt.id,
        asked: prompt.prompt,
        given,
        matched: answer ? answer.text : null,
        weight: answer ? answer.weight : null,
        points,
        tier: scored ? scored.tier : null,
        rank: scored ? scored.rank : null,
      };
      setLog((prev) => [...prev, entry]);
      setReveal({
        given,
        matched: entry.matched,
        weight: entry.weight,
        points,
        tier: entry.tier ?? null,
        rank: entry.rank ?? null,
        matchedIndex,
        timedOut,
      });
      if (timedOut) sfx.blocked();
      else if (points > 0) sfx.solve();
      else sfx.tap();
    },
    [mode, prompt],
  );

  useEffect(() => {
    if (reveal) return;
    const id = setInterval(() => {
      const left = SECONDS_PER_PROMPT * 1000 - (Date.now() - startedAt.current);
      setLeftMs(Math.max(0, left));
      if (left <= 0) commit(inputRef.current?.value ?? '', true);
    }, 100);
    return () => clearInterval(id);
  }, [commit, reveal]);

  function next(): void {
    if (!reveal) return;
    if (index + 1 >= prompts.length) {
      const answers = [...log];
      onDone({
        mode,
        day,
        score: answers.reduce((sum, a) => sum + a.points, 0),
        max: prompts.reduce((sum, p) => sum + maxPointsFor(mode, p), 0),
        answers,
        finishedAt: Date.now(),
      });
      return;
    }
    setIndex(index + 1);
  }

  const last = index + 1 >= prompts.length;
  const pct = Math.max(0, Math.min(100, (leftMs / (SECONDS_PER_PROMPT * 1000)) * 100));
  const maxTotal = prompts.reduce((sum, p) => sum + maxPointsFor(mode, p), 0);
  const earned = log.reduce((sum, a) => sum + a.points, 0);
  const progress = maxTotal > 0 ? earned / maxTotal : 0;
  const secondsLeft = Math.ceil(leftMs / 1000);

  const boardMax = Math.max(...prompt.answers.map((a) => a.weight), 1);
  const board = prompt.answers
    .map((a, i) => ({ text: a.text, weight: a.weight, i, rank: rankFor(mode, prompt, i) }))
    .sort((x, y) => x.rank - y.rank)
    .slice(0, 3);

  return (
    <main className="stage">
      <Journey
        variant="stage"
        progress={progress}
        moving={Boolean(reveal && reveal.points > 0)}
        answer={reveal ? reveal.matched ?? reveal.given : input}
      />

      <div className="stage-hud">
        <span className="stage-pill">
          <em>Distance</em>
          <b>{distanceFor(progress).toFixed(1)} km</b>
        </span>
        <span className="stage-pill">
          <em>Prompt</em>
          <b>
            {index + 1} / {prompts.length}
          </b>
        </span>
        <span className={`stage-pill${!reveal && secondsLeft <= 5 ? ' is-urgent' : ''}`}>
          <em>Time</em>
          <b>{reveal ? '—' : `${secondsLeft}s`}</b>
        </span>
      </div>

      <div className="stage-rail" aria-hidden="true">
        <span className="stage-rail-line">
          <i style={{ width: `${progress * 100}%` }} />
          <b style={{ left: `${progress * 100}%` }} />
        </span>
        <span className="stage-rail-marks">
          <span>Moss</span>
          <span>Amber</span>
          <span>Glass</span>
          <span>Ember</span>
        </span>
      </div>

      <section className="stage-panel">
        <div className="stage-panel-head">
          <span className="eyebrow">
            {GAMES[mode].name} · {mode === 'common' ? 'the crowd' : 'the leftovers'}
          </span>
          <button className="stage-quit" type="button" onClick={onQuit}>
            Quit
          </button>
        </div>

        <h1 className="stage-prompt">{prompt.prompt}</h1>

        <div className="time-bar" aria-hidden="true">
          <i style={{ width: `${reveal ? 0 : pct}%` }} />
        </div>

        {reveal ? (
          <div className="stage-reveal" aria-live="polite">
            <div className="stage-reveal-top">
              <span className="stage-tier" data-tier={reveal.tier ?? 'lost'}>
                {reveal.tier ? TIERS[reveal.tier].name : 'Lost'}
              </span>
              <span className="stage-reveal-answer">
                {reveal.matched ? `“${reveal.matched}”` : reveal.given ? `“${reveal.given}”` : '—'}
              </span>
              <span className="stage-reveal-points">+{reveal.points}</span>
              <button className="btn btn-primary" onClick={next}>
                {last ? 'See the map' : 'Next'}
              </button>
            </div>
            {reveal.matched ? null : (
              <p className="stage-reveal-line">
                {reveal.timedOut
                  ? 'The clock ran out. Nothing gained on this one.'
                  : 'Nobody on the board said that. Nothing gained.'}
              </p>
            )}

            <div className="stage-board">
              <div className="stage-board-head">
                <span className="eyebrow">The board</span>
                <span className="eyebrow">crowd share</span>
              </div>
              {board.map((row) => (
                <div className={`stage-board-row${row.i === reveal.matchedIndex ? ' is-you' : ''}`} key={row.text}>
                  <span className="stage-board-rank">{row.rank}</span>
                  <span className="stage-board-text">{row.text}</span>
                  <span className="stage-board-bar">
                    <i style={{ width: `${Math.round((row.weight / boardMax) * 100)}%` }} />
                  </span>
                  <span className="stage-board-pct">{row.weight}%</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <form
            className="stage-form"
            onSubmit={(e) => {
              e.preventDefault();
              commit(input, false);
            }}
          >
            <div className="stage-input-row">
              <input
                id="survey-answer"
                ref={inputRef}
                className="answer-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                maxLength={40}
                aria-label="Your answer"
                placeholder={mode === 'common' ? 'What would most people say?' : 'What would nobody say?'}
              />
              <button className="btn btn-primary" type="submit">
                Lock it in
              </button>
            </div>
            <div className="stage-form-foot">
              <span className="par-note" style={{ margin: 0, fontSize: '0.8125rem' }}>
                {mode === 'common'
                  ? 'Top of the board lifts 100 points.'
                  : 'Bottom of the board lifts 100 points.'}
              </span>
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => commit('', false)}>
                Skip
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}

function SurveyResult({ run, navigate }: { run: SurveyRun; navigate: (path: string) => void }) {
  const [copied, setCopied] = useState(false);
  const game = GAMES[run.mode];
  const other: SurveyMode = run.mode === 'common' ? 'rare' : 'common';
  const streak = streakFor(run.mode, run.day);
  const km = distanceFor(run.max > 0 ? run.score / run.max : 0).toFixed(1);
  const perfect = PROMPTS_PER_DAY * MAX_PER_PROMPT;

  async function copy(): Promise<void> {
    const ok = await copyText(shareText(run));
    setCopied(ok);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="main">
      <div className="wrap survey-wrap">
        <div className="eyebrow">
          {game.name} #{pad(run.day)} · {dayToISO(run.day)}
        </div>
        <div className="result-score" style={{ marginTop: 10 }}>
          <span className="score-big">{run.score}</span>
          <span className="result-max">/ {run.max || perfect}</span>
        </div>
        <div className="rating-word">{verdict(run.score, run.max)}</div>
        <div className="row gap-6" style={{ flexWrap: 'wrap' }}>
          <span className="chip chip-ember">{km} km walked</span>
          <span className={`chip${streak.current > 0 ? ' chip-ember' : ''}`}>
            <span className="chip-dot" aria-hidden="true" />
            {streak.current}-day streak
          </span>
          <span className="chip">One attempt used</span>
          <span className="chip">{run.answers.length} prompts</span>
        </div>

        <div style={{ marginTop: 18 }}>
          <Journey progress={run.max > 0 ? run.score / run.max : 0} />
        </div>

        <section className="card stack gap-14">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="eyebrow">Your answers</span>
            <span className="eyebrow">points</span>
          </div>
          <div className="score-rows">
            {run.answers.map((a, i) => (
              <div className="score-row" key={`${a.promptId}-${i}`}>
                <div className="stack gap-6" style={{ minWidth: 0 }}>
                  <span className="par-note" style={{ margin: 0 }}>
                    {a.asked}
                  </span>
                  <span className="mono" style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>
                    {a.given ? `“${a.given}”` : 'no answer'} ·{' '}
                    {a.weight === null ? 'nobody said that' : `${a.weight}% said ${a.matched}`}
                  </span>
                </div>
                <div className="stack gap-6" style={{ alignItems: 'flex-end' }}>
                  <span className="mono">+{a.points}</span>
                  <span className="stage-tier is-small" data-tier={a.tier ?? 'lost'}>
                    {a.tier ? TIERS[a.tier].name : 'Lost'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="row gap-10" style={{ marginTop: 18, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => void copy()}>
            {copied ? 'Copied' : 'Copy result'}
          </button>
          <button className="btn" onClick={() => navigate(`/${other}`)}>
            Play {GAMES[other].name} today
          </button>
          <button className="btn btn-ghost" onClick={() => navigate('/')}>
            Back to menu
          </button>
        </div>

        <p className="par-note" style={{ marginTop: 14 }}>
          Next {game.name} in <Countdown to={nextResetAt()} />
        </p>
        <p className="par-note" style={{ marginTop: 4, fontSize: '0.8125rem' }}>
          A perfect walk is {perfect} points and {ROUTE_KM} km.
        </p>
      </div>
    </main>
  );
}
