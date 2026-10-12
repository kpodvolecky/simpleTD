import { Game } from '../Game';
import type { TowerTypeData } from '../types';

export interface HudCallbacks {
  onSelectTower: (towerId: string | null) => void;
  onStartWave: () => void;
  onToggleSpeed: () => void;
  onTogglePause: () => void;
  onExit: () => void;
}

/**
 * In-game HUD (§8): currency, lives, wave progress, start-wave button,
 * game-speed toggle, pause, and the tower build palette.
 */
export class Hud {
  private readonly root: HTMLElement;
  private selectedTower: string | null = null;
  private readonly paletteButtons = new Map<string, HTMLButtonElement>();

  private currencyEl!: HTMLElement;
  private livesEl!: HTMLElement;
  private waveEl!: HTMLElement;
  private statusEl!: HTMLElement;
  private startBtn!: HTMLButtonElement;
  private speedBtn!: HTMLButtonElement;
  private pauseBtn!: HTMLButtonElement;

  constructor(
    root: HTMLElement,
    private readonly towerTypes: TowerTypeData[],
    private readonly cb: HudCallbacks,
  ) {
    this.root = root;
    this.build();
  }

  get selectedTowerId(): string | null {
    return this.selectedTower;
  }

  private build(): void {
    this.root.innerHTML = '';

    const top = document.createElement('div');
    top.className = 'hud-top';
    this.currencyEl = stat(top, '💰', 'currency');
    this.livesEl = stat(top, '❤️', 'lives');
    this.waveEl = stat(top, '🌊', 'wave');
    this.statusEl = document.createElement('span');
    this.statusEl.className = 'hud-status';
    top.appendChild(this.statusEl);
    this.root.appendChild(top);

    const controls = document.createElement('div');
    controls.className = 'hud-controls';
    this.startBtn = button(controls, 'Start wave', () => this.cb.onStartWave());
    this.speedBtn = button(controls, '1×', () => this.cb.onToggleSpeed());
    this.pauseBtn = button(controls, 'Pause', () => this.cb.onTogglePause());
    button(controls, 'Menu', () => this.cb.onExit());
    this.root.appendChild(controls);

    const palette = document.createElement('div');
    palette.className = 'hud-palette';
    for (const t of this.towerTypes) {
      const b = document.createElement('button');
      b.className = 'palette-btn';
      b.innerHTML = `<strong>${t.name}</strong><span>💰${t.cost}</span>`;
      b.addEventListener('click', () => this.select(t.id));
      palette.appendChild(b);
      this.paletteButtons.set(t.id, b);
    }
    this.root.appendChild(palette);
  }

  private select(towerId: string): void {
    this.selectedTower = this.selectedTower === towerId ? null : towerId;
    for (const [id, b] of this.paletteButtons) {
      b.classList.toggle('selected', id === this.selectedTower);
    }
    this.cb.onSelectTower(this.selectedTower);
  }

  clearSelection(): void {
    this.selectedTower = null;
    for (const b of this.paletteButtons.values()) b.classList.remove('selected');
    this.cb.onSelectTower(null);
  }

  setSpeedLabel(speed: number): void {
    this.speedBtn.textContent = `${speed}×`;
  }

  setPauseLabel(paused: boolean): void {
    this.pauseBtn.textContent = paused ? 'Resume' : 'Pause';
  }

  update(game: Game): void {
    this.currencyEl.textContent = String(Math.floor(game.state.currency));
    this.livesEl.textContent = String(game.state.lives);
    this.waveEl.textContent = `${game.spawn.currentWaveNumber}/${game.spawn.totalWaves}`;

    for (const [id, b] of this.paletteButtons) {
      const type = game.state.towerTypes.get(id);
      b.disabled = !!type && !game.state.canAfford(type.cost);
    }

    const over = game.state.status === 'won' || game.state.status === 'lost';
    this.startBtn.disabled = over;

    if (game.state.status === 'won') this.statusEl.textContent = 'YOU WIN! 🎉';
    else if (game.state.status === 'lost') this.statusEl.textContent = 'DEFEAT 💀';
    else {
      const cd = game.spawn.countdownRemainingMs(game.state);
      this.statusEl.textContent =
        cd !== null ? `Next wave in ${Math.ceil(cd / 1000)}s` : '';
    }
  }
}

function stat(parent: HTMLElement, icon: string, cls: string): HTMLElement {
  const wrap = document.createElement('span');
  wrap.className = `hud-stat hud-${cls}`;
  const label = document.createElement('span');
  label.textContent = icon + ' ';
  const value = document.createElement('span');
  value.textContent = '0';
  wrap.appendChild(label);
  wrap.appendChild(value);
  parent.appendChild(wrap);
  return value;
}

function button(
  parent: HTMLElement,
  label: string,
  onClick: () => void,
): HTMLButtonElement {
  const b = document.createElement('button');
  b.className = 'hud-btn';
  b.textContent = label;
  b.addEventListener('click', onClick);
  parent.appendChild(b);
  return b;
}
