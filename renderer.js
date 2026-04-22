import { state } from './gameState.js';
import { BASE_RADIUS, UNIT_RADIUS, ROUND_DURATION } from './config.js';
import { CLANS } from './clans.js';

// ── Master draw call — called every frame from the game loop ──
export function draw() {
  const { ctx, W, H } = state;
  ctx.clearRect(0, 0, W, H);

  drawGrid();

  for (const p of state.players) drawBase(p);

  for (const u of state.units) {
    if (!u.dead) drawUnit(u);
  }

  drawProjectiles();
  drawVFX();
  drawTimerBar();
}

function drawGrid() {
  const { ctx, W, H } = state;
  ctx.strokeStyle = '#111520';
  ctx.lineWidth   = 0.5;
  const gs = 40;
  for (let x = 0; x < W; x += gs) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += gs) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
}

function drawBase(p) {
  const { ctx } = state;
  const b        = p.base;
  const alive    = p.alive;
  const hpRatio  = b.hp / b.maxHp;

  ctx.save();

  if (alive) {
    ctx.shadowBlur  = 20;
    ctx.shadowColor = p.color + '55';
  }

  // Hex shape
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    i === 0
      ? ctx.moveTo(b.x + BASE_RADIUS * Math.cos(a), b.y + BASE_RADIUS * Math.sin(a))
      : ctx.lineTo(b.x + BASE_RADIUS * Math.cos(a), b.y + BASE_RADIUS * Math.sin(a));
  }
  ctx.closePath();
  ctx.fillStyle   = alive ? p.color + '22' : '#22222288';
  ctx.fill();
  ctx.strokeStyle = alive ? p.color : '#333';
  ctx.lineWidth   = 2;
  ctx.stroke();
  ctx.shadowBlur  = 0;

  // HP bar
  const bw = BASE_RADIUS * 2, bh = 4;
  ctx.fillStyle = '#111';
  ctx.fillRect(b.x - bw / 2, b.y + BASE_RADIUS + 4, bw, bh);
  ctx.fillStyle = hpRatio > 0.5 ? '#44ff88' : hpRatio > 0.25 ? '#ffcc00' : '#ff4455';
  ctx.fillRect(b.x - bw / 2, b.y + BASE_RADIUS + 4, bw * hpRatio, bh);

  // Clan icon + player name
  const clan = CLANS[p.clanId];
  const label = clan ? `${clan.icon} ${p.name}` : p.name;
  ctx.fillStyle   = alive ? p.color : '#444';
  ctx.font        = `bold 9px 'Orbitron', monospace`;
  ctx.textAlign   = 'center';
  ctx.fillText(label, b.x, b.y + BASE_RADIUS + 18);

  // Player marker
  ctx.fillStyle    = alive ? p.color + 'cc' : '#333';
  ctx.font         = `bold 11px 'Share Tech Mono', monospace`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(p.isHuman ? '★' : (p.id + 1), b.x, b.y);
  ctx.textBaseline = 'alphabetic';

  ctx.restore();
}

function drawUnit(u) {
  const { ctx } = state;
  const p       = state.players[u.ownerId];
  const hpRatio = u.hp / u.maxHp;
  const sel     = u.selected;
  const r       = u.radius || UNIT_RADIUS;

  // Invisible handling: own units at 30% opacity, enemy invisible units hidden
  if (u.invisible) {
    const humanPlayer = state.players.find(pl => pl.isHuman);
    if (humanPlayer && u.ownerId !== humanPlayer.id) return; // don't draw enemy invisible units
  }

  ctx.save();

  // Opacity for invisible own units
  if (u.invisible) ctx.globalAlpha = 0.3;

  // T3 glow
  if (u.tier === 't3') {
    ctx.shadowBlur  = 14;
    ctx.shadowColor = p.color + '88';
  } else if (u.tier === 't2') {
    ctx.shadowBlur  = 8;
    ctx.shadowColor = p.color + '44';
  }

  if (sel && !u.invisible) {
    ctx.shadowBlur  = 10;
    ctx.shadowColor = '#ffcc00';
  }

  // Draw shape based on tier
  ctx.beginPath();
  switch (u.shape || 'circle') {
    case 'diamond':
      // Rotated square
      ctx.moveTo(u.x, u.y - r);
      ctx.lineTo(u.x + r, u.y);
      ctx.lineTo(u.x, u.y + r);
      ctx.lineTo(u.x - r, u.y);
      ctx.closePath();
      break;

    case 'hexagon':
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        i === 0
          ? ctx.moveTo(u.x + r * Math.cos(a), u.y + r * Math.sin(a))
          : ctx.lineTo(u.x + r * Math.cos(a), u.y + r * Math.sin(a));
      }
      ctx.closePath();
      break;

    default: // circle
      ctx.arc(u.x, u.y, r, 0, Math.PI * 2);
      break;
  }

  ctx.fillStyle = p.color + (sel ? 'ff' : 'aa');
  ctx.fill();

  if (sel && !u.invisible) {
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth   = 1.5;
    ctx.stroke();
  }
  ctx.shadowBlur = 0;

  // Tier label inside unit
  if (u.tier === 't2' || u.tier === 't3') {
    ctx.fillStyle    = '#000';
    ctx.font         = `bold ${u.tier === 't3' ? 8 : 7}px 'Share Tech Mono', monospace`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(u.tier === 't2' ? 'II' : 'III', u.x, u.y);
    ctx.textBaseline = 'alphabetic';
  }

  // Mini HP bar
  if (hpRatio < 1) {
    const barW = r * 2;
    ctx.fillStyle = '#111';
    ctx.fillRect(u.x - barW / 2, u.y - r - 5, barW, 2);
    ctx.fillStyle = hpRatio > 0.5 ? '#44ff88' : hpRatio > 0.25 ? '#ffcc00' : '#ff4455';
    ctx.fillRect(u.x - barW / 2, u.y - r - 5, barW * hpRatio, 2);
  }

  // Debuff indicators — small dots below unit
  if (u.debuffs && u.debuffs.length > 0) {
    let dx = -4;
    for (const d of u.debuffs) {
      let color = '#888';
      if (d.type === 'burn')       color = '#ff6622';
      if (d.type === 'slow')       color = '#4488ff';
      if (d.type === 'stun')       color = '#ffee00';
      if (d.type === 'shieldwall') color = '#88aacc';
      ctx.beginPath();
      ctx.arc(u.x + dx, u.y + r + 4, 2, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      dx += 5;
    }
  }

  ctx.restore();
}

function drawProjectiles() {
  const { ctx } = state;
  for (const pr of state.projectiles) {
    ctx.beginPath();
    ctx.arc(pr.x, pr.y, 2, 0, Math.PI * 2);
    ctx.fillStyle   = pr.color;
    ctx.shadowBlur  = 6;
    ctx.shadowColor = pr.color;
    ctx.fill();
    ctx.shadowBlur  = 0;
  }
}

function drawVFX() {
  if (!state.vfx || state.vfx.length === 0) return;
  const { ctx } = state;

  for (const v of state.vfx) {
    ctx.save();
    const alpha = Math.max(0, v.life / 30);
    ctx.globalAlpha = alpha;

    if (v.type === 'ring') {
      ctx.beginPath();
      ctx.arc(v.x, v.y, v.radius, 0, Math.PI * 2);
      ctx.strokeStyle = v.color;
      ctx.lineWidth   = 2;
      ctx.shadowBlur  = 10;
      ctx.shadowColor = v.color;
      ctx.stroke();
    } else if (v.type === 'puff') {
      // Expanding fading circle
      const puffR = (1 - v.life / 20) * 20;
      ctx.beginPath();
      ctx.arc(v.x, v.y, puffR, 0, Math.PI * 2);
      ctx.fillStyle = v.color + '66';
      ctx.fill();
    }

    ctx.restore();
  }
}

function drawTimerBar() {
  const { ctx, W, H } = state;
  const progress = state.roundTimer / ROUND_DURATION;
  ctx.fillStyle  = '#1a1f2e';
  ctx.fillRect(0, H - 4, W, 4);
  ctx.fillStyle  = '#ffcc0066';
  ctx.fillRect(0, H - 4, W * progress, 4);
}
