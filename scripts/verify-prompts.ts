/**
 * Prompt bank QA: proves the bank is big enough for Classic, that every poll
 * has 14–16 weighted answers, that the board can reach every tier, and that
 * Daily and Classic deal the way the game says they do.
 *
 *   node scripts/verify-prompts.ts
 */
import {
  BOARD_SIZE,
  PROMPTS_PER_DAY,
  SURVEY_PROMPTS,
  classicDeck,
  dailyPrompts,
  normaliseAnswer,
  scoreFor,
  tierForRank,
} from '../shared/survey.ts';

let failures = 0;

function check(name: string, pass: boolean, detail = ''): void {
  if (!pass) failures++;
  console.log(`${pass ? ' ok ' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

const TARGET = 120;
console.log(`bank: ${SURVEY_PROMPTS.length} prompts (target ~${TARGET})\n`);
check('bank holds about 120 prompts', Math.abs(SURVEY_PROMPTS.length - TARGET) <= 2, `${SURVEY_PROMPTS.length}`);

// Per band spread, so the bank covers every climate of the climb.
const bands = [0, 0, 0, 0];
for (const prompt of SURVEY_PROMPTS) bands[prompt.band] += 1;
console.log(`band spread: 0:${bands[0]}  1:${bands[1]}  2:${bands[2]}  3:${bands[3]}`);
check('every band has at least 25 prompts', bands.every((count) => count >= 25), bands.join('/'));

// Identity: ids and prompts must be unique.
const ids = new Set<string>();
const texts = new Set<string>();
let duplicateIds = 0;
let duplicateTexts = 0;
for (const prompt of SURVEY_PROMPTS) {
  const key = normaliseAnswer(prompt.prompt);
  if (ids.has(prompt.id)) duplicateIds++;
  if (texts.has(key)) duplicateTexts++;
  ids.add(prompt.id);
  texts.add(key);
}
check('prompt ids are unique', duplicateIds === 0, `${duplicateIds} clash(es)`);
check('prompt texts are unique', duplicateTexts === 0, `${duplicateTexts} clash(es)`);

// Shape and weight spread.
const sizeHist: Record<number, number> = {};
let badSize = 0;
let badSum = 0;
let badOrder = 0;
let weakTop = 0;
let flatTop = 0;
let missingTail = 0;
let duplicateAnswer = 0;

for (const prompt of SURVEY_PROMPTS) {
  const n = prompt.answers.length;
  sizeHist[n] = (sizeHist[n] ?? 0) + 1;
  if (n < 14 || n > 16) badSize++;

  const sum = prompt.answers.reduce((total, answer) => total + answer.weight, 0);
  if (sum !== 100) badSum++;

  const weights = prompt.answers.map((answer) => answer.weight);
  if (weights.some((weight, i) => i > 0 && weight > weights[i - 1])) badOrder++;

  const top = weights[0];
  if (top < 15) weakTop++;
  if (weights[1] !== undefined && top - weights[1] < 2) flatTop++;
  if (weights.filter((weight) => weight <= 5).length < 3) missingTail++;

  const seen = new Set<string>();
  for (const answer of prompt.answers) {
    const key = normaliseAnswer(answer.text);
    if (seen.has(key)) duplicateAnswer++;
    seen.add(key);
    if (answer.weight < 1) weakTop++;
  }
}

console.log(`answers per prompt: ${JSON.stringify(sizeHist)}`);
check('every prompt has 14–16 answers', badSize === 0, `${badSize} off size`);
check('weights add up to 100', badSum === 0, `${badSum} prompt(s) off`);
check('weights descend from the top answer', badOrder === 0, `${badOrder} prompt(s) unsorted`);
check('top answer is a real lead', weakTop === 0 && flatTop === 0, `${weakTop} weak, ${flatTop} tied`);
check('each prompt has a tail for Lantern/Ember', missingTail === 0, `${missingTail} prompt(s) flat`);
check('no repeated answer inside a prompt', duplicateAnswer === 0, `${duplicateAnswer} repeat(s)`);

// Board reachability: nine places, then Lantern, then Ember.
const shortest = Math.min(...SURVEY_PROMPTS.map((prompt) => prompt.answers.length));
check('board can fill nine places', shortest >= BOARD_SIZE, `${shortest} shortest`);
check('off-board answers reach Lantern', tierForRank(BOARD_SIZE + 1) === 'lantern');
check('off-board answers reach Ember', tierForRank(BOARD_SIZE + 2) === 'ember');
check('a Moonrise is worth 100', tierForRank(1) === 'moonrise');

// Top answer of every prompt scores Moonrise in Common, the rarest in Rare.
let commonWrong = 0;
let rareWrong = 0;
for (const prompt of SURVEY_PROMPTS) {
  if (scoreFor('common', prompt, 0).points !== 100) commonWrong++;
  if (scoreFor('rare', prompt, prompt.answers.length - 1).points !== 100) rareWrong++;
  if (scoreFor('common', prompt, BOARD_SIZE).tier !== 'lantern') commonWrong++;
  if (scoreFor('common', prompt, BOARD_SIZE + 1).tier !== 'ember') commonWrong++;
}
check('Common tops the board with the most common answer', commonWrong === 0, `${commonWrong} wrong`);
check('Rare tops the board with the rarest answer', rareWrong === 0, `${rareWrong} wrong`);

// Daily is stable per day and identical for everyone.
const day = 20000;
const a = dailyPrompts(day, 'common').map((prompt) => prompt.id);
const b = dailyPrompts(day, 'common').map((prompt) => prompt.id);
const c = dailyPrompts(day + 1, 'common').map((prompt) => prompt.id);
check('daily deals seven prompts', a.length === PROMPTS_PER_DAY, `${a.length}`);
check('daily repeats the same seven for the same day', a.join('|') === b.join('|'));
check('daily moves on the next day', a.join('|') !== c.join('|'));
check('daily deals no prompt twice', new Set(a).size === a.length);

// Classic walks the whole bank before repeating anything.
let left: string[] = [];
const seen: string[] = [];
let runs = 0;
let shortDeal = 0;
while (seen.length < SURVEY_PROMPTS.length && runs < 40) {
  const dealt = classicDeck('common', left, 1000 + runs);
  if (dealt.prompts.length !== PROMPTS_PER_DAY) shortDeal++;
  seen.push(...dealt.prompts.map((prompt) => prompt.id));
  left = dealt.left;
  runs++;
}
const firstCycle = seen.slice(0, SURVEY_PROMPTS.length);
const uniqueSeen = new Set(firstCycle);
check('every classic deal holds seven prompts', shortDeal === 0, `${shortDeal} short`);
check(
  'classic deals the whole bank before repeating',
  uniqueSeen.size === SURVEY_PROMPTS.length,
  `${uniqueSeen.size}/${SURVEY_PROMPTS.length} unique in ${runs} runs`,
);

console.log('\n--- summary ---');
console.log(`prompts:            ${SURVEY_PROMPTS.length}`);
console.log(`answers per prompt: ${Math.min(...SURVEY_PROMPTS.map((p) => p.answers.length))}–${Math.max(...SURVEY_PROMPTS.map((p) => p.answers.length))}`);
console.log(`band spread:        ${bands.join(' / ')}`);
console.log(`classic runs to a repeat: ${runs}`);

if (failures > 0) {
  console.error(`\n${failures} prompt-bank problem(s)`);
  process.exit(1);
}
console.log('\nPrompt bank valid: size, weights, board, daily and classic all check out.');
