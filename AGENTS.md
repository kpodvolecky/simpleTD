# Project instructions

## Architecture
- Read the existing architecture before making changes.
- Follow the established module boundaries and design conventions.
- Do not introduce new dependencies without justification.

## Development
- Inspect the relevant code and tests before editing.
- Prefer small, focused changes.
- Add or update tests for every behavior change.
- Never weaken or delete tests merely to make them pass.

## Validation
- Run the relevant tests after every implementation change.
- Run the full test suite before declaring the task complete.
- Report exact commands, results, and remaining failures.

## Coordination
- The orchestrator owns task decomposition and integration.
- The analyst and reviewer must not modify source files.
- Do not overwrite unrelated user changes.
- Do not commit or push unless explicitly requested.
- Report blockers instead of silently changing requirements.

# SimpleTD Architecture

## Overview
SimpleTD is a maze-based tower defense game built on Air framework using TypeScript/JavaScript.

## Project Structure

```
/home/karel/IntelliAirProjects/SimpleTD/
├── dist/
│   └── assets/
├── node_modules/
├── src/
│   ├── audio/
│   │   └── AudioManager.ts
│   ├── config/
│   │   └── balance.ts              # Game balance, speed multipliers, waves
│   ├── data/
│   │   └── content.ts              # level definitions, enemy types, tower types
│   ├── engine/
│   │   ├── GameLoop.ts             # Fixed-timestep game loop
│   │   ├── GameState.ts            # Central game state (grid, entities, economy)
│   │   │   ├── pathFields          # Cached distance fields for pathfinding
│   │   │   ├── metricFields        # Manhattan distance metric (towers ignored)
│   │   │   ├── enemies             # All spawned enemies
│   │   │   ├── towers              # All placed towers
│   │   │   └── projectiles         # Projectile pooling
│   │   ├── Grid.ts                 # Grid definition with cell size and bounds
│   │   ├── Pathfinding.ts          # Distance field computation (BFS)
│   │   └── Game.ts                 # Game loop orchestration
│   ├── entities/
│   │   ├── Enemy.ts                # Live enemy: movement, interpolation, cooldowns
│   │   ├── Tower.ts                # Buildable defense unit
│   │   └── Projectile.ts           # Projectiles for tower defense
│   ├── input/
│   │   └── InputController.ts      # Keyboard, mouse, touch handling
│   ├── render/
│   │   ├── Renderer.ts             # Canvas rendering with requestAnimationFrame
│   │   └── Hud.ts                  # Speed toggle, pause, HUD updates
│   ├── systems/
│   │   ├── MovementSystem.ts       # Enemy movement with sub-cell interpolation
│   │   ├── CombatSystem.ts         # Enemy targeting, damage calculation
│   │   │   ├── computeDamage       # Armor percentage, damage floor
│   │   │   ├── inRange             # Distance-based range check
│   │   │   ├── targeting           # "first", "closest", "all"
│   │   │   ├── slow                # Slow effect (50%, 1s)
│   │   │   ├── splash              # Splash damage
│   │   │   └── pathfinding         # Closest-path targeting
│   │   └── SpawnSystem.ts          # Wave spawning with HP multipliers
│   │       ├── GroupSpawner        # Enemy group configuration
│   │       ├── active              # Active group spawners
│   │       ├── countdownMs         # Remaining countdown to next wave
│   │       ├── routeCursor         # Route selection (loop for cycling routes)
│   │       ├── hpMultiplier        # Cumulative HP multiplier
│   │       ├── timerMs             # Timer for spawning
│   │       ├── intervalMs          # Spawning interval between enemies
│   │       ├── remaining           # Number of enemies to spawn
│   │       └── ...
│   ├── storage/
│   │   └── Save.ts                 # LocalSaveStore
│   ├── types/
│   │   └── types.ts                # Type definitions: Vec2, EnemyTypeData, etc.
│   ├── main.ts                     # Game bootstrap (menu, level select, game loop)
│   └── style.css                   # UI styles
```

## Key Systems

### SpawnSystem
- Spawns enemies per wave with HP multipliers based on wave number
- Current implementation: HP multiplier accumulates across waves
- **Fix needed**: Reset enemy base speed to 1.0 for each new level

### CombatSystem
- Enemies target towers using "first", "closest", or "all" targeting modes
- Applies speed penalties to enemies based on slow effect
- Damage calculation: `damage = (maxHp - armor) / armor * damage + 1`
- Enemies leak after reaching targets (leakDamage based)

### Enemy Mechanics
- Movement: Continuous interpolation from current cell to next cell
- Interpolation progress (0 to 1) at cell boundaries
- Current effective speed = baseSpeed × slowPct (0 = no penalty, 1 = full penalty)
- BaseSpeed from enemies.json determines actual movement speed

### Game Loop
- Fixed timestep simulation (fixedDt seconds per update)
- Speed multiplier: 1× or 2× (configurable)
- Interpolation alpha for smooth rendering
- Frame time capped at 0.25s

## Balance Constants

```typescript
// balance.ts
speeds: [0.25, 0.5, 1, 2, 4]        // Enemy base speed multipliers
waveCountdownMs: 10000             // Auto-wave trigger delay
defaultWaveHpMultiplier: 0         // First wave stays at base HP
```

## Enemies Data
```json
// data/enemies.json
{
  "grunt": {
    "speed": 1.5,
    "hp": 100,
    "armor": 5,
    "bounty": 10,
    "attackDamage": 10,
    "attackRange": 1.0,
    "fireRatePerSec": 1.0
  },
  "runner": {
    "speed": 3.0,
    ...
  },
  "tank": {
    "speed": 0.9,
    ...
  },
  "boss": {
    "speed": 0.8,
    ...
  }
}
```

## File Dependencies
- `src/main.ts` - Game loop initialization
- `src/engine/GameLoop.ts` - Time-based simulation
- `src/entities/Enemy.ts` - Enemy movement logic
- `src/data/enemies.json` - Enemy type definitions
- `src/systems/SpawnSystem.ts` - Wave spawning

## Testing
Tests verify:
- Wave auto-start after countdown
- Single wave spawning per interval
- HP multiplier accumulation
- Enemy collision detection
- Speed reset per level (fixed speed vs HP multiplier)
