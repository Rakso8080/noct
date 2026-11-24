# Noct

Noct is a small, account-free games site: seven nightly boards (Common, Rare, Noct,
Chess, Mines, Pairs, Lights) and an arcade of three more tables (Snake, 2048,
Reversi). Everything is playable in the browser; side-game records live in
`localStorage`.

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
npm test             # node:test: snake, 2048, reversi, lights, chess, gamesStore
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
totals in D1. It is **not deployed** here: `wrangler.jsonc` still carries the
placeholder `database_id`, Pages builds without `VITE_CROWD_API`, and the app
falls back to the authored shares. Deploying it needs the owner's Cloudflare
credentials and is deliberately out of scope.

## Language

The interface ships in English and Norwegian. The switch is in Settings → Language
and is stored in `localStorage` (`noct.lang.v1`). Copy lives in `src/lib/i18n.ts`
with English as the key, so an untranslated string falls back to English instead
of breaking a screen.

## Known limitations

- Standings and global counts are local on the static build (no shared table).
- The archive holds the last 365 nights; today's board lives under Noct.
- Chess, Mines, Pairs, Lights, Snake, 2048 and Reversi never leave the device.
- Cloudflare Workers/D1 deployment for the crowd is intentionally not configured.
- Fonts (Press Start 2P, VT323) are self-hosted under `src/assets/fonts` and are
  licensed under the SIL Open Font License.
