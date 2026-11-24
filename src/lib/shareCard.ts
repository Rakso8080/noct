import type { Tier } from '../../shared/survey';

/**
 * The share card: the run drawn on a canvas, so the brag leaves the game as a
 * picture. Text copy stays as the fallback for browsers without file sharing.
 */

export interface CardData {
  game: string;
  modeLabel: string;
  dayLabel: string;
  height: string;
  routeKm: number;
  score: number;
  verdict: string;
  streak: number;
  answers: { tier: Tier; points: number }[];
}

export type ShareOutcome = 'shared' | 'cancelled' | 'saved' | 'failed';

const TIER_COLORS: Record<Tier, string> = {
  moonrise: '#ffe08a',
  aurora: '#9be8b4',
  starlit: '#a8c8ff',
  lantern: '#ffb877',
  ember: '#e6935c',
  grounded: '#b5b0c8',
  lost: '#4a4458',
};

const W = 1080;
const H = 1350;

function drawStars(ctx: CanvasRenderingContext2D): void {
  let seed = 7;
  const next = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (let i = 0; i < 90; i++) {
    const x = Math.round(next() * W);
    const y = Math.round(next() * H * 0.72);
    const big = next() > 0.86;
    ctx.fillStyle = `rgba(255,255,255,${0.18 + next() * 0.4})`;
    ctx.fillRect(x, y, big ? 4 : 2, big ? 4 : 2);
  }
}

function drawMoon(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = 'rgba(248, 236, 196, 0.9)';
  ctx.beginPath();
  ctx.arc(W - 150, 150, 54, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(8, 18, 14, 0.45)';
  ctx.beginPath();
  ctx.arc(W - 172, 134, 46, 0, Math.PI * 2);
  ctx.fill();
}

function paint(ctx: CanvasRenderingContext2D, data: CardData): void {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#050b09');
  bg.addColorStop(0.55, '#0b1a14');
  bg.addColorStop(1, '#12291d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  drawStars(ctx);
  drawMoon(ctx);

  ctx.strokeStyle = 'rgba(126, 160, 138, 0.45)';
  ctx.lineWidth = 6;
  ctx.strokeRect(36, 36, W - 72, H - 72);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffe6ac';
  ctx.font = '700 92px "Press Start 2P", monospace';
  ctx.fillText('NOCT', 84, 190);

  ctx.fillStyle = '#9ab8a6';
  ctx.font = '400 30px "VT323", monospace';
  ctx.fillText(`${data.game} · ${data.modeLabel} ${data.dayLabel}`.trim(), 88, 248);

  ctx.strokeStyle = 'rgba(126, 160, 138, 0.35)';
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.moveTo(88, 300);
  ctx.lineTo(W - 88, 300);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#f7efdb';
  ctx.font = '700 132px "Press Start 2P", monospace';
  ctx.fillText(data.height, 84, 470);

  ctx.fillStyle = '#9ab8a6';
  ctx.font = '400 44px "VT323", monospace';
  ctx.fillText(`of ${data.routeKm} km`, 90, 528);

  ctx.fillStyle = '#ffd48a';
  ctx.font = '700 54px "Press Start 2P", monospace';
  ctx.fillText(data.verdict.toUpperCase(), 84, 650);

  /* One coloured block per prompt, in order: the run at a glance. */
  const size = 74;
  const gap = 22;
  data.answers.slice(0, 9).forEach((answer, i) => {
    const x = 88 + i * (size + gap);
    ctx.fillStyle = TIER_COLORS[answer.tier] ?? TIER_COLORS.lost;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(x, 720, size, size);
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(8, 18, 14, 0.72)';
    ctx.font = '400 26px "VT323", monospace';
    ctx.fillText(String(answer.points), x + 10, 764);
  });

  ctx.fillStyle = '#f7efdb';
  ctx.font = '700 66px "Press Start 2P", monospace';
  ctx.fillText(`${data.score} pts`, 84, 890);

  ctx.fillStyle = '#9be8b4';
  ctx.font = '400 40px "VT323", monospace';
  ctx.fillText(`${data.streak}-day streak`, 88, 946);

  /* The climb, drawn as a rising line to the finish. */
  ctx.strokeStyle = 'rgba(126, 160, 138, 0.3)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(88, 1170);
  ctx.lineTo(W - 88, 1170);
  ctx.stroke();

  const filled = data.answers.length
    ? data.answers.reduce((sum, a) => sum + a.points, 0) / (data.answers.length * 100)
    : 0;
  ctx.strokeStyle = '#ffd48a';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(88, 1170);
  ctx.lineTo(88 + Math.max(0.02, Math.min(1, filled)) * (W - 176), 1170);
  ctx.stroke();

  ctx.fillStyle = '#9ab8a6';
  ctx.font = '400 38px "VT323", monospace';
  ctx.fillText('noct.game', 88, 1246);
  ctx.textAlign = 'right';
  ctx.fillText('the nightly climb', W - 88, 1246);
}

async function blobFor(data: CardData): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  paint(ctx, data);
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/png'));
}

function fileName(data: CardData): string {
  const slug = `${data.game}-${data.modeLabel}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return `noct-${slug}-${data.dayLabel.replace(/[^0-9a-z]+/gi, '') || 'run'}.png`;
}

function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Share the picture where the browser allows it, save it where it does not. */
export async function shareRunCard(data: CardData, text: string): Promise<ShareOutcome> {
  const blob = await blobFor(data);
  if (!blob) return 'failed';

  const file = new File([blob], fileName(data), { type: 'image/png' });
  const nav = navigator as Navigator & {
    canShare?: (payload: { files?: File[] }) => boolean;
  };

  if (typeof nav.share === 'function' && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      /* Sharing refused: fall through to a download. */
    }
  }

  download(blob, fileName(data));
  return 'saved';
}
