# SimpleTD — Tower Defense Game: Development Assignment

## 1. Overview

**SimpleTD** is a browser-based tower defense (TD) game. The core twist is the
**maze-building mechanic**: instead of placing towers along a fixed path, the
player builds towers freely on an open grid to **shape the path** that enemies
must walk from a **spawn location** to a **target location**. Enemies normally
do not attack towers — they have HP and armor and try to reach the target. The
**only exception** is when the player builds the maze so that no walking path to
any target exists: in that case enemies take the shortest path and destroy the
towers blocking their way (see §3.2/§3.3).

The game must run in any modern web browser on:

- Desktop: Windows (PC), macOS, Linux
- Mobile: Android, iOS

This means the game must be responsive, support both mouse and touch input, and
perform well on mid-range mobile hardware.

---

## 2. Goals and Non-Goals

### 2.1 Goals

- A playable TD game running entirely client-side in the browser.
- Level-based progression: each level defines a grid, spawn point(s), target
  point(s), enemy waves, and starting resources.
- Maze-building: towers act as obstacles that force enemies to take longer
  routes; pathfinding recomputes dynamically.
- Cross-platform input: mouse + keyboard on desktop, touch on mobile.
- Smooth performance: target 60 FPS on desktop, ≥30 FPS on mid-range mobile.

### 2.2 Non-Goals (v1)

- No multiplayer / networking **in v1** (planned to be added in the future — do
  not design in a way that would block it later).
- No server-side backend or accounts in v1 (progress stored locally). Accounts
  are planned for the future: **design the code so that adding accounts later
  does not break the architecture** (e.g., abstract persistence behind an
  interface so local storage can be swapped for a remote/account-based store).
- No in-app purchases / monetization in v1 — **not yet, but be ready for it**
  (keep the economy layer isolated so monetization can be layered on later).
- Enemies do **not** attack or destroy towers, **except** when the maze fully
  blocks all paths to every target — then they destroy towers on the shortest
  path (see §3.2/§3.3). Towers therefore have HP and enemies have attack damage.
- No level editor UI in v1 (levels defined via data files).

---

## 3. Core Gameplay Requirements

### 3.1 The Grid

- Each level is a rectangular grid of square cells (e.g., 15×10).
- Cell states: `empty` (buildable), `blocked` (permanent wall, not buildable),
  `spawn`, `target`, `tower` (occupied by a placed tower).
- Spawn cells and target cells are never buildable.
- A level may define **multiple spawn cells and multiple target cells**; this is
  used to increase difficulty in later levels.

### 3.2 Maze Building

- The player places towers on `empty` cells. A placed tower makes its cell
  impassable for enemies (while a valid path still exists).
- **No hard placement restriction:** the player is allowed to place a tower
  anywhere on an `empty` cell, **including** placements that would fully block
  all paths. The player is not prevented from doing so — instead they are
  **penalized**: if no path to any target remains, enemies take the shortest
  route and **destroy the towers in their way** (see §3.3). The engine must
  still provide a fast "would this placement block all paths?" check to drive
  this behavior and the build-UI preview.
- Enemies always follow the current shortest available path (recomputed when the
  maze changes). When no path exists, they path toward the nearest target,
  destroying blocking towers along the shortest route.
- **Selling/removing towers is a must-have:** the player can sell a tower for
  **75% of its accumulated price** (initial purchase cost + all upgrade costs).
  Selling reopens the cell.

### 3.3 Enemies

- Enemies spawn at the spawn location and walk toward the target along the
  shortest path.
- Enemy attributes:
  - **HP** (hit points)
  - **Armor** (flat or percentage damage reduction — define clearly, see §5)
  - **Speed** (cells per second)
  - **Bounty** (currency awarded on kill)
  - **Leak damage** (lives lost if the enemy reaches the target)
  - **Attack damage** (damage dealt to towers — used only in the no-path case)
- Enemies do **not** attack towers, **except** when there is no path to any
  target. In that case they take the shortest route toward a target and attack
  (destroy) any tower blocking that route, using their attack damage. The
  tower/enemy combat here follows the **same rules** as towers attacking enemies
  (damage vs. HP, using the §5 damage model).
- Different enemy types (e.g., fast/low-HP, slow/high-armor, boss) selectable per
  wave.

### 3.4 Towers

- Towers are placed for a currency cost and:
  - Attack enemies within range.
  - Have attributes: **HP**, damage, range, fire rate (attacks/sec), and a
    targeting strategy (e.g., first, last, closest, strongest). HP is used when
    enemies destroy blocking towers in the no-path case (see §3.2/§3.3).
  - Optionally: damage type / armor interaction, splash radius, slow effect.
- Multiple tower types with distinct roles (e.g., basic, splash, slow, sniper).
- Optional upgrades per tower.

### 3.5 Waves & Levels

- Each level has an ordered list of **waves**. Each wave lists enemy groups
  (type, count, spawn interval).
- Player triggers the next wave (or auto-start after a countdown).
- Win condition: survive all waves (target lives > 0 at the end).
- Lose condition: player lives reach 0.
- Resources: starting currency and starting lives defined per level.

---

## 4. Technical Requirements

### 4.1 Platform & Stack

- **Language:** TypeScript (strict mode).
- **Rendering:** HTML5 Canvas 2D (recommended for v1 simplicity) or WebGL via a
  lightweight engine. Choose one and document it. Canvas 2D is the recommended
  default for portability and simplicity.
- **Build tooling:** Vite (fast dev server + production bundle).
- **No heavy framework required** for the game loop; a thin UI layer (plain DOM,
  or a light framework) may be used for menus/HUD.
- Output must be a static bundle (HTML/JS/CSS) deployable to any static host
  (GitHub Pages, Netlify, etc.).

### 4.2 Cross-Platform / Responsiveness

- Canvas scales to viewport while preserving aspect ratio; support high-DPI
  (`devicePixelRatio`).
- Unified pointer input using Pointer Events (covers mouse + touch + pen).
- Prevent unwanted mobile behaviors (pinch-zoom on the play area, text selection,
  context menu on long-press within the canvas).
- Layout must work in both portrait and landscape.

### 4.3 Performance

- Fixed-timestep game loop (e.g., 60 updates/sec) with interpolation for
  rendering, decoupled from render rate via `requestAnimationFrame`.
- Efficient pathfinding: recompute only when the maze changes, not every frame.
- Avoid per-frame allocations in hot loops; reuse objects/pools for
  projectiles/enemies.

### 4.4 Pathfinding

- Use grid pathfinding (A\* or BFS/Dijkstra on the grid).
- Support 4-directional movement in v1 (8-directional is a nice-to-have; if used,
  prevent diagonal corner-cutting through tower cells).
- Provide a fast "would this placement block all paths?" check to drive the
  build-UI preview and the no-path fallback behavior (§3.2).
- Enemies already on the field must gracefully re-route when the path changes,
  and fall back to destroying blocking towers when no path exists (§3.3).

### 4.5 Persistence

- Store level-unlock progress and settings (volume, etc.) in `localStorage`.
- Graceful handling when storage is unavailable.

---

## 5. Combat & Damage Model (define precisely)

Implement and document a clear damage formula. Recommended baseline:

- **Armor as flat reduction:** `damage_dealt = max(1, tower_damage - enemy_armor)`
  (always deal at least 1 to avoid invulnerability), **or**
- **Armor as percentage (chosen for v1):**
  `damage_dealt = tower_damage * (1 - armor_pct)`.

**Decision:** use the **percentage armor** model for v1. Keep it consistent,
apply the same formula for enemies attacking towers in the no-path case, and
expose the constants in a central config so balancing is easy. Optional damage
types (e.g., "piercing" ignores a portion of armor) can be added later.

---

## 6. Data-Driven Content

All content must be defined in data files (JSON or TypeScript modules), not
hard-coded in logic, so levels and balance can change without touching engine
code.

### 6.1 Level schema (example)

```jsonc
{
  "id": "level-01",
  "name": "First Steps",
  "grid": { "width": 15, "height": 10 },
  "cellSize": 48,
  "spawns": [ { "x": 0, "y": 5 } ],
  "targets": [ { "x": 14, "y": 5 } ],
  "blocked": [ { "x": 7, "y": 0 }, { "x": 7, "y": 1 } ],
  "startingCurrency": 200,
  "startingLives": 20,
  "waves": [
    {
      "reward": 50,
      "groups": [
        { "enemyType": "grunt", "count": 10, "intervalMs": 800 }
      ]
    }
  ]
}
```

### 6.2 Enemy type schema (example)

```jsonc
{
  "id": "grunt",
  "hp": 100,
  "armor": 5,
  "speed": 1.5,          // cells per second
  "bounty": 10,
  "leakDamage": 1,
  "attackDamage": 10,   // damage dealt to towers when no path exists
  "sprite": "grunt"
}
```

### 6.3 Tower type schema (example)

```jsonc
{
  "id": "basic",
  "name": "Arrow Tower",
  "cost": 50,
  "hp": 100,             // used when enemies destroy blocking towers
  "damage": 20,
  "range": 2.5,          // in cells
  "fireRatePerSec": 1.5,
  "targeting": "first",
  "splashRadius": 0,     // 0 = single target
  "slowPct": 0,          // 0 = no slow
  "sprite": "basic"
}
```

---

## 7. Suggested Architecture

Keep game logic separate from rendering and input so the core is testable.

```
src/
  main.ts                 # bootstrap, mount canvas, load level
  engine/
    GameLoop.ts           # fixed-timestep loop + rAF render
    Grid.ts               # cell model, coordinate helpers
    Pathfinding.ts        # A*/BFS, "blocks all paths" check
    GameState.ts          # currency, lives, wave progress
  entities/
    Enemy.ts
    Tower.ts
    Projectile.ts
  systems/
    SpawnSystem.ts        # wave spawning
    MovementSystem.ts     # move enemies along path
    CombatSystem.ts       # targeting, firing, damage
    EconomySystem.ts      # bounty, costs
  render/
    Renderer.ts           # canvas draw, DPI scaling
    Hud.ts                # currency, lives, wave UI
  input/
    InputController.ts     # pointer events -> build/select actions
  data/
    levels/*.json
    enemies.json
    towers.json
  config/
    balance.ts            # central tunable constants
  storage/
    Save.ts               # localStorage wrapper
```

---

## 8. UI / UX Requirements

- **Main menu:** level select (locked/unlocked), settings.
- **In-game HUD:** current currency, lives, wave number/total, start-wave button,
  game speed toggle (1×/2×), pause.
- **Build UI:** tower palette; select a tower, then tap/click a cell to place;
  show range preview and validity (green = placeable, red = would block path or
  insufficient funds).
- **Feedback:** clear visuals/sounds for placing, invalid placement, enemy hit,
  enemy leak, wave start, win/lose screens.
- **Accessibility basics:** readable font sizes on mobile, colorblind-friendly
  validity indicators (not color-only — add icons/patterns).

---

## 9. Testing Requirements

- **Unit tests** (e.g., Vitest) for pure logic:
  - Pathfinding correctness and the "blocks all paths" guarantee.
  - Damage/armor formula.
  - Economy (spend/reward) and win/lose conditions.
  - Wave scheduling timing.
- **Manual/E2E smoke test:** load a level, build a maze, run a wave, verify
  enemies reroute, win/lose triggers work.
- Test on at least one mobile browser (touch) and one desktop browser.

---

## 10. Deliverables

1. Source code following the architecture in §7 (TypeScript, Vite).
2. At least **3 playable levels** of increasing difficulty with distinct maze
   layouts.
3. At least **3 tower types** and **3 enemy types**.
4. Central balance config (§6/§5) for easy tuning.
5. Unit tests for core logic (§9).
6. `README.md` with: how to install, run dev server, build, and deploy the static
   bundle.
7. Production build that runs from a static host and works on desktop + mobile.

---

## 11. Acceptance Criteria (Definition of Done)

- [ ] Game loads and runs in Chrome, Firefox, Safari (desktop) and mobile Safari
      + Chrome Android.
- [ ] Player can select a level, place towers to build a maze, and start waves.
- [ ] Towers can be placed anywhere on empty cells; if a placement blocks every
      spawn→target path, enemies take the shortest route and destroy blocking
      towers instead of the placement being rejected.
- [ ] Enemies spawn, follow the shortest path, and re-route when the maze changes.
- [ ] Enemies have HP + armor; towers damage them per the documented percentage
      formula; kills award bounty.
- [ ] Towers have HP; when no path exists, enemies attack/destroy blocking towers
      using the same damage model.
- [ ] Player can sell a tower for 75% of its accumulated price, reopening the cell.
- [ ] Enemies reaching the target reduce player lives; 0 lives = loss.
- [ ] Surviving all waves = win; progress unlocks the next level and is saved
      locally.
- [ ] Input works with both mouse and touch; UI is responsive across screen
      sizes and DPI.
- [ ] Core logic unit tests pass; production build is deployable as static files.

---

## 12. Milestones (suggested order)

1. **Foundation:** project setup (Vite + TS), canvas rendering, DPI scaling,
   game loop, grid rendering.
2. **Pathfinding + maze rule:** A*/BFS, enemy movement along path, "blocks all
   paths?" detection, and no-path fallback (enemies destroy blocking towers).
3. **Towers & combat:** placement, targeting, projectiles, damage/armor, bounty.
4. **Waves & economy:** wave scheduling, currency, lives, win/lose.
5. **Content & UI:** HUD, build palette, menus, 3 levels / 3 towers / 3 enemies.
6. **Polish:** mobile input hardening, sound, game-speed toggle, save/progress,
   tests, production build + deploy docs.

---

## 13. Stretch Goals (post-v1)

- Tower upgrades (selling is a v1 must-have, see §3.2).
- 8-directional movement with correct corner handling.
- More enemy abilities (flying that ignores maze, healing, shields).
- Damage types vs. armor types.
- Level editor UI.
- Endless mode and score leaderboards (local).
