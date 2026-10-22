// Shared data types for SimpleTD.
// Content schemas (§6) and engine-level value types live here so both the
// pure logic and the rendering/input layers can share them.

export interface Vec2 {
  x: number;
  y: number;
}

/** Cell states on the grid (§3.1). */
export type CellState = 'empty' | 'blocked' | 'spawn' | 'target' | 'tower';

export type TargetingStrategy = 'first' | 'last' | 'closest' | 'strongest';

/** A route pairs exactly one spawn with exactly one target (§3.1). */
export interface Route {
  spawn: Vec2;
  target: Vec2;
}

export interface EnemyGroup {
  enemyType: string;
  count: number;
  intervalMs: number;
}

export interface Wave {
  groups: EnemyGroup[];
  /**
   * Optional per-wave HP multiplier applied relative to the previous wave
   * (§3.5). Enemy HP grows cumulatively across waves: the effective multiplier
   * for a wave is the product of this factor and all preceding waves' factors.
   * When omitted, `balance.defaultWaveHpMultiplier` is used instead.
   */
  hpMultiplier?: number;
}

export interface LevelData {
  id: string;
  name: string;
  grid: { width: number; height: number };
  /** Logical units per cell, scaled to the viewport at render time (§4.3/§6.1). */
  cellSize: number;
  routes: Route[];
  blocked: Vec2[];
  startingCurrency: number;
  startingLives: number;
  waves: Wave[];
}

export interface EnemyTypeData {
  id: string;
  hp: number;
  /** Percentage armor 0–100 (§5). */
  armor: number;
  /** Cells per second (continuous movement, §4.3). */
  speed: number;
  bounty: number;
  leakDamage: number;
  attackDamage: number;
  /** Cells, Manhattan path-distance (§5.1). */
  attackRange: number;
  fireRatePerSec: number;
  sprite: string;
}

export interface TowerTypeData {
  id: string;
  name: string;
  cost: number;
  hp: number;
  damage: number;
  /** Cells, Manhattan path-distance (§5.1). */
  range: number;
  fireRatePerSec: number;
  targeting: TargetingStrategy;
  /** Cells; 0 = single target. */
  splashRadius: number;
  /** 0 = no slow. */
  slowPct: number;
  slowDurationMs: number;
  sprite: string;
}
