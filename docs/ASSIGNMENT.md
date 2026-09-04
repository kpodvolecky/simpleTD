# SimpleTD — Tower Defense Game: Development Assignment

## 1. Overview

**SimpleTD** is a browser-based tower defense (TD) game. The core twist is the
**maze-building mechanic**: instead of placing towers along a fixed path, the
player builds towers freely on an open grid to **shape the path** that enemies
must walk from a **spawn location** to a **target location**. Each spawn is
assigned exactly one target; an enemy always knows which target it is heading
for. Enemies normally do not attack towers — they have HP and armor and try to
reach their target. The **only exception** is when the player builds the maze so
that no walking path to that enemy's target exists: in that case the enemy takes
the shortest route (measured as **Manhattan path-distance** while **ignoring
towers**) toward its target and destroys the towers blocking its way (see
§3.2/§3.3).

The game must run in any modern web browser on:

- Desktop: Windows (PC), macOS, Linux
- Mobile: Android, iOS

This means the game must be responsive, support both mouse and touch input, and
perform well on mid-range mobile hardware.

---

## 2. Goals and Non-Goals

### 2.1 Goals

- A playable TD game running entirely client-side in the browser.
- Level-based progression: each level defines a grid, a set of **routes**
  (spawn→target tuples, see §3.1), enemy waves, and starting resources.
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
  blocks all paths from a spawn to **its assigned target** — then enemies from
  that spawn destroy towers on the shortest route (see §3.2/§3.3). Towers
  therefore have HP and enemies have attack damage, attack range, and fire rate.
- No level editor UI in v1 (levels defined via data files).

---

## 3. Core Gameplay Requirements

### 3.1 The Grid

- Each level is a rectangular grid of square cells (e.g., 15×10).
- Cell states: `empty` (buildable), `blocked` (permanent wall, not buildable),
  `spawn`, `target`, `tower` (occupied by a placed tower).
- Spawn cells and target cells are never buildable.
- A level may define **multiple spawn cells and multiple target cells**; this is
  used to increase difficulty in later levels. The map is defined as a list of
  **spawn+target tuples (routes)**, not as two independent arrays of spawns and
  targets. **There is no multi-target scenario:** each spawn has one and only one
  target. Multiple spawns **may** share the same target cell, but a single spawn
  never points at more than one target.
- **Map validity:** cells of different types may never coincide (a cell cannot
  be both, e.g., `spawn` and `blocked`); such a map is invalid. Each spawn must
  appear in exactly one route and be paired with exactly one target. A target
  cell may never be completely walled in by permanent `blocked` cells. A level is
  valid only if there is at least one walking path from every spawn to its
  assigned target.

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
- Enemies always follow the current shortest available path to **their assigned
  target** (recomputed when the maze changes). The "would this placement block
  all paths?" check is **per-spawn against its own target**: a placement is a
  blocking (no-path) situation for an enemy only when no walking path from its
  spawn to its target remains. One spawn may be blocked while another is not.
- **No-path behavior:** when an enemy has no path to its target, it first walks
  as close to that target as possible — advancing to the reachable cell that
  minimizes the sum of (distance already walked) + (remaining **Manhattan
  path-distance** to the target, ignoring towers). It then finds the nearest
  tower blocking the path toward the target and, once that tower is within the
  enemy's attack range, starts attacking it (see §3.3). All distances throughout
  the engine (movement, pathfinding cost, no-path fallback, and range checks)
  are measured as **Manhattan path-distance**: the length of the shortest
  4-directional route that respects grid bounds and permanent `blocked` cells
  but **ignores towers**. On an obstacle-free grid this equals the straight
  `|dx| + |dy|` Manhattan distance. When two or more reachable cells tie for the
  minimizing sum above, the enemy prefers the cell with the smaller remaining
  Manhattan path-distance to the target, and if still tied, the lower `(y, x)`
  cell coordinate. The **nearest tower blocking the path** is the first tower
  lying on the enemy's shortest tower-ignoring route to the target, measured by
  Manhattan path-distance from the enemy's current cell.
- **Recompute on tower death:** whenever a tower is destroyed, the maze changes,
  so the per-spawn "blocks all paths?" check is re-run and every affected enemy
  **immediately** switches back to normal shortest-path movement if a real path
  to its target has reopened.
- **Re-advance after tower death mid-attack:** an enemy that was attacking a
  blocking tower must, the moment any tower dies, re-evaluate the per-spawn
  path-finding rule. If a real path reopened it resumes normal shortest-path
  movement; if paths are still fully blocked it re-runs the **no-path behavior**
  above — re-advancing as close to the target as possible and, if needed,
  re-activating the no-path attack behavior against the next blocking tower.
- **Selling/removing towers is a must-have:** the player can sell a tower for
  **75% of its purchase price** (v1 has no upgrades — see §13), **rounded to the
  nearest integer**. A tower may be sold at any time, **including mid-wave and
  while it is under attack**; the selling price is not affected by damage taken.
  Selling reopens the cell.

### 3.3 Enemies

- Enemies spawn at the spawn location and walk toward the target along the
  shortest path.
- Enemy attributes:
  - **HP** (hit points)
  - **Armor** (percentage damage reduction, 0–100 — see §5)
  - **Speed** (cells per second; movement is continuous with sub-cell
    interpolation, see §4.3)
  - **Bounty** (currency awarded on kill)
  - **Leak damage** (lives lost if the enemy reaches the target)
  - **Attack damage** (damage dealt to towers — used only in the no-path case)
  - **Attack range** (cells; how close the enemy must be to attack a tower)
  - **Fire rate** (attacks/sec against towers in the no-path case)
- Enemies do **not** attack towers, **except** when there is no path to **their
  assigned target**. In that case they first advance as close to the target as
  possible (see §3.2), then attack the nearest blocking tower once it is within
  attack range, firing at their fire rate. The tower/enemy combat here follows
  the **same rules** as towers attacking enemies (damage vs. HP, using the §5
  damage model), including the minimum-damage floor.
- **Simultaneity:** many enemies may target and stack damage on the same
  blocking tower, and multiple enemies may occupy and attack from adjacent cells
  at the same time. Within a single tick all attacks scheduled for that tick are
  applied to the tower's HP first, and the death check runs once afterwards;
  overkill damage is simply wasted (no refund, no carry-over).
- **No refund:** when an enemy destroys a tower the player receives no refund —
  losing the tower is the penalty for blocking the maze.
- Different enemy types (e.g., fast/low-HP, slow/high-armor, boss) selectable per
  wave.

### 3.4 Towers

- Towers are placed for a currency cost and:
  - Attack enemies within range.
  - Have attributes: **HP**, damage, range, fire rate (attacks/sec), and a
    targeting strategy (`first`, `last`, `closest`, `strongest`). HP is used when
    enemies destroy blocking towers in the no-path case (see §3.2/§3.3). Because
    each enemy has exactly one assigned target, `first`/`last` are unambiguous:
    they refer to the enemy's progress along its path toward that target,
    measured as the **remaining Manhattan path-distance** to the target (`first`
    = smallest remaining distance / furthest along, `last` = largest remaining
    distance / least advanced). During the no-path fallback an enemy has no
    normal path, so its progress is measured the same way: the remaining
    Manhattan path-distance (ignoring towers) from its current cell to the
    target. `closest` is the enemy at the smallest Manhattan path-distance from
    the tower's own cell; `strongest` is the enemy with the highest **current
    HP** (ties fall through to the rule below).
  - **Tie-breaking rule (all strategies):** whenever a targeting strategy leaves
    two or more candidate enemies tied (e.g., equal progress, equal distance, or
    equal strength), the tower picks the enemy that was **spawned first** (lowest
    spawn order / oldest on the field). This last-resort tie-breaker applies to
    every tower targeting strategy.
  - **HP damage is permanent:** towers are not repaired and do not regenerate HP
    between waves; damage persists until the tower is destroyed or the game ends.
  - Optionally: damage type / armor interaction, splash radius, slow effect.
- Multiple tower types with distinct roles (e.g., basic, splash, slow, sniper).
- **Tower upgrades are out of scope for v1** (post-v1, see §13).

### 3.5 Waves & Levels

- Each level has an ordered list of **waves**. Each wave lists enemy groups
  (type, count, spawn interval).
- Player triggers the next wave, or it **auto-starts after a fixed 10-second
  countdown**. Waves may **overlap**: if the player starts (or the countdown
  triggers) the next wave before the previous one is cleared, the new enemies
  are simply added to those already on the field.
- **Reward accounting under overlap:** the reward is an **attribute of each
  spawned unit** (its `bounty`). It is fixed on the unit **at the moment it is
  spawned** and paid out when that unit is killed, regardless of which wave is
  active or how many waves overlap. There is no separate wave-level reward that
  could be double-counted or lost during overlap.
- Win condition: all waves have been fully spawned **and there are no enemies
  left on the field** (and player lives > 0). Because waves may overlap, the win
  is evaluated on the emptiness of the field, not on per-wave boundaries.
- **Enemy removal (leak):** an enemy that reaches its target deals its leak
  damage and is **immediately removed** from the field, so it counts toward the
  "no enemies left" win check.
- **Stalemate:** if every remaining enemy is permanently stuck in the no-path
  attack state (never dying and never reaching a target), the field never empties
  and the game is neither won nor lost until towers are destroyed and the enemies
  either leak (possible loss) or a path reopens. This is the intended
  consequence of fully mazing yourself in.
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
- Enemy movement is **continuous through cells** (sub-cell interpolation), not
  cell-stepped, so towers and enemies can be smoothly animated within each cell
  (a cell has a fixed **logical** square size, see §6.1, scaled to pixels at
  render time).
- **Movement vs. re-routing granularity:** although the loop runs at a fixed
  rate (e.g., 60 Hz) and the maze may change mid-cell, an enemy **always
  finishes moving into the cell it is currently entering** before it makes any
  new decision (re-route, switch to no-path behavior, etc.). Decisions are taken
  only at cell boundaries, never mid-cell.
- **Build restriction:** the player **cannot build a tower on a cell that is
  currently occupied by an enemy.** While an enemy is interpolating between two
  cells it is considered to occupy **both** the cell it is leaving and the cell
  it is entering, so neither can be built on until it has fully entered its next
  cell. This keeps enemy movement into a target cell unambiguous.
- Efficient pathfinding: recompute only when the maze changes, not every frame.
- **Maximum grid size is 100×50 cells** (configurable). The pathfinding and
  "recompute only on change" performance guarantees must hold up to this size.
- Avoid per-frame allocations in hot loops; reuse objects/pools for
  projectiles/enemies.

### 4.4 Pathfinding

- Use grid pathfinding (A\* or BFS/Dijkstra on the grid), computed per spawn
  toward that spawn's assigned target.
- Movement is strictly **4-directional**. 8-directional movement is **not**
  supported (neither in v1 nor as a stretch goal).
- Provide a fast "would this placement block all paths?" check to drive the
  build-UI preview and the no-path fallback behavior (§3.2).
- Enemies already on the field must gracefully re-route when the path changes,
  and fall back to destroying blocking towers when no path exists (§3.3).

### 4.5 Persistence

- Store level-unlock progress and settings (volume, etc.) in `localStorage`.
- Graceful handling when storage is unavailable.
- **Progression is strictly linear.** On first launch only level 1 is unlocked;
  completing a level unlocks the next one in order.

---

## 5. Combat & Damage Model (define precisely)

Implement and document a clear damage formula. Recommended baseline:

- **Armor as percentage (chosen for v1):**
  `damage_dealt = max(1, damage * (1 - armor_pct))`.

**Decision:** use the **percentage armor** model for v1. Armor is expressed as a
percentage (`armor_pct` = armor / 100, where `armor` is an integer in 0–100).
A **minimum-damage floor of 1** always applies, so even armor ≥ 100% still takes
at least 1 damage per hit (no invulnerability). Keep it consistent, apply the
same formula for enemies attacking towers in the no-path case, and expose the
constants in a central config so balancing is easy. Optional damage types (e.g.,
"piercing" ignores a portion of armor) can be added later.

### 5.1 Range, splash, and slow semantics

- **Range (towers and enemy attack range):** measured in cells using the
  **Manhattan path-distance** from the attacker's cell (consistent with the
  engine-wide metric in §3.2). Keep the metric behind a single helper so it can
  be changed (e.g., to Euclidean/Chebyshev) later.
- **Fractional ranges:** a target at Manhattan distance `d` is in range when
  `d <= ceil(range)`. Fractional range values are therefore rounded **up** for
  the comparison.
- **Splash:** `splashRadius` is in cells, measured as **Manhattan path-distance**
  from the splash center using the same `d <= ceil(splashRadius)` rule as range;
  splash deals **full damage** across the whole radius (no edge falloff in v1).
- **Slow:** a slow effect has a `slowPct` and a `slowDurationMs`. Slows do **not**
  stack: a new slow hit does not add up. Instead the **strongest** slow (the
  highest `slowPct`) applies, and its remaining duration is refreshed on **every**
  new hit regardless of that hit's strength. **Slow always
  targets only enemies** (never towers), so it does not interact with the
  tower-damage floor: the damage floor / armor / splash rules apply to HP damage,
  while slow is a separate movement-only effect on enemies.

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
  "cellSize": 48,        // logical units per cell (not pixels); scaled to the
                         // viewport at render time (see §4.2/§4.3)
  // Each route pairs exactly one spawn with exactly one target as a tuple.
  // Spawns and targets are NOT independent arrays; there is no multi-target
  // scenario — every spawn has one and only one target.
  "routes": [
    { "spawn": { "x": 0, "y": 5 }, "target": { "x": 14, "y": 5 } }
  ],
  "blocked": [ { "x": 7, "y": 0 }, { "x": 7, "y": 1 } ],
  "startingCurrency": 200,
  "startingLives": 20,
  "waves": [
    {
      // No wave-level reward: the reward is the per-unit `bounty` (see §6.2),
      // fixed on each unit at spawn time (see §3.5).
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
  "armor": 5,            // percentage (0–100); 5 = 5% damage reduction
  "speed": 1.5,          // cells per second (continuous movement)
  "bounty": 10,          // reward; copied onto each unit at spawn time (§3.5)
  "leakDamage": 1,
  "attackDamage": 10,    // damage dealt to towers when no path exists
  "attackRange": 1.0,    // cells (Manhattan path-distance); reach vs. towers
  "fireRatePerSec": 1.0, // attacks/sec against towers in the no-path case
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
  "range": 2.5,          // in cells (Manhattan path-distance, see §5.1)
  "fireRatePerSec": 1.5,
  "targeting": "first",  // first | last | closest | strongest
  "splashRadius": 0,     // cells; 0 = single target, full damage across radius
  "slowPct": 0,          // 0 = no slow
  "slowDurationMs": 0,   // slow duration; slows refresh, never stack
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
- [ ] Towers can be placed anywhere on empty cells; if a placement blocks a
      given spawn's only path to its assigned target (evaluated **per spawn**),
      the enemies from that spawn take the shortest route and destroy blocking
      towers instead of the placement being rejected.
- [ ] Enemies spawn, follow the shortest path, and re-route when the maze changes.
- [ ] Enemies have HP + armor; towers damage them per the documented percentage
      formula; kills award bounty.
- [ ] Towers have HP; when no path exists, enemies attack/destroy blocking towers
      using the same damage model.
- [ ] Player can sell a tower for 75% of its purchase price (rounded to nearest),
      any time including mid-wave/under attack, reopening the cell.
- [ ] Enemies reaching the target reduce player lives; 0 lives = loss.
- [ ] Win is reached when all waves are spawned and no enemies remain on the
      field (lives > 0); progress unlocks the next level and is saved locally.
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
- More enemy abilities (flying that ignores maze, healing, shields).
- Damage types vs. armor types.
- Level editor UI.
- Endless mode and score leaderboards (local).
