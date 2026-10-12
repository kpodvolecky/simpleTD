import { GameState } from '../engine/GameState';
import { Enemy } from '../entities/Enemy';
import { DIRS } from '../engine/Grid';
import {
  computeDistanceField,
  reconstructPath,
} from '../engine/Pathfinding';
import { inRange } from '../config/balance';
import type { Vec2 } from '../types';

/**
 * Moves enemies with continuous sub-cell interpolation and makes routing
 * decisions only at cell boundaries (§4.3). Handles normal shortest-path
 * movement and the no-path fallback (§3.2).
 */
export class MovementSystem {
  update(state: GameState, dt: number): void {
    for (const e of state.enemies) {
      if (!e.alive) continue;
      this.tickSlow(e, dt);
      if (e.atBoundary()) this.decide(state, e);
      this.advance(state, e, dt);
    }
    // Remove leaked/dead enemies.
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      if (!state.enemies[i].alive) state.enemies.splice(i, 1);
    }
  }

  private tickSlow(e: Enemy, dt: number): void {
    if (e.slowRemainingMs > 0) {
      e.slowRemainingMs -= dt * 1000;
      if (e.slowRemainingMs <= 0) {
        e.slowRemainingMs = 0;
        e.slowPct = 0;
      }
    }
  }

  /** Decision at a cell boundary: reach target, re-route, or no-path fallback. */
  private decide(state: GameState, e: Enemy): void {
    const target = e.route.target;

    if (e.cell.x === target.x && e.cell.y === target.y) {
      // Reached target: leak and remove (§3.5).
      e.leaked = true;
      e.alive = false;
      state.lives -= e.type.leakDamage;
      state.emit('leak');
      return;
    }

    const field = state.pathFieldForTarget(target);
    const reachable = field.reachable(e.cell.x, e.cell.y);

    if (reachable) {
      e.mode = 'normal';
      e.attackTargetCell = null;
      const path = reconstructPath(field, e.cell);
      if (path && path.length >= 2) {
        e.nextCell = { x: path[1].x, y: path[1].y };
      }
      return;
    }

    // No path: advance toward the closest reachable cell, else attack (§3.2).
    e.mode = 'noPath';
    const goal = this.pickNoPathGoal(state, e);
    if (goal.x === e.cell.x && goal.y === e.cell.y) {
      // Can get no closer; attack the nearest blocking tower if in range.
      e.attackTargetCell = this.findBlockingTower(state, e);
    } else {
      e.attackTargetCell = null;
      const goalField = computeDistanceField(state.grid, goal, false);
      const path = reconstructPath(goalField, e.cell);
      if (path && path.length >= 2) {
        e.nextCell = { x: path[1].x, y: path[1].y };
      }
    }
  }

  /**
   * Choose the reachable cell (towers as obstacles) minimizing
   * (steps already walked from current cell) + (remaining Manhattan
   * path-distance to target). Ties: smaller remaining distance, then lower
   * (y, x) (§3.2).
   */
  private pickNoPathGoal(state: GameState, e: Enemy): Vec2 {
    const target = e.route.target;
    const fromField = computeDistanceField(state.grid, e.cell, false);
    let best: Vec2 = { x: e.cell.x, y: e.cell.y };
    let bestSum = Infinity;
    let bestRem = Infinity;
    for (let y = 0; y < state.grid.height; y++) {
      for (let x = 0; x < state.grid.width; x++) {
        const g = fromField.distanceAt(x, y);
        if (g < 0) continue; // unreachable on tower-aware graph
        const rem = state.metricDistance({ x, y }, target);
        if (!isFinite(rem)) continue;
        const sum = g + rem;
        if (
          sum < bestSum ||
          (sum === bestSum && rem < bestRem) ||
          (sum === bestSum && rem === bestRem &&
            (y < best.y || (y === best.y && x < best.x)))
        ) {
          bestSum = sum;
          bestRem = rem;
          best = { x, y };
        }
      }
    }
    return best;
  }

  /**
   * The nearest tower blocking the path: the first tower lying on the enemy's
   * shortest tower-ignoring route to the target (§3.2). Returned only when it
   * is within the enemy's attack range.
   */
  private findBlockingTower(state: GameState, e: Enemy): Vec2 | null {
    const metricField = state.metricFieldFrom(e.route.target);
    const route = reconstructPath(metricField, e.cell);
    if (!route) return null;
    for (const cell of route) {
      const tower = state.towerAt(cell.x, cell.y);
      if (tower) {
        const d = state.metricDistance(e.cell, cell);
        return inRange(d, e.type.attackRange) ? { x: cell.x, y: cell.y } : null;
      }
    }
    return null;
  }

  /** Advance interpolation; snap to the next cell when a step completes. */
  private advance(state: GameState, e: Enemy, dt: number): void {
    if (e.atBoundary()) return; // no movement decided (attacking or stuck)
    const step = e.effectiveSpeed() * dt;
    e.progress += step;
    while (e.progress >= 1) {
      e.progress -= 1;
      e.cell = { x: e.nextCell.x, y: e.nextCell.y };
      // Finished entering the cell; decide again for the next step (§4.3).
      this.decide(state, e);
      if (!e.alive || e.atBoundary()) {
        e.progress = 0;
        break;
      }
    }
  }

  /** Neighbours usable for greedy fallbacks (kept for potential reuse). */
  static neighbours(cell: Vec2): Vec2[] {
    return DIRS.map((d) => ({ x: cell.x + d.x, y: cell.y + d.y }));
  }
}
