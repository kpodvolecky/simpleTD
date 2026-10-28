import './style.css';
import { Game } from './Game';
import { GameLoop } from './engine/GameLoop';
import { Renderer } from './render/Renderer';
import { Hud } from './render/Hud';
import { InputController } from './input/InputController';
import { LocalSaveStore } from './storage/Save';
import { AudioManager } from './audio/AudioManager';
import { balance } from './config/balance';
import { enemyTypes, towerTypes, levels } from './data/content';
import type { Vec2 } from './types';

const menuEl = document.getElementById('menu') as HTMLElement;
const gameEl = document.getElementById('game') as HTMLElement;
const canvas = document.getElementById('board') as HTMLCanvasElement;
const hudEl = document.getElementById('hud') as HTMLElement;
const overlayEl = document.getElementById('overlay') as HTMLElement;

const save = new LocalSaveStore();
const audio = new AudioManager(save.load().settings.volume);
// Browsers block audio until a user gesture; unlock on first interaction.
window.addEventListener('pointerdown', () => audio.unlock(), { once: false });

let game: Game | null = null;
let renderer: Renderer | null = null;
let hud: Hud | null = null;
let loop: GameLoop | null = null;
let input: InputController | null = null;
let hover: Vec2 | null = null;
let paused = false;
let speedIndex = 0;
let currentLevelIndex = 0;
let resultHandled = false;

// --- Main menu / level select (§8) ------------------------------------------

function showMenu(): void {
  hideOverlay();
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
  buildSettings(menuEl);
}

// --- Settings (§8/§4.5) -----------------------------------------------------

function buildSettings(parent: HTMLElement): void {
  const section = document.createElement('div');
  section.className = 'settings';

  const heading = document.createElement('h2');
  heading.textContent = 'Settings';
  section.appendChild(heading);

  const row = document.createElement('label');
  row.className = 'settings-row';

  const label = document.createElement('span');
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '0';
  slider.max = '100';
  slider.step = '5';
  slider.value = String(Math.round(save.load().settings.volume * 100));

  const update = (): void => {
    label.textContent = `🔊 Volume: ${slider.value}%`;
  };
  update();

  slider.addEventListener('input', () => {
    const vol = Number(slider.value) / 100;
    audio.setVolume(vol);
    const data = save.load();
    data.settings.volume = vol;
    save.save(data);
    update();
  });
  // Play a sample so the change is audible (also unlocks the audio context).
  slider.addEventListener('change', () => {
    audio.unlock();
    audio.play('place');
  });

  row.appendChild(label);
  row.appendChild(slider);
  section.appendChild(row);
  parent.appendChild(section);
}

// --- Game bootstrap ---------------------------------------------------------

function startLevel(index: number): void {
  currentLevelIndex = index;
  resultHandled = false;
  paused = false;
  speedIndex = 0;
  hideOverlay();

  game = new Game(levels[index], enemyTypes, towerTypes);
  renderer = new Renderer(canvas);
  hud = new Hud(hudEl, towerTypes, {
    onSelectTower: () => {},
    onStartWave: () => {
      game?.startNextWave();
      audio.play('waveStart');
    },
    onToggleSpeed: toggleSpeed,
    onTogglePause: togglePause,
    onToggleDamageNumbers: () => { if (game) game.state.damageNumbersEnabled = !game.state.damageNumbersEnabled; },
    onExit: showMenu,
  });

  // Dispose any controller from a previously played level so its stale canvas
  // listeners (bound to the old renderer transform) don't place phantom towers.
  input?.dispose();
  input = new InputController(canvas, game, renderer, {
    getSelectedTower: () => hud?.selectedTowerId ?? null,
    onHover: (cell) => (hover = cell),
    onPlace: (cell) => {
      const sel = hud?.selectedTowerId;
      if (!sel || !game) return;
      const placed = game.placeTower(sel, cell);
      audio.play(placed ? 'place' : 'invalid');
    },
    onSellRequest: (cell) => {
      const value = game?.sellTowerAt(cell) ?? 0;
      if (value > 0) audio.play('place');
    },
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
  // Apply the basic speed (speeds[0]) so the simulation starts at the
  // configured base multiplier rather than the loop's default of 1.
  const initialSpeed = balance.speeds[speedIndex];
  loop.speed = initialSpeed;
  game.state.speed = initialSpeed;
  hud.setSpeedLabel(initialSpeed);
  loop.start();
}

function renderFrame(): void {
  if (!game || !renderer || !hud) return;
  renderer.render(game, {
    cell: hover,
    selectedTowerId: hud.selectedTowerId,
  });
  hud.update(game);
  playFeedbackSounds();
  handleResult();
}

// --- Feedback sounds (§8) ----------------------------------------------------

function playFeedbackSounds(): void {
  if (!game) return;
  const events = game.state.drainEvents();
  if (events.length === 0) return;
  // Collapse repeated events so a busy tick plays each sound at most once.
  if (events.includes('leak')) audio.play('leak');
  else if (events.includes('enemyHit') || events.includes('enemyKilled'))
    audio.play('hit');
}

function handleResult(): void {
  if (!game || resultHandled) return;
  if (game.state.status === 'won') {
    resultHandled = true;
    save.completeLevel(currentLevelIndex);
    if (loop) loop.speed = 1;
    audio.play('win');
    showResultOverlay('won');
  } else if (game.state.status === 'lost') {
    resultHandled = true;
    audio.play('lose');
    showResultOverlay('lost');
  }
}

// --- Win/Lose screens (§8) --------------------------------------------------

function hideOverlay(): void {
  overlayEl.classList.add('hidden');
  overlayEl.innerHTML = '';
}

function showResultOverlay(status: 'won' | 'lost'): void {
  overlayEl.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'overlay-card ' + status;

  const title = document.createElement('h2');
  title.textContent = status === 'won' ? 'You win!' : 'Defeat';
  const icon = document.createElement('div');
  icon.className = 'overlay-icon';
  icon.textContent = status === 'won' ? '\u{1F3C6}' : '\u{1F480}';
  card.appendChild(icon);
  card.appendChild(title);

  const actions = document.createElement('div');
  actions.className = 'overlay-actions';

  const nextIndex = currentLevelIndex + 1;
  const hasNext = nextIndex < levels.length;
  const nextUnlocked = save.load().unlockedLevelIndex >= nextIndex;
  if (status === 'won' && hasNext && nextUnlocked) {
    overlayButton(actions, 'Next level', () => startLevel(nextIndex), true);
  }
  overlayButton(
    actions,
    'Replay',
    () => startLevel(currentLevelIndex),
    status === 'lost',
  );
  overlayButton(actions, 'Menu', showMenu, false);

  card.appendChild(actions);
  overlayEl.appendChild(card);
  overlayEl.classList.remove('hidden');
}

function overlayButton(
  parent: HTMLElement,
  label: string,
  onClick: () => void,
  primary: boolean,
): void {
  const b = document.createElement('button');
  b.className = 'overlay-btn' + (primary ? ' primary' : '');
  b.textContent = label;
  b.addEventListener('click', onClick);
  parent.appendChild(b);
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
