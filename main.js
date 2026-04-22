import { state } from './gameState.js';
import { setupInput } from './input.js';
import { showMenu } from './ui.js';
import { startGame } from './engine.js';

// ── Bootstrap: called once the DOM is ready ──
function init() {
  state.canvas = document.getElementById('game-canvas');
  state.ctx    = state.canvas.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  setupInput();

  // Wire up the HUD menu button (no inline onclick in HTML)
  document.getElementById('btn-start').addEventListener('click', showMenu);

  // Wire up the initial deploy button in the default overlay HTML
  document.getElementById('btn-deploy').addEventListener('click', showMenu);
}

function resizeCanvas() {
  const wrapper = document.getElementById('canvas-wrapper');
  state.W = state.canvas.width  = wrapper.clientWidth;
  state.H = state.canvas.height = wrapper.clientHeight;
}

window.addEventListener('load', init);
