import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Countdown } from '../components/ui';
import { Climb } from '../components/Climb';
import { StartScreen } from '../components/StartScreen';
import { Journey } from '../components/Journey';
import { dayNumber, dayToISO, nextResetAt } from '../../shared/dates';
import {
  BALLOONS,
  BOARD_SIZE,
  PROMPTS_PER_DAY,
  ROUTE_KM,
  SECONDS_PER_PROMPT,
  TIERS,
  bandFor,
  classicPrompts,
  dailyPrompts,
  difficultyFor,
  endlessPromptAt,
  heightFor,
  judge,
  rankFor,
  type RunMode,
  type SurveyMode,
  type SurveyPrompt,
  type Tier,
} from '../../shared/survey';
import {
  bestFor,
  classicBestRun,
  clearEndlessState,
  dailyRunFor,
  drawClassicPrompts,
  endlessBestFor,
  endlessStateFor,
  saveClassicRun,
  saveDailyRun,
  saveEndlessState,
  startEndlessState,
  streakFor,
  type EndlessState,
  type LoggedAnswer,
  type SurveyRun,
} from '../lib/surveyStore';
import { sfx } from '../lib/audio';
import { haptic, preferReducedMotion, updateSettings, useSettings } from '../lib/settings';
import { liveCrowd, loadShares, recordAnswer, recordRun, shareOf, type CrowdPrompt } from '../lib/crowd';
import { shareRunCard } from '../lib/shareCard';
import { translate, useT } from '../lib/i18n';

const GAMES: Record<
  SurveyMode,
  { name: string; tagline: string; scoring: string; world: string; worldLine: string }
> = {
  common: {
    name: 'Common',
    tagline: 'Give the answer everybody gives.',
    scoring: 'The top answer on the board is Moonrise and lifts you 100 points. Off the board still counts, just less.',
    world: 'The night choir',
    worldLine: 'Everyone sings the same note. The louder the answer, the higher it lifts you.',
  },
  rare: {
    name: 'Rare',
    tagline: 'Give the answer nobody gives.',
    scoring: 'The board is read from the bottom: the loneliest answer on it is Moonrise. Off the board still counts, just less.',
    world: 'The empty hall',
    worldLine: 'One voice in a dark hall. The quieter the answer, the higher it lifts you.',
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
  if (points >= 100) return '🌕';
  if (points >= 64) return '🟩';
  if (points >= 32) return '🟨';
  if (points >= 16) return '🟧';
  if (points >= 8) return '🟫';
  return '⬛';
}

function metres(value: number): string {
  return `${value.toLocaleString('en-GB')} m`;
}

function useCountUp(target: number, ms = 650): number {
  const [value, setValue] = useState(target);
  const from = useRef(target);

  useEffect(() => {
    const origin = from.current;
    if (origin === target) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(origin + (target - origin) * eased);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        from.current = target;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);

  return value;
}

/* Board shares count up from zero as the row lands. */
function useRising(target: number, ms = 420): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    /* A hidden tab pauses rAF, so settle on the value instead of showing 0%. */
    if (preferReducedMotion() || document.hidden) {
      setValue(target);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);

  return value;
}

function BoardRow({
  rank,
  text,
  share,
  max,
  mine,
  index,
}: {
  rank: number;
  text: string;
  share: number;
  max: number;
  mine: boolean;
  index: number;
}) {
  const pct = useRising(share, 460);
  return (
    <div
      className={`play-board-row${mine ? ' is-you' : ''}`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <span className="play-board-rank">{rank}</span>
      <span className="play-board-text">{text}</span>
      <span className="play-board-bar">
        <i style={{ width: `${Math.round((pct / Math.max(max, 1)) * 100)}%` }} />
      </span>
      <span className="play-board-pct">{pct}%</span>
    </div>
  );
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

/*
 * The screen: start → climb → result. Daily is one try, Classic is repeatable,
 * Endless keeps dealing prompts until the balloons run out.
 */
export function Survey({ mode, navigate }: { mode: SurveyMode; navigate: (path: string) => void }) {
  const day = dayNumber();
  const [screen, setScreen] = useState<'start' | 'run' | 'result'>('start');
  const [runMode, setRunMode] = useState<RunMode>('daily');
  const [seed, setSeed] = useState(() => Date.now());
  const [result, setResult] = useState<SurveyRun | null>(null);
  const [resume, setResume] = useState<EndlessState | null>(null);
  const [drawn, setDrawn] = useState<SurveyPrompt[]>([]);
  const daily = dailyRunFor(mode, day);

  useEffect(() => {
    setScreen('start');
    setResult(null);
    setResume(null);
  }, [mode]);

  function begin(chosen: RunMode): void {
    const thisSeed = Date.now();
    setRunMode(chosen);
    setSeed(thisSeed);
    setDrawn(chosen === 'classic' ? drawClassicPrompts(mode) : []);
    if (chosen === 'endless') {
      const saved = endlessStateFor(mode);
      setResume(saved ?? startEndlessState(mode, thisSeed));
    } else {
      setResume(null);
    }
    sfx.unlock();
    setScreen('run');
  }

  if (screen === 'run') {
    return (
      <ClimbRun
        key={`${mode}-${runMode}-${seed}`}
        mode={mode}
        runMode={runMode}
        day={day}
        seed={seed}
        resume={resume}
        drawn={drawn}
        onQuit={() => setScreen('start')}
        onDone={(run) => {
          setResult(run);
          setScreen('result');
        }}
      />
    );
  }

  if (screen === 'result' && result) {
    return <SurveyResult run={result} navigate={navigate} onAgain={() => setScreen('start')} />;
  }

  return (
    <StartScreen
      mode={mode}
      streak={streakFor(mode, day).current}
      bestDaily={bestFor(mode)}
      bestClassic={classicBestRun(mode)?.score ?? 0}
      endlessBest={endlessBestFor(mode)}
      dailyDone={Boolean(daily)}
      onBegin={begin}
      onResume={() => {
        if (daily) {
          setResult(daily);
          setScreen('result');
        }
      }}
      onBack={() => navigate('/')}
    />
  );
}

/* ------------------------------------------------------------------ climb */

interface Reveal {
  given: string;
  matched: string | null;
  weight: number | null;
  points: number;
  tier: Tier;
  rank: number | null;
  height: number;
  boardIndex: number | null;
  miss: boolean;
}

interface ClimbRunProps {
  mode: SurveyMode;
  runMode: RunMode;
  day: number;
  seed: number;
  resume: EndlessState | null;
  /** Classic deals from the stored deck so the bank is used up before repeats */
  drawn: SurveyPrompt[];
  onQuit: () => void;
  onDone: (run: SurveyRun) => void;
}

function ClimbRun({ mode, runMode, day, seed, resume, drawn, onQuit, onDone }: ClimbRunProps) {
  const t = useT();
  const settings = useSettings();
  const [index, setIndex] = useState(resume?.index ?? 0);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [countIn, setCountIn] = useState(3);
  const [leftMs, setLeftMs] = useState(SECONDS_PER_PROMPT * 1000);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [log, setLog] = useState<LoggedAnswer[]>(resume?.answers ?? []);
  const [score, setScore] = useState(resume?.score ?? 0);
  const [balloons, setBalloons] = useState(resume?.balloons ?? BALLOONS);
  const [showBoard, setShowBoard] = useState(false);
  const [crowd, setCrowd] = useState<Record<string, CrowdPrompt>>({});
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const startedAt = useRef(0);
  const locked = useRef(false);

  const prompts = useMemo(() => {
    if (runMode === 'daily') return dailyPrompts(day, mode);
    if (runMode === 'classic') return drawn.length ? drawn : classicPrompts(mode, seed);
    return [] as SurveyPrompt[];
  }, [runMode, day, mode, seed, drawn]);

  const prompt = runMode === 'endless' ? endlessPromptAt(mode, seed, index) : prompts[index];
  const total = runMode === 'endless' ? 0 : prompts.length;
  const progress = Math.min(1, score / (PROMPTS_PER_DAY * 100));
  const shownHeight = useCountUp(heightFor(score));
  const cohort = liveCrowd(crowd[prompt.id]);

  /* Real shares for the prompt on screen; failures leave the authored ones in place. */
  useEffect(() => {
    let alive = true;
    void loadShares([prompt.id], day).then((map) => {
      if (alive && map) setCrowd((prev) => ({ ...map, ...prev }));
    });
    return () => {
      alive = false;
    };
  }, [day, prompt.id]);

  useEffect(() => {
    sfx.ambience(bandFor(progress));
    return () => sfx.ambience(null);
  }, [progress]);

  useEffect(() => {
    setInput('');
    setError(null);
    setReveal(null);
    setShowBoard(false);
    setLeftMs(SECONDS_PER_PROMPT * 1000);
    setCountIn(3);
    locked.current = false;
  }, [index]);

  useEffect(() => {
    if (countIn <= 0) return;
    const id = setTimeout(() => setCountIn((n) => n - 1), 650);
    return () => clearTimeout(id);
  }, [countIn]);

  useEffect(() => {
    if (countIn !== 0) return;
    startedAt.current = Date.now();
    inputRef.current?.focus();
  }, [countIn, index]);

  const commit = useCallback(
    (raw: string, timedOut: boolean) => {
      if (locked.current || countIn > 0) return;

      const given = raw.trim();
      const verdictResult = given ? judge(mode, prompt, given) : null;
      if (verdictResult && !verdictResult.ok) {
        setError(verdictResult.reason);
        sfx.blocked();
        return;
      }

      locked.current = true;
      setError(null);

      const accepted = Boolean(verdictResult && verdictResult.ok);
      const points = accepted && verdictResult ? verdictResult.points : 0;
      const tier: Tier = accepted && verdictResult ? verdictResult.tier : 'lost';
      const matched =
        accepted && verdictResult && verdictResult.index !== null
          ? prompt.answers[verdictResult.index].text
          : null;
      const authored =
        accepted && verdictResult && verdictResult.index !== null
          ? prompt.answers[verdictResult.index].weight
          : null;
      /* The crowd is real when there are enough answers; otherwise the bank's share. */
      const weight = matched === null ? null : shareOf(cohort, matched, authored ?? 0);

      const entry: LoggedAnswer = {
        promptId: prompt.id,
        asked: prompt.prompt,
        given,
        matched,
        weight,
        points,
        tier,
        rank: accepted && verdictResult ? verdictResult.rank : null,
      };

      const nextScore = score + points;
      let nextBalloons = balloons;
      if (!accepted) nextBalloons = Math.max(0, balloons - 1);
      else if (tier === 'moonrise') nextBalloons = Math.min(BALLOONS, balloons + 1);

      const answers = [...log, entry];
      setLog(answers);
      setScore(nextScore);
      setBalloons(nextBalloons);
      setReveal({
        given,
        matched,
        weight,
        points,
        tier,
        rank: entry.rank ?? null,
        height: heightFor(nextScore),
        boardIndex: accepted && verdictResult ? verdictResult.index : null,
        miss: !accepted,
      });

      if (runMode === 'endless') {
        saveEndlessState({
          mode,
          day,
          seed,
          index: index + 1,
          score: nextScore,
          balloons: nextBalloons,
          answers,
          updatedAt: Date.now(),
        });
      }

      if (given) {
        void recordAnswer({ day, mode, promptId: prompt.id, text: given }).then((res) => {
          if (!res) return;
          setCrowd((prev) => ({ ...prev, [prompt.id]: res }));
          if (!matched) return;
          const live = liveCrowd(res);
          setReveal((prev) =>
            prev && prev.given === given && prev.matched === matched
              ? { ...prev, weight: shareOf(live, matched, prev.weight ?? 0) }
              : prev,
          );
        });
      }

      if (!accepted) {
        sfx.balloonPop();
        haptic(12);
        setShake(true);
        setTimeout(() => setShake(false), 340);
        if (timedOut) sfx.blocked();
        else sfx.tap();
      } else if (tier === 'moonrise') {
        sfx.rise();
        sfx.moonrise();
        haptic(24);
      } else {
        sfx.rise();
        sfx.tier(tier);
        haptic(6);
      }
    },
    [balloons, cohort, countIn, day, index, log, mode, prompt, runMode, score, seed],
  );

  useEffect(() => {
    if (countIn !== 0 || reveal) return;
    const id = setInterval(() => {
      const left = SECONDS_PER_PROMPT * 1000 - (Date.now() - startedAt.current);
      setLeftMs(Math.max(0, left));
      if (left <= 0) commit(inputRef.current?.value ?? '', true);
    }, 100);
    return () => clearInterval(id);
  }, [commit, countIn, reveal]);

  function finish(): void {
    const answers = [...log];
    const run: SurveyRun = {
      mode,
      runMode,
      day,
      score,
      max: (runMode === 'endless' ? answers.length : PROMPTS_PER_DAY) * 100,
      height: heightFor(score),
      answers,
      finishedAt: Date.now(),
      seed,
    };
    if (runMode === 'daily') saveDailyRun(run);
    if (runMode === 'classic') saveClassicRun(run);
    if (runMode === 'endless') clearEndlessState(mode);
    /* Counts the climb in today's totals; silent when there is no crowd API. */
    void recordRun({ day, mode, runMode, score, height: heightFor(score) });
    onDone(run);
  }

  function next(): void {
    if (!reveal) return;
    sfx.tap();
    const out = runMode === 'endless' && balloons <= 0;
    const over = runMode !== 'endless' && index + 1 >= prompts.length;
    if (out || over) {
      finish();
      return;
    }
    setIndex(index + 1);
  }

  const secondsLeft = Math.ceil(leftMs / 1000);
  const pct = Math.max(0, Math.min(100, (leftMs / (SECONDS_PER_PROMPT * 1000)) * 100));
  const urgent = !reveal && secondsLeft <= 10;
  const board = prompt.answers
    .map((a, i) => ({ text: a.text, weight: a.weight, i, rank: rankFor(mode, prompt, i) }))
    .sort((x, y) => x.rank - y.rank);
  const boardRows = showBoard ? board.slice(0, 9) : board.slice(0, 4);
  const boardPeak = Math.max(...boardRows.map((row) => shareOf(cohort, row.text, row.weight)), 1);

  /* Identity strip: real round state, in this board's own weather. */
  const game = GAMES[mode];
  const answered = log.length;
  const steps = runMode === 'endless' ? Math.max(PROMPTS_PER_DAY, answered) : PROMPTS_PER_DAY;
  const hasShare = Boolean(reveal?.matched);
  const echoShare = hasShare ? shareOf(cohort, reveal?.matched ?? '', reveal?.weight ?? 0) : 0;
  const metre = mode === 'common' ? echoShare : 100 - echoShare;
  const alone = log.filter((a) => (a.rank ?? 0) > BOARD_SIZE).length;

  return (
    <main className="play">
      <Climb
        progress={progress}
        balloons={balloons}
        moving={Boolean(reveal && reveal.points > 0)}
        answer={reveal ? reveal.matched ?? reveal.given : input}
      />

      <div className="play-hud">
        <span className="play-pill">
          <em>{t('Altitude')}</em>
          <b>{metres(Math.round(shownHeight))}</b>
        </span>
        <span className="play-pill">
          <em>{t('Prompt')}</em>
          <b>
            {index + 1}
            {total ? ` / ${total}` : ''}
          </b>
        </span>
        <span className="play-hud-right">
          {runMode === 'endless' ? (
            <span className="play-pill play-lift">
              <em>{t('Lift')}</em>
              <span className="play-balloons">
                {Array.from({ length: BALLOONS }, (_, i) => (
                  <i key={i} className={i < balloons ? 'is-full' : ''} />
                ))}
              </span>
            </span>
          ) : null}
          <button
            className="play-icon"
            type="button"
            onClick={() => {
              const next = !settings.sound;
              updateSettings({ sound: next });
              /* Muting must silence the drone at once, unmuting must bring it back. */
              sfx.ambience(next ? bandFor(progress) : null);
              if (next) sfx.tap();
            }}
            aria-pressed={settings.sound}
            title={t('Sound')}
          >
            {settings.sound ? '♪' : '×'}
          </button>
          <button
            className="play-icon is-text"
            type="button"
            onClick={() => {
              sfx.tap();
              onQuit();
            }}
          >
            {t('Quit')}
          </button>
        </span>
      </div>

      <section className={`survey-ident is-${mode}`} aria-label={t(game.world)}>
        <div className="survey-ident-head">
          <span className="eyebrow">{t(game.world)}</span>
          <span className="mono survey-ident-num">
            {hasShare ? `${metre}% ${t(mode === 'common' ? 'chorus' : 'solitude')}` : '—'}
          </span>
        </div>
        <div className="survey-meter" aria-hidden="true">
          <i style={{ width: `${hasShare ? metre : 0}%` }} />
        </div>
        <div className="survey-ident-foot">
          <span className="survey-steps" aria-hidden="true">
            {Array.from({ length: steps }, (_, i) => {
              const entry = log[i];
              return (
                <span
                  key={i}
                  className="survey-step"
                  data-state={entry ? 'sung' : i === answered ? 'now' : 'todo'}
                  data-tier={entry?.tier ?? undefined}
                />
              );
            })}
          </span>
          <span className="survey-ident-line">
            {mode === 'common'
              ? t('Echo {n}/{total} · {state}', {
                  n: answered,
                  total: steps,
                  state: hasShare
                    ? t('{n}% sang it', { n: echoShare })
                    : answered
                      ? t('off the board')
                      : t('listening'),
                })
              : t('{n}/{total} answered · {alone} alone', {
                  n: answered,
                  total: steps,
                  alone,
                })}
          </span>
        </div>
      </section>

      {reveal && reveal.points > 0 ? (
        <span key={`float-${index}`} className="play-float" aria-hidden="true">
          +{reveal.points}
        </span>
      ) : null}

      <section className={`play-card${shake ? ' is-shaking' : ''}`}>
        <div className="play-card-head">
          <span className="play-level">{t(difficultyFor(prompt))}</span>
        </div>

        <h1 className="play-prompt">{prompt.prompt}</h1>

        {reveal ? (
          <div className="play-result">
            <div className="play-result-top">
              <span className="play-tier" data-tier={reveal.tier}>
                {t(TIERS[reveal.tier].name)}
              </span>
              <span className="play-result-answer">
                {reveal.matched ? `“${reveal.matched}”` : reveal.given ? `“${reveal.given}”` : '—'}
              </span>
              <span className="play-result-points">+{reveal.points}</span>
            </div>
            {/* Only the sentence is announced: the counting numbers would otherwise
                be read out on every frame. */}
            <p className="play-result-line" aria-live="polite">
              {reveal.matched
                ? t('{share}% of the crowd said {answer}. You are {height} up.', {
                    share: reveal.weight ?? 0,
                    answer: reveal.matched,
                    height: metres(reveal.height),
                  })
                : reveal.miss
                  ? t('Nothing accepted on that one. It costs you a balloon in Endless.')
                  : t('Off the board, but it counted. You are {height} up.', {
                      height: metres(reveal.height),
                    })}
            </p>

            <div className="play-board">
              <div className="play-board-head">
                <span className="eyebrow">{t('The board')}</span>
                <span className="eyebrow">
                  {t('crowd share')}
                  {cohort ? <span className="play-crowd-n"> · n={cohort.total.toLocaleString('en-GB')}</span> : null}
                </span>
              </div>
              {boardRows.map((row, i) => (
                <BoardRow
                  key={row.text}
                  rank={row.rank}
                  text={row.text}
                  share={shareOf(cohort, row.text, row.weight)}
                  max={boardPeak}
                  mine={row.i === reveal.boardIndex}
                  index={i}
                />
              ))}
              {board.length > 4 ? (
                <button
                  className="play-board-more"
                  type="button"
                  onClick={() => {
                    sfx.tap();
                    setShowBoard((v) => !v);
                  }}
                >
                  {showBoard
                    ? t('Show less')
                    : t('See all {n}', { n: Math.min(9, board.length) })}
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="play-hint">{t('▲ common answers climb higher ▲')}</p>
        )}
      </section>

      <div className="play-bar">
        {reveal ? (
          <>
            <span className="play-bar-note">
              {runMode === 'endless'
                ? balloons > 0
                  ? t('{n} balloons left', { n: balloons })
                  : t('Out of balloons')
                : t('{n} of {total}', { n: index + 1, total })}
            </span>
            <button className="btn btn-primary play-next" onClick={next}>
              {runMode === 'endless' && balloons <= 0
                ? t('See the climb')
                : runMode !== 'endless' && index + 1 >= prompts.length
                  ? t('See the climb')
                  : t('Next')}
            </button>
          </>
        ) : countIn > 0 ? (
          <span className="play-count">{t('Clock starting in {n}', { n: countIn })}</span>
        ) : (
          <form
            className="play-form"
            onSubmit={(e) => {
              e.preventDefault();
              commit(input, false);
            }}
          >
            <span className={`play-clock${urgent ? ' is-urgent' : ''}`} aria-hidden="true">
              <i style={{ '--p': `${pct}%` } as CSSProperties} />
              <b>{secondsLeft}</b>
            </span>
            <input
              id="survey-answer"
              ref={inputRef}
              className="play-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              maxLength={40}
              aria-label={t('Your answer')}
              placeholder={t('Type one answer…')}
            />
            <button className="play-pass" type="button" onClick={() => commit('', false)}>
              {t('Pass')}
            </button>
            <button className="play-climb" type="submit" disabled={!input.trim()}>
              {t('Climb')}
            </button>
          </form>
        )}
        {error ? <p className="play-error">{t(error)}</p> : null}
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ result */

function shareText(run: SurveyRun): string {
  const bars = run.answers.map((a) => glyph(a.points)).join('');
  const label = translate(GAMES[run.mode].name);
  const modeLabel =
    run.runMode === 'daily'
      ? ` #${pad(run.day)}`
      : run.runMode === 'classic'
        ? ` ${translate('Classic')}`
        : ` ${translate('Endless')}`;
  const km = (run.height / 1000).toFixed(1);
  return `Noct ${label}${modeLabel}\n${bars}  ${km} km · ${run.score} ${translate('points')}\n${translate(verdict(run.score, run.max))}\nnoct.game`;
}

function SurveyResult({
  run,
  navigate,
  onAgain,
}: {
  run: SurveyRun;
  navigate: (path: string) => void;
  onAgain: () => void;
}) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const game = GAMES[run.mode];
  const other: SurveyMode = run.mode === 'common' ? 'rare' : 'common';
  const streak = streakFor(run.mode, run.day);
  const km = (run.height / 1000).toFixed(1);
  const share = run.max > 0 ? run.score / run.max : 0;
  const best = Math.max(bestFor(run.mode), run.score);
  const modeLabel =
    run.runMode === 'daily' ? t('Daily') : run.runMode === 'classic' ? t('Classic') : t('Endless');
  const shownHeight = useRising(run.height, 900);
  const [cardState, setCardState] = useState<'idle' | 'working' | 'shared' | 'saved' | 'failed'>('idle');
  const moonrises = run.answers.filter((a) => a.tier === 'moonrise').length;
  const celebrate = moonrises >= 3 || share >= 0.7;

  useEffect(() => {
    sfx.stamp();
    haptic(8);
  }, []);

  async function copy(): Promise<void> {
    sfx.tap();
    const ok = await copyText(shareText(run));
    setCopied(ok);
    setTimeout(() => setCopied(false), 2000);
  }

  async function card(): Promise<void> {
    sfx.tap();
    setCardState('working');
    const outcome = await shareRunCard(
      {
        game: t(game.name),
        modeLabel,
        dayLabel: run.runMode === 'daily' ? `#${pad(run.day)}` : '',
        height: metres(run.height),
        routeKm: ROUTE_KM,
        score: run.score,
        verdict: t(verdict(run.score, run.max)),
        streak: streak.current,
        answers: run.answers.map((a) => ({ tier: a.tier ?? 'lost', points: a.points })),
      },
      shareText(run),
    );
    setCardState(outcome === 'shared' ? 'shared' : outcome === 'saved' ? 'saved' : outcome === 'failed' ? 'failed' : 'idle');
  }

  const cardLabel =
    cardState === 'working'
      ? t('Making card…')
      : cardState === 'shared'
        ? t('Shared')
        : cardState === 'saved'
          ? t('Saved png')
          : cardState === 'failed'
            ? t('Could not share')
            : t('Share card');

  return (
    <main className="main">
      {celebrate ? (
        <div className="stage-confetti survey-confetti" aria-hidden="true">
          {Array.from({ length: 14 }, (_, i) => (
            <i key={i} style={{ left: `${8 + i * 6.4}%`, animationDelay: `${i * 45}ms` }} />
          ))}
        </div>
      ) : null}
      <div className="wrap survey-wrap">
        <div className="eyebrow">
          {t(game.world)} · {modeLabel}
          {run.runMode === 'daily' ? ` #${pad(run.day)} · ${dayToISO(run.day)}` : ''}
        </div>

        <div className="result-height">
          <span className="result-height-num">{metres(Math.round(shownHeight))}</span>
          <span className="result-height-km">/ {ROUTE_KM} km</span>
        </div>
        <div className="rating-word is-stamping">{t(verdict(run.score, run.max))}</div>

        <div className="row gap-6" style={{ flexWrap: 'wrap' }}>
          <span className="chip chip-ember">{t('{n} points', { n: run.score })}</span>
          <span className="chip">{t('Best {n}', { n: best })}</span>
          {run.runMode === 'endless' ? (
            <span className="chip">{t('{n} prompts', { n: run.answers.length })}</span>
          ) : null}
          <span className={`chip${streak.current > 0 ? ' chip-ember' : ''}`}>
            <span className="chip-dot" aria-hidden="true" />
            {t('{n}-day streak', { n: streak.current })}
          </span>
        </div>

        <div style={{ marginTop: 18 }}>
          <Journey progress={share} />
        </div>

        <section className="route-map">
          <div className="route-map-head">
            <span className="eyebrow">{t('The climb')}</span>
            <span className="eyebrow">
              {km} / {ROUTE_KM} km
            </span>
          </div>
          <div className="route-map-rail" aria-hidden="true">
            <i style={{ width: `${share * 100}%` }} />
            <b style={{ left: `${share * 100}%` }} />
          </div>
          <div className="route-map-stops">
            {run.answers.map((a, i) => (
              <div
                className="route-stop"
                key={`${a.promptId}-${i}`}
                data-tier={a.tier ?? 'lost'}
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <span className="route-stop-num">{t('STOP {n}', { n: i + 1 })}</span>
                <span className="route-stop-tier">
                  {a.tier ? t(TIERS[a.tier].name) : t('Lost')}
                </span>
                <span className="route-stop-points">+{a.points}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card stack gap-14">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="eyebrow">{t('Your answers')}</span>
            <span className="eyebrow">{t('points')}</span>
          </div>
          <div className="score-rows">
            {run.answers.map((a, i) => (
              <div className="score-row" key={`${a.promptId}-${i}`}>
                <div className="stack gap-6" style={{ minWidth: 0 }}>
                  <span className="par-note" style={{ margin: 0 }}>
                    {a.asked}
                  </span>
                  <span className="mono" style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>
                    {a.given ? `“${a.given}”` : t('no answer')}
                    {a.given
                      ? ` · ${
                          a.weight === null
                            ? t('off the board')
                            : t('{share}% said {answer}', { share: a.weight, answer: a.matched ?? '' })
                        }`
                      : ''}
                  </span>
                </div>
                <div className="stack gap-6" style={{ alignItems: 'flex-end' }}>
                  <span className="mono">+{a.points}</span>
                  <span className="stage-tier is-small" data-tier={a.tier ?? 'lost'}>
                    {a.tier ? t(TIERS[a.tier].name) : t('Lost')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="row gap-10" style={{ marginTop: 18, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => void card()} disabled={cardState === 'working'}>
            {cardLabel}
          </button>
          <button className="btn" onClick={() => void copy()}>
            {copied ? t('Copied') : t('Copy result')}
          </button>
          {run.runMode !== 'daily' ? (
            <button
              className="btn"
              onClick={() => {
                sfx.tap();
                onAgain();
              }}
            >
              {t('Climb again')}
            </button>
          ) : null}
          <button
            className="btn"
            onClick={() => {
              sfx.tap();
              navigate(`/${other}`);
            }}
          >
            {t('Play {name}', { name: t(GAMES[other].name) })}
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => {
              sfx.tap();
              navigate('/');
            }}
          >
            {t('Back to menu')}
          </button>
        </div>

        <p className="par-note" style={{ marginTop: 14 }}>
          {run.runMode === 'daily' ? (
            <>
              {t('Next {name} in', { name: t(game.name) })} <Countdown to={nextResetAt()} />
            </>
          ) : (
            <>{t('A perfect seven-prompt climb is 700 points and 14 km.')}</>
          )}
        </p>
      </div>
    </main>
  );
}
