# SimpleTD

**SimpleTD** is a browser-based, maze-building tower defense game. Instead of
placing towers along a fixed path, you build towers freely on an open grid to
**shape the path** enemies must walk from each spawn to its assigned target.
Enemies normally ignore towers and race for their target — but if you wall them
in completely, they take the shortest tower-ignoring route and destroy the
towers in their way.

See [docs/ASSIGNMENT.md](docs/ASSIGNMENT.md) for the full specification.

## Tech stack

- **Language:** TypeScript (strict mode)
- **Rendering:** HTML5 Canvas 2D with high-DPI (`devicePixelRatio`) scaling
- **Build tooling:** [Vite](https://vitejs.dev/)
- **Tests:** [Vitest](https://vitest.dev/)
- **Input:** unified Pointer Events (mouse + touch + pen)

The output is a static bundle (HTML/JS/CSS) deployable to any static host.

## Project layout

```
src/
  main.ts            # bootstrap, mount canvas, load level
  Game.ts            # wires engine, systems, entities together
  engine/            # GameLoop, GameState, Grid, Pathfinding
  entities/          # Enemy, Tower, Projectile
  systems/           # Spawn, Movement, Combat, Economy
  render/            # Renderer (Canvas 2D), Hud
  input/             # InputController (pointer events)
  data/              # levels/*.json, enemies.json, towers.json, content loader
  config/balance.ts  # central tunable constants
  storage/Save.ts    # localStorage wrapper (progress + settings)
tests/               # Vitest unit tests (pathfinding, combat)
```

## Prerequisites

- [Node.js](https://nodejs.org/) 18+ and npm

## Install

```bash
npm install
```

## Run the dev server

```bash
npm run dev
```

Vite prints a local URL (default http://localhost:5173). Open it in your
browser; changes hot-reload automatically.

## Type-check and test

```bash
npm run typecheck   # tsc --noEmit
npm test            # vitest run
npm run test:watch  # vitest in watch mode
```

## Production build

```bash
npm run build       # type-checks, then builds to dist/
npm run preview     # serve the built bundle locally to verify
```

The production bundle is written to `dist/`.

## Deploy

`dist/` contains fully static assets and the Vite `base` is set to `./`, so it
can be served from any static host or sub-path:

- **GitHub Pages / Netlify / Vercel / S3:** upload the contents of `dist/`.
- **Any web server:** serve the `dist/` directory as static files.

No backend is required; progress and settings are stored in `localStorage`.

## Gameplay basics

1. Pick a level from the main menu (progression is linear — only completed
   levels unlock the next).
2. Select a tower from the build palette, then click/tap an empty cell to place
   it. The range preview and validity indicator help you plan the maze.
3. Start a wave manually or wait for the 10-second auto-start countdown.
4. Sell a tower any time (including mid-wave) for 75% of its cost.
5. Win by clearing all waves with lives remaining; lose if lives reach 0.
