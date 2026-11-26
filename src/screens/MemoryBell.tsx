import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { dayNumber } from '../../shared/dates';
import { BELL_PADS, MAX_LEVEL, bellSequence, bellStepMs, nextBellLevel, sequenceLength } from '../lib/memoryBell';
import { bellToday, readGames, recordBell } from '../lib/gamesStore';
import { sfx } from '../lib/audio';
import { postArcadeScore } from '../lib/arcade';
import { bellPoints } from '../../shared/arcade';
import type { ArcadeScoreResponse } from '../../shared/types';
import { haptic } from '../lib/settings';
import { ScreenHead } from '../components/ui';
import { useT } from '../lib/i18n';

type Phase = 'idle' | 'show' | 'input' | 'done';

export function MemoryBell({ navigate }: { navigate: (path: string) => void }) {
  const t = useT();
  const day = dayNumber();
  const [level, setLevel] = useState(1);
  const [phase, setPhase] = useState<Phase>('idle');
  const [active, setActive] = useState<number | null>(null);
  const [step, setStep] = useState(0);
  const [won, setWon] = useState(false);
  const [saved] = useState(() => bellToday(day));
  const [best, setBest] = useState<number | null>(() => readGames().bell.bestLevel);
  const [posted, setPosted] = useState<ArcadeScoreResponse | null>(null);
  const recorded = useRef(false);
  const timers = useRef<number[]>([]);

  const sequence = useMemo(() => bellSequence(day, level), [day, level]);

  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => clearTimeout(id));
    timers.current = [];
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  /* The tower rings first; the player answers afterwards. */
  useEffect(() => {
    if (phase !== 'show') return;
    clearTimers();
    const gap = bellStepMs(level);
    sequence.forEach((pad, index) => {
      timers.current.push(
        window.setTimeout(() => {
          setActive(pad);
          sfx.bell(BELL_PADS[pad].hz, Math.max(200, gap - 80));
          timers.current.push(window.setTimeout(() => setActive(null), gap - 60));
        }, 500 + index * gap),
      );
    });
    timers.current.push(
      window.setTimeout(() => {
        setPhase('input');
        setStep(0);
      }, 500 + sequence.length * gap + 260),
    );
    return clearTimers;
  }, [phase, sequence, level, clearTimers]);

  const finish = useCallback(
    (victory: boolean, reached: number) => {
      setPhase('done');
      setWon(victory);
      setActive(null);
      if (!recorded.current) {
        recorded.current = true;
        recordBell(day, reached, victory);
        setBest(readGames().bell.bestLevel);
        void postArcadeScore('memorybell', bellPoints(reached)).then(setPosted);
      }
      if (victory) {
        sfx.complete();
        haptic(24);
      } else {
        sfx.bellMiss();
        haptic(12);
      }
    },
    [day],
  );

  const press = useCallback(
    (pad: number) => {
      if (phase !== 'input') return;
      if (sequence[step] !== pad) {
        finish(false, level - 1);
        return;
      }
      sfx.bell(BELL_PADS[pad].hz, 260);
      haptic(5);
      setActive(pad);
      window.setTimeout(() => setActive(null), 180);
      const next = step + 1;
      if (next < sequence.length) {
        setStep(next);
        return;
      }
      if (level >= MAX_LEVEL) {
        finish(true, MAX_LEVEL);
        return;
      }
      setPhase('show');
      setLevel((value) => nextBellLevel(value));
    },
    [finish, level, phase, sequence, step],
  );

  const begin = useCallback(() => {
    clearTimers();
    recorded.current = false;
    setLevel(1);
    setStep(0);
    setWon(false);
    setPosted(null);
    setPhase('show');
    sfx.tap();
  }, [clearTimers]);

  const speaking =
    phase === 'show'
      ? t('Listen: the tower is ringing {n} notes.', { n: sequenceLength(level) })
      : phase === 'input'
        ? t('Your turn: repeat the {n} notes.', { n: sequence.length })
        : phase === 'done'
          ? won
            ? t('The tower bows. {n} rounds held.', { n: level })
            : t('A wrong bell. The tower forgets you at {n} rounds.', { n: Math.max(0, level - 1) })
          : t('Four bells, one order. Begin when you are ready.');

  return (
    <main className="main">
      <div className="wrap" style={{ maxWidth: 640 }}>
        <div className="well-head">
          <ScreenHead
            eyebrow={t('Memory Bell · Night {n}', { n: String(day).padStart(3, '0') })}
            title={t('The Memory Bell')}
          >
            {t(
              'Four bells in a wooden tower. The tower rings a short order; repeat it back. Every round adds one note, and one wrong bell ends the night.',
            )}
          </ScreenHead>
        </div>

        <div className="mini-hud">
          <span className="chip">
            {t('Round')} <span className="mono">{level}</span> / {MAX_LEVEL}
          </span>
          <span className="chip">
            {t('Notes')} <span className="mono">{sequenceLength(level)}</span>
          </span>
          <span className="chip">
            {best === null ? t('No best yet') : t('Best {n} rounds', { n: best })}
          </span>
          <span className="chip">
            {saved ? t('Today: {n} rounds', { n: saved.level }) : t('Unplayed today')}
          </span>
        </div>

        <p className="par-note bell-say" role="status" aria-live="polite">
          {speaking}
        </p>

        <div className={`bell-frame${phase === 'show' ? ' is-ringing' : ''}`} data-phase={phase}>
          <div className="bell-grid" role="group" aria-label={t('Four bells')}>
            {BELL_PADS.map((pad) => (
              <button
                key={pad.id}
                type="button"
                className="bell-pad"
                data-pad={pad.id}
                data-lit={active === pad.id ? 'true' : 'false'}
                aria-label={t(pad.name)}
                disabled={phase !== 'input'}
                onClick={() => press(pad.id)}
              >
                <span className="bell-pad-glyph" aria-hidden="true">
                  ◍
                </span>
                <span className="bell-pad-name">{t(pad.name)}</span>
                <span className="bell-pad-hz mono" aria-hidden="true">
                  {Math.round(pad.hz)} Hz
                </span>
              </button>
            ))}
          </div>

          <div className="bell-progress" aria-hidden="true">
            {sequence.map((_, index) => (
              <i
                key={index}
                data-state={
                  phase === 'show' ? 'ringing' : index < step ? 'done' : index === step && phase === 'input' ? 'now' : 'todo'
                }
              />
            ))}
          </div>
        </div>

        {phase === 'done' ? (
          <div className="mini-banner" role="status">
            <strong>
              {won
                ? t('All twelve rounds held. The tower has nothing left to teach you.')
                : t('{n} rounds held. The order was {seq}.', {
                    n: Math.max(0, level - 1),
                    seq: sequence.map((pad) => pad + 1).join(' · '),
                  })}
            </strong>
            {posted ? (
              <span className="chip">
                {t('On tonight’s table: {score} · #{rank}', { score: posted.best, rank: posted.rank })}
              </span>
            ) : null}
            <div className="row gap-10" style={{ flexWrap: 'wrap' }}>
              <button className="btn btn-sm btn-primary" onClick={begin}>
                {t('Ring again')}
              </button>
              <button className="btn btn-sm btn-ghost" onClick={() => navigate('/arcade')}>
                {t('The arcade')}
              </button>
            </div>
          </div>
        ) : (
          <div className="mini-actions">
            <button
              className="btn btn-sm btn-primary"
              onClick={begin}
              disabled={phase === 'show' || phase === 'input'}
            >
              {phase === 'idle' ? t('Begin') : t('Restart')}
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => navigate('/night')}>
              {t('Tonight’s dispatch')}
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => navigate('/')}>
              {t('Menu')}
            </button>
          </div>
        )}

        <p className="par-note bell-foot">
          {t('Sound is the tower’s real language; the lights only help. Turn sound on in Settings to hear the notes.')}
        </p>
      </div>
    </main>
  );
}
