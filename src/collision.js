// Exact geometric hit tests. Every projectile hitbox is either a circle or a
// capsule (a line segment with a radius), and the player is a circle, so these
// two tests cover everything. Shapes are drawn with the same numbers used here,
// so what you see is what hits you.

// Squared distance from point (px, py) to segment (ax, ay)-(bx, by).
export function distSqPointSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const lenSq = abx * abx + aby * aby;
  let t = lenSq === 0 ? 0 : ((px - ax) * abx + (py - ay) * aby) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + abx * t - px;
  const cy = ay + aby * t - py;
  return cx * cx + cy * cy;
}

export function circleHitsCircle(x1, y1, r1, x2, y2, r2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const r = r1 + r2;
  return dx * dx + dy * dy < r * r;
}

// Circle (cx, cy, cr) against capsule from (ax, ay) to (bx, by) with radius r.
export function circleHitsCapsule(cx, cy, cr, ax, ay, bx, by, r) {
  const rr = cr + r;
  return distSqPointSegment(cx, cy, ax, ay, bx, by) < rr * rr;
}
