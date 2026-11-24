import { useEffect, useRef, useState, type ReactNode } from 'react';
import { preferReducedMotion } from '../lib/settings';
import { useT } from '../lib/i18n';

export function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg
      className="brand-mark"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
    >
      <path d="M12 3.2c.5 4.2 1.9 5.6 6.1 6.1-4.2.5-5.6 1.9-6.1 6.1-.5-4.2-1.9-5.6-6.1-6.1 4.2-.5 5.6-1.9 6.1-6.1Z" fill="var(--accent)" />
      <circle cx="5.4" cy="18.2" r="1.5" fill="var(--accent)" opacity="0.55" />
      <circle cx="18.6" cy="18.2" r="1.5" fill="var(--accent)" opacity="0.3" />
    </svg>
  );
}

/** A chunky 8×8 spark, drawn on the pixel grid so it matches the UI. */
export function SparkGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 8 8" aria-hidden="true" className={className} shapeRendering="crispEdges">
      <rect x="3" y="0" width="2" height="2" fill="var(--accent)" />
      <rect x="2" y="2" width="4" height="1" fill="var(--accent)" />
      <rect x="1" y="3" width="6" height="2" fill="var(--accent)" />
      <rect x="2" y="5" width="4" height="1" fill="var(--accent)" />
      <rect x="3" y="6" width="2" height="2" fill="var(--accent)" />
      <rect x="3" y="3" width="2" height="2" fill="#fff1c9" />
    </svg>
  );
}

export function useCountUp(target: number, duration = 800): number {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (preferReducedMotion()) {
      setValue(target);
      return;
    }
    const from = fromRef.current;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function Countdown({ to }: { to: number }) {
  const [left, setLeft] = useState(() => Math.max(0, to - Date.now()));

  useEffect(() => {
    setLeft(Math.max(0, to - Date.now()));
    const id = setInterval(() => setLeft(Math.max(0, to - Date.now())), 1000);
    return () => clearInterval(id);
  }, [to]);

  const h = Math.floor(left / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  const s = Math.floor((left % 60_000) / 1000);

  return (
    <span className="timer" aria-label={`Next board in ${h} hours ${m} minutes`}>
      {pad(h)}:{pad(m)}:{pad(s)}
    </span>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2 className="modal-title">{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="switch"
      onClick={() => onChange(!checked)}
    />
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function StatBox({
  label,
  value,
  note,
}: {
  label: string;
  value: string | number;
  note?: string;
}) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {note ? <div className="stat-note">{note}</div> : null}
    </div>
  );
}

export function ScreenHead({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  const t = useT();
  return (
    <header className="stack gap-10" style={{ marginBottom: 26 }}>
      <div className="eyebrow">{t(eyebrow)}</div>
      <h1 style={{ fontSize: 'var(--step-3)' }}>{t(title)}</h1>
      {children ? (
        <p className="lede" style={{ fontSize: 'var(--step-0)' }}>
          {typeof children === 'string' ? t(children) : children}
        </p>
      ) : null}
    </header>
  );
}

export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="toast" role="status" aria-live="polite">
      {message}
    </div>
  );
}

export function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}:${pad(s)}` : `${s}s`;
}

export function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d);
}

export function formatDay(dateIso: string): string {
  const d = new Date(`${dateIso}T00:00:00Z`);
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(d);
}
