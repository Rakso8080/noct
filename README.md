# Noct

Noct is a small, account-free games site: seven nightly boards (Common, Rare, Noct,
Chess, Mines, Pairs, Lights) and an arcade of ten more tables (Snake, 2048,
Reversi, Checkers, Connect Four, Dominoes, Word Well, Memory Bell, Mancala and
Peg Solitaire). Everything is playable in the browser; side-game records live in
`localStorage`.

## Deep night

Seventeen places, each drawn as its own pixel scene: three depths of silhouette, a
ground line, one light source, lit glints, moving creatures and a wind that
crosses the plate, built from the same ASCII sprites as the home scene (`src/lib/placeArt.ts`,
`src/components/PlaceScene.tsx`). The scene shows up as the tile on the menu, as
the plate in the atlas and as the band above a game. Candle Keep, the chess room,
is the valley from the OG card: moon over the water, a flagged tower on the hill,
three stone arches and warm windows. Ten skies — clear, mist, meteors, snow,
aurora, long rain, rising wind, fireflies, storm and still air — are drawn over
the same scene rather than replacing it. Every motion is CSS-only and stops under
reduced motion, in a hidden tab and on touch (where the plate does not lean).
Birds cross the sky, fish turn in the water, moths circle the lanterns, and cats
and deer keep to the ground; the wind moves leaves through every outdoor scene.

`/night` is a serial. Ninety nights make a volume of *The Long Road*; every night
composes a dispatch of 120–170 words from 75 authored fragments (five per night:
opening, stop, weather, detail, closing) chosen by the date alone, so the same
night reads the same in the browser, in the Worker and in the static build. Prose
is authored in English and Norwegian inside `src/lib/dispatch.ts`.

The field book holds three pages per place — arrival, a night here, and a
keepsake — unlocked by the atlas marks that already exist. Nothing new is stored:
`src/lib/journal.ts` only adds the sightings list it always had.

## Run it

```bash
npm install
npm run dev          # Vite on 127.0.0.1:5173 + the Node API on 127.0.0.1:8788
```

The Node API (`server/index.ts`, SQLite in `.data/`) owns the daily boards, the
one-attempt rule, scoring, standings and the archive. `npm run start` serves the
built `dist/` from the same process.

## Test, typecheck, build

```bash
npm run typecheck    # tsc --noEmit, tests included
npm test             # node:test: all rules, checkers, connect four, dominoes, gamesStore
npm run verify       # puzzle QA over generated days
npm run verify:prompts
VITE_BASE=/noct/ npx vite build
```

The production build uses `VITE_BASE` for subpath hosting (GitHub Pages uses
`/noct/`). Screens other than the menu are lazy-loaded chunks.

## Static mode vs the API

- **API mode** (default dev/start): daily boards are generated and verified on the
  server, one attempt is enforced server-side, and standings are shared.
- **Static mode** (`VITE_STATIC=1`, used by `.github/workflows/pages.yml`): there
  is no Node process, so `src/lib/localApi.ts` runs the same rules in the tab and
  keeps results in `localStorage`. Boards are still unique and verified, but the
  standings page is local-only and clearly labelled as such.

The optional crowd Worker in `crowd/` aggregates survey answer counts and climb
totals in D1. It is separate from the game Worker in `worker/` and keeps its own
`wrangler.jsonc`; Pages builds read its URL from `VITE_CROWD_API` and fall back
to the authored shares when it is unset.

## The game server on Sites

Live: <https://noct-fk1vla.freebuff.site> · preview:
<https://noct-fk1vla-preview.freebuff.site>

`worker/` is a 1:1 port of `server/index.ts` for Cloudflare Workers + D1. It
serves the built client through the `ASSETS` binding (with a client-side route
fallback for deep links) and talks to D1 with the same SQL, routes, status codes
and JSON as the Node process.

- The schema lives in `shared/schema.ts`; the Worker applies it once per isolate
  before serving, so a fresh D1 database needs no manual migration.
- `worker/seed.ts` derives daily boards with WebCrypto HMAC, matching
  `server/secret.ts`. Set `PUZZLE_SECRET` as a Sites secret in production; local
  development falls back to the value in `wrangler.worker.jsonc`.
- Scripts: `npm run build:worker` bundles the API; `npm run dev:sites` builds the
  client, bundles the Worker and starts `wrangler dev` on 127.0.0.1:8790 with a
  local D1 database.
- `npm run smoke -- <origin>` (or `node scripts/smoke.ts <origin>`) plays a full
  daily against any origin; run it against Node and the Worker to prove parity.

## Language

The interface ships in English and Norwegian. The switch is in Settings → Language
and is stored in `localStorage` (`noct.lang.v1`). Copy lives in `src/lib/i18n.ts`
with English as the key, so an untranslated string falls back to English instead
of breaking a screen.

## Chess with a friend

Open **Chess → A friend → Create a private table** and send the invite link.
The creator plays White and the friend plays Black. Rooms are capped at two
players and use Trystero's public relays only for discovery; the moves travel
directly between the two browsers. There is no account, game server, ranking or
saved online history. Both players must be online at the same time, and a very
restrictive network may block the direct WebRTC connection.

## The word well and the memory bell

- **Word Well** (`/wordwell`): five letters, six guesses, a shared daily word and a
  free-play well. Grading spends repeated letters left to right, so a second L can
  never borrow the first one's hit.
- **Memory Bell** (`/memorybell`): four bells, a nightly order derived from the day
  and the round, twelve rounds, and tones through the same WebAudio synth as the
  rest of the site.

Both report the finished daily run to `POST /api/arcade/score` and appear on
`/leaderboard` (the Word Well and Memory Bell tabs) and in the side-table card on
`/stats`. The Worker keeps one row per player, game and day, keeps the best score,
counts plays, refuses any other date and every game outside
`shared/arcade.ts`. Guests score with the same cookie as the nightly boards; the
static GitHub Pages build keeps the same numbers in `localStorage` instead.

## The stone circle and the hermit’s cross

- **Mancala** (`/mancala`): fourteen cups, four stones each. Sow counter-clockwise,
  take the extra turn when the last stone reaches your store, and capture the
  opposite cup when it lands in an empty one. The circle is played against a
  two-strength bot and keeps a daily result.
- **Peg Solitaire** (`/pegs`): the old seven-by-seven cross, 32 pegs and a centre
  hole. Jump a peg over its neighbour to remove it; clear the cross to one peg.
  Undo and one hint are free, and the hermit keeps your best cross.

Both are side tables: local records in `localStorage`, atlas places with three
field-book pages, and scenes full of the same weather and creatures as the rest
of the valley.

## Sharing a night

The results screen has *Send the night*: it copies a link to today's board of
the form `/play?by=Mira&score=900`. Opening it shows "Mira scored 900 — beat it."
above the board. The line is read from the URL and never written to a player
row, a streak or the local games store; a broken or missing challenge simply
opens the ordinary daily board. Parsing lives in `src/lib/challenge.ts` and is
covered by `tests/challenge.test.ts`.

## On the board

On a phone the board can be filled by dragging: a press lights the cell under
the finger and every empty cell the finger crosses, and a long press (420 ms)
marks a cell as excluded. Mouse clicks and the keyboard (`arrows`, `space`, `x`)
keep working unchanged; dragging only suppresses the synthetic click that follows
a real drag.

## Known limitations

- The GitHub Pages mirror still keeps standings and global counts local; the
  Sites deployment shares them through D1.
- The archive holds the last 365 nights; today's board lives under Noct.
- There are still no accounts: progress, streaks, the field book and the two new
  tables live in this browser (or in the cookie-bound player row on Sites).
- The Open Graph image (`public/og.png`) points at the Sites production origin;
  the GitHub Pages mirror shares the same card.
- The first paint ships about 140 kB of gzipped JavaScript; the plan's 100 kB
  target is not met yet.
- Bot and daily chess, Mines, Pairs, Lights, Snake, 2048 and Reversi never leave
  the device; only an online chess table sends moves to the invited friend.
- Online chess has no server-side referee, so it trusts the two browsers to send
  legal moves; it is for playing a friend, not for ranked or adversarial matches.
- The crowd Worker is deployed separately from the game Worker; both own their
  own D1 database.
- Fonts (Press Start 2P, VT323) are self-hosted under `src/assets/fonts` and are
  licensed under the SIL Open Font License.
