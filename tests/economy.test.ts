import { describe, it, expect } from 'vitest';
import { GameState } from '../src/engine/GameState';
import { EconomySystem } from '../src/systems/EconomySystem';
import { balance } from '../src/config/balance';
import { grunt, basicTower, openLevel } from './fixtures';
import type { TowerTypeData } from '../src/types';

const enemyDefs = [grunt];

function freshState(towerDefs: TowerTypeData[] = [basicTower]) {
  return new GameState(openLevel(7, 7), enemyDefs, towerDefs);
}

describe('EconomySystem (§3.2)', () => {
  it('spends currency when buying a tower', () => {
    const state = freshState();
    const start = state.currency;
    const eco = new EconomySystem();
    const tower = eco.buyTower(state, 'basic', { x: 3, y: 3 });
    expect(tower).not.toBeNull();
    expect(state.currency).toBe(start - basicTower.cost);
  });

  it('rejects a purchase the player cannot afford', () => {
    const state = freshState();
    state.currency = basicTower.cost - 1;
    const tower = new EconomySystem().buyTower(state, 'basic', { x: 3, y: 3 });
    expect(tower).toBeNull();
    expect(state.currency).toBe(basicTower.cost - 1);
  });

  it('refunds 75% of the purchase price, rounded to nearest', () => {
    const state = freshState();
    const eco = new EconomySystem();
    const tower = eco.buyTower(state, 'basic', { x: 3, y: 3 })!;
    const afterBuy = state.currency;
    const refund = eco.sellTower(state, tower);
    // 50 * 0.75 = 37.5 -> rounds to 38.
    expect(refund).toBe(38);
    expect(state.currency).toBe(afterBuy + 38);
    expect(state.grid.get(3, 3)).toBe('empty');
  });

  it('rounds the refund with an odd price (e.g. cost 55 -> 41)', () => {
    const odd: TowerTypeData = { ...basicTower, id: 'odd', cost: 55 };
    const state = freshState([odd]);
    const eco = new EconomySystem();
    const tower = eco.buyTower(state, 'odd', { x: 3, y: 3 })!;
    // 55 * 0.75 = 41.25 -> 41.
    expect(Math.round(55 * balance.sellRefundRate)).toBe(41);
    expect(eco.sellTower(state, tower)).toBe(41);
  });

  it('awards currency (bounty) via award()', () => {
    const state = freshState();
    const start = state.currency;
    new EconomySystem().award(state, 10);
    expect(state.currency).toBe(start + 10);
  });
});
