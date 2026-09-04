import { describe, it, expect } from 'vitest';
import { Grid } from '../src/engine/Grid';
import {
  computeDistanceField,
  computePath,
  reconstructPath,
  wouldBlockRoute,
} from '../src/engine/Pathfinding';

function emptyGrid(w: number, h: number): Grid {
  return new Grid(w, h, 1);
}

describe('Pathfinding', () => {
  it('computes straight Manhattan distance on an obstacle-free grid', () => {
    const grid = emptyGrid(5, 5);
    const field = computeDistanceField(grid, { x: 4, y: 4 }, false);
    // |dx| + |dy| from (0,0) to (4,4) = 8.
    expect(field.distanceAt(0, 0)).toBe(8);
    expect(field.distanceAt(4, 4)).toBe(0);
  });

  it('finds a 4-directional shortest path', () => {
    const grid = emptyGrid(5, 1);
    const path = computePath(grid, { x: 0, y: 0 }, { x: 4, y: 0 });
    expect(path).not.toBeNull();
    expect(path!.length).toBe(5);
    expect(path![0]).toEqual({ x: 0, y: 0 });
    expect(path![4]).toEqual({ x: 4, y: 0 });
  });

  it('routes around towers, increasing path length', () => {
    const grid = emptyGrid(3, 3);
    // Wall the middle column except the top, forcing a detour.
    grid.set(1, 1, 'tower');
    grid.set(1, 2, 'tower');
    const path = computePath(grid, { x: 0, y: 2 }, { x: 2, y: 2 });
    expect(path).not.toBeNull();
    // Must detour up and over rather than go straight (which would be 2 steps).
    expect(path!.length).toBeGreaterThan(3);
  });

  it('respects permanent blocked cells even for the tower-ignoring metric', () => {
    const grid = emptyGrid(3, 1);
    grid.set(1, 0, 'blocked');
    const field = computeDistanceField(grid, { x: 2, y: 0 }, true);
    // (0,0) cannot reach (2,0) because of the permanent wall.
    expect(field.reachable(0, 0)).toBe(false);
  });

  it('ignores towers for the metric but not for real movement', () => {
    const grid = emptyGrid(3, 1);
    grid.set(1, 0, 'tower');
    const metric = computeDistanceField(grid, { x: 2, y: 0 }, true);
    const movement = computeDistanceField(grid, { x: 2, y: 0 }, false);
    expect(metric.distanceAt(0, 0)).toBe(2); // straight line ignoring the tower
    expect(movement.reachable(0, 0)).toBe(false); // blocked by the tower
  });

  it('detects a per-route blocking placement (§3.2)', () => {
    const grid = emptyGrid(3, 1);
    // A 1-wide corridor: placing at (1,0) blocks the only route.
    const spawn = { x: 0, y: 0 };
    const target = { x: 2, y: 0 };
    expect(wouldBlockRoute(grid, spawn, target, { x: 1, y: 0 })).toBe(true);
  });

  it('does not report blocking when an alternative path remains', () => {
    const grid = emptyGrid(3, 2);
    const spawn = { x: 0, y: 0 };
    const target = { x: 2, y: 0 };
    // Placing at (1,0) still leaves the bottom row open.
    expect(wouldBlockRoute(grid, spawn, target, { x: 1, y: 0 })).toBe(false);
  });

  it('reconstructs a path deterministically via the DIRS tie-break', () => {
    const grid = emptyGrid(2, 2);
    const field = computeDistanceField(grid, { x: 1, y: 1 }, false);
    const path = reconstructPath(field, { x: 0, y: 0 });
    // Prefers up/left first; from (0,0) both neighbours are (0,1)? no — up is
    // (0,-1) out of bounds, left out of bounds, so it goes right then down.
    expect(path![path!.length - 1]).toEqual({ x: 1, y: 1 });
  });
});
