import { useEffect, useState } from 'react';
import { api, type ArchiveEntry } from '../lib/api';
import { ScreenHead } from '../components/ui';
import { dayToISO } from '../../shared/dates';
import { useT } from '../lib/i18n';

export function Archive({ navigate }: { navigate: (path: string) => void }) {
  const t = useT();
  const [entries, setEntries] = useState<ArchiveEntry[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .archive(60)
      .then((d) => {
        if (alive) setEntries(d.entries);
      })
      .catch(() => {
        if (alive) {
          setEntries([]);
          setFailed(true);
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  const played = entries?.filter((e) => e.score !== null).length ?? 0;

  return (
    <main className="main">
      <div className="wrap">
        <ScreenHead eyebrow="Archive" title="Every board, kept">
          {t(
            'Past boards stay open forever. Replaying one never touches today’s streak or the daily standings — it is just you against an old board.',
          )}
        </ScreenHead>

        {entries === null ? (
          <p className="par-note">{t('Opening the drawer…')}</p>
        ) : entries.length === 0 ? (
          <div className="card empty">
            <span className="eyebrow">{t('Empty drawer')}</span>
            <p style={{ maxWidth: '38ch' }}>
              {t(
                'The archive fills up as days pass. Board #1 is today, so there is nothing behind it yet.',
              )}
            </p>
            <button className="btn btn-primary" onClick={() => navigate('/play')}>
              {t('Play today’s board')}
            </button>
          </div>
        ) : (
          <>
            <div className="row gap-10" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
              <span className="chip chip-ember">{t('{n} played', { n: played })}</span>
              <span className="chip">{t('{n} boards', { n: entries.length })}</span>
              <span className="chip">{t('Scores are your best run')}</span>
            </div>
            <div className="archive-grid">
              {entries.map((e) => (
                <button
                  key={e.day}
                  className="archive-tile"
                  onClick={() => navigate(`/archive/${e.day}`)}
                  disabled={!e.playable}
                  title={`${t('Board #{n}', { n: e.day })} · ${dayToISO(e.day)}${e.score !== null ? ` · ${t('best {score}', { score: e.score })}` : ''}`}
                >
                  <span className="archive-day">#{String(e.day).padStart(3, '0')}</span>
                  {e.score !== null ? (
                    <span className="archive-score">{e.score}</span>
                  ) : (
                    <span className="archive-empty">
                      {e.difficulty ? '·'.repeat(Math.round(e.difficulty)) : t('play')}
                    </span>
                  )}
                </button>
              ))}
            </div>
            {failed ? (
              <p className="par-note" style={{ marginTop: 14 }}>
                {t('Could not load past scores right now — the boards above still work.')}
              </p>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
