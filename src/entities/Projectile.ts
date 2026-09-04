import type { Vec2 } from '../types';

/**
 * A short-lived visual projectile. Combat damage is resolved instantly in the
 * CombatSystem; the projectile is purely for rendering feedback and is pooled
 * to avoid per-frame allocations (§4.3).
 */
export class Projectile {
  active = false;
  from: Vec2 = { x: 0, y: 0 };
  to: Vec2 = { x: 0, y: 0 };
  /** Remaining lifetime in seconds. */
  ttl = 0;
  readonly maxTtl = 0.12;

  spawn(from: Vec2, to: Vec2): void {
    this.active = true;
    this.from = { x: from.x, y: from.y };
    this.to = { x: to.x, y: to.y };
    this.ttl = this.maxTtl;
  }

  update(dt: number): void {
    if (!this.active) return;
    this.ttl -= dt;
    if (this.ttl <= 0) this.active = false;
  }
}

/** A tiny object pool for projectiles. */
export class ProjectilePool {
  private readonly pool: Projectile[] = [];

  obtain(from: Vec2, to: Vec2): Projectile {
    let p = this.pool.find((x) => !x.active);
    if (!p) {
      p = new Projectile();
      this.pool.push(p);
    }
    p.spawn(from, to);
    return p;
  }

  update(dt: number): void {
    for (const p of this.pool) p.update(dt);
  }

  active(): Projectile[] {
    return this.pool.filter((p) => p.active);
  }
}
