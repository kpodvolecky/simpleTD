/**
 * Shared tower shape drawing so the board renderer and the HUD build palette
 * stay visually consistent. Each tower sprite maps to a distinct silhouette:
 *   basic  → arrow
 *   cannon → circle
 *   frost  → snowflake
 *   sniper → triangle
 * Unknown sprites fall back to a circle.
 */
export function drawTowerShape(
  ctx: CanvasRenderingContext2D,
  sprite: string,
  cx: number,
  cy: number,
  size: number,
  color: string,
): void {
  const r = size;
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  switch (sprite) {
    case 'basic':
      drawArrow(ctx, cx, cy, r);
      break;
    case 'sniper':
      drawTriangle(ctx, cx, cy, r);
      break;
    case 'frost':
      drawSnowflake(ctx, cx, cy, r);
      break;
    case 'cannon':
    default:
      drawCircle(ctx, cx, cy, r);
      break;
  }
  ctx.restore();
}

function drawCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawTriangle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r * 0.9, cy + r * 0.75);
  ctx.lineTo(cx - r * 0.9, cy + r * 0.75);
  ctx.closePath();
  ctx.fill();
}

/** Upward-pointing arrow (head + shaft). */
function drawArrow(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  const headH = r * 0.9;
  const headW = r * 1.0;
  const shaftW = r * 0.36;
  const bottom = cy + r;
  const headBase = cy - r + headH;
  ctx.beginPath();
  // Arrow head.
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + headW, headBase);
  ctx.lineTo(cx + shaftW, headBase);
  // Shaft right side.
  ctx.lineTo(cx + shaftW, bottom);
  ctx.lineTo(cx - shaftW, bottom);
  // Shaft left side.
  ctx.lineTo(cx - shaftW, headBase);
  ctx.lineTo(cx - headW, headBase);
  ctx.closePath();
  ctx.fill();
}

/** Simple six-armed snowflake with small branches. */
function drawSnowflake(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.lineWidth = Math.max(1, r * 0.14);
  ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    const ex = cx + dx * r;
    const ey = cy + dy * r;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    // Two small branches near the arm tip.
    const bx = cx + dx * r * 0.6;
    const by = cy + dy * r * 0.6;
    const bl = r * 0.3;
    for (const sign of [-1, 1]) {
      const ba = a + sign * (Math.PI / 4);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + Math.cos(ba) * bl, by + Math.sin(ba) * bl);
      ctx.stroke();
    }
  }
}
