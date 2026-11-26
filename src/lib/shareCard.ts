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

export interface TableCardData {
  game: string;
  title: string;
  dayLabel: string;
  headline: string;
  detail: string;
  footer: string;
  kind: 'mancala' | 'pegs';
  board: readonly number[];
  target?: string;
  verdict?: string;
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

async function shareBlob(blob: Blob, name: string, text: string): Promise<ShareOutcome> {
  const file = new File([blob], name, { type: 'image/png' });
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

  download(blob, name);
  return 'saved';
}

/** Share the picture where the browser allows it, save it where it does not. */
export async function shareRunCard(data: CardData, text: string): Promise<ShareOutcome> {
  const blob = await blobFor(data);
  if (!blob) return 'failed';
  return shareBlob(blob, fileName(data), text);
}

/* ------------------------------------------------------------------ side tables */

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  size: number,
  weight = 400,
  family = '"VT323", monospace',
): void {
  let current = size;
  do {
    ctx.font = `${weight} ${current}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth || current <= 16) break;
    current -= 2;
  } while (true);
  ctx.fillText(text, x, y);
}

function drawMancalaBoard(ctx: CanvasRenderingContext2D, board: readonly number[]): void {
  const left = 88;
  const right = W - 88;
  const top = 800;
  const height = 280;
  const storeW = 96;
  const gap = 10;
  const rowGap = 12;
  const rowH = (height - rowGap) / 2;
  const middle = left + storeW + 18;
  const innerW = right - storeW - 18 - middle;
  const colW = (innerW - gap * 5) / 6;

  ctx.fillStyle = 'rgba(52, 35, 21, 0.82)';
  ctx.fillRect(left, top, right - left, height);
  ctx.strokeStyle = 'rgba(255, 224, 168, 0.22)';
  ctx.lineWidth = 3;
  ctx.strokeRect(left, top, right - left, height);

  const store = (x: number, count: number) => {
    ctx.fillStyle = 'rgba(29, 20, 13, 0.9)';
    ctx.fillRect(x, top + 14, storeW, height - 28);
    ctx.strokeStyle = 'rgba(255, 224, 168, 0.2)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, top + 14, storeW, height - 28);
    ctx.fillStyle = '#ffe6ac';
    ctx.textAlign = 'center';
    fitText(ctx, String(count), x + storeW / 2, top + height / 2 + 24, storeW - 20, 62, 400, '"VT323", monospace');
    ctx.textAlign = 'left';
  };
  store(left + 9, board[6] ?? 0);
  store(right - storeW - 9, board[13] ?? 0);

  const pit = (x: number, y: number, count: number) => {
    ctx.fillStyle = 'rgba(24, 16, 10, 0.8)';
    ctx.fillRect(x, y, colW, rowH);
    ctx.strokeStyle = 'rgba(255, 224, 168, 0.16)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, colW, rowH);
    ctx.fillStyle = '#f7efdb';
    ctx.textAlign = 'center';
    fitText(ctx, String(count), x + colW / 2, y + rowH / 2 + 18, colW - 14, 46, 400, '"VT323", monospace');
    ctx.textAlign = 'left';
  };

  for (let i = 0; i < 6; i += 1) {
    pit(middle + i * (colW + gap), top, board[7 + i] ?? 0);
    pit(middle + i * (colW + gap), top + rowH + rowGap, board[i] ?? 0);
  }
}

function drawPegsBoard(ctx: CanvasRenderingContext2D, board: readonly number[]): void {
  const cell = 40;
  const gap = 5;
  const total = cell * 7 + gap * 6;
  const startX = (W - total) / 2;
  const startY = 800;

  for (let row = 0; row < 7; row += 1) {
    for (let col = 0; col < 7; col += 1) {
      const index = row * 7 + col;
      const value = board[index] ?? -1;
      if (value === -1) continue;
      const x = startX + col * (cell + gap);
      const y = startY + row * (cell + gap);
      ctx.fillStyle = 'rgba(24, 16, 10, 0.82)';
      ctx.beginPath();
      ctx.arc(x + cell / 2, y + cell / 2, cell / 2, 0, Math.PI * 2);
      ctx.fill();
      if (value === 1) {
        ctx.fillStyle = '#e7c27a';
        ctx.beginPath();
        ctx.arc(x + cell / 2, y + cell / 2, cell * 0.31, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = 'rgba(255, 224, 168, 0.18)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x + cell / 2, y + cell / 2, cell * 0.12, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
}

function paintTable(ctx: CanvasRenderingContext2D, data: TableCardData): void {
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
  ctx.fillText(`${data.game} · ${data.dayLabel}`, 88, 248);

  ctx.strokeStyle = 'rgba(126, 160, 138, 0.35)';
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.moveTo(88, 300);
  ctx.lineTo(W - 88, 300);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#9ab8a6';
  ctx.font = '400 52px "VT323", monospace';
  fitText(ctx, data.title, 88, 372, W - 176, 52);

  ctx.fillStyle = '#f7efdb';
  fitText(ctx, data.headline, 84, 480, W - 168, 108, 700, '"Press Start 2P", monospace');

  ctx.fillStyle = '#9ab8a6';
  ctx.font = '400 42px "VT323", monospace';
  fitText(ctx, data.detail, 90, 542, W - 180, 42);

  if (data.target) {
    ctx.fillStyle = '#ffe6ac';
    fitText(ctx, data.target, 90, 626, W - 180, 38);
  }
  if (data.verdict) {
    ctx.fillStyle = '#ffd48a';
    fitText(ctx, data.verdict, 90, 688, W - 180, 40);
  }

  if (data.kind === 'mancala') drawMancalaBoard(ctx, data.board);
  else drawPegsBoard(ctx, data.board);

  ctx.fillStyle = '#9ab8a6';
  ctx.font = '400 38px "VT323", monospace';
  ctx.fillText('noct.game', 88, 1246);
  ctx.textAlign = 'right';
  ctx.fillText(data.footer, W - 88, 1246);
  ctx.textAlign = 'left';
}

async function tableBlobFor(data: TableCardData): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  paintTable(ctx, data);
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/png'));
}

function tableFileName(data: TableCardData): string {
  return `noct-${data.kind}-${data.dayLabel.replace(/[^0-9a-z]+/gi, '') || 'run'}.png`;
}

export async function shareTableCard(data: TableCardData, text: string): Promise<ShareOutcome> {
  const blob = await tableBlobFor(data);
  if (!blob) return 'failed';
  return shareBlob(blob, tableFileName(data), text);
}
