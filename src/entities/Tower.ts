import type { TowerTypeData, Vec2 } from '../types';
import { balance } from '../config/balance';

/**
 * A placed tower (§3.4). Towers have HP (used only in the no-path case),
 * attack enemies within range, and never regenerate — damage is permanent.
 */
export class Tower {
  readonly id: number;
  readonly type: TowerTypeData;
  readonly cell: Vec2;
  /** Price actually paid, used for the 75% sell refund (§3.2). */
  readonly purchasePrice: number;

  hp: number;
  /** Seconds until the tower may fire again. */
  cooldown = 0;
  alive = true;

  constructor(id: number, type: TowerTypeData, cell: Vec2) {
    this.id = id;
    this.type = type;
    this.cell = { x: cell.x, y: cell.y };
    this.purchasePrice = type.cost;
    this.hp = type.hp;
  }

  /** Sell value: 75% of purchase price, rounded to the nearest integer (§3.2). */
  sellValue(): number {
    return Math.round(this.purchasePrice * balance.sellRefundRate);
  }
}
