// Central tunable constants (§5/§6). Keep balancing here, not in engine logic.

export const balance = {
  /** Fixed simulation timestep in seconds (60 Hz, §4.3). */
  fixedDt: 1 / 60,
  /** Auto-start countdown before the next wave, in ms (§3.5). */
  waveCountdownMs: 10_000,
  /** Fraction of the purchase price returned when selling a tower (§3.2). */
  sellRefundRate: 0.75,
  /** Minimum damage floor — every hit deals at least this much (§5). */
  minDamage: 1,
  /**
   * Supported game-speed multipliers (§8). The basic speed (first entry) runs
   * at 1/4 of the historical base speed; each subsequent step is 2x faster.
   */
  speeds: [0.25, 0.5, 1, 2, 4] as const,
} as const;

/**
 * Percentage-armor damage model (§5):
 * damage_dealt = max(1, damage * (1 - armor/100)), with a minimum floor of 1.
 */
export function computeDamage(damage: number, armorPct: number): number {
  const clampedArmor = Math.max(0, Math.min(100, armorPct));
  const dealt = damage * (1 - clampedArmor / 100);
  return Math.max(balance.minDamage, dealt);
}

/**
 * Fractional-range rule (§5.1): a target at (path-)distance `d` is in range when
 * `d <= ceil(range)`. The same rule applies to tower range, enemy attack range,
 * and splash radius.
 */
export function inRange(d: number, range: number): boolean {
  return d <= Math.ceil(range);
}
