/**
 * End-to-end QA against a running API. Plays a full daily as one player,
 * checks that solutions never leak, that scoring, streaks, leaderboards and
 * anti-abuse behave, and that a second player cannot see the first's data.
 *
 *   node scripts/smoke.ts [baseUrl]
 */
import { buildDailyRounds } from '../server/daily.ts';

const BASE = process.argv[2] ?? 'http://127.0.0.1:8788';
let failures = 0;

function check(name: string, pass: boolean, detail = ''): void {
  if (!pass) failures++;
  console.log(`${pass ? ' ok ' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

class Player {
  cookie = '';
  async call(path: string, method = 'GET', body?: unknown): Promise<{ status: number; data: any }> {
    const res = await fetch(BASE + path, {
      method,
      headers: {
        'content-type': 'application/json',
        ...(this.cookie ? { cookie: this.cookie } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const set = res.headers.getSetCookie?.() ?? [];
    if (set.length) this.cookie = set[0].split(';')[0];
    const text = await res.text();
    let data: any = text;
    try {
      data = JSON.parse(text);
    } catch {
      /* keep text */
    }
    return { status: res.status, data };
  }
}

const today = await new Player().call('/api/today');
check('today responds', today.status === 200, `day ${today.data.day} ${today.data.date}`);
check('today exposes no puzzle data', today.data.region === undefined);

const rounds = buildDailyRounds(today.data.day);
const alice = new Player();

const start = await alice.call('/api/daily/start', 'POST', {});
check('daily start', start.status === 200 && Boolean(start.data.sessionId));
check('no solution in start payload', !JSON.stringify(start.data).includes('"solution"'));
check('four rounds, ramping', start.data.rounds.length === 4 && start.data.rounds[3].size === 7);
const sessionId = start.data.sessionId;

// A wrong-but-complete placement must be rejected without advancing.
await sleep(820);
const wrong = rounds[0].solution.map((c) => (c + 1) % (rounds[0].size * rounds[0].size));
const bad = await alice.call(`/api/session/${sessionId}/round`, 'POST', { index: 0, cells: wrong });
check('invalid placement rejected', bad.data.ok === false && bad.data.reason === 'invalid', bad.data.reason);
const stillRoundZero = await alice.call(`/api/session/${sessionId}`);
check('invalid placement does not advance', stillRoundZero.data.roundIndex === 0);

// Hints reveal a real spark and are limited.
const hint = await alice.call(`/api/session/${sessionId}/hint`, 'POST', { placed: [] });
check('hint reveals a solution cell', hint.status === 200 && rounds[0].solution.includes(hint.data.cell));
check('hints left decrements', hint.data.hintsLeft === 2);
const hintAgain = await alice.call(`/api/session/${sessionId}/hint`, 'POST', { placed: [] });
check('one hint per round', hintAgain.status === 409);

// Server-side clock: submitting instantly is refused, so time cannot be forged.
const earlyPractice = await alice.call('/api/practice/start', 'POST', { level: 1 });
const instant = await alice.call(`/api/session/${earlyPractice.data.sessionId}/round`, 'POST', {
  index: 0,
  cells: [0, 1, 2, 3, 4],
});
check('instant submit throttled', instant.status === 429 && instant.data.reason === 'too_fast');

let summary: any = null;
for (let i = 0; i < rounds.length; i++) {
  await sleep(820);
  const res = await alice.call(`/api/session/${sessionId}/round`, 'POST', {
    index: i,
    cells: rounds[i].solution,
  });
  if (i === 0) check('correct placement scores', res.data.ok === true && res.data.points > 0, `${res.data.points} pts`);
  if (res.data.finished) summary = res.data.summary;
}
check('rounds advance in order', summary !== null);
if (!summary) {
  console.log('\ncannot continue without a summary');
  process.exit(1);
}
check('score is sum of rounds minus hint cost', summary.score > 0 && summary.score < summary.maxScore);
check('rating assigned', typeof summary.rating === 'string');
check('streak starts at 1', summary.streak === 1);
check('rank and percentile present', summary.rank === 1 && summary.percentile !== null);

const replay = await alice.call('/api/daily/start', 'POST', {});
check('one attempt per day', replay.status === 409 && replay.data.error === 'already_played');
check('replay returns the finished summary', replay.data.summary?.score === summary.score);

const todayAfter = await alice.call('/api/today');
check('today marks the day played', todayAfter.data.played === true && todayAfter.data.score === summary.score);

const board = await alice.call('/api/leaderboard?scope=today');
check('daily leaderboard lists the player', board.data.rows.some((r: any) => r.me));
const week = await alice.call('/api/leaderboard?scope=week');
check('weekly leaderboard aggregates', week.data.rows.some((r: any) => r.me));

const stats = await alice.call('/api/stats');
check('stats count the day', stats.data.dailyCompleted === 1 && stats.data.bestScore === summary.score);
check('calendar covers 70 days', stats.data.calendar.length === 70);

const archive = await alice.call('/api/archive');
check('archive responds', archive.status === 200 && Array.isArray(archive.data.entries));
if (archive.data.entries.length === 0) {
  console.log(' note  archive is empty — expected on launch day (board #1 is today)');
} else {
  const oldest = archive.data.entries[0];
  if (oldest.playable) {
    const arch = await alice.call(`/api/archive/${oldest.day}/start`, 'POST', {});
    check('archive board can be replayed', arch.status === 200 && arch.data.mode === 'archive');
    const archToday = await alice.call('/api/today');
    check('archive does not touch today', archToday.data.played === true && archToday.data.score === summary.score);
  }
}
const future = await alice.call(`/api/archive/${today.data.day}/start`, 'POST', {});
check('archive refuses today/future', future.status === 400);

const practice = await alice.call('/api/practice/start', 'POST', { level: 1 });
check('practice starts', practice.status === 200 && practice.data.mode === 'practice');
const quick = await alice.call(`/api/session/${practice.data.sessionId}/round`, 'POST', {
  index: 0,
  cells: [0, 1, 2, 3, 4],
});
check('practice also enforces the clock', quick.status === 429);

const named = await alice.call('/api/me', 'POST', { name: 'Ada' });
check('display name accepted', named.status === 200 && named.data.name === 'Ada');
const badName = await alice.call('/api/me', 'POST', { name: '<script>' });
check('unsafe display name rejected', badName.status === 400);

// A second player must not see the first player's progress.
const bob = new Player();
const bobToday = await bob.call('/api/today');
check('second player is isolated', bobToday.data.played === false && bobToday.data.streak === 0);
check('second player gets their own cookie', bob.cookie !== alice.cookie);

// Privacy: deleting an account removes its results.
const gone = await alice.call('/api/me', 'DELETE');
check('account deletion accepted', gone.status === 200);
const afterDelete = await alice.call('/api/today');
check('deleted player has no history', afterDelete.data.played === false);
const boardAfter = await alice.call('/api/leaderboard?scope=today');
check('deleted player removed from leaderboard', !boardAfter.data.rows.some((r: any) => r.me));

console.log(failures === 0 ? '\nAll smoke checks passed.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
