import { GameState } from '../engine/GameState';
import { Enemy } from '../entities/Enemy';
import { Tower } from '../entities/Tower';
import { computeDamage, inRange, EFFECT_COLORS } from '../config/balance';
import type { TargetingStrategy, Vec2 } from '../types';
import { EffectsManager } from '../render/EffectsManager';
import type { AudioManager } from '../audio/AudioManager';

/**
 * Resolves all combat each tick (§3.3/§3.4/§5): towers firing at enemies, and
 * enemies attacking blocking towers in the no-path case. Damage to a tower is
 * accumulated over the tick and the death check runs once afterwards, so
 * overkill is wasted with no carry-over (§3.3 simultaneity).
 */
export class CombatSystem {
  constructor(private readonly effects: EffectsManager = new EffectsManager(), private readonly audio?: AudioManager) {}

  update(state: GameState, dt: number): void {
    this.effects.update();
    this.towersFire(state, dt);
    this.enemiesAttackTowers(state, dt);
  }

  // --- Towers -> enemies ----------------------------------------------------

  private towersFire(state: GameState, dt: number): void {
    for (const tower of state.towers) {
      if (!tower.alive) continue;
      tower.cooldown -= dt;
      if (tower.cooldown > 0) continue;

      const target = this.selectTarget(state, tower);
      if (!target) continue;

      tower.cooldown += 1 / tower.type.fireRatePerSec;
      if (tower.cooldown < 0) tower.cooldown = 0;
      this.fireAt(state, tower, target);
    }
  }

  private selectTarget(state: GameState, tower: Tower): Enemy | null {
    const range = tower.type.range;
    const candidates: { e: Enemy; d: number }[] = [];
    for (const e of state.enemies) {
      if (!e.alive) continue;
      const d = state.metricDistance(tower.cell, e.cell);
      if (isFinite(d) && inRange(d, range)) candidates.push({ e, d });
    }
    if (candidates.length === 0) return null;

    const strat: TargetingStrategy = tower.type.targeting;
    let best = candidates[0];
    for (let i = 1; i < candidates.length; i++) {
      if (this.better(state, strat, candidates[i], best)) best = candidates[i];
    }
    return best.e;
  }

  private better(
    state: GameState,
    strat: TargetingStrategy,
    a: { e: Enemy; d: number },
    b: { e: Enemy; d: number },
  ): boolean {
    const cmp = this.metricCompare(state, strat, a, b);
    if (cmp !== 0) return cmp < 0;
    // Last-resort tie-break: the enemy spawned first (§3.4).
    return a.e.spawnOrder < b.e.spawnOrder;
  }

  /** Negative when `a` is preferred over `b` for the strategy's primary metric. */
  private metricCompare(
    state: GameState,
    strat: TargetingStrategy,
    a: { e: Enemy; d: number },
    b: { e: Enemy; d: number },
  ): number {
    switch (strat) {
      case 'first': {
        const ra = state.metricDistance(a.e.cell, a.e.route.target);
        const rb = state.metricDistance(b.e.cell, b.e.route.target);
        return ra - rb; // smaller remaining = further along = preferred
      }
      case 'last': {
        const ra = state.metricDistance(a.e.cell, a.e.route.target);
        const rb = state.metricDistance(b.e.cell, b.e.route.target);
        return rb - ra; // larger remaining = least advanced = preferred
      }
      case 'closest':
        return a.d - b.d;
      case 'strongest':
        return b.e.hp - a.e.hp; // higher current HP preferred
    }
  }

  private fireAt(state: GameState, tower: Tower, primary: Enemy): void {
    state.projectiles.obtain(
      { x: tower.cell.x, y: tower.cell.y },
      primary.interpolatedPosition(),
    );

    const splash = tower.type.splashRadius;
    if (splash > 0) {
      const cx = primary.cell.x + 0.5;
      const cy = primary.cell.y + 0.5;
      if (tower.type.id === 'cannon') {
        this.effects.createExplosion(cx, cy, tower.type.splashRadius, EFFECT_COLORS.explosion);
      } else if (tower.type.id === 'frost') {
        this.effects.createExplosion(cx, cy, tower.type.splashRadius || 1.2, EFFECT_COLORS.slowPulse);
      }
      for (const e of state.enemies) {
        if (!e.alive) continue;
        const d = state.metricDistance(primary.cell, e.cell);
        if (isFinite(d) && inRange(d, splash)) {
          this.damageEnemy(state, tower, e);
        }
      }
    } else {
      this.damageEnemy(state, tower, primary);
    }
  }

  private damageEnemy(state: GameState, tower: Tower, e: Enemy): void {
    const dmg = computeDamage(tower.type.damage, e.type.armor);
    e.hp -= dmg;
    state.emit('enemyHit');
    if (state.damageNumbersEnabled) {
      this.effects.createDamageNumber(e.id, dmg);
    }

    const soundId = tower.type.id === 'cannon' ? 'cannonHit'
      : tower.type.id === 'frost' ? 'frostHit'
      : tower.type.id === 'sniper' ? 'sniperHit'
      : 'arrowHit';
    this.audio?.play(soundId as any);

    // Every hit enemy blinks
    this.effects.triggerEnemyBlink(e.id);

    // Slow always targets only enemies (§5.1); separate from HP damage.
    if (tower.type.slowPct > 0 && tower.type.slowDurationMs > 0) {
      if (tower.type.slowPct >= e.slowPct) e.slowPct = tower.type.slowPct;
      e.slowRemainingMs = tower.type.slowDurationMs;
    }
    if (e.hp <= 0) {
      e.hp = 0;
      e.alive = false;
      state.currency += e.bounty;
      state.emit('enemyKilled');
    }
  }

  // --- Enemies -> towers (no-path case) -------------------------------------

  private enemiesAttackTowers(state: GameState, dt: number): void {
    const pending = new Map<Tower, number>();

    for (const e of state.enemies) {
      if (!e.alive || e.mode !== 'noPath') continue;
      if (e.attackCooldown > 0) e.attackCooldown -= dt;
      const cell = e.attackTargetCell;
      if (!cell) continue;
      const tower = state.towerAt(cell.x, cell.y);
      if (!tower) {
        e.attackTargetCell = null;
        continue;
      }
      const d = state.metricDistance(e.cell, cell);
      if (!isFinite(d) || !inRange(d, e.type.attackRange)) continue;
      if (e.attackCooldown > 0) continue;

      e.attackCooldown += 1 / e.type.fireRatePerSec;
      // Same §5 damage model; towers have no armor (armor_pct = 0).
      const dmg = computeDamage(e.type.attackDamage, 0);
      pending.set(tower, (pending.get(tower) ?? 0) + dmg);
    }

    // Apply all accumulated damage, then run the death check once (§3.3).
    let mazeChanged = false;
    for (const [tower, dmg] of pending) {
      tower.hp -= dmg;
      if (tower.hp <= 0) {
        tower.hp = 0;
        state.destroyTower(tower); // no refund (§3.3)
        mazeChanged = true;
      }
    }

    // Re-advance after tower death mid-attack (§3.2): force re-evaluation at the
    // next boundary by clearing stale attack targets of enemies now off-path.
    if (mazeChanged) {
      for (const e of state.enemies) {
        if (e.mode === 'noPath') e.attackTargetCell = null;
      }
    }
  }

  static distanceCells(a: Vec2, b: Vec2): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }
}
