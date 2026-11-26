import { useState } from 'react';
import { Board } from './Board';
import { Modal, Segmented } from './ui';
import { updateSettings, useSettings, type Theme } from '../lib/settings';
import { sfx } from '../lib/audio';
import { useT } from '../lib/i18n';

/**
 * The first night: three steps, one of them a rule you can see. Shown once per
 * browser, and skippable at every step; the setting is the only thing stored.
 */
const DEMO_SIZE = 5;
const DEMO_SOLUTION = [0, 7, 14, 16, 23];
const DEMO_REGION = Array.from({ length: DEMO_SIZE * DEMO_SIZE }, (_, i) => Math.floor(i / DEMO_SIZE));

export function FirstNight({ onPlay }: { onPlay: () => void }) {
  const t = useT();
  const settings = useSettings();
  const [open, setOpen] = useState(!settings.tutorialSeen);
  const [step, setStep] = useState(0);

  function close(): void {
    updateSettings({ tutorialSeen: true });
    setOpen(false);
    sfx.tap();
  }

  if (!open) return null;

  const titles = [t('Step 1 of 3 · The light'), t('Step 2 of 3 · One rule'), t('Step 3 of 3 · Tonight')];

  return (
    <Modal open={open} onClose={close} title={t('First night')}>
      <div className="first-night">
        <div className="first-night-dots" aria-hidden="true">
          {titles.map((_, index) => (
            <i key={index} data-on={index <= step ? 'true' : 'false'} />
          ))}
        </div>
        <span className="eyebrow">{titles[step]}</span>

        {step === 0 ? (
          <>
            <p className="par-note">
              {t(
                'Noct is read at night. Pick the light you want to sit in; it can change any time in Settings, along with sound and motion.',
              )}
            </p>
            <div className="stack gap-10">
              <Segmented<Theme>
                label={t('Theme')}
                value={settings.theme}
                options={[
                  { value: 'system', label: 'System' },
                  { value: 'dark', label: 'Dark' },
                  { value: 'light', label: 'Light' },
                ]}
                onChange={(theme) => {
                  updateSettings({ theme });
                  sfx.tap();
                }}
              />
              <Segmented<'on' | 'off'>
                label={t('Sound')}
                value={settings.sound ? 'on' : 'off'}
                options={[
                  { value: 'on', label: 'On' },
                  { value: 'off', label: 'Off' },
                ]}
                onChange={(value) => {
                  updateSettings({ sound: value === 'on' });
                  if (value === 'on') {
                    sfx.unlock();
                    sfx.tap();
                  }
                }}
              />
            </div>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <p className="par-note">
              {t(
                'Four boards of lanterns. One spark per row, column and tone — and never two touching, not even diagonally. Locked sparks are part of the answer.',
              )}
            </p>
            <div className="first-night-board" aria-hidden="true">
              <Board
                size={DEMO_SIZE}
                region={DEMO_REGION}
                givens={[]}
                sparks={DEMO_SOLUTION}
                excluded={[]}
                hinted={[]}
                solved
                locked
                label={t('A solved five by five board')}
                onToggle={() => undefined}
                onExclude={() => undefined}
              />
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <p className="par-note">
              {t(
                'Seven nightly boards and twelve side tables. Play one, or all nineteen; nothing is lost by resting. The road on the front page is a suggestion, not a duty.',
              )}
            </p>
            <p className="par-note">
              {t('At midnight UTC the boards change. Until then, one attempt each.')}
            </p>
          </>
        ) : null}

        <div className="first-night-actions">
          <button className="btn btn-ghost" type="button" onClick={close}>
            {t('Skip')}
          </button>
          {step < 2 ? (
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => {
                sfx.tap();
                setStep(step + 1);
              }}
            >
              {t('Next')}
            </button>
          ) : (
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => {
                updateSettings({ tutorialSeen: true });
                sfx.tap();
                setOpen(false);
                onPlay();
              }}
            >
              {t('Play today')}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
