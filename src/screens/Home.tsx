import { useEffect, useState } from 'react';
import { api, type TodayResponse } from '../lib/api';
import { Countdown } from '../components/ui';
import { runFor, streakFor } from '../lib/surveyStore';
import { dayNumber } from '../../shared/dates';
import { MAX_SCORE } from '../../shared/score';
import type { SurveyRun } from '../lib/surveyStore';

interface HomeProps {
  navigate: (path: string) => void;
  onTutorial: () => void;
}

interface CardProps {
  index: string;
  kind: string;
  name: string;
  line: string;
  meta: string;
  tone: 'ember' | 'moss' | 'slate';
  status: string;
  action: string;
  onPlay: () => void;
}

function GameCard({ index, kind, name, line, meta, tone, status, action, onPlay }: CardProps) {
  return (
    <article className="game-card" data-tone={tone}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <span className="eyebrow">
          {index} · {kind}
        </span>
        <span className="game-status">{status}</span>
      </div>
      <h2 className="game-name">{name}</h2>
      <p className="par-note" style={{ margin: 0, flex: 1 }}>
        {line}
      </p>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 4 }}>
        <span className="par-note mono" style={{ margin: 0, fontSize: '0.75rem' }}>
          {meta}
        </span>
        <button className="btn btn-sm" onClick={onPlay}>
          {action}
        </button>
      </div>
    </article>
  );
}

export function Home({ navigate, onTutorial }: HomeProps) {
  const [today, setToday] = useState<TodayResponse | null>(null);
  const [common, setCommon] = useState<SurveyRun | null>(null);
  const [rare, setRare] = useState<SurveyRun | null>(null);

  const day = dayNumber();

  useEffect(() => {
    let alive = true;
    api
      .today()
      .then((t) => {
        if (alive) setToday(t);
      })
      .catch(() => undefined);
    setCommon(runFor('common', day));
    setRare(runFor('rare', day));
    return () => {
      alive = false;
    };
  }, [day]);

  const streak = Math.max(streakFor('common', day).current, streakFor('rare', day).current);

  const commonStatus = common ? `${common.score} pts` : 'Unplayed';
  const rareStatus = rare ? `${rare.score} pts` : 'Unplayed';
  const noctStatus = today?.played
    ? `${today.score}/${MAX_SCORE}`
    : today?.active
      ? 'In progress'
      : 'Unplayed';
  const noctAction = today?.played ? 'See result' : today?.active ? 'Continue' : 'Play';

  return (
    <main className="main">
      <div className="wrap">
        <section className="menu-head">
          <div className="eyebrow" style={{ marginBottom: 12 }}>
            Three games, one night
          </div>
          <h1 className="hero-title" style={{ fontSize: 'var(--step-4)', marginBottom: 16 }}>
            Noct
            <span className="dot" aria-hidden="true" />
          </h1>
          <p className="lede" style={{ maxWidth: '52ch' }}>
            Small daily games, the same for everyone, a fresh set at midnight UTC. Thirty seconds a
            prompt, no account, no ads, nothing to install.
          </p>
          <div className="row gap-10" style={{ marginTop: 18, flexWrap: 'wrap' }}>
            <span className="chip chip-ember">
              <span className="chip-dot" aria-hidden="true" />
              {streak}-day streak
            </span>
            {today ? <span className="chip">Board #{String(today.day).padStart(3, '0')}</span> : null}
            <span className="chip">
              Next set in <Countdown to={today ? today.nextResetAt : Date.now() + 1000} />
            </span>
          </div>
        </section>

        <section className="menu-grid" style={{ marginTop: 26 }} aria-label="Choose a game">
          <GameCard
            index="01"
            kind="survey"
            name="Common"
            line="Give the answer everybody gives. The obvious one pays best."
            meta="5 prompts · 35s each"
            tone="ember"
            status={commonStatus}
            action={common ? 'See result' : 'Play'}
            onPlay={() => navigate('/common')}
          />
          <GameCard
            index="02"
            kind="survey"
            name="Rare"
            line="Give the answer nobody gives. The loneliest one pays best."
            meta="5 prompts · 35s each"
            tone="moss"
            status={rareStatus}
            action={rare ? 'See result' : 'Play'}
            onPlay={() => navigate('/rare')}
          />
          <GameCard
            index="03"
            kind="grid"
            name="Noct"
            line="One spark in every row, column and tone — and never let two touch."
            meta="4 boards · about 2 min"
            tone="slate"
            status={noctStatus}
            action={noctAction}
            onPlay={() => navigate('/play')}
          />
        </section>

        <section className="card stack gap-12" style={{ marginTop: 18 }}>
          <div className="row" style={{ justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <span className="eyebrow">More</span>
            <span className="par-note" style={{ margin: 0 }}>
              Practice boards, past dailies and your own numbers.
            </span>
          </div>
          <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
            <button className="tab" onClick={() => navigate('/practice?level=2')}>
              Practice
            </button>
            <button className="tab" onClick={() => navigate('/archive')}>
              Archive
            </button>
            <button className="tab" onClick={() => navigate('/leaderboard')}>
              Standings
            </button>
            <button className="tab" onClick={() => navigate('/stats')}>
              Stats
            </button>
            <button className="tab" onClick={onTutorial}>
              How to play Noct
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
