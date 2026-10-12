import { describe, it, expect } from 'vitest';
import { validateLevel, LevelValidationError } from '../src/data/validateLevel';
import { levels } from '../src/data/content';
import type { LevelData } from '../src/types';

function baseLevel(): LevelData {
  return {
    id: 'test',
    name: 'Test',
    grid: { width: 5, height: 3 },
    cellSize: 1,
    routes: [{ spawn: { x: 0, y: 1 }, target: { x: 4, y: 1 } }],
    blocked: [],
    startingCurrency: 100,
    startingLives: 10,
    waves: [{ groups: [{ enemyType: 'grunt', count: 1, intervalMs: 100 }] }],
  };
}

describe('validateLevel', () => {
  it('accepts a valid level', () => {
    expect(() => validateLevel(baseLevel())).not.toThrow();
  });

  it('accepts all shipped levels', () => {
    for (const lvl of levels) expect(() => validateLevel(lvl)).not.toThrow();
  });

  it('rejects coinciding cell types (spawn on a blocked cell)', () => {
    const lvl = baseLevel();
    lvl.blocked = [{ x: 0, y: 1 }];
    expect(() => validateLevel(lvl)).toThrow(LevelValidationError);
  });

  it('rejects a spawn appearing in more than one route', () => {
    const lvl = baseLevel();
    lvl.routes = [
      { spawn: { x: 0, y: 1 }, target: { x: 4, y: 1 } },
      { spawn: { x: 0, y: 1 }, target: { x: 4, y: 0 } },
    ];
    expect(() => validateLevel(lvl)).toThrow(/more than one route/);
  });

  it('rejects a target fully walled in by blocked cells', () => {
    const lvl = baseLevel();
    lvl.routes = [{ spawn: { x: 0, y: 0 }, target: { x: 2, y: 1 } }];
    lvl.blocked = [
      { x: 1, y: 1 },
      { x: 3, y: 1 },
      { x: 2, y: 0 },
      { x: 2, y: 2 },
    ];
    expect(() => validateLevel(lvl)).toThrow(/walled in/);
  });

  it('rejects a level with no path from spawn to its target', () => {
    const lvl = baseLevel();
    lvl.grid = { width: 3, height: 2 };
    lvl.routes = [{ spawn: { x: 0, y: 0 }, target: { x: 2, y: 0 } }];
    // Wall the whole middle column: target keeps an open neighbour (2,1) but
    // the spawn can never reach it.
    lvl.blocked = [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
    ];
    expect(() => validateLevel(lvl)).toThrow(/no path/);
  });

  it('allows two spawns sharing the same target', () => {
    const lvl = baseLevel();
    lvl.routes = [
      { spawn: { x: 0, y: 0 }, target: { x: 4, y: 1 } },
      { spawn: { x: 0, y: 2 }, target: { x: 4, y: 1 } },
    ];
    expect(() => validateLevel(lvl)).not.toThrow();
  });
});
