/**
 * Survey game content and scoring — pure, shared by the client and scripts.
 *
 * Each prompt is a small poll: the weight is the share of people who gave that
 * answer, so a guess can be judged against how common it was. Two games use the
 * same pool in opposite directions: Common rewards the obvious answer, Rare
 * rewards the one hardly anybody gives.
 */

import { hashSeed, mulberry32 } from './puzzle.ts';

export type SurveyMode = 'common' | 'rare';

export interface SurveyAnswer {
  text: string;
  /** share of answers, in percent */
  weight: number;
  aliases?: string[];
}

export interface SurveyPrompt {
  id: string;
  prompt: string;
  answers: SurveyAnswer[];
}

export const PROMPTS_PER_DAY = 7;
export const SECONDS_PER_PROMPT = 25;
/** A perfect run: seven top answers, 700 points, 14 km along the route. */
export const MAX_PER_PROMPT = 100;
export const ROUTE_KM = 14;

/**
 * A guess is placed on a board of nine answers and graded by where it lands.
 * Rank 1 is the best answer for the mode: the most common for Common, the
 * rarest for Rare. The names are the game's own weather.
 */
export type Tier = 'moonrise' | 'aurora' | 'starlit' | 'lantern' | 'lost';

export const TIERS: Record<Tier, { name: string; points: number; line: string }> = {
  moonrise: { name: 'Moonrise', points: 100, line: 'The answer at the very top of the board.' },
  aurora: { name: 'Aurora', points: 64, line: 'Right at the front of the crowd.' },
  starlit: { name: 'Starlit', points: 32, line: 'On the board, but further down it.' },
  lantern: { name: 'Lantern', points: 16, line: 'Someone said it. Hardly anyone.' },
  lost: { name: 'Lost', points: 0, line: 'Nobody on the board said that.' },
};

type Row = [text: string, weight: number, aliases?: string[]];

function build(prompt: string, rows: Row[]): SurveyPrompt {
  return {
    id: prompt
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48),
    prompt,
    answers: rows.map(([text, weight, aliases]) => ({ text, weight, aliases })),
  };
}

export const SURVEY_PROMPTS: SurveyPrompt[] = [
  build('Something you always forget to pack', [
    ['Charger', 27, ['phone charger', 'charging cable', 'charger cable']],
    ['Toothbrush', 19, ['tooth brush', 'brush']],
    ['Socks', 12, ['sock', 'pair of socks']],
    ['Sunscreen', 9, ['sun cream', 'sunblock', 'spf']],
    ['Passport', 8],
    ['Razor', 7],
    ['Towel', 5],
    ['Pyjamas', 4, ['pajamas']],
    ['Headphones', 3],
  ]),
  build('A food that tastes better cold', [
    ['Pizza', 26, ['leftover pizza']],
    ['Fried chicken', 12, ['chicken']],
    ['Cake', 11],
    ['Pasta', 10],
    ['Soup', 8],
    ['Coffee', 6],
    ['Rice', 5],
    ['Fries', 5, ['chips']],
    ['Chocolate', 4],
  ]),
  build('Something you would find in a hotel room', [
    ['Towel', 21],
    ['Bible', 15],
    ['Kettle', 13],
    ['TV', 12, ['television']],
    ['Minibar', 10, ['mini bar', 'fridge']],
    ['Iron', 8, ['ironing board']],
    ['Slippers', 6],
    ['Hairdryer', 6, ['hair dryer']],
    ['Remote', 4, ['remote control']],
  ]),
  build('A reason to leave a party early', [
    ['Tired', 24],
    ['Work tomorrow', 19, ['work', 'early start']],
    ['Headache', 12],
    ['Bored', 11, ['boring']],
    ['Babysitter', 8, ['kids', 'childcare']],
    ['Argument', 7, ['fight']],
    ['Other plans', 5],
    ['Hungry', 4, ['hangry']],
  ]),
  build('Something in a junk drawer', [
    ['Batteries', 23, ['battery']],
    ['Scissors', 18],
    ['Tape', 14, ['duct tape', 'sticky tape']],
    ['Pens', 12, ['pen', 'pencils']],
    ['Keys', 9, ['key']],
    ['String', 7, ['rubber bands', 'elastic bands']],
    ['Takeaway menu', 6, ['menus', 'flyers']],
    ['Glue', 4],
  ]),
  build('A sound that wakes you up', [
    ['Alarm', 38, ['alarm clock']],
    ['Dog', 14, ['barking']],
    ['Baby', 12, ['crying']],
    ['Traffic', 9, ['cars']],
    ['Neighbour', 8, ['neighbor', 'neighbours']],
    ['Rain', 6],
    ['Phone', 5, ['notification']],
    ['Bird', 4, ['birds']],
  ]),
  build('Something people do when they are nervous', [
    ['Bite nails', 26, ['nail biting']],
    ['Pace', 18, ['walk up and down']],
    ['Fidget', 13, ['shake leg']],
    ['Sweat', 11],
    ['Talk fast', 9, ['ramble']],
    ['Laugh', 7],
    ['Check phone', 6],
    ['Tap foot', 5],
  ]),
  build('A topping that ruins a pizza', [
    ['Pineapple', 34],
    ['Anchovy', 21, ['anchovies']],
    ['Olives', 13],
    ['Tuna', 8],
    ['Broccoli', 6],
    ['Corn', 5],
    ['Artichoke', 3],
    ['Egg', 3],
  ]),
  build('Something you would never lend a friend', [
    ['Car', 24],
    ['Toothbrush', 18, ['tooth brush']],
    ['Phone', 16],
    ['Money', 12, ['cash']],
    ['Laptop', 9, ['computer']],
    ['Clothes', 7],
    ['Headphones', 5],
    ['Bike', 3, ['bicycle']],
  ]),
  build('A place people go to be alone', [
    ['Bathroom', 22, ['toilet']],
    ['Park', 16],
    ['Bedroom', 15, ['room']],
    ['Beach', 10],
    ['Forest', 9, ['woods']],
    ['Car', 8],
    ['Library', 7],
    ['Shower', 5],
  ]),
  build('Something you keep buying but never finish', [
    ['Milk', 20],
    ['Bread', 18],
    ['Shampoo', 14],
    ['Notebook', 10],
    ['Spices', 9],
    ['Candles', 8, ['candle']],
    ['Pens', 7, ['pen']],
    ['Chips', 5, ['crisps']],
  ]),
  build('A word you always misspell', [
    ['Necessary', 22],
    ['Definitely', 18],
    ['Separate', 14],
    ['Restaurant', 11],
    ['Tomorrow', 9],
    ['Believe', 8],
    ['Beautiful', 7],
    ['Receive', 6],
  ]),
  build('Something that is always in a car', [
    ['Charger', 18, ['phone charger', 'cable']],
    ['Spare tyre', 17, ['spare tire', 'wheel']],
    ['Water bottle', 13, ['water']],
    ['Sunglasses', 11],
    ['Coins', 9, ['change']],
    ['Umbrella', 8],
    ['Tissues', 7],
    ['Jumper', 5, ['jacket', 'sweater']],
  ]),
  build('A chore people put off', [
    ['Ironing', 24, ['iron']],
    ['Dishes', 19, ['washing up']],
    ['Laundry', 14, ['washing']],
    ['Cleaning the bathroom', 11, ['toilet']],
    ['Taxes', 9],
    ['Dusting', 7],
    ['Mowing', 6, ['lawn']],
    ['Folding clothes', 5, ['folding']],
  ]),
  build('Something you only see at a wedding', [
    ['Cake', 24],
    ['Bride', 18],
    ['Rings', 14, ['ring']],
    ['Dancing', 12],
    ['Speech', 9, ['speeches']],
    ['Flowers', 8],
    ['Wedding dress', 7, ['dress']],
    ['Tears', 4, ['crying']],
  ]),
  build('An excuse for being late', [
    ['Traffic', 32],
    ['Alarm', 20, ['slept in', 'overslept']],
    ['Bus', 12, ['public transport', 'train']],
    ['Parking', 9],
    ['Kids', 8, ['children']],
    ['Weather', 6, ['rain']],
    ['Lost track of time', 5],
    ['Dog', 3],
  ]),
  build('Something with a screen', [
    ['Phone', 30, ['mobile']],
    ['TV', 22, ['television']],
    ['Laptop', 14, ['computer']],
    ['Tablet', 10, ['ipad']],
    ['Watch', 8, ['smartwatch']],
    ['Microwave', 5],
    ['Car', 4],
    ['Cinema', 3, ['movie theatre']],
  ]),
  build('A smell that reminds you of childhood', [
    ['Sunscreen', 18, ['sun cream']],
    ['Cut grass', 16, ['freshly cut grass', 'grass']],
    ['Baking', 15, ['cookies', 'cake']],
    ['Petrol', 10, ['gasoline']],
    ['Chlorine', 9, ['pool']],
    ['Crayons', 8],
    ['Rain', 7],
    ['Soap', 5],
  ]),
  build('Something you do at the airport', [
    ['Wait', 26, ['waiting']],
    ['Security', 20, ['check security']],
    ['Eat', 12, ['food']],
    ['Shop', 10, ['duty free']],
    ['Sleep', 8],
    ['Run', 7, ['rush']],
    ['Check in', 6],
    ['Cry', 4],
  ]),
  build('A food you eat with your hands', [
    ['Pizza', 24],
    ['Chips', 17, ['fries']],
    ['Burger', 15],
    ['Sandwich', 10],
    ['Wings', 9, ['chicken wings']],
    ['Fruit', 8, ['apple', 'banana']],
    ['Sushi', 6],
    ['Popcorn', 5],
  ]),
  build('Something on a bucket list', [
    ['Travel', 30, ['travel the world', 'travelling']],
    ['Skydive', 18, ['skydiving']],
    ['Northern lights', 12, ['aurora']],
    ['Learn a language', 10],
    ['Write a book', 8],
    ['Run a marathon', 7],
    ['Buy a house', 6],
    ['Swim with dolphins', 5],
  ]),
  build('Something that is always cold', [
    ['Ice', 20],
    ['Fridge', 18],
    ['Freezer', 15],
    ['Winter', 10],
    ['Water', 9, ['cold water']],
    ['Beer', 8],
    ['Snow', 7],
    ['Hands', 5],
  ]),
  build('Something people collect', [
    ['Stamps', 20, ['stamp']],
    ['Coins', 18, ['coin']],
    ['Cards', 14, ['trading cards']],
    ['Shoes', 10, ['trainers', 'sneakers']],
    ['Books', 9, ['book']],
    ['Mugs', 8, ['cups']],
    ['Records', 7, ['vinyl']],
    ['Keychains', 5, ['keyrings']],
  ]),
  build('A show almost everyone has seen', [
    ['Friends', 22],
    ['The Office', 18],
    ['Game of Thrones', 15],
    ['Breaking Bad', 11],
    ['Stranger Things', 10],
    ['The Simpsons', 8],
    ['Squid Game', 7],
    ['SpongeBob', 5],
  ]),
  build('Something in a first-aid kit', [
    ['Plasters', 28, ['band aids', 'band-aids', 'bandages']],
    ['Bandage', 18],
    ['Painkillers', 15, ['paracetamol', 'aspirin']],
    ['Scissors', 9],
    ['Antiseptic', 8, ['disinfectant']],
    ['Gloves', 7],
    ['Tape', 6],
    ['Thermometer', 5],
  ]),
  build('A reason to move to a new city', [
    ['Job', 32, ['work']],
    ['Love', 18, ['partner']],
    ['Study', 13, ['university']],
    ['Cheaper', 10, ['cost of living']],
    ['Family', 9],
    ['Weather', 7],
    ['Adventure', 6],
    ['Noise', 3, ['quiet']],
  ]),
  build('Something you regret buying', [
    ['Clothes', 20],
    ['Gym membership', 18, ['gym']],
    ['Gadget', 14, ['gadgets']],
    ['Shoes', 11],
    ['Subscription', 9],
    ['Book', 8],
    ['Plant', 7],
    ['Diet', 5, ['diet food']],
  ]),
  build('A game you can play with no equipment', [
    ['Tag', 22, ['it']],
    ['Hide and seek', 18],
    ['20 questions', 14, ['twenty questions']],
    ['Charades', 12],
    ['Truth or dare', 10],
    ['I spy', 9],
    ['Rock paper scissors', 8],
    ['Staring contest', 4],
  ]),
  build('Something that breaks easily', [
    ['Glass', 24],
    ['Phone screen', 20, ['screen']],
    ['Egg', 14],
    ['Mirror', 9],
    ['Headphones', 8],
    ['Plate', 6],
    ['Toy', 5],
    ['Charger cable', 5, ['cable']],
  ]),
  build('Something you can hear at night', [
    ['Crickets', 20, ['insects']],
    ['Traffic', 16, ['cars']],
    ['Fridge', 12],
    ['Snoring', 11, ['snore']],
    ['Dog', 9, ['barking']],
    ['Wind', 8],
    ['Clock', 7, ['ticking']],
    ['Neighbours', 6, ['neighbors']],
  ]),
  build('A fruit that is hard to open', [
    ['Pineapple', 30],
    ['Coconut', 24],
    ['Pomegranate', 15],
    ['Mango', 10],
    ['Durian', 7],
    ['Melon', 6],
    ['Kiwi', 4],
    ['Orange', 3],
  ]),
  build('Something everyone lies about', [
    ['Age', 20],
    ['How they are', 18, ['being fine', 'feelings', 'i am fine']],
    ['Salary', 15, ['income', 'pay']],
    ['Reading the terms', 10, ['terms and conditions']],
    ['Going to the gym', 9, ['gym']],
    ['Their diet', 8, ['diet']],
    ['Their height', 6],
    ['Having read the book', 6],
  ]),
];

/** Stable key for comparing a guess with an answer, tolerant of plurals. */
export function normaliseAnswer(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\b(a|an|the|some)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/s$/, '');
}

/** The best matching answer index for a guess, or null when nobody said it. */
export function matchAnswer(prompt: SurveyPrompt, raw: string): number | null {
  const guess = normaliseAnswer(raw);
  if (!guess) return null;

  const forms = (answer: SurveyAnswer): string[] =>
    [answer.text, ...(answer.aliases ?? [])].map(normaliseAnswer);

  for (let i = 0; i < prompt.answers.length; i++) {
    if (forms(prompt.answers[i]).includes(guess)) return i;
  }
  for (let i = 0; i < prompt.answers.length; i++) {
    if (forms(prompt.answers[i]).some((f) => f.length > 3 && (f.includes(guess) || guess.includes(f)))) {
      return i;
    }
  }
  return null;
}

/** Where a guess lands on the board: 1 is the best answer for the mode. */
export function rankFor(mode: SurveyMode, prompt: SurveyPrompt, index: number): number {
  return mode === 'common' ? index + 1 : prompt.answers.length - index;
}

export function tierForRank(rank: number): Tier {
  if (rank <= 1) return 'moonrise';
  if (rank <= 3) return 'aurora';
  if (rank <= 6) return 'starlit';
  if (rank <= 9) return 'lantern';
  return 'lost';
}

/** Board position, tier and points for an answer index. */
export function scoreFor(
  mode: SurveyMode,
  prompt: SurveyPrompt,
  index: number,
): { rank: number; tier: Tier; points: number } {
  const rank = rankFor(mode, prompt, index);
  const tier = tierForRank(rank);
  return { rank, tier, points: TIERS[tier].points };
}

export function maxPointsFor(_mode: SurveyMode, _prompt?: SurveyPrompt): number {
  return MAX_PER_PROMPT;
}

/** Today's five prompts, the same for everyone, in a stable shuffled order. */
export function dailyPrompts(day: number, mode: SurveyMode, count = PROMPTS_PER_DAY): SurveyPrompt[] {
  const rng = mulberry32(hashSeed(`noct-survey-${mode}-${day}`));
  const pool = SURVEY_PROMPTS.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const swap = pool[i];
    pool[i] = pool[j];
    pool[j] = swap;
  }
  return pool.slice(0, count);
}

/** Share of respondents who gave the top answer — used in results copy. */
export function topShare(prompt: SurveyPrompt): number {
  return Math.max(...prompt.answers.map((a) => a.weight));
}
