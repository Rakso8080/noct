/**
 * The Long Road — a nightly dispatch.
 *
 * Ninety nights make a volume. Every night composes four authored fragments —
 * an opening, a stop, the weather and a closing — chosen by the day alone, so
 * the same night reads the same in the browser, inside the Worker and in the
 * static build. Nothing here talks to a server, and nothing is stored.
 *
 * All prose is authored in both languages here rather than in the UI dictionary:
 * the fragments are content, and their rhythm matters more than a key.
 */
import { hashSeed, mulberry32 } from './rng.ts';

export const SEASON_LENGTH = 90;

export type Voice = 'keeper' | 'walker' | 'choir';

export interface Localised {
  en: string;
  nb: string;
}

interface Fragment {
  en: string;
  nb: string;
}

export interface DispatchInput {
  day: number;
  /** the three stops of tonight's road, already localised */
  stops: readonly string[];
  /** the weather's own name, already localised */
  weatherName: string;
  lang: 'en' | 'nb';
}

export interface NightDispatch {
  /** 1-based volume of ninety nights */
  season: number;
  /** 1..90 inside the volume */
  night: number;
  voice: Voice;
  title: string;
  body: string;
}

const VOICES: readonly Voice[] = ['keeper', 'walker', 'choir'];

const VOICE_TITLE: Record<Voice, Localised> = {
  keeper: { en: 'Written by the keeper', nb: 'Skrevet av vokteren' },
  walker: { en: 'Carried in from the road', nb: 'Båret inn fra veien' },
  choir: { en: 'Sung at the far end', nb: 'Sunget i den andre enden' },
};

/* --------------------------------------------------------------- openings */

const OPENINGS: readonly Fragment[] = [
  {
    en: 'The lanterns were lit before the sun had finished leaving. Nobody gives the order; the valley simply notices the dark and answers it, one window at a time.',
    nb: 'Lyktene ble tent før solen hadde sluppet taket. Ingen gir ordren; dalen merker bare mørket og svarer, ett vindu om gangen.',
  },
  {
    en: 'A bell rang at the edge of hearing, twice, and then thought better of it. The road kept the sound for a while, the way a coat keeps the smell of woodsmoke.',
    nb: 'En klokke ringte så vidt hørbart, to ganger, og angret seg. Veien beholdt lyden en stund, slik en frakk beholder lukten av bålrøyk.',
  },
  {
    en: 'The keeper counted the lamps again and arrived at the same number as always. He wrote it down anyway, because a night with no record is a night that can be argued with.',
    nb: 'Vokteren telte lampene igjen og kom til det samme tallet som alltid. Han skrev det ned likevel, for en natt uten opptegnelse kan man alltid krangle med.',
  },
  {
    en: 'Rain had been promised and then withheld. The stones stayed dry and the air stayed close, and every table in the valley seemed to lean a little nearer its own light.',
    nb: 'Regn var lovet og så holdt tilbake. Steinene forble tørre og luften tung, og hvert bord i dalen lente seg litt nærmere sitt eget lys.',
  },
  {
    en: 'Someone had swept the steps of the hall, which nobody does at night. The broom was still there, leaning where it had been left, and the steps were already collecting leaves again.',
    nb: 'Noen hadde feid trappen til salen, noe ingen gjør om natten. Kosten sto fortsatt der den var satt, og trappen samlet allerede løv igjen.',
  },
  {
    en: 'The water under the bridge was so still that the bridge appeared to be the thing moving. A fish came up once, looked at the sky, and decided against it.',
    nb: 'Vannet under broen var så stille at det var broen som så ut til å bevege seg. En fisk kom opp én gang, så på himmelen, og lot det være.',
  },
  {
    en: 'The orchard had been picked clean, and still the branches held light. In the glass rows the lanterns multiplied themselves, politely, without asking for more room.',
    nb: 'Hagen var plukket ren, og likevel holdt grenene på lyset. I glassradene formerte lyktene seg høflig, uten å be om mer plass.',
  },
  {
    en: 'A traveller came as far as the well and stopped, as travellers do, to read what the water had to say. The water said nothing, which is its way of being polite.',
    nb: 'En vandrer kom helt til brønnen og stoppet, som vandrere gjør, for å lese hva vannet hadde å si. Vannet sa ingenting, som er dets måte å være høflig på.',
  },
  {
    en: 'The tower kept its one lit window, and the rest of the keep pretended not to notice. Candle smoke went up straight for a while, then lost its nerve and spread.',
    nb: 'Tårnet beholdt sitt ene tente vindu, og resten av borgen latet som ingenting. Lysrøyken gikk rett opp en stund, mistet så motet og spredte seg.',
  },
  {
    en: 'There are nights when the valley feels smaller than it is, and this was one of them: every roof within reach of the next, every light close enough to call across.',
    nb: 'Det finnes netter da dalen føles mindre enn den er, og dette var en av dem: hvert tak innen rekkevidde av det neste, hvert lys nært nok til å rope over.',
  },
  {
    en: 'The moon had gone behind the ridge and left the valley to its own devices. The valley, as usual, did nothing dramatic. It simply kept every small appointment it had made.',
    nb: 'Månen var gått bak kammen og lot dalen klare seg selv. Dalen gjorde som vanlig ingenting dramatisk. Den holdt bare hvert lite løfte den hadde gitt.',
  },
  {
    en: 'Smoke from the courtyard fires went sideways all evening, which the old people read as a change coming. The old people were right, though the change was only the weather.',
    nb: 'Røyken fra gårdens bål gikk sidelengs hele kvelden, noe de gamle leste som et varsel. De gamle hadde rett, men forandringen var bare været.',
  },
  {
    en: 'The stairs to the observatory were cold enough to make the hand ache, and every window on the way up held a different piece of the same sky. Nobody had cleaned them for years.',
    nb: 'Trappen opp til observatoriet var kald nok til å gjøre hånden øm, og hvert vindu på veien holdt en annen bit av samme himmel. Ingen hadde vasket dem på år.',
  },
  {
    en: 'A dog barked at the far end of the road, then a second dog answered from the other side, and for a moment the valley had a conversation it did not need words for.',
    nb: 'En hund bjeffet i den andre enden av veien, så svarte en annen hund fra motsatt side, og en stund hadde dalen en samtale den ikke trengte ord for.',
  },
  {
    en: 'The market had closed hours ago, but one stall was still lit, its keeper asleep on a stool with a deck of cards in one hand and a coin in the other.',
    nb: 'Markedet hadde stengt for timer siden, men én bod var fortsatt tent, og eieren sov på en krakk med en kortstokk i den ene hånden og en mynt i den andre.',
  },
];

/* ------------------------------------------------------------------- stops */

const STOPS: readonly Fragment[] = [
  {
    en: 'Tonight the road asks for {stop} first. It is a place that rewards attention rather than speed; arrive early and it will show you something it hides from the hurried.',
    nb: 'I natt ber veien om {stop} først. Det er et sted som belønner oppmerksomhet mer enn fart; kom tidlig, og det viser deg noe det skjuler for de stressede.',
  },
  {
    en: 'The first stop is {stop}, where the light is always a little lower than you remember. Sit down before you decide anything; the room is not in a hurry and neither is the answer.',
    nb: 'Første stopp er {stop}, der lyset alltid er litt lavere enn du husker. Sett deg før du bestemmer noe; rommet har ikke hastverk, og ikke svaret heller.',
  },
  {
    en: 'At {stop} the floor has been worn into a shallow bowl by everyone who stood there thinking. Add your own weight to it, then move on before the night gets long.',
    nb: 'På {stop} er gulvet slitt til en grunn skål av alle som har stått der og tenkt. Legg din vekt til, og gå videre før natten blir lang.',
  },
  {
    en: 'The second stop is {stop}. There is a right way in and a wrong way in, and both look the same from the road, which is the whole reason the road is worth walking.',
    nb: 'Andre stopp er {stop}. Det finnes en riktig og en gal måte å komme inn på, og begge ser like ut fra veien, som er hele grunnen til at veien er verdt å gå.',
  },
  {
    en: 'If you only manage one stop tonight, make it {stop}. The others will keep; this one has been patient with you for longer than you know.',
    nb: 'Hvis du bare rekker ett stopp i natt, la det være {stop}. De andre venter; dette har vært tålmodig med deg lenger enn du vet.',
  },
  {
    en: 'The last stop is {stop}, and it is the one people remember. Not because it is the hardest, but because by then the valley has gone quiet enough to hear your own thinking.',
    nb: 'Siste stopp er {stop}, og det er det folk husker. Ikke fordi det er vanskeligst, men fordi dalen da er blitt så stille at du hører din egen tenkning.',
  },
  {
    en: 'Between the first and second stop the road passes {stop}. Most walk past it. The ones who stop are usually the ones who come back tomorrow.',
    nb: 'Mellom første og andre stopp går veien forbi {stop}. De fleste går bare forbi. De som stopper, er som regel de som kommer tilbake i morgen.',
  },
  {
    en: '{stop} keeps a light for whoever arrives last. It is not a competition and there is no prize, but the light is real, and it is not there for everyone.',
    nb: '{stop} holder et lys for den som kommer sist. Det er ingen konkurranse og ingen premie, men lyset er ekte, og det er ikke der for alle.',
  },
  {
    en: 'At {stop} the keeper will not tell you the answer. He will tell you a story that contains it, badly, and then go back to his counting while you work it out.',
    nb: 'På {stop} vil vokteren ikke gi deg svaret. Han forteller en historie som inneholder det, dårlig, og går så tilbake til tellingen mens du finner det ut.',
  },
  {
    en: 'The road bends at {stop}, and the bend is the point. Straight roads make straight answers, and straight answers are rarely the ones worth carrying home.',
    nb: 'Veien svinger ved {stop}, og svingen er poenget. Rette veier gir rette svar, og rette svar er sjelden de som er verdt å bære med hjem.',
  },
  {
    en: 'There is a bench at {stop} that nobody built and nobody maintains. It is always dry. Nobody has ever explained this, and the valley is not asking anyone to try.',
    nb: 'Det står en benk ved {stop} som ingen har bygget og ingen vedlikeholder. Den er alltid tørr. Ingen har noen gang forklart det, og dalen ber ingen prøve.',
  },
  {
    en: 'If {stop} feels familiar, that is not memory. Every room in the valley is built from the same three materials: dark, patience and one honest light.',
    nb: 'Hvis {stop} føles kjent, er det ikke minnet. Hvert rom i dalen er bygget av de samme tre materialene: mørke, tålmodighet og ett ærlig lys.',
  },
  {
    en: 'The stop after {stop} is optional, and everyone knows it. The people who take it anyway tend to be the ones who finish the road with something to say.',
    nb: 'Stoppet etter {stop} er valgfritt, og alle vet det. De som tar det likevel, er gjerne de som fullfører veien med noe å fortelle.',
  },
  {
    en: 'At {stop} the floor is swept, the seats are warm, and the first question is already on the table. It has been waiting since dusk and it will wait a little longer.',
    nb: 'På {stop} er gulvet feid, setene varme, og det første spørsmålet ligger allerede på bordet. Det har ventet siden skumringen og venter litt til.',
  },
  {
    en: 'The road to {stop} is longer than it looks on the map, because the map was drawn by someone who had already arrived. Allow for that, and you will enjoy it more.',
    nb: 'Veien til {stop} er lengre enn den ser ut på kartet, fordi kartet ble tegnet av noen som allerede var fremme. Regn med det, og du vil like det bedre.',
  },
];

/* ----------------------------------------------------------------- weather */

const WEATHER_LINES: readonly Fragment[] = [
  {
    en: 'The sky is {weather} tonight, and the valley has dressed for it: shutters closed a little earlier, lanterns carried a little closer to the body.',
    nb: 'Himmelen er {weather} i natt, og dalen har kledd seg for det: lukkede vinduer litt tidligere, lykter båret litt nærmere kroppen.',
  },
  {
    en: 'Tonight brings {weather}. It changes nothing about the boards and everything about the walk between them, which is where most of the night actually happens.',
    nb: 'Natten bringer {weather}. Det endrer ingenting ved brettene og alt ved gåturen mellom dem, som er der mesteparten av natten faktisk skjer.',
  },
  {
    en: 'The forecast is {weather}, though nobody in the valley calls it a forecast. They call it the evening, and they plan around it the way other people plan around trains.',
    nb: 'Varselet er {weather}, selv om ingen i dalen kaller det et varsel. De kaller det kvelden, og planlegger etter den slik andre planlegger etter tog.',
  },
  {
    en: 'With {weather} over the ridge, the far lights go soft and the near ones come forward. Depth is mostly a matter of which lights you can still see.',
    nb: 'Med {weather} over kammen blir de fjerne lysene myke og de nære trer frem. Dybde handler mest om hvilke lys du fortsatt kan se.',
  },
  {
    en: 'The night is {weather}, which the older players insist is the best kind for thinking. The younger ones insist it is the best kind for winning. Both are partly right.',
    nb: 'Natten er {weather}, noe de eldre spillerne hevder er den beste sorten for å tenke. De yngre hevder den er best for å vinne. Begge har delvis rett.',
  },
  {
    en: 'Under {weather} the bell carries further than it should. If you hear it twice, it is not an echo; the tower is simply being generous with its one sound.',
    nb: 'Under {weather} bærer klokken lenger enn den burde. Hører du den to ganger, er det ikke ekko; tårnet er bare gavmild med sin ene lyd.',
  },
  {
    en: 'The weather is {weather}, and the water under the bridge has taken on the colour of the sky without permission. It does this every night, and every night it works.',
    nb: 'Været er {weather}, og vannet under broen har tatt himmelens farge uten å spørre. Det gjør det hver natt, og hver natt fungerer det.',
  },
  {
    en: 'Tonight: {weather}. The lamps burn a little faster for it, and the keeper pretends not to notice the cost, the way he pretends not to notice most things.',
    nb: 'I natt: {weather}. Lampene brenner litt raskere av det, og vokteren later som han ikke merker kostnaden, slik han later som han ikke merker det meste.',
  },
  {
    en: 'The air is {weather}, and sound behaves strangely: a chair moved at the far end of the hall arrives at your ear before the person who moved it looks up.',
    nb: 'Luften er {weather}, og lyden oppfører seg merkelig: en stol som flyttes i den andre enden av salen, når øret ditt før personen som flyttet den ser opp.',
  },
  {
    en: 'With {weather} settling in, the sensible thing is to choose one table and stay. The valley rewards the settled, though it will never say so out loud.',
    nb: 'Når {weather} setter seg, er det fornuftige å velge ett bord og bli. Dalen belønner de som blir, selv om den aldri sier det høyt.',
  },
  {
    en: 'The night is {weather}; the sort of night that makes a five-letter word feel like a small lamp and a chess game feel like a house with the door open.',
    nb: 'Natten er {weather}; den sorten natt som får et ord på fem bokstaver til å føles som en liten lampe og et sjakkparti som et hus med åpen dør.',
  },
  {
    en: 'Under {weather} the orchard rows disappear one by one, from the far end inward, until only the nearest tree is certain and the rest are a rumour of apples.',
    nb: 'Under {weather} forsvinner radene i hagen én etter én, fra den fjerne enden og innover, til bare det nærmeste treet er sikkert og resten er et rykte om epler.',
  },
  {
    en: 'The weather is {weather}, and the hills have moved closer again. They do this whenever the air thickens, and they never apologise for the intrusion.',
    nb: 'Været er {weather}, og åsene har flyttet seg nærmere igjen. De gjør det hver gang luften tykner, og de ber aldri om unnskyldning for å trenge seg på.',
  },
  {
    en: 'Tonight the sky is {weather}. Somewhere in the keep a window is opened a crack, and then closed again, as if the night had been checked and found acceptable.',
    nb: 'I natt er himmelen {weather}. Et sted i borgen åpnes et vindu på gløtt, og lukkes igjen, som om natten er blitt sjekket og funnet god nok.',
  },
  {
    en: 'The night arrives {weather}, which means the road will keep your footprints longer than usual. Anyone walking behind you will know exactly where you hesitated.',
    nb: 'Natten kommer {weather}, som betyr at veien beholder fotsporene dine lenger enn vanlig. Den som går bak deg, vil vite nøyaktig hvor du nølte.',
  },
];

/* ----------------------------------------------------------------- details */

const DETAILS: readonly Fragment[] = [
  {
    en: 'A broom leans where it was left, a cup goes cold beside it, and the room keeps the shape of the last person who sat still.',
    nb: 'En kost står der den ble satt, et beger blir kaldt ved siden av, og rommet beholder formen av den siste som satt stille.',
  },
  {
    en: 'The lamps are trimmed, the wicks are even, and someone has already put out a second chair in case you brought company.',
    nb: 'Lampene er trimmet, vekene jevne, og noen har allerede satt frem en stol til i tilfelle du hadde med følge.',
  },
  {
    en: 'Beyond the last roof the ground falls away, and the road continues as a rumour of pale stones that nobody has needed to name.',
    nb: 'Bortenfor det siste taket faller grunnen bort, og veien fortsetter som et rykte om bleke steiner ingen har trengt å navngi.',
  },
  {
    en: 'A cat crosses the yard without looking at you, which is its way of confirming that the yard is still yours and still not.',
    nb: 'En katt krysser gårdsplassen uten å se på deg, som er dens måte å bekrefte at gårdsplassen fortsatt er din og fortsatt ikke.',
  },
  {
    en: 'Somewhere a door is closed carefully, not to hide anything, only because the valley has decided that this hour deserves quiet.',
    nb: 'Et sted lukkes en dør forsiktig, ikke for å skjule noe, bare fordi dalen har bestemt at denne timen fortjener stillhet.',
  },
  {
    en: 'The board is wiped clean, the pieces are set back, and the table keeps a faint warmth that has nothing to do with the fire.',
    nb: 'Brettet er tørket rent, brikkene satt tilbake, og bordet beholder en svak varme som ikke har noe med bålet å gjøre.',
  },
  {
    en: 'Two lanterns on the same post disagree about the wind, and the post, being old, has learned to let them.',
    nb: 'To lykter på samme stolpe er uenige om vinden, og stolpen, som er gammel, har lært å la dem være uenige.',
  },
  {
    en: 'The path is swept in a pattern that means nothing to visitors and everything to the person who sweeps it every night.',
    nb: 'Stien er feid i et mønster som betyr ingenting for besøkende og alt for den som feier den hver natt.',
  },
  {
    en: 'A jug of water sweats on the sill, and the drops arrive on the wood in the same order every night, which is almost a calendar.',
    nb: 'En mugge vann svetter på vinduskarmen, og dråpene treffer treet i samme rekkefølge hver natt, som nesten er en kalender.',
  },
  {
    en: 'The floorboards remember every route through the room, and they creak in the order the room was crossed today.',
    nb: 'Gulvbordene husker hver rute gjennom rommet, og de knirker i den rekkefølgen rommet ble krysset i dag.',
  },
  {
    en: 'Outside, the hills have arranged themselves into their usual opinion of the sky, and the sky, as usual, declines to comment.',
    nb: 'Utenfor har åsene ordnet seg i sin vanlige mening om himmelen, og himmelen avstår som vanlig fra å kommentere.',
  },
  {
    en: 'The last cart went past an hour ago. Its ruts are already filling with shadow, which is the valley’s way of tidying up.',
    nb: 'Siste kjerre kjørte for en time siden. Sporene fylles allerede med skygge, som er dalens måte å rydde på.',
  },
  {
    en: 'A moth insists on the lamp, learns nothing, and is admired for it by everyone who has ever done the same with a harder problem.',
    nb: 'En møll insisterer på lampen, lærer ingenting, og beundres for det av alle som noen gang har gjort det samme med et vanskeligere problem.',
  },
  {
    en: 'The hour is late enough that the valley has stopped performing. What is left is the actual place, which is quieter and better.',
    nb: 'Timen er sen nok til at dalen har sluttet å opptre. Det som er igjen er selve stedet, som er stillere og bedre.',
  },
  {
    en: 'Someone has left a small stone on the ledge, balanced exactly. It will still be there in the morning, and nobody will mention it.',
    nb: 'Noen har lagt en liten stein på kanten, nøyaktig balansert. Den står der fortsatt om morgenen, og ingen kommer til å nevne den.',
  },
];

/* --------------------------------------------------------------- closings */

const CLOSINGS: readonly Fragment[] = [
  {
    en: 'The valley does not keep score of who was brave. It keeps the lamps on, which is its own kind of answer.',
    nb: 'Dalen fører ikke regnskap over hvem som var modige. Den holder lampene tent, som er dens egen slags svar.',
  },
  {
    en: 'Leave the board as you found it, or better. The next person may be you, a year from now, with less patience and the same questions.',
    nb: 'La brettet være som du fant det, eller bedre. Den neste kan være deg, om et år, med mindre tålmodighet og de samme spørsmålene.',
  },
  {
    en: 'The keeper blew out all but one light, wrote the number down, and went to bed. The number was correct. It always is, and it never helps.',
    nb: 'Vokteren blåste ut alle lys unntatt ett, skrev tallet ned og gikk til sengs. Tallet var riktig. Det er det alltid, og det hjelper aldri.',
  },
  {
    en: 'Tomorrow the road will be a different three stops, and you will be a slightly different person. Neither of you will mention it.',
    nb: 'I morgen blir veien tre andre stopp, og du blir et litt annet menneske. Ingen av dere kommer til å nevne det.',
  },
  {
    en: 'If you finished everything, good. If you finished nothing, also good. The night has no opinion, and that is the most restful thing about it.',
    nb: 'Hvis du fullførte alt, bra. Hvis du ikke fullførte noe, også bra. Natten har ingen mening om det, og det er det mest hvilsomme ved den.',
  },
  {
    en: 'Somewhere below the bridge a fish turned over in its sleep, and the whole valley adjusted by an amount too small to notice. Goodnight.',
    nb: 'Et sted under broen snudde en fisk seg i søvne, og hele dalen justerte seg med en mengde for liten til å merkes. God natt.',
  },
  {
    en: 'The last thing to go dark is always the tower window. Nobody knows who is up there, and by morning the question has politely removed itself.',
    nb: 'Det siste som slukner, er alltid tårnvinduet. Ingen vet hvem som er der oppe, og innen morgenen har spørsmålet høflig fjernet seg.',
  },
  {
    en: 'The road is sealed for tonight. It will open again at midnight, as it always does, without ceremony and without asking whether you are ready.',
    nb: 'Veien er forseglet for i natt. Den åpner igjen ved midnatt, som alltid, uten seremoni og uten å spørre om du er klar.',
  },
  {
    en: 'Keep the small thing you noticed. The big things will be written down by others; the small ones only exist if you carry them.',
    nb: 'Ta vare på det lille du la merke til. De store tingene blir skrevet ned av andre; de små finnes bare hvis du bærer dem.',
  },
  {
    en: 'The lantern by the door is still warm. That is not a metaphor and it is not a promise; it is simply where the light was standing when the night ended.',
    nb: 'Lykten ved døren er fortsatt varm. Det er ikke en metafor og ikke et løfte; det er bare der lyset sto da natten tok slutt.',
  },
  {
    en: 'Nobody in the valley will ask what you scored. They will ask whether you saw the thing by the water, and they will know from your face if you did.',
    nb: 'Ingen i dalen kommer til å spørre hva du fikk. De spør om du så tingen ved vannet, og de ser på ansiktet ditt om du gjorde det.',
  },
  {
    en: 'Sleep is allowed. The boards are patient, the streak forgives a missed night, and the road has never once complained about being walked tomorrow instead.',
    nb: 'Søvn er tillatt. Brettene er tålmodige, rekken tilgir en natt du hoppet over, og veien har aldri klaget over å bli gått i morgen i stedet.',
  },
  {
    en: 'The valley folded itself up quietly, the way it does, and left one light on for whoever is still reading. That would be you. Goodnight.',
    nb: 'Dalen pakket seg stille sammen, slik den gjør, og lot ett lys stå tent for den som fortsatt leser. Det er deg. God natt.',
  },
  {
    en: 'The keeper has a theory that the road is shorter for people who finish. He has never tested it, because he has never once left the keep.',
    nb: 'Vokteren har en teori om at veien er kortere for dem som fullfører. Han har aldri testet den, for han har aldri forlatt borgen.',
  },
  {
    en: 'Whatever you did tonight, it is now part of the valley’s arithmetic, and the valley is very bad at forgetting. Fortunately, it is also very bad at holding grudges.',
    nb: 'Hva du enn gjorde i natt, er det nå en del av dalens regnestykke, og dalen er svært dårlig til å glemme. Heldigvis er den også svært dårlig til å bære nag.',
  },
];

/* ------------------------------------------------------------------ builder */

function pickIndexes(day: number): [number, number, number, number, number] {
  const rnd = mulberry32(hashSeed('long-road-dispatch', day));
  return [
    Math.floor(rnd() * OPENINGS.length),
    Math.floor(rnd() * STOPS.length),
    Math.floor(rnd() * WEATHER_LINES.length),
    Math.floor(rnd() * DETAILS.length),
    Math.floor(rnd() * CLOSINGS.length),
  ];
}

function fill(text: string, vars: { stop: string; weather: string }): string {
  return text.replace(/\{stop\}/g, vars.stop).replace(/\{weather\}/g, vars.weather);
}

export function seasonNight(day: number): { season: number; night: number } {
  const value = Math.max(1, Math.floor(day));
  return {
    season: Math.floor((value - 1) / SEASON_LENGTH) + 1,
    night: ((value - 1) % SEASON_LENGTH) + 1,
  };
}

export function nightVoice(day: number): Voice {
  return VOICES[Math.abs(Math.floor(day) - 1) % VOICES.length];
}

/** The dispatch for one night. Same input, same text, everywhere. */
export function nightDispatch({ day, weatherName, stops, lang }: DispatchInput): NightDispatch {
  const safeDay = Math.max(1, Math.floor(day));
  const [o, s, w, d, c] = pickIndexes(safeDay);
  const voice = nightVoice(safeDay);
  const stop = stops[0] ?? (lang === 'nb' ? 'det første bordet' : 'the first table');
  const vars = { stop, weather: weatherName.toLowerCase() };
  const parts = [OPENINGS[o], STOPS[s], WEATHER_LINES[w], DETAILS[d], CLOSINGS[c]].map((fragment) =>
    fill(lang === 'nb' ? fragment.nb : fragment.en, vars),
  );
  const { season, night } = seasonNight(safeDay);
  return {
    season,
    night,
    voice,
    title: VOICE_TITLE[voice][lang],
    body: parts.join(' '),
  };
}

/** Every night of a volume, for the archive list. */
export function seasonNights(day: number): number[] {
  const { season } = seasonNight(day);
  const first = (season - 1) * SEASON_LENGTH + 1;
  return Array.from({ length: SEASON_LENGTH }, (_, index) => first + index);
}

/** Used by the tests and the share line. */
export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export const DISPATCH_FRAGMENTS =
  OPENINGS.length + STOPS.length + WEATHER_LINES.length + DETAILS.length + CLOSINGS.length;
