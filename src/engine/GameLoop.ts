/**
 * Fixed-timestep game loop (§4.3). The simulation always advances in discrete
 * steps of `fixedDt` seconds; rendering is decoupled via requestAnimationFrame
 * and receives an interpolation alpha. A speed multiplier runs proportionally
 * more fixed steps per frame, preserving the fixed timestep and cell-boundary
 * decision guarantees.
 */
export class GameLoop {
  private readonly fixedDt: number;
  private readonly onFixedUpdate: (dt: number) => void;
  private readonly onRender: (alpha: number) => void;

  private accumulator = 0;
  private lastTime = 0;
  private rafId = 0;
  private running = false;
  /** Simulation speed multiplier (1×/2×, §8). */
  speed = 1;

  private readonly maxFrameTime = 0.25;

  constructor(
    fixedDt: number,
    onFixedUpdate: (dt: number) => void,
    onRender: (alpha: number) => void,
  ) {
    this.fixedDt = fixedDt;
    this.onFixedUpdate = onFixedUpdate;
    this.onRender = onRender;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private frame = (now: number): void => {
    if (!this.running) return;
    let frameTime = (now - this.lastTime) / 1000;
    this.lastTime = now;
    if (frameTime > this.maxFrameTime) frameTime = this.maxFrameTime;

    this.accumulator += frameTime * this.speed;
    while (this.accumulator >= this.fixedDt) {
      this.onFixedUpdate(this.fixedDt);
      this.accumulator -= this.fixedDt;
    }
    this.onRender(this.accumulator / this.fixedDt);
    this.rafId = requestAnimationFrame(this.frame);
  };
}
