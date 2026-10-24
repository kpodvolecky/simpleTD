import { GameState } from '../engine/GameState';
import { balance } from '../config/balance';

interface GroupSpawner {
  enemyType: string;
  remaining: number;
  intervalMs: number;
  /** ms until the next unit of this group spawns. */
  timerMs: number;
  /** Cumulative HP multiplier for enemies released by this wave (§3.5). */
  hpMultiplier: number;
  /** Speed multiplier applied to this group's enemies. */
  speedMultiplier: number;
}

/**
 * Wave spawning (§3.5). The next wave auto-starts after a fixed 10-second
 * countdown or when the player triggers it; waves may overlap, in which case
 * new enemies are simply added to those already on the field.
 */
export class SpawnSystem {
  private nextWaveIndex = 0;
  private readonly active: GroupSpawner[] = [];
  private countdownMs = balance.waveCountdownMs;
  private routeCursor = 0;
  /**
   * Running HP multiplier accumulated across released waves (§3.5). The first
   * wave spawns at base HP (1); each subsequent wave multiplies this by its own
   * `hpMultiplier` (or `balance.defaultWaveHpMultiplier` when unset).
   * Reset to 1 whenever a new level is loaded.
   */
  private hpMultiplier = 1;
  /**
   * Running speed multiplier accumulated across released waves. The first
   * wave spawns at base speed (1); each subsequent wave multiplies this by its own
   * `speedMultiplier`. Reset to 1 whenever a new level is loaded.
   */
  private speedMultiplier = 1;

  get currentWaveNumber(): number {
    return this.nextWaveIndex;
  }

  get totalWaves(): number {
    return this.stateWaves;
  }

  private stateWaves = 0;

  /** Remaining countdown in ms until the next wave auto-starts, or null. */
  countdownRemainingMs(state: GameState): number | null {
    return this.nextWaveIndex < state.level.waves.length
      ? Math.max(0, this.countdownMs)
      : null;
  }

  /** Player-triggered start of the next wave (§3.5). */
  startNextWave(state: GameState): void {
    if (this.nextWaveIndex >= state.level.waves.length) return;
    const wave = state.level.waves[this.nextWaveIndex];
    // Reset multipliers when starting a new level
    this.hpMultiplier = 1;
    this.speedMultiplier = 1;
    // Grow multipliers relative to the previous wave; the first wave stays at base.
    if (this.nextWaveIndex > 0) {
      const hpFactor = wave.hpMultiplier ?? balance.defaultWaveHpMultiplier;
      const speedFactor = wave.speedMultiplier ?? 1;
      this.hpMultiplier *= hpFactor;
      this.speedMultiplier *= speedFactor;
    }
    for (const g of wave.groups) {
      this.active.push({
        enemyType: g.enemyType,
        remaining: g.count,
        intervalMs: g.intervalMs,
        timerMs: 0,
        hpMultiplier: this.hpMultiplier,
        speedMultiplier: this.speedMultiplier,
      });
    }
    this.nextWaveIndex++;
    this.countdownMs = balance.waveCountdownMs;
  }

  update(state: GameState, dt: number): void {
    this.stateWaves = state.level.waves.length;
    const dtMs = dt * 1000;

    // Auto-start countdown for the next unreleased wave.
    if (this.nextWaveIndex < state.level.waves.length) {
      this.countdownMs -= dtMs;
      if (this.countdownMs <= 0) this.startNextWave(state);
    }

    // Advance released group spawners (may overlap across waves).
    for (const g of this.active) {
      if (g.remaining <= 0) continue;
      g.timerMs -= dtMs;
      while (g.remaining > 0 && g.timerMs <= 0) {
        const type = state.enemyTypes.get(g.enemyType);
        if (type) {
          const routeIndex = this.routeCursor % state.level.routes.length;
          this.routeCursor++;
          state.spawnEnemy(type, routeIndex, g.hpMultiplier, g.speedMultiplier);
        }
        g.remaining--;
        g.timerMs += g.intervalMs;
      }
    }

    // Drop finished spawners.
    for (let i = this.active.length - 1; i >= 0; i--) {
      if (this.active[i].remaining <= 0) this.active.splice(i, 1);
    }

    state.allWavesSpawned =
      this.nextWaveIndex >= state.level.waves.length && this.active.length === 0;
  }
}
