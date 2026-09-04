import type { EnemyTypeData, LevelData, TowerTypeData } from '../types';
import enemiesJson from './enemies.json';
import towersJson from './towers.json';
import level01 from './levels/level-01.json';
import level02 from './levels/level-02.json';
import level03 from './levels/level-03.json';

export const enemyTypes = enemiesJson as EnemyTypeData[];
export const towerTypes = towersJson as TowerTypeData[];

/** Ordered list of levels; index defines the linear progression (§4.5). */
export const levels = [level01, level02, level03] as unknown as LevelData[];

export function levelById(id: string): LevelData | undefined {
  return levels.find((l) => l.id === id);
}
