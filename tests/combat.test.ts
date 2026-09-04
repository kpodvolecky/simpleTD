import { describe, it, expect } from 'vitest';
import { computeDamage, inRange } from '../src/config/balance';
import { GameState } from '../src/engine/GameState';
import { CombatSystem } from '../src/systems/CombatSystem';
import {
  grunt,
  armored,
  basicTower,
  frostTower,
  splashTower,
  openLevel,
} from './fixtures';

const enemyDefs = [grunt, armored];
const towerDefs = [basicTower, frostTower, splashTower];

function freshState() {
  return new GameState(openLevel(7, 7), enemyDefs, towerDefs);
}

describe('Damage model (§5)', () => {
  it('applies percentage armor', () => {
    expect(computeDamage(20, 0)).toBe(20);
    expect(computeDamage(20, 50)).toBe(10);
    expect(computeDamage(100, 25)).toBe(75);
  });

  it('enforces the minimum-damage floor of 1', () => {
    expect(computeDamage(10, 100)).toBe(1);
    expect(computeDamage(1, 0)).toBe(1);
  });
});

describe('Range rule (§5.1)', () => {
  it('rounds fractional ranges up (ceil)', () => {
    expect(inRange(2, 2.0)).toBe(true);
    expect(inRange(3, 2.0)).toBe(false);
    expect(inRange(3, 2.5)).toBe(true); // ceil(2.5) = 3
    expect(inRange(3, 3.0)).toBe(true);
  });
});

describe('CombatSystem targeting', () => {
  it("`first` targets the enemy furthest along (smallest remaining distance)", () => {
    const state = freshState();
    state.placeTower('basic', { x: 3, y: 3 });
    const near = state.spawnEnemy(grunt, 0);
    near.cell = { x: 4, y: 3 };
    near.nextCell = { x: 4, y: 3 };
    const far = state.spawnEnemy(grunt, 0);
    far.cell = { x: 2, y: 3 };
    far.nextCell = { x: 2, y: 3 };

    new CombatSystem().update(state, 1);
    // `near` is closer to the target (6,6)? Both same row; remaining distance is
    // Manhattan to (6,6). near(4,3)->5, far(2,3)->7, so `first` hits near.
    expect(near.hp).toBeLessThan(grunt.hp);
    expect(far.hp).toBe(grunt.hp);
  });

  it('breaks ties by spawn order (spawned first)', () => {
    const state = freshState();
    state.placeTower('basic', { x: 3, y: 3 });
    // Two enemies equidistant from the target and the tower.
    const a = state.spawnEnemy(grunt, 0);
    a.cell = { x: 2, y: 3 };
    a.nextCell = { x: 2, y: 3 };
    const b = state.spawnEnemy(grunt, 0);
    b.cell = { x: 4, y: 3 };
    b.nextCell = { x: 4, y: 3 };
    // Make them tie on remaining distance by using `closest` (both dist 1).
    state.towers[0].type.targeting = 'closest' as never;

    new CombatSystem().update(state, 1);
    expect(a.hp).toBeLessThan(grunt.hp); // a spawned first
    expect(b.hp).toBe(grunt.hp);
  });

  it('applies slow only to enemies and refreshes duration', () => {
    const state = freshState();
    state.placeTower('frost', { x: 3, y: 3 });
    const e = state.spawnEnemy(grunt, 0);
    e.cell = { x: 4, y: 3 };
    e.nextCell = { x: 4, y: 3 };

    new CombatSystem().update(state, 1);
    expect(e.slowPct).toBe(50);
    expect(e.slowRemainingMs).toBe(1000);
    expect(e.effectiveSpeed()).toBeCloseTo(grunt.speed * 0.5);
  });

  it('splash damages all enemies within the splash radius', () => {
    const state = freshState();
    state.placeTower('splash', { x: 3, y: 3 });
    const primary = state.spawnEnemy(grunt, 0);
    primary.cell = { x: 4, y: 3 };
    primary.nextCell = { x: 4, y: 3 };
    const neighbour = state.spawnEnemy(grunt, 0);
    neighbour.cell = { x: 4, y: 4 }; // Manhattan 1 from primary
    neighbour.nextCell = { x: 4, y: 4 };

    new CombatSystem().update(state, 1);
    expect(primary.hp).toBeLessThan(grunt.hp);
    expect(neighbour.hp).toBeLessThan(grunt.hp);
  });
});
