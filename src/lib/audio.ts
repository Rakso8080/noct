/**
 * Tiny WebAudio synth — no audio assets, no network, no autoplay problems.
 * Everything is short (≤0.3s), soft, and low-volume by design.
 */
import { getSettings } from './settings';

let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function voice(
  freq: number,
  duration: number,
  type: OscillatorType,
  gain: number,
  delay = 0,
): void {
  const ac = context();
  if (!ac) return;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(amp).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

function enabled(): boolean {
  return getSettings().sound;
}

export const sfx = {
  /** Call from a real user gesture so the context unlocks. */
  unlock(): void {
    context();
  },
  tap(): void {
    if (!enabled()) return;
    voice(520, 0.06, 'triangle', 0.05);
  },
  place(): void {
    if (!enabled()) return;
    voice(660, 0.09, 'sine', 0.07);
    voice(990, 0.07, 'sine', 0.03, 0.015);
  },
  remove(): void {
    if (!enabled()) return;
    voice(320, 0.07, 'sine', 0.05);
  },
  blocked(): void {
    if (!enabled()) return;
    voice(180, 0.12, 'square', 0.03);
  },
  solve(): void {
    if (!enabled()) return;
    voice(587.33, 0.16, 'sine', 0.07);
    voice(880, 0.18, 'sine', 0.06, 0.075);
    voice(1174.66, 0.24, 'sine', 0.05, 0.15);
  },
  /** The top answer: a short bright climb. */
  moonrise(): void {
    if (!enabled()) return;
    [659.25, 830.61, 987.77, 1318.51].forEach((f, i) => voice(f, 0.3, 'sine', 0.06, i * 0.075));
    voice(1661.22, 0.34, 'triangle', 0.03, 0.3);
  },
  complete(): void {
    if (!enabled()) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => voice(f, 0.32, 'sine', 0.055, i * 0.1));
  },
  hint(): void {
    if (!enabled()) return;
    voice(784, 0.1, 'triangle', 0.05);
    voice(1046.5, 0.14, 'triangle', 0.04, 0.06);
  },
};
