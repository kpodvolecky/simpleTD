import './style.css';
import { Game } from './Game';
import { GameLoop } from './engine/GameLoop';
import { Renderer } from './render/Renderer';
import { Hud } from './render/Hud';
import { InputController } from './input/InputController';
import { LocalSaveStore } from './storage/Save';
import { balance } from './config/balance';
import { enemyTypes, towerTypes, levels } from './data/content';
import type { Vec2 } from './types';

const menuEl = document.getElementById('menu') as HTMLElement;
const gameEl = document.getElementById('game') as HTMLElement;
const canvas = document.getElementById('board') as HTMLCanvasElement;
const hudEl = document.getElementById('hud') as HTMLElement;

const save = new LocalSaveStore();

let game: Game | null = null;
let renderer: Renderer | null = null;
let hud: Hud | null = null;
let loop: GameLoop | null = null;
let hover: Vec2 | null = null;
let paused = false;
let speedIndex = 0;
let currentLevelIndex = 0;
let resultHandled = false;

// --- Main menu / level select (§8) ------------------------------------------

function showMenu(): void {
  gameEl.classList.add('hidden');
  menuEl.classList.remove('hidden');
  if (loop) loop.stop();

  const unlocked = save.load().unlockedLevelIndex;
  menuEl.innerHTML = '<h1>SimpleTD</h1><p class="subtitle">Maze-building tower defense</p>';
  const list = document.createElement('div');
  list.className = 'level-list';
  levels.forEach((lvl, i) => {
    const btn = document.createElement('button');
    const locked = i > unlocked;
    btn.className = 'level-btn' + (locked ? ' locked' : '');
    btn.disabled = locked;
    btn.innerHTML = `<strong>${i + 1}. ${lvl.name}</strong><span>${
      locked ? '🔒 Locked' : '▶ Play'
    }</span>`;
    btn.addEventListener('click', () => startLevel(i));
    list.appendChild(btn);
  });
  menuEl.appendChild(list);
}

// --- Game bootstrap ---------------------------------------------------------

function startLevel(index: number): void {
  currentLevelIndex = index;
  resultHandled = false;
  paused = false;
  speedIndex = 0;

  game = new Game(levels[index], enemyTypes, towerTypes);
  renderer = new Renderer(canvas);
  hud = new Hud(hudEl, towerTypes, {
    onSelectTower: () => {},
    onStartWave: () => game?.startNextWave(),
    onToggleSpeed: toggleSpeed,
    onTogglePause: togglePause,
    onExit: showMenu,
  });

  const input = new InputController(canvas, game, renderer, {
    getSelectedTower: () => hud?.selectedTowerId ?? null,
    onHover: (cell) => (hover = cell),
    onPlace: (cell) => {
      const sel = hud?.selectedTowerId;
      if (sel && game) game.placeTower(sel, cell);
    },
    onSellRequest: (cell) => game?.sellTowerAt(cell),
  });
  void input;

  menuEl.classList.add('hidden');
  gameEl.classList.remove('hidden');

  renderer.resize(game);

  loop = new GameLoop(
    balance.fixedDt,
    (dt) => {
      if (!paused) game!.fixedUpdate(dt);
    },
    () => renderFrame(),
  );
  loop.start();
}

function renderFrame(): void {
  if (!game || !renderer || !hud) return;
  renderer.render(game, {
    cell: hover,
    selectedTowerId: hud.selectedTowerId,
  });
  hud.update(game);
  handleResult();
}

function handleResult(): void {
  if (!game || resultHandled) return;
  if (game.state.status === 'won') {
    resultHandled = true;
    save.completeLevel(currentLevelIndex);
    if (loop) loop.speed = 1;
  } else if (game.state.status === 'lost') {
    resultHandled = true;
  }
}

function toggleSpeed(): void {
  speedIndex = (speedIndex + 1) % balance.speeds.length;
  const speed = balance.speeds[speedIndex];
  if (loop) loop.speed = speed;
  if (game) game.state.speed = speed;
  hud?.setSpeedLabel(speed);
}

function togglePause(): void {
  paused = !paused;
  hud?.setPauseLabel(paused);
}

window.addEventListener('resize', () => {
  if (game && renderer) renderer.resize(game);
});

showMenu();
