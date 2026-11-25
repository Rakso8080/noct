import { useMemo, useState } from 'react';
import { Board, findConflicts } from '../components/Board';
import { ScreenHead } from '../components/ui';
import { sfx } from '../lib/audio';
import { haptic } from '../lib/settings';
import { useT } from '../lib/i18n';

const SIZE = 4;
const REGION = [0, 0, 1, 1, 0, 0, 1, 1, 2, 2, 3, 3, 2, 2, 3, 3];
// Pre-lit cell (row 2, column 4). The board has exactly one completion from here.
const GIVEN = [7];

function isComplete(sparks: number[]): boolean {
  if (sparks.length !== SIZE) return false;
  if (findConflicts(SIZE, REGION, sparks).size > 0) return false;
  const rows = new Set(sparks.map((c) => Math.floor(c / SIZE)));
  const cols = new Set(sparks.map((c) => c % SIZE));
  const regs = new Set(sparks.map((c) => REGION[c]));
  return rows.size === SIZE && cols.size === SIZE && regs.size === SIZE;
}

export function HowTo({ navigate }: { navigate: (path: string) => void }) {
  const t = useT();
  const [sparks, setSparks] = useState<number[]>(GIVEN);
  const [excluded, setExcluded] = useState<number[]>([]);

  const conflicts = useMemo(() => findConflicts(SIZE, REGION, sparks), [sparks]);
  const solved = isComplete(sparks);
  const placed = sparks.length - GIVEN.length;

  const caption = solved
    ? {
        title: t('That is the whole game'),
        body: t(
          'One spark per row, column and tone, none touching. Bigger boards ask the same question, just with more places to look.',
        ),
      }
    : conflicts.size > 0
      ? {
          title: t('They repel'),
          body: t(
            'Those two share a row, a column or a tone — or they touch. That red outline is the only thing to fix.',
          ),
        }
      : placed === 0
        ? {
            title: t('Tap a tile'),
            body: t(
              'Light a spark anywhere. The dashed ring marks a pre-lit spark: it is part of the answer and cannot move.',
            ),
          }
        : {
            title: t('{n} of {size} placed', { n: placed + GIVEN.length, size: SIZE }),
            body: t(
              'Keep going. Each shaded tone needs exactly one spark, and each row and column too.',
            ),
          };

  return (
    <main className="main">
      <div className="wrap" style={{ maxWidth: 560 }}>
        <ScreenHead eyebrow="How to play · 30 seconds" title="Three rules, then you know it">
          {t('This board is small on purpose. Solve it once and every daily board makes sense.')}
        </ScreenHead>

        <div className="card stack gap-14">
          <Board
            size={SIZE}
            region={REGION}
            givens={GIVEN}
            sparks={sparks}
            excluded={excluded}
            hinted={[]}
            solved={solved}
            label={t('Tutorial board, 4 by 4')}
            onToggle={(cell) => {
              if (GIVEN.includes(cell)) {
                sfx.blocked();
                return;
              }
              setSparks((s) => (s.includes(cell) ? s.filter((c) => c !== cell) : [...s, cell]));
              sfx.place();
              haptic(9);
            }}
            onExclude={(cell) => {
              setExcluded((e) => (e.includes(cell) ? e.filter((c) => c !== cell) : [...e, cell]));
              sfx.tap();
            }}
          />

          <div className="tut-caption" aria-live="polite">
            <h3>{caption.title}</h3>
            <p className="par-note" style={{ margin: 0 }}>
              {caption.body}
            </p>
          </div>

          <div className="tut-actions">
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => {
                setSparks(GIVEN);
                setExcluded([]);
              }}
            >
              {t('Reset board')}
            </button>
            <div className="row gap-10">
              <button className="btn btn-sm btn-ghost" onClick={() => navigate('/')}>
                {t('Skip')}
              </button>
              <button className={`btn btn-sm${solved ? ' btn-primary' : ''}`} onClick={() => navigate('/play')}>
                {t('Play today’s board')}
              </button>
            </div>
          </div>
        </div>

        <div className="card-flat stack gap-14" style={{ marginTop: 20 }}>
          <span className="eyebrow">{t('Scoring, quickly')}</span>
          <p className="par-note" style={{ margin: 0 }}>
            {t(
              'Every board gives a base score plus a time bonus that fades to zero at par. Finish a board without a hint for 25 extra. A hint costs 80 and forfeits that bonus — the price is always shown before you take it.',
            )}
          </p>
          <p className="par-note" style={{ margin: 0 }}>
            {t(
              'Wrong placements cost nothing but seconds. Only the clock and your own patience decide the score, and the clock is measured by the server, not your browser.',
            )}
          </p>
          <div className="row gap-10" style={{ flexWrap: 'wrap' }}>
            <span className="chip">{t('7 boards daily')}</span>
            <span className="chip">{t('5×5 → 7×7')}</span>
            <span className="chip">{t('3 hints a day')}</span>
            <span className="chip">{t('Reset 00:00 UTC')}</span>
          </div>
        </div>

        <div className="card-flat stack gap-14" style={{ marginTop: 20 }}>
          <span className="eyebrow">{t('The seven boards')}</span>
          <p className="par-note" style={{ margin: 0 }}>
            {t(
              'One night, seven boards, each with its own weather. They share the dark, not the score — no account, no server, just a board waiting on the menu.',
            )}
          </p>
          <ul className="rule-list">
            <li>
              <span>
                <strong>{t('The night choir')}</strong> ({t('Common')}) —{' '}
                {t(
                  'everyone sings the same note. Seven prompts; the louder the answer in the crowd, the higher it lifts you. The strip under the prompt is the real chorus share.',
                )}
              </span>
            </li>
            <li>
              <span>
                <strong>{t('The empty hall')}</strong> ({t('Rare')}) —{' '}
                {t(
                  'one voice in a dark hall. The same seven prompts, read from the other end: the quieter the answer, the higher it lifts you.',
                )}
              </span>
            </li>
            <li>
              <span>
                <strong>{t('The lantern grid')}</strong> ({t('Noct')}) —{' '}
                {t(
                  'four boards of dark windows. One spark per row, column and tone, no two touching. Each finished board lights a lantern.',
                )}
              </span>
            </li>
            <li>
              <span>
                <strong>{t('The quiet board')}</strong> ({t('Chess')}) —{' '}
                {t(
                  'the whole game against a bot. Castling, en passant, promotion and every draw are in. The balance bar weighs the pieces, the Threats ring points at what is hanging, and a crowned pawn flashes where it lands.',
                )}
              </span>
            </li>
            <li>
              <span>
                <strong>{t('The buried sky')}</strong> ({t('Mines')}) —{' '}
                {t(
                  'ten fallen stars under a 9×9 field. The first tap is always safe; long-press (or right-click) to plant a lantern.',
                )}
              </span>
            </li>
            <li>
              <span>
                <strong>{t('The keepsake table')}</strong> ({t('Pairs')}) —{' '}
                {t(
                  'twelve keepsakes face down, one board a day. Every match goes onto the shelf above the cards.',
                )}
              </span>
            </li>
            <li>
              <span>
                <strong>{t('The observatory windows')}</strong> ({t('Lights')}) —{' '}
                {t(
                  'a 5×5 room, all lit. Every tap flips its neighbours too; every window you shut lets a star through.',
                )}
              </span>
            </li>
          </ul>
          <p className="par-note" style={{ margin: 0 }}>
            {t(
              'Six more tables wait in the {arcade}: the glass orchard (Snake), the doubling room (2048), the turning table (Reversi), the quiet draughts table (Checkers), the lantern column (Connect Four) and the long table (Dominoes). They are free play — their records live in this browser and never touch the daily streak.',
              { arcade: t('Arcade') },
            )}
          </p>
          <div className="row gap-10" style={{ flexWrap: 'wrap' }}>
            <button className="btn btn-sm" onClick={() => navigate('/common')}>
              {t('Night choir')}
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => navigate('/rare')}>
              {t('Empty hall')}
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => navigate('/play')}>
              {t('Lantern grid')}
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => navigate('/chess')}>
              {t('Chess')}
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => navigate('/mines')}>
              {t('Buried sky')}
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => navigate('/pairs')}>
              {t('Keepsakes')}
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => navigate('/lights')}>
              {t('Windows')}
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => navigate('/arcade')}>
              {t('Arcade')}
            </button>
          </div>
        </div>

        <div className="card-flat stack gap-14" style={{ marginTop: 20 }}>
          <span className="eyebrow">{t('The side tables')}</span>
          <p className="par-note" style={{ margin: 0 }}>
            {t(
              'Every side table is a complete game against a bot, with two strengths and a local record. These are the rules that matter once you sit down.',
            )}
          </p>
          <ul className="rule-list">
            <li>
              <span>
                <strong>{t('The quiet draughts table')}</strong> ({t('Checkers')}) —{' '}
                {t(
                  'men move and capture forward; kings go both ways. Captures are forced, a jump chain must finish, and a man on the far rank is crowned. No pieces or no legal move loses.',
                )}
              </span>
            </li>
            <li>
              <span>
                <strong>{t('The lantern column')}</strong> ({t('Connect Four')}) —{' '}
                {t(
                  'drop one disc into a column; it falls to the lowest free square. Four of your colour in a row, across, down or diagonally, wins. A full board is a draw.',
                )}
              </span>
            </li>
            <li>
              <span>
                <strong>{t('The long table')}</strong> ({t('Dominoes')}) —{' '}
                {t(
                  'a double-six set, seven tiles each. Match either open end, draw from the boneyard when nothing fits, and pass when it is empty. Empty your hand to win; a blocked table goes to the lower pip count.',
                )}
              </span>
            </li>
          </ul>
          <div className="row gap-10" style={{ flexWrap: 'wrap' }}>
            <button className="btn btn-sm" onClick={() => navigate('/checkers')}>
              {t('Checkers')}
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => navigate('/connect4')}>
              {t('Connect Four')}
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => navigate('/dominoes')}>
              {t('Dominoes')}
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => navigate('/arcade')}>
              {t('Arcade')}
            </button>
          </div>
        </div>

        <div className="card-flat stack gap-14" style={{ marginTop: 20 }}>
          <span className="eyebrow">{t('The Long Road')}</span>
          <p className="par-note" style={{ margin: 0 }}>
            {t(
              'The Hollow Atlas gathers all thirteen places into one road. Each place keeps three marks: a waymark for a first visit, a night mark for today, and a keepsake for a personal record. The nightly route suggests three stops, but it never locks a door or breaks a streak.',
            )}
          </p>
          <div className="row gap-10" style={{ flexWrap: 'wrap' }}>
            <button className="btn btn-sm" onClick={() => navigate('/atlas')}>
              {t('Open the atlas')}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
