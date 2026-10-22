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
  private readonly onPointerMove = (ev: PointerEvent): void => {
    this.cb.onHover(this.cellFromEvent(ev));
  };
  private readonly onPointerLeave = (): void => this.cb.onHover(null);
  private readonly onPointerDown = (ev: PointerEvent): void => {
    ev.preventDefault();
    const cell = this.cellFromEvent(ev);
    if (!cell) return;
    if (this.cb.getSelectedTower()) this.cb.onPlace(cell);
    else this.cb.onSellRequest(cell);
  };
  private readonly onContextMenu = (ev: Event): void => ev.preventDefault();

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
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerleave', this.onPointerLeave);
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    // Prevent unwanted mobile behaviours on the play area (§4.2).
    this.canvas.addEventListener('contextmenu', this.onContextMenu);
    this.canvas.style.touchAction = 'none';
  }

  /**
   * Detach all listeners from the canvas. Must be called before creating a new
   * controller for the same canvas (e.g. when switching levels), otherwise the
   * stale controller keeps firing with an outdated renderer transform and
   * places phantom towers at shifted cells.
   */
  dispose(): void {
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerleave', this.onPointerLeave);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
  }
}
