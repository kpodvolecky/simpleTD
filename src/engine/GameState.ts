import { Grid, keyOf } from './Grid';
import {
  DistanceField,
  computeDistanceField,
  reconstructPath,
} from './Pathfinding';
import { Enemy } from '../entities/Enemy';
import { Tower } from '../entities/Tower';
import { ProjectilePool } from '../entities/Projectile';
import type {
  EnemyTypeData,
  LevelData,
  TowerTypeData,
  Vec2,
} from '../types';

export type GameStatus = 'building' | 'running' | 'won' | 'lost';

/** Gameplay events emitted by the systems for feedback (sound/UI, §8). */
export type GameEventType = 'enemyHit' | 'enemyKilled' | 'leak' | 'towerDestroyed';

/**
 * Central mutable game state (§7). Holds the grid, all entities, economy, and
 * cached distance fields. Two kinds of fields are cached:
 *
 * - **path fields** (towers count as obstacles) drive real enemy movement and
 *   are recomputed whenever the maze changes.
 * - **metric fields** (towers ignored, only permanent `blocked` respected)
 *   implement the engine-wide Manhattan path-distance metric (§3.2/§5.1). They
 *   depend only on the constant wall layout, so they are computed once and
 *   cached for the whole level.
 */
export class GameState {
  readonly level: LevelData;
  readonly grid: Grid;
  readonly enemyTypes: Map<string, EnemyTypeData>;
  readonly towerTypes: Map<string, TowerTypeData>;

  readonly enemies: Enemy[] = [];
  readonly towers: Tower[] = [];
  readonly projectiles = new ProjectilePool();

  currency: number;
  lives: number;
  status: GameStatus = 'building';
  speed = 1;

  /** True once every wave has been fully spawned (§3.5 win check). */
  allWavesSpawned = false;

  /** Feedback events emitted this tick; drained by the presentation layer (§8). */
  readonly events: GameEventType[] = [];

  private nextEnemyId = 1;
  private nextTowerId = 1;
  private spawnCounter = 0;

  private pathFields = new Map<number, DistanceField>();
  private readonly metricFields = new Map<number, DistanceField>();

  constructor(
    level: LevelData,
    enemyTypes: EnemyTypeData[],
    towerTypes: TowerTypeData[],
  ) {
    this.level = level;
    this.grid = Grid.fromLevel(level);
    this.enemyTypes = new Map(enemyTypes.map((e) => [e.id, e]));
    this.towerTypes = new Map(towerTypes.map((t) => [t.id, t]));
    this.currency = level.startingCurrency;
    this.lives = level.startingLives;
    this.recomputePathFields();
  }

  // --- Distance fields ------------------------------------------------------

  /** Path field toward a target honouring towers as obstacles. */
  pathFieldForTarget(target: Vec2): DistanceField {
    const k = keyOf(target.x, target.y);
    let f = this.pathFields.get(k);
    if (!f) {
      f = computeDistanceField(this.grid, target, false);
      this.pathFields.set(k, f);
    }
    return f;
  }

  /** Metric field (towers ignored) from an arbitrary source cell. Cached. */
  metricFieldFrom(source: Vec2): DistanceField {
    const k = keyOf(source.x, source.y);
    let f = this.metricFields.get(k);
    if (!f) {
      f = computeDistanceField(this.grid, source, true);
      this.metricFields.set(k, f);
    }
    return f;
  }

  /**
   * Manhattan path-distance (ignoring towers) between two cells (§3.2/§5.1).
   * Returns Infinity when there is no walkable route respecting walls.
   */
  metricDistance(from: Vec2, to: Vec2): number {
    const d = this.metricFieldFrom(to).distanceAt(from.x, from.y);
    return d < 0 ? Infinity : d;
  }

  /** Recompute all tower-aware path fields (called on any maze change). */
  recomputePathFields(): void {
    this.pathFields.clear();
    for (const r of this.level.routes) this.pathFieldForTarget(r.target);
  }

  // --- Entities & economy ---------------------------------------------------

  spawnEnemy(
    type: EnemyTypeData,
    routeIndex: number,
    hpMultiplier = 1,
    speed = 1,
  ): Enemy {
    const route = this.level.routes[routeIndex];
    const e = new Enemy(
      this.nextEnemyId++,
      type,
      route,
      this.spawnCounter++,
      hpMultiplier,
      speed,
    );
    this.enemies.push(e);
    return e;
  }

  canAfford(cost: number): boolean {
    return this.currency >= cost;
  }

  /** Record a feedback event for the presentation layer (§8). */
  emit(type: GameEventType): void {
    this.events.push(type);
  }

  /** Return and clear all feedback events buffered since the last call. */
  drainEvents(): GameEventType[] {
    if (this.events.length === 0) return [];
    const out = this.events.slice();
    this.events.length = 0;
    return out;
  }

  /** Cell occupied by an enemy? Used for the build restriction (§4.3). */
  isCellOccupiedByEnemy(x: number, y: number): boolean {
    for (const e of this.enemies) {
      if (!e.alive) continue;
      for (const c of e.occupiedCells()) {
        if (c.x === x && c.y === y) return true;
      }
    }
    return false;
  }

  placeTower(typeId: string, cell: Vec2): Tower | null {
    const type = this.towerTypes.get(typeId);
    if (!type) return null;
    if (!this.grid.isBuildable(cell.x, cell.y)) return null;
    if (this.isCellOccupiedByEnemy(cell.x, cell.y)) return null;
    if (!this.canAfford(type.cost)) return null;

    this.currency -= type.cost;
    const tower = new Tower(this.nextTowerId++, type, cell);
    this.towers.push(tower);
    this.grid.set(cell.x, cell.y, 'tower');
    this.recomputePathFields();
    return tower;
  }

  sellTower(tower: Tower): void {
    if (!tower.alive) return;
    tower.alive = false;
    this.currency += tower.sellValue();
    this.removeTowerFromGrid(tower);
  }

  /** Destroy a tower with no refund (§3.3, enemy destroyed it). */
  destroyTower(tower: Tower): void {
    if (!tower.alive) return;
    tower.alive = false;
    this.emit('towerDestroyed');
    this.removeTowerFromGrid(tower);
  }

  private removeTowerFromGrid(tower: Tower): void {
    this.grid.set(tower.cell.x, tower.cell.y, 'empty');
    const i = this.towers.indexOf(tower);
    if (i >= 0) this.towers.splice(i, 1);
    this.recomputePathFields();
  }

  towerAt(x: number, y: number): Tower | undefined {
    return this.towers.find((t) => t.alive && t.cell.x === x && t.cell.y === y);
  }

  /** Shortest path (towers as obstacles) from a cell to a target, or null. */
  pathTo(from: Vec2, target: Vec2): Vec2[] | null {
    return reconstructPath(this.pathFieldForTarget(target), from);
  }
}
