import { useEffect, useState } from 'react';
import { useT, useLang } from '../lib/i18n';

export type NightPhase = 'evening' | 'night' | 'before dawn' | 'day';

/**
 * The hour the valley keeps. Local time, no network, no ticking seconds —
 * just the minute, refreshed quietly while the tab is open.
 */
export function nightPhase(hour: number): NightPhase {
  if (hour >= 22 || hour < 3) return 'night';
  if (hour >= 3 && hour < 6) return 'before dawn';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'day';
}

function formatClock(date: Date, lang: string): string {
  return new Intl.DateTimeFormat(lang === 'nb' ? 'nb-NO' : 'en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function AmbientClock() {
  const t = useT();
  const lang = useLang();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    /* 10s is enough to catch the minute without waking the tab every second. */
    const id = window.setInterval(() => setNow(new Date()), 10_000);
    return () => window.clearInterval(id);
  }, []);

  const time = formatClock(now, lang);
  const phase = nightPhase(now.getHours());
  const phaseLabel = t(phase);

  return (
    <p className="start-clock">
      <time
        className="start-clock-time"
        dateTime={`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`}
        aria-label={t('Local time {time}, {phase}', { time, phase: phaseLabel })}
      >
        {time}
      </time>
      <span className="start-clock-dot" aria-hidden="true" />
      <span className="start-clock-phase">{phaseLabel}</span>
    </p>
  );
}
