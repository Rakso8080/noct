interface ResumeCardProps {
  title: string;
  body: string;
  meta?: string;
  onContinue: () => void;
  onDiscard: () => void;
}

/** Offered when a saved round for today is waiting in local storage. */
export function ResumeCard({ title, body, meta, onContinue, onDiscard }: ResumeCardProps) {
  return (
    <div className="card resume-card" role="status">
      <span className="eyebrow">Unfinished round</span>
      <h2 style={{ fontSize: 'var(--step-2)', margin: 0 }}>{title}</h2>
      <p className="par-note" style={{ margin: 0 }}>
        {body}
      </p>
      {meta ? <p className="par-note mono" style={{ margin: 0 }}>{meta}</p> : null}
      <div className="row gap-10" style={{ flexWrap: 'wrap' }}>
        <button className="btn btn-sm btn-primary" onClick={onContinue}>
          Continue
        </button>
        <button className="btn btn-sm btn-ghost" onClick={onDiscard}>
          Discard
        </button>
      </div>
    </div>
  );
}