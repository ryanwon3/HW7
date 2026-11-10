import { RhythmGame } from '../src/rhythm.js';
import { circleHitsCapsule, circleHitsCircle } from '../src/collision.js';
import { Bullet, Arrow, Laser } from '../src/projectiles.js';
const assert = (c, m) => { if (!c) { console.error('FAIL', m); process.exitCode = 1; } else console.log('ok', m); };
const chart = { duration: 10, notes: [{t:1,lane:0},{t:2,lane:1},{t:3,lane:2},{t:4,lane:3},{t:5,lane:0}] };
const r = new RhythmGame(chart);
r.update(0);
assert(r.press(0, 1.03) === 'Perfect', '30ms late = Perfect');
assert(r.press(1, 2 - 0.07) === 'Great', '70ms early = Great');
assert(r.press(2, 3.12) === 'Good', '120ms late = Good');
assert(r.press(3, 3.5) === null, 'press 500ms early does nothing');
r.update(4.2); // note at 4 missed (>135ms late)
assert(r.stats.counts.Miss === 1, 'unpressed note becomes Miss');
assert(r.press(0, 5.0) === 'Perfect', 'exact = Perfect');
const acc = r.accuracy;
assert(Math.abs(acc - (1 + 0.8 + 0.5 + 0 + 1) / 5) < 1e-9, `accuracy ${acc} = (1+.8+.5+0+1)/5`);
assert(r.press(0, 5.01) === null, 'note cannot be hit twice');
// loop: notes repeat after duration + gap
r.update(12);
assert(r.notes.some(n => Math.abs(n.t - (11.5 + 1)) < 1e-9), 'chart loops');
// collisions
const P = { x: 0, y: 0, radius: 18 };
assert(circleHitsCircle(0,0,18, 25.9,0,8), 'circles overlapping at 25.9');
assert(!circleHitsCircle(0,0,18, 26.1,0,8), 'circles apart at 26.1');
// fast bullet that would tunnel: moves from x=-30 to x=30 in one step
const b = new Bullet(-30, 0, 0, 1000, { speed: 7200, radius: 2 });
b.update(1/120);
assert(b.x === 30 && b.hits(P), 'swept bullet cannot tunnel through the player');
// arrow sideways: shaft passes 20 units above centre -> radius 18 + 3 = 21 > 20 hits; 22 misses
const a1 = new Arrow(10, -20, 0, 1000); a1.prevX = a1.x; a1.prevY = a1.y;
assert(a1.hits(P), 'arrow shaft 20 above centre hits');
const a2 = new Arrow(10, -22, 0, 1000); a2.prevX = a2.x; a2.prevY = a2.y;
assert(!a2.hits(P), 'arrow shaft 22 above centre misses');
const a3 = new Arrow(-22, 0, 0, 1000); a3.prevX = a3.x; a3.prevY = a3.y;
assert(!a3.hits(P), 'arrow tip 22 left of centre (pointing away) misses');
const L = new Laser(0, 28, 0);
assert(!L.hits(P), 'laser harmless during warning');
L.update(1.2);
assert(L.hits(P), 'laser 28 away hits when active (18+11=29)');
const L2 = new Laser(0, 30, 0); L2.update(1.2);
assert(!L2.hits(P), 'laser 30 away misses');
