/**
 * The Word Well — five letters, six guesses, one well per night.
 *
 * Pure rules: no storage, no React. The screen owns the day's state, the well
 * only says which letters landed where and which keys are spent.
 */
import { hashSeed } from './rng.ts';

export const WORD_LENGTH = 5;
export const MAX_GUESSES = 6;

/** Answers are common words, so the nightly well is fair to a tired player. */
const ANSWER_WORDS: readonly string[] = [
  'about', 'above', 'actor', 'adopt', 'adult', 'after', 'again', 'agent', 'agree', 'ahead',
  'alarm', 'album', 'alert', 'alike', 'alive', 'allow', 'alone', 'along', 'alter', 'among',
  'anger', 'angle', 'ankle', 'apart', 'apple', 'apply', 'arena', 'argue', 'arise', 'arrow',
  'aside', 'asset', 'atlas', 'audio', 'avoid', 'awake', 'award', 'aware', 'badge', 'baker',
  'basic', 'basin', 'batch', 'beach', 'beard', 'beast', 'begin', 'being', 'belly', 'below',
  'bench', 'berry', 'birth', 'black', 'blade', 'blame', 'blank', 'blast', 'blaze', 'bleak',
  'blend', 'bless', 'blind', 'block', 'blood', 'bloom', 'board', 'boost', 'booth', 'bound',
  'brain', 'brand', 'brass', 'brave', 'bread', 'break', 'breed', 'brick', 'bride', 'brief',
  'bring', 'brisk', 'broad', 'broke', 'brown', 'brush', 'build', 'bunch', 'burst', 'cabin',
  'cable', 'camel', 'candy', 'canoe', 'cargo', 'carve', 'catch', 'cause', 'cedar', 'chain',
  'chair', 'chalk', 'charm', 'chart', 'chase', 'cheap', 'check', 'cheek', 'chess', 'chest',
  'chief', 'child', 'choir', 'cider', 'claim', 'clash', 'class', 'clean', 'clear', 'clerk',
  'click', 'cliff', 'climb', 'clock', 'close', 'cloth', 'cloud', 'clown', 'coach', 'coast',
  'cocoa', 'color', 'comet', 'coral', 'couch', 'cough', 'count', 'court', 'cover', 'crack',
  'craft', 'crane', 'crash', 'crate', 'crawl', 'cream', 'creek', 'crest', 'crime', 'crisp',
  'cross', 'crowd', 'crown', 'crumb', 'crush', 'curve', 'cycle', 'daily', 'dairy', 'daisy',
  'dance', 'death', 'debut', 'decay', 'delay', 'delta', 'dense', 'depth', 'derby', 'diary',
  'digit', 'dirty', 'disco', 'ditch', 'diver', 'dodge', 'donor', 'doubt', 'dough', 'dozen',
  'draft', 'drain', 'drama', 'drape', 'drawn', 'dread', 'dream', 'dress', 'drift', 'drill',
  'drink', 'drive', 'drone', 'drove', 'drown', 'dwarf', 'dwell', 'eager', 'eagle', 'early',
  'earth', 'easel', 'ebony', 'eight', 'elbow', 'elder', 'elect', 'elite', 'email', 'ember',
  'empty', 'enemy', 'enjoy', 'enter', 'entry', 'equal', 'equip', 'erase', 'error', 'essay',
  'ethic', 'evade', 'event', 'every', 'exact', 'exile', 'exist', 'extra', 'fable', 'facet',
  'fairy', 'faith', 'false', 'fancy', 'fatal', 'fault', 'favor', 'feast', 'fence', 'ferry',
  'fetch', 'fever', 'fiber', 'field', 'fiery', 'fifth', 'fifty', 'fight', 'final', 'first',
  'flame', 'flash', 'fleet', 'flesh', 'flint', 'float', 'flock', 'flood', 'floor', 'flour',
  'fluid', 'flush', 'flute', 'focus', 'force', 'forge', 'forth', 'forty', 'forum', 'found',
  'frame', 'fresh', 'front', 'frost', 'fruit', 'funny', 'gauge', 'ghost', 'giant', 'given',
  'giver', 'glass', 'gleam', 'glide', 'globe', 'glory', 'glove', 'grace', 'grade', 'grain',
  'grand', 'grant', 'grape', 'graph', 'grasp', 'grass', 'grave', 'gravy', 'graze', 'great',
  'greed', 'green', 'greet', 'grief', 'grill', 'grind', 'groan', 'groom', 'group', 'grove',
  'grown', 'guard', 'guess', 'guest', 'guide', 'guild', 'guilt', 'habit', 'handy', 'happy',
  'harbor', 'harsh', 'haste', 'hasty', 'hatch', 'haunt', 'haven', 'heart', 'heavy', 'hedge',
  'hello', 'hence', 'hobby', 'holly', 'honey', 'honor', 'horse', 'hotel', 'hound', 'house',
  'hover', 'human', 'humid', 'humor', 'hurry', 'ideal', 'image', 'imply', 'index', 'inner',
  'input', 'irony', 'issue', 'ivory', 'jelly', 'jewel', 'joint', 'jolly', 'judge', 'juice',
  'knack', 'kneel', 'knife', 'knock', 'known', 'label', 'labor', 'ladder', 'lagoon', 'lance',
  'large', 'laser', 'latch', 'later', 'laugh', 'layer', 'learn', 'lease', 'least', 'leave',
  'ledge', 'legal', 'lemon', 'level', 'lever', 'light', 'lilac', 'limit', 'linen', 'liner',
  'liver', 'lobby', 'local', 'lodge', 'logic', 'loose', 'lorry', 'loser', 'lower', 'loyal',
  'lucky', 'lunar', 'lunch', 'lyric', 'magic', 'major', 'maker', 'mango', 'maple', 'march',
  'marsh', 'match', 'maybe', 'mayor', 'meant', 'medal', 'media', 'melon', 'mercy', 'merge',
  'merit', 'merry', 'metal', 'meter', 'might', 'mimic', 'miner', 'minor', 'minus', 'mixed',
  'model', 'moist', 'money', 'month', 'moral', 'motor', 'mound', 'mount', 'mourn', 'mouse',
  'mouth', 'movie', 'mower', 'muddy', 'music', 'naive', 'naked', 'nasty', 'naval', 'needy',
  'nerve', 'never', 'newly', 'night', 'noble', 'noise', 'north', 'notch', 'noted', 'novel',
  'nurse', 'nylon', 'oasis', 'occur', 'ocean', 'offer', 'often', 'olive', 'onion', 'onset',
  'opera', 'orbit', 'order', 'organ', 'other', 'otter', 'ought', 'ounce', 'outer', 'owner',
  'oxide', 'ozone', 'paint', 'panel', 'panic', 'paper', 'party', 'pasta', 'patch', 'patio',
  'pause', 'peace', 'peach', 'pearl', 'pedal', 'penny', 'perch', 'phase', 'phone', 'photo',
  'piano', 'piece', 'pilot', 'pinch', 'pitch', 'pixel', 'pizza', 'place', 'plain', 'plane',
  'plant', 'plate', 'plaza', 'plead', 'pluck', 'point', 'polar', 'porch', 'pound', 'power',
  'press', 'price', 'pride', 'prime', 'print', 'prior', 'prize', 'probe', 'prone', 'proof',
  'proud', 'prove', 'prune', 'pulse', 'punch', 'pupil', 'purse', 'quake', 'queen', 'query',
  'quest', 'quick', 'quiet', 'quill', 'quilt', 'quirk', 'quite', 'quota', 'quote', 'radar',
  'radio', 'raise', 'rally', 'ranch', 'range', 'rapid', 'ratio', 'raven', 'reach', 'react',
  'ready', 'realm', 'rebel', 'refer', 'reign', 'relax', 'relay', 'renew', 'repay', 'reply',
  'reset', 'resin', 'rhino', 'rhyme', 'rider', 'ridge', 'rifle', 'right', 'rigid', 'rinse',
  'ripen', 'risen', 'risky', 'rival', 'river', 'roast', 'robin', 'robot', 'rocky', 'rogue',
  'roost', 'rotor', 'rough', 'round', 'route', 'royal', 'rugby', 'ruler', 'rumor', 'rural',
  'rusty', 'saint', 'salad', 'salon', 'salsa', 'salty', 'sandy', 'satin', 'sauce', 'sauna',
  'scale', 'scalp', 'scare', 'scarf', 'scene', 'scent', 'scope', 'score', 'scout', 'scrap',
  'screw', 'scrub', 'sedan', 'seize', 'sense', 'serve', 'seven', 'shade', 'shady', 'shaft',
  'shake', 'shall', 'shame', 'shape', 'share', 'shark', 'sharp', 'shave', 'sheep', 'sheet',
  'shelf', 'shell', 'shift', 'shine', 'shiny', 'shirt', 'shock', 'shore', 'short', 'shout',
  'shown', 'shrub', 'shrug', 'sight', 'silent', 'silly', 'since', 'siren', 'sixth', 'sixty',
  'skate', 'skill', 'skirt', 'slate', 'sleep', 'sleet', 'slice', 'slide', 'slope', 'small',
  'smart', 'smash', 'smell', 'smile', 'smoke', 'snack', 'snake', 'sneak', 'sniff', 'snowy',
  'solar', 'solid', 'solve', 'sonic', 'sorry', 'sound', 'south', 'space', 'spare', 'spark',
  'speak', 'spear', 'speed', 'spell', 'spend', 'spent', 'spice', 'spike', 'spill', 'spine',
  'spirit', 'split', 'spoke', 'spoon', 'sport', 'spray', 'spring', 'sprout', 'squad', 'stack',
  'staff', 'stage', 'stain', 'stair', 'stake', 'stale', 'stalk', 'stall', 'stamp', 'stand',
  'stare', 'start', 'state', 'steak', 'steal', 'steam', 'steel', 'steep', 'steer', 'stern',
  'stick', 'stiff', 'still', 'sting', 'stock', 'stole', 'stone', 'stool', 'store', 'storm',
  'story', 'stove', 'strap', 'straw', 'stray', 'strip', 'stuck', 'study', 'stuff', 'stump',
  'style', 'sugar', 'suite', 'sunny', 'super', 'surge', 'sushi', 'swamp', 'swarm', 'swear',
  'sweat', 'sweep', 'sweet', 'swell', 'swept', 'swift', 'swing', 'sword', 'table', 'taken',
  'tally', 'tango', 'taste', 'teach', 'tempo', 'tenor', 'tense', 'tenth', 'thank', 'theft',
  'their', 'theme', 'there', 'these', 'thick', 'thief', 'thigh', 'thing', 'think', 'third',
  'thorn', 'those', 'three', 'threw', 'throw', 'thumb', 'tidal', 'tiger', 'tight', 'timer',
  'tired', 'title', 'toast', 'today', 'token', 'tonic', 'tooth', 'topic', 'torch', 'total',
  'touch', 'tough', 'tower', 'toxic', 'trace', 'track', 'trade', 'trail', 'train', 'trait',
  'trash', 'treat', 'trend', 'trial', 'tribe', 'trick', 'tried', 'troop', 'trout', 'truce',
  'truck', 'truly', 'trunk', 'trust', 'truth', 'tulip', 'tutor', 'twice', 'twist', 'ultra',
  'uncle', 'under', 'union', 'unite', 'unity', 'until', 'upper', 'upset', 'urban', 'usage',
  'usual', 'vague', 'valid', 'value', 'valve', 'vapor', 'vault', 'venue', 'verse', 'video',
  'vigor', 'villa', 'vinyl', 'viral', 'virus', 'visit', 'vital', 'vivid', 'vocal', 'voice',
  'voter', 'wagon', 'waist', 'waltz', 'waste', 'watch', 'water', 'weary', 'weave', 'wedge',
  'weigh', 'weird', 'whale', 'wheat', 'wheel', 'where', 'which', 'while', 'whisk', 'white',
  'whole', 'widen', 'widow', 'width', 'wield', 'windy', 'witch', 'woman', 'women', 'world',
  'worry', 'worse', 'worst', 'worth', 'would', 'wound', 'woven', 'wrist', 'write', 'wrong',
  'wrote', 'yacht', 'yeast', 'yield', 'young', 'youth', 'zebra', 'zesty',
];

/** Only five-letter words survive the source list above; duplicates collapse. */
export const WORD_ANSWERS: readonly string[] = [
  ...new Set(ANSWER_WORDS.filter((word) => word.length === WORD_LENGTH)),
];

/** A few extra legal guesses that are not answers, so the well does not feel scripted. */
const EXTRA_WORDS: readonly string[] = [
  'abbey', 'acorn', 'adept', 'adore', 'aegis', 'agile', 'aisle', 'alder', 'amber', 'amuse',
  'angel', 'anvil', 'apron', 'arbor', 'ardor', 'aroma', 'ascot', 'aster', 'attic', 'azure',
  'bagel', 'baker', 'balmy', 'banjo', 'barge', 'baron', 'basil', 'bayou', 'beady', 'beech',
  'befit', 'begun', 'beige', 'belch', 'bicep', 'bilge', 'birch', 'bison', 'blimp', 'bliss',
  'bloat', 'blond', 'blurb', 'bogus', 'bonus', 'borax', 'bossy', 'botch', 'bough', 'boxer',
  'brawl', 'brawn', 'bribe', 'brine', 'broil', 'bronc', 'brook', 'broom', 'broth', 'brunt',
  'buddy', 'buggy', 'bugle', 'bulge', 'bully', 'bunny', 'burly', 'bushy', 'butte', 'buyer',
  'cacao', 'cadet', 'cagey', 'cairn', 'camel', 'cameo', 'canny', 'caper', 'carat', 'caste',
  'cater', 'cavil', 'chafe', 'chant', 'chaos', 'chime', 'chirp', 'chock', 'chord', 'chunk',
  'churn', 'cider', 'cigar', 'cinch', 'civic', 'clamp', 'clang', 'clasp', 'cleat', 'clerk',
  'cloak', 'clump', 'clung', 'cobra', 'colon', 'comma', 'conch', 'corny', 'coven', 'covet',
  'cozy', 'crave', 'creak', 'creed', 'crepe', 'cress', 'croak', 'crock', 'crone', 'crook',
  'croup', 'crust', 'cubic', 'cumin', 'curly', 'curry', 'curse', 'curve', 'cynic', 'datom',
  'dealt', 'debit', 'decal', 'decoy', 'deign', 'deity', 'demon', 'denim', 'depot', 'derby',
  'deter', 'dhole', 'dicey', 'dimly', 'dingo', 'dingy', 'diode', 'dirge', 'disco', 'ditto',
  'divot', 'dizzy', 'dogma', 'doily', 'dolly', 'donut', 'dopey', 'dowdy', 'dowel', 'downy',
  'drape', 'drawl', 'drier', 'druid', 'drunk', 'dryer', 'duchy', 'dully', 'dumpy', 'dunce',
  'dusky', 'dusty', 'dutch', 'duvet', 'dwell', 'elegy', 'elfin', 'elope', 'elude', 'embed',
  'ember', 'emcee', 'emote', 'enact', 'endow', 'ennui', 'ensue', 'epoxy', 'equip', 'erupt',
  'ether', 'ethos', 'evict', 'exalt', 'excel', 'exert', 'expat', 'expel', 'extol', 'exude',
  'exult', 'fable', 'facet', 'faint', 'fairy', 'fakir', 'fancy', 'farce', 'fatty', 'fauna',
  'feign', 'fella', 'felon', 'femur', 'feral', 'ferry', 'fetal', 'fetid', 'fetus', 'fibre',
  'fiche', 'fiend', 'filch', 'filet', 'filly', 'filmy', 'filth', 'finch', 'firth', 'fishy',
  'fixer', 'fizzy', 'flail', 'flair', 'flake', 'flaky', 'flank', 'flare', 'flask', 'fleck',
  'fleet', 'flick', 'flier', 'fling', 'flint', 'flirt', 'flora', 'floss', 'flout', 'fluff',
  'fluke', 'flume', 'flung', 'flunk', 'flute', 'flyer', 'foamy', 'foray', 'forge', 'forgo',
  'forte', 'fount', 'foyer', 'frail', 'frank', 'fraud', 'freak', 'freed', 'friar', 'frill',
  'frisk', 'frock', 'frond', 'frown', 'fugue', 'fungi', 'funky', 'furl', 'furor', 'fussy',
  'fuzzy', 'gaffe', 'gaily', 'gamma', 'gamut', 'gassy', 'gaudy', 'gauge', 'gavel', 'gawky',
  'gecko', 'geeky', 'genie', 'genre', 'ghoul', 'giddy', 'girth', 'given', 'gizmo', 'glade',
  'gland', 'glare', 'glass', 'glaze', 'gleam', 'glide', 'glint', 'gloat', 'gloom', 'gloss',
  'glove', 'glyph', 'gnash', 'gnome', 'godly', 'golem', 'golly', 'goner', 'goody', 'gooey',
  'goofy', 'goose', 'gorge', 'gouge', 'gourd', 'grace', 'grail', 'grate', 'gravel', 'graze',
  'greed', 'greet', 'grill', 'grime', 'grind', 'gripe', 'groin', 'groom', 'grope', 'grout',
  'grove', 'growl', 'grunt', 'guava', 'guild', 'guile', 'guise', 'gulch', 'gully', 'gumbo',
  'gummy', 'guppy', 'gusto', 'gusty', 'gypsy', 'habit', 'hairy', 'halve', 'hardy', 'harem',
  'harpy', 'haute', 'haven', 'havoc', 'heady', 'heard', 'heart', 'heath', 'heave', 'heavy',
  'hedge', 'hefty', 'heist', 'helix', 'heron', 'hilly', 'hinge', 'hippo', 'hitch', 'hoard',
  'hobby', 'hoist', 'holly', 'homer', 'honey', 'honor', 'hoody', 'hooey', 'hooky', 'hoped',
  'horde', 'horny', 'horse', 'hotel', 'hotly', 'hound', 'hovel', 'hover', 'howdy', 'human',
  'humid', 'humor', 'hunch', 'hunky', 'hurry', 'husky', 'hussy', 'hutch', 'hydro', 'hyena',
];

export const WORD_EXTRA_GUESSES: readonly string[] = [
  ...new Set(EXTRA_WORDS.filter((word) => word.length === WORD_LENGTH)),
];

const ANSWERS = [...WORD_ANSWERS];
const ALLOWED = new Set(
  [...ANSWERS, ...WORD_EXTRA_GUESSES.filter((word) => word.length === WORD_LENGTH)].map((word) =>
    word.toUpperCase(),
  ),
);

export type LetterState = 'hit' | 'near' | 'miss';

export function isAllowedWord(raw: string): boolean {
  return ALLOWED.has(raw.trim().toUpperCase());
}

/** The day's word. Same for every player, and never the same two nights running. */
export function dailyWord(day: number): string {
  const index = hashSeed('word-well', Math.max(1, day)) % ANSWERS.length;
  return ANSWERS[index].toUpperCase();
}

/** A fresh word outside the daily, used by Free play. */
export function freeWord(seed: number): string {
  return ANSWERS[hashSeed('word-well-free', seed) % ANSWERS.length].toUpperCase();
}

/**
 * Grade a guess. Repeats are spent left to right: a letter only counts as
 * "near" while the answer still has an unused copy of it.
 */
export function evaluateGuess(guess: string, answer: string): LetterState[] {
  const g = guess.toUpperCase().split('');
  const a = answer.toUpperCase().split('');
  const out: LetterState[] = g.map(() => 'miss');
  const left = a.slice();

  for (let i = 0; i < g.length; i++) {
    if (g[i] === a[i]) {
      out[i] = 'hit';
      left[i] = '';
    }
  }
  for (let i = 0; i < g.length; i++) {
    if (out[i] === 'hit') continue;
    const found = left.indexOf(g[i]);
    if (found !== -1) {
      out[i] = 'near';
      left[found] = '';
    }
  }
  return out;
}

/** Best-known state per key: a hit outranks a near, which outranks a miss. */
export function keyboardState(guesses: readonly string[], answer: string): Record<string, LetterState> {
  const rank: Record<LetterState, number> = { miss: 0, near: 1, hit: 2 };
  const map: Record<string, LetterState> = {};
  for (const guess of guesses) {
    const states = evaluateGuess(guess, answer);
    guess
      .toUpperCase()
      .split('')
      .forEach((letter, index) => {
        const state = states[index];
        if (!map[letter] || rank[state] > rank[map[letter]]) map[letter] = state;
      });
  }
  return map;
}

export const KEYBOARD_ROWS: readonly string[] = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

export function shareGrid(guesses: readonly string[], answer: string): string {
  return guesses
    .map((guess) =>
      evaluateGuess(guess, answer)
        .map((state) => (state === 'hit' ? '🟩' : state === 'near' ? '🟨' : '⬛'))
        .join(''),
    )
    .join('\n');
}
