import type { EnemyTypeData, Route, Vec2 } from '../types';

export type EnemyMode = 'normal' | 'noPath';

/**
 * A live enemy on the field. Movement is continuous with sub-cell interpolation
 * (§4.3): the enemy interpolates from `cell` toward `nextCell` with `progress`
 * in [0,1). Decisions (re-route, mode switch) are only taken at cell boundaries.
 */
export class Enemy {
  readonly id: number;
  readonly type: EnemyTypeData;
  readonly route: Route;
  /** Spawn order across the whole game; the last-resort targeting tie-break (§3.4). */
  readonly spawnOrder: number;

  hp: number;
  /** Maximum HP after any per-wave scaling; used for HP-bar rendering. */
  readonly maxHp: number;
  readonly bounty: number;

  /** The cell the enemy currently occupies (its logical position). */
  cell: Vec2;
  /** The cell it is moving into; equals `cell` when idle at a boundary. */
  nextCell: Vec2;
  /** Interpolation progress from `cell` to `nextCell`, in [0,1). */
  progress = 0;
  /** Base speed scaled by the speedMultiplier at spawn time; used as anchor for slow effects. */
  targetSpeed: number;

  mode: EnemyMode = 'normal';
  alive = true;
  /** Set when the enemy reaches its target and leaks. */
  leaked = false;

  /** Remaining slow duration in ms and its strength (§5.1). */
  slowRemainingMs = 0;
  slowPct = 0;

  /** Seconds until this enemy may attack a tower again (no-path case). */
  attackCooldown = 0;
  /** In the no-path case, the cell of the blocking tower being attacked. */
  attackTargetCell: Vec2 | null = null;

  constructor(
    id: number,
    type: EnemyTypeData,
    route: Route,
    spawnOrder: number,
    hpMultiplier = 1,
    speed = 1,
  ) {
    this.id = id;
    this.type = type;
    this.route = route;
    this.spawnOrder = spawnOrder;
    this.maxHp = type.hp * hpMultiplier;
    this.hp = this.maxHp;
    this.bounty = type.bounty;
    this.cell = { x: route.spawn.x, y: route.spawn.y };
    this.nextCell = { x: route.spawn.x, y: route.spawn.y };
    /**
     * Calculated speed: enemyType.baseSpeed * levelSpeed * waveSpeed.
     * No cumulative effect between waves within the same level.
     */
    this.targetSpeed = type.speed * speed;
  }

  /** True when sitting exactly on a cell boundary (ready to decide). */
  atBoundary(): boolean {
    return this.cell.x === this.nextCell.x && this.cell.y === this.nextCell.y;
  }

  /** Current effective speed in cells/sec after applying any active slow. */
  effectiveSpeed(): number {
    const factor = this.slowRemainingMs > 0 ? 1 - this.slowPct / 100 : 1;
    return this.targetSpeed * factor;
  }

  /**
   * Cells the enemy occupies for build-blocking (§4.3): both the cell it is
   * leaving and the one it is entering while interpolating.
   */
  occupiedCells(): Vec2[] {
    if (this.atBoundary()) return [{ x: this.cell.x, y: this.cell.y }];
    return [
      { x: this.cell.x, y: this.cell.y },
      { x: this.nextCell.x, y: this.nextCell.y },
    ];
  }
}
