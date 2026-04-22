export const state = {
  canvas: null,
  ctx: null,
  W: 0,
  H: 0,
  players: [],
  units: [],
  projectiles: [],
  round: 0,
  frameCount: 0,
  roundTimer: 0,
  gameRunning: false,
  gameOver: false,
  selectedUnits: [],
  mouseDown: false,
  mouseStart: {x:0, y:0},
  mouseCurrent: {x:0, y:0},
  animId: null,
  alliances: new Set(), // stores "idA-idB" strings (sorted), e.g. "0-2"
};

// ── Alliance helpers ─────────────────────────────────────────────────────────
function allianceKey(a, b) { return a < b ? `${a}-${b}` : `${b}-${a}`; }

export function addAlliance(idA, idB)    { state.alliances.add(allianceKey(idA, idB)); }
export function removeAlliance(idA, idB) { state.alliances.delete(allianceKey(idA, idB)); }
export function areAllied(idA, idB)      { return state.alliances.has(allianceKey(idA, idB)); }

