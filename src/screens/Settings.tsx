import { useEffect, useState } from 'react';
import { ApiError, api } from '../lib/api';
import { ScreenHead, Segmented, Switch } from '../components/ui';
import { haptic, updateSettings, useSettings, type Theme } from '../lib/settings';
import { sfx } from '../lib/audio';
import { clearSummary } from '../lib/results';
import { clearGames } from '../lib/gamesStore';
import { setLang, useLang, useT, type Lang } from '../lib/i18n';

export function Settings({ navigate }: { navigate: (path: string) => void }) {
  const settings = useSettings();
  const t = useT();
  const lang = useLang();
  const [name, setName] = useState('');
  const [savedName, setSavedName] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .me()
      .then((me) => {
        setName(me.name ?? '');
        setSavedName(me.name);
      })
      .catch(() => undefined);
  }, []);

  async function saveName(): Promise<void> {
    setBusy(true);
    try {
      const res = await api.setName(name.trim());
      setSavedName(res.name);
      setMessage(
        res.name
          ? t('Name saved. It now appears on the standings.')
          : t('Name cleared — you appear by number.'),
      );
    } catch (err) {
      setMessage(
        err instanceof ApiError ? err.message : t('That name could not be saved. Try 2–16 letters.'),
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteData(): Promise<void> {
    setBusy(true);
    try {
      await api.deleteMe();
      clearSummary();
      clearGames();
      setMessage(t('All your data has been deleted. You start fresh as a new guest.'));
      setConfirmDelete(false);
      setSavedName(null);
      setName('');
    } catch {
      setMessage(t('Deletion failed. Nothing was removed — please try again.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="main">
      <div className="wrap" style={{ maxWidth: 680 }}>
        <ScreenHead eyebrow={t('Settings')} title={t('Make it yours')}>
          {t('Nothing here is required. The game plays the same either way.')}
        </ScreenHead>

        <section className="card" style={{ marginBottom: 20 }}>
          <div className="setting-row">
            <div className="setting-copy">
              <strong>{t('Language')}</strong>
              <small>{t('The interface language. Saved on this device.')}</small>
            </div>
            <Segmented<Lang>
              label={t('Language')}
              value={lang}
              onChange={(next) => setLang(next)}
              options={[
                { value: 'en', label: t('English') },
                { value: 'nb', label: t('Norwegian') },
              ]}
            />
          </div>

          <div className="setting-row">
            <div className="setting-copy">
              <strong>{t('Theme')}</strong>
              <small>{t('Dark by default; light is a warm paper, not a white flash.')}</small>
            </div>
            <Segmented<Theme>
              label={t('Theme')}
              value={settings.theme}
              onChange={(theme) => updateSettings({ theme })}
              options={[
                { value: 'system', label: t('Auto') },
                { value: 'dark', label: t('Dark') },
                { value: 'light', label: t('Light') },
              ]}
            />
          </div>

          <div className="setting-row">
            <div className="setting-copy">
              <strong>{t('Sound')}</strong>
              <small>{t('Short, soft cues. Nothing needed to understand the board.')}</small>
            </div>
            <div className="row gap-10">
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => {
                  updateSettings({ sound: true });
                  sfx.unlock();
                  sfx.solve();
                }}
              >
                {t('Test')}
              </button>
              <Switch
                label={t('Sound')}
                checked={settings.sound}
                onChange={(sound) => {
                  updateSettings({ sound });
                  if (sound) {
                    sfx.unlock();
                    sfx.place();
                  }
                }}
              />
            </div>
          </div>

          <div className="setting-row">
            <div className="setting-copy">
              <strong>{t('Haptics')}</strong>
              <small>{t('A small tap on supported phones when a spark lands.')}</small>
            </div>
            <Switch
              label={t('Haptics')}
              checked={settings.haptics}
              onChange={(haptics) => {
                updateSettings({ haptics });
                if (haptics) haptic(12);
              }}
            />
          </div>

          <div className="setting-row">
            <div className="setting-copy">
              <strong>{t('Reduced motion')}</strong>
              <small>{t('Removes the spark animations and page transitions.')}</small>
            </div>
            <Segmented<'system' | 'reduced'>
              label={t('Motion')}
              value={settings.motion}
              onChange={(motion) => updateSettings({ motion })}
              options={[
                { value: 'system', label: t('System') },
                { value: 'reduced', label: t('Reduced') },
              ]}
            />
          </div>
        </section>

        <section className="card" style={{ marginBottom: 20 }}>
          <span className="eyebrow">{t('Name on the standings')}</span>
          <p className="par-note" style={{ margin: '8px 0 14px' }}>
            {t(
              'Optional. Without a name you still appear on leaderboards, as a player number. Nothing else about you is public — no email, no location, no history.',
            )}
          </p>
          <div className="row gap-10" style={{ flexWrap: 'wrap' }}>
            <input
              className="input"
              style={{ maxWidth: 240 }}
              value={name}
              maxLength={16}
              placeholder={t('e.g. Ada')}
              aria-label={t('Display name')}
              onChange={(e) => setName(e.target.value)}
            />
            <button className="btn btn-sm" onClick={() => void saveName()} disabled={busy}>
              {t('Save name')}
            </button>
            {savedName ? <span className="chip">{savedName}</span> : null}
          </div>
          {message ? (
            <p className="par-note" style={{ marginTop: 10 }} role="status">
              {message}
            </p>
          ) : null}
        </section>

        <section className="card" style={{ marginBottom: 20 }}>
          <span className="eyebrow">{t('Privacy')}</span>
          <ul className="par-note" style={{ margin: '10px 0 16px', paddingLeft: 18, display: 'grid', gap: 6 }}>
            <li>{t('No account, no email, no password — ever, to play.')}</li>
            <li>{t('A random device identifier and your board results are the only data stored.')}</li>
            <li>{t('No advertising, no third-party trackers, no analytics profiles.')}</li>
            <li>
              {t(
                'Chess, mines, pairs, lights, snake, 2048 and reversi are kept only in this browser; they never leave it.',
              )}
            </li>
            <li>
              {t(
                'Deleting your data removes your results, streak, name and side-game records immediately.',
              )}
            </li>
          </ul>
          {confirmDelete ? (
            <div className="stack gap-10">
              <p className="par-note" style={{ color: 'var(--bad)' }}>
                {t('This deletes your streak, scores and history. It cannot be undone.')}
              </p>
              <div className="row gap-10">
                <button className="btn btn-sm" style={{ background: 'var(--bad)', borderColor: 'var(--bad)', color: '#fff' }} onClick={() => void deleteData()} disabled={busy}>
                  {t('Delete everything')}
                </button>
                <button className="btn btn-sm btn-ghost" onClick={() => setConfirmDelete(false)}>
                  {t('Keep my data')}
                </button>
              </div>
            </div>
          ) : (
            <button className="btn btn-sm btn-ghost" onClick={() => setConfirmDelete(true)}>
              {t('Delete my data')}
            </button>
          )}
        </section>

        <section className="card stack gap-10">
          <span className="eyebrow">{t('About')}</span>
          <p className="par-note" style={{ margin: 0 }}>
            {t(
              'Noct is a small independent daily puzzle: seven boards for the night plus three arcade tables, the same for everyone, reset at 00:00 UTC. Built to be played in a queue, on a bus, or with coffee — then closed.',
            )}
          </p>
          <div className="row gap-10" style={{ flexWrap: 'wrap' }}>
            <span className="chip">{t('Version 0.1')}</span>
            <span className="chip">{t('No ads')}</span>
            <span className="chip">{t('No tracking')}</span>
            <span className="chip">{t('Installable')}</span>
          </div>
          <button className="btn btn-sm btn-ghost" onClick={() => navigate('/how-to')} style={{ alignSelf: 'flex-start' }}>
            {t('How to play')}
          </button>
        </section>
      </div>
    </main>
  );
}
