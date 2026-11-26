import { useEffect, useState } from 'react';
import { dayNumber } from '../../shared/dates';
import { api } from '../lib/api';
import { copyText } from '../lib/clipboard';
import {
  compareTableRun,
  tableChallengeLink,
  type TableChallenge,
  type TableRun,
  type TableVerdict,
} from '../lib/challenge';
import { useT } from '../lib/i18n';
import { shareTableCard, type TableCardData } from '../lib/shareCard';

type T = (key: string, vars?: Record<string, string | number>) => string;

function pad(n: number): string {
  return String(n).padStart(3, '0');
}

function stones(n: number, t: T): string {
  return n === 1 ? t('1 stone') : t('{n} stones', { n });
}

function sowings(n: number, t: T): string {
  return n === 1 ? t('1 sowing') : t('{n} sowings', { n });
}

function jumps(n: number, t: T): string {
  return n === 1 ? t('1 jump') : t('{n} jumps', { n });
}

function pegs(n: number, t: T): string {
  return n === 1 ? t('1 peg') : t('{n} pegs', { n });
}

function pegsLeft(n: number, t: T): string {
  return n === 1 ? t('1 peg left') : t('{n} pegs left', { n });
}

function gameName(run: TableRun, t: T): string {
  return run.game === 'mancala' ? t('Mancala') : t('Peg Solitaire');
}

function gameTitle(run: TableRun, t: T): string {
  return run.game === 'mancala' ? t('The stone circle') : t('The hermit’s cross');
}

function targetSentence(challenge: TableChallenge, t: T): string {
  if (challenge.game === 'mancala') {
    return t('{name} kept {stones} in {moves}.', {
      name: challenge.name,
      stones: stones(challenge.stones, t),
      moves: sowings(challenge.moves, t),
    });
  }
  return t('{name} left {pegs} in {moves}.', {
    name: challenge.name,
    pegs: pegs(challenge.pegs, t),
    moves: jumps(challenge.moves, t),
  });
}

function challengeSentence(challenge: TableChallenge, t: T): string {
  if (challenge.game === 'mancala') {
    return t('{name} kept {stones} in {moves} — beat it.', {
      name: challenge.name,
      stones: stones(challenge.stones, t),
      moves: sowings(challenge.moves, t),
    });
  }
  return t('{name} left {pegs} in {moves} — beat it.', {
    name: challenge.name,
    pegs: pegs(challenge.pegs, t),
    moves: jumps(challenge.moves, t),
  });
}

function verdictSentence(
  challenge: TableChallenge,
  verdict: TableVerdict,
  t: T,
): string {
  if (verdict === 'matched') return t('A dead heat');
  if (challenge.game === 'mancala') {
    return verdict === 'beat'
      ? t('You beat {name}’s circle', { name: challenge.name })
      : t('{name} still holds it', { name: challenge.name });
  }
  return verdict === 'beat'
    ? t('You beat {name}’s cross', { name: challenge.name })
    : t('{name}’s cross still stands', { name: challenge.name });
}

function detailFor(run: TableRun, t: T): string {
  if (run.game === 'mancala') {
    const result = run.result === 'win' ? t('Won') : run.result === 'loss' ? t('Lost') : t('Draw');
    return t('{moves} · {result}', { moves: sowings(run.moves, t), result });
  }
  return run.pegs === 1
    ? t('{moves} · perfect cross', { moves: jumps(run.moves, t) })
    : t('{moves} · {pegs} left', { moves: jumps(run.moves, t), pegs: pegs(run.pegs, t) });
}

function headlineFor(run: TableRun, t: T): string {
  return run.game === 'mancala' ? stones(run.stones, t) : pegsLeft(run.pegs, t);
}

function basePath(): string {
  return import.meta.env.BASE_URL.replace(/\/+$/, '');
}

export function TableChallengeBanner({ challenge }: { challenge: TableChallenge | null | undefined }) {
  const t = useT();
  const [hidden, setHidden] = useState(false);
  if (!challenge || hidden) return null;

  return (
    <div className="challenge-line table-challenge-line" role="status">
      <div className="stack gap-6">
        <span className="eyebrow">
          {challenge.game === 'mancala' ? t('A shared circle') : t('A shared cross')}
        </span>
        <p>{challengeSentence(challenge, t)}</p>
        <div className="table-challenge-chips">
          <span className="chip">{t('Night {n}', { n: pad(challenge.day) })}</span>
          {challenge.game === 'mancala' ? (
            <span className="chip">
              {t('{level} bot', { level: t(challenge.level === 2 ? 'Sharp' : 'Steady') })}
            </span>
          ) : (
            <span className="chip">{t('Classic cross')}</span>
          )}
        </div>
      </div>
      <button
        type="button"
        className="icon-btn"
        onClick={() => setHidden(true)}
        aria-label={t('Dismiss')}
      >
        <svg width="12" height="12" viewBox="0 0 14 14" aria-hidden="true">
          <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

export function TableResultCard({
  run,
  board,
  challenge,
}: {
  run: TableRun;
  board: readonly number[];
  challenge?: TableChallenge | null;
}) {
  const t = useT();
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [cardState, setCardState] = useState<'idle' | 'working' | 'shared' | 'saved' | 'failed'>('idle');
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    api
      .me()
      .then((me) => {
        if (live) setPlayerName(me.name);
      })
      .catch(() => {
        /* The card still shares as “A player”. */
      });
    return () => {
      live = false;
    };
  }, []);

  const shared = challenge && challenge.game === run.game ? challenge : null;
  const verdict = shared ? compareTableRun(shared, run) : null;
  const friendly = Boolean(shared && shared.day !== dayNumber());
  const name = playerName ?? t('A player');
  const headline = headlineFor(run, t);
  const detail = detailFor(run, t);
  const target = shared ? targetSentence(shared, t) : null;
  const verdictText = shared && verdict ? verdictSentence(shared, verdict, t) : null;

  function linkFor(): string {
    return tableChallengeLink(run, name, window.location.origin, basePath());
  }

  function shareTextFor(): string {
    const link = linkFor();
    return [
      t('Noct · {game} · Night {n}', {
        game: gameName(run, t),
        n: pad(run.day),
      }),
      `${headline} · ${detail}`,
      target ?? '',
      verdictText ?? '',
      t(shared ? 'Beat it: {link}' : 'Challenge a friend: {link}', { link }),
    ]
      .filter(Boolean)
      .join('\n');
  }

  function cardDataFor(): TableCardData {
    return {
      game: gameName(run, t),
      title: gameTitle(run, t),
      dayLabel: `#${pad(run.day)}`,
      headline,
      detail,
      footer: t(run.game === 'mancala' ? 'A shared circle' : 'A shared cross'),
      kind: run.game,
      board: [...board],
      target: target ?? undefined,
      verdict: verdictText ?? undefined,
    };
  }

  async function copyResult(): Promise<void> {
    const ok = await copyText(shareTextFor());
    setNote(ok ? t('Copied') : t('The clipboard is closed in this browser.'));
  }

  async function copyLink(): Promise<void> {
    const ok = await copyText(linkFor());
    setNote(ok ? t('Link copied') : t('The clipboard is closed in this browser.'));
  }

  async function shareCard(): Promise<void> {
    setCardState('working');
    setNote(null);
    const outcome = await shareTableCard(cardDataFor(), shareTextFor());
    const next =
      outcome === 'shared'
        ? 'shared'
        : outcome === 'saved'
          ? 'saved'
          : outcome === 'failed'
            ? 'failed'
            : 'idle';
    setCardState(next);
    setNote(
      next === 'shared'
        ? t('Shared')
        : next === 'saved'
          ? t('Saved png')
          : next === 'failed'
            ? t('Could not share')
            : null,
    );
  }

  const cardLabel =
    cardState === 'working'
      ? t('Making card…')
      : cardState === 'shared'
        ? t('Shared')
        : cardState === 'saved'
          ? t('Saved png')
          : cardState === 'failed'
            ? t('Could not share')
            : t('Share card');

  return (
    <section className="table-result-card" aria-label={t('Result card')}>
      <div className="table-result-copy">
        <span className="eyebrow">{t('Result · Night {n}', { n: pad(run.day) })}</span>
        <h2>{gameTitle(run, t)}</h2>
        <div className="table-result-score">
          <strong>{headline}</strong>
          <span>{detail}</span>
        </div>
        {shared && target ? (
          <div className="table-result-challenge">
            <p>{target}</p>
            {verdictText ? <strong>{verdictText}</strong> : null}
          </div>
        ) : null}
        {friendly ? <p className="par-note">{t('Friendly replay · today’s record is unchanged.')}</p> : null}
      </div>

      <div className="table-result-actions">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => void shareCard()}
          disabled={cardState === 'working'}
        >
          {cardLabel}
        </button>
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => void copyResult()}>
          {t('Copy result')}
        </button>
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => void copyLink()}>
          {t('Copy challenge link')}
        </button>
      </div>
      <p className="par-note table-result-status" role="status" aria-live="polite">
        {note ?? '\u00a0'}
      </p>
    </section>
  );
}
