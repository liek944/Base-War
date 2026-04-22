import { state } from './gameState.js';
import {
  ABILITY_RADIUS, BURN_DPS, BURN_DURATION, CHAIN_LIGHTNING_RANGE,
  SHIELDWALL_DURATION, SHIELDWALL_REDUCTION,
  VANISH_DURATION, VANISH_MULTIPLIER,
  FIRESTORM_DAMAGE, FIRESTORM_RADIUS,
  TSUNAMI_PUSH, TSUNAMI_SLOW_DURATION, TSUNAMI_SLOW_FACTOR,
  THUNDERSTRIKE_STUN_DURATION,
  BACKSTAB_MULTIPLIER,
  SHIELDWALL_CD, VANISH_CD, FIRESTORM_CD, TSUNAMI_CD, THUNDERSTRIKE_CD,
} from './config.js';
import { spawnProjectile } from './entities.js';

// ── Ability Registry ─────────────────────────────────────────────────────────

export const ABILITIES = {

  // ── PASSIVES ──────────────────────────────────────────────────────────────

  fortify: {
    id: 'fortify',
    type: 'passive',
    description: 'Takes 25% less damage when standing still',
    // Hook: modify incoming damage
    modifyDamageTaken(unit, damage) {
      const isStationary = !unit.targetPos && !unit.aiTarget;
      return isStationary ? damage * 0.75 : damage;
    },
  },

  backstab: {
    id: 'backstab',
    type: 'passive',
    description: 'First hit on a new target deals 2× damage',
    // Hook: modify outgoing damage (called in resolveAttack)
    modifyDamageDealt(attacker, target, baseDmg) {
      const targetId = target.obj.id ?? target.obj;
      if (attacker.lastTargetId !== targetId) {
        attacker.lastTargetId = targetId;
        const mult = attacker.vanishBonus ? VANISH_MULTIPLIER : BACKSTAB_MULTIPLIER;
        attacker.vanishBonus = false;
        return baseDmg * mult;
      }
      return baseDmg;
    },
  },

  ignite: {
    id: 'ignite',
    type: 'passive',
    description: 'Attacks apply burn: 2 dmg/s for 3s',
    // Hook: called after a successful hit
    onHit(attacker, target) {
      if (target.type !== 'unit') return;
      const victim = target.obj;
      // Refresh or apply burn debuff
      const existing = victim.debuffs?.find(d => d.type === 'burn');
      const endFrame = state.frameCount + BURN_DURATION;
      if (existing) {
        existing.endFrame = endFrame;
      } else {
        if (!victim.debuffs) victim.debuffs = [];
        victim.debuffs.push({ type: 'burn', endFrame, dps: BURN_DPS, tickTimer: 0 });
      }
    },
  },

  tidal_mend: {
    id: 'tidal_mend',
    type: 'passive',
    description: 'Heals nearest injured ally 2 HP/s',
    // Hook: called every frame for units with this passive
    onTick(unit) {
      // Heal every 60 frames (1s) by 2 HP
      if (!unit._mendTimer) unit._mendTimer = 0;
      unit._mendTimer++;
      if (unit._mendTimer < 60) return;
      unit._mendTimer = 0;

      // Find nearest injured friendly
      let best = null, bestDist = Infinity;
      for (const u of state.units) {
        if (u.dead || u.ownerId !== unit.ownerId || u === unit) continue;
        if (u.hp >= u.maxHp) continue;
        const d = Math.hypot(u.x - unit.x, u.y - unit.y);
        if (d < bestDist && d < ABILITY_RADIUS) { bestDist = d; best = u; }
      }
      if (best) {
        best.hp = Math.min(best.hp + 2, best.maxHp);
        // Small green projectile to show healing
        spawnProjectile(unit.x, unit.y, best.x, best.y, '#44ff88');
      }
    },
  },

  chain_lightning: {
    id: 'chain_lightning',
    type: 'passive',
    description: 'Attacks jump to 1 nearby enemy for 50% damage',
    // Hook: called after a successful hit
    onHit(attacker, target) {
      const origin = target.obj;
      const ox = origin.x ?? origin.base?.x;
      const oy = origin.y ?? origin.base?.y;
      if (ox == null) return;

      // Find 1 nearby enemy unit (not the original target)
      let best = null, bestDist = Infinity;
      for (const u of state.units) {
        if (u.dead || u.ownerId === attacker.ownerId || u === origin) continue;
        if (!state.players[u.ownerId]?.alive) continue;
        const d = Math.hypot(u.x - ox, u.y - oy);
        if (d < bestDist && d < CHAIN_LIGHTNING_RANGE) { bestDist = d; best = u; }
      }
      if (best) {
        const chainDmg = Math.ceil(attacker.dmg * 0.5);
        best.hp -= chainDmg;
        if (best.hp <= 0) {
          best.dead = true;
          state.players[attacker.ownerId].kills++;
        }
        spawnProjectile(ox, oy, best.x, best.y, '#00ffee');
      }
    },
  },

  // ── ACTIVES ───────────────────────────────────────────────────────────────

  shieldwall: {
    id: 'shieldwall',
    type: 'active',
    cooldown: SHIELDWALL_CD,
    description: 'All nearby allies take 40% less damage for 5s',
    onActivate(player) {
      const champions = state.units.filter(u => !u.dead && u.ownerId === player.id && u.tier === 't3');
      for (const champ of champions) {
        // Apply shieldwall buff to all nearby friendlies
        for (const u of state.units) {
          if (u.dead || u.ownerId !== player.id) continue;
          const d = Math.hypot(u.x - champ.x, u.y - champ.y);
          if (d <= ABILITY_RADIUS) {
            if (!u.debuffs) u.debuffs = [];
            u.debuffs.push({ type: 'shieldwall', endFrame: state.frameCount + SHIELDWALL_DURATION, reduction: SHIELDWALL_REDUCTION });
          }
        }
        // VFX: store ring effect on champion
        if (!state.vfx) state.vfx = [];
        state.vfx.push({ type: 'ring', x: champ.x, y: champ.y, radius: 0, maxRadius: ABILITY_RADIUS, color: '#8899aa', life: 30 });
      }
    },
  },

  vanish: {
    id: 'vanish',
    type: 'active',
    cooldown: VANISH_CD,
    description: 'Champions go invisible for 4s, next attack deals 3×',
    onActivate(player) {
      const champions = state.units.filter(u => !u.dead && u.ownerId === player.id && u.tier === 't3');
      for (const champ of champions) {
        champ.invisible = true;
        champ.vanishBonus = true;
        champ.lastTargetId = null; // reset so backstab triggers on next hit
        if (!champ.debuffs) champ.debuffs = [];
        champ.debuffs.push({ type: 'vanish', endFrame: state.frameCount + VANISH_DURATION });
      }
      if (!state.vfx) state.vfx = [];
      for (const champ of champions) {
        state.vfx.push({ type: 'puff', x: champ.x, y: champ.y, color: '#aa66ff', life: 20 });
      }
    },
  },

  firestorm: {
    id: 'firestorm',
    type: 'active',
    cooldown: FIRESTORM_CD,
    description: 'AoE blast: 15 dmg to all enemies in radius',
    onActivate(player) {
      const champions = state.units.filter(u => !u.dead && u.ownerId === player.id && u.tier === 't3');
      for (const champ of champions) {
        for (const u of state.units) {
          if (u.dead || u.ownerId === player.id) continue;
          if (!state.players[u.ownerId]?.alive) continue;
          const d = Math.hypot(u.x - champ.x, u.y - champ.y);
          if (d <= FIRESTORM_RADIUS) {
            u.hp -= FIRESTORM_DAMAGE;
            if (u.hp <= 0) {
              u.dead = true;
              player.kills++;
            }
          }
        }
        if (!state.vfx) state.vfx = [];
        state.vfx.push({ type: 'ring', x: champ.x, y: champ.y, radius: 0, maxRadius: FIRESTORM_RADIUS, color: '#ff6622', life: 25 });
      }
    },
  },

  tsunami: {
    id: 'tsunami',
    type: 'active',
    cooldown: TSUNAMI_CD,
    description: 'Pushes enemies back and slows them 50% for 3s',
    onActivate(player) {
      const champions = state.units.filter(u => !u.dead && u.ownerId === player.id && u.tier === 't3');
      for (const champ of champions) {
        for (const u of state.units) {
          if (u.dead || u.ownerId === player.id) continue;
          if (!state.players[u.ownerId]?.alive) continue;
          const dx = u.x - champ.x, dy = u.y - champ.y;
          const d = Math.hypot(dx, dy);
          if (d <= ABILITY_RADIUS && d > 0) {
            // Push back
            u.x += (dx / d) * TSUNAMI_PUSH;
            u.y += (dy / d) * TSUNAMI_PUSH;
            // Clamp to canvas
            u.x = Math.max(0, Math.min(state.W, u.x));
            u.y = Math.max(0, Math.min(state.H, u.y));
            // Slow debuff
            if (!u.debuffs) u.debuffs = [];
            u.debuffs.push({ type: 'slow', endFrame: state.frameCount + TSUNAMI_SLOW_DURATION, factor: TSUNAMI_SLOW_FACTOR });
          }
        }
        if (!state.vfx) state.vfx = [];
        state.vfx.push({ type: 'ring', x: champ.x, y: champ.y, radius: 0, maxRadius: ABILITY_RADIUS, color: '#4488ff', life: 30 });
      }
    },
  },

  thunderstrike: {
    id: 'thunderstrike',
    type: 'active',
    cooldown: THUNDERSTRIKE_CD,
    description: 'Stuns all enemies in radius for 2s',
    onActivate(player) {
      const champions = state.units.filter(u => !u.dead && u.ownerId === player.id && u.tier === 't3');
      for (const champ of champions) {
        for (const u of state.units) {
          if (u.dead || u.ownerId === player.id) continue;
          if (!state.players[u.ownerId]?.alive) continue;
          const d = Math.hypot(u.x - champ.x, u.y - champ.y);
          if (d <= ABILITY_RADIUS) {
            if (!u.debuffs) u.debuffs = [];
            u.debuffs.push({ type: 'stun', endFrame: state.frameCount + THUNDERSTRIKE_STUN_DURATION });
          }
        }
        if (!state.vfx) state.vfx = [];
        state.vfx.push({ type: 'ring', x: champ.x, y: champ.y, radius: 0, maxRadius: ABILITY_RADIUS, color: '#ffee00', life: 20 });
      }
    },
  },

};

// ── Debuff Tick — called once per frame for all units ─────────────────────────
export function tickDebuffs() {
  for (const u of state.units) {
    if (u.dead || !u.debuffs || u.debuffs.length === 0) continue;

    for (let i = u.debuffs.length - 1; i >= 0; i--) {
      const d = u.debuffs[i];

      // Expired?
      if (state.frameCount >= d.endFrame) {
        // Clean up on removal
        if (d.type === 'vanish') {
          u.invisible = false;
        }
        u.debuffs.splice(i, 1);
        continue;
      }

      // Burn tick: deal damage every 60 frames
      if (d.type === 'burn') {
        d.tickTimer = (d.tickTimer || 0) + 1;
        if (d.tickTimer >= 60) {
          d.tickTimer = 0;
          u.hp -= d.dps;
          if (u.hp <= 0) u.dead = true;
        }
      }
    }
  }
}

// ── Passive Tick — called once per frame for units with passives ──────────────
export function tickPassives() {
  for (const u of state.units) {
    if (u.dead || !u.passive) continue;
    const ability = ABILITIES[u.passive];
    if (ability?.onTick) ability.onTick(u);
  }
}

// ── VFX Tick — animate visual effects ────────────────────────────────────────
export function tickVFX() {
  if (!state.vfx) return;
  for (let i = state.vfx.length - 1; i >= 0; i--) {
    const v = state.vfx[i];
    v.life--;
    if (v.type === 'ring') {
      v.radius += (v.maxRadius - v.radius) * 0.15;
    }
    if (v.life <= 0) state.vfx.splice(i, 1);
  }
}

// ── Check if a unit is stunned ───────────────────────────────────────────────
export function isStunned(unit) {
  return unit.debuffs?.some(d => d.type === 'stun') ?? false;
}

// ── Get slow factor (1.0 = no slow, 0.5 = half speed) ───────────────────────
export function getSlowFactor(unit) {
  if (!unit.debuffs) return 1;
  let factor = 1;
  for (const d of unit.debuffs) {
    if (d.type === 'slow') factor = Math.min(factor, d.factor);
  }
  return factor;
}

// ── Get damage reduction from buffs ──────────────────────────────────────────
export function getDamageReduction(unit) {
  if (!unit.debuffs) return 0;
  let reduction = 0;
  for (const d of unit.debuffs) {
    if (d.type === 'shieldwall') reduction = Math.max(reduction, d.reduction);
  }
  return reduction;
}

// ── Apply passive damage modifications ───────────────────────────────────────
export function applyPassiveDamageTaken(unit, damage) {
  let dmg = damage;
  if (unit.passive) {
    const ability = ABILITIES[unit.passive];
    if (ability?.modifyDamageTaken) {
      dmg = ability.modifyDamageTaken(unit, dmg);
    }
  }
  // Shieldwall buff
  const reduction = getDamageReduction(unit);
  if (reduction > 0) dmg *= (1 - reduction);
  return Math.round(dmg);
}

export function applyPassiveDamageDealt(attacker, target, baseDmg) {
  let dmg = baseDmg;
  if (attacker.passive) {
    const ability = ABILITIES[attacker.passive];
    if (ability?.modifyDamageDealt) {
      dmg = ability.modifyDamageDealt(attacker, target, dmg);
    }
  }
  return Math.round(dmg);
}

export function applyOnHit(attacker, target) {
  if (attacker.passive) {
    const ability = ABILITIES[attacker.passive];
    if (ability?.onHit) ability.onHit(attacker, target);
  }
}

// ── Activate an active ability for a player ──────────────────────────────────
export function activateAbility(player) {
  if (!player.alive || !player.clanId) return false;
  if (player.abilityCooldown > 0) return false;

  // Find the active ability from the clan's T3 unit
  const clan = getClan(player.clanId);
  if (!clan) return false;
  const activeId = clan.units.t3.active;
  if (!activeId) return false;

  // Must have at least one living T3 unit
  const hasChampion = state.units.some(u => !u.dead && u.ownerId === player.id && u.tier === 't3');
  if (!hasChampion) return false;

  const ability = ABILITIES[activeId];
  if (!ability?.onActivate) return false;

  ability.onActivate(player);
  player.abilityCooldown = ability.cooldown;
  return true;
}

// Internal helper — avoids circular import by importing inline
function getClan(clanId) {
  // Lazy import to avoid circular dependency with clans.js
  // clans.js doesn't import abilities.js, so we can safely import it here
  return _clanCache[clanId] ?? null;
}

// Populated at module init
import { CLANS } from './clans.js';
const _clanCache = CLANS;
