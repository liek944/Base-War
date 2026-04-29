import { state } from './gameState.js';
import { BASE_RADIUS } from './config.js';
import { getClanUnit } from './clans.js';

// ── Build evenly-spaced spawn positions around the arena centre ──
export function buildSpawnPositions(count) {
  const positions = [];
  const cx = state.W / 2, cy = state.H / 2;
  const rx = state.W * 0.38, ry = state.H * 0.38;
  for (let i = 0; i < count; i++) {
    const angle = (2 * Math.PI / count) * i - Math.PI / 2;
    positions.push({ x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) });
  }
  return positions;
}

// ── Return the nearest enemy unit or base for a given unit ──
export function findNearestEnemy(unit) {
  let best = null, bestDist = Infinity;

  // Loot goblin doesn't attack
  if (unit.isNeutral) return null;

  for (const u of state.units) {
    if (u.dead || u.ownerId === unit.ownerId) continue;
    if (!u.isNeutral && !state.players[u.ownerId]?.alive) continue;
    // Can't target invisible enemies
    if (u.invisible) continue;
    const d = Math.hypot(u.x - unit.x, u.y - unit.y);
    if (d < bestDist) { bestDist = d; best = { type: 'unit', obj: u, dist: d }; }
  }

  for (const p of state.players) {
    if (!p.alive || p.id === unit.ownerId) continue;
    const d = Math.hypot(p.base.x - unit.x, p.base.y - unit.y);
    if (d < bestDist || (best && d < best.dist * 1.2 && d < 120)) {
      bestDist = d; best = { type: 'base', obj: p.base, dist: d };
    }
  }

  return best;
}

// ── Spawn a new unit adjacent to the player's base ──
export function spawnUnit(player, tier = 't1') {
  const clanId = player.clanId;
  const template = clanId ? getClanUnit(clanId, tier) : null;

  const hp     = template?.hp     ?? 30;
  const dmg    = template?.dmg    ?? 4;
  const speed  = template?.speed  ?? 1.2;
  const range  = template?.range  ?? 18;
  const radius = template?.radius ?? 5;
  const shape  = template?.shape  ?? 'circle';

  const angle  = Math.random() * Math.PI * 2;
  const offset = BASE_RADIUS + radius + 4;
  state.units.push({
    id:          Math.random(),
    ownerId:     player.id,
    x:           player.base.x + Math.cos(angle) * offset,
    y:           player.base.y + Math.sin(angle) * offset,
    hp,
    maxHp:       hp,
    dmg,
    speed,
    range,
    radius,
    shape,
    tier,
    clanId:      clanId || null,
    passive:     template?.passive ?? null,
    active:      template?.active  ?? null,
    dead:        false,
    attackTimer: 0,
    targetPos:   null,  // human click-to-move destination
    aiTarget:    null,  // AI brain sets this: { x, y } position to march toward
    selected:    player.isHuman,
    debuffs:     [],
    invisible:   false,
    vanishBonus: false,
    lastTargetId: null,
  });
}

// ── Spawn a Loot Goblin ──
export function spawnLootGoblin() {
  import('./config.js').then(c => {
    state.units.push({
      id:          Math.random(),
      ownerId:     'neutral',
      isNeutral:   true,
      type:        'goblin',
      x:           (state.W || 800) / 2,
      y:           (state.H || 600) / 2,
      hp:          c.GOBLIN_HP,
      maxHp:       c.GOBLIN_HP,
      dmg:         0,
      speed:       c.GOBLIN_SPEED,
      range:       0,
      radius:      c.GOBLIN_RADIUS,
      shape:       'circle',
      tier:        'boss',
      dead:        false,
      angle:       Math.random() * Math.PI * 2,
      attackTimer: 0,
      selected:    false,
      debuffs:     [],
      invisible:   false
    });
  });
}

// ── Spawn a short-lived projectile visual ──
export function spawnProjectile(x, y, tx, ty, color) {
  const dx = tx - x, dy = ty - y, d = Math.hypot(dx, dy) || 1;
  state.projectiles.push({ x, y, vx: (dx / d) * 3.5, vy: (dy / d) * 3.5, color, life: 12 });
}

// ── Mark all units belonging to a player as dead ──
export function killAllUnits(ownerId) {
  for (const u of state.units) if (u.ownerId === ownerId) u.dead = true;
}
