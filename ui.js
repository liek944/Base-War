import { state, areAllied } from './gameState.js';
import { CLANS, CLAN_LIST, getClanUnit } from './clans.js';
import { buyUnit } from './economy.js';
import { activateAbility, ABILITIES } from './abilities.js';

let logCount = 0;

export function buildPlayerCards() {
  const container = document.getElementById('player-cards');
  container.innerHTML = '';
  for (const p of state.players) {
    const clan = CLANS[p.clanId];
    const clanLabel = clan ? `${clan.icon} ${clan.name}` : '';
    const div = document.createElement('div');
    div.className = `player-card alive${p.isHuman ? ' current' : ''}`;
    div.id = `pcard-${p.id}`;
    div.style.setProperty('--player-color', p.color);
    div.innerHTML = `
      <div class="player-name">${p.isHuman ? '★ ' : ''} ${p.name}</div>
      <div class="player-clan-label">${clanLabel}</div>
      <div class="player-stats">
        HP: <span id="php-${p.id}">${p.base.hp}</span> / ${p.base.maxHp}<br>
        Kills: <span id="pkills-${p.id}">0</span>
        ${p.isHuman ? '<br><small style="color:#ffcc0066">YOU (★)</small>' : ''}
        <span id="pally-${p.id}" style="display:none;color:#44ff88;font-size:10px"> [ALLY]</span>
      </div>
    `;
    container.appendChild(div);
  }
}

export function updatePlayerCards() {
  const humanPlayer = state.players.find(p => p.isHuman);
  for (const p of state.players) {
    const card = document.getElementById(`pcard-${p.id}`);
    if (!card) continue;
    card.className = `player-card ${p.alive ? 'alive' : 'dead'}${p.isHuman ? ' current' : ''}`;
    card.style.setProperty('--player-color', p.color);
    const hpEl   = document.getElementById(`php-${p.id}`);
    const kEl    = document.getElementById(`pkills-${p.id}`);
    const allyEl = document.getElementById(`pally-${p.id}`);
    if (hpEl) hpEl.textContent = Math.max(0, p.base.hp);
    if (kEl)  kEl.textContent  = p.kills;
    // Show [ALLY] badge when allied with the human player
    if (allyEl && humanPlayer && !p.isHuman) {
      allyEl.style.display = areAllied(humanPlayer.id, p.id) ? 'inline' : 'none';
    }
  }
}

// ── Action Panel (buy units + ability button + gold display) ─────────────────

export function buildActionPanel() {
  const panel = document.getElementById('action-panel');
  if (!panel) return;

  const human = state.players.find(p => p.isHuman);
  if (!human) return;

  const clan = CLANS[human.clanId];
  if (!clan) return;

  const t2 = clan.units.t2;
  const t3 = clan.units.t3;
  const activeAbility = t3.active ? ABILITIES[t3.active] : null;

  panel.innerHTML = `
    <div class="action-panel-inner">
      <div class="gold-display" id="gold-display">
        <span class="gold-icon">💰</span>
        <span class="gold-amount" id="gold-amount">0</span>
      </div>

      <div class="buy-section">
        <button class="buy-btn" id="btn-buy-t2" title="Hotkey: 1">
          <span class="buy-hotkey">1</span>
          <span class="buy-name">${t2.name}</span>
          <span class="buy-cost">${t2.cost}g</span>
        </button>
        <button class="buy-btn buy-btn-t3" id="btn-buy-t3" title="Hotkey: 2">
          <span class="buy-hotkey">2</span>
          <span class="buy-name">${t3.name}</span>
          <span class="buy-cost">${t3.cost}g</span>
        </button>
      </div>

      ${activeAbility ? `
      <div class="ability-section">
        <button class="ability-btn" id="btn-ability" title="Hotkey: Q">
          <span class="ability-hotkey">Q</span>
          <span class="ability-name">${activeAbility.id.toUpperCase().replace('_', ' ')}</span>
          <span class="ability-desc">${activeAbility.description}</span>
          <span class="ability-cd" id="ability-cd"></span>
        </button>
      </div>
      ` : ''}
    </div>
  `;

  // Wire up buttons
  document.getElementById('btn-buy-t2')?.addEventListener('click', () => {
    buyUnit(human, 't2');
  });
  document.getElementById('btn-buy-t3')?.addEventListener('click', () => {
    buyUnit(human, 't3');
  });
  document.getElementById('btn-ability')?.addEventListener('click', () => {
    activateAbility(human);
  });
}

export function updateActionPanel() {
  const human = state.players.find(p => p.isHuman);
  if (!human) return;

  // Update gold
  const goldEl = document.getElementById('gold-amount');
  if (goldEl) goldEl.textContent = human.gold;

  // Update buy button states
  const clan = CLANS[human.clanId];
  if (!clan) return;

  const btnT2 = document.getElementById('btn-buy-t2');
  const btnT3 = document.getElementById('btn-buy-t3');
  if (btnT2) btnT2.classList.toggle('disabled', human.gold < clan.units.t2.cost);
  if (btnT3) btnT3.classList.toggle('disabled', human.gold < clan.units.t3.cost);

  // Update ability button
  const btnAbility = document.getElementById('btn-ability');
  const cdEl       = document.getElementById('ability-cd');
  if (btnAbility) {
    const onCooldown = human.abilityCooldown > 0;
    const hasChampion = state.units.some(u => !u.dead && u.ownerId === human.id && u.tier === 't3');
    btnAbility.classList.toggle('disabled', onCooldown || !hasChampion);
    btnAbility.classList.toggle('on-cooldown', onCooldown);

    if (cdEl) {
      if (onCooldown) {
        cdEl.textContent = `${Math.ceil(human.abilityCooldown / 60)}s`;
      } else if (!hasChampion) {
        cdEl.textContent = 'Need Champion';
      } else {
        cdEl.textContent = 'READY';
      }
    }
  }
}

// ── Combat Log ──────────────────────────────────────────────────────────────

export function addLog(msg, type = '') {
  logCount++;
  const el  = document.getElementById('log-entries');
  const div = document.createElement('div');
  div.className = `log-entry ${type}`;
  div.textContent = msg;
  el.appendChild(div);
  if (el.children.length > 30) el.removeChild(el.children[0]);
  el.scrollTop = el.scrollHeight;
}

export function flashRound(text) {
  const f = document.getElementById('round-flash');
  document.getElementById('flash-text').textContent = text;
  f.classList.add('show');
  setTimeout(() => f.classList.remove('show'), 1200);
}

// ── Menu / Overlays ─────────────────────────────────────────────────────────

export function showMenu() {
  // Build clan picker HTML
  let clanCards = '';
  for (const id of CLAN_LIST) {
    const c = CLANS[id];
    const t1 = c.units.t1, t2 = c.units.t2, t3 = c.units.t3;
    clanCards += `
      <div class="clan-card" data-clan="${id}">
        <div class="clan-card-icon">${c.icon}</div>
        <div class="clan-card-name">${c.name}</div>
        <div class="clan-card-theme">${c.theme}</div>
        <div class="clan-card-units">
          <span>${t1.name}</span> · <span>${t2.name}</span> · <span>${t3.name}</span>
        </div>
      </div>
    `;
  }

  document.getElementById('overlay-box').innerHTML = `
    <h1>BASE WARS</h1>
    <div class="sub">TACTICAL AUTO-BATTLER</div>
    <p>
      Each player's <strong>base</strong> automatically spawns units every few seconds.<br>
      <strong>Click/tap</strong> on the map to move your units (RED ★).<br>
      Destroy an enemy base <strong>OR</strong> have the most kills after <strong>10 rounds</strong> to win.
    </p>
    <div class="num-players-row">
      <label>PLAYERS</label>
      <select class="num-select" id="num-players-select">
        <option value="6">6</option>
        <option value="7" selected>7</option>
      </select>
    </div>
    <div class="num-players-row">
      <label>DIFFICULTY</label>
      <select class="num-select" id="difficulty-select">
        <option value="easy">Easy</option>
        <option value="medium" selected>Medium</option>
        <option value="hard">Hard</option>
      </select>
    </div>
    <div class="clan-section">
      <label class="clan-section-title">CHOOSE YOUR CLAN</label>
      <div class="clan-grid" id="clan-grid">
        ${clanCards}
      </div>
      <select id="clan-select" class="hidden-select">
        ${CLAN_LIST.map(id => `<option value="${id}">${CLANS[id].name}</option>`).join('')}
      </select>
    </div>
    <button class="btn-primary disabled" id="btn-deploy">DEPLOY</button>
  `;
  state.gameRunning = false;
  document.getElementById('overlay').classList.remove('hidden');

  // Clan card click → select
  const grid = document.getElementById('clan-grid');
  const select = document.getElementById('clan-select');
  const deployBtn = document.getElementById('btn-deploy');

  grid.addEventListener('click', (e) => {
    const card = e.target.closest('.clan-card');
    if (!card) return;
    // Deselect all
    grid.querySelectorAll('.clan-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    select.value = card.dataset.clan;
    deployBtn.classList.remove('disabled');
  });

  // Select first clan by default
  const firstCard = grid.querySelector('.clan-card');
  if (firstCard) {
    firstCard.classList.add('selected');
    select.value = firstCard.dataset.clan;
    deployBtn.classList.remove('disabled');
  }

  // Re-attach startGame since the DOM was re-built
  deployBtn.addEventListener('click', () => {
    if (deployBtn.classList.contains('disabled')) return;
    import('./engine.js').then(m => m.startGame());
  });
}

export function showResult(winner, reason) {
  state.gameRunning = false;
  const box   = document.getElementById('overlay-box');
  const clanInfo = CLANS[winner.clanId];
  const clanLabel = clanInfo ? `${clanInfo.icon} ${clanInfo.name}` : '';
  const kills  = state.players
    .map(p => {
      const ci = CLANS[p.clanId];
      const icon = ci ? ci.icon : '';
      return `<div style="color:${p.color};font-size:11px">${icon} ${p.name}: ${p.kills} kills</div>`;
    })
    .join('');
  box.innerHTML = `
    <h1>GAME OVER</h1>
    <div class="winner-name" style="color:${winner.color}">${winner.name} WINS</div>
    <div class="winner-clan">${clanLabel}</div>
    <div class="winner-reason">${reason}</div>
    <div style="margin-bottom:20px;line-height:1.8">${kills}</div>
    <button class="btn-primary" id="btn-menu">BACK TO MENU</button>
  `;
  document.getElementById('overlay').classList.remove('hidden');
  document.getElementById('btn-menu').addEventListener('click', showMenu);
}
