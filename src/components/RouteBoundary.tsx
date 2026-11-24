import { Component, type ErrorInfo, type ReactNode } from 'react';
import { translate } from '../lib/i18n';

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
}

/** A lazy chunk can fail (offline, stale deploy); say so instead of a blank page. */
export class RouteBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) console.error('route failed', error, info);
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="main">
        <div className="wrap" style={{ maxWidth: 480 }}>
          <div className="card stack gap-14">
            <span className="eyebrow">{translate('Slow night')}</span>
            <h1 style={{ fontSize: 'var(--step-2)' }}>{translate('That table did not load')}</h1>
            <p className="par-note" style={{ margin: 0 }}>
              {translate('A piece of the app failed to arrive. Reloading usually brings it back.')}
            </p>
            <div className="row gap-10" style={{ flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => window.location.reload()}>
                {translate('Reload')}
              </button>
              <button className="btn btn-ghost" onClick={() => window.location.assign(import.meta.env.BASE_URL)}>
                {translate('Back to the menu')}
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }
}