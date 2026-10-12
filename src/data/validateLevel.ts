import { DIRS, Grid, keyOf } from '../engine/Grid';
import { computeDistanceField } from '../engine/Pathfinding';
import type { LevelData, Vec2 } from '../types';

/** Thrown when a level fails the §3.1 map-validity rules. */
export class LevelValidationError extends Error {
  constructor(levelId: string, message: string) {
    super(`Invalid level "${levelId}": ${message}`);
    this.name = 'LevelValidationError';
  }
}

function inBounds(level: LevelData, p: Vec2): boolean {
  return (
    p.x >= 0 &&
    p.y >= 0 &&
    p.x < level.grid.width &&
    p.y < level.grid.height
  );
}

/**
 * Validate a level against the §3.1 map-validity rules:
 * - cells of different types may never coincide;
 * - each spawn is paired with exactly one target (one route per spawn);
 * - a target cell may never be completely walled in by permanent `blocked` cells;
 * - a walking path exists from every spawn to its assigned target.
 *
 * Throws `LevelValidationError` on the first violation found.
 */
export function validateLevel(level: LevelData): void {
  const id = level.id;

  if (level.grid.width <= 0 || level.grid.height <= 0) {
    throw new LevelValidationError(id, 'grid dimensions must be positive');
  }

  // --- No coinciding cell types (§3.1) --------------------------------------
  // Track the single type assigned to each cell; any conflict is invalid.
  const typeByCell = new Map<number, string>();
  const assign = (p: Vec2, type: string): void => {
    if (!inBounds(level, p)) {
      throw new LevelValidationError(
        id,
        `${type} cell (${p.x},${p.y}) is out of bounds`,
      );
    }
    const k = keyOf(p.x, p.y);
    const existing = typeByCell.get(k);
    if (existing && existing !== type) {
      throw new LevelValidationError(
        id,
        `cell (${p.x},${p.y}) is both ${existing} and ${type}`,
      );
    }
    if (existing === type) {
      throw new LevelValidationError(
        id,
        `duplicate ${type} cell (${p.x},${p.y})`,
      );
    }
    typeByCell.set(k, type);
  };

  for (const b of level.blocked) assign(b, 'blocked');

  // --- Routes: each spawn paired with exactly one target (§3.1) -------------
  if (level.routes.length === 0) {
    throw new LevelValidationError(id, 'level has no routes');
  }
  const spawnSeen = new Set<number>();
  for (const r of level.routes) {
    const sk = keyOf(r.spawn.x, r.spawn.y);
    if (spawnSeen.has(sk)) {
      throw new LevelValidationError(
        id,
        `spawn (${r.spawn.x},${r.spawn.y}) appears in more than one route`,
      );
    }
    spawnSeen.add(sk);
    assign(r.spawn, 'spawn');
  }
  // Targets may be shared across spawns, so only flag conflicts with other types.
  for (const r of level.routes) {
    const k = keyOf(r.target.x, r.target.y);
    const existing = typeByCell.get(k);
    if (existing && existing !== 'target') {
      throw new LevelValidationError(
        id,
        `cell (${r.target.x},${r.target.y}) is both ${existing} and target`,
      );
    }
    typeByCell.set(k, 'target');
  }

  // --- Build a grid and check reachability (§3.1) ---------------------------
  const grid = Grid.fromLevel(level);

  // A target may never be completely walled in by permanent `blocked` cells.
  for (const r of level.routes) {
    const hasOpenNeighbour = DIRS.some((d) =>
      grid.isWalkableIgnoringTowers(r.target.x + d.x, r.target.y + d.y),
    );
    if (!hasOpenNeighbour) {
      throw new LevelValidationError(
        id,
        `target (${r.target.x},${r.target.y}) is completely walled in`,
      );
    }
  }

  // At least one walking path from every spawn to its assigned target.
  for (const r of level.routes) {
    const field = computeDistanceField(grid, r.target, true);
    if (!field.reachable(r.spawn.x, r.spawn.y)) {
      throw new LevelValidationError(
        id,
        `no path from spawn (${r.spawn.x},${r.spawn.y}) to target ` +
          `(${r.target.x},${r.target.y})`,
      );
    }
  }
}
