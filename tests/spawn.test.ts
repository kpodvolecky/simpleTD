import { describe, it, expect } from 'vitest';
import { GameState } from '../src/engine/GameState';
import { SpawnSystem } from '../src/systems/SpawnSystem';
import { balance } from '../src/config/balance';
import { grunt } from './fixtures';
import type { LevelData } from '../src/types';

const enemyDefs = [grunt];

function twoWaveLevel(): LevelData {
  return {
    id: 'spawn',
    name: 'Spawn',
    grid: { width: 5, height: 1 },
    cellSize: 1,
    routes: [{ spawn: { x: 0, y: 0 }, target: { x: 4, y: 0 } }],
    blocked: [],
    startingCurrency: 100,
    startingLives: 100,
    waves: [
      { groups: [{ enemyType: 'grunt', count: 3, intervalMs: 500 }] },
      { groups: [{ enemyType: 'grunt', count: 2, intervalMs: 500 }] },
    ],
  };
}

function state() {
  return new GameState(twoWaveLevel(), enemyDefs, []);
}

describe('SpawnSystem scheduling (§3.5)', () => {
  it('reports the full countdown before the first wave', () => {
    const s = state();
    const spawn = new SpawnSystem();
    spawn.update(s, 0); // initialise totalWaves
    expect(spawn.countdownRemainingMs(s)).toBe(balance.waveCountdownMs);
    expect(spawn.currentWaveNumber).toBe(0);
    expect(spawn.totalWaves).toBe(2);
  });

  it('auto-starts the next wave after the 10s countdown', () => {
    const s = state();
    const spawn = new SpawnSystem();
    // Just under 10s: no auto-start yet.
    spawn.update(s, 9.9);
    expect(spawn.currentWaveNumber).toBe(0);
    // Crossing 10s total triggers the first wave.
    spawn.update(s, 0.2);
    expect(spawn.currentWaveNumber).toBe(1);
  });

  it('spawns a group unit per interval', () => {
    const s = state();
    const spawn = new SpawnSystem();
    spawn.startNextWave(s); // release wave 0 (3 units, 500ms apart)
    spawn.update(s, 0); // first unit spawns immediately
    expect(s.enemies.length).toBe(1);
    spawn.update(s, 0.5);
    expect(s.enemies.length).toBe(2);
    spawn.update(s, 0.5);
    expect(s.enemies.length).toBe(3);
    // No more than the group count.
    spawn.update(s, 1.0);
    expect(s.enemies.length).toBe(3);
  });

  it('overlaps waves: enemies accumulate when the next wave starts early', () => {
    const s = state();
    const spawn = new SpawnSystem();
    spawn.startNextWave(s); // wave 0
    spawn.update(s, 0); // 1 unit from wave 0
    spawn.startNextWave(s); // wave 1 released before wave 0 cleared
    spawn.update(s, 0); // 1 unit from wave 1 added
    expect(s.enemies.length).toBe(2);
    expect(spawn.currentWaveNumber).toBe(2);
  });
});
