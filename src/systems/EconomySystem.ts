import { GameState } from '../engine/GameState';
import { Tower } from '../entities/Tower';
import type { Vec2 } from '../types';

/**
 * Thin economy facade (§7) over GameState: buying and selling towers and
 * awarding bounty. Kept isolated so monetization can be layered on later
 * (§2.2) without touching combat/movement.
 */
export class EconomySystem {
  buyTower(state: GameState, typeId: string, cell: Vec2): Tower | null {
    return state.placeTower(typeId, cell);
  }

  sellTower(state: GameState, tower: Tower): number {
    const value = tower.sellValue();
    state.sellTower(tower);
    return value;
  }

  award(state: GameState, amount: number): void {
    state.currency += amount;
  }
}
