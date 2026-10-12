import { describe, it, expect } from 'vitest';
import { Game } from '../src/Game';
import { grunt, basicTower } from './fixtures';
import type { LevelData } from '../src/types';

const enemyDefs = [grunt];
const towerDefs = [basicTower];

/** A 1-row corridor where a single grunt walks straight to the target. */
function corridor(startingLives: number, count = 1): LevelData {
  return {
    id: 'cond',
    name: 'Cond',
    grid: { width: 5, height: 1 },
    cellSize: 1,
    routes: [{ spawn: { x: 0, y: 0 }, target: { x: 4, y: 0 } }],
    blocked: [],
    startingCurrency: 100,
    startingLives,
    waves: [{ groups: [{ enemyType: 'grunt', count, intervalMs: 100 }] }],
  };
}

/** Run the fixed-step loop until the game ends or the guard trips. */
function runUntilEnd(game: Game, maxSteps = 5000, dt = 0.1): void {
  for (let i = 0; i < maxSteps; i++) {
    game.fixedUpdate(dt);
    if (game.state.status === 'won' || game.state.status === 'lost') return;
  }
}

describe('Win/Lose conditions (§3.5)', () => {
  it('wins when all waves are spawned and the field is empty (lives > 0)', () => {
    const game = new Game(corridor(10), enemyDefs, towerDefs);
    game.startNextWave();
    runUntilEnd(game);
    expect(game.state.status).toBe('won');
    expect(game.state.lives).toBeGreaterThan(0);
  });

  it('loses when lives reach 0', () => {
    // One grunt (leakDamage 1) leaking into a single-life level = loss.
    const game = new Game(corridor(1), enemyDefs, towerDefs);
    game.startNextWave();
    runUntilEnd(game);
    expect(game.state.status).toBe('lost');
    expect(game.state.lives).toBe(0);
  });

  it('does not win before any wave has been released', () => {
    const game = new Game(corridor(10), enemyDefs, towerDefs);
    // No wave started yet; field is empty but win must not trigger.
    game.fixedUpdate(0.1);
    expect(game.state.status).not.toBe('won');
  });
});
