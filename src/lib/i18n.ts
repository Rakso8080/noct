import { useCallback, useSyncExternalStore } from 'react';

/**
 * Two languages, English as the key. A missing Norwegian entry simply falls
 * back to the English sentence, so the app is never half-rendered.
 */

export type Lang = 'en' | 'nb';

const KEY = 'noct.lang.v1';
const listeners = new Set<() => void>();

function detect(): Lang {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === 'nb' || stored === 'en') return stored;
  } catch {
    /* private mode */
  }
  const nav = typeof navigator === 'undefined' ? '' : navigator.language.toLowerCase();
  return nav.startsWith('nb') || nav.startsWith('nn') || nav.startsWith('no') ? 'nb' : 'en';
}

let current: Lang = detect();

function applyDocumentLang(lang: Lang): void {
  if (typeof document !== 'undefined') document.documentElement.lang = lang === 'nb' ? 'nb' : 'en';
}

applyDocumentLang(current);

export function getLang(): Lang {
  return current;
}

export function setLang(next: Lang): void {
  if (next === current) return;
  current = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* private mode */
  }
  applyDocumentLang(next);
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useLang(): Lang {
  return useSyncExternalStore(subscribe, getLang, getLang);
}

export function translate(key: string, vars?: Record<string, string | number>): string {
  const template = current === 'nb' ? NB[key] ?? key : key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`));
}

export function useT(): (key: string, vars?: Record<string, string | number>) => string {
  const lang = useLang();
  return useCallback((key: string, vars?: Record<string, string | number>) => {
    void lang;
    return translate(key, vars);
  }, [lang]);
}

const NB: Record<string, string> = {
  // ---- chrome
  Menu: 'Meny',
  Common: 'Vanlig',
  Rare: 'Sjelden',
  Chess: 'Sjakk',
  Arcade: 'Arkade',
  Stats: 'Statistikk',
  More: 'Mer',
  'All boards': 'Alle brett',
  'Main': 'Hovedmeny',
  Settings: 'Innstillinger',
  'How to play': 'Slik spiller du',
  'Your data': 'Dine data',
  'A new board every day at 00:00 UTC.': 'Et nytt brett hver dag kl. 00:00 UTC.',
  'Nothing here': 'Ingenting her',
  'That address does not match a board. The daily is at the front.':
    'Den adressen stemmer ikke med et brett. Dagens brett ligger foran.',
  'Back to today': 'Tilbake til i dag',
  'Opening the table': 'Åpner bordet',
  'One moment — the board is on its way.': 'Et øyeblikk — brettet er på vei.',
  'Slow night': 'Treg natt',
  'That table did not load': 'Bordet lastet ikke',
  'A piece of the app failed to arrive. Reloading usually brings it back.':
    'En del av appen kom ikke frem. En ny innlasting pleier å hjelpe.',
  Reload: 'Last inn på nytt',
  'Back to the menu': 'Tilbake til menyen',

  // ---- home
  'Seven boards for the night and three arcade tables behind them. Twenty-five seconds a prompt, one attempt each.':
    'Sju brett for natten og tre arkadebord bak dem. Tjuefem sekunder per oppgave, ett forsøk hver.',
  'Play today': 'Spill i dag',
  'Choose a game': 'Velg et spill',
  Unplayed: 'Ikke spilt',
  'In progress': 'Pågår',
  Play: 'Spill',
  'Play again': 'Spill igjen',
  'See result': 'Se resultat',
  Continue: 'Fortsett',
  'Sit down at a table and the record stays on this device.':
    'Sett deg ved et bord, og rekorden blir værende på denne enheten.',
  'Night {n}': 'Natt {n}',
  '{n}-day streak': '{n} dager på rad',
  'Next set': 'Neste sett',

  // ---- arcade hub
  'Arcade · the side tables': 'Arkade · sidebordene',
  'Seven games beside the daily': 'Sju spill ved siden av dagens',
  'Every table is played against the night, not against a scoreboard. Local records stay in this browser; each arcade table can reset its own best without touching the others.':
    'Hvert bord spilles mot natten, ikke mot en resultattavle. Rekordene blir i denne nettleseren; hvert arkadebord kan nullstille sitt eget beste uten å røre de andre.',
  'No arcade streak yet': 'Ingen arkaderekke ennå',
  '{n}-day arcade streak': '{n} dager på rad i arkaden',
  '{n} of {total} played today': '{n} av {total} spilt i dag',
  'Today and all-time, side by side': 'I dag og gjennom tidene, side om side',
  'Not played today': 'Ikke spilt i dag',
  'Best {n}': 'Beste {n}',
  'Play {name}': 'Spill {name}',
  'Play {name} again': 'Spill {name} igjen',
  'The quiet board: every rule, a material bar, threats and a bot on three levels.':
    'Det stille brettet: alle regler, materiellmåler, trusler og en bot på tre nivåer.',
  'The buried sky: ten fallen stars, a safe first tap, chording and a take-back.':
    'Den begravde himmelen: ti falt stjerner, et trygt første trykk, chording og angre.',
  'The keepsake table: twelve pairs, a shelf for every match, one honest peek.':
    'Minnebordet: tolv par, en hylle for hvert par, en ærlig titt.',
  'The observatory windows: solve it, and the sky comes through. Shortest distance shown.':
    'Observatoriets vinduer: løs det, og himmelen slipper inn. Korteste vei vises.',
  'The glass orchard: one press, one step, twelve apples before the walls or your tail.':
    'Glasshagen: ett trykk, ett steg, tolv epler før veggene eller halen tar deg.',
  'The doubling room: slide the lanterns, fuse equals, light a 512 tile.':
    'Doblingsrommet: skyv lyktene, smelt like sammen, tenn en 512-brikke.',
  'The turning table: trap the bot’s lines, flip the discs, own the most stones.':
    'Snu bordet: fang botens linjer, snu brikkene, eie flest steiner.',
  'Best {steps} steps · {wins}W': 'Beste {steps} steg · {wins}S',
  'Best {score} · tile {tile} · {wins}W': 'Beste {score} · brikke {tile} · {wins}S',
  'Best +{margin} · {wins}W/{losses}L': 'Beste +{margin} · {wins}S/{losses}T',
  '{wins}W · {losses}L · {draws}D': '{wins}S · {losses}T · {draws}U',
  'Won in {plies} plies': 'Vant på {plies} trekk',
  'Lost today': 'Tapt i dag',
  'Drawn today': 'Uavgjort i dag',
  'Cleared in {time}': 'Klart på {time}',
  '{n} moves': '{n} trekk',
  '{n} presses': '{n} trykk',
  'Cleared in {steps} steps': 'Klart på {steps} steg',
  '{apples} apples · {steps} steps': '{apples} epler · {steps} steg',
  '{score} points · tile {tile}': '{score} poeng · brikke {tile}',
  '{margin} · {discs} discs': '{margin} · {discs} brikker',

  // ---- settings / language
  'Make it yours': 'Gjør det til ditt',
  'Nothing here is required. The game plays the same either way.':
    'Ingenting her er påkrevd. Spillet er det samme uansett.',
  Language: 'Språk',
  English: 'Engelsk',
  Norwegian: 'Norsk',
  'The interface language. Saved on this device.': 'Språket i grensesnittet. Lagres på denne enheten.',

  // ---- screen titles and static heads
  Archive: 'Arkiv',
  'Every board, kept': 'Hvert brett, tatt vare på',
  Standings: 'Tabellen',
  'One attempt, one place': 'Ett forsøk, én plass',
  Statistics: 'Statistikk',
  'Nothing to count yet': 'Ingenting å telle ennå',
  'Your quiet record': 'Din stille rekord',
  'How to play · 30 seconds': 'Slik spiller du · 30 sekunder',
  'Three rules, then you know it': 'Tre regler, så kan du det',
  'The quiet board': 'Det stille brettet',
  'The buried sky': 'Den begravde himmelen',
  'The keepsake table': 'Minnebordet',
  'The observatory windows': 'Observatoriets vinduer',
  'The glass orchard': 'Glasshagen',
  'The doubling room': 'Doblingsrommet',
  'The turning table': 'Snu bordet',
  // ---- home tiles
  choir: 'kor',
  hall: 'hall',
  lanterns: 'lykter',
  board: 'brett',
  sky: 'himmel',
  keepsakes: 'minner',
  windows: 'vinduer',
  orchard: 'hage',
  room: 'rom',
  table: 'bord',
  'The night choir: everyone sings the same note. The loudest answer in the crowd pays best.':
    'Nattkoret: alle synger samme tone. Det mest populære svaret lønner seg mest.',
  'The empty hall: one voice in the dark. The quietest answer on the board pays best.':
    'Den tomme salen: én stemme i mørket. Det mest sjeldne svaret lønner seg mest.',
  'The lantern grid: four boards of dark windows. One spark per row, column and tone; never let two touch.':
    'Lyktenettet: fire brett med mørke vinduer. Én gnist per rad, kolonne og tone; aldri to som rører hverandre.',
  'Every rule, no clock. Threats, captures and a bot that answers the same for all of us tonight.':
    'Alle regler, ingen klokke. Trusler, fangster og en bot som svarer likt for alle i natt.',
  'Ten fallen stars under a 9×9 field. The first tap is always safe.':
    'Ti falt stjerner under et 9×9-felt. Det første trykket er alltid trygt.',
  'Twelve keepsakes face down. Turn two; a match goes on the shelf.':
    'Tolv minner med forsiden ned. Snu to; et par går på hyllen.',
  'Twenty-five lit windows. Every press flips its neighbours too; each one shut lets a star through.':
    'Tjuefem opplyste vinduer. Hvert trykk snur naboene også; hvert vindu du lukker slipper en stjerne inn.',
  'The glass orchard: one press, one step. Twelve apples before the walls or your tail.':
    'Glasshagen: ett trykk, ett steg. Tolv epler før veggene eller halen tar deg.',
  '7 prompts · 25s': '7 oppgaver · 25s',
  '4 boards · 2 min': '4 brett · 2 min',
  'daily bot · 3 levels': 'daglig bot · 3 nivåer',
  '9×9 · 10 buried stars': '9×9 · 10 begravde stjerner',
  '24 cards · 12 keepsakes': '24 kort · 12 minner',
  '5×5 · clear the sky': '5×5 · klar himmelen',
  '15×11 · 12 apples': '15×11 · 12 epler',
  '4×4 · goal 512': '4×4 · mål 512',
  '8×8 · you are white': '8×8 · du er hvit',
  Open: 'Åpne',
  'Reset best': 'Nullstill rekord',
  'New orchard': 'Ny hage',
  'New room': 'Nytt rom',
  'New game': 'Nytt spill',
  'No best yet': 'Ingen rekord ennå',
  Alive: 'I live',
  Won: 'Vunnet',
  Lost: 'Tapt',
  Playing: 'Spiller',
  'Your turn': 'Din tur',
  'The bot is turning discs': 'Boten snur brikker',
  'The bot passes': 'Boten passer',
  'Unfinished round': 'Ufullendt runde',
  Discard: 'Forkast',
  'An orchard is already open': 'En hage er allerede åpen',
  'A room is already open': 'Et rom er allerede åpent',
  'A table is already set': 'Et bord er allerede dekket',
  'You left this run mid-step. Continue it, or start a fresh orchard for today.':
    'Du forlot denne runden midt i et steg. Fortsett den, eller start en ny hage for i dag.',
  'You left this run mid-slide. Continue it, or start a fresh room for today.':
    'Du forlot denne runden midt i en skyvning. Fortsett den, eller start et nytt rom for i dag.',
  'You left this game mid-turn. Continue it, or start a fresh table for today.':
    'Du forlot dette spillet midt i en tur. Fortsett det, eller start et nytt bord for i dag.',
  'Your run is saved for today. You can pick it up from this table, or discard it here.':
    'Runden er lagret for i dag. Du kan hente den ved dette bordet, eller forkaste den her.',
  'Leave the table': 'Forlat bordet',
  'Keep playing': 'Fortsett å spille',

  // ---- arcade tables
  apples: 'epler',
  steps: 'steg',
  long: 'lang',
  'Snake · Night {n}': 'Snake · natt {n}',
  'Best {n} steps': 'Beste {n} steg',
  'Garden full in {steps} steps': 'Hagen er full etter {steps} steg',
  'Caught in the glass': 'Tatt i glasset',
  '{left} apples left · {steps} steps · head row {hr}, column {hc} · apple row {ar}, column {ac}':
    '{left} epler igjen · {steps} steg · hode rad {hr}, kolonne {hc} · eple rad {ar}, kolonne {ac}',
  'Orchard cleared in {steps} steps': 'Hagen klar på {steps} steg',
  'Caught after {apples} apples · {steps} steps': 'Tatt etter {apples} epler · {steps} steg',
  'Leave the orchard?': 'Forlate hagen?',
  '2048 · Night {n}': '2048 · natt {n}',
  points: 'poeng',
  moves: 'trekk',
  'Reversi · Night {n}': 'Reversi · natt {n}',
  'Max {n}': 'Maks {n}',
  'Best tile —': 'Beste brikke —',
  'Best tile {n}': 'Beste brikke {n}',
  'A {goal} lantern is lit': 'En lykt på {goal} er tent',
  'The room is full and nothing doubles': 'Rommet er fullt og ingenting dobles',
  'Next goal {n}': 'Neste mål {n}',
  'Room lit · {score} points': 'Rommet er tent · {score} poeng',
  'No moves left · {score} points': 'Ingen trekk igjen · {score} poeng',
  'Leave the doubling room?': 'Forlate doblingsrommet?',
  white: 'hvite',
  black: 'svarte',
  You: 'Du',
  Bot: 'Boten',
  turn: 'tur',
  'Best margin +{n}': 'Beste margin +{n}',
  Draw: 'Uavgjort',
  'You win {white}–{black}': 'Du vinner {white}–{black}',
  'The bot wins {black}–{white}': 'Boten vinner {black}–{white}',
  'Drawn {white}–{black}': 'Uavgjort {white}–{black}',
  'Your turn · white': 'Din tur · hvit',
  'Leave the turning table?': 'Forlate snubordet?',
};