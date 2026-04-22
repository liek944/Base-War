import { state } from './gameState.js';
import {
  GOLD_PER_KILL, GOLD_PER_BASE_KILL, GOLD_PER_ROUND_START,
  GOLD_PASSIVE_INTERVAL, GOLD_PASSIVE_AMOUNT, GOLD_START,
} from './config.js';
import { addLog } from './ui.js';
import { getClanUnit } from './clans.js';
import { spawnUnit } from './entities.js';

// ── Init economy on a player ────────────────────────────────────────────────
export function initEconomy(player) {
  player.gold = GOLD_START;
  player.abilityCooldown = 0;
  player._goldTimer = 0;
}

// ── Award gold ──────────────────────────────────────────────────────────────
export function awardGold(player, amount, reason) {
  player.gold += amount;
  if (player.isHuman && reason) {
    addLog(`+${amount}g ${reason}`, 'gold');
  }
}

// ── Award gold for a kill ───────────────────────────────────────────────────
export function awardKillGold(player) {
  awardGold(player, GOLD_PER_KILL, '(kill)');
}

export function awardBaseKillGold(player) {
  awardGold(player, GOLD_PER_BASE_KILL, '(base destroyed)');
}

export function awardRoundGold() {
  for (const p of state.players) {
    if (!p.alive) continue;
    awardGold(p, GOLD_PER_ROUND_START, '(round start)');
  }
}

// ── Passive income tick (called every frame) ────────────────────────────────
export function tickPassiveIncome() {
  for (const p of state.players) {
    if (!p.alive) continue;
    p._goldTimer = (p._goldTimer || 0) + 1;
    if (p._goldTimer >= GOLD_PASSIVE_INTERVAL) {
      p._goldTimer = 0;
      awardGold(p, GOLD_PASSIVE_AMOUNT, '');
    }
  }
}

// ── Ability cooldown tick (called every frame) ──────────────────────────────
export function tickCooldowns() {
  for (const p of state.players) {
    if (!p.alive) continue;
    if (p.abilityCooldown > 0) p.abilityCooldown--;
  }
}

// ── Can afford check ────────────────────────────────────────────────────────
export function canAfford(player, cost) {
  return player.gold >= cost;
}

// ── Buy a unit (T2 or T3) ──────────────────────────────────────────────────
export function buyUnit(player, tier) {
  if (!player.alive || !player.clanId) return false;
  const template = getClanUnit(player.clanId, tier);
  if (!template) return false;
  if (!canAfford(player, template.cost)) return false;

  player.gold -= template.cost;
  spawnUnit(player, tier);

  if (player.isHuman) {
    addLog(`Bought ${template.name} (-${template.cost}g)`, 'gold');
  }
  return true;
}
