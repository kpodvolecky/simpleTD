import { Game } from '../Game';
import { Renderer } from '../render/Renderer';
import type { Vec2 } from '../types';

export interface InputCallbacks {
  getSelectedTower: () => string | null;
  onHover: (cell: Vec2 | null) => void;
  onPlace: (cell: Vec2) => void;
  onSellRequest: (cell: Vec2) => void;
}

/**
 * Unified pointer input via Pointer Events (§4.2): covers mouse, touch and pen.
 * Placing uses the currently selected tower; tapping an existing tower with no
 * selection requests a sell.
 */
export class InputController {
  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly game: Game,
    private readonly renderer: Renderer,
    private readonly cb: InputCallbacks,
  ) {
    this.attach();
  }

  private cellFromEvent(ev: PointerEvent): Vec2 | null {
    const rect = this.canvas.getBoundingClientRect();
    return this.renderer.pixelToCell(
      this.game,
      ev.clientX - rect.left,
      ev.clientY - rect.top,
    );
  }

  private attach(): void {
    this.canvas.addEventListener('pointermove', (ev) => {
      this.cb.onHover(this.cellFromEvent(ev));
    });
    this.canvas.addEventListener('pointerleave', () => this.cb.onHover(null));

    this.canvas.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      const cell = this.cellFromEvent(ev);
      if (!cell) return;
      if (this.cb.getSelectedTower()) this.cb.onPlace(cell);
      else this.cb.onSellRequest(cell);
    });

    // Prevent unwanted mobile behaviours on the play area (§4.2).
    this.canvas.addEventListener('contextmenu', (ev) => ev.preventDefault());
    this.canvas.style.touchAction = 'none';
  }
}
