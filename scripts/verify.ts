/**
 * Puzzle QA: proves every generated board is valid, uniquely solvable and
 * fairly graded, and reports difficulty/timing spread.
 *
 *   node scripts/verify.ts [days] [startDay]
 */
import { countSolutions, isSolved, touches, type Puzzle } from '../shared/puzzle.ts';
import { buildDailyRounds } from '../server/daily.ts';
import { dayNumber } from '../server/daily.ts';

let failures = 0;
function check(name: string, pass: boolean): void {
  if (!pass) failures++;
  console.log(`${pass ? ' ok ' : 'FAIL'}  ${name}`);
}

const days = Number(process.argv[2] ?? 30);
const start = Number(process.argv[3] ?? 1);
const today = dayNumber();

const difficultyHist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
const hollowHist: Record<number, number> = {};
let puzzles = 0;
let totalMs = 0;
let slowest = 0;

for (let day = start; day < start + days; day++) {
  const t0 = performance.now();
  const rounds = buildDailyRounds(day);
  const elapsed = performance.now() - t0;
  totalMs += elapsed;
  slowest = Math.max(slowest, elapsed);

  const diffs: string[] = [];
  for (let i = 0; i < rounds.length; i++) {
    const p = rounds[i];
    puzzles++;
    const solutions = countSolutions(p, 3);
    const valid = isSolved(p, p.solution);
    const noTouch = p.solution.every((a, idx) =>
      p.solution.every((b, jdx) => idx === jdx || !touches(a, p.size, b)),
    );
    const hollowOk = p.givens.every((g) => p.solution.includes(g));
    const regionOk =
      p.region.length === p.size * p.size &&
      new Set(p.region).size === p.size &&
      p.solution.every((cell, r) => {
        const sameRegion = p.solution.filter((c) => p.region[c] === p.region[cell]);
        return sameRegion.length === 1 && Math.floor(cell / p.size) === r;
      });
    const ok = solutions === 1 && valid && noTouch && hollowOk && regionOk;
    if (!ok) {
      failures++;
      console.log(
        `  FAIL day ${day} round ${i} (n=${p.size}) solutions=${solutions} valid=${valid} noTouch=${noTouch} hollow=${hollowOk} region=${regionOk}`,
      );
    }
    difficultyHist[p.difficulty] = (difficultyHist[p.difficulty] ?? 0) + 1;
    hollowHist[p.givens.length] = (hollowHist[p.givens.length] ?? 0) + 1;
    diffs.push(`${p.size}/${p.difficulty}/${p.givens.length}g`);
  }

  if (day <= start + 4 || day === today) {
    console.log(`day ${day}: ${diffs.join('  ')}   (${elapsed.toFixed(0)}ms)`);
  }
}

// The interactive tutorial board is authored, so it gets the same proof.
const tutorial: Puzzle = {
  size: 4,
  region: [0, 0, 1, 1, 0, 0, 1, 1, 2, 2, 3, 3, 2, 2, 3, 3],
  givens: [7],
  solution: [1, 7, 8, 14],
  difficulty: 1,
};
const tutSolutions = countSolutions(tutorial, 3);
const tutValid = isSolved(tutorial, tutorial.solution);
check('tutorial board is solvable and unique', tutSolutions === 1 && tutValid);

console.log('\n--- summary ---');
console.log(`puzzles:            ${puzzles}`);
console.log(`unique+solved:      ${puzzles - failures}/${puzzles}`);
console.log(`difficulty spread:  ${JSON.stringify(difficultyHist)}`);
console.log(`givens per board:   ${JSON.stringify(hollowHist)}`);
console.log(`avg generation:     ${(totalMs / (puzzles / 4)).toFixed(1)}ms per day`);
console.log(`slowest day:        ${slowest.toFixed(0)}ms`);

if (failures > 0) {
  console.error(`\n${failures} invalid puzzle(s)`);
  process.exit(1);
}
console.log('\nAll puzzles valid and uniquely solvable.');
