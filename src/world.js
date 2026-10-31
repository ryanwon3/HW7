import { CONFIG } from './config.js';

// Draws the ground. Only grid lines inside the camera view are drawn.
export function drawWorld(ctx, camera) {
  const { width, height, gridSize } = CONFIG.world;

  ctx.fillStyle = '#2e3b2c';
  ctx.fillRect(0, 0, width, height);

  const x0 = Math.max(0, Math.floor(camera.x / gridSize) * gridSize);
  const y0 = Math.max(0, Math.floor(camera.y / gridSize) * gridSize);
  const x1 = Math.min(width, camera.x + camera.viewWidth);
  const y1 = Math.min(height, camera.y + camera.viewHeight);

  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = x0; x <= x1; x += gridSize) {
    ctx.moveTo(x + 0.5, y0);
    ctx.lineTo(x + 0.5, y1);
  }
  for (let y = y0; y <= y1; y += gridSize) {
    ctx.moveTo(x0, y + 0.5);
    ctx.lineTo(x1, y + 0.5);
  }
  ctx.stroke();

  // World border
  ctx.strokeStyle = '#c62828';
  ctx.lineWidth = 6;
  ctx.strokeRect(0, 0, width, height);
}
