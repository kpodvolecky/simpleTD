import type { CellState, LevelData, Vec2 } from '../types';

/**
 * The grid model (§3.1). Holds per-cell state and coordinate helpers.
 *
 * `blocked` cells are permanent walls; `tower` cells are occupied by a placed
 * tower and are impassable for enemies while a path still exists.
 */
export class Grid {
  readonly width: number;
  readonly height: number;
  readonly cellSize: number;
  private readonly cells: CellState[];

  constructor(width: number, height: number, cellSize: number) {
    this.width = width;
    this.height = height;
    this.cellSize = cellSize;
    this.cells = new Array(width * height).fill('empty');
  }

  static fromLevel(level: LevelData): Grid {
    const grid = new Grid(level.grid.width, level.grid.height, level.cellSize);
    for (const b of level.blocked) grid.set(b.x, b.y, 'blocked');
    for (const r of level.routes) {
      grid.set(r.spawn.x, r.spawn.y, 'spawn');
      grid.set(r.target.x, r.target.y, 'target');
    }
    return grid;
  }

  index(x: number, y: number): number {
    return y * this.width + x;
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  get(x: number, y: number): CellState {
    return this.cells[this.index(x, y)];
  }

  set(x: number, y: number, state: CellState): void {
    this.cells[this.index(x, y)] = state;
  }

  /** Buildable cells are `empty` only (§3.1/§3.2). */
  isBuildable(x: number, y: number): boolean {
    return this.inBounds(x, y) && this.get(x, y) === 'empty';
  }

  /**
   * Passable for enemy movement/pathfinding: everything except permanent
   * walls and towers. Spawn/target/empty are all walkable.
   */
  isWalkable(x: number, y: number): boolean {
    if (!this.inBounds(x, y)) return false;
    const s = this.get(x, y);
    return s !== 'blocked' && s !== 'tower';
  }

  /**
   * Walkable while ignoring towers (used for the Manhattan path-distance metric,
   * §3.2): respects grid bounds and permanent `blocked` cells only.
   */
  isWalkableIgnoringTowers(x: number, y: number): boolean {
    if (!this.inBounds(x, y)) return false;
    return this.get(x, y) !== 'blocked';
  }

  clone(): Grid {
    const g = new Grid(this.width, this.height, this.cellSize);
    for (let i = 0; i < this.cells.length; i++) g.cells[i] = this.cells[i];
    return g;
  }
}

/** 4-directional neighbours (§4.4). Order is used for deterministic tie-breaks. */
export const DIRS: readonly Vec2[] = [
  { x: 0, y: -1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
];

export function keyOf(x: number, y: number): number {
  // Packs coordinates; safe for grids up to 100000 wide.
  return y * 100000 + x;
}

export function manhattan(a: Vec2, b: Vec2): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}
