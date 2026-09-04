import type { EnemyTypeData, LevelData, TowerTypeData } from '../src/types';

export const grunt: EnemyTypeData = {
  id: 'grunt',
  hp: 100,
  armor: 0,
  speed: 1,
  bounty: 10,
  leakDamage: 1,
  attackDamage: 10,
  attackRange: 1,
  fireRatePerSec: 1,
  sprite: 'grunt',
};

export const armored: EnemyTypeData = {
  ...grunt,
  id: 'armored',
  armor: 50,
  hp: 200,
};

export const basicTower: TowerTypeData = {
  id: 'basic',
  name: 'Basic',
  cost: 50,
  hp: 100,
  damage: 20,
  range: 2,
  fireRatePerSec: 1,
  targeting: 'first',
  splashRadius: 0,
  slowPct: 0,
  slowDurationMs: 0,
  sprite: 'basic',
};

export const frostTower: TowerTypeData = {
  ...basicTower,
  id: 'frost',
  slowPct: 50,
  slowDurationMs: 1000,
  damage: 5,
};

export const splashTower: TowerTypeData = {
  ...basicTower,
  id: 'splash',
  splashRadius: 1,
};

/** A simple 1-row corridor level with a single route. */
export function corridorLevel(width = 5): LevelData {
  return {
    id: 'corridor',
    name: 'Corridor',
    grid: { width, height: 1 },
    cellSize: 1,
    routes: [{ spawn: { x: 0, y: 0 }, target: { x: width - 1, y: 0 } }],
    blocked: [],
    startingCurrency: 100,
    startingLives: 10,
    waves: [{ groups: [{ enemyType: 'grunt', count: 1, intervalMs: 100 }] }],
  };
}

/** An open grid where mazing is possible. */
export function openLevel(width = 5, height = 5): LevelData {
  return {
    id: 'open',
    name: 'Open',
    grid: { width, height },
    cellSize: 1,
    routes: [
      { spawn: { x: 0, y: 0 }, target: { x: width - 1, y: height - 1 } },
    ],
    blocked: [],
    startingCurrency: 500,
    startingLives: 10,
    waves: [{ groups: [{ enemyType: 'grunt', count: 3, intervalMs: 100 }] }],
  };
}
