import { state } from './gameState.js';
import {
  PLAYER_COLORS, PLAYER_NAMES,
  BASE_HP, SPAWN_INTERVAL,
  ATTACK_RANGE, ATTACK_DMG, ATTACK_CD, BASE_RADIUS,
  ROUND_DURATION
} from './config.js';
import { buildSpawnPositions, findNearestEnemy, spawnUnit, spawnProjectile, killAllUnits } from './entities.js';
import { buildPlayerCards, updatePlayerCards, addLog, flashRound, showResult, buildActionPanel, updateActionPanel } from './ui.js';
import { draw } from './renderer.js';
import { initBrain, tickBrain } from './ai.js';
import { CLANS, CLAN_LIST, getClanUnit } from './clans.js';
import {
  tickDebuffs, tickPassives, tickVFX,
  isStunned, getSlowFactor,
  applyPassiveDamageTaken, applyPassiveDamageDealt, applyOnHit,
} from './abilities.js';
import {
  initEconomy, awardKillGold, awardBaseKillGold, awardRoundGold,
  tickPassiveIncome, tickCooldowns,
} from './economy.js';

// ── Start a new game from the overlay ──
export function startGame() {
  document.getElementById('overlay').classList.add('hidden');
  const numPlayers = parseInt(document.getElementById('num-players-select').value);
  const difficulty  = document.getElementById('difficulty-select')?.value ?? 'medium';

  // Read human clan selection
  const humanClan = document.getElementById('clan-select')?.value ?? CLAN_LIST[0];

  state.players      = [];
  state.units        = [];
  state.projectiles  = [];
  state.vfx          = [];
  state.selectedUnits = [];
  state.round        = 0;
  state.frameCount   = 0;
  state.roundTimer   = 0;
  state.gameOver     = false;
  state.alliances    = new Set(); // reset alliances on new game

  // Build pool of clans for AI (exclude human's pick, allow duplicates if needed)
  const aiClanPool = CLAN_LIST.filter(c => c !== humanClan);

  const positions = buildSpawnPositions(numPlayers);
  for (let i = 0; i < numPlayers; i++) {
    const isHuman = i === 0;
    let clanId;
    if (isHuman) {
      clanId = humanClan;
    } else {
      // Pick random from pool; if pool exhausted, allow any
      if (aiClanPool.length > 0) {
        const idx = Math.floor(Math.random() * aiClanPool.length);
        clanId = aiClanPool.splice(idx, 1)[0];
      } else {
        clanId = CLAN_LIST[Math.floor(Math.random() * CLAN_LIST.length)];
      }
    }

    const player = {
      id:          i,
      name:        PLAYER_NAMES[i],
      color:       PLAYER_COLORS[i],
      clanId,
      base:        { x: positions[i].x, y: positions[i].y, hp: BASE_HP, maxHp: BASE_HP },
      alive:       true,
      kills:       0,
      spawnTimer:  Math.floor(Math.random() * SPAWN_INTERVAL),
      isHuman,
      gold:        0,
      abilityCooldown: 0,
      _goldTimer:  0,
    };
    state.players.push(player);
    initEconomy(player);
    if (!isHuman) initBrain(player, difficulty);
  }

  buildPlayerCards();
  buildActionPanel();
  startRound();
  state.gameRunning = true;
  if (state.animId) cancelAnimationFrame(state.animId);
  gameLoop();
}

function startRound() {
  state.round++;
  state.roundTimer = ROUND_DURATION;
  document.getElementById('round-num').textContent = state.round;
  flashRound(`ROUND ${state.round}`);
  addLog(`── Round ${state.round} started ──`, 'round');
  awardRoundGold();

  import('./config.js').then(c => {
    if (state.round > 1 && Math.random() < c.EVENT_CHANCE) {
      import('./events.js').then(m => m.triggerRandomEvent());
    }
  });
}

// ── Core game loop ──
function gameLoop() {
  if (!state.gameRunning) return;
  update();
  draw();
  state.animId = requestAnimationFrame(gameLoop);
}

function update() {
  state.frameCount++;
  if (state.gameOver) return;

  // AI brain phase — each brain self-throttles internally
  for (const p of state.players) {
    if (p.alive && !p.isHuman && p.brain) tickBrain(p);
  }

  // Economy phase
  tickPassiveIncome();
  tickCooldowns();

  // Spawn phase (T1 auto-spawn only)
  for (const p of state.players) {
    if (!p.alive) continue;
    p.spawnTimer++;
    if (p.spawnTimer >= SPAWN_INTERVAL) {
      p.spawnTimer = 0;
      spawnUnit(p, 't1');
    }
  }

  // Ability passive tick phase
  tickPassives();

  // Debuff tick phase
  tickDebuffs();

  // VFX tick phase
  tickVFX();

  // Unit movement & combat phase
  for (const u of state.units) {
    if (u.dead) continue;
    
    // Handle neutral units like Goblin
    if (u.isNeutral && u.type === 'goblin') {
      const slowFactor = getSlowFactor(u);
      const effectiveSpeed = u.speed * slowFactor;
      u.x += Math.cos(u.angle) * effectiveSpeed;
      u.y += Math.sin(u.angle) * effectiveSpeed;
      
      const margin = 20;
      if (u.x < margin || u.x > (state.W || 800) - margin) u.angle = Math.PI - u.angle;
      if (u.y < margin || u.y > (state.H || 600) - margin) u.angle = -u.angle;
      
      if (Math.random() < 0.05) u.angle += (Math.random() - 0.5);
      continue;
    }

    const p = state.players[u.ownerId];
    if (!p || !p.alive) { u.dead = true; continue; }

    // Stunned units can't move or attack
    if (isStunned(u)) continue;

    const slowFactor = getSlowFactor(u);
    const effectiveSpeed = u.speed * slowFactor;

    // Human unit: move toward commanded target position
    if (p.isHuman && u.targetPos) {
      const dx = u.targetPos.x - u.x;
      const dy = u.targetPos.y - u.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 2) {
        u.x += (dx / dist) * effectiveSpeed;
        u.y += (dy / dist) * effectiveSpeed;
      } else {
        u.targetPos = null;
      }
    }

    // AI unit: move toward brain-issued aiTarget; fall back to nearest enemy
    if (!p.isHuman) {
      const dst = u.aiTarget ?? findNearestEnemy(u)?.obj;
      if (dst) {
        const dx = dst.x - u.x, dy = dst.y - u.y;
        const dist = Math.hypot(dx, dy);
        if (dist > u.range) {
          u.x += (dx / dist) * effectiveSpeed;
          u.y += (dy / dist) * effectiveSpeed;
        }
      }
    }

    // Attack: same for human and AI — fire if an enemy is in range
    const target = findNearestEnemy(u);
    if (target) {
      const tx   = target.obj.x;
      const ty   = target.obj.y;
      const dist = Math.hypot(tx - u.x, ty - u.y);

      u.attackTimer = (u.attackTimer || 0) + 1;
      if (u.attackTimer >= ATTACK_CD && dist <= u.range + BASE_RADIUS) {
        u.attackTimer = 0;
        resolveAttack(u, target, p);
      }
    }
  }

  // Projectile phase
  for (const pr of state.projectiles) {
    pr.life--;
    pr.x += pr.vx;
    pr.y += pr.vy;
  }

  // Cleanup phase
  for (let i = state.units.length - 1;       i >= 0; i--) if (state.units[i].dead)         state.units.splice(i, 1);
  for (let i = state.projectiles.length - 1; i >= 0; i--) if (state.projectiles[i].life <= 0) state.projectiles.splice(i, 1);

  // Round timer phase
  state.roundTimer--;
  if (state.roundTimer <= 0) {
    if (state.round < 10) startRound();
    else endGame();
  }

  updatePlayerCards();
  updateActionPanel();
}

// ── Resolve a single attack tick from attacker → target ──
function resolveAttack(attacker, target, attackerPlayer) {
  if (target.type === 'unit') {
    // Calculate damage with passive modifiers
    let dmg = applyPassiveDamageDealt(attacker, target, attacker.dmg);
    dmg = applyPassiveDamageTaken(target.obj, dmg);

    target.obj.hp -= dmg;
    spawnProjectile(attacker.x, attacker.y, target.obj.x, target.obj.y, attackerPlayer.color);

    // Trigger on-hit effects (ignite, chain lightning)
    applyOnHit(attacker, target);

    // Reveal attacker if invisible (broke stealth by attacking)
    if (attacker.invisible) {
      attacker.invisible = false;
      // Remove vanish debuff
      if (attacker.debuffs) {
        attacker.debuffs = attacker.debuffs.filter(d => d.type !== 'vanish');
      }
    }

    if (target.obj.isNeutral && target.obj.type === 'goblin') {
      import('./config.js').then(c => {
        attackerPlayer.gold += c.GOBLIN_GOLD_HIT;
      });
    }

    if (target.obj.hp <= 0) {
      target.obj.dead = true;
      if (target.obj.isNeutral && target.obj.type === 'goblin') {
        import('./config.js').then(c => {
          attackerPlayer.gold += c.GOBLIN_GOLD_KILL;
          addLog(`${attackerPlayer.name} killed the Loot Goblin!`, 'event');
        });
      } else {
        attackerPlayer.kills++;
        awardKillGold(attackerPlayer);
      }
    }
  } else if (target.type === 'base') {
    let dmg = applyPassiveDamageDealt(attacker, target, attacker.dmg);
    target.obj.hp -= dmg;
    spawnProjectile(attacker.x, attacker.y, target.obj.x, target.obj.y, attackerPlayer.color);

    // Reveal attacker if invisible
    if (attacker.invisible) {
      attacker.invisible = false;
      if (attacker.debuffs) {
        attacker.debuffs = attacker.debuffs.filter(d => d.type !== 'vanish');
      }
    }

    if (target.obj.hp <= 0) {
      const defeated = state.players.find(pl => pl.base === target.obj);
      if (defeated) {
        defeated.alive = false;
        killAllUnits(defeated.id);
        addLog(`${attackerPlayer.name} destroyed ${defeated.name}'s base!`, 'base');
        awardBaseKillGold(attackerPlayer);
        checkWinCondition();
      }
    }
  }
}

function checkWinCondition() {
  const alive = state.players.filter(p => p.alive);
  if (alive.length === 1) {
    endGame(alive[0], 'LAST BASE STANDING');
  }
}

function endGame(winner, reason) {
  state.gameOver = true;
  if (!winner) {
    const sorted = [...state.players].sort((a, b) => b.kills - a.kills);
    winner = sorted[0];
    reason = `MOST KILLS: ${winner.kills}`;
  }
  showResult(winner, reason);
}
