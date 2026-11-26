/**
 * The field book: a memory of the valley, not a mechanic.
 *
 * Three pages per place — one for arriving, one for staying a night, one for
 * keeping something — plus six sightings in the home scene. Every page is
 * unlocked by the marks the atlas already derives, so no progress is stored
 * twice. Only the sightings need their own list.
 *
 * Prose lives here in both languages: it is content, and it is read as text,
 * not looked up as a UI key.
 */
import { PLACES, placeView, type AtlasSources, type PlaceId, type PlaceMarks } from './atlas.ts';
import type { Lang } from './i18n.ts';

const KEY = 'noct.journal.v1';

export type PageTier = 'waymark' | 'night' | 'keepsake';

export interface FieldPage {
  place: PlaceId;
  tier: PageTier;
  en: string;
  nb: string;
}

export const PAGE_TIER_LABEL: Record<PageTier, { en: string; nb: string }> = {
  waymark: { en: 'Arrival', nb: 'Ankomst' },
  night: { en: 'A night here', nb: 'En natt her' },
  keepsake: { en: 'Keepsake', nb: 'Minne' },
};

export const FIELD_PAGES: readonly FieldPage[] = [
  {
    place: 'common',
    tier: 'waymark',
    en: 'The choir does not rehearse. It waits for the first answer, then follows it.',
    nb: 'Koret øver ikke. Det venter på det første svaret, og følger det.',
  },
  {
    place: 'common',
    tier: 'night',
    en: 'By the seventh prompt the hall has found a key, and the key is whatever the loudest voice chose first. Nobody admits to hearing it.',
    nb: 'Ved det sjuende spørsmålet har salen funnet en tone, og tonen er det den sterkeste stemmen valgte først. Ingen innrømmer å høre det.',
  },
  {
    place: 'common',
    tier: 'keepsake',
    en: 'A perfect choir night leaves no echo at all. The valley simply sounds the way it sounded before anyone arrived, which is the compliment.',
    nb: 'En perfekt kornatt etterlater ikke noe ekko. Dalen høres rett og slett ut som før noen kom, og det er komplimentet.',
  },
  {
    place: 'rare',
    tier: 'waymark',
    en: 'From the far end of the hall the same seven questions sound like new ones.',
    nb: 'Fra den andre enden av salen høres de samme sju spørsmålene som nye.',
  },
  {
    place: 'rare',
    tier: 'night',
    en: 'The hall rewards the answer nobody else gave, then hides it in the same silence it came from. You will not hear it again.',
    nb: 'Salen belønner svaret ingen andre ga, og gjemmer det så i den samme stillheten det kom fra. Du hører det ikke igjen.',
  },
  {
    place: 'rare',
    tier: 'keepsake',
    en: 'One chair in the empty hall is warmer than the rest. The keeper insists it is the draught, and the keeper is a terrible liar.',
    nb: 'Én stol i den tomme salen er varmere enn de andre. Vokteren insisterer på at det er trekken, og vokteren lyver elendig.',
  },
  {
    place: 'noct',
    tier: 'waymark',
    en: 'Four grids, and not one lantern touches another. The valley sleeps in the gaps.',
    nb: 'Fire rutenett, og ikke én lykt rører en annen. Dalen sover i mellomrommene.',
  },
  {
    place: 'noct',
    tier: 'night',
    en: 'Each board is a window; finishing it is the moment the room behind the window is allowed to be dark.',
    nb: 'Hvert brett er et vindu; å fullføre det er øyeblikket rommet bak vinduet får lov til å være mørkt.',
  },
  {
    place: 'noct',
    tier: 'keepsake',
    en: 'A clean night, four lanterns lit without a hint, is the only thing the grid ever remembers. It remembers it by going completely still.',
    nb: 'En ren natt, fire lykter tent uten hint, er det eneste rutenettet husker. Det husker det ved å bli helt stille.',
  },
  {
    place: 'chess',
    tier: 'waymark',
    en: 'The keep keeps every rule and no clock. Candlelight is the only pressure.',
    nb: 'Borgen holder alle regler og ingen klokke. Levende lys er det eneste presset.',
  },
  {
    place: 'chess',
    tier: 'night',
    en: 'On the long table the pieces are warm before the game starts, as if someone has been sitting here, thinking, for a very long time.',
    nb: 'På det lange bordet er brikkene varme før partiet begynner, som om noen har sittet her og tenkt i svært lang tid.',
  },
  {
    place: 'chess',
    tier: 'keepsake',
    en: 'The bot does not gloat and does not console. It simply sets the pieces back, which is the most honest sportsmanship in the valley.',
    nb: 'Boten hoverer ikke og trøster ikke. Den setter bare brikkene tilbake, som er dalens ærligste fair play.',
  },
  {
    place: 'mines',
    tier: 'waymark',
    en: 'Ten stars fell here. The first stone you turn is always safe; the rest is arithmetic and nerve.',
    nb: 'Ti stjerner falt her. Den første steinen du snur er alltid trygg; resten er regning og nerve.',
  },
  {
    place: 'mines',
    tier: 'night',
    en: 'The field is a sky turned inside out. What you are clearing is not ground but darkness, one honest square at a time.',
    nb: 'Marken er en himmel vendt på vrangen. Det du rydder er ikke grunn, men mørke, én ærlig rute om gangen.',
  },
  {
    place: 'mines',
    tier: 'keepsake',
    en: 'The keeper marks a cleared field with a single small flag and no explanation. There are more flags up here than the valley admits.',
    nb: 'Vokteren markerer en ryddet mark med ett lite flagg og ingen forklaring. Det står flere flagg her oppe enn dalen innrømmer.',
  },
  {
    place: 'pairs',
    tier: 'waymark',
    en: 'The market remembers faces. Turn two at a time and the stall gives one honest peek.',
    nb: 'Markedet husker ansikter. Snu to om gangen, og boden gir én ærlig titt.',
  },
  {
    place: 'pairs',
    tier: 'night',
    en: 'Every keepsake on the shelf has a twin, and the twin is always the one you turned over first and forgot.',
    nb: 'Hvert minne på hyllen har en tvilling, og tvillingen er alltid den du snudde først og glemte.',
  },
  {
    place: 'pairs',
    tier: 'keepsake',
    en: 'The stall keeper will not sell you anything. The market is not for owning; it is for remembering what you already had.',
    nb: 'Bodeieren vil ikke selge deg noe. Markedet er ikke for å eie; det er for å huske det du allerede hadde.',
  },
  {
    place: 'lights',
    tier: 'waymark',
    en: 'Twenty-five windows. Press one and its neighbours answer; the sky comes through when all are shut.',
    nb: 'Tjuefem vinduer. Trykk på ett, og naboene svarer; himmelen slipper inn når alle er lukket.',
  },
  {
    place: 'lights',
    tier: 'night',
    en: 'The cottage is crooked because it was built around a tree, and the tree is still inside, pretending to be a staircase.',
    nb: 'Huset er skjevt fordi det ble bygget rundt et tre, og treet står fortsatt inne og later som det er en trapp.',
  },
  {
    place: 'lights',
    tier: 'keepsake',
    en: 'Clearing all twenty-five is not the point; the point is that the sky was there the whole time, behind a window you could have opened.',
    nb: 'Å tømme alle tjuefem er ikke poenget; poenget er at himmelen var der hele tiden, bak et vindu du kunne ha åpnet.',
  },
  {
    place: 'snake',
    tier: 'waymark',
    en: 'In the glass orchard everything grows in a straight line, until it turns.',
    nb: 'I glasshagen vokser alt i rett linje, helt til det svinger.',
  },
  {
    place: 'snake',
    tier: 'night',
    en: 'Twelve apples, one path. The orchard does not care how elegant the route was, only that you did not eat your own tail.',
    nb: 'Tolv epler, én sti. Hagen bryr seg ikke om hvor elegant ruten var, bare at du ikke spiste din egen hale.',
  },
  {
    place: 'snake',
    tier: 'keepsake',
    en: 'The glass rows are taller than they look. Somewhere above the apples there is a thirteenth, and it is always just out of reach.',
    nb: 'Glassradene er høyere enn de ser ut. Et sted over eplene finnes det et trettende, og det er alltid så vidt utenfor rekkevidde.',
  },
  {
    place: 'numbers',
    tier: 'waymark',
    en: 'Two lanterns of the same size become one. Keep doubling until the room is bright.',
    nb: 'To lykter av samme størrelse blir én. Doble til rommet er lyst.',
  },
  {
    place: 'numbers',
    tier: 'night',
    en: 'The room rewards patience over brilliance. Every slide that looks wasted is a door being closed somewhere you will not need to go.',
    nb: 'Rommet belønner tålmodighet fremfor briljans. Hvert skyv som ser bortkastet ut, er en dør som lukkes et sted du ikke trenger å gå.',
  },
  {
    place: 'numbers',
    tier: 'keepsake',
    en: 'A 512 tile is not a number. It is the room finally agreeing with you about how much light it can hold.',
    nb: 'En brikke på 512 er ikke et tall. Det er rommet som endelig er enig med deg i hvor mye lys det tåler.',
  },
  {
    place: 'reversi',
    tier: 'waymark',
    en: 'The garden is generous: every line you trap comes back in your own colour.',
    nb: 'Hagen er gavmild: hver linje du fanger, kommer tilbake i din egen farge.',
  },
  {
    place: 'reversi',
    tier: 'night',
    en: 'Bone and obsidian turn under the moon. The garden has no loyalty; it only has the last move.',
    nb: 'Bein og obsidian snur seg under månen. Hagen har ingen lojalitet; den har bare det siste trekket.',
  },
  {
    place: 'reversi',
    tier: 'keepsake',
    en: 'The gardener plants nothing and harvests nothing. She only turns the stones back over when nobody is looking, out of habit.',
    nb: 'Gartneren planter ingenting og høster ingenting. Hun snur bare steinene tilbake når ingen ser det, av vane.',
  },
  {
    place: 'checkers',
    tier: 'waymark',
    en: 'On warm clay a capture is compulsory, and a crown is only a longer way of walking.',
    nb: 'På varm leire er et slag påbudt, og en krone er bare en lengre måte å gå på.',
  },
  {
    place: 'checkers',
    tier: 'night',
    en: 'The courtyard keeps the day’s heat in its bricks. At night it gives it back slowly, like a story told in the wrong order.',
    nb: 'Gårdsplassen beholder dagens varme i teglsteinen. Om natten gir den den sakte tilbake, som en historie fortalt i feil rekkefølge.',
  },
  {
    place: 'checkers',
    tier: 'keepsake',
    en: 'A king in the back rank is the only promotion the valley recognises, and it is granted without a ceremony, only a longer walk.',
    nb: 'En konge i bakerste rad er den eneste forfremmelsen dalen anerkjenner, og den gis uten seremoni, bare med en lengre gange.',
  },
  {
    place: 'connect4',
    tier: 'waymark',
    en: 'Water falls four deep in the aqueduct. Line the lanterns and the whole channel lights.',
    nb: 'Vannet faller fire dypt i akvedukten. Still lyktene på linje, og hele kanalen lyser.',
  },
  {
    place: 'connect4',
    tier: 'night',
    en: 'Seven columns, six storeys. The aqueduct does not care where you drop, only that the water finds its level.',
    nb: 'Sju søyler, seks etasjer. Akvedukten bryr seg ikke om hvor du slipper, bare at vannet finner sitt nivå.',
  },
  {
    place: 'connect4',
    tier: 'keepsake',
    en: 'The middle column is the oldest and the most wanted. Every player learns this, and every player pays for learning it.',
    nb: 'Midtsøylen er den eldste og den mest ettertraktede. Hver spiller lærer det, og hver spiller betaler for å lære det.',
  },
  {
    place: 'dominoes',
    tier: 'waymark',
    en: 'The bridge is long enough for one more tile. Empty your hand and the water stays quiet.',
    nb: 'Broen er lang nok til én brikke til. Tøm hånden, og vannet holder seg stille.',
  },
  {
    place: 'dominoes',
    tier: 'night',
    en: 'Bone, rosewood and brass. The tiles click in a rhythm that sounds like counting, and is.',
    nb: 'Bein, rosentre og messing. Brikkene klikker i en rytme som høres ut som telling, og er det.',
  },
  {
    place: 'dominoes',
    tier: 'keepsake',
    en: 'The boneyard is not a graveyard. It is a waiting room, and every tile in it expects to be played before dawn.',
    nb: 'Beinlageret er ikke en kirkegård. Det er et venterom, og hver brikke der regner med å bli spilt før daggry.',
  },
  {
    place: 'wordwell',
    tier: 'waymark',
    en: 'Five letters are lowered into the well each night. Six guesses bring them back, and the water keeps the ones you spent.',
    nb: 'Fem bokstaver fires ned i brønnen hver natt. Seks gjettninger henter dem opp, og vannet beholder dem du brukte.',
  },
  {
    place: 'wordwell',
    tier: 'night',
    en: 'The well is older than the road. It was here before the first lantern, and it has strong opinions about which words are real.',
    nb: 'Brønnen er eldre enn veien. Den var her før den første lykten, og den har sterke meninger om hvilke ord som er ekte.',
  },
  {
    place: 'wordwell',
    tier: 'keepsake',
    en: 'On a good night the bucket comes up dry on the first try and full on the second. The well calls this luck. The well is being modest.',
    nb: 'På en god natt kommer bøtta tom opp på første forsøk og full på andre. Brønnen kaller det flaks. Brønnen er beskjeden.',
  },
  {
    place: 'memorybell',
    tier: 'waymark',
    en: 'Four bells keep the order they were rung. Repeat it until the tower forgets you, or you forget the tower.',
    nb: 'Fire klokker holder rekkefølgen de ble ringt i. Gjenta den til tårnet glemmer deg, eller du glemmer tårnet.',
  },
  {
    place: 'memorybell',
    tier: 'night',
    en: 'The bell tower has no clock. It has four notes and a memory, which the valley considers a fair exchange.',
    nb: 'Klokketårnet har ingen klokke. Det har fire toner og et minne, som dalen anser som en rettferdig byttehandel.',
  },
  {
    place: 'memorybell',
    tier: 'keepsake',
    en: 'When the sequence is long enough, the bells stop sounding like separate notes and start sounding like a sentence. Nobody has heard the end of it.',
    nb: 'Når sekvensen er lang nok, slutter klokkene å høres ut som enkelttoner og begynner å høres ut som en setning. Ingen har hørt slutten på den.',
  },
  {
    place: 'mancala',
    tier: 'waymark',
    en: 'The stone circle was a game before it was a circle. Four stones in every cup, and one hand going round and round.',
    nb: 'Steinsirkelen var et spill før den ble en sirkel. Fire steiner i hver kopp, og én hånd som går rundt og rundt.',
  },
  {
    place: 'mancala',
    tier: 'night',
    en: 'The last stone is the one that matters. The circle is patient enough to teach that once a night, and never twice in the same way.',
    nb: 'Den siste steinen er den som betyr noe. Sirkelen er tålmodig nok til å lære deg det én gang hver natt, og aldri på samme måte.',
  },
  {
    place: 'mancala',
    tier: 'keepsake',
    en: 'The fuller store wins, but the circle keeps no score of its own. Every stone you take is a stone the other hand no longer has.',
    nb: 'Den fyldigste skålen vinner, men sirkelen fører ingen egen poengsum. Hver stein du tar, er en stein den andre hånden ikke lenger har.',
  },
  {
    place: 'pegs',
    tier: 'waymark',
    en: 'The hermit’s cross has thirty-three holes and one empty centre. Every jump removes a peg; every removal makes the next jump harder.',
    nb: 'Eremittkorset har trettitre hull og ett tomt sentrum. Hvert hopp fjerner en pinne; hver fjerning gjør det neste hoppet vanskeligere.',
  },
  {
    place: 'pegs',
    tier: 'night',
    en: 'The hermit does not count the pegs he has left. He counts the jumps he can still see, which is a different and more honest number.',
    nb: 'Eremitten teller ikke pinnene han har igjen. Han teller hoppene han fortsatt kan se, som er et annet og ærligere tall.',
  },
  {
    place: 'pegs',
    tier: 'keepsake',
    en: 'One peg in the centre is the whole of the game. The cross stays behind, empty, and the hermit finally looks up at the sky.',
    nb: 'Én pinne i midten er hele spillet. Korset blir liggende igjen, tomt, og eremitten ser endelig opp på himmelen.',
  },
  {
    place: 'crates',
    tier: 'waymark',
    en: 'The crate yard smells of rain on old wood. Chalk marks wait under the lantern, patient as a list of chores.',
    nb: 'Krattegården lukter av regn på gammelt tre. Krittmerkene venter under lykten, tålmodige som en huskeliste.',
  },
  {
    place: 'crates',
    tier: 'night',
    en: 'A push is a promise: the crate goes where it goes, and the keeper must walk around to ask again. Nothing in the yard can be pulled back.',
    nb: 'Et dytt er et løfte: kassen havner der den havner, og vokteren må gå rundt for å spørre igjen. Ingenting i gården kan dras tilbake.',
  },
  {
    place: 'crates',
    tier: 'keepsake',
    en: 'When every mark is covered, the cat on the wall finally jumps down and walks across the lids, checking the work with its paws.',
    nb: 'Når hvert merke er dekket, hopper endelig katten på muren ned og går over lokkene og sjekker arbeidet med potene.',
  },
  {
    place: 'boxes',
    tier: 'waymark',
    en: 'The thread loom stands in a green room where the air is full of small crossings. Every line is a decision that cannot be unsewn.',
    nb: 'Trådveven står i et grønt rom der luften er full av små kryss. Hver linje er et valg som ikke kan sprettes opp.',
  },
  {
    place: 'boxes',
    tier: 'night',
    en: 'Close a box and the shuttle stays in your hand. The loom does not sigh; it simply waits for the next thread, already measuring the one after.',
    nb: 'Lukk en rute, og skyttelen blir i hånden din. Veven sukker ikke; den venter bare på neste tråd og måler allerede den etter.',
  },
  {
    place: 'boxes',
    tier: 'keepsake',
    en: 'The finished cloth is not a picture. It is a record of every small room you and the loom agreed to close, and every one you left open.',
    nb: 'Det ferdige stoffet er ikke et bilde. Det er en oversikt over hvert lite rom du og veven ble enige om å lukke, og hvert et dere lot stå åpent.',
  },
];

const PAGES_BY_PLACE = FIELD_PAGES.reduce((map, page) => {
  const list = map.get(page.place) ?? [];
  list.push(page);
  map.set(page.place, list);
  return map;
}, new Map<PlaceId, FieldPage[]>());

export function pagesFor(place: PlaceId): readonly FieldPage[] {
  return PAGES_BY_PLACE.get(place) ?? [];
}

function tierUnlocked(tier: PageTier, marks: PlaceMarks): boolean {
  if (tier === 'waymark') return marks.waymark || marks.night || marks.keepsake;
  if (tier === 'night') return marks.night;
  return marks.keepsake;
}

/** The pages a player has earned, in atlas order. */
export function unlockedPages(sources: AtlasSources): FieldPage[] {
  return FIELD_PAGES.filter((page) => tierUnlocked(page.tier, placeView(page.place, sources).marks));
}

export function pageIsUnlocked(page: FieldPage, sources: AtlasSources): boolean {
  return tierUnlocked(page.tier, placeView(page.place, sources).marks);
}

export function pageText(page: FieldPage, lang: Lang): string {
  return lang === 'nb' ? page.nb : page.en;
}

export function placeNameFor(place: PlaceId): string {
  return PLACES.find((item) => item.id === place)?.placeName ?? place;
}

export type SightingId = 'fireflies' | 'cat' | 'snail' | 'deer' | 'wanderer' | 'tower';

export interface Sighting {
  id: SightingId;
  /** i18n key for the name used in the button and the field book */
  title: string;
  text: string;
}

export const SIGHTINGS: readonly Sighting[] = [
  {
    id: 'fireflies',
    title: 'the fireflies',
    text: 'Five small lights keep their own time above the meadow. They never land.',
  },
  {
    id: 'cat',
    title: 'the cat',
    text: 'The cat on the fence has watched every table in the valley and approves of none.',
  },
  {
    id: 'snail',
    title: 'the snail',
    text: 'A snail crosses the meadow all night and arrives exactly where it meant to.',
  },
  {
    id: 'deer',
    title: 'the stag',
    text: 'The stag walks the ridge at his own pace, antlers first, and never hurries for anyone.',
  },
  {
    id: 'wanderer',
    title: 'the wanderer',
    text: 'The wanderer carries the only lantern on the road. It is always the same size as yours.',
  },
  {
    id: 'tower',
    title: 'the tower window',
    text: 'One window in the keep is lit all night. Nobody has ever been seen inside it.',
  },
];

const SIGHTING_IDS = new Set<string>(SIGHTINGS.map((sighting) => sighting.id));

interface JournalStore {
  sightings: string[];
}

function readJournal(): JournalStore {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { sightings: [] };
    const parsed = JSON.parse(raw) as Partial<JournalStore>;
    return {
      sightings: Array.isArray(parsed.sightings)
        ? parsed.sightings.filter((value): value is string => typeof value === 'string' && SIGHTING_IDS.has(value))
        : [],
    };
  } catch {
    return { sightings: [] };
  }
}

function writeJournal(store: JournalStore): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* private mode: the sighting still counts for this tab */
  }
}

export function readSightings(): SightingId[] {
  return [...new Set(readJournal().sightings)] as SightingId[];
}

/** Returns true only when this is a new sighting, so callers can celebrate once. */
export function addSighting(id: SightingId): boolean {
  const store = readJournal();
  if (store.sightings.includes(id)) return false;
  writeJournal({ sightings: [...store.sightings, id] });
  return true;
}

export function clearJournal(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* private mode */
  }
}

export interface JournalProgress {
  pages: number;
  sightings: number;
  found: number;
  total: number;
}

export function journalProgress(sources: AtlasSources, sightings: readonly SightingId[]): JournalProgress {
  const pages = unlockedPages(sources).length;
  const seen = new Set(sightings).size;
  return {
    pages,
    sightings: seen,
    found: pages + seen,
    total: FIELD_PAGES.length + SIGHTINGS.length,
  };
}
