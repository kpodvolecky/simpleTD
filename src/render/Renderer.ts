import { Game } from '../Game';
import type { Vec2 } from '../types';
import { inRange } from '../config/balance';
import { drawTowerShape } from './towerShapes';

interface HoverState {
  cell: Vec2 | null;
  selectedTowerId: string | null;
}

const COLORS = {
  bg: '#0f1420',
  gridLine: '#1d2740',
  empty: '#141b2c',
  blocked: '#2a3350',
  spawn: '#1f6f4f',
  target: '#8a2f3b',
  towerBody: '#4b7bec',
  enemy: '#e8c95a',
  enemyRunner: '#63d7b0',
  enemyTank: '#d98b4a',
  enemyBoss: '#c85ce8',
  hpBack: '#000000',
  hpFront: '#4ade80',
  projectile: '#ffe8a3',
  placeOk: 'rgba(74,222,128,0.35)',
  placeBlock: 'rgba(239,68,68,0.4)',
  placeBad: 'rgba(120,120,120,0.4)',
  rangeRing: 'rgba(120,170,255,0.25)',
} as const;

/**
 * Canvas 2D renderer (§4.1/§4.2). Scales the logical board (grid × cellSize)
 * to the viewport preserving aspect ratio, and supports high-DPI displays via
 * devicePixelRatio.
 */
export class Renderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly canvas: HTMLCanvasElement;
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;
  private dpr = 1;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context unavailable');
    this.ctx = ctx;
    this.canvas = canvas;
  }

  /** Recompute backing store size and board transform for the current layout. */
  resize(game: Game): void {
    this.dpr = window.devicePixelRatio || 1;
    const cssW = this.canvas.clientWidth || 800;
    const cssH = this.canvas.clientHeight || 600;
    this.canvas.width = Math.floor(cssW * this.dpr);
    this.canvas.height = Math.floor(cssH * this.dpr);

    const { grid } = game.state;
    const boardW = grid.width * grid.cellSize;
    const boardH = grid.height * grid.cellSize;
    this.scale = Math.min(cssW / boardW, cssH / boardH);
    this.offsetX = (cssW - boardW * this.scale) / 2;
    this.offsetY = (cssH - boardH * this.scale) / 2;
  }

  /** Convert a CSS-pixel pointer position to a grid cell, or null if outside. */
  pixelToCell(game: Game, px: number, py: number): Vec2 | null {
    const cs = game.state.grid.cellSize;
    const x = Math.floor((px - this.offsetX) / (this.scale * cs));
    const y = Math.floor((py - this.offsetY) / (this.scale * cs));
    if (!game.state.grid.inBounds(x, y)) return null;
    return { x, y };
  }

  render(game: Game, hover: HoverState): void {
    const ctx = this.ctx;
    const { grid } = game.state;
    const cs = grid.cellSize;

    ctx.save();
    ctx.scale(this.dpr, this.dpr);
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    // Cells.
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const s = grid.get(x, y);
        let color: string = COLORS.empty;
        if (s === 'blocked') color = COLORS.blocked;
        else if (s === 'spawn') color = COLORS.spawn;
        else if (s === 'target') color = COLORS.target;
        ctx.fillStyle = color;
        ctx.fillRect(x * cs + 1, y * cs + 1, cs - 2, cs - 2);
      }
    }

    // Grid lines.
    ctx.strokeStyle = COLORS.gridLine;
    ctx.lineWidth = 1;
    for (let x = 0; x <= grid.width; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cs, 0);
      ctx.lineTo(x * cs, grid.height * cs);
      ctx.stroke();
    }
    for (let y = 0; y <= grid.height; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cs);
      ctx.lineTo(grid.width * cs, y * cs);
      ctx.stroke();
    }

    // Towers.
    for (const t of game.state.towers) {
      if (!t.alive) continue;
      const cx = t.cell.x * cs + cs / 2;
      const cy = t.cell.y * cs + cs / 2;
      drawTowerShape(ctx, t.type.sprite, cx, cy, cs * 0.32, COLORS.towerBody);
      // Tower HP bar (only if damaged).
      if (t.hp < t.type.hp) {
        this.drawBar(cx - cs * 0.35, cy - cs * 0.45, cs * 0.7, cs * 0.08, t.hp / t.type.hp);
      }
    }

    // Enemies (interpolated position).
    for (const e of game.state.enemies) {
      if (!e.alive) continue;
      const ix = e.cell.x + (e.nextCell.x - e.cell.x) * e.progress;
      const iy = e.cell.y + (e.nextCell.y - e.cell.y) * e.progress;
      const cx = ix * cs + cs / 2;
      const cy = iy * cs + cs / 2;
      ctx.fillStyle = this.enemyColor(e.type.id);
      ctx.beginPath();
      ctx.arc(cx, cy, cs * 0.26, 0, Math.PI * 2);
      ctx.fill();
      this.drawBar(cx - cs * 0.3, cy - cs * 0.4, cs * 0.6, cs * 0.07, e.hp / e.maxHp);
    }

    // Projectiles.
    ctx.strokeStyle = COLORS.projectile;
    ctx.lineWidth = 2;
    for (const p of game.state.projectiles.active()) {
      ctx.beginPath();
      ctx.moveTo(p.from.x * cs + cs / 2, p.from.y * cs + cs / 2);
      ctx.lineTo(p.to.x * cs + cs / 2, p.to.y * cs + cs / 2);
      ctx.stroke();
    }

    // Build preview.
    if (hover.cell && hover.selectedTowerId) {
      this.drawPreview(game, hover.cell, hover.selectedTowerId, cs);
    }

    ctx.restore();
  }

  private drawPreview(game: Game, cell: Vec2, towerId: string, cs: number): void {
    const ctx = this.ctx;
    const type = game.state.towerTypes.get(towerId);
    if (!type) return;
    const canPlace = game.canPlace(towerId, cell);
    const wouldBlock = canPlace && game.wouldBlock(cell);

    let fill: string = COLORS.placeBad;
    if (canPlace) fill = wouldBlock ? COLORS.placeBlock : COLORS.placeOk;
    ctx.fillStyle = fill;
    ctx.fillRect(cell.x * cs + 1, cell.y * cs + 1, cs - 2, cs - 2);

    // Validity icon (not colour-only, §8): every state carries a distinct glyph
    // so colourblind players can tell them apart.
    //   ✓ = placeable, ! = would block a path, ✕ = cannot place here.
    let icon = '\u2713'; // check mark
    if (!canPlace) icon = '\u2715'; // cross
    else if (wouldBlock) icon = '!';
    ctx.fillStyle = '#fff';
    ctx.font = `${cs * 0.5}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, cell.x * cs + cs / 2, cell.y * cs + cs / 2);

    // Range preview ring (Manhattan diamond, ceil rule).
    ctx.fillStyle = COLORS.rangeRing;
    const r = Math.ceil(type.range);
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (!inRange(Math.abs(dx) + Math.abs(dy), type.range)) continue;
        const gx = cell.x + dx;
        const gy = cell.y + dy;
        if (!game.state.grid.inBounds(gx, gy)) continue;
        ctx.fillRect(gx * cs + cs * 0.35, gy * cs + cs * 0.35, cs * 0.3, cs * 0.3);
      }
    }
  }

  private drawBar(x: number, y: number, w: number, h: number, frac: number): void {
    const ctx = this.ctx;
    const f = Math.max(0, Math.min(1, frac));
    ctx.fillStyle = COLORS.hpBack;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = COLORS.hpFront;
    ctx.fillRect(x, y, w * f, h);
  }

  private enemyColor(typeId: string): string {
    switch (typeId) {
      case 'runner':
        return COLORS.enemyRunner;
      case 'tank':
        return COLORS.enemyTank;
      case 'boss':
        return COLORS.enemyBoss;
      default:
        return COLORS.enemy;
    }
  }
}
