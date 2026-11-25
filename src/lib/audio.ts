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

let ambient: { osc: OscillatorNode; gain: GainNode } | null = null;
let ambientLevel: number | null = null;
const AMBIENT_VOLUME = 0.007;
const AMBIENT_FREQS = [98, 87.31, 73.42, 65.41];

function stopAmbient(ac: AudioContext): void {
  if (!ambient) return;
  const dying = ambient;
  ambient = null;
  ambientLevel = null;
  const t = ac.currentTime;
  dying.gain.gain.cancelScheduledValues(t);
  dying.gain.gain.linearRampToValueAtTime(0.0001, t + 0.4);
  setTimeout(() => {
    try {
      dying.osc.stop();
    } catch {
      /* already stopped */
    }
  }, 500);
}

/** A very quiet drone that follows the altitude band; null stops it. */
function ambience(level: 0 | 1 | 2 | 3 | null): void {
  const ac = context();
  if (!ac) return;

  if (level === null) {
    stopAmbient(ac);
    return;
  }

  if (!enabled()) {
    stopAmbient(ac);
    return;
  }

  if (!ambient) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = AMBIENT_FREQS[level];
    gain.gain.value = 0.0001;
    osc.connect(gain).connect(ac.destination);
    osc.start();
    gain.gain.setTargetAtTime(AMBIENT_VOLUME, ac.currentTime, 0.9);
    ambient = { osc, gain };
    ambientLevel = level;
    return;
  }

  if (ambientLevel === level) {
    /* Same band: keep it singing at full level (it may have been ducked). */
    ambient.gain.gain.setTargetAtTime(AMBIENT_VOLUME, ac.currentTime, 0.5);
    return;
  }

  /* New band: crossfade instead of stepping the pitch. */
  const old = ambient;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  const t = ac.currentTime;
  osc.type = 'sine';
  osc.frequency.value = AMBIENT_FREQS[level];
  gain.gain.value = 0.0001;
  osc.connect(gain).connect(ac.destination);
  osc.start();
  gain.gain.setTargetAtTime(AMBIENT_VOLUME, t, 0.5);
  old.gain.gain.cancelScheduledValues(t);
  old.gain.gain.setTargetAtTime(0.0001, t, 0.45);
  setTimeout(() => {
    try {
      old.osc.stop();
    } catch {
      /* already stopped */
    }
  }, 1500);
  ambient = { osc, gain };
  ambientLevel = level;
}

/** Pull the drone and the pad down for a moment so a chord can speak. */
function duck(ms = 700): void {
  const ac = context();
  if (!ac) return;
  const t = ac.currentTime;
  if (ambient) {
    ambient.gain.gain.cancelScheduledValues(t);
    ambient.gain.gain.setTargetAtTime(0.0022, t, 0.08);
    ambient.gain.gain.setTargetAtTime(AMBIENT_VOLUME, t + ms / 1000, 0.3);
  }
  if (pad) {
    pad.gain.gain.cancelScheduledValues(t);
    pad.gain.gain.setTargetAtTime(padLevel() * 0.3, t, 0.1);
    pad.gain.gain.setTargetAtTime(padLevel(), t + ms / 1000, 0.45);
  }
}

/* ------------------------------------------------------------- soundscape */

export type Chapter = 'choir' | 'keep' | 'tables' | 'atlas';

/** Two stacked fifths per chapter, low enough to read as air rather than music. */
const PAD_NOTES: Record<Chapter, [number, number, number]> = {
  choir: [130.81, 196.0, 261.63],
  keep: [110.0, 164.81, 220.0],
  tables: [98.0, 146.83, 196.0],
  atlas: [116.54, 174.61, 233.08],
};

const PAD_LEVEL: Record<1 | 2, number> = { 1: 0.008, 2: 0.017 };

interface Pad {
  gain: GainNode;
  voices: OscillatorNode[];
  air: AudioBufferSourceNode | null;
}

let pad: Pad | null = null;
let padChapter: Chapter | null = null;
let noiseBuffer: AudioBuffer | null = null;

function padLevel(): number {
  return PAD_LEVEL[getSettings().ambienceLevel] ?? PAD_LEVEL[1];
}

/** A slow brown-ish noise, made once per audio context. */
function noise(ac: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === ac.sampleRate) return noiseBuffer;
  const length = Math.floor(ac.sampleRate * 2);
  const buffer = ac.createBuffer(1, length, ac.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.2;
  }
  noiseBuffer = buffer;
  return buffer;
}

function stopPad(ac: AudioContext, fade = 0.8): void {
  if (!pad) return;
  const dying = pad;
  pad = null;
  padChapter = null;
  const t = ac.currentTime;
  dying.gain.gain.cancelScheduledValues(t);
  dying.gain.gain.setTargetAtTime(0.0001, t, Math.max(0.05, fade / 3));
  setTimeout(() => {
    for (const osc of dying.voices) {
      try {
        osc.stop();
      } catch {
        /* already stopped */
      }
    }
    try {
      dying.air?.stop();
    } catch {
      /* already stopped */
    }
  }, fade * 1000 + 250);
}

/**
 * The night pad: one soft chord per chapter, crossfaded when the room changes.
 * Silent unless the settings allow it, except for an explicit preview.
 */
export function soundscape(chapter: Chapter | null, force = false): void {
  const allowed = force || (getSettings().sound && getSettings().ambience);
  if (!allowed || chapter === null) {
    /* Never open an audio context just to stop something that was never started. */
    if (ctx) stopPad(ctx);
    return;
  }

  const ac = context();
  if (!ac) return;

  if (pad && padChapter === chapter) {
    pad.gain.gain.setTargetAtTime(padLevel(), ac.currentTime, 0.6);
    return;
  }

  stopPad(ac, 0.9);

  const gain = ac.createGain();
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 640;
  filter.Q.value = 0.4;
  gain.gain.value = 0.0001;
  gain.connect(filter).connect(ac.destination);

  const voices = PAD_NOTES[chapter].map((freq, index) => {
    const osc = ac.createOscillator();
    osc.type = index === 0 ? 'sine' : 'triangle';
    osc.frequency.value = freq;
    osc.detune.value = index === 2 ? 7 : index === 1 ? -5 : 0;
    osc.connect(gain);
    osc.start();
    return osc;
  });

  const air = ac.createBufferSource();
  air.buffer = noise(ac);
  air.loop = true;
  const airGain = ac.createGain();
  airGain.gain.value = 0.035;
  const airFilter = ac.createBiquadFilter();
  airFilter.type = 'bandpass';
  airFilter.frequency.value = 420;
  airFilter.Q.value = 0.7;
  air.connect(airFilter).connect(airGain).connect(ac.destination);
  air.start();

  gain.gain.setTargetAtTime(padLevel(), ac.currentTime, 1.4);
  pad = { gain, voices, air };
  padChapter = chapter;
}

const TIER_NOTES: Record<string, number[]> = {
  moonrise: [659.25, 830.61, 987.77, 1318.51],
  aurora: [587.33, 783.99, 1046.5],
  starlit: [523.25, 659.25],
  lantern: [440, 554.37],
  ember: [392],
  grounded: [329.63],
  lost: [180],
};

export const sfx = {
  ambience,
  soundscape,
  /** A short phrase for the grade, highest grades brightest. */
  tier(name: string): void {
    if (!enabled()) return;
    duck();
    (TIER_NOTES[name] ?? [440]).forEach((f, i) => voice(f, 0.26, 'sine', 0.055, i * 0.07));
  },
  /** The sound of gaining height: a short upward whoosh. */
  rise(): void {
    if (!enabled()) return;
    const ac = context();
    if (!ac) return;
    const t0 = ac.currentTime;
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, t0);
    osc.frequency.exponentialRampToValueAtTime(760, t0 + 0.34);
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.exponentialRampToValueAtTime(0.03, t0 + 0.08);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.42);
    osc.connect(amp).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + 0.46);
  },
  /** A heavy stamp, for the rating landing on the result. */
  stamp(): void {
    if (!enabled()) return;
    voice(132, 0.16, 'sine', 0.07);
    voice(66, 0.26, 'sine', 0.05, 0.01);
    voice(320, 0.06, 'square', 0.02, 0.02);
  },
  balloonPop(): void {
    if (!enabled()) return;
    voice(150, 0.09, 'square', 0.045);
    voice(90, 0.14, 'sine', 0.035, 0.02);
  },
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
    duck(900);
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
