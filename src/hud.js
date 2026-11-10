import { CONFIG } from './config.js';

// Screen-space HUD: score, survival time, accuracy, HP.
export function drawHud(ctx, game) {
  const { camera, rhythm, player } = game;
  const w = 250;
  const x = camera.viewWidth - w - 12;
  const y = 12;
  const acc = rhythm ? rhythm.accuracy : 1;
  const gate = rhythm ? rhythm.gateAccuracy : 1;
  const scoring = gate >= CONFIG.scoring.accuracyThreshold;

  ctx.fillStyle = 'rgba(10, 10, 20, 0.75)';
  ctx.fillRect(x, y, w, 150);
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText(Math.floor(game.score).toLocaleString(), x + 12, y + 10);
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = '#aaa';
  ctx.fillText(`Time ${formatTime(game.survived)}`, x + 150, y + 18);

  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.fillStyle = scoring ? '#81c784' : '#e57373';
  ctx.fillText(`Accuracy ${(acc * 100).toFixed(2)}%`, x + 12, y + 46);
  ctx.font = '12px system-ui, sans-serif';
  const pct = Math.round(CONFIG.scoring.accuracyThreshold * 100);
  ctx.fillText(scoring ? `Scoring (≥ ${pct}%)` : `Not scoring: need ≥ ${pct}%`, x + 12, y + 70);

  if (rhythm) {
    const c = rhythm.stats.counts;
    ctx.fillStyle = '#ccc';
    const parts = CONFIG.rhythm.windows.map((wd) => `${wd.name} ${c[wd.name]}`);
    parts.push(`Miss ${c.Miss}`);
    ctx.fillText(parts.join('  '), x + 12, y + 90);
    ctx.fillText(`Combo ${rhythm.stats.combo}  (max ${rhythm.stats.maxCombo})`, x + 12, y + 108);
  }

  // HP
  for (let i = 0; i < CONFIG.player.maxHp; i++) {
    ctx.fillStyle = i < player.hp ? '#ef5350' : 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.arc(x + 20 + i * 24, y + 134, 8, 0, Math.PI * 2);
    ctx.fill();
  }
  if (game.songTitle) {
    ctx.fillStyle = '#888';
    ctx.textAlign = 'right';
    ctx.fillText(truncate(game.songTitle, 22), x + w - 10, y + 128);
    ctx.textAlign = 'left';
  }
  ctx.textBaseline = 'alphabetic';
}

// Arrows at the screen edge pointing at projectiles that are coming but not visible yet.
export function drawOffscreenWarnings(ctx, camera, projectiles, player) {
  const w = camera.viewWidth;
  const h = camera.viewHeight;
  const m = 18;
  for (const p of projectiles) {
    if (!p.warn) continue;
    const sx = p.x - camera.x;
    const sy = p.y - camera.y;
    if (sx >= 0 && sx <= w && sy >= 0 && sy <= h) continue;
    // Only warn about things heading roughly toward the player.
    const toPx = player.x - p.x;
    const toPy = player.y - p.y;
    if (toPx * p.vx + toPy * p.vy <= 0) continue;
    const cx = w / 2;
    const cy = h / 2;
    const dx = sx - cx;
    const dy = sy - cy;
    const scale = Math.min((w / 2 - m) / Math.abs(dx || 1e-6), (h / 2 - m) / Math.abs(dy || 1e-6));
    const ex = cx + dx * scale;
    const ey = cy + dy * scale;
    const a = Math.atan2(dy, dx);
    const dist = Math.hypot(toPx, toPy);
    const alpha = Math.max(0.25, Math.min(1, 1 - (dist - 400) / 1200));
    ctx.fillStyle = `rgba(255, 82, 82, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(ex + Math.cos(a) * 10, ey + Math.sin(a) * 10);
    ctx.lineTo(ex + Math.cos(a + 2.5) * 10, ey + Math.sin(a + 2.5) * 10);
    ctx.lineTo(ex + Math.cos(a - 2.5) * 10, ey + Math.sin(a - 2.5) * 10);
    ctx.fill();
  }
}

export function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function truncate(s, n) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
