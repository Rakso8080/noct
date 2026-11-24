import { useEffect, useState } from 'react';
import { ApiError, api } from '../lib/api';
import { ScreenHead, Segmented, Switch } from '../components/ui';
import { haptic, updateSettings, useSettings, type Theme } from '../lib/settings';
import { sfx } from '../lib/audio';
import { clearSummary } from '../lib/results';
import { clearGames } from '../lib/gamesStore';

export function Settings({ navigate }: { navigate: (path: string) => void }) {
  const settings = useSettings();
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
      setMessage(res.name ? 'Name saved. It now appears on the standings.' : 'Name cleared — you appear by number.');
    } catch (err) {
      setMessage(
        err instanceof ApiError ? err.message : 'That name could not be saved. Try 2–16 letters.',
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
      setMessage('All your data has been deleted. You start fresh as a new guest.');
      setConfirmDelete(false);
      setSavedName(null);
      setName('');
    } catch {
      setMessage('Deletion failed. Nothing was removed — please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="main">
      <div className="wrap" style={{ maxWidth: 680 }}>
        <ScreenHead eyebrow="Settings" title="Make it yours">
          Nothing here is required. The game plays the same either way.
        </ScreenHead>

        <section className="card" style={{ marginBottom: 20 }}>
          <div className="setting-row">
            <div className="setting-copy">
              <strong>Theme</strong>
              <small>Dark by default; light is a warm paper, not a white flash.</small>
            </div>
            <Segmented<Theme>
              label="Theme"
              value={settings.theme}
              onChange={(theme) => updateSettings({ theme })}
              options={[
                { value: 'system', label: 'Auto' },
                { value: 'dark', label: 'Dark' },
                { value: 'light', label: 'Light' },
              ]}
            />
          </div>

          <div className="setting-row">
            <div className="setting-copy">
              <strong>Sound</strong>
              <small>Short, soft cues. Nothing needed to understand the board.</small>
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
                Test
              </button>
              <Switch
                label="Sound"
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
              <strong>Haptics</strong>
              <small>A small tap on supported phones when a spark lands.</small>
            </div>
            <Switch
              label="Haptics"
              checked={settings.haptics}
              onChange={(haptics) => {
                updateSettings({ haptics });
                if (haptics) haptic(12);
              }}
            />
          </div>

          <div className="setting-row">
            <div className="setting-copy">
              <strong>Reduced motion</strong>
              <small>Removes the spark animations and page transitions.</small>
            </div>
            <Segmented<'system' | 'reduced'>
              label="Motion"
              value={settings.motion}
              onChange={(motion) => updateSettings({ motion })}
              options={[
                { value: 'system', label: 'System' },
                { value: 'reduced', label: 'Reduced' },
              ]}
            />
          </div>
        </section>

        <section className="card" style={{ marginBottom: 20 }}>
          <span className="eyebrow">Name on the standings</span>
          <p className="par-note" style={{ margin: '8px 0 14px' }}>
            Optional. Without a name you still appear on leaderboards, as a player number. Nothing
            else about you is public — no email, no location, no history.
          </p>
          <div className="row gap-10" style={{ flexWrap: 'wrap' }}>
            <input
              className="input"
              style={{ maxWidth: 240 }}
              value={name}
              maxLength={16}
              placeholder="e.g. Ada"
              aria-label="Display name"
              onChange={(e) => setName(e.target.value)}
            />
            <button className="btn btn-sm" onClick={() => void saveName()} disabled={busy}>
              Save name
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
          <span className="eyebrow">Privacy</span>
          <ul className="par-note" style={{ margin: '10px 0 16px', paddingLeft: 18, display: 'grid', gap: 6 }}>
            <li>No account, no email, no password — ever, to play.</li>
            <li>A random device identifier and your board results are the only data stored.</li>
            <li>No advertising, no third-party trackers, no analytics profiles.</li>
            <li>Chess, mines, pairs and lights are kept only in this browser; they never leave it.</li>
            <li>Deleting your data removes your results, streak, name and side-game records immediately.</li>
          </ul>
          {confirmDelete ? (
            <div className="stack gap-10">
              <p className="par-note" style={{ color: 'var(--bad)' }}>
                This deletes your streak, scores and history. It cannot be undone.
              </p>
              <div className="row gap-10">
                <button className="btn btn-sm" style={{ background: 'var(--bad)', borderColor: 'var(--bad)', color: '#fff' }} onClick={() => void deleteData()} disabled={busy}>
                  Delete everything
                </button>
                <button className="btn btn-sm btn-ghost" onClick={() => setConfirmDelete(false)}>
                  Keep my data
                </button>
              </div>
            </div>
          ) : (
            <button className="btn btn-sm btn-ghost" onClick={() => setConfirmDelete(true)}>
              Delete my data
            </button>
          )}
        </section>

        <section className="card stack gap-10">
          <span className="eyebrow">About</span>
          <p className="par-note" style={{ margin: 0 }}>
            Noct is a small independent daily puzzle. Four boards a day, the same for everyone, reset
            at 00:00 UTC. Built to be played in a queue, on a bus, or with coffee — then closed.
          </p>
          <div className="row gap-10" style={{ flexWrap: 'wrap' }}>
            <span className="chip">Version 0.1</span>
            <span className="chip">No ads</span>
            <span className="chip">No tracking</span>
            <span className="chip">Installable</span>
          </div>
          <button className="btn btn-sm btn-ghost" onClick={() => navigate('/how-to')} style={{ alignSelf: 'flex-start' }}>
            How to play
          </button>
        </section>
      </div>
    </main>
  );
}
