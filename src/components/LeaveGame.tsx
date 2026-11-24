import { useEffect } from 'react';

interface LeaveGameProps {
  open: boolean;
  title: string;
  body: string;
  onStay: () => void;
  onLeave: () => void;
}

/**
 * A small guard before a key press throws away an unfinished board. Escape
 * keeps playing (the safe answer); leaving is always an explicit click.
 */
export function LeaveGame({ open, title, body, onStay, onLeave }: LeaveGameProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onStay();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onStay]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onStay}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="stack gap-14">
          <h2 className="modal-title">{title}</h2>
          <p className="par-note" style={{ margin: 0 }}>
            {body}
          </p>
          <div className="row gap-10" style={{ flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={onStay}>
              Keep playing
            </button>
            <button className="btn btn-ghost" onClick={onLeave}>
              Leave the table
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}