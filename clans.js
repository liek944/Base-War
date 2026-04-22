// ── Clan Definitions ─────────────────────────────────────────────────────────
// Each clan has 3 unit tiers: t1 (free auto-spawn), t2 (buy), t3 (buy, expensive)
// shape: 'circle' | 'diamond' | 'hexagon'

export const CLANS = {

  ironclad: {
    id:    'ironclad',
    name:  'IRONCLAD',
    theme: 'Heavy Armor / Siege',
    icon:  '🛡️',
    units: {
      t1: { name: 'Sentinel',   hp: 40,  dmg: 3,  speed: 0.9,  range: 16, cost: 0,   radius: 5,  shape: 'circle',  passive: null,      active: null },
      t2: { name: 'Vanguard',   hp: 65,  dmg: 5,  speed: 0.8,  range: 16, cost: 50,  radius: 7,  shape: 'diamond', passive: 'fortify',  active: null },
      t3: { name: 'Juggernaut', hp: 120, dmg: 8,  speed: 0.7,  range: 20, cost: 150, radius: 10, shape: 'hexagon', passive: 'fortify',  active: 'shieldwall' },
    },
  },

  shadowfang: {
    id:    'shadowfang',
    name:  'SHADOWFANG',
    theme: 'Stealth / Assassins',
    icon:  '🗡️',
    units: {
      t1: { name: 'Scout',    hp: 20,  dmg: 5,  speed: 1.8,  range: 20, cost: 0,   radius: 5,  shape: 'circle',  passive: null,       active: null },
      t2: { name: 'Assassin', hp: 30,  dmg: 8,  speed: 1.8,  range: 22, cost: 50,  radius: 7,  shape: 'diamond', passive: 'backstab',  active: null },
      t3: { name: 'Phantom',  hp: 45,  dmg: 12, speed: 2.0,  range: 24, cost: 150, radius: 10, shape: 'hexagon', passive: 'backstab',  active: 'vanish' },
    },
  },

  emberforge: {
    id:    'emberforge',
    name:  'EMBERFORGE',
    theme: 'Fire / Explosions',
    icon:  '🔥',
    units: {
      t1: { name: 'Firebrand',  hp: 25,  dmg: 4,  speed: 1.2,  range: 18, cost: 0,   radius: 5,  shape: 'circle',  passive: null,     active: null },
      t2: { name: 'Pyromancer', hp: 35,  dmg: 6,  speed: 1.1,  range: 22, cost: 50,  radius: 7,  shape: 'diamond', passive: 'ignite',  active: null },
      t3: { name: 'Infernal',   hp: 55,  dmg: 10, speed: 1.0,  range: 26, cost: 150, radius: 10, shape: 'hexagon', passive: 'ignite',  active: 'firestorm' },
    },
  },

  tidecaller: {
    id:    'tidecaller',
    name:  'TIDECALLER',
    theme: 'Water / Healing',
    icon:  '🌊',
    units: {
      t1: { name: 'Tideguard',  hp: 30,  dmg: 3,  speed: 1.1,  range: 16, cost: 0,   radius: 5,  shape: 'circle',  passive: null,         active: null },
      t2: { name: 'Wavepriest', hp: 40,  dmg: 4,  speed: 1.0,  range: 18, cost: 50,  radius: 7,  shape: 'diamond', passive: 'tidal_mend',  active: null },
      t3: { name: 'Leviathan',  hp: 70,  dmg: 7,  speed: 0.9,  range: 20, cost: 150, radius: 10, shape: 'hexagon', passive: 'tidal_mend',  active: 'tsunami' },
    },
  },

  stormborn: {
    id:    'stormborn',
    name:  'STORMBORN',
    theme: 'Lightning / Speed',
    icon:  '⚡',
    units: {
      t1: { name: 'Sparker',  hp: 22,  dmg: 4,  speed: 1.5,  range: 18, cost: 0,   radius: 5,  shape: 'circle',  passive: null,              active: null },
      t2: { name: 'Conduit',  hp: 35,  dmg: 6,  speed: 1.5,  range: 20, cost: 50,  radius: 7,  shape: 'diamond', passive: 'chain_lightning',  active: null },
      t3: { name: 'Tempest',  hp: 50,  dmg: 9,  speed: 1.6,  range: 24, cost: 150, radius: 10, shape: 'hexagon', passive: 'chain_lightning',  active: 'thunderstrike' },
    },
  },

};

// All clan IDs for random selection
export const CLAN_LIST = Object.keys(CLANS);

// Convenience: look up a specific tier's unit template
export function getClanUnit(clanId, tier) {
  return CLANS[clanId]?.units[tier] ?? null;
}
