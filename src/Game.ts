import { GameState } from './engine/GameState';
import { MovementSystem } from './systems/MovementSystem';
import { CombatSystem } from './systems/CombatSystem';
import { SpawnSystem } from './systems/SpawnSystem';
import { EffectsManager } from './render/EffectsManager';
import { EconomySystem } from './systems/EconomySystem';
import { wouldBlockRoute } from './engine/Pathfinding';
import { Tower } from './entities/Tower';
import type {
  EnemyTypeData,
  LevelData,
  TowerTypeData,
  Vec2,
} from './types';

/**
 * Orchestrates the simulation: owns the game state and drives all systems on a
 * fixed timestep (§4.3). Rendering/input layers call into this class; it never
 * touches the DOM so the whole simulation stays unit-testable.
 */
export class Game {
  readonly state: GameState;
  readonly spawn = new SpawnSystem();
  private readonly movement = new MovementSystem();
  readonly effects = new EffectsManager();
  private readonly combat = new CombatSystem(this.effects);
  private readonly economy = new EconomySystem();

  constructor(
    level: LevelData,
    enemyTypes: EnemyTypeData[],
    towerTypes: TowerTypeData[],
  ) {
    this.state = new GameState(level, enemyTypes, towerTypes);
  }

  /** Advance the simulation by one fixed step. */
  fixedUpdate(dt: number): void {
    if (this.state.status === 'won' || this.state.status === 'lost') return;

    this.spawn.update(this.state, dt);
    this.movement.update(this.state, dt);
    this.combat.update(this.state, dt);
    this.state.projectiles.update(dt);

    this.evaluateEndConditions();
  }

  private evaluateEndConditions(): void {
    if (this.state.lives <= 0) {
      this.state.lives = 0;
      this.state.status = 'lost';
      return;
    }
    // Win: all waves spawned and no enemies left on the field (§3.5).
    if (this.state.allWavesSpawned && this.state.enemies.length === 0) {
      // Only after at least one wave has actually been released.
      if (this.spawn.currentWaveNumber > 0) this.state.status = 'won';
    }
  }

  // --- Player actions -------------------------------------------------------

  startNextWave(): void {
    if (this.state.status === 'building') this.state.status = 'running';
    this.spawn.startNextWave(this.state);
  }

  placeTower(typeId: string, cell: Vec2): Tower | null {
    return this.economy.buyTower(this.state, typeId, cell);
  }

  sellTowerAt(cell: Vec2): number {
    const tower = this.state.towerAt(cell.x, cell.y);
    if (!tower) return 0;
    return this.economy.sellTower(this.state, tower);
  }

  /**
   * True if placing this tower type at `cell` is currently allowed (empty,
   * affordable, not occupied by an enemy). Blocking all paths is still allowed
   * (§3.2) but reported separately by `wouldBlock`.
   */
  canPlace(typeId: string, cell: Vec2): boolean {
    const type = this.state.towerTypes.get(typeId);
    if (!type) return false;
    return (
      this.state.grid.isBuildable(cell.x, cell.y) &&
      !this.state.isCellOccupiedByEnemy(cell.x, cell.y) &&
      this.state.canAfford(type.cost)
    );
  }

  /** True if placing here would block at least one spawn's path (§3.2 preview). */
  wouldBlock(cell: Vec2): boolean {
    return this.state.level.routes.some((r) =>
      wouldBlockRoute(this.state.grid, r.spawn, r.target, cell),
    );
  }
}
