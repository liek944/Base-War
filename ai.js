import { state, areAllied } from './gameState.js';
import {
  AI_DEFEND_THRESHOLD, AI_THREAT_RADIUS,
  AI_RUSH_HP_PERCENT, AI_RUSH_TIME_REMAINING,
  AI_DIFFICULTY_SETTINGS, BASE_HP
} from './config.js';
import { addLog } from './ui.js';
import { buyUnit } from './economy.js';
import { activateAbility } from './abilities.js';
import { getClanUnit } from './clans.js';

// ── Strategies ───────────────────────────────────────────────────────────────
const STRATEGY = {
  ATTACK_BASE: 'ATTACK_BASE',
  DEFEND:      'DEFEND',
  REINFORCE:   'REINFORCE',
  RUSH:        'RUSH',
};

// ── Public: initialise brain on an AI player ─────────────────────────────────
export function initBrain(player, difficulty = 'medium') {
  const settings = AI_DIFFICULTY_SETTINGS[difficulty] ?? AI_DIFFICULTY_SETTINGS.medium;
  player.brain = {
    strategy:      STRATEGY.ATTACK_BASE,
    primaryTarget: null, // { player, base: {x,y} }
    decisionTimer: 0,
    settings,
    difficulty,
  };
}

// ── Public: evaluate + issue orders (call every frame; self-throttles) ────────
export function tickBrain(player) {
  if (!player.brain || !player.alive) return;

  player.brain.decisionTimer++;
  if (player.brain.decisionTimer < player.brain.settings.decisionInterval) return;
  player.brain.decisionTimer = 0;

  const prev = player.brain.strategy;
  _decideSrategy(player);
  _issueOrders(player);
  _aiSpend(player);
  _aiUseAbility(player);

  // Log strategy changes so Q can follow bot thinking in the combat log
  if (player.brain.strategy !== prev) {
    addLog(`${player.name} → ${player.brain.strategy}`, 'ai');
  }
}

// ── AI spending: buy T3 if affordable and no T3 alive, else buy T2 ───────────
function _aiSpend(player) {
  const t3Template = getClanUnit(player.clanId, 't3');
  const t2Template = getClanUnit(player.clanId, 't2');
  if (!t3Template || !t2Template) return;

  // Priority: buy T3 if we can afford it and have no living T3
  const hasT3 = state.units.some(u => !u.dead && u.ownerId === player.id && u.tier === 't3');
  if (!hasT3 && player.gold >= t3Template.cost) {
    buyUnit(player, 't3');
    return;
  }

  // Otherwise buy T2 if affordable
  if (player.gold >= t2Template.cost) {
    buyUnit(player, 't2');
  }
}

// ── AI ability usage: activate when T3 units are near enemies ────────────────
function _aiUseAbility(player) {
  if (player.abilityCooldown > 0) return;

  const champions = state.units.filter(u => !u.dead && u.ownerId === player.id && u.tier === 't3');
  if (champions.length === 0) return;

  // Use ability when any champion is near ≥2 enemies
  for (const champ of champions) {
    let nearbyEnemies = 0;
    for (const u of state.units) {
      if (u.dead || u.ownerId === player.id) continue;
      if (!state.players[u.ownerId]?.alive) continue;
      const d = Math.hypot(u.x - champ.x, u.y - champ.y);
      if (d < 80) nearbyEnemies++;
    }
    if (nearbyEnemies >= 2) {
      activateAbility(player);
      return;
    }
  }
}

// ── Strategy decision ─────────────────────────────────────────────────────────
function _decideSrategy(player) {
  const brain    = player.brain;
  const settings = brain.settings;
  const base     = player.base;

  // 1. Rush condition: low HP or nearly end of round
  const hpRatio      = base.hp / BASE_HP;
  const isLowHp      = hpRatio < AI_RUSH_HP_PERCENT;
  const isLateRound  = state.roundTimer < AI_RUSH_TIME_REMAINING;
  if (isLowHp || isLateRound) {
    brain.strategy      = STRATEGY.RUSH;
    brain.primaryTarget = _bestTarget(player);
    return;
  }

  // 2. Defend condition: enemies too close to own base OR too few friendly guards
  const enemiesNearBase  = _countEnemiesNearPoint(player.id, base.x, base.y, AI_THREAT_RADIUS);
  const friendsNearBase  = _countFriendsNearPoint(player.id, base.x, base.y, AI_THREAT_RADIUS);
  const underThreat      = enemiesNearBase > 0;
  const underDefended    = friendsNearBase < AI_DEFEND_THRESHOLD;

  if (underThreat && underDefended) {
    brain.strategy      = STRATEGY.DEFEND;
    brain.primaryTarget = null;
    return;
  }

  // 3. Default: pick the best attack target
  const target = _bestTarget(player);
  if (!target) {
    brain.strategy      = STRATEGY.REINFORCE;
    brain.primaryTarget = null;
    return;
  }

  brain.primaryTarget = target;
  brain.strategy      = STRATEGY.ATTACK_BASE;
}

// ── Scoring: pick the best enemy player to attack ────────────────────────────
function _bestTarget(player) {
  let bestScore  = -Infinity;
  let bestTarget = null;

  const W = state.W || 800, H = state.H || 600;
  const maxDist = Math.hypot(W, H);

  for (const enemy of state.players) {
    if (!enemy.alive || enemy.id === player.id) continue;
    const score = _scoreTarget(player, enemy, maxDist);
    if (score > bestScore) { bestScore = score; bestTarget = enemy; }
  }

  return bestTarget;
}

function _scoreTarget(player, enemy, maxDist) {
  // Allied players are never targeted
  if (areAllied(player.id, enemy.id)) return -Infinity;

  const settings = player.brain.settings;

  // How damaged is their base? (0 = full, 1 = dead)
  const hpLoss    = 1 - (enemy.base.hp / BASE_HP);

  // How undefended are they? Few units near their base = vulnerable
  const guards    = _countFriendsNearPoint(enemy.id, enemy.base.x, enemy.base.y, AI_THREAT_RADIUS);
  const vuln      = 1 / Math.max(guards + 1, 1);

  // How far away are they?
  const dist      = Math.hypot(enemy.base.x - player.base.x, enemy.base.y - player.base.y);
  const proximity = 1 - dist / maxDist;

  // Rush bonus (meaningful only when strategy forced to RUSH)
  const rushBonus = (state.roundTimer < AI_RUSH_TIME_REMAINING) ? settings.rushBonus : 0;

  // Random noise to make easy bots feel imperfect
  const noise = (Math.random() - 0.5) * settings.noiseAmount;

  return hpLoss    * 40 * settings.aggressionWeight
       + vuln      * 30 * settings.aggressionWeight
       + proximity * 20
       + rushBonus
       + noise;
}

// ── Issue movement orders to all units ───────────────────────────────────────
function _issueOrders(player) {
  const brain   = player.brain;
  const myBase  = player.base;
  const myUnits = state.units.filter(u => !u.dead && u.ownerId === player.id);

  for (const unit of myUnits) {
    switch (brain.strategy) {
      case STRATEGY.RUSH:
      case STRATEGY.ATTACK_BASE: {
        // All units march toward the primary target's base
        if (brain.primaryTarget) {
          unit.aiTarget = { x: brain.primaryTarget.base.x, y: brain.primaryTarget.base.y };
        }
        break;
      }

      case STRATEGY.DEFEND: {
        // Rally all units to own base
        unit.aiTarget = { x: myBase.x, y: myBase.y };
        break;
      }

      case STRATEGY.REINFORCE: {
        // Spread toward map centre as a passive advance — avoids units clumping at base
        const cx = (state.W || 800) / 2;
        const cy = (state.H || 600) / 2;
        unit.aiTarget = { x: (myBase.x + cx) / 2, y: (myBase.y + cy) / 2 };
        break;
      }
    }
  }
}

// ── Spatial helpers ───────────────────────────────────────────────────────────
function _countFriendsNearPoint(ownerId, px, py, radius) {
  let count = 0;
  for (const u of state.units) {
    if (u.dead || u.ownerId !== ownerId) continue;
    if (Math.hypot(u.x - px, u.y - py) <= radius) count++;
  }
  return count;
}

function _countEnemiesNearPoint(ownerId, px, py, radius) {
  let count = 0;
  for (const u of state.units) {
    if (u.dead || u.ownerId === ownerId) continue;
    if (!state.players[u.ownerId]?.alive) continue;
    if (Math.hypot(u.x - px, u.y - py) <= radius) count++;
  }
  return count;
}
