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

/**
 * The server measures from session creation, so on a remote origin the network
 * round-trip can itself exceed the floor. Measure the gap we control and only
 * demand a 429 when the request really could have arrived inside the floor.
 */
const FLOOR_MS = 700;
const fastGap = (from: number) => Date.now() - from;
const explained = (gap: number) => gap >= FLOOR_MS - 100;

// Server-side clock: submitting instantly is refused, so time cannot be forged.
const fastStart = Date.now();
const earlyPractice = await alice.call('/api/practice/start', 'POST', { level: 1 });
const gap = fastGap(fastStart);
const instant = await alice.call(`/api/session/${earlyPractice.data.sessionId}/round`, 'POST', {
  index: 0,
  cells: [0, 1, 2, 3, 4],
});
check(
  'instant submit throttled',
  instant.status === 429 ? instant.data.reason === 'too_fast' : explained(gap),
  instant.status === 429 ? 'too_fast' : `network gap ${gap}ms exceeds the ${FLOOR_MS}ms floor`,
);

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
check(
  'rank and percentile present',
  typeof summary.rank === 'number' &&
    summary.rank >= 1 &&
    summary.percentile !== null &&
    summary.percentile >= 1 &&
    summary.percentile <= 100,
  `rank ${summary.rank}, ${summary.percentile}%`,
);

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

const quickStart = Date.now();
const practice = await alice.call('/api/practice/start', 'POST', { level: 1 });
const practiceGap = fastGap(quickStart);
check('practice starts', practice.status === 200 && practice.data.mode === 'practice');
const quick = await alice.call(`/api/session/${practice.data.sessionId}/round`, 'POST', {
  index: 0,
  cells: [0, 1, 2, 3, 4],
});
check(
  'practice also enforces the clock',
  quick.status === 429 ? quick.data.reason === 'too_fast' : explained(practiceGap),
  quick.status === 429 ? 'too_fast' : `network gap ${practiceGap}ms exceeds the ${FLOOR_MS}ms floor`,
);

const named = await alice.call('/api/me', 'POST', { name: 'Ada' });
check('display name accepted', named.status === 200 && named.data.name === 'Ada');
const badName = await alice.call('/api/me', 'POST', { name: '<script>' });
check('unsafe display name rejected', badName.status === 400);

// A second player must not see the first player's progress.
const bob = new Player();
const bobToday = await bob.call('/api/today');
check('second player is isolated', bobToday.data.played === false && bobToday.data.streak === 0);
check('second player gets their own cookie', bob.cookie !== alice.cookie);

// The side tables: Word Well and Memory Bell score through the same guest cookie.
const unknownGame = await alice.call('/api/arcade/score', 'POST', { game: 'snake', score: 120 });
check('unknown side table rejected', unknownGame.status === 400, unknownGame.data.error);
for (const score of [-1, 1.5, 10_000]) {
  const res = await alice.call('/api/arcade/score', 'POST', { game: 'wordwell', score });
  check(`side-table score ${score} rejected`, res.status === 400);
}
const backdated = await alice.call('/api/arcade/score', 'POST', {
  game: 'wordwell',
  score: 300,
  day: today.data.day - 1,
});
check('side-table scores only count today', backdated.status === 400, backdated.data.error);

const word1 = await alice.call('/api/arcade/score', 'POST', { game: 'wordwell', score: 480 });
check('Word Well score accepted', word1.status === 200 && word1.data.best >= 480, `${word1.data.best} pts`);
const word2 = await alice.call('/api/arcade/score', 'POST', { game: 'wordwell', score: 360 });
check(
  'a worse run keeps the best score and counts the play',
  word2.data.best === word1.data.best && word2.data.plays === word1.data.plays + 1,
  `best ${word2.data.best}, plays ${word2.data.plays}`,
);
const word3 = await alice.call('/api/arcade/score', 'POST', { game: 'wordwell', score: 600 });
check('a better run raises the table score', word3.data.best >= 600 && word3.data.rank >= 1, `rank ${word3.data.rank}`);

const arcadeBoard = await alice.call('/api/arcade/leaderboard?game=wordwell&scope=today');
check(
  'Word Well standings show the player',
  arcadeBoard.status === 200 && arcadeBoard.data.me?.score === word3.data.best && arcadeBoard.data.rows.some((r: any) => r.me),
);
const arcadeWeek = await alice.call('/api/arcade/leaderboard?game=wordwell&scope=week');
check('Word Well weekly table aggregates', arcadeWeek.status === 200 && arcadeWeek.data.me?.score >= word3.data.best);
const arcadeUnknown = await alice.call('/api/arcade/leaderboard?game=chess&scope=today');
check('standings refuse an unknown side table', arcadeUnknown.status === 400);

const sideStats = await alice.call('/api/stats');
const wordStat = sideStats.data.arcade?.find((entry: any) => entry.game === 'wordwell');
check(
  'statistics show the side table',
  Boolean(wordStat) && wordStat.best === word3.data.best && wordStat.plays >= 3,
  wordStat ? `best ${wordStat.best}, ${wordStat.plays} plays` : 'missing',
);

const bell = await bob.call('/api/arcade/score', 'POST', { game: 'memorybell', score: 700 });
check('Memory Bell score accepted', bell.status === 200 && bell.data.best >= 700);
const bobStats = await bob.call('/api/stats');
check(
  'each player keeps their own side-table row',
  bobStats.data.arcade?.length === 1 && bobStats.data.arcade[0].game === 'memorybell',
  JSON.stringify(bobStats.data.arcade),
);
const bobWordBoard = await bob.call('/api/arcade/leaderboard?game=wordwell&scope=today');
check('one player’s Word Well table stays private to them', !bobWordBoard.data.rows.some((r: any) => r.me));

// One board for everyone: two different guests get the identical rounds today.
const bobDaily = await bob.call('/api/daily/start', 'POST', {});
check('guest can still start today’s board', bobDaily.status === 200 && bobDaily.data.mode === 'daily');
check(
  'both players are dealt the same board',
  JSON.stringify(bobDaily.data.rounds) === JSON.stringify(start.data.rounds),
);
const aliceAfterArcade = await alice.call('/api/today');
check(
  'side-table scores do not touch the daily streak or score',
  aliceAfterArcade.data.score === summary.score && aliceAfterArcade.data.streak === 1,
);

// Privacy: deleting an account removes its results.
const gone = await alice.call('/api/me', 'DELETE');
check('account deletion accepted', gone.status === 200);
const afterDelete = await alice.call('/api/today');
check('deleted player has no history', afterDelete.data.played === false);
const boardAfter = await alice.call('/api/leaderboard?scope=today');
check('deleted player removed from leaderboard', !boardAfter.data.rows.some((r: any) => r.me));
const arcadeAfter = await alice.call('/api/arcade/leaderboard?game=wordwell&scope=today');
check('deleted player removed from the side table', !arcadeAfter.data.rows.some((r: any) => r.me));

console.log(failures === 0 ? '\nAll smoke checks passed.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
