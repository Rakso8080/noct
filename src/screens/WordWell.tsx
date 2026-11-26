import { useCallback, useEffect, useMemo, useState } from 'react';
import { dayNumber } from '../../shared/dates';
import { readGames, recordWord, wordToday } from '../lib/gamesStore';
import {
  KEYBOARD_ROWS,
  MAX_GUESSES,
  WORD_LENGTH,
  dailyWord,
  evaluateGuess,
  freeWord,
  isAllowedWord,
  keyboardState,
  shareGrid,
  type LetterState,
} from '../lib/wordwell';
import { sfx } from '../lib/audio';
import { postArcadeScore } from '../lib/arcade';
import { wordWellPoints } from '../../shared/arcade';
import type { ArcadeScoreResponse } from '../../shared/types';
import { haptic } from '../lib/settings';
import { ScreenHead } from '../components/ui';
import { useT } from '../lib/i18n';

type Mode = 'daily' | 'free';

function tileClass(state: LetterState | 'empty' | 'now'): string {
  return `well-tile is-${state}`;
}

export function WordWell({ navigate }: { navigate: (path: string) => void }) {
  const t = useT();
  const day = dayNumber();
  const [mode, setMode] = useState<Mode>('daily');
  const [seed, setSeed] = useState(0);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [saved] = useState(() => wordToday(day));
  const [best] = useState(() => readGames().word.bestGuesses);
  const [posted, setPosted] = useState<ArcadeScoreResponse | null>(null);

  const answer = useMemo(
    () => (mode === 'daily' ? dailyWord(day) : freeWord(seed)),
    [mode, day, seed],
  );
  const won = done && guesses[guesses.length - 1] === answer;
  const keys = useMemo(() => keyboardState(guesses, answer), [guesses, answer]);

  const reset = useCallback(
    (next: Mode) => {
      setMode(next);
      setGuesses([]);
      setDraft('');
      setDone(false);
      setNote(null);
      setPosted(null);
      setSeed((value) => value + 1);
      sfx.tap();
    },
    [],
  );

  /* Yesterday's word is still readable: a finished day shows its grid and answer. */
  useEffect(() => {
    if (!saved) return;
    setNote(t('Today’s word is already drawn. Free play is open.'));
  }, [saved, t]);

  const submit = useCallback(() => {
    if (done) return;
    const guess = draft.trim().toUpperCase();
    if (guess.length !== WORD_LENGTH) {
      setNote(t('Five letters, no more and no less.'));
      sfx.blocked();
      return;
    }
    if (!isAllowedWord(guess)) {
      setNote(t('The well does not know that word.'));
      sfx.blocked();
      haptic(6);
      return;
    }
    const next = [...guesses, guess];
    setGuesses(next);
    setDraft('');
    setNote(null);
    const finished = guess === answer || next.length >= MAX_GUESSES;
    if (finished) {
      setDone(true);
      const victory = guess === answer;
      if (victory) {
        sfx.complete();
        haptic(24);
      } else {
        sfx.tier('lost');
        haptic(12);
      }
      if (mode === 'daily') {
        recordWord(day, victory, next.length, answer);
        void postArcadeScore('wordwell', wordWellPoints(next.length, victory)).then(setPosted);
      }
    } else {
      sfx.place();
      haptic(6);
    }
  }, [answer, day, done, draft, guesses, mode, t]);

  const press = useCallback(
    (key: string) => {
      if (done) return;
      if (key === 'ENTER') {
        submit();
        return;
      }
      if (key === 'BACK') {
        setDraft((value) => value.slice(0, -1));
        sfx.remove();
        return;
      }
      if (draft.length >= WORD_LENGTH) {
        sfx.blocked();
        return;
      }
      setDraft((value) => value + key);
      sfx.tap();
    },
    [done, draft.length, submit],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === 'Enter') {
        event.preventDefault();
        press('ENTER');
      } else if (event.key === 'Backspace') {
        event.preventDefault();
        press('BACK');
      } else if (/^[a-zA-Z]$/.test(event.key)) {
        press(event.key.toUpperCase());
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press]);

  async function copyGrid(): Promise<void> {
    try {
      const text = `Noct · Word Well #${day}\n${shareGrid(guesses, answer)}\n${guesses.length}/${MAX_GUESSES}`;
      await navigator.clipboard.writeText(text);
      setNote(t('Copied — the grid leaves the answers out.'));
    } catch {
      setNote(t('The clipboard is closed in this browser.'));
    }
  }

  const rows = Array.from({ length: MAX_GUESSES }, (_, index) => {
    if (index < guesses.length) {
      const guess = guesses[index];
      const states = evaluateGuess(guess, answer);
      return { letters: guess.split(''), states };
    }
    if (index === guesses.length && !done) {
      const letters = draft.padEnd(WORD_LENGTH, ' ').split('');
      return { letters, states: letters.map(() => 'now' as const) };
    }
    return { letters: Array.from({ length: WORD_LENGTH }, () => ' '), states: [] };
  });

  return (
    <main className="main">
      <div className="wrap" style={{ maxWidth: 680 }}>
        <div className="well-head">
          <ScreenHead eyebrow={t('Word Well · Night {n}', { n: String(day).padStart(3, '0') })} title={t('The Word Well')}>
            {t(
              'Five letters are lowered into the well each night. Six guesses bring them back; green is the right letter in the right place, amber is the right letter in the wrong one.',
            )}
          </ScreenHead>
        </div>

        <div className="mini-modes">
          <div className="segmented" role="group" aria-label={t('Word Well mode')}>
            <button type="button" aria-pressed={mode === 'daily'} onClick={() => reset('daily')}>
              {t('Daily')}
            </button>
            <button type="button" aria-pressed={mode === 'free'} onClick={() => reset('free')}>
              {t('Free play')}
            </button>
          </div>
          <span className="chess-note">
            {mode === 'daily'
              ? saved
                ? t('Today’s word was {answer} — {n} guesses.', {
                    answer: saved.answer,
                    n: saved.guesses,
                  })
                : t('The same five letters for everyone today')
              : t('A fresh word, not counted in the daily record')}
          </span>
        </div>

        <div className="mini-hud">
          <span className="chip">
            {t('Guess')} <span className="mono">{Math.min(guesses.length + 1, MAX_GUESSES)}</span> / {MAX_GUESSES}
          </span>
          <span className="chip">
            {best === null ? t('No best yet') : t('Best {n} guesses', { n: best })}
          </span>
          <span className="chip">{t('Six tries, one word')}</span>
          {done ? (
            <span className={`chip${won ? ' chip-ember' : ''}`}>
              {won ? t('Drawn up in {n}', { n: guesses.length }) : t('The well keeps it: {answer}', { answer })}
            </span>
          ) : null}
        </div>

        <div className="well-board" role="group" aria-label={t('Word Well board, six guesses of five letters')}>
          {rows.map((row, rowIndex) => (
            <div className="well-row" key={rowIndex}>
              {row.letters.map((letter, index) => (
                <span
                  key={index}
                  className={tileClass(row.states[index] ?? 'empty')}
                  data-filled={letter.trim() ? 'true' : 'false'}
                >
                  {letter.trim()}
                </span>
              ))}
            </div>
          ))}
        </div>

        {done ? (
          <div className="mini-banner" role="status">
            <strong>
              {won
                ? t('“{answer}” came up in {n} guesses.', { answer, n: guesses.length })
                : t('The word was “{answer}”. The well is patient; come back at midnight.', { answer })}
            </strong>
            {posted ? (
              <span className="chip">
                {t('On tonight’s table: {score} · #{rank}', { score: posted.best, rank: posted.rank })}
              </span>
            ) : null}
            <div className="row gap-10" style={{ flexWrap: 'wrap' }}>
              <button className="btn btn-sm" onClick={() => void copyGrid()}>
                {t('Copy the grid')}
              </button>
              <button className="btn btn-sm btn-primary" onClick={() => reset('free')}>
                {t('Free play')}
              </button>
            </div>
          </div>
        ) : null}

        <div className="well-keys" role="group" aria-label={t('Letter keyboard')}>
          {KEYBOARD_ROWS.map((row) => (
            <div className="well-key-row" key={row}>
              {row.split('').map((letter) => (
                <button
                  key={letter}
                  type="button"
                  className="well-key"
                  data-state={keys[letter] ?? 'unused'}
                  aria-label={keys[letter] ? `${letter}, ${t(keys[letter])}` : letter}
                  onClick={() => press(letter)}
                >
                  {letter}
                </button>
              ))}
            </div>
          ))}
          <div className="well-key-row">
            <button type="button" className="well-key is-wide" onClick={() => press('ENTER')}>
              {t('Enter')}
            </button>
            <button type="button" className="well-key is-wide" onClick={() => press('BACK')}>
              {t('Erase')}
            </button>
          </div>
        </div>

        {note ? <p className="par-note well-note" role="status">{note}</p> : null}

        <div className="mini-actions">
          <button className="btn btn-sm btn-ghost" onClick={() => reset(mode)}>
            {t('New word')}
          </button>
          <button className="btn btn-sm btn-ghost" onClick={() => navigate('/night')}>
            {t('Tonight’s dispatch')}
          </button>
          <button className="btn btn-sm btn-ghost" onClick={() => navigate('/')}>
            {t('Menu')}
          </button>
        </div>
      </div>
    </main>
  );
}
