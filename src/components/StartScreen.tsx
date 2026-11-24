import { useEffect, useState } from 'react';
import { Climb } from './Climb';
import { updateSettings, useSettings } from '../lib/settings';
import { sfx } from '../lib/audio';
import { loadToday } from '../lib/crowd';
import { PROMPTS_PER_DAY, SECONDS_PER_PROMPT, heightFor, type RunMode, type SurveyMode } from '../../shared/survey';
import { useT } from '../lib/i18n';

const MODES: { id: RunMode; name: string; line: string }[] = [
  { id: 'daily', name: 'Daily', line: 'Seven prompts, one try. Everybody gets the same ones today.' },
  { id: 'classic', name: 'Classic', line: 'Seven fresh prompts, play as often as you like.' },
  { id: 'endless', name: 'Endless', line: 'Keep climbing until your balloons run out.' },
];

const NAMES: Record<SurveyMode, { name: string; line: string }> = {
  common: { name: 'Common', line: 'The night choir · everyone sings the same note' },
  rare: { name: 'Rare', line: 'The empty hall · one voice, as quiet as possible' },
};

interface StartScreenProps {
  mode: SurveyMode;
  streak: number;
  bestDaily: number;
  bestClassic: number;
  endlessBest: number;
  dailyDone: boolean;
  onBegin: (runMode: RunMode) => void;
  onResume: () => void;
  onBack: () => void;
}

export function StartScreen({
  mode,
  streak,
  bestDaily,
  bestClassic,
  endlessBest,
  dailyDone,
  onBegin,
  onResume,
  onBack,
}: StartScreenProps) {
  const t = useT();
  const settings = useSettings();
  const [picked, setPicked] = useState<RunMode>(dailyDone ? 'classic' : 'daily');
  const [today, setToday] = useState<{ climbs: number; avgHeight: number } | null>(null);
  const game = NAMES[mode];

  /* How many people climbed today, when the crowd API is reachable. */
  useEffect(() => {
    let alive = true;
    void loadToday().then((stats) => {
      if (alive && stats && stats.climbs > 0) setToday(stats);
    });
    return () => {
      alive = false;
    };
  }, []);

  const best = picked === 'endless' ? endlessBest : picked === 'classic' ? bestClassic : bestDaily;
  const bestKm = (heightFor(best) / 1000).toFixed(1);
  const bestLine =
    best > 0
      ? t('Your best {points} pts · {km} km', { points: best, km: bestKm })
      : t('{n} prompts · {s}s each', { n: PROMPTS_PER_DAY, s: SECONDS_PER_PROMPT });

  return (
    <main className="start">
      <Climb progress={0} variant="start" balloons={3} />

      <div className="start-top">
        <span className="start-pill">
          <em>Noct</em>
          <b>{t(game.name)}</b>
        </span>
        <span className="start-pill">
          <em>{t('Streak')}</em>
          <b>{t('{n} days', { n: streak })}</b>
        </span>
        <button
          className="start-pill start-sound"
          type="button"
          onClick={() => {
            const next = !settings.sound;
            updateSettings({ sound: next });
            if (next) {
              sfx.unlock();
              sfx.tap();
            }
          }}
          aria-pressed={settings.sound}
        >
          <em>{t('Sound')}</em>
          <b>{settings.sound ? t('on') : t('off')}</b>
        </button>
      </div>

      <div className="start-inner">
        <h1 className="start-logo">Noct</h1>
        <p className="start-sub">{t(game.line)}</p>

        <div className="start-modes" role="tablist" aria-label={t('Choose a mode')}>
          {MODES.map((m) => {
            const disabled = m.id === 'daily' && dailyDone;
            return (
              <button
                key={m.id}
                role="tab"
                aria-selected={picked === m.id}
                className={`start-mode${picked === m.id ? ' is-on' : ''}`}
                onClick={() => {
                  sfx.tap();
                  setPicked(m.id);
                }}
                disabled={disabled}
                title={disabled ? t('Today’s Daily is already done') : t(m.line)}
              >
                {t(m.name)}
              </button>
            );
          })}
        </div>

        <p className="start-mode-line">{t(MODES.find((m) => m.id === picked)?.line ?? '')}</p>

        <button
          className="start-begin"
          onClick={() => {
            sfx.tap();
            onBegin(picked);
          }}
        >
          <span aria-hidden="true">▲</span> {t('Begin the climb')} <span aria-hidden="true">▲</span>
        </button>

        <p className="start-best">{bestLine}</p>
        {today ? (
          <p className="start-crowd">
            <span className="start-crowd-dot" aria-hidden="true" />
            {t('{n} climbs today · avg {m} m', {
              n: today.climbs.toLocaleString('en-GB'),
              m: Math.round(today.avgHeight).toLocaleString('en-GB'),
            })}
          </p>
        ) : null}

        {dailyDone ? (
          <button
            className="start-resume"
            onClick={() => {
              sfx.tap();
              onResume();
            }}
          >
            {t('See today’s result')}
          </button>
        ) : null}

        <button
          className="start-back"
          onClick={() => {
            sfx.tap();
            onBack();
          }}
        >
          {t('Back to menu')}
        </button>
      </div>
    </main>
  );
}
