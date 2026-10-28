// ============================================================================
// NEONBLAST.IO - Heads-Up Display & UI Controller
// ============================================================================

import { CONFIG } from '../config.js';
import { sound } from '../audio.js';

export class HUD {
  constructor(game) {
    this.game = game;

    // UI DOM Elements
    this.statContainer = document.getElementById('stat-upgrades');
    this.statPointsBadge = document.getElementById('stat-points-badge');
    this.evolutionContainer = document.getElementById('evolution-container');
    this.leaderboardList = document.getElementById('leaderboard-list');
    this.killFeedContainer = document.getElementById('kill-feed');
    this.levelBadge = document.getElementById('hud-level');
    this.scoreBadge = document.getElementById('hud-score');
    this.xpFill = document.getElementById('xp-fill');
    this.classTitle = document.getElementById('hud-class-name');

    // Minimap Canvas
    this.minimapCanvas = document.getElementById('minimap-canvas');
    this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;

    this.killMessages = [];
    this.initStatUpgradeUI();
  }

  initStatUpgradeUI() {
    if (!this.statContainer) return;
    this.statContainer.innerHTML = '';

    CONFIG.UPGRADES.forEach((up, index) => {
      const row = document.createElement('div');
      row.className = 'stat-row';
      row.id = `stat-row-${up.id}`;

      row.innerHTML = `
        <div class="stat-key">[${up.key}]</div>
        <div class="stat-name">${up.icon} ${up.name}</div>
        <div class="stat-bar-container">
          <div class="stat-segments" id="segments-${up.id}">
            ${Array.from({ length: CONFIG.LEVELS.MAX_STAT_LEVEL }, (_, i) => `<div class="stat-segment" id="seg-${up.id}-${i}"></div>`).join('')}
          </div>
        </div>
        <button class="stat-plus-btn" id="btn-up-${up.id}" title="Upgrade ${up.name} (Key ${up.key})">+</button>
      `;

      const btn = row.querySelector(`#btn-up-${up.id}`);
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.game.requestUpgrade(up.id);
      });

      this.statContainer.appendChild(row);
    });
  }

  update(player, leaderboardData) {
    if (!player) return;

    // 1. Level & XP bar
    if (this.levelBadge) this.levelBadge.textContent = `Lv. ${player.level}`;
    if (this.scoreBadge) this.scoreBadge.textContent = `Score: ${Math.floor(player.score).toLocaleString()}`;
    if (this.classTitle) this.classTitle.textContent = player.classDef.name.toUpperCase();

    if (this.xpFill) {
      const xpNeeded = player.getXpNeeded();
      const pct = Math.max(0, Math.min(100, (player.xp / xpNeeded) * 100));
      this.xpFill.style.width = `${pct}%`;
    }

    // 2. Stat Points & Upgrade Rows
    if (this.statPointsBadge) {
      if (player.statPoints > 0) {
        this.statPointsBadge.style.display = 'block';
        this.statPointsBadge.textContent = `+${player.statPoints} STAT POINT${player.statPoints > 1 ? 'S' : ''}`;
        this.statContainer.classList.add('has-points');
      } else {
        this.statPointsBadge.style.display = 'none';
        this.statContainer.classList.remove('has-points');
      }
    }

    // Update stat segments fill
    CONFIG.UPGRADES.forEach(up => {
      const currentVal = player.stats[up.id] || 0;
      const btn = document.getElementById(`btn-up-${up.id}`);
      if (btn) {
        btn.disabled = player.statPoints <= 0 || currentVal >= CONFIG.LEVELS.MAX_STAT_LEVEL;
      }

      for (let i = 0; i < CONFIG.LEVELS.MAX_STAT_LEVEL; i++) {
        const seg = document.getElementById(`seg-${up.id}-${i}`);
        if (seg) {
          if (i < currentVal) {
            seg.style.background = up.color;
            seg.style.boxShadow = `0 0 6px ${up.color}`;
          } else {
            seg.style.background = 'rgba(255, 255, 255, 0.1)';
            seg.style.boxShadow = 'none';
          }
        }
      }
    });

    // 3. Class Evolutions
    this.updateEvolutions(player);

    // 4. Leaderboard
    this.updateLeaderboard(leaderboardData, player.id);

    // 5. Kill Feed expiry
    this.updateKillFeed();

    // 6. Minimap
    this.renderMinimap(player);
  }

  updateEvolutions(player) {
    if (!this.evolutionContainer) return;

    const available = player.getAvailableEvolutions();
    if (available.length === 0) {
      this.evolutionContainer.style.display = 'none';
      return;
    }

    this.evolutionContainer.style.display = 'flex';
    // Only re-render if choices changed
    const currentKeys = this.evolutionContainer.getAttribute('data-evol-keys') || '';
    const newKeys = available.map(e => e.key).join(',');

    if (currentKeys !== newKeys) {
      this.evolutionContainer.setAttribute('data-evol-keys', newKeys);
      this.evolutionContainer.innerHTML = '';

      available.forEach(item => {
        const card = document.createElement('div');
        card.className = 'evolution-card';
        card.innerHTML = `
          <div class="evol-name">${item.def.name}</div>
          <div class="evol-desc">${item.def.description}</div>
          <button class="evol-select-btn">EVOLVE</button>
        `;

        card.addEventListener('click', () => {
          this.game.requestEvolve(item.key);
        });

        this.evolutionContainer.appendChild(card);
      });
    }
  }

  updateLeaderboard(leaderboardData, localPlayerId) {
    if (!this.leaderboardList || !leaderboardData) return;

    this.leaderboardList.innerHTML = leaderboardData.slice(0, 10).map((entry, idx) => {
      const isMe = entry.id === localPlayerId;
      return `
        <div class="leaderboard-entry ${isMe ? 'is-local' : ''}">
          <span class="rank">#${idx + 1}</span>
          <span class="name">${entry.name}</span>
          <span class="score">${Math.floor(entry.score).toLocaleString()}</span>
        </div>
      `;
    }).join('');
  }

  addKillMessage(killerName, victimName) {
    const msg = {
      id: Math.random(),
      text: `${killerName} disintegrated ${victimName}`,
      time: Date.now()
    };
    this.killMessages.unshift(msg);
    if (this.killMessages.length > 5) {
      this.killMessages.pop();
    }
    this.renderKillFeedDOM();
  }

  updateKillFeed() {
    const now = Date.now();
    const oldLen = this.killMessages.length;
    this.killMessages = this.killMessages.filter(m => now - m.time < 5000);
    if (this.killMessages.length !== oldLen) {
      this.renderKillFeedDOM();
    }
  }

  renderKillFeedDOM() {
    if (!this.killFeedContainer) return;
    this.killFeedContainer.innerHTML = this.killMessages.map(m => `
      <div class="kill-item">${m.text}</div>
    `).join('');
  }

  renderMinimap(localPlayer) {
    if (!this.minimapCtx || !this.minimapCanvas) return;
    const ctx = this.minimapCtx;
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;

    ctx.clearRect(0, 0, w, h);

    const scaleX = w / CONFIG.ARENA.WIDTH;
    const scaleY = h / CONFIG.ARENA.HEIGHT;

    // Minimap background grid & nest
    ctx.fillStyle = 'rgba(11, 15, 25, 0.85)';
    ctx.fillRect(0, 0, w, h);

    // Center nest zone
    const nestRadius = CONFIG.ARENA.SAFE_ZONE_RADIUS * scaleX;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, nestRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(156, 54, 181, 0.2)';
    ctx.strokeStyle = 'rgba(156, 54, 181, 0.6)';
    ctx.lineWidth = 1;
    ctx.fill();
    ctx.stroke();

    // Render other players/bots
    const allPlayers = this.game.players || [];
    for (const p of allPlayers) {
      if (p.isDead || p.id === localPlayer.id) continue;
      const px = p.x * scaleX;
      const py = p.y * scaleY;
      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ff0055';
      ctx.fill();
    }

    // Render local player blip with pulse
    const myX = localPlayer.x * scaleX;
    const myY = localPlayer.y * scaleY;

    // Pulse ring
    const pulse = (Date.now() % 1000) / 1000;
    ctx.beginPath();
    ctx.arc(myX, myY, 4 + pulse * 6, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0, 242, 254, ${1 - pulse})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Solid core
    ctx.beginPath();
    ctx.arc(myX, myY, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#00f2fe';
    ctx.shadowColor = '#00f2fe';
    ctx.shadowBlur = 6;
    ctx.fill();
  }
}
