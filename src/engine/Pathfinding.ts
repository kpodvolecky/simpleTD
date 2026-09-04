import { DIRS, Grid } from './Grid';
import type { Vec2 } from '../types';

const UNREACHABLE = -1;

/**
 * A BFS distance field measured from a single target cell over the 4-directional
 * grid. Because every step costs 1, BFS yields the true shortest-path distance
 * (Manhattan path-distance, §3.2) for each cell. Paths are reconstructed by
 * walking downhill on this field, which keeps the metric and movement in sync.
 */
export class DistanceField {
  readonly grid: Grid;
  readonly target: Vec2;
  readonly dist: Int32Array;

  constructor(grid: Grid, target: Vec2, dist: Int32Array) {
    this.grid = grid;
    this.target = target;
    this.dist = dist;
  }

  distanceAt(x: number, y: number): number {
    if (!this.grid.inBounds(x, y)) return UNREACHABLE;
    return this.dist[this.grid.index(x, y)];
  }

  reachable(x: number, y: number): boolean {
    return this.distanceAt(x, y) !== UNREACHABLE;
  }
}

/**
 * Compute the shortest-path distance from every cell to `target`.
 * `ignoreTowers = true` respects only grid bounds and permanent `blocked`
 * cells (the Manhattan path-distance metric of §3.2); `false` also treats
 * `tower` cells as impassable (real enemy movement).
 */
export function computeDistanceField(
  grid: Grid,
  target: Vec2,
  ignoreTowers: boolean,
): DistanceField {
  const passable = ignoreTowers
    ? (x: number, y: number) => grid.isWalkableIgnoringTowers(x, y)
    : (x: number, y: number) => grid.isWalkable(x, y);

  const dist = new Int32Array(grid.width * grid.height).fill(UNREACHABLE);
  // The target itself must be reachable as a destination even though a `target`
  // cell is walkable anyway; seed BFS from it.
  const startIdx = grid.index(target.x, target.y);
  dist[startIdx] = 0;

  // Simple ring-buffer queue of packed indices.
  const queue = new Int32Array(grid.width * grid.height);
  let head = 0;
  let tail = 0;
  queue[tail++] = startIdx;

  while (head < tail) {
    const idx = queue[head++];
    const cx = idx % grid.width;
    const cy = (idx - cx) / grid.width;
    const nextDist = dist[idx] + 1;
    for (const d of DIRS) {
      const nx = cx + d.x;
      const ny = cy + d.y;
      if (!grid.inBounds(nx, ny)) continue;
      if (!passable(nx, ny)) continue;
      const nIdx = grid.index(nx, ny);
      if (dist[nIdx] !== UNREACHABLE) continue;
      dist[nIdx] = nextDist;
      queue[tail++] = nIdx;
    }
  }

  return new DistanceField(grid, target, dist);
}

/**
 * Reconstruct the shortest path from `from` to the field's target by always
 * stepping to the neighbour with the smallest distance. Ties are broken by the
 * fixed `DIRS` order (up, left, right, down) for determinism.
 * Returns the list of cells from `from` (inclusive) to `target` (inclusive), or
 * `null` when `from` cannot reach the target.
 */
export function reconstructPath(field: DistanceField, from: Vec2): Vec2[] | null {
  const grid = field.grid;
  if (field.distanceAt(from.x, from.y) === UNREACHABLE) return null;
  const path: Vec2[] = [{ x: from.x, y: from.y }];
  let cur = { x: from.x, y: from.y };
  let guard = grid.width * grid.height + 1;
  while (field.distanceAt(cur.x, cur.y) > 0 && guard-- > 0) {
    const curDist = field.distanceAt(cur.x, cur.y);
    let best: Vec2 | null = null;
    for (const d of DIRS) {
      const nx = cur.x + d.x;
      const ny = cur.y + d.y;
      const nd = field.distanceAt(nx, ny);
      if (nd !== UNREACHABLE && nd === curDist - 1) {
        best = { x: nx, y: ny };
        break;
      }
    }
    if (!best) return null;
    path.push(best);
    cur = best;
  }
  return path;
}

/** Convenience: compute a full shortest path honouring towers as obstacles. */
export function computePath(grid: Grid, from: Vec2, to: Vec2): Vec2[] | null {
  const field = computeDistanceField(grid, to, false);
  return reconstructPath(field, from);
}

/**
 * Fast "would this placement block the path?" check for a single spawn→target
 * route (§3.2, per-spawn). Temporarily marks `placeAt` as a tower and tests
 * reachability. Restores the original state before returning.
 */
export function wouldBlockRoute(
  grid: Grid,
  spawn: Vec2,
  target: Vec2,
  placeAt: Vec2,
): boolean {
  if (!grid.isBuildable(placeAt.x, placeAt.y)) {
    // Cannot place here anyway; report no *new* blocking.
    return false;
  }
  const prev = grid.get(placeAt.x, placeAt.y);
  grid.set(placeAt.x, placeAt.y, 'tower');
  const field = computeDistanceField(grid, target, false);
  const blocked = !field.reachable(spawn.x, spawn.y);
  grid.set(placeAt.x, placeAt.y, prev);
  return blocked;
}

/**
 * Returns true if placing at `placeAt` would block *every* provided route.
 * Used only for UI colouring nuance; per-spawn behaviour uses wouldBlockRoute.
 */
export function wouldBlockAll(
  grid: Grid,
  routes: { spawn: Vec2; target: Vec2 }[],
  placeAt: Vec2,
): boolean {
  return routes.every((r) => wouldBlockRoute(grid, r.spawn, r.target, placeAt));
}
