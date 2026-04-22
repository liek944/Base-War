export const PLAYER_COLORS = ['#ff4455','#44aaff','#44ff88','#ffcc00','#ff8800','#cc44ff','#00ffee'];
export const PLAYER_NAMES  = ['RED','BLUE','GREEN','GOLD','ORANGE','VIOLET','CYAN'];

export const UNIT_RADIUS   = 5;
export const BASE_RADIUS   = 18;
export const UNIT_SPEED    = 1.2;
export const UNIT_HP       = 30;
export const BASE_HP       = 200;
export const ATTACK_RANGE  = 18;
export const ATTACK_DMG    = 4;
export const ATTACK_CD     = 40;   // frames between attacks
export const SPAWN_INTERVAL= 180;  // frames between spawns (~3s at 60fps)
export const ROUND_DURATION= 1800; // frames per round (~30s)

// ── Gold Economy ────────────────────────────────────────────────────────────
export const GOLD_START           = 0;
export const GOLD_PER_KILL        = 5;
export const GOLD_PER_BASE_KILL   = 50;
export const GOLD_PER_ROUND_START = 10;
export const GOLD_PASSIVE_INTERVAL= 300;  // frames (~5s at 60fps)
export const GOLD_PASSIVE_AMOUNT  = 2;

// ── Ability Constants ───────────────────────────────────────────────────────
export const ABILITY_RADIUS       = 60;   // generic ability effect radius

// Fortify (passive — no constants needed, hardcoded 0.75)

// Backstab
export const BACKSTAB_MULTIPLIER  = 2;

// Ignite
export const BURN_DPS             = 2;
export const BURN_DURATION        = 180;  // frames = 3s

// Chain Lightning
export const CHAIN_LIGHTNING_RANGE= 40;

// Shieldwall (active)
export const SHIELDWALL_CD        = 1200; // frames = 20s
export const SHIELDWALL_DURATION  = 300;  // frames = 5s
export const SHIELDWALL_REDUCTION = 0.4;

// Vanish (active)
export const VANISH_CD            = 1080; // frames = 18s
export const VANISH_DURATION      = 240;  // frames = 4s
export const VANISH_MULTIPLIER    = 3;

// Firestorm (active)
export const FIRESTORM_CD         = 900;  // frames = 15s
export const FIRESTORM_DAMAGE     = 15;
export const FIRESTORM_RADIUS     = 50;

// Tsunami (active)
export const TSUNAMI_CD           = 1200; // frames = 20s
export const TSUNAMI_PUSH         = 40;
export const TSUNAMI_SLOW_DURATION= 180;  // frames = 3s
export const TSUNAMI_SLOW_FACTOR  = 0.5;

// Thunderstrike (active)
export const THUNDERSTRIKE_CD     = 960;  // frames = 16s
export const THUNDERSTRIKE_STUN_DURATION = 120; // frames = 2s

// ── Unit Tier Sizes ─────────────────────────────────────────────────────────
export const UNIT_SIZE_T1 = 5;
export const UNIT_SIZE_T2 = 7;
export const UNIT_SIZE_T3 = 10;

// ── AI Brain Constants ──────────────────────────────────────────────────────
export const AI_DEFEND_THRESHOLD  = 3;    // friendly units near own base before bot feels safe
export const AI_THREAT_RADIUS     = 130;  // enemy units within this px of own base triggers defend
export const AI_RUSH_HP_PERCENT   = 0.30; // own base HP below this fraction → rush mode
export const AI_RUSH_TIME_REMAINING = 300; // frames left in round that triggers rush

// Difficulty tiers — all weight/timing knobs in one place, no logic changes needed to rebalance
export const AI_DIFFICULTY_SETTINGS = {
  easy: {
    decisionInterval: 120, // re-evaluates every ~2s
    aggressionWeight: 0.5, // scales how much low-HP targets are preferred
    defenseWeight:    0.5, // scales how strongly the bot defends its base
    rushBonus:        0,   // no extra score during rush conditions
    noiseAmount:      18,  // random noise added to scores (makes easy bots feel dumb)
  },
  medium: {
    decisionInterval: 60,  // re-evaluates every ~1s
    aggressionWeight: 1.0,
    defenseWeight:    1.0,
    rushBonus:        5,
    noiseAmount:      6,
  },
  hard: {
    decisionInterval: 25,  // re-evaluates every ~0.4s — very reactive
    aggressionWeight: 1.6,
    defenseWeight:    1.3,
    rushBonus:        15,
    noiseAmount:      0,   // no noise — hard bots always pick the optimal target
  },
};
