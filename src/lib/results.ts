import type { Summary } from '../../shared/types';

const KEY = 'noct.lastSummary';

let cached: Summary | null = null;

export function setSummary(summary: Summary): void {
  cached = summary;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(summary));
  } catch {
    /* storage may be unavailable */
  }
}

export function getSummary(): Summary | null {
  if (cached) return cached;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    cached = JSON.parse(raw) as Summary;
    return cached;
  } catch {
    return null;
  }
}

export function clearSummary(): void {
  cached = null;
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
