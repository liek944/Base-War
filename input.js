import { state } from './gameState.js';
import { buyUnit } from './economy.js';
import { activateAbility } from './abilities.js';

export function setupInput() {
  state.canvas.addEventListener('mousedown', onMouseDown);
  state.canvas.addEventListener('mousemove', onMouseMove);
  state.canvas.addEventListener('mouseup',   onMouseUp);
  state.canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  state.canvas.addEventListener('touchend',   onTouchEnd,   { passive: false });

  // Keyboard hotkeys for buying units and activating abilities
  window.addEventListener('keydown', onKeyDown);
}

function getPos(e) {
  const r = state.canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function onMouseDown(e) {
  if (!state.gameRunning || state.gameOver) return;
  const pos = getPos(e);
  state.mouseDown    = true;
  state.mouseStart   = pos;
  state.mouseCurrent = pos;
}

function onMouseMove(e) {
  if (!state.mouseDown) return;
  state.mouseCurrent = getPos(e);
}

function onMouseUp(e) {
  if (!state.mouseDown) return;
  state.mouseDown = false;
  const pos = getPos(e);

  const sel = state.units.filter(u => !u.dead && u.ownerId === 0);
  sel.forEach((u, i) => {
    const angle  = (2 * Math.PI / Math.max(sel.length, 1)) * i;
    const spread = Math.min(sel.length * 3, 20);
    u.targetPos = {
      x: pos.x + (sel.length > 1 ? Math.cos(angle) * spread : 0),
      y: pos.y + (sel.length > 1 ? Math.sin(angle) * spread : 0)
    };
  });
}

function onTouchStart(e) {
  e.preventDefault();
  const t = e.touches[0];
  onMouseDown({ clientX: t.clientX, clientY: t.clientY });
}

function onTouchEnd(e) {
  e.preventDefault();
  const t = e.changedTouches[0];
  onMouseUp({ clientX: t.clientX, clientY: t.clientY, shiftKey: false });
}

function onKeyDown(e) {
  if (!state.gameRunning || state.gameOver) return;

  const human = state.players.find(p => p.isHuman);
  if (!human) return;

  switch (e.key) {
    case '1':
      buyUnit(human, 't2');
      break;
    case '2':
      buyUnit(human, 't3');
      break;
    case 'q':
    case 'Q':
      activateAbility(human);
      break;
  }
}
