import { useSyncExternalStore } from 'react';

export type Theme = 'system' | 'dark' | 'light';

export interface Settings {
  theme: Theme;
  sound: boolean;
  haptics: boolean;
  motion: 'system' | 'reduced';
  /** the slow pad behind a chapter; off until asked */
  ambience: boolean;
  ambienceLevel: 1 | 2;
  tutorialSeen: boolean;
}

const KEY = 'noct.settings.v1';

const defaults: Settings = {
  theme: 'system',
  sound: true,
  haptics: true,
  motion: 'system',
  ambience: false,
  ambienceLevel: 1,
  tutorialSeen: false,
};

function read(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaults };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...defaults, ...parsed };
  } catch {
    return { ...defaults };
  }
}

let current: Settings = read();
const listeners = new Set<() => void>();

export function getSettings(): Settings {
  return current;
}

export function updateSettings(patch: Partial<Settings>): void {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* private mode */
  }
  applyTheme();
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSettings, getSettings);
}

export function applyTheme(): void {
  const root = document.documentElement;
  const { theme, motion } = current;
  const dark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.dataset.theme = dark ? 'dark' : 'light';
  root.dataset.motion = motion === 'reduced' ? 'reduced' : 'system';
}

export function preferReducedMotion(): boolean {
  if (current.motion === 'reduced') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function haptic(pattern: number | number[]): void {
  if (!current.haptics) return;
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* unsupported */
    }
  }
}

export function watchSystemTheme(): () => void {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => {
    if (current.theme === 'system') applyTheme();
  };
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}
