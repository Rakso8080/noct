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
  'The quiet board: every rule, a material bar, threats, a bot on three levels and private tables for a friend.':
    'Det stille brettet: alle regler, materiellmåler, trusler, en bot på tre nivåer og private bord for en venn.',
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
  'Every rule, no clock. Face tonight’s bot, or open a private table and send a friend the code.':
    'Alle regler, ingen klokke. Møt nattens bot, eller åpne et privat bord og send koden til en venn.',
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
  'bot · private room': 'bot · privat bord',
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
  '{left} apples left · {steps} steps · {facing} · head row {hr}, column {hc} · apple row {ar}, column {ac}':
    '{left} epler igjen · {steps} steg · {facing} · hode rad {hr}, kolonne {hc} · eple rad {ar}, kolonne {ac}',
  'facing up': 'peker opp',
  'facing down': 'peker ned',
  'facing left': 'peker venstre',
  'facing right': 'peker høyre',
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

  // ---- shared chrome
  Close: 'Lukk',
  'Next board in {h} hours {m} minutes': 'Neste brett om {h} timer {m} minutter',
  '{size} by {size} board': 'Brett {size} × {size}',
  'Row {r}, column {c}, {tone} tone, {state}{conflict}{given}':
    'Rad {r}, kolonne {c}, {tone} tone, {state}{conflict}{given}',
  'Row {r}, column {c}: {state}': 'Rad {r}, kolonne {c}: {state}',
  amber: 'rav',
  violet: 'fiolett',
  teal: 'dypgrønn',
  rose: 'rosa',
  olive: 'oliven',
  steel: 'stål',
  clay: 'leire',
  spark: 'gnist',
  sparks: 'gnister',
  excluded: 'utelukket',
  empty: 'tom',
  ', conflict': ', konflikt',
  ', pre-lit': ', forhåndstenkt',
  ', suggested press': ', foreslått trykk',

  // ---- settings
  Theme: 'Tema',
  'Dark by default; light is a warm paper, not a white flash.':
    'Mørkt som standard; lyst er et varmt papir, ikke et hvitt blink.',
  Auto: 'Auto',
  Dark: 'Mørkt',
  Light: 'Lyst',
  Sound: 'Lyder',
  'Short, soft cues. Nothing needed to understand the board.':
    'Korte, myke signaler. Ingenting du trenger for å forstå brettet.',
  Test: 'Test',
  Haptics: 'Haptikk',
  'A small tap on supported phones when a spark lands.':
    'Et lite dunk på telefoner som støtter det, når en gnist lander.',
  'Reduced motion': 'Redusert bevegelse',
  'Removes the spark animations and page transitions.':
    'Fjerner gnistanimasjonene og sideovergangene.',
  Motion: 'Bevegelse',
  System: 'System',
  Reduced: 'Redusert',
  'Name on the standings': 'Navn i tabellen',
  'Optional. Without a name you still appear on leaderboards, as a player number. Nothing else about you is public — no email, no location, no history.':
    'Valgfritt. Uten navn vises du fortsatt i tabellene, som et spillernummer. Ingenting annet om deg er offentlig — ingen e-post, ingen plassering, ingen historikk.',
  'e.g. Ada': 'f.eks. Ada',
  'Display name': 'Visningsnavn',
  'Save name': 'Lagre navn',
  'Name saved. It now appears on the standings.': 'Navnet er lagret. Det vises nå i tabellen.',
  'Name cleared — you appear by number.': 'Navnet er fjernet — du vises med nummer.',
  'That name could not be saved. Try 2–16 letters.':
    'Navnet kunne ikke lagres. Prøv 2–16 bokstaver.',
  'All your data has been deleted. You start fresh as a new guest.':
    'Alle dataene dine er slettet. Du starter på nytt som gjest.',
  'Deletion failed. Nothing was removed — please try again.':
    'Slettingen feilet. Ingenting ble fjernet — prøv igjen.',
  Privacy: 'Personvern',
  'No account, no email, no password — ever, to play.':
    'Ingen konto, ingen e-post, inget passord — noensinne, for å spille.',
  'A random device identifier and your board results are the only data stored.':
    'En tilfeldig enhets-ID og brettene dine er de eneste dataene som lagres.',
  'No advertising, no third-party trackers, no analytics profiles.':
    'Ingen reklame, ingen tredjepartssporing, ingen analyseprofiler.',
  'Bot and daily chess, mines, pairs, lights, snake, 2048 and reversi are kept only in this browser. An online chess table sends moves directly to the friend you invite; no server keeps them.':
    'Bot- og daglig sjakk, mines, par, lys, slange, 2048 og reversi lagres bare i denne nettleseren. Et online-sjakkbord sender trekkene direkte til vennen du inviterer; ingen server beholder dem.',
  'Deleting your data removes your results, streak, name and side-game records immediately.':
    'Sletting fjerner resultatene, rekken, navnet og siderecordene dine med en gang.',
  'This deletes your streak, scores and history. It cannot be undone.':
    'Dette sletter rekken, poengene og historikken din. Det kan ikke angres.',
  'Delete everything': 'Slett alt',
  'Keep my data': 'Behold dataene mine',
  'Delete my data': 'Slett dataene mine',
  About: 'Om',
  'Version 0.1': 'Versjon 0.1',
  'No ads': 'Ingen reklame',
  'No tracking': 'Ingen sporing',
  Installable: 'Kan installeres',

  // ---- archive
  'Past boards stay open forever. Replaying one never touches today’s streak or the daily standings — it is just you against an old board.':
    'Tidligere brett forblir åpne for alltid. Å spille dem på nytt rører ikke dagens rekke eller dagens tabell — det er bare deg mot et gammelt brett.',
  'Opening the drawer…': 'Åpner skuffen…',
  'Empty drawer': 'Tom skuff',
  'The archive fills up as days pass. Board #1 is today, so there is nothing behind it yet.':
    'Arkivet fylles opp etter hvert som dagene går. Brett #1 er i dag, så det ligger ingenting bak det ennå.',
  '{n} played': '{n} spilt',
  '{n} boards': '{n} brett',
  'Scores are your best run': 'Poengene er ditt beste forsøk',
  'Board #{n}': 'Brett #{n}',
  'best {score}': 'beste {score}',
  play: 'spill',
  'Could not load past scores right now — the boards above still work.':
    'Kunne ikke hente tidligere poeng nå — brettene over virker fortsatt.',

  // ---- leaderboard
  'Ranked on score, then on speed. No retries, so the table means something.':
    'Rangert etter poeng, så etter fart. Ingen nye forsøk, så tabellen betyr noe.',
  'This copy of Noct runs entirely in your browser, so there is no shared table — the row below is your own result on this device.':
    'Denne kopien av Noct kjører helt i nettleseren din, så det finnes ingen felles tabell — raden under er ditt eget resultat på denne enheten.',
  Today: 'I dag',
  'This week': 'Denne uken',
  'All time': 'Gjennom tidene',
  'Nobody has finished today yet': 'Ingen har fullført i dag ennå',
  'Finish today’s boards and you take the first place. It will not last long.':
    'Fullfør dagens brett og du tar førsteplassen. Den varer ikke lenge.',
  'No scores this week': 'Ingen poeng denne uken',
  'The week starts with your first finished board. Seven days of dailies add up.':
    'Uken starter med det første fullførte brettet ditt. Sju dager med daglige brett summerer seg.',
  'The table is empty': 'Tabellen er tom',
  'All-time standings begin with the first player. That could be you.':
    'Tabellen gjennom tidene starter med den første spilleren. Det kan være deg.',
  'Reading the ledger…': 'Leser protokollen…',
  'Standings unavailable': 'Tabellen er utilgjengelig',
  'The leaderboard could not be reached. Your own result is safe.':
    'Resultattavlen kunne ikke nås. Ditt eget resultat er trygt.',
  'Try again': 'Prøv igjen',
  you: 'deg',
  'You · {n}-day streak': 'Deg · {n} dager på rad',
  '{n} players on the {scope} table.': '{n} spillere på tabellen for {scope}.',
  'Guests show a player number until they choose a name in Settings.':
    'Gjester vises med spillernummer til de velger navn i Innstillinger.',
  daily: 'dagens brett',
  weekly: 'uken',
  'all-time': 'alle tider',

  // ---- statistics
  'Your numbers live on the server. They could not be loaded just now.':
    'Tallene dine ligger på serveren. De kunne ikke hentes akkurat nå.',
  'Counting your sparks…': 'Teller gnistene dine…',
  'Finish a daily board and this page starts filling in: streak, average, best, and every board you have ever solved.':
    'Fullfør et daglig brett, og denne siden begynner å fylles: rekke, gjennomsnitt, beste og hvert brett du noen gang har løst.',
  'Everything here is yours alone. Nothing is shared unless you put a name on the standings.':
    'Alt her er bare ditt. Ingenting deles med mindre du setter et navn i tabellen.',
  'Current streak': 'Nåværende rekke',
  'days in a row': 'dager på rad',
  'Best streak': 'Beste rekke',
  'personal record': 'personlig rekord',
  'Boards finished': 'Brett fullført',
  '{n} sessions total': '{n} økter totalt',
  'Average score': 'Gjennomsnittlig poeng',
  'of {n} possible': 'av {n} mulige',
  'Highest score': 'Høyeste poeng',
  'Total points': 'Poeng totalt',
  'Perfect days': 'Perfekte dager',
  '87%+ of max': '87 %+ av maks',
  'Archive boards': 'Arkivbrett',
  '{n} practice rounds': '{n} øvingsrunder',
  'Last 70 days': 'Siste 70 dager',
  less: 'mindre',
  more: 'mer',
  'Daily completion calendar for the last 70 days': 'Kalender for fullførte dager de siste 70 dagene',
  'not played': 'ikke spilt',
  '{n} of the last 70 days played. Missing a day resets the streak, never the record.':
    '{n} av de siste 70 dagene spilt. En glemt dag nullstiller rekken, aldri rekorden.',
  'Score distribution': 'Poengfordeling',
  '{n} hints used in total.': '{n} hint brukt totalt.',
  'Recent boards': 'Siste brett',

  // ---- how to play
  'That is the whole game': 'Det er hele spillet',
  'One spark per row, column and tone, none touching. Bigger boards ask the same question, just with more places to look.':
    'Én gnist per rad, kolonne og tone, ingen som rører hverandre. Større brett spør om det samme, bare med flere steder å lete.',
  'They repel': 'De frastøter hverandre',
  'Those two share a row, a column or a tone — or they touch. That red outline is the only thing to fix.':
    'De to deler rad, kolonne eller tone — eller de rører hverandre. Den røde omrissingen er det eneste du må rette.',
  'Tap a tile': 'Trykk på en rute',
  'Light a spark anywhere. The dashed ring marks a pre-lit spark: it is part of the answer and cannot move.':
    'Tenn en gnist hvor som helst. Den stiplede ringen er en forhåndstenkt gnist: den er en del av svaret og kan ikke flyttes.',
  '{n} of {size} placed': '{n} av {size} plassert',
  'Keep going. Each shaded tone needs exactly one spark, and each row and column too.':
    'Fortsett. Hver skyggelagte tone trenger nøyaktig én gnist, og hver rad og kolonne også.',
  'This board is small on purpose. Solve it once and every daily board makes sense.':
    'Dette brettet er lite med vilje. Løs det én gang, og hvert daglige brett gir mening.',
  'Reset board': 'Nullstill brettet',
  Skip: 'Hopp over',
  'Scoring, quickly': 'Poeng, kort fortalt',
  'Every board gives a base score plus a time bonus that fades to zero at par. Finish a board without a hint for 25 extra. A hint costs 80 and forfeits that bonus — the price is always shown before you take it.':
    'Hvert brett gir en grunnsum pluss en tidsbonus som falmer til null ved par. Fullfør et brett uten hint for 25 ekstra. Et hint koster 80 og fjerner bonussen — prisen vises alltid før du tar det.',
  'Wrong placements cost nothing but seconds. Only the clock and your own patience decide the score, and the clock is measured by the server, not your browser.':
    'Feilplasseringer koster bare sekunder. Bare klokken og din egen tålmodighet avgjør poengene, og klokken måles av serveren, ikke nettleseren.',
  '7 boards daily': '7 brett daglig',
  '5×5 → 7×7': '5×5 → 7×7',
  '3 hints a day': '3 hint om dagen',
  'Reset 00:00 UTC': 'Nullstilles 00:00 UTC',
  'The seven boards': 'De sju brettene',
  'One night, seven boards, each with its own weather. They share the dark, not the score — no account, no server, just a board waiting on the menu.':
    'Én natt, sju brett, hvert med sitt eget vær. De deler mørket, ikke poengene — ingen konto, ingen server, bare et brett som venter i menyen.',
  'The night choir': 'Nattkoret',
  'The empty hall': 'Den tomme salen',
  'The lantern grid': 'Lyktenettet',
  'everyone sings the same note. Seven prompts; the louder the answer in the crowd, the higher it lifts you. The strip under the prompt is the real chorus share.':
    'alle synger samme tone. Sju oppgaver; jo høyere svaret står i mengden, jo høyere løfter det deg. Stripen under oppgaven er den virkelige korandelen.',
  'one voice in a dark hall. The same seven prompts, read from the other end: the quieter the answer, the higher it lifts you.':
    'én stemme i en mørk sal. De samme sju oppgavene, lest fra den andre enden: jo sjeldnere svaret er, jo høyere løfter det deg.',
  'four boards of dark windows. One spark per row, column and tone, no two touching. Each finished board lights a lantern.':
    'fire brett med mørke vinduer. Én gnist per rad, kolonne og tone, aldri to som rører hverandre. Hvert fullførte brett tenner en lykt.',
  'the whole game against a bot. Castling, en passant, promotion and every draw are in. The balance bar weighs the pieces, the Threats ring points at what is hanging, and a crowned pawn flashes where it lands.':
    'hele spillet mot en bot. Rokade, en passant, forvandling og alle remisvarianter er med. Balansestripen veier brikkene, Trusler-ringen peker på det som henger, og en kronet bonde blinker der den lander.',
  'ten fallen stars under a 9×9 field. The first tap is always safe; long-press (or right-click) to plant a lantern.':
    'ti falt stjerner under et 9×9-felt. Det første trykket er alltid trygt; langt trykk (eller høyreklikk) planter en lykt.',
  'twelve keepsakes face down, one board a day. Every match goes onto the shelf above the cards.':
    'tolv minner med forsiden ned, ett brett om dagen. Hvert par går på hyllen over kortene.',
  'a 5×5 room, all lit. Every tap flips its neighbours too; every window you shut lets a star through.':
    'et 5×5-rom, alt tent. Hvert trykk snur naboene også; hvert vindu du lukker slipper en stjerne inn.',
  'Night choir': 'Nattkor',
  'Empty hall': 'Tom sal',
  'Lantern grid': 'Lyktnett',
  'Buried sky': 'Begravd himmel',
  Keepsakes: 'Minner',
  Windows: 'Vinduer',

  // ---- lights
  'Lights · Night {n}': 'Lys · natt {n}',
  'Every press flips its window and the four beside it. Shut them all, and the sky behind them comes through. The daily board is always solvable — the scramble starts from dark.':
    'Hvert trykk snur vinduet og de fire ved siden av. Lukk alle, og himmelen bak kommer til syne. Det daglige brettet kan alltid løses — blandingen starter fra mørkt.',
  'The same board for everyone today': 'Samme brett for alle i dag',
  'Fresh scramble every reset': 'Ny blanding hver nullstilling',
  'Par {n} presses': 'Par {n} trykk',
  'Shortest left': 'Korteste igjen',
  'Hints {n}': 'Hint {n}',
  'Your best today {n}': 'Din beste i dag {n}',
  'Unplayed today': 'Ikke spilt i dag',
  'Free play': 'Fri spill',
  'Best {n} presses': 'Beste {n} trykk',
  'Windows dark': 'Mørke vinduer',
  'Lights-out board, 5 by 5': 'Lys-av-brett, 5 × 5',
  'Square {r}, {c}: {state}{hint}': 'Rute {r}, {c}: {state}{hint}',
  lit: 'tent',
  dark: 'mørk',
  Hint: 'Hint',
  Undo: 'Angre',
  'New shuffle': 'Ny blanding',
  'Dark in {n} presses': 'Mørkt etter {n} trykk',
  'Lights mode': 'Lys-modus',

  // ---- pairs
  'Pairs · Night {n}': 'Par · natt {n}',
  'Twelve keepsakes lie face down. Turn two; a match goes on the shelf, a miss turns back. Same layout for everyone today.':
    'Tolv minner ligger med forsiden ned. Snu to; et par går på hyllen, en bom snur tilbake. Samme oppsett for alle i dag.',
  'The same layout for everyone today': 'Samme oppsett for alle i dag',
  'Fresh shuffle every reset': 'Ny stokking hver nullstilling',
  'Keepsakes {n} of {total}': 'Minner {n} av {total}',
  'Today {n} moves': 'I dag {n} trekk',
  'on the shelf': 'på hyllen',
  'Best {n} moves': 'Beste {n} trekk',
  'Best time {n}s': 'Beste tid {n}s',
  'Perfect is {n} moves': 'Perfekt er {n} trekk',
  'Peek used': 'Titt brukt',
  'Card shows {symbol}': 'Kortet viser {symbol}',
  'Hidden card': 'Skjult kort',
  Peek: 'Titt',
  '−2 moves': '−2 trekk',
  'Cleared in {n} moves · {time}s': 'Klart på {n} trekk · {time}s',
  'Pairs mode': 'Par-modus',

  // ---- mines
  'Mines · Night {n}': 'Mines · natt {n}',
  'Ten fallen stars are buried under the field. Clear every other square; the first tap is always safe, so a blind start never costs you. Long-press (or right-click) plants a lantern.':
    'Ti falt stjerner er begravd under feltet. Åpne hver andre rute; det første trykket er alltid trygt, så en blind start koster deg ingenting. Langt trykk (eller høyreklikk) planter en lykt.',
  'Fresh board every reset': 'Nytt brett hver nullstilling',
  'stars unmarked': 'stjerner umerket',
  'Today {n}s': 'I dag {n}s',
  'Today lost': 'Tapt i dag',
  'Best {n}s': 'Beste {n}s',
  Cleared: 'Klart',
  'Cascade +{n}': 'Kaskade +{n}',
  'Minesweeper board, 9 by 9': 'Mines-brett, 9 × 9',
  mine: 'mine',
  flagged: 'flagget',
  hidden: 'skjult',
  '{n} nearby': '{n} i nærheten',
  Flagging: 'Flagger',
  'Flag mode': 'Flaggmodus',
  'New board': 'Nytt brett',
  'Cleared in {n}s': 'Klart på {n}s',
  'A mine. Try again.': 'En mine. Prøv igjen.',
  'Mines mode': 'Mines-modus',

  // ---- results
  'No result to show': 'Ingen resultat å vise',
  'Results appear once you finish a board. Play today’s, or open one from the archive.':
    'Resultater vises når du fullfører et brett. Spill dagens, eller åpne et fra arkivet.',
  'Browse the archive': 'Bla i arkivet',
  'Archive #{n}': 'Arkiv #{n}',
  'Practice run': 'Øvingsrunde',
  'Not counted towards your streak': 'Teller ikke mot rekken',
  'Personal best': 'Personlig rekord',
  '{n} hints': '{n} hint',
  'No hints': 'Ingen hint',
  '{time} total': '{time} totalt',
  'Your boards': 'Brettene dine',
  'points · time': 'poeng · tid',
  'Fastest board:': 'Raskeste brett:',
  'on {size}×{size}. Par is {par}s per board — beat it for the full time bonus.':
    'på {size}×{size}. Par er {par}s per brett — slå det for full tidsbonus.',
  'Today, worldwide': 'I dag, over hele verden',
  Finished: 'Fullført',
  '{done} of {started} players': '{done} av {started} spillere',
  'all finished boards': 'alle fullførte brett',
  'Your rank': 'Din plassering',
  'top {n}%': 'topp {n} %',
  unranked: 'ikke rangert',
  Solutions: 'Løsninger',
  Hide: 'Skjul',
  'Reveal the answers': 'Vis svarene',
  'Solution for board {n}': 'Løsning for brett {n}',
  'Board {n}': 'Brett {n}',
  'Answers stay hidden while today is live so nobody can spoil it. Reveal only when you have finished.':
    'Svarene holdes skjult mens dagen er aktiv, så ingen kan spoile den. Vis dem bare når du er ferdig.',
  'Share card': 'Delingskort',
  'Shareable result': 'Resultat som kan deles',
  'Board speed: {grid}': 'Bretthastighet: {grid}',
  '{n}-day': '{n} dager',
  Copied: 'Kopiert',
  'Share result': 'Del resultat',
  'Copy text': 'Kopier tekst',
  'Save image': 'Lagre bilde',
  'The card never shows answers — only your score, speed and streak.':
    'Kortet viser aldri svar — bare poeng, fart og rekke.',
  Next: 'Neste',
  'Practice another board': 'Øv på et annet brett',
  'See the standings': 'Se tabellen',
  'Your statistics': 'Statistikken din',
  Legendary: 'Legendarisk',
  Excellent: 'Utmerket',
  Great: 'Fremragende',
  Good: 'Bra',
  'Warming up': 'Varmer opp',

  // ---- play (lantern grid)
  'Board #{n} is not written yet. Today’s board lives under Noct.':
    'Brett #{n} er ikke skrevet ennå. Dagens brett ligger under Noct.',
  'Board #{n} is outside the archive. The drawer keeps the last 365 nights.':
    'Brett #{n} er utenfor arkivet. Skuffen holder de siste 365 nettene.',
  'You appear to be offline. The daily board needs a connection.':
    'Du ser ut til å være frakoblet. Det daglige brettet trenger en tilkobling.',
  'That board could not be opened. Try again.': 'Brettet kunne ikke åpnes. Prøv igjen.',
  'Those sparks don’t fit the rules yet — nothing lost, keep going.':
    'Gnistene passer ikke med reglene ennå — ingenting er tapt, fortsett.',
  'Round {n}': 'Runde {n}',
  'One moment…': 'Et øyeblikk…',
  'Connection hiccup. Your board is still here — tap a spark to retry.':
    'Tilkoblingen hakket. Brettet er fortsatt her — trykk på en gnist for å prøve igjen.',
  'That spark came pre-lit — it is part of the answer.':
    'Den gnisten var forhåndstenkt — den er en del av svaret.',
  'No hints left today. The boards are fair — trust your eliminations.':
    'Ingen hint igjen i dag. Brettene er rettferdige — stol på utelukkelsene.',
  'A spark is revealed. −{cost} points.': 'En gnist er avslørt. −{cost} poeng.',
  'Hints are unavailable right now.': 'Hint er utilgjengelige akkurat nå.',
  'Preparing the board': 'Gjør klar brettet',
  'Checking the solution is still unique…': 'Sjekker at løsningen fortsatt er unik…',
  'Not in the archive': 'Ikke i arkivet',
  'Board unavailable': 'Brettet er utilgjengelig',
  'Open the archive': 'Åpne arkivet',
  'Back home': 'Tilbake hjem',
  Daily: 'Daglig',
  Practice: 'Øving',
  'Leave this board': 'Forlat brettet',
  'Board {n} of {total}': 'Brett {n} av {total}',
  'Time on this board': 'Tid på dette brettet',
  'Board {n}, {size} by {size}. {placed} of {size} sparks placed.':
    'Brett {n}, {size} × {size}. {placed} av {size} gnister plassert.',
  Clear: 'Tøm',
  Rules: 'Regler',
  'Two sparks are touching or sharing a line. Move one.':
    'To gnister rører hverandre eller deler en linje. Flytt én.',
  'Checking…': 'Sjekker…',
  '{n} sparks to place': '{n} gnister å plassere',
  'hint used on this board': 'hint brukt på dette brettet',
  Score: 'Poeng',
  'par {n}s': 'par {n}s',
  done: 'ferdig',
  now: 'nå',
  'The lanterns': 'Lyktene',
  'Board {n} of {total}: {placed} of {size} sparks placed. Each board you finish lights its lantern.':
    'Brett {n} av {total}: {placed} av {size} gnister plassert. Hvert brett du fullfører tenner lykten sin.',
  'The rule': 'Regelen',
  'One spark per row, column and tone. No two sparks touch — including diagonally. Locked sparks are part of the answer.':
    'Én gnist per rad, kolonne og tone. Ingen gnister rører hverandre — heller ikke diagonalt. Låste gnister er en del av svaret.',
  'ruled out': 'utelukket',
  'Rejected placements: {n}. They cost time, never points.':
    'Avviste plasseringer: {n}. De koster tid, aldri poeng.',
  'Use a hint': 'Bruk et hint',
  'Reveal a spark?': 'Avsløre en gnist?',
  'One correct spark is lit for you on this board, and you lose the clean-board bonus. It costs {cost} points plus the 25-point clean bonus. You have {left} hints left today.':
    'Én riktig gnist tennes for deg på dette brettet, og du mister ren-brett-bonusen. Det koster {cost} poeng pluss den 25 poeng store bonusen. Du har {left} hint igjen i dag.',
  'Reveal it (−{cost})': 'Avslør den (−{cost})',
  'Keep thinking': 'Tenk videre',

  // ---- chess
  'The bot is thinking…': 'Boten tenker…',
  'You are in check.': 'Du står i sjakk.',
  'Your move.': 'Ditt trekk.',
  'Bot to move.': 'Boten skal trekke.',
  'Pieces the bot has taken': 'Brikker boten har tatt',
  none: 'ingen',
  'Pieces you have taken': 'Brikker du har tatt',
  Taken: 'Tatt',
  opening: 'åpning',
  'Chess board, {side}': 'Sjakkbrett, {side}',
  'you play white': 'du spiller hvit',
  'you play black': 'du spiller svart',
  White: 'Hvit',
  Black: 'Svart',
  'legal move': 'lovlig trekk',
  'Choose a promotion piece': 'Velg brikke for forvandling',
  'Promote to': 'Forvandle til',
  'Promote to {piece}': 'Forvandle til {piece}',
  pawn: 'bonde',
  knight: 'springer',
  bishop: 'løper',
  rook: 'tårn',
  queen: 'dronning',
  king: 'konge',
  Checkmate: 'Sjakkmatt',
  Stalemate: 'Patt',
  '{n} plies · level {level} · {mode}': '{n} trekk · nivå {level} · {mode}',
  'free play': 'fri spill',
  Threats: 'Trusler',
  Flip: 'Snu',
  'Shared position · free play': 'Delt stilling · fri spill',
  'Daily bot · same reply for everyone today': 'Daglig bot · samme svar for alle i dag',
  'Free play · bot varies': 'Fri spill · boten varierer',
  Setup: 'Oppsett',
  Mode: 'Modus',
  'Game mode': 'Spillmodus',
  'Bot level': 'Botnivå',
  'You play': 'Du spiller',
  'Your side': 'Din side',
  Novice: 'Nybegynner',
  Steady: 'Stødig',
  Sharp: 'Skarp',
  'Level {level} · {label}. Changing side starts a new game; the bot level can change mid-game.':
    'Nivå {level} · {label}. Å bytte side starter et nytt spill; botnivået kan endres midt i spillet.',
  'The balance': 'Balansen',
  Even: 'Jevnt',
  '{side} +{n}': '{side} +{n}',
  'White took': 'Hvit tok',
  'Black took': 'Svart tok',
  Moves: 'Trekk',
  '{n} plies': '{n} trekk',
  'Move list': 'Trekkliste',
  'No moves yet. Tap a piece; its legal squares light up.':
    'Ingen trekk ennå. Trykk på en brikke; de lovlige rutene lyser opp.',
  'Checkmate. You win.': 'Sjakkmatt. Du vinner.',
  'Checkmate. The bot wins.': 'Sjakkmatt. Boten vinner.',
  'Stalemate. A draw.': 'Patt. Remis.',
  'Draw: not enough material.': 'Remis: ikke nok materiale.',
  'Draw: fifty moves without a capture.': 'Remis: femti trekk uten fangst.',
  'Draw by repetition.': 'Remis ved gjentakelse.',

  // ---- online chess
  'A friend': 'En venn',
  'Private table': 'Privat bord',
  'Private table · no clock': 'Privat bord · ingen klokke',
  'Create a private table': 'Lag et privat bord',
  'Open a private table and send the link to a friend. No account, no clock.':
    'Åpne et privat bord og send lenken til en venn. Ingen konto, ingen klokke.',
  'Join with a code': 'Bli med med en kode',
  Join: 'Bli med',
  'Invite link': 'Invitasjonslenke',
  'Copy invite link': 'Kopier invitasjonslenke',
  'Leave room': 'Forlat rommet',
  'Your friend is here.': 'Vennen din er her.',
  'Waiting for your friend to join.': 'Venter på at vennen din skal bli med.',
  'Connecting to the room…': 'Kobler til rommet…',
  'Waiting for your friend…': 'Venter på vennen din…',
  'Friend to move.': 'Vennen din skal trekke.',
  'You play White': 'Du spiller hvit',
  'You play Black': 'Du spiller svart',
  'Your friend opens the link and plays Black. Keep this tab open while you play.':
    'Vennen din åpner lenken og spiller svart. La denne fanen stå åpen mens dere spiller.',
  'Pieces your friend has taken': 'Brikker vennen din har tatt',
  '{n} plies · with a friend': '{n} trekk · med en venn',
  Resignation: 'Oppgivelse',
  Resign: 'Gi opp',
  Rematch: 'Omkamp',
  'You resigned.': 'Du trakk deg.',
  'Your friend resigned.': 'Vennen din trakk seg.',
  'Opening the room…': 'Åpner rommet…',
  'The room is unavailable.': 'Rommet er utilgjengelig.',
  'Could not open the room.': 'Kunne ikke åpne rommet.',
  'That table already has two players.': 'Det bordet har allerede to spillere.',
  'The two browsers could not reach each other. Try another network.':
    'Nettleserne fikk ikke kontakt. Prøv et annet nettverk.',
  'The room connection failed.': 'Romtilkoblingen feilet.',
  'Could not reach the room relays. Check the connection and try again.':
    'Fikk ikke kontakt med romformidlerne. Sjekk tilkoblingen og prøv igjen.',

  // ---- survey
  Altitude: 'Høyde',
  Prompt: 'Oppgave',
  Lift: 'Løft',
  Quit: 'Avslutt',
  chorus: 'kor',
  solitude: 'alene',
  'Echo {n}/{total} · {state}': 'Ekko {n}/{total} · {state}',
  '{n}% sang it': '{n} % sang det',
  'off the board': 'utenfor brettet',
  listening: 'lytter',
  '{n}/{total} answered · {alone} alone': '{n}/{total} svart · {alone} alene',
  'Nothing accepted on that one. It costs you a balloon in Endless.':
    'Ingenting ble godtatt der. Det koster deg en ballong i Endless.',
  'Off the board, but it counted. You are {height} up.':
    'Utenfor brettet, men det telte. Du er {height} oppe.',
  '{share}% of the crowd said {answer}. You are {height} up.':
    '{share} % av mengden svarte {answer}. Du er {height} oppe.',
  'The board': 'Brettet',
  'crowd share': 'mengdens andel',
  'Show less': 'Vis mindre',
  'See all {n}': 'Se alle {n}',
  '▲ common answers climb higher ▲': '▲ vanlige svar klatrer høyere ▲',
  '{n} balloons left': '{n} ballonger igjen',
  'Out of balloons': 'Tom for ballonger',
  '{n} of {total}': '{n} av {total}',
  'See the climb': 'Se klatringen',
  'Clock starting in {n}': 'Klokken starter om {n}',
  'Your answer': 'Svaret ditt',
  'Type one answer…': 'Skriv ett svar…',
  Pass: 'Pass',
  Climb: 'Klatr',
  'Type an answer first.': 'Skriv et svar først.',
  'Letters and numbers only, please.': 'Bare bokstaver og tall, takk.',
  'That could be anything. Name the thing itself.':
    'Det kan være hva som helst. Navngi selve tingen.',
  'One answer at a time.': 'Ett svar om gangen.',
  'That is the prompt itself. Name the thing.': 'Det er oppgaven selv. Navngi tingen.',
  'Making card…': 'Lager kort…',
  Shared: 'Delt',
  'Saved png': 'Lagret png',
  'Could not share': 'Kunne ikke dele',
  '{n} points': '{n} poeng',
  '{n} prompts': '{n} oppgaver',
  'The climb': 'Klatringen',
  'STOP {n}': 'STOPP {n}',
  'Your answers': 'Svarene dine',
  'no answer': 'ikke svart',
  '{share}% said {answer}': '{share} % sa {answer}',
  'Copy result': 'Kopier resultat',
  'Climb again': 'Klatr igjen',
  'Back to menu': 'Tilbake til menyen',
  'Next {name} in': 'Neste {name} om',
  'A perfect seven-prompt climb is 700 points and 14 km.':
    'En perfekt klatring på sju oppgaver er 700 poeng og 14 km.',
  Moonrise: 'Måneoppgang',
  Aurora: 'Nordlys',
  Starlit: 'Stjerneklar',
  Lantern: 'Lykt',
  Ember: 'Glør',
  Grounded: 'Jordnær',
  Easy: 'Lett',
  Medium: 'Middels',
  Hard: 'Vanskelig',
  'Seven prompts, one try. Everybody gets the same ones today.':
    'Sju oppgaver, ett forsøk. Alle får de samme i dag.',
  'Seven fresh prompts, play as often as you like.':
    'Sju nye oppgaver, spill så ofte du vil.',
  'Keep climbing until your balloons run out.': 'Klatr til ballongene tar slutt.',
  'The night choir · everyone sings the same note': 'Nattkoret · alle synger samme tone',
  'The empty hall · one voice, as quiet as possible': 'Den tomme salen · én stemme, så stille som mulig',
  'Your best {points} pts · {km} km': 'Din beste {points} poeng · {km} km',
  '{n} prompts · {s}s each': '{n} oppgaver · {s}s hver',
  Streak: 'Rekke',
  '{n} days': '{n} dager',
  on: 'på',
  off: 'av',
  'Choose a mode': 'Velg en modus',
  'Today’s Daily is already done': 'Dagens daglige er allerede gjort',
  'Begin the climb': 'Begynn klatringen',
  '{n} climbs today · avg {m} m': '{n} klatringer i dag · snitt {m} m',
  'See today’s result': 'Se dagens resultat',
  Classic: 'Klassisk',
  Endless: 'Endeløs',
  'The night choir · everyone sings the same note. The louder the answer, the higher it lifts you.':
    'Nattkoret · alle synger samme tone. Jo høyere svaret står i mengden, jo høyere løfter det deg.',
  'The empty hall · one voice in a dark hall. The quieter the answer, the higher it lifts you.':
    'Den tomme salen · én stemme i en mørk sal. Jo sjeldnere svaret er, jo høyere løfter det deg.',
  'Give the answer everybody gives.': 'Gi svaret alle gir.',
  'Give the answer nobody gives.': 'Gi svaret ingen gir.',
  'The top answer on the board is Moonrise and lifts you 100 points. Off the board still counts, just less.':
    'Svaret øverst på brettet er Måneoppgang og løfter deg 100 poeng. Utenfor brettet teller også, bare mindre.',
  'The board is read from the bottom: the loneliest answer on it is Moonrise. Off the board still counts, just less.':
    'Brettet leses fra bunnen: det ensomste svaret er Måneoppgang. Utenfor brettet teller også, bare mindre.',

  // ---- arcade tables, detail copy
  'One press, one step: the snake moves only when you do, so every apple is a decision. Collect {target} and the orchard is yours; a wall or your own tail ends the night. {keys}':
    'Ett trykk, ett steg: slangen beveger seg bare når du gjør det, så hvert eple er et valg. Samle {target} og hagen er din; en vegg eller din egen hale avslutter natten. {keys}',
  'row {r}, column {c}': 'rad {r}, kolonne {c}',
  head: 'hode',
  body: 'kropp',
  apple: 'eple',
  '{apples} / {target} apples · {steps} steps': '{apples} / {target} epler · {steps} steg',
  'Snake board, {w} by {h}. {apples} of {target} apples eaten, {steps} steps.':
    'Slangebrett, {w} × {h}. {apples} av {target} epler spist, {steps} steg.',
  'Step the snake': 'Styr slangen',
  'Step up': 'Gå opp',
  'Step left': 'Gå venstre',
  'Step down': 'Gå ned',
  'Step right': 'Gå høyre',
  'Slide every lantern; equal neighbours fuse into the next power. The room is lit at a {goal} tile, and the night ends when nothing can move. Arrows, WASD or the pad below; {keys}':
    'Skyv hver lykt; like naboer smelter til neste potens. Rommet tennes ved en brikke på {goal}, og natten slutter når ingenting kan flyttes. Piltaster, WASD eller paden under; {keys}',
  '{score} points · {moves} moves': '{score} poeng · {moves} trekk',
  '2048 board, 4 by 4. {score} points, {moves} moves, largest tile {max}.':
    '2048-brett, 4 × 4. {score} poeng, {moves} trekk, største brikke {max}.',
  'Slide the room': 'Skyv rommet',
  'Slide up': 'Skyv opp',
  'Slide left': 'Skyv venstre',
  'Slide down': 'Skyv ned',
  'Slide right': 'Skyv høyre',
  'Trap a line of the bot’s discs to turn them white. You are white; the table ends when neither side can move, and the most discs wins. Arrows move the cursor, Enter places, Escape leaves the table without touching the board.':
    'Fang en linje av botens brikker og snu dem hvite. Du er hvit; bordet slutter når ingen av sidene kan trekke, og flest brikker vinner. Piltaster flytter markøren, Enter plasserer, Escape forlater bordet uten å røre brettet.',
  '{n} moves · {turn}': '{n} trekk · {turn}',
  'your turn': 'din tur',
  'bot to move': 'boten skal trekke',
  'Reversi board, 8 by 8': 'Reversi-brett, 8 × 8',
  '{square}: {disc}{cursor}': '{square}: {disc}{cursor}',
  'white disc': 'hvit brikke',
  'black disc': 'svart brikke',
  ', cursor': ', markør',
  'Arrows or WASD step, Enter restarts, Escape leaves the table.':
    'Piltaster eller WASD går, Enter starter på nytt, Escape forlater bordet.',
  'Enter restarts, Escape leaves the table.': 'Enter starter på nytt, Escape forlater bordet.',
  'Tutorial board, 4 by 4': 'Øvingsbrett, 4 × 4',
  '{n} pts': '{n} poeng',
  'Won · {n} plies': 'Vant · {n} trekk',
  '{n}s': '{n}s',
  '{wins}W · {losses}L': '{wins}S · {losses}T',

  // ---- remaining keys
  'That board is not in the drawer': 'Det brettet ligger ikke i skuffen',
  'Today’s board is still being played — it lives under Noct, not the archive. It joins the drawer tomorrow.':
    'Dagens brett spilles fortsatt — det ligger under Noct, ikke i arkivet. Det kommer i skuffen i morgen.',
  'The archive keeps the last 365 nights. This address is outside it.':
    'Arkivet holder de siste 365 nettene. Denne adressen ligger utenfor.',
  'Play today’s board': 'Spill dagens brett',
  'Chess · Night {n}': 'Sjakk · natt {n}',
  'The whole game, no clock. Every rule is in: castling, en passant, promotion, draws. Play the daily bot, or open a private table and invite a friend with a code.':
    'Hele spillet, ingen klokke. Alle reglene er med: rokade, en passant, forvandling og alle remisvarianter. Spill mot dagens bot, eller åpne et privat bord og inviter en venn med en kode.',
  Noct: 'Noct',
  Mines: 'Mines',
  Pairs: 'Par',
  Lights: 'Lys',
  Free: 'Fri',
  'Noct archive': 'Noct-arkiv',
  'Noct practice': 'Noct-øving',
  // ---- the three new side tables
  Checkers: 'Dam',
  'Connect Four': 'Fire på rad',
  Dominoes: 'Domino',
  draughts: 'dam',
  columns: 'kolonner',
  line: 'linje',
  'The quiet draughts table': 'Det stille dambordet',
  'The lantern column': 'Lyktekolonnen',
  'The long table': 'Det lange bordet',
  'Checkers · Night {n}': 'Dam · natt {n}',
  'Connect Four · Night {n}': 'Fire på rad · natt {n}',
  'Dominoes · Night {n}': 'Domino · natt {n}',
  'English draughts on an 8×8 table. Men move forward and capture forward; kings go both ways. Captures are forced, jump chains must finish, and a man on the far rank is crowned. No pieces or no legal move loses.':
    'Engelsk dam på et 8 × 8-bord. Brikkene går og slår fremover; konger går begge veier. Slag er påbudt, hopprekker må fullføres, og en brikke på bakerste rad blir krone. Ingen brikker eller ingen lovlige trekk taper.',
  'Drop a lantern into one of seven columns. Four of your colour in a row — straight or diagonal — wins. The bot takes an immediate four, blocks yours, and otherwise builds toward the middle.':
    'Slipp en lykt ned i en av sju kolonner. Fire på rad av din farge — rett eller diagonalt — vinner. Boten tar en umiddelbar firer, blokkerer din, og bygger ellers mot midten.',
  'Double-six dominoes against one patient opponent. Match either open end, draw from the boneyard when nothing fits, and pass when it is empty. Empty your hand first; if both sides are blocked, the lower pip count wins.':
    'Domino med dobbel-seks mot én tålmodig motstander. Match en av de åpne endene, trekk fra bunken når ingenting passer, og stå over når den er tom. Tøm hånden først; er begge sider blokkert, vinner lavest pipetall.',
  'Bot strength': 'Botstyrke',
  'Captures are always forced': 'Slag er alltid påbudt',
  'Seven columns · six rows': 'Sju kolonner · seks rader',
  'Highest double opens': 'Høyeste dobbel åpner',
  'white men': 'hvite brikker',
  'black men': 'svarte brikker',
  crowns: 'kroner',
  plies: 'trekk',
  'Fastest win {n}': 'Raskeste seier {n}',
  'Choose a lit square. {n} legal move(s).': 'Velg en opplyst rute. {n} lovlige trekk.',
  'Your turn. Pick a white piece.': 'Din tur. Velg en hvit brikke.',
  'The bot is thinking.': 'Boten tenker.',
  'You win — the table is yours.': 'Du vinner — bordet er ditt.',
  'The bot wins this one.': 'Boten vinner denne.',
  'A draw. Both sides ran out of useful moves.': 'Remis. Begge sider gikk tom for nyttige trekk.',
  'Tab moves between playable squares, Enter chooses, Escape clears the selection.':
    'Tab flytter mellom spillbare ruter, Enter velger, Escape fjerner valget.',
  'your discs': 'dine brikker',
  'bot discs': 'botens brikker',
  drops: 'slipp',
  'Your turn. Choose a column.': 'Din tur. Velg en kolonne.',
  'The bot is lining up four.': 'Boten stiller opp fire.',
  'You win — four in a row.': 'Du vinner — fire på rad.',
  'A draw. The board is full.': 'Remis. Brettet er fullt.',
  'Drop a disc into a column': 'Slipp en brikke i en kolonne',
  'Drop in column {n}{full}': 'Slipp i kolonne {n}{full}',
  ', full': ', full',
  'Connect Four board, 7 columns by 6 rows': 'Fire på rad-brett, 7 kolonner og 6 rader',
  'your disc': 'din brikke',
  'bot disc': 'botens brikke',
  'Tab moves between the seven columns, Enter drops. Each column button says where it will land.':
    'Tab flytter mellom de sju kolonnene, Enter slipper brikken. Hver kolonneknapp sier hvor den lander.',
  'your tiles': 'dine brikker',
  'bot tiles': 'botens brikker',
  'in the boneyard': 'i bunken',
  'Your pips': 'Dine pip',
  'The domino table': 'Dominobordet',
  'Left end': 'Venstre ende',
  'Right end': 'Høyre ende',
  'The line': 'Linjen',
  'Played dominoes, left to right': 'Spilte dominobrikker, venstre mot høyre',
  'The table is empty. Start the line with any tile.': 'Bordet er tomt. Start linjen med en valgfri brikke.',
  'Your hand': 'Hånden din',
  '{n} pips': '{n} pip',
  '{tile} domino{state}': '{tile}-domino{state}',
  ', playable': ', spillbar',
  'Choose an open end': 'Velg en åpen ende',
  'Start the line': 'Start linjen',
  'Play on left · {n}': 'Spill til venstre · {n}',
  'Play on right · {n}': 'Spill til høyre · {n}',
  'Draw a tile · {n} left': 'Trekk en brikke · {n} igjen',
  'Pass the table': 'Stå over',
  'Nothing fits. Draw from the boneyard.': 'Ingenting passer. Trekk fra bunken.',
  'Nothing fits. Pass the table.': 'Ingenting passer. Stå over.',
  'The bot is reading the ends.': 'Boten leser endene.',
  'Choose an end for {tile}.': 'Velg en ende for {tile}.',
  'You win the table — the last tile is yours.': 'Du vinner bordet — den siste brikken er din.',
  'The bot empties its hand first.': 'Boten tømmer hånden først.',
  'A blocked table. Equal pips, equal night.': 'Et blokkert bord. Like pip, lik natt.',
  'Every tile is a real button. Choose a lit tile, then pick the open end it should join. The line scrolls sideways if it grows past the table.':
    'Hver brikke er en ekte knapp. Velg en opplyst brikke, og velg deretter den åpne enden den skal kobles til. Linjen ruller sidelengs hvis den vokser forbi bordet.',
  'The side tables': 'Sidebordene',
  'Every side table is a complete game against a bot, with two strengths and a local record. These are the rules that matter once you sit down.':
    'Hvert sidebord er et komplett spill mot en bot, med to styrker og en lokal rekord. Dette er reglene som gjelder når du setter deg ned.',
  'men move and capture forward; kings go both ways. Captures are forced, a jump chain must finish, and a man on the far rank is crowned. No pieces or no legal move loses.':
    'brikkene går og slår fremover; konger går begge veier. Slag er påbudt, en hopprekke må fullføres, og en brikke på bakerste rad blir krone. Ingen brikker eller ingen lovlige trekk taper.',
  'drop one disc into a column; it falls to the lowest free square. Four of your colour in a row, across, down or diagonally, wins. A full board is a draw.':
    'slipp en brikke i en kolonne; den faller til laveste ledige rute. Fire på rad av din farge, bortover, nedover eller diagonalt, vinner. Et fullt brett er remis.',
  'a double-six set, seven tiles each. Match either open end, draw from the boneyard when nothing fits, and pass when it is empty. Empty your hand to win; a blocked table goes to the lower pip count.':
    'et dobbel-seks-sett, sju brikker hver. Match en av de åpne endene, trekk fra bunken når ingenting passer, og stå over når den er tom. Tøm hånden for å vinne; et blokkert bord går til lavest pipetall.',
  'The quiet draughts table: forced captures, long jump chains and a crown waiting on the far rank.':
    'Det stille dambordet: påbudte slag, lange hopprekker og en krone som venter på bakerste rad.',
  'The lantern column: drop, stack and line up four before the bot seals the middle.':
    'Lyktekolonnen: slipp, stable og still opp fire før boten lukker midten.',
  'The long table: match either open end, draw from the boneyard, and empty your hand first.':
    'Det lange bordet: match en av de åpne endene, trekk fra bunken og tøm hånden først.',
  'The quiet draughts table: forced captures, long jump chains, crowns and a patient bot.':
    'Det stille dambordet: påbudte slag, lange hopprekker, kroner og en tålmodig bot.',
  'The lantern column: gravity, seven choices, and four in a row in any direction.':
    'Lyktekolonnen: tyngdekraft, sju valg og fire på rad i alle retninger.',
  'The long table: double-six, a boneyard, two open ends and one opponent.':
    'Det lange bordet: dobbel-seks, en bunke, to åpne ender og én motstander.',
  'Seven boards for the night and six arcade tables behind them. Twenty-five seconds a prompt, one attempt each.':
    'Sju brett for natten og seks arkadebord bak dem. Tjuefem sekunder per oppgave, ett forsøk hver.',
  'Ten games beside the daily': 'Ti spill ved siden av dagens',
  'Six more tables wait in the {arcade}: the glass orchard (Snake), the doubling room (2048), the turning table (Reversi), the quiet draughts table (Checkers), the lantern column (Connect Four) and the long table (Dominoes). They are free play — their records live in this browser and never touch the daily streak.':
    'Seks bord til venter i {arcade}: glasshagen (Slange), doblingsrommet (2048), snubordet (Reversi), det stille dambordet (Dam), lyktekolonnen (Fire på rad) og det lange bordet (Domino). De er fri spill — rekordene bor i denne nettleseren og rører aldri den daglige rekken.',
  'Noct is a small independent daily puzzle: seven boards for the night plus six arcade tables, the same for everyone, reset at 00:00 UTC. Built to be played in a queue, on a bus, or with coffee — then closed.':
    'Noct er et lite, uavhengig daglig puslespill: sju brett for natten pluss seks arkadebord, likt for alle, nullstilt kl. 00:00 UTC. Laget for å spilles i en kø, på bussen eller med kaffe — og så lukkes.',
  'Won in {moves} drops': 'Vant på {moves} slipp',
  'Won · +{n}': 'Vant · +{n}',
  BOARD: 'BRETT',
};