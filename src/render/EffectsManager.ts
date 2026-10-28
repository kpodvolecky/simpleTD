/** Effect types for visual feedback. */
export enum EffectType {
  EXPLOSION = 'explosion',
  SLOW_PULSE = 'slow_pulse',
  ENEMY_BLINK = 'enemy_blink',
  DAMAGE_NUMBER = 'damage_number',
}

/** Base effect with position and lifetime. */
interface EffectBase {
  type: EffectType;
  x: number;
  y: number;
  createdAt: number;
}

/** Explosion/Splash effect (cannon, frost). */
export interface ExplosionEffect extends EffectBase {
  type: EffectType.EXPLOSION | EffectType.SLOW_PULSE;
  radius: number;
  color: string;
  alpha: number;
}

/** Enemy blink effect. */
interface EnemyBlinkEffect {
  type: EffectType.ENEMY_BLINK;
  enemyId: number;
  createdAt: number;
  blinkCount: number;
}

interface DamageNumberEffect {
  type: EffectType.DAMAGE_NUMBER;
  x: number;
  y: number;
  amount: number;
  createdAt: number;
}

/** All active effects. */
export interface EffectsState {
  explosions: Map<number, ExplosionEffect>;
  enemyBlinks: EnemyBlinkEffect[];
  damageNumbers: DamageNumberEffect[];
}

/** Effect colors for explosions (defined in balance.ts). */
export const EFFECT_COLORS = {
  explosion: 'rgba(255, 0, 0, 0.6)',
  slowPulse: 'rgba(0, 100, 255, 0.4)',
};

export class EffectsManager {
  private readonly explosions: Map<number, ExplosionEffect> = new Map();
  private readonly enemyBlinks: EnemyBlinkEffect[] = [];
  private readonly damageNumbers: DamageNumberEffect[] = [];

  /** Create an explosion/splash effect at a position. */
  createExplosion(x: number, y: number, radius: number, color: string): void {
    const id = this.explosions.size;
    this.explosions.set(id, {
      type: EffectType.EXPLOSION,
      x,
      y,
      createdAt: performance.now(),
      radius,
      color,
      alpha: 1.0,
    });
  }

  /** Create a slow-pulse effect (frost tower splash). */
  createSlowPulse(x: number, y: number, radius: number): void {
    this.createExplosion(x, y, radius, 'rgba(0, 100, 255, 0.4)');
  }

  /** Trigger blink on an enemy that was hit. */
  triggerEnemyBlink(enemyId: number): void {
    this.enemyBlinks.push({
      type: EffectType.ENEMY_BLINK,
      enemyId,
      createdAt: performance.now(),
      blinkCount: 0,
    });
  }

  /** Create a damage number effect above an enemy. */
  createDamageNumber(x: number, y: number, amount: number): void {
    this.damageNumbers.push({
      type: EffectType.DAMAGE_NUMBER,
      x,
      y,
      amount,
      createdAt: performance.now(),
    });
  }

  /** Update all effects for a single frame. */
  update(): void {
    const now = performance.now();

    // Update explosions (fade out over ~400ms)
    for (const [id, effect] of this.explosions.entries()) {
      const age = now - effect.createdAt;
      if (age >= 400) {
        this.explosions.delete(id);
      } else {
        effect.alpha = Math.max(0, 1 - age / 400);
      }
    }

    // Update damage numbers (3s + 1s fade)
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const dn = this.damageNumbers[i];
      if (now - dn.createdAt >= 4000) this.damageNumbers.splice(i, 1);
    }

    // Update enemy blinks (2 blinks per hit, ~500ms total)
    for (let i = this.enemyBlinks.length - 1; i >= 0; i--) {
      const blink = this.enemyBlinks[i];
      const age = now - blink.createdAt;

      if (age >= 1000) {
        this.enemyBlinks.splice(i, 1);
      } else if (blink.blinkCount === 0 && age >= 500) {
        blink.blinkCount = 1;
      } else if (blink.blinkCount === 1 && age >= 1000) {
        this.enemyBlinks.splice(i, 1);
      }
    }
  }

  /** Get current effects state for rendering. */
  getState(): EffectsState {
    return {
      explosions: new Map(this.explosions),
      enemyBlinks: [...this.enemyBlinks],
      damageNumbers: [...this.damageNumbers],
    };
  }

  /** Check if an enemy is currently blinking (blinkCount === 1). */
  isEnemyBlinking(enemyId: number): boolean {
    const now = performance.now();
    for (const blink of this.enemyBlinks) {
      if (blink.enemyId === enemyId && now - blink.createdAt < 500) {
        return true;
      }
    }
    return false;
  }

  /** Clear all effects. */
  clear(): void {
    this.explosions.clear();
    this.enemyBlinks.length = 0;
    this.damageNumbers.length = 0;
  }
}
