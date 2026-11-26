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
  'Snake · Night {n}': 'Slange · natt {n}',
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
  'Mines · Night {n}': 'Minesveiper · natt {n}',
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
  evening: 'Kveld',
  night: 'Natt',
  'before dawn': 'Før gry',
  day: 'Dag',
  'Local time {time}, {phase}': 'Lokal tid {time}, {phase}',
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
  Mines: 'Minesveiper',
  Snake: 'Slange',
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

  // ---- the long road
  Atlas: 'Atlas',
  'The Hollow Atlas': 'Det hule atlaset',
  'The Long Road': 'Den lange veien',
  'Thirteen places on one road: seven nightly boards and six side tables. The map only remembers what you have already played.':
    'Tretten steder på én vei: sju nattlige brett og seks sidebord. Kartet husker bare det du allerede har spilt.',
  'The road so far': 'Veien så langt',
  marks: 'merker',
  'lit tonight': 'tent i natt',
  'Tonight’s road': 'Kveldens rute',
  'Three stops, one night': 'Tre stopp, én natt',
  'Sealed for tonight': 'Forseglet for i natt',
  '{n} of 3 lit': '{n} av 3 tent',
  Lit: 'Tent',
  'Not yet': 'Ikke ennå',
  'The road is sealed for tonight. It will be a different three stops tomorrow.':
    'Veien er forseglet for i natt. Det blir tre nye stopp i morgen.',
  'A suggestion, not a duty: no streak, no lock, no penalty. Play one stop or all three.':
    'Et forslag, ikke en plikt: ingen rekke, ingen lås, ingen straff. Spill ett stopp eller alle tre.',
  'The map of thirteen places': 'Kartet over tretten steder',
  Chapter: 'Kapittel',
  'The Night Choir': 'Nattkoret',
  'The Empty Hall': 'Den tomme salen',
  'The Lantern Grid': 'Lyktnettet',
  'The Candle Keep': 'Lysborgen',
  'The Side Tables': 'Sidebordene',
  'The Fallen Star Field': 'Stjernefallet',
  'The Keepsake Market': 'Minremarken',
  'The Crooked Cottage': 'Det skjeve huset',
  'The Glass Orchard': 'Glasshagen',
  'The Doubling Room': 'Doblingsrommet',
  'The Moon Garden': 'Månehagen',
  'The Clay Courtyard': 'Leirgården',
  'The Lantern Aqueduct': 'Lykteakvedukten',
  'The Long Bridge': 'Den lange broen',
  'Where the valley sings the same note into the dark.':
    'Der dalen synger samme tone inn i mørket.',
  'The old keep above the water, where every table keeps a light.':
    'Den gamle borgen over vannet, der hvert bord holder en lykt tent.',
  'Inns, orchards and quiet rooms along the last stretch of road.':
    'Kroer, hager og stille rom langs den siste delen av veien.',
  'A chorus in the valley: seven prompts, one loud answer at a time.':
    'Et kor i dalen: sju oppgaver, ett høyt svar om gangen.',
  'The same seven prompts from the far end, where the quietest answer carries.':
    'De samme sju oppgavene fra den andre enden, der det stilleste svaret bærer.',
  'Four boards of dark windows, one spark in every row, column and tone.':
    'Fire brett med mørke vinduer, én gnist i hver rad, kolonne og tone.',
  'Walnut, stone and candlelight; every rule, and a friend across the table.':
    'Valnøtt, stein og levende lys; alle regler, og en venn over bordet.',
  'A stall of face-down keepsakes, with one honest peek for the road.':
    'En bod med minner med forsiden ned, og én ærlig titt for veien.',
  'Twenty-five leaded windows; shut them all and let the stars through.':
    'Tjuefem blyglassvinduer; lukk alle og slipp stjernene inn.',
  'One press, one step through the glass rows, twelve apples before the walls.':
    'Ett trykk, ett steg gjennom glassradene, tolv epler før veggene.',
  'Slide the lanterns, fuse equals, and light a 512 tile before the room fills.':
    'Skyv lyktene, smelt like sammen og tenn en 512-brikke før rommet fylles.',
  'Bone and obsidian discs turn under the moon; trap a line and take the garden.':
    'Bein- og obsidianbrikker snur under månen; fang en linje og ta hagen.',
  'Forced captures and long jumps on warm clay, with a crown waiting at the far rank.':
    'Påbudte slag og lange hopp på varm leire, med en krone som venter bakerst.',
  'Drop a lantern down the aqueduct; four in a row lights the whole channel.':
    'Slipp en lykt ned akvedukten; fire på rad tenner hele kanalen.',
  'Bone, rosewood and brass on a bridge over black water; empty your hand first.':
    'Bein, rosentre og messing på en bro over svart vann; tøm hånden først.',
  '{n} of 3 marks': '{n} av 3 merker',
  'Place {n} · {chapter}': 'Sted {n} · {chapter}',
  'The record': 'Rekorden',
  'No record yet': 'Ingen rekord ennå',
  'Played tonight': 'Spilt i natt',
  Waymark: 'Veimerke',
  Night: 'Natt',
  Keepsake: 'Minne',
  'A record exists in this place.': 'Det finnes en registrering på dette stedet.',
  'Played today, before the reset.': 'Spilt i dag, før nullstillingen.',
  'A personal best, win or comparable mark.':
    'En personlig rekord, seier eller tilsvarende merke.',
  'This is stop {n} of tonight’s road.': 'Dette er stopp {n} på kveldens rute.',
  'Open {name}': 'Åpne {name}',
  'Night seals': 'Nattsegl',
  'The road keeps its evenings': 'Veien tar vare på kveldene',
  '{n} sealed': '{n} forseglet',
  'No seals yet': 'Ingen segl ennå',
  'The last seven night seals': 'De sju siste nattseglene',
  'Finish all three stops on a night and the atlas keeps the seal here. No streak is lost by resting.':
    'Fullfør alle tre stoppene på en natt, og atlaset tar vare på seglet her. Ingen rekke går tapt av å hvile.',
  'All thirty-nine marks': 'Alle trettini merkene',
  'Atlas Keeper': 'Atlasvokter',
  'You have walked every place in the valley and kept something from each one. The road is yours now.':
    'Du har gått gjennom hvert sted i dalen og tatt vare på noe fra hver av dem. Veien er din nå.',
  'Best {n} points': 'Beste {n} poeng',
  'Best {n} / {max}': 'Beste {n} / {max}',
  '{n} boards finished': '{n} brett fullført',
  'Open the atlas': 'Åpne atlaset',
  'Ten tables, four of them nightly boards': 'Ti bord, fire av dem nattlige brett',
  'Four of these tables are also nightly boards. The atlas gathers all thirteen places and keeps the road between them.':
    'Fire av disse bordene er også nattlige brett. Atlaset samler alle tretten steder og holder veien mellom dem.',
  'Thirteen places on one road: seven nightly boards and six side tables. Twenty-five seconds a prompt, one attempt each.':
    'Tretten steder på én vei: sju nattlige brett og seks sidebord. Tjuefem sekunder per oppgave, ett forsøk hver.',
  'The Hollow Atlas gathers all thirteen places into one road. Each place keeps three marks: a waymark for a first visit, a night mark for today, and a keepsake for a personal record. The nightly route suggests three stops, but it never locks a door or breaks a streak.':
    'Det hule atlaset samler alle tretten steder på én vei. Hvert sted har tre merker: et veimerke for første besøk, et nattmerke for i dag og et minne for en personlig rekord. Kveldens rute foreslår tre stopp, men låser aldri en dør eller bryter en rekke.',
  'The Long Road is a map over records already kept in this browser. It has no account and sends nothing anywhere.':
    'Den lange veien er et kart over rekorder som allerede ligger i denne nettleseren. Den har ingen konto og sender ingenting videre.',
  'Deleting your data removes your results, streak, name, side-game records and Atlas seals immediately.':
    'Sletting fjerner resultatene, rekken, navnet, siderecordene og atlasseglene dine med en gang.',
  BOARD: 'BRETT',

  // ---- the weather over the road
  'Clear night': 'Klar natt',
  Mist: 'Tåke',
  'Meteor shower': 'Stjerneskudd',
  'Quiet snow': 'Stille snø',
  'The valley stands open; every window is a small lighthouse.':
    'Dalen står åpen; hvert vindu er et lite fyrtårn.',
  'Mist on the road; the lanterns carry further than they should.':
    'Tåke over veien; lyktene bærer lenger enn de burde.',
  'Old stars fall over the ridge, one every few breaths.':
    'Gamle stjerner faller over kammen, én for hvert par åndedrag.',
  'Snow on the valley; the boards keep their sound down.':
    'Snø over dalen; bordene demper lyden.',
  'Green light over the water, and the road lit from above.':
    'Grønt lys over vannet, og veien tent ovenfra.',
  'Tonight: {weather}': 'I natt: {weather}',
  'Weather over the road': 'Vær over veien',

  // ---- the air in each place
  'The valley at the door, before anyone has chosen a table.':
    'Dalen ved døren, før noen har valgt et bord.',
  'A low chorus of sparks over the water.': 'Et lavt kor av gnister over vannet.',
  'The hall keeps its breath; dust turns slowly in the dark.':
    'Salen holder pusten; støv snur seg sakte i mørket.',
  'Lantern light in four rows, and nothing in a hurry.':
    'Lykter i fire rader, og ingenting som haster.',
  'Candle smoke and warm wax; the keep is still awake.':
    'Voksrøyk og varmt voks; borgen er fortsatt våken.',
  'Ash from old stars, rising without sound.':
    'Aske fra gamle stjerner, som stiger uten lyd.',
  'Brass dust over the keepsake stall.': 'Messingstøv over minremarken.',
  'Embers from twenty-five windows, drifting loose.':
    'Glør fra tjuefem vinduer, på drift.',
  'Glass glints among the apple rows.': 'Glassglitter mellom epleradene.',
  'Amber sparks off the doubling lanterns.':
    'Ravgule gnister fra doblingslyktene.',
  'Pale petals on a cold, bright garden.':
    'Bleke kronblader i en kald, klar hage.',
  'Clay dust settling over the courtyard.':
    'Leirstøv som legger seg over gårdsplassen.',
  'Fireflies following the aqueduct down to the water.':
    'Ildfluer som følger akvedukten ned mot vannet.',
  'Mist on the long bridge, and the water beneath it.':
    'Dis på den lange broen, og vannet under den.',
  'The whole valley from the ridge, every table at once.':
    'Hele dalen fra kammen, alle bord på én gang.',
  'Ink, brass and a lamp left on over the map.':
    'Blekk, messing og en lampe som står på over kartet.',

  // ---- the field book
  'Field book': 'Feltboka',
  'Notes from the valley': 'Notater fra dalen',
  '{n} of 19 found': '{n} av 19 funnet',
  'Open the field book': 'Åpne feltboka',
  'Not yet found': 'Ikke funnet ennå',
  Sightings: 'Observasjoner',
  'Six small things to notice around the valley. They live on the front page.':
    'Seks små ting å legge merke til i dalen. De bor på forsiden.',
  'Every mark is a memory, not a duty.': 'Hvert merke er et minne, ikke en plikt.',
  'The map is drawn by walking it.': 'Kartet tegnes ved å gå det.',
  'Look closer at {name}': 'Se nærmere på {name}',
  'Sit with {name} again': 'Sitt med {name} igjen',
  'the fireflies': 'ildfluene',
  'the cat': 'katten',
  'the snail': 'snilen',
  'the stag': 'hjorten',
  'the wanderer': 'vandreren',
  'the tower window': 'tårnvinduet',
  'The choir does not rehearse. It waits for the first answer, then follows it.':
    'Koret øver ikke. Det venter på det første svaret, og følger det.',
  'From the far end of the hall the same seven questions sound like new ones.':
    'Fra den andre enden av salen høres de samme sju spørsmålene som nye.',
  'Four grids, and not one lantern touches another. The valley sleeps in the gaps.':
    'Fire rutenett, og ikke én lykt rører en annen. Dalen sover i mellomrommene.',
  'The keep keeps every rule and no clock. Candlelight is the only pressure.':
    'Borgen holder alle regler og ingen klokke. Levende lys er det eneste presset.',
  'Ten stars fell here. The first stone you turn is always safe; the rest is arithmetic and nerve.':
    'Ti stjerner falt her. Den første steinen du snur er alltid trygg; resten er regning og nerve.',
  'The market remembers faces. Turn two at a time and the stall gives one honest peek.':
    'Markedet husker ansikter. Snu to om gangen, og boden gir én ærlig titt.',
  'Twenty-five windows. Press one and its neighbours answer; the sky comes through when all are shut.':
    'Tjuefem vinduer. Trykk på ett, og naboene svarer; himmelen slipper inn når alle er lukket.',
  'In the glass orchard everything grows in a straight line, until it turns.':
    'I glasshagen vokser alt i rett linje, helt til det svinger.',
  'Two lanterns of the same size become one. Keep doubling until the room is bright.':
    'To lykter av samme størrelse blir én. Doble til rommet er lyst.',
  'The garden is generous: every line you trap comes back in your own colour.':
    'Hagen er gavmild: hver linje du fanger, kommer tilbake i din egen farge.',
  'On warm clay a capture is compulsory, and a crown is only a longer way of walking.':
    'På varm leire er et slag påbudt, og en krone er bare en lengre måte å gå på.',
  'Water falls four deep in the aqueduct. Line the lanterns and the whole channel lights.':
    'Vannet faller fire dypt i akvedukten. Still lyktene på linje, og hele kanalen lyser.',
  'The bridge is long enough for one more tile. Empty your hand and the water stays quiet.':
    'Broen er lang nok til én brikke til. Tøm hånden, og vannet holder seg stille.',
  'Five small lights keep their own time above the meadow. They never land.':
    'Fem små lys holder sin egen tid over enga. De lander aldri.',
  'The cat on the fence has watched every table in the valley and approves of none.':
    'Katten på gjerdet har sett hvert bord i dalen og godkjenner ingen av dem.',
  'A snail crosses the meadow all night and arrives exactly where it meant to.':
    'En snile krysser enga hele natten og kommer nøyaktig dit den ville.',
  'The stag walks the ridge at his own pace, antlers first, and never hurries for anyone.':
    'Hjorten går over kammen i sitt eget tempo, med gevir først, og haster aldri for noen.',
  'The wanderer carries the only lantern on the road. It is always the same size as yours.':
    'Vandreren bærer den eneste lykten på veien. Den er alltid like stor som din.',
  'One window in the keep is lit all night. Nobody has ever been seen inside it.':
    'Ett vindu i borgen er tent hele natten. Ingen har noen gang sett noen der inne.',

  // ---- night sound
  'Night sound': 'Nattlyd',
  'A soft, slow pad per chapter. Off by default; nothing plays until you ask.':
    'En myk, langsom pad per kapittel. Av som standard; ingenting spilles før du ber om det.',
  'Hear it': 'Hør den',
  Quiet: 'Dempet',
  Full: 'Kraftig',
  'Night sound level': 'Nivå for nattlyd',
  'The field book keeps only the notes and sightings you have found, in this browser.':
    'Feltboka tar bare vare på notatene og observasjonene du har funnet, i denne nettleseren.',
  'Deleting your data removes your results, streak, name, side-game records, Atlas seals and field notes immediately.':
    'Sletting fjerner resultatene, rekken, navnet, siderecordene, atlasseglene og feltnotatene dine med en gang.',

  // ---- deep night: places, dispatch, word well, memory bell
  'Word Well': 'Ordkilden',
  'The Word Well': 'Ordkilden',
  'Memory Bell': 'Minneklokken',
  'The Memory Bell': 'Minneklokken',
  words: 'ord',
  bells: 'klokker',
  'Seventeen places on one road: seven nightly boards and ten side tables. A new board every night, one attempt each.':
    'Sytten steder på én vei: sju nattlige brett og ti sidebord. Et nytt brett hver natt, ett forsøk hver.',
  'Seventeen places on one road: seven nightly boards and ten side tables. The map only remembers what you have already played.':
    'Sytten steder på én vei: sju nattlige brett og ti sidebord. Kartet husker bare det du allerede har spilt.',
  'Five letters are lowered into the well each night. Six guesses bring them up; green is the right letter in the right place.':
    'Fem bokstaver fires ned i brønnen hver natt. Seks gjetninger henter dem opp; grønt er riktig bokstav på riktig sted.',
  '5 letters · 6 guesses': '5 bokstaver · 6 gjetninger',
  'Four bells keep the order they were rung. Repeat it until the wooden tower runs out of notes.':
    'Fire klokker holder rekkefølgen de ble ringt i. Gjenta den til tretårnet går tom for toner.',
  '4 bells · 12 rounds': '4 klokker · 12 runder',
  'Best {n} rounds': 'Beste {n} runder',
  'Best {n} guesses': 'Beste {n} gjetninger',
  'Bell {n} steps': 'Klokke {n} trinn',
  'The Word Well note': 'En steinbrønn under furuene, og fem bokstaver på vannet.',
  'Five letters are lowered into the well each night; six guesses bring them back.':
    'Fem bokstaver fires ned i brønnen hver natt; seks gjetninger henter dem opp.',
  'Four bells keep the order they were rung; repeat it until the tower forgets you.':
    'Fire klokker holder rekkefølgen de ble ringt i; gjenta den til tårnet glemmer deg.',
  'Word Well · Night {n}': 'Ordkilden · Natt {n}',
  'Memory Bell · Night {n}': 'Minneklokken · Natt {n}',
  'Five letters are lowered into the well each night. Six guesses bring them back; green is the right letter in the right place, amber is the right letter in the wrong one.':
    'Fem bokstaver fires ned i brønnen hver natt. Seks gjetninger henter dem opp; grønt er riktig bokstav på riktig sted, gult er riktig bokstav på feil sted.',
  'Word Well mode': 'Modus for Ordkilden',
  'The same five letters for everyone today': 'De samme fem bokstavene for alle i dag',
  'Today’s word was {answer} — {n} guesses.': 'Dagens ord var {answer} — {n} gjetninger.',
  'A fresh word, not counted in the daily record': 'Et nytt ord, utenom dagsrekorden',
  Guess: 'Gjetning',
  'Six tries, one word': 'Seks forsøk, ett ord',
  'Drawn up in {n}': 'Heist opp på {n}',
  'The well keeps it: {answer}': 'Brønnen beholder det: {answer}',
  'Word Well board, six guesses of five letters': 'Ordkilden-brett, seks gjetninger på fem bokstaver',
  hit: 'riktig sted',
  near: 'riktig bokstav',
  miss: 'ikke i ordet',
  'Five letters, no more and no less.': 'Fem bokstaver, ikke mer og ikke mindre.',
  'The well does not know that word.': 'Brønnen kjenner ikke det ordet.',
  'Today’s word is already drawn. Free play is open.': 'Dagens ord er allerede hentet opp. Fritt spill er åpent.',
  '“{answer}” came up in {n} guesses.': '«{answer}» kom opp på {n} gjetninger.',
  'The word was “{answer}”. The well is patient; come back at midnight.':
    'Ordet var «{answer}». Brønnen er tålmodig; kom tilbake ved midnatt.',
  'Copy the grid': 'Kopier rutenettet',
  'Copied — the grid leaves the answers out.': 'Kopiert — rutenettet utelater svarene.',
  'The clipboard is closed in this browser.': 'Utklippstavlen er stengt i denne nettleseren.',
  'Letter keyboard': 'Bokstavtastatur',
  Enter: 'Send',
  Erase: 'Slett',
  'New word': 'Nytt ord',
  'Tonight’s dispatch': 'Nattens sending',
  'Memory Bell description': 'Fire klokker i et tretårn. Tårnet ringer en kort rekkefølge; gjenta den. Hver runde legger til én tone, og én feil klokke avslutter natten.',
  Round: 'Runde',
  Notes: 'Toner',
  'Today: {n} rounds': 'I dag: {n} runder',
  'Listen: the tower is ringing {n} notes.': 'Lytt: tårnet ringer {n} toner.',
  'Your turn: repeat the {n} notes.': 'Din tur: gjenta de {n} tonene.',
  'The tower bows. {n} rounds held.': 'Tårnet bukker. {n} runder holdt.',
  'A wrong bell. The tower forgets you at {n} rounds.': 'Feil klokke. Tårnet glemmer deg ved {n} runder.',
  'Four bells, one order. Begin when you are ready.': 'Fire klokker, én rekkefølge. Begynn når du er klar.',
  'Four bells': 'Fire klokker',
  'the low bell': 'den lave klokken',
  'the reed bell': 'rørklokken',
  'the glass bell': 'glassklokken',
  'the high bell': 'den høye klokken',
  'All twelve rounds held. The tower has nothing left to teach you.':
    'Alle tolv runder holdt. Tårnet har ingenting mer å lære deg.',
  '{n} rounds held. The order was {seq}.': '{n} runder holdt. Rekkefølgen var {seq}.',
  'Ring again': 'Ring igjen',
  'The arcade': 'Arkaden',
  Restart: 'Start på nytt',
  'Sound is the tower’s real language; the lights only help. Turn sound on in Settings to hear the notes.':
    'Lyd er tårnets egentlige språk; lysene hjelper bare. Slå på lyd i Innstillinger for å høre tonene.',
  'The Long Road · Volume {season} · Night {n}': 'Den lange veien · Bind {season} · Natt {n}',
  'Tonight’s three stops': 'Nattens tre stopp',
  'Your line': 'Din linje',
  'You lit {lit} of 3 stops tonight': 'Du tente {lit} av 3 stopp i natt',
  '{n} points across the night': '{n} poeng gjennom natten',
  'You have not lit a stop tonight. The road is still open until midnight.':
    'Du har ikke tent et stopp i natt. Veien er åpen til midnatt.',
  'This night kept {lit} lit stops in this browser. The dispatch stays the same; only your line changes.':
    'Denne natten hadde {lit} tente stopp i denne nettleseren. Sendingen er den samme; bare din linje endres.',
  'Enter the choir': 'Gå inn i koret',
  'The season': 'Sesongen',
  'Volume {season} · {n} of {total} nights written': 'Bind {season} · {n} av {total} netter skrevet',
  'The last seven nights': 'De siste sju nettene',
  'Dispatches are written from the night, not from your score: the same date reads the same everywhere. Your line is the only part that is yours.':
    'Sendingene er skrevet fra natten, ikke fra poengsummen din: samme dato leses likt overalt. Bare din linje er din.',
  'This is the first night of the road.': 'Dette er veiens første natt.',
  'Written by the keeper': 'Skrevet av vokteren',
  'Carried in from the road': 'Båret inn fra veien',
  'Sung at the far end': 'Sunget i den andre enden',
  'Long rain': 'Langt regn',
  'Rising wind': 'Stigende vind',
  'Fireflies': 'Ildfluer',
  'Storm': 'Storm',
  'Still air': 'Stille luft',
  'Warm air over the water; the valley stays out a little longer.':
    'Varm luft over vannet; dalen blir ute litt lenger.',
  'Rain and a low sky; the lightning reads the rooftops once.':
    'Regn og lav himmel; lynet leser takene én gang.',
  'Rain on every roof; the boards keep their own dry hour.':
    'Regn på hvert tak; brettene holder sin egen tørre time.',
  'Wind in the pines, and the lanterns leaning away from it.':
    'Vind i furuene, og lyktene som lener seg bort fra den.',
  'No weather at all; the valley holds its breath until dawn.':
    'Ikke noe vær i det hele tatt; dalen holder pusten til daggry.',
  'Four bells in a wooden tower. The tower rings a short order; repeat it back. Every round adds one note, and one wrong bell ends the night.':
    'Fire klokker i et tretårn. Tårnet ringer en kort rekkefølge; gjenta den. Hver runde legger til én tone, og én feil klokke avslutter natten.',
  'Five letters are lowered into the well each night; six guesses bring them back. Green is place, amber is presence.':
    'Fem bokstaver fires ned i brønnen hver natt; seks gjetninger henter dem opp. Grønt er sted, gult er tilstedeværelse.',
  'The word well: five letters, six guesses, green for place and amber for presence.':
    'Ordkilden: fem bokstaver, seks gjetninger, grønt for sted og gult for tilstedeværelse.',
  'The memory tower: four bells, one order, one more note every round.':
    'Minnetårnet: fire klokker, én rekkefølge, én tone mer for hver runde.',
  '{n} rounds held': '{n} runder holdt',

  // ---- first night
  'First night': 'Første natt',
  'Step 1 of 3 · The light': 'Steg 1 av 3 · Lyset',
  'Step 2 of 3 · One rule': 'Steg 2 av 3 · Én regel',
  'Step 3 of 3 · Tonight': 'Steg 3 av 3 · I natt',
  'Noct is read at night. Pick the light you want to sit in; it can change any time in Settings, along with sound and motion.':
    'Noct leses om natten. Velg lyset du vil sitte i; det kan endres når som helst i Innstillinger, sammen med lyd og bevegelse.',
  'On tonight’s table: {score} · #{rank}': 'På kveldens bord: {score} · #{rank}',
  'A shared night': 'En delt natt',
  '{name} scored {score} — beat it.': '{name} fikk {score} — slå den.',
  Dismiss: 'Lukk',
  'A player': 'En spiller',
  '{name} scored {score}. Beat it: {link}': '{name} fikk {score}. Slå den: {link}',
  'Send the night': 'Send natten',
  'A link to today’s board with your score on it. Whoever opens it sees the line, not your streak.':
    'En lenke til dagens brett med poengsummen din. Den som åpner den ser linjen, ikke streaken din.',
  'Copy challenge link': 'Kopier utfordringslenke',
  'Link copied': 'Lenke kopiert',
  Nightly: 'Nattlige',
  'No scores on this table tonight': 'Ingen poeng på dette bordet i natt',
  'Finish a Word Well or a Memory Bell run today and it lands here, with the board it was played on.':
    'Fullfør en Word Well- eller Memory Bell-runde i dag, så lander den her, med brettet den ble spilt på.',
  'Play this table': 'Spill dette bordet',
  'Side tables': 'Sidebord',
  'Kept with your player, not just this browser.': 'Lagret med spilleren din, ikke bare i denne nettleseren.',
  '{n} plays': '{n} spill',
  'best {n}': 'beste {n}',
  'See the side tables': 'Se sidebordene',
  On: 'På',
  Off: 'Av',
  'Four boards of lanterns. One spark per row, column and tone — and never two touching, not even diagonally. Locked sparks are part of the answer.':
    'Fire brett med lykter. Én gnist per rad, kolonne og tone — og aldri to som rører hverandre, ikke engang diagonalt. Låste gnister er en del av svaret.',
  'A solved five by five board': 'Et løst fem ganger fem-brett',
  'Seven nightly boards and ten side tables. Play one, or all seventeen; nothing is lost by resting. The road on the front page is a suggestion, not a duty.':
    'Sju nattlige brett og ti sidebord. Spill ett, eller alle sytten; ingenting går tapt av å hvile. Veien på forsiden er et forslag, ikke en plikt.',
  'At midnight UTC the boards change. Until then, one attempt each.':
    'Ved midnatt UTC skifter brettene. Inntil da: ett forsøk hver.',

  /* The stone circle and the hermit's cross. */
  Mancala: 'Mancala',
  'Peg Solitaire': 'Pinnespill',
  'The Stone Circle': 'Steinsirkelen',
  'The Hermit’s Cross': 'Eremittkorset',
  'The stone circle': 'Steinsirkelen',
  'The hermit’s cross': 'Eremittkorset',
  stones: 'steiner',
  solitaire: 'solitaire',
  'Mancala · Night {n}': 'Mancala · Natt {n}',
  'Peg solitaire · Night {n}': 'Pinnespill · Natt {n}',
  'Sow stones counter-clockwise from one of your six cups. The last stone in your own store buys another turn; the last stone in an empty cup takes the opposite cup. When one side runs dry, the fuller store wins.':
    'Så steiner mot klokken fra en av de seks koppene dine. Den siste steinen i din egen skål gir en ny tur; den siste steinen i en tom kopp tar koppen rett overfor. Når én side går tom, vinner den fyldigste skålen.',
  'A jump takes one peg over its neighbour and into an empty hole, removing the jumped peg. Clear the cross down to a single peg. The centre starts empty; the rest is patience.':
    'Et hopp tar en pinne over naboen og inn i et tomt hull, og fjerner pinnen som ble hoppet over. Tøm korset ned til én pinne. Midten starter tom; resten er tålmodighet.',
  'Six cups each · four stones': 'Seks kopper hver · fire steiner',
  'your store': 'din skål',
  'bot store': 'botens skål',
  sowings: 'såinger',
  'Best {n} stones': 'Beste {n} steiner',
  'Best {n} pegs': 'Beste {n} pinner',
  'Best 1 peg': 'Beste 1 pinne',
  '1 peg left': '1 pinne igjen',
  '1 perfect cross': '1 perfekt kors',
  'Best {n} stones · {wins}W': 'Beste {n} steiner · {wins}V',
  'Sow cup {n}: {count} stones': 'Så kopp {n}: {count} steiner',
  'Restart the circle': 'Start sirkelen på nytt',
  'Extra turn — the last stone reached your store.': 'Ekstra tur — den siste steinen nådde skålen din.',
  'Your store is fuller. The circle is yours.': 'Skålen din er fyldigst. Sirkelen er din.',
  'The bot keeps the fuller store.': 'Boten beholder den fyldigste skålen.',
  'Two even stores. The stones call it a draw.': 'To jevne skåler. Steinene kaller det uavgjort.',
  'Your turn. Choose one of your six cups.': 'Din tur. Velg en av de seks koppene dine.',
  'The bot is sowing.': 'Boten sår.',
  'Mancala board': 'Mancala-brett',
  'Four stones in every cup when the circle opens. The daily circle is kept in this browser.':
    'Fire steiner i hver kopp når sirkelen åpner. Den daglige sirkelen lagres i denne nettleseren.',
  'pegs left': 'pinner igjen',
  jumps: 'hopp',
  'perfect crosses': 'perfekte kors',
  'One peg left. The hermit would approve.': 'Én pinne igjen. Eremitten ville nikke.',
  'No more jumps. {n} pegs remain.': 'Ingen flere hopp. {n} pinner igjen.',
  'Choose a peg, then an empty hole two steps away.': 'Velg en pinne, deretter et tomt hull to steg unna.',
  '{n} jumps open from this peg.': '{n} hopp åpner seg fra denne pinnen.',
  'Peg solitaire cross': 'Pinnespill-kors',
  'Peg at row {row}, column {col}': 'Pinne i rad {row}, kolonne {col}',
  'Empty hole at row {row}, column {col}': 'Tomt hull i rad {row}, kolonne {col}',
  'The hermit keeps only your best cross in this browser.': 'Eremitten beholder bare ditt beste kors i denne nettleseren.',
  'Back to the arcade': 'Tilbake til arcaden',
  'One peg left': 'Én pinne igjen',
  '{n} pegs left': '{n} pinner igjen',
  'The stone circle: sow four stones, keep the extra turn, and take the opposite cup.':
    'Steinsirkelen: så fire steiner, behold ekstraturen og ta koppen rett overfor.',
  'The hermit’s cross: jump a peg over its neighbour, remove it, and try to leave one.':
    'Eremittkorset: hopp en pinne over naboen, fjern den, og prøv å la én bli igjen.',
  'The stone circle: sow four stones around twelve cups, keep the extra turn and take the opposite cup.':
    'Steinsirkelen: så fire steiner rundt tolv kopper, behold ekstraturen og ta koppen rett overfor.',
  'The hermit’s cross: jump a peg over its neighbour, remove it, and leave only one on the stone cross.':
    'Eremittkorset: hopp en pinne over naboen, fjern den, og la bare én bli igjen på steinkorset.',
  '12 cups · four stones': '12 kopper · fire steiner',
  '33 holes · one peg': '33 hull · én pinne',
  'Won · {n} stones': 'Vant · {n} steiner',
  'Four stones in every cup; sow the circle, take the extra turn, and keep the fuller store.':
    'Fire steiner i hver kopp; så rundt sirkelen, ta ekstraturen og behold den fyldigste skålen.',
  'Thirty-two pegs on a stone cross; jump until one is left and the hermit nods.':
    'Trettito pinner på et steinkors; hopp til én er igjen og eremitten nikker.',
  'Ten more tables wait in the {arcade}: the glass orchard (Snake), the doubling room (2048), the turning table (Reversi), the quiet draughts table (Checkers), the lantern column (Connect Four), the long table (Dominoes), the word well (Word Well), the memory bell (Memory Bell), the stone circle (Mancala) and the hermit’s cross (Peg Solitaire). Their records live in this browser and never touch the daily streak.':
    'Ti flere bord venter i {arcade}: glasslunden (Snake), doblingsrommet (2048), vendebordet (Reversi), det stille damspillet (Checkers), lyktesøylen (Connect Four), langbordet (Dominoes), ordbrønnen (Word Well), minnebjellen (Memory Bell), steinsirkelen (Mancala) og eremittkorset (Peg Solitaire). Rekordene deres lever i denne nettleseren og rører aldri den daglige rekken.',
  'Most side tables are complete games against a bot, with a local record. The hermit’s cross is a solo puzzle. These are the rules that matter once you sit down.':
    'De fleste sidebord er komplette spill mot en bot, med lokal rekord. Eremittkorset er et solopuzzle. Dette er reglene som betyr noe når du først sitter ned.',
  'sow counter-clockwise from one of your six cups. The last stone in your store buys another turn; the last stone in an empty cup takes the opposite cup. When one side runs dry, the fuller store wins.':
    'så mot klokken fra en av de seks koppene dine. Den siste steinen i skålen din gir en ny tur; den siste steinen i en tom kopp tar koppen rett overfor. Når én side går tom, vinner den fyldigste skålen.',
  'a jump removes the peg it passes over. Clear the stone cross down to one peg; the centre starts empty, and undo is free.':
    'et hopp fjerner pinnen det hopper over. Tøm steinkorset ned til én pinne; midten starter tom, og angre er gratis.',
  'Four of these tables are also nightly boards. The atlas gathers all seventeen places and keeps the road between them.':
    'Fire av disse bordene er også nattlige brett. Atlaset samler alle sytten stedene og holder veien mellom dem.',
  'Won · {n} drops': 'Vant · {n} dråper',
  'The map of seventeen places': 'Kartet over sytten steder',

  /* Shared side-table cards. */
  'A shared circle': 'En delt sirkel',
  'A shared cross': 'Et delt kors',
  '{level} bot': '{level} bot',
  'Classic cross': 'Klassisk kors',
  'Shared circle · {level} bot': 'Delt sirkel · {level} bot',
  '1 stone': '1 stein',
  '{n} stones': '{n} steiner',
  '1 sowing': '1 såing',
  '{n} sowings': '{n} såinger',
  '1 jump': '1 hopp',
  '{n} jumps': '{n} hopp',
  '1 peg': '1 pinne',
  '{n} pegs': '{n} pinner',
  '{name} kept {stones} in {moves}.': '{name} beholdt {stones} på {moves}.',
  '{name} left {pegs} in {moves}.': '{name} lot {pegs} stå på {moves}.',
  '{name} kept {stones} in {moves} — beat it.': '{name} beholdt {stones} på {moves} — slå den.',
  '{name} left {pegs} in {moves} — beat it.': '{name} lot {pegs} stå på {moves} — slå den.',
  'You beat {name}’s circle': 'Du slo sirkelen til {name}',
  '{name} still holds it': '{name} holder den fortsatt',
  'A dead heat': 'Dødt løp',
  'You beat {name}’s cross': 'Du slo korset til {name}',
  '{name}’s cross still stands': 'Korset til {name} står fortsatt',
  'Friendly replay · today’s record is unchanged.':
    'Vennlig omspill · dagens rekord er uendret.',
  'Result · Night {n}': 'Resultat · Natt {n}',
  'Result card': 'Resultatkort',
  'Noct · {game} · Night {n}': 'Noct · {game} · Natt {n}',
  '{moves} · {result}': '{moves} · {result}',
  '{moves} · perfect cross': '{moves} · perfekt kors',
  '{moves} · {pegs} left': '{moves} · {pegs} igjen',
  'Beat it: {link}': 'Slå den: {link}',
  'Challenge a friend: {link}': 'Utfordre en venn: {link}',

  /* ---- crates */
  Crates: 'Kasser',
  crates: 'kasser',
  'The crate yard': 'Krattegården',
  'The Crate Yard': 'Krattegården',
  'Crates · Night {n}': 'Kasser · Natt {n}',
  'Crates mode': 'Kassemodus',
  'The same yard for everyone today': 'Samme gård for alle i dag',
  'A fresh yard every restart': 'En ny gård ved hver start',
  pushes: 'dytt',
  'marks left': 'merker igjen',
  'Best today {n} moves': 'Beste i dag: {n} trekk',
  'Yard {n}': 'Gård {n}',
  'Crate yard, 7 by 7': 'Krattegård, 7 × 7',
  'crate on a mark': 'kasse på merke',
  crate: 'kasse',
  'chalk mark': 'krittmerke',
  wall: 'vegg',
  floor: 'gulv',
  'Move the crate keeper': 'Flytt kassevokteren',
  'Move up': 'Gå opp',
  'Move down': 'Gå ned',
  'Move left': 'Gå til venstre',
  'Move right': 'Gå til høyre',
  'Yard cleared in {moves} moves and {pushes} pushes.': 'Gården er ryddet på {moves} trekk og {pushes} dytt.',
  '{n} marks still waiting. Arrow keys or WASD move; Z undoes.': '{n} merker venter fortsatt. Piltastene eller WASD flytter; Z angrer.',
  'Next yard': 'Neste gård',
  'New yard': 'Ny gård',
  'The crate yard: walk freely, push one crate at a time, and cover every chalk mark without pulling anything back.':
    'Krattegården: gå fritt, dytt én kasse om gangen og dekk hvert krittmerke uten å dra noe tilbake.',
  'Chalk marks, stacked crates and a keeper who can push but never pull.':
    'Krittmerker, stablet kasser og en vokter som kan dytte, men aldri dra.',
  'walk freely, but push only one crate at a time. A crate cannot be pulled, so plan the corners before you commit. Cover every chalk mark; undo and restart are free.':
    'gå fritt, men dytt bare én kasse om gangen. En kasse kan ikke dras, så planlegg hjørnene før du bestemmer deg. Dekk hvert krittmerke; angre og start på nytt er gratis.',
  'Push every crate onto a chalk mark. You can walk around freely, but you can only push, never pull. Undo is free; the daily yard is the same for everyone.':
    'Dytt hver kasse inn på et krittmerke. Du kan gå fritt rundt, men du kan bare dytte, aldri dra. Angre er gratis; dagens gård er den samme for alle.',
  '7×7 · push only': '7×7 · bare dytt',

  /* ---- dots & boxes */
  'Dots & Boxes': 'Prikker og ruter',
  threads: 'tråder',
  'The thread loom': 'Trådveven',
  'The Thread Loom': 'Trådveven',
  'Dots & Boxes · Night {n}': 'Prikker og ruter · Natt {n}',
  'Dots & Boxes mode': 'Prikker og ruter-modus',
  'The same loom for everyone today': 'Samme vev for alle i dag',
  yours: 'dine',
  loom: 'veven',
  'threads left': 'tråder igjen',
  'Today {n} boxes': 'I dag: {n} ruter',
  'Final {you}–{loom}': 'Slutt {you}–{loom}',
  'Best +{n}': 'Beste +{n}',
  'Dots & Boxes board, four by four boxes': 'Prikker og ruter-brett, fire ganger fire ruter',
  'Horizontal thread at row {row}, column {col}': 'Vannrett tråd i rad {row}, kolonne {col}',
  'Vertical thread at row {row}, column {col}': 'Loddrett tråd i rad {row}, kolonne {col}',
  'The loom is thinking.': 'Veven tenker.',
  'Your turn. Draw a line; close a box to keep the turn.': 'Din tur. Trekk en linje; lukk en rute for å beholde turen.',
  'You win the loom, {you}–{loom}.': 'Du vinner over veven, {you}–{loom}.',
  'The loom wins this one, {loom}–{you}.': 'Veven vinner denne, {loom}–{you}.',
  'A draw at {you}–{loom}. The last thread belongs to neither of you.':
    'Uavgjort {you}–{loom}. Den siste tråden tilhører ingen av dere.',
  'You win {you}–{loom} · margin +{margin}': 'Du vinner {you}–{loom} · margin +{margin}',
  'The loom wins {loom}–{you}': 'Veven vinner {loom}–{you}',
  'A draw at {you}–{loom}': 'Uavgjort {you}–{loom}',
  'New cloth': 'Nytt stoff',
  'The thread loom: draw one line between two dots, close a box to keep the turn, and leave the loom with fewer rooms.':
    'Trådveven: trekk én linje mellom to prikker, lukk en rute for å beholde turen og la veven sitte igjen med færre rom.',
  'Forty threads between twenty-five dots; close a box and keep the shuttle.':
    'Førti tråder mellom tjuefem prikker; lukk en rute og behold skyttelen.',
  'draw one line between two neighbouring dots. Close the fourth side of a box to claim it and keep your turn. The loom answers on its own; the fuller side of the finished cloth wins.':
    'trekk én linje mellom to naboprikker. Lukk den fjerde siden av en rute for å ta den og beholde turen. Veven svarer selv; den fyldigste siden av det ferdige stoffet vinner.',
  'Draw one thread between two dots. Close the fourth side of a box to claim it and take another turn. The loom answers in kind; the fuller side of the cloth wins.':
    'Trekk én tråd mellom to prikker. Lukk den fjerde siden av en rute for å ta den og få en ny tur. Veven svarer på samme måte; den fyldigste siden av stoffet vinner.',
  '5×5 dots · 4×4 boxes': '5×5 prikker · 4×4 ruter',

  /* ---- updated catalogue counts */
  'Nineteen places on one road: seven nightly boards and twelve side tables. A new board every night, one attempt each.':
    'Nitten steder på én vei: sju nattlige brett og tolv sidebord. Et nytt brett hver natt, ett forsøk hver.',
  'Nineteen places on one road: seven nightly boards and twelve side tables. The map only remembers what you have already played.':
    'Nitten steder på én vei: sju nattlige brett og tolv sidebord. Kartet husker bare det du allerede har spilt.',
  'Seven nightly boards and twelve side tables. Play one, or all nineteen; nothing is lost by resting. The road on the front page is a suggestion, not a duty.':
    'Sju nattlige brett og tolv sidebord. Spill ett, eller alle nitten; ingenting går tapt av å hvile. Veien på forsiden er et forslag, ikke en plikt.',
  'The map of nineteen places': 'Kartet over nitten steder',
  'Sixteen tables, four of them nightly boards': 'Seksten bord, fire av dem nattlige brett',
  'Four of these tables are also nightly boards. The atlas gathers all nineteen places and keeps the road between them.':
    'Fire av disse bordene er også nattlige brett. Atlaset samler alle nitten stedene og holder veien mellom dem.',
  'Twelve more tables wait in the {arcade}: the glass orchard (Snake), the doubling room (2048), the turning table (Reversi), the quiet draughts table (Checkers), the lantern column (Connect Four), the long table (Dominoes), the word well (Word Well), the memory bell (Memory Bell), the stone circle (Mancala), the hermit’s cross (Peg Solitaire), the crate yard (Crates) and the thread loom (Dots & Boxes). Their records live in this browser and never touch the daily streak.':
    'Tolv flere bord venter i {arcade}: glasslunden (Snake), doblingsrommet (2048), vendebordet (Reversi), det stille damspillet (Checkers), lyktesøylen (Connect Four), langbordet (Dominoes), ordbrønnen (Word Well), minnebjellen (Memory Bell), steinsirkelen (Mancala), eremittkorset (Peg Solitaire), krattegården (Crates) og trådveven (Dots & Boxes). Rekordene deres lever i denne nettleseren og rører aldri den daglige rekken.',
  'Most side tables are complete games against a bot, with a local record. The hermit’s cross and the crate yard are solo puzzles. These are the rules that matter once you sit down.':
    'De fleste sidebord er komplette spill mot en bot, med lokal rekord. Eremittkorset og krattegården er solopuzzle. Dette er reglene som betyr noe når du først sitter ned.',
  'The Hollow Atlas gathers all nineteen places into one road. Each place keeps three marks: a waymark for a first visit, a night mark for today, and a keepsake for a personal record. The nightly route suggests three stops, but it never locks a door or breaks a streak.':
    'Det hule atlaset samler alle nitten stedene til én vei. Hvert sted holder tre merker: et veimerke for første besøk, et nattmerke for i dag og et minne for en personlig rekord. Den nattlige ruten foreslår tre stopp, men låser aldri en dør eller bryter en rekke.',
};