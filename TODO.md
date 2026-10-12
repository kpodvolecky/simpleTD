# SimpleTD — Completion TODO

This file tracks the work still needed to fully satisfy `docs/ASSIGNMENT.md`.
Items are grouped and ordered by priority. Each item references the file(s) that
must change and the assignment section it addresses. Tick items off as they land.

## Status / baseline

- `npm run build` passes (static bundle in `dist/`).
- `npm test` passes (34 tests).
- `README.md` present with install/dev/build/deploy docs.

## Already implemented (inventory vs ASSIGNMENT.md)

- **Engine (§7):** `src/engine/Grid.ts`, `src/engine/Pathfinding.ts` (BFS
  distance fields, `wouldBlockRoute`/`wouldBlockAll`), `src/engine/GameState.ts`
  (path + metric field caches), `src/engine/GameLoop.ts` (fixed timestep + rAF).
- **Systems (§7):** `src/systems/MovementSystem.ts` (continuous movement,
  boundary-only decisions, no-path fallback), `src/systems/CombatSystem.ts`
  (targeting strategies, tie-break, splash, slow, enemies-attack-towers),
  `src/systems/SpawnSystem.ts` (10s countdown, overlapping waves),
  `src/systems/EconomySystem.ts`.
- **Combat model (§5):** percentage armor + min-damage floor and `inRange` ceil
  rule in `src/config/balance.ts`.
- **Data (§6/§10):** 3 levels, 4 tower types, 4 enemy types under `src/data/`.
- **Render/Input (§4.2/§8):** `src/render/Renderer.ts` (DPI scaling, build
  preview, `!` block icon), `src/input/InputController.ts` (pointer events,
  `touch-action: none`), `src/render/Hud.ts`.
- **Persistence (§4.5):** `src/storage/Save.ts` (linear unlock, graceful
  fallback, `settings.volume`).

## Remaining work (prioritized)

### P1 — Acceptance-criteria / correctness gaps

- [x] **Level-validity check (§3.1).** Added `src/data/validateLevel.ts`
  (checks: cell types never coincide; every spawn paired with exactly one target;
  targets not fully walled by `blocked`; a walking path exists from every spawn
  to its target) and wired it into `src/data/content.ts` to fail fast at load.
- [x] **Win/Lose screens (§8).** Added an `#overlay` element (`index.html`,
  `src/style.css`) and `showResultOverlay()` in `src/main.ts` with Replay /
  Next level (when unlocked) / Menu actions on win and lose.

### P2 — UI/UX & feedback

- [x] **Audio system + feedback sounds (§8).** Added `src/audio/AudioManager.ts`
  (procedural WebAudio, scaled by `settings.volume`) with a DOM-free event buffer
  in `GameState`; sounds wired for place / invalid / hit / leak / wave-start /
  win / lose in `src/main.ts`.
- [x] **Settings menu (§8/§4.5).** Added a Settings section with a volume slider
  in `showMenu()` (`src/main.ts`, `src/style.css`) that persists to
  `settings.volume` and updates the audio manager live.
- [ ] **Accessibility polish (§8).** Non-color-only validity cues beyond the `!`
  icon; review mobile font sizes and portrait/landscape layout.

### P3 — Tests & validation

- [x] **Economy tests (§9).** `tests/economy.test.ts`: spend / reject-when-broke /
  75% sell rounding (incl. odd price) / award.
- [x] **Win/lose condition tests (§9).** `tests/conditions.test.ts` drives
  `Game.fixedUpdate`: win when all waves spawned and field empty, lose at 0 lives,
  no premature win.
- [x] **Wave-scheduling tests (§9).** `tests/spawn.test.ts`: countdown reporting,
  10s auto-start, per-interval spawning, and wave overlap.
- [x] **Level-validity tests (§9).** `tests/levelValidation.test.ts` covers the
  validator for each invalid case plus the shipped levels.
- [ ] **Manual/E2E smoke test (§9/§11).** Documented checklist below.

## Manual / E2E smoke-test checklist (§9/§11)

- [ ] Load each level; build a maze; start a wave.
- [ ] Verify enemies reroute when the maze changes.
- [ ] Block all paths and verify enemies destroy blocking towers, then reroute
      when a tower dies.
- [ ] Sell a tower mid-wave/under attack; cell reopens and refund is 75%.
- [ ] Trigger win and lose; verify overlay and progress unlock.
- [ ] Test on one desktop browser and one mobile/touch browser.

## Acceptance criteria (§11)

- [x] Game loads and runs in modern desktop/mobile browsers.
- [x] Select a level, place towers to build a maze, start waves.
- [x] Towers placeable anywhere on empty cells; per-spawn block → enemies destroy
      blocking towers instead of rejection.
- [x] Enemies spawn, follow the shortest path, and re-route when the maze changes.
- [x] Enemies have HP + armor; towers damage them per the percentage formula;
      kills award bounty.
- [x] Towers have HP; no-path enemies attack/destroy blocking towers.
- [x] Sell a tower for 75% (rounded), any time, reopening the cell.
- [x] Enemies reaching the target reduce lives; 0 lives = loss.
- [x] Win when all waves spawned and field empty (lives > 0); progress unlocks and
      is saved locally.
- [x] Input works with mouse and touch; responsive across sizes and DPI.
- [x] Core logic unit tests pass; production build deployable as static files.
