import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Countdown } from '../components/ui';
import { dayNumber, dayToISO, nextResetAt } from '../../shared/dates';
import {
  SECONDS_PER_PROMPT,
  dailyPrompts,
  matchAnswer,
  maxPointsFor,
  pointsFor,
  type SurveyMode,
  type SurveyPrompt,
} from '../../shared/survey';
import { runFor, saveRun, streakFor, type LoggedAnswer, type SurveyRun } from '../lib/surveyStore';
import { sfx } from '../lib/audio';

const GAMES: Record<SurveyMode, { name: string; tagline: string; rule: string; scoring: string }> = {
  common: {
    name: 'Common',
    tagline: 'Give the answer everybody gives.',
    rule: 'Five prompts, 35 seconds each. Type the answer you think most people would give.',
    scoring: 'You score the share of people who said it. The obvious answer pays best.',
  },
  rare: {
    name: 'Rare',
    tagline: 'Give the answer nobody gives.',
    rule: 'Five prompts, 35 seconds each. Type the answer you think hardly anybody would give.',
    scoring:
      'You score what the crowd left over: the loneliest answer pays best. It still has to be one somebody gave.',
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

function glyph(mode: SurveyMode, points: number): string {
  if (points <= 0) return '⬛';
  if (mode === 'common') return points >= 18 ? '🟩' : points >= 8 ? '🟨' : '🟧';
  return points >= 75 ? '🟩' : points >= 45 ? '🟨' : '🟧';
}

function shareText(run: SurveyRun): string {
  const bars = run.answers.map((a) => glyph(run.mode, a.points)).join('');
  const label = GAMES[run.mode].name;
  return `Noct ${label} #${pad(run.day)}\n${bars}  ${run.score}/${run.max}\n${verdict(run.score, run.max)}\nnoct.game`;
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

        <div className="card stack gap-14" style={{ marginTop: 22 }}>
          <p className="par-note" style={{ margin: 0 }}>
            {game.rule}
          </p>
          <p className="par-note" style={{ margin: 0 }}>
            {game.scoring}
          </p>
          <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
            <span className="chip">5 prompts</span>
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
              Start {game.name} #{pad(day)}
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
  timedOut: boolean;
}

function SurveyRunner({
  mode,
  day,
  prompts,
  onDone,
}: {
  mode: SurveyMode;
  day: number;
  prompts: SurveyPrompt[];
  onDone: (run: SurveyRun) => void;
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
      const points = answer ? pointsFor(mode, answer.weight) : 0;
      const entry: LoggedAnswer = {
        promptId: prompt.id,
        asked: prompt.prompt,
        given,
        matched: answer ? answer.text : null,
        weight: answer ? answer.weight : null,
        points,
      };
      setLog((prev) => [...prev, entry]);
      setReveal({ given, matched: entry.matched, weight: entry.weight, points, timedOut });
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

  return (
    <main className="main">
      <div className="wrap survey-wrap">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <span className="eyebrow">
            {GAMES[mode].name} · prompt {index + 1} of {prompts.length}
          </span>
          <span className="mono" style={{ fontSize: '0.8125rem', color: 'var(--muted)' }} aria-live="off">
            {Math.ceil(leftMs / 1000)}s
          </span>
        </div>
        <div className="time-bar" style={{ marginTop: 10 }} aria-hidden="true">
          <i style={{ width: `${reveal ? 0 : pct}%` }} />
        </div>

        <h1 className="prompt-text" style={{ margin: '28px 0 10px' }}>
          {prompt.prompt}
        </h1>
        <p className="par-note" style={{ marginTop: 0 }}>
          {mode === 'common' ? 'Name the answer most people would give.' : 'Name the answer hardly anybody would give.'}
        </p>

        {reveal ? (
          <div className="reveal" style={{ marginTop: 22 }} aria-live="polite">
            {reveal.matched ? (
              <>
                <span className="eyebrow">{reveal.weight}% said this</span>
                <div className="reveal-percent">{reveal.matched}</div>
                <p className="par-note" style={{ margin: 0 }}>
                  {mode === 'common'
                    ? reveal.points >= 18
                      ? 'Right with the crowd.'
                      : 'The crowd mostly went somewhere else.'
                    : reveal.points >= 75
                      ? 'Almost nobody said that. Exactly the idea.'
                      : 'Others said it too, so it is not rare enough.'}
                </p>
              </>
            ) : (
              <>
                <span className="eyebrow">{reveal.timedOut ? 'Out of time' : 'Nobody said that'}</span>
                <div className="reveal-percent">{reveal.given || '—'}</div>
                <p className="par-note" style={{ margin: 0 }}>
                  {reveal.timedOut
                    ? 'The clock ran out. No points on this one.'
                    : 'That was not one of the answers people gave, so it scores nothing.'}
                </p>
              </>
            )}
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: 8, gap: 10 }}>
              <span className="chip chip-ember">+{reveal.points}</span>
              <button className="btn btn-primary" onClick={next}>
                {last ? 'See your result' : 'Next prompt'}
              </button>
            </div>
          </div>
        ) : (
          <form
            style={{ marginTop: 22 }}
            onSubmit={(e) => {
              e.preventDefault();
              commit(input, false);
            }}
          >
            <label className="eyebrow" htmlFor="survey-answer">
              Your answer
            </label>
            <input
              id="survey-answer"
              ref={inputRef}
              className="answer-input"
              style={{ marginTop: 8 }}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              maxLength={40}
              placeholder="Type it, then press enter"
            />
            <div className="row gap-10" style={{ marginTop: 12, flexWrap: 'wrap' }}>
              <button className="btn btn-primary" type="submit">
                Lock it in
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => commit('', false)}>
                Skip
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}

function SurveyResult({ run, navigate }: { run: SurveyRun; navigate: (path: string) => void }) {
  const [copied, setCopied] = useState(false);
  const game = GAMES[run.mode];
  const other: SurveyMode = run.mode === 'common' ? 'rare' : 'common';
  const streak = streakFor(run.mode, run.day);

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
          <span className="result-max">/ {run.max}</span>
        </div>
        <div className="rating-word">{verdict(run.score, run.max)}</div>
        <div className="row gap-6" style={{ flexWrap: 'wrap' }}>
          <span className={`chip${streak.current > 0 ? ' chip-ember' : ''}`}>
            <span className="chip-dot" aria-hidden="true" />
            {streak.current}-day streak
          </span>
          <span className="chip">One attempt used</span>
          <span className="chip">{run.answers.length} prompts</span>
        </div>

        <section className="card stack gap-14" style={{ marginTop: 22 }}>
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
                <span className="mono">+{a.points}</span>
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
      </div>
    </main>
  );
}
