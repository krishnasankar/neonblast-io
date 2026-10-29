// ============================================================================
// NEONBLAST.IO - Main Game Loop & Arena Simulation Engine
// ============================================================================

import { CONFIG } from './config.js';
import { Player } from './entities/Player.js';
import { Shape } from './entities/Shape.js';
import { Bullet } from './entities/Bullet.js';
import { Drone } from './entities/Drone.js';
import { BotController } from './ai/BotController.js';
import { InputManager } from './input.js';
import { HUD } from './ui/HUD.js';
import { NetworkManager } from './network/NetworkManager.js';
import { sound } from './audio.js';

class SpatialGrid {
  constructor(cellSize = 250) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }

  clear() {
    this.cells.clear();
  }

  getKey(x, y) {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    return `${cx}:${cy}`;
  }

  insert(entity) {
    const key = this.getKey(entity.x, entity.y);
    let list = this.cells.get(key);
    if (!list) {
      list = [];
      this.cells.set(key, list);
    }
    list.push(entity);
  }

  getNearby(x, y, radius = 50) {
    const minCx = Math.floor((x - radius) / this.cellSize);
    const maxCx = Math.floor((x + radius) / this.cellSize);
    const minCy = Math.floor((y - radius) / this.cellSize);
    const maxCy = Math.floor((y + radius) / this.cellSize);

    const result = [];
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const list = this.cells.get(`${cx}:${cy}`);
        if (list) {
          result.push(...list);
        }
      }
    }
    return result;
  }
}

export class GameEngine {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();

    this.input = new InputManager(this.canvas);
    this.hud = new HUD(this);
    this.network = new NetworkManager(this);

    // Camera
    this.camera = { x: CONFIG.ARENA.WIDTH / 2, y: CONFIG.ARENA.HEIGHT / 2, zoom: 1.0, targetZoom: 1.0 };

    // Collections
    this.players = [];
    this.shapes = [];
    this.bullets = [];
    this.drones = [];
    this.particles = [];
    this.floatingTexts = [];
    this.bots = []; // Array of BotController instances

    // Spatial grid for broadphase collision
    this.shapeGrid = new SpatialGrid(200);

    // Bot count setting
    this.targetBotCount = CONFIG.DEFAULT_BOTS || 20;

    // Local Player reference
    this.localPlayer = null;
    this.gameState = 'MENU'; // 'MENU', 'PLAYING', 'DEAD'

    // Timing
    this.lastTime = performance.now();
    this.startTime = 0;

    // Hook input upgrades
    this.input.onUpgradeRequested = (index) => {
      if (this.localPlayer && index >= 0 && index < CONFIG.UPGRADES.length) {
        this.requestUpgrade(CONFIG.UPGRADES[index].id);
      }
    };

    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth * window.devicePixelRatio;
    this.canvas.height = window.innerHeight * window.devicePixelRatio;
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;
  }

  startSoloGame(playerName, colorIndex, botCount = CONFIG.DEFAULT_BOTS) {
    this.network.disconnect();
    this.initWorld(playerName, colorIndex, botCount);
    this.gameState = 'PLAYING';
    this.startTime = Date.now();
    this.toggleMenu(false);
  }

  startHostGame(playerName, colorIndex, onReady, onError, botCount = CONFIG.DEFAULT_BOTS) {
    this.network.disconnect();
    this.initWorld(playerName, colorIndex, botCount);
    this.network.hostRoom(null, (code) => {
      this.gameState = 'PLAYING';
      this.startTime = Date.now();
      this.toggleMenu(false);
      if (onReady) onReady(code);
    }, onError);
  }

  startJoinGame(roomCode, playerName, colorIndex, onConnected, onError) {
    this.network.disconnect();
    this.players = [];
    this.shapes = [];
    this.bullets = [];
    this.drones = [];
    this.particles = [];
    this.floatingTexts = [];
    this.bots = [];
    this.localPlayer = null;

    const color = CONFIG.PLAYER_COLORS[colorIndex] || CONFIG.PLAYER_COLORS[0];
    this.network.joinRoom(roomCode, playerName, color, () => {
      this.gameState = 'PLAYING';
      this.startTime = Date.now();
      this.toggleMenu(false);
      if (onConnected) onConnected();
    }, onError);
  }

  respawnLocalPlayer(playerName, colorIndex) {
    const spawnX = Math.random() * (CONFIG.ARENA.WIDTH - 800) + 400;
    const spawnY = Math.random() * (CONFIG.ARENA.HEIGHT - 800) + 400;
    const color = CONFIG.PLAYER_COLORS[colorIndex] || CONFIG.PLAYER_COLORS[0];
    this.localPlayer = new Player(spawnX, spawnY, playerName || 'Hero', color, false, true);
    this.players.push(this.localPlayer);
    this.camera.x = this.localPlayer.x;
    this.camera.y = this.localPlayer.y;
    this.startTime = Date.now();
  }

  respawnHost(playerName, colorIndex) {
    this.respawnLocalPlayer(playerName, colorIndex);
    this.gameState = 'PLAYING';
    const deathScreen = document.getElementById('death-screen');
    if (deathScreen) deathScreen.style.display = 'none';
  }

  respawnClient(playerName, colorIndex) {
    const color = CONFIG.PLAYER_COLORS[colorIndex] || CONFIG.PLAYER_COLORS[0];
    this.network.sendRespawn(playerName, color);
    this.gameState = 'PLAYING';
    const deathScreen = document.getElementById('death-screen');
    if (deathScreen) deathScreen.style.display = 'none';
  }

  initWorld(playerName, colorIndex, botCount = CONFIG.DEFAULT_BOTS) {
    this.players = [];
    this.shapes = [];
    this.bullets = [];
    this.drones = [];
    this.particles = [];
    this.floatingTexts = [];
    this.bots = [];
    this.targetBotCount = (botCount !== undefined) ? botCount : (CONFIG.DEFAULT_BOTS || 20);

    // Create local player at random safe spawn
    const spawnX = Math.random() * (CONFIG.ARENA.WIDTH - 800) + 400;
    const spawnY = Math.random() * (CONFIG.ARENA.HEIGHT - 800) + 400;
    const color = CONFIG.PLAYER_COLORS[colorIndex] || CONFIG.PLAYER_COLORS[0];
    this.localPlayer = new Player(spawnX, spawnY, playerName || 'Hero', color, false, true);
    this.players.push(this.localPlayer);

    // Initial camera placement
    this.camera.x = this.localPlayer.x;
    this.camera.y = this.localPlayer.y;

    // Spawn ambient shapes
    this.populateShapes();

    // Spawn AI bots
    this.populateBots();
  }

  populateShapes() {
    const keys = ['SQUARE', 'TRIANGLE', 'PENTAGON', 'GREEN_GEM'];
    const weights = [60, 25, 12, 3];
    const totalWeight = weights.reduce((a, b) => a + b, 0);

    while (this.shapes.length < CONFIG.MAX_SHAPES) {
      let rand = Math.random() * totalWeight;
      let chosenKey = 'SQUARE';
      for (let i = 0; i < keys.length; i++) {
        if (rand < weights[i]) {
          chosenKey = keys[i];
          break;
        }
        rand -= weights[i];
      }

      const x = Math.random() * (CONFIG.ARENA.WIDTH - 100) + 50;
      const y = Math.random() * (CONFIG.ARENA.HEIGHT - 100) + 50;
      this.shapes.push(new Shape(x, y, chosenKey));
    }

    // Spawn central Alpha Pentagons in the nest
    const nestX = CONFIG.ARENA.WIDTH / 2;
    const nestY = CONFIG.ARENA.HEIGHT / 2;
    const alphaCount = this.shapes.filter(s => s.typeKey === 'ALPHA_PENTAGON').length;
    for (let i = alphaCount; i < CONFIG.ALPHA_PENTAGON_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * (CONFIG.ARENA.SAFE_ZONE_RADIUS - 80);
      const x = nestX + Math.cos(angle) * dist;
      const y = nestY + Math.sin(angle) * dist;
      this.shapes.push(new Shape(x, y, 'ALPHA_PENTAGON'));
    }
  }

  populateBots() {
    const needed = this.targetBotCount - this.bots.length;
    if (needed <= 0) return;
    for (let i = 0; i < needed; i++) {
      const name = CONFIG.BOT_NAMES[Math.floor(Math.random() * CONFIG.BOT_NAMES.length)];
      const color = CONFIG.PLAYER_COLORS[Math.floor(Math.random() * CONFIG.PLAYER_COLORS.length)];
      const x = Math.random() * (CONFIG.ARENA.WIDTH - 400) + 200;
      const y = Math.random() * (CONFIG.ARENA.HEIGHT - 400) + 200;

      const botPlayer = new Player(x, y, name, color, true);
      const botController = new BotController(botPlayer);

      this.players.push(botPlayer);
      this.bots.push(botController);
    }
  }

  // Handle Client upgrades & evolutions
  requestUpgrade(statId) {
    if (this.network.mode === 'CLIENT') {
      this.network.sendUpgrade(statId);
      if (this.localPlayer) {
        this.localPlayer.upgradeStat(statId);
      }
    } else if (this.localPlayer) {
      this.localPlayer.upgradeStat(statId);
    }
  }

  requestEvolve(classKey) {
    if (this.network.mode === 'CLIENT') {
      this.network.sendEvolve(classKey);
      if (this.localPlayer) {
        this.localPlayer.evolve(classKey);
      }
    } else if (this.localPlayer) {
      this.localPlayer.evolve(classKey);
    }
  }

  // Network peer handlers for Host
  addRemotePlayer(peerId, name, color) {
    this.players = this.players.filter(p => p.id !== peerId);
    const x = Math.random() * (CONFIG.ARENA.WIDTH - 600) + 300;
    const y = Math.random() * (CONFIG.ARENA.HEIGHT - 600) + 300;
    const player = new Player(x, y, name, color, false, false);
    player.id = peerId;
    player.remoteMovement = { x: 0, y: 0 };
    player.networkFiring = false;
    player.networkRepelling = false;
    player.lastInputTime = performance.now();
    this.players.push(player);
  }

  removeRemotePlayer(peerId) {
    this.players = this.players.filter(p => p.id !== peerId);
    this.drones = this.drones.filter(d => !d.owner || d.owner.id !== peerId);
  }

  applyRemoteInput(peerId, input) {
    const p = this.players.find(x => x.id === peerId);
    if (!p || p.isDead || !input) return;

    if (input.movement) {
      p.remoteMovement = input.movement;
    }
    if (input.aimAngle !== undefined) {
      p.aimAngle = input.aimAngle;
    }
    p.networkFiring = !!input.isFiring;
    p.networkRepelling = !!input.isRepelling;
    if (input.worldAim) {
      p.remoteWorldAim = input.worldAim;
    }
    p.lastInputTime = performance.now();
  }

  applyRemoteUpgrade(peerId, statId) {
    const p = this.players.find(x => x.id === peerId);
    if (p) p.upgradeStat(statId);
  }

  applyRemoteEvolve(peerId, classKey) {
    const p = this.players.find(x => x.id === peerId);
    if (p) p.evolve(classKey);
  }

  // Host: update all remote players (movement, firing, drones)
  updateRemotePlayers(dt) {
    const now = performance.now();
    const spawnCallback = (item, isDrone = false) => {
      if (isDrone) {
        this.drones.push(item);
      } else {
        this.bullets.push(item);
      }
    };

    for (const player of this.players) {
      if (player === this.localPlayer || player.isBot || player.isDead) continue;

      // Timeout safety: reset movement & firing if no input received recently
      if (player.lastInputTime && now - player.lastInputTime > 600) {
        player.remoteMovement = { x: 0, y: 0 };
        player.networkFiring = false;
      }

      // Apply movement input
      const mv = player.remoteMovement || { x: 0, y: 0 };
      const accel = player.speed * 0.38;
      player.vx += mv.x * accel * dt;
      player.vy += mv.y * accel * dt;

      // World aim target for drones
      const worldAim = player.remoteWorldAim || {
        x: player.x + Math.cos(player.aimAngle) * 300,
        y: player.y + Math.sin(player.aimAngle) * 300
      };

      player.update(dt, spawnCallback, !!player.networkFiring, worldAim, !!player.networkRepelling);
    }
  }

  // Client mode: receiving authoritative snapshot from Host
  applyWorldSnapshot(snap) {
    if (!snap) return;

    // Sync shapes (preserving existing instances for smooth animation)
    const existingShapes = new Map(this.shapes.map(s => [s.id, s]));
    this.shapes = (snap.shapes || []).map(s => {
      let shape = s.id ? existingShapes.get(s.id) : null;
      if (!shape) {
        shape = new Shape(s.x, s.y, s.typeKey);
        if (s.id) shape.id = s.id;
      }
      shape.x = s.x;
      shape.y = s.y;
      shape.health = s.health;
      shape.maxHealth = s.maxHealth;
      shape.rotation = s.rotation;
      return shape;
    });

    // Sync bullets (preserving existing instances for trails)
    const existingBullets = new Map(this.bullets.map(b => [b.id, b]));
    this.bullets = (snap.bullets || []).map(b => {
      const existing = b.id ? existingBullets.get(b.id) : null;
      if (existing) {
        existing.x = b.x;
        existing.y = b.y;
        existing.vx = b.vx;
        existing.vy = b.vy;
        existing.penetration = b.penetration;
        return existing;
      }
      const bullet = new Bullet(b.x, b.y, b.angle, b.speed, b.damage, b.penetration, b.radius, b.ownerId, b.color, b.glow);
      if (b.id) bullet.id = b.id;
      bullet.vx = b.vx;
      bullet.vy = b.vy;
      return bullet;
    });

    // Sync drones
    const existingDrones = new Map(this.drones.map(d => [d.id, d]));
    this.drones = (snap.drones || []).map(d => {
      let drone = d.id ? existingDrones.get(d.id) : null;
      if (!drone) {
        drone = new Drone(d.x, d.y, { color: { body: d.color, glow: d.glow }, id: d.ownerId });
        if (d.id) drone.id = d.id;
      }
      drone.x = d.x;
      drone.y = d.y;
      drone.angle = d.angle;
      drone.radius = d.radius;
      return drone;
    });

    const myId = this.network.peer ? this.network.peer.id : null;
    const existingPlayers = new Map(this.players.map(p => [p.id, p]));
    const snapLocal = (snap.players || []).find(p => p.id === myId);

    // Local player death detection in client mode
    if (this.localPlayer && !this.localPlayer.isDead && !snapLocal) {
      this.localPlayer.isDead = true;
      this.onLocalPlayerDeath();
    }

    // Sync players
    this.players = (snap.players || []).map(p => {
      let pl = existingPlayers.get(p.id);
      if (!pl) {
        pl = new Player(p.x, p.y, p.name, p.color, p.isBot, p.id === myId);
        pl.id = p.id;
      }

      pl.name = p.name;
      pl.color = p.color;
      pl.level = p.level;
      pl.score = p.score;
      if (p.xp !== undefined) pl.xp = p.xp;
      if (p.kills !== undefined) pl.kills = p.kills;
      pl.statPoints = p.statPoints;
      pl.stats = p.stats;
      pl.maxHealth = p.maxHealth;

      if (p.id === myId) {
        pl.isLocal = true;
        if (pl.health > p.health) {
          sound.playHit();
        }
        pl.health = p.health;

        // Reconcile position smoothly towards host authority
        const dx = p.x - pl.x;
        const dy = p.y - pl.y;
        const distSq = dx * dx + dy * dy;
        if (distSq > 150 * 150) {
          pl.x = p.x;
          pl.y = p.y;
          pl.vx = 0;
          pl.vy = 0;
        } else {
          pl.x += dx * 0.35;
          pl.y += dy * 0.35;
        }
      } else {
        pl.isLocal = false;
        pl.health = p.health;
        pl.x = p.x;
        pl.y = p.y;
        pl.aimAngle = p.aimAngle;
      }

      if (pl.currentClassKey !== p.currentClassKey) {
        pl.evolve(p.currentClassKey);
      }

      return pl;
    });

    const hadLocal = !!this.localPlayer;
    this.localPlayer = this.players.find(p => p.id === myId) || (snapLocal ? null : this.localPlayer);

    // Initial camera placement on join
    if (!hadLocal && this.localPlayer) {
      this.camera.x = this.localPlayer.x;
      this.camera.y = this.localPlayer.y;
    }

    // Leaderboard
    this.hud.update(this.localPlayer, snap.leaderboard);
  }

  // Smoothly update client entities between snapshots
  updateClientEntities(dt) {
    for (const b of this.bullets) {
      b.update(dt);
    }
    this.bullets = this.bullets.filter(b => !b.isDead);

    for (const s of this.shapes) {
      s.update(dt);
    }

    for (const d of this.drones) {
      d.update(dt);
    }

    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= p.decay * dt;
    }
    this.particles = this.particles.filter(p => p.life > 0);

    for (const ft of this.floatingTexts) {
      ft.y -= 0.8 * dt;
      ft.life -= 0.02 * dt;
    }
    this.floatingTexts = this.floatingTexts.filter(ft => ft.life > 0);
  }

  // Main Loop
  start() {
    const loop = (timestamp) => {
      const dt = Math.min((timestamp - this.lastTime) / (1000 / CONFIG.TICK_RATE), 2.5);
      this.lastTime = timestamp;

      this.update(dt);
      this.render();

      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  update(dt) {
    if (this.gameState !== 'PLAYING') return;

    // 1. Client mode networking
    if (this.network.mode === 'CLIENT') {
      const screenX = this.localPlayer ? window.innerWidth / 2 + (this.localPlayer.x - this.camera.x) * this.camera.zoom : window.innerWidth / 2;
      const screenY = this.localPlayer ? window.innerHeight / 2 + (this.localPlayer.y - this.camera.y) * this.camera.zoom : window.innerHeight / 2;
      const movement = this.input.getMovement();
      const aimAngle = this.input.getAimAngle(screenX, screenY);
      const isFiring = this.input.isFiring();
      const isRepelling = this.input.isRepelling();

      const worldAim = {
        x: this.camera.x + (this.input.mouse.x - window.innerWidth / 2) / this.camera.zoom,
        y: this.camera.y + (this.input.mouse.y - window.innerHeight / 2) / this.camera.zoom
      };

      this.network.sendInput({ movement, aimAngle, isFiring, isRepelling, worldAim });

      if (this.localPlayer && !this.localPlayer.isDead) {
        // Client-side prediction for instant responsive movement
        const accel = this.localPlayer.speed * 0.38;
        this.localPlayer.vx += movement.x * accel * dt;
        this.localPlayer.vy += movement.y * accel * dt;
        this.localPlayer.x += this.localPlayer.vx * dt;
        this.localPlayer.y += this.localPlayer.vy * dt;
        this.localPlayer.vx *= Math.pow(this.localPlayer.friction, dt);
        this.localPlayer.vy *= Math.pow(this.localPlayer.friction, dt);
        this.localPlayer.constrainToBounds();
        this.localPlayer.aimAngle = aimAngle;

        // Camera follow
        this.camera.targetZoom = 1 / (this.localPlayer.zoom || 1.0);
        this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * 0.05;
        this.camera.x += (this.localPlayer.x - this.camera.x) * 0.1;
        this.camera.y += (this.localPlayer.y - this.camera.y) * 0.1;

        // Update local barrel timers & recoil recovery for responsive visuals & audio
        const reloadStatBonus = 1 + this.localPlayer.stats.reload * 0.12;
        for (let i = 0; i < this.localPlayer.barrelTimers.length; i++) {
          if (this.localPlayer.barrelTimers[i] > 0) {
            this.localPlayer.barrelTimers[i] = Math.max(0, this.localPlayer.barrelTimers[i] - reloadStatBonus * dt);
          }
          if (this.localPlayer.barrelRecoil[i] > 0) {
            this.localPlayer.barrelRecoil[i] = Math.max(0, this.localPlayer.barrelRecoil[i] - 0.15 * dt);
          }
        }

        if (isFiring) {
          const barrels = this.localPlayer.classDef.barrels || [];
          for (let i = 0; i < barrels.length; i++) {
            const b = barrels[i];
            if (b.isDroneSpawnerBarrel) continue;
            if (this.localPlayer.barrelTimers[i] <= 0) {
              this.localPlayer.barrelTimers[i] = b.reloadTime;
              this.localPlayer.barrelRecoil[i] = 1.0;

              // Recoil kick impulse on local tank
              const spreadOffset = (Math.random() - 0.5) * (b.spread || 0.04);
              const finalAngle = this.localPlayer.aimAngle + (b.angle || 0) + spreadOffset;
              const recoilMag = (b.recoil || 0.15) * 12;
              this.localPlayer.vx -= Math.cos(finalAngle) * recoilMag;
              this.localPlayer.vy -= Math.sin(finalAngle) * recoilMag;

              const isHeavy = !!b.bulletRadius && b.bulletRadius > 15;
              sound.playShoot(1.0, isHeavy);
            }
          }
        }
      }

      // Smoothly update bullets and particles on client between snapshots
      this.updateClientEntities(dt);
      return;
    }

    // 2. Authoritative Loop (SOLO or HOST)
    this.updateLocalPlayer(dt);
    if (this.network.mode === 'HOST') {
      this.updateRemotePlayers(dt);
    }
    this.updateBots(dt);
    this.updateEntities(dt);
    this.handleCollisions();
    this.maintainArena();

    // 3. Update HUD & Leaderboard
    const leaderboard = this.getLeaderboardData();
    this.hud.update(this.localPlayer, leaderboard);

    // 4. Host mode broadcast
    if (this.network.mode === 'HOST') {
      this.broadcastWorldState(leaderboard);
    }
  }

  updateLocalPlayer(dt) {
    if (!this.localPlayer || this.localPlayer.isDead) return;

    // Apply movement input
    const mv = this.input.getMovement();
    const accel = this.localPlayer.speed * 0.38;
    this.localPlayer.vx += mv.x * accel * dt;
    this.localPlayer.vy += mv.y * accel * dt;

    // Aim angle
    const screenX = window.innerWidth / 2;
    const screenY = window.innerHeight / 2;
    this.localPlayer.aimAngle = this.input.getAimAngle(screenX, screenY);

    // Camera follow with zoom interpolation
    this.camera.targetZoom = 1 / (this.localPlayer.zoom || 1.0);
    this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * 0.05;
    this.camera.x += (this.localPlayer.x - this.camera.x) * 0.1;
    this.camera.y += (this.localPlayer.y - this.camera.y) * 0.1;

    // Bullet & Drone spawn callback
    const spawnCallback = (item, isDrone = false) => {
      if (isDrone) {
        this.drones.push(item);
      } else {
        this.bullets.push(item);
      }
    };

    // Aim target in world coordinates for drones
    const worldAim = {
      x: this.camera.x + (this.input.mouse.x - window.innerWidth / 2) / this.camera.zoom,
      y: this.camera.y + (this.input.mouse.y - window.innerHeight / 2) / this.camera.zoom
    };

    this.localPlayer.update(dt, spawnCallback, this.input.isFiring(), worldAim, this.input.isRepelling());
  }

  updateBots(dt) {
    for (const bot of this.bots) {
      bot.update(dt, this.players, this.shapes, this.bullets);

      const spawnCallback = (item, isDrone = false) => {
        if (isDrone) this.drones.push(item);
        else this.bullets.push(item);
      };

      bot.bot.update(dt, spawnCallback, bot.isFiring, bot.targetAim);
    }
  }

  updateEntities(dt) {
    // Bullets
    for (const b of this.bullets) {
      b.update(dt);
    }
    this.bullets = this.bullets.filter(b => !b.isDead);

    // Drones
    for (const d of this.drones) {
      if (d.owner.isDead) d.isDead = true;
    }
    this.drones = this.drones.filter(d => !d.isDead);

    // Shapes
    for (const s of this.shapes) {
      s.update(dt);
    }

    // Particles
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= p.decay * dt;
    }
    this.particles = this.particles.filter(p => p.life > 0);

    // Floating text numbers
    for (const ft of this.floatingTexts) {
      ft.y -= 0.8 * dt;
      ft.life -= 0.02 * dt;
    }
    this.floatingTexts = this.floatingTexts.filter(ft => ft.life > 0);
  }

  handleCollisions() {
    // 1. Populate Spatial Grid for shapes
    this.shapeGrid.clear();
    for (const shape of this.shapes) {
      this.shapeGrid.insert(shape);
    }

    // 2. Bullets vs Shapes
    for (const bullet of this.bullets) {
      if (bullet.isDead) continue;
      const nearbyShapes = this.shapeGrid.getNearby(bullet.x, bullet.y, bullet.radius + 85);

      for (const shape of nearbyShapes) {
        if (shape.isDead) continue;
        const dist = Math.hypot(shape.x - bullet.x, shape.y - bullet.y);
        if (dist < shape.radius + bullet.radius) {
          const killed = bullet.hit(shape);
          this.createSparkExplosion(bullet.x, bullet.y, shape.color, 4);

          if (killed) {
            this.handleEntityKilled(shape, bullet.ownerId);
          } else {
            sound.playHit();
          }
          if (bullet.isDead) break;
        }
      }
    }

    // 3. Bullets vs Players
    for (const bullet of this.bullets) {
      if (bullet.isDead) continue;

      for (const player of this.players) {
        if (player.isDead || player.id === bullet.ownerId) continue;
        const dist = Math.hypot(player.x - bullet.x, player.y - bullet.y);
        if (dist < player.radius + bullet.radius) {
          const killed = bullet.hit(player);
          this.createSparkExplosion(bullet.x, bullet.y, player.color.body, 6);

          if (killed) {
            this.handleEntityKilled(player, bullet.ownerId);
          } else {
            sound.playHit();
          }
          if (bullet.isDead) break;
        }
      }
    }

    // 4. Drones vs Shapes & Players
    for (const drone of this.drones) {
      if (drone.isDead) continue;
      const nearbyShapes = this.shapeGrid.getNearby(drone.x, drone.y, drone.radius + 30);

      for (const shape of nearbyShapes) {
        if (shape.isDead) continue;
        const dist = Math.hypot(shape.x - drone.x, shape.y - drone.y);
        if (dist < shape.radius + drone.radius) {
          const killed = drone.hit(shape);
          this.createSparkExplosion(drone.x, drone.y, shape.color, 4);
          if (killed) this.handleEntityKilled(shape, drone.owner.id);
          if (drone.isDead) break;
        }
      }

      for (const player of this.players) {
        if (player.isDead || player.id === drone.owner.id) continue;
        const dist = Math.hypot(player.x - drone.x, player.y - drone.y);
        if (dist < player.radius + drone.radius) {
          const killed = drone.hit(player);
          this.createSparkExplosion(drone.x, drone.y, player.color.body, 6);
          if (killed) this.handleEntityKilled(player, drone.owner.id);
          if (drone.isDead) break;
        }
      }
    }

    // 5. Players vs Shapes (Body collision / ramming)
    for (const player of this.players) {
      if (player.isDead) continue;
      const nearbyShapes = this.shapeGrid.getNearby(player.x, player.y, player.radius + 40);

      for (const shape of nearbyShapes) {
        if (shape.isDead) continue;
        const dist = Math.hypot(shape.x - player.x, shape.y - player.y);
        if (dist < player.radius + shape.radius) {
          player.resolveCollision(shape);

          const playerDmg = player.bodyDamage;
          const shapeDmg = shape.bodyDamage;

          const shapeKilled = shape.takeDamage(playerDmg, player.id);
          const playerKilled = player.takeDamage(shapeDmg, shape.typeKey);

          this.createSparkExplosion((player.x + shape.x) / 2, (player.y + shape.y) / 2, shape.color, 5);

          if (shapeKilled) this.handleEntityKilled(shape, player.id);
          if (playerKilled) this.handleEntityKilled(player, null);
        }
      }
    }

    // 6. Player vs Player (Body ramming)
    for (let i = 0; i < this.players.length; i++) {
      const p1 = this.players[i];
      if (p1.isDead) continue;

      for (let j = i + 1; j < this.players.length; j++) {
        const p2 = this.players[j];
        if (p2.isDead) continue;

        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        if (dist < p1.radius + p2.radius) {
          p1.resolveCollision(p2);

          const p1Killed = p1.takeDamage(p2.bodyDamage, p2.id);
          const p2Killed = p2.takeDamage(p1.bodyDamage, p1.id);

          this.createSparkExplosion((p1.x + p2.x) / 2, (p1.y + p2.y) / 2, '#ffffff', 8);

          if (p1Killed) this.handleEntityKilled(p1, p2.id);
          if (p2Killed) this.handleEntityKilled(p2, p1.id);
        }
      }
    }
  }

  handleEntityKilled(victim, killerId) {
    const killer = this.players.find(p => p.id === killerId);

    // Explosion particles
    this.createDeathExplosion(victim.x, victim.y, victim.color ? (victim.color.body || victim.color) : '#ffffff');

    if (victim instanceof Shape) {
      sound.playShapeDestroyed();
      if (killer) {
        killer.addXP(victim.xp);
        this.addFloatingText(`+${victim.xp} XP`, victim.x, victim.y, '#ffd43b');
      }
    } else if (victim instanceof Player) {
      sound.playPlayerDeath();
      const killerName = killer ? killer.name : 'The Arena';
      this.hud.addKillMessage(killerName, victim.name);
      this.network.broadcastKill(killerName, victim.name);

      if (killer) {
        killer.kills++;
        const bountyXP = Math.max(100, Math.floor(victim.score * 0.45));
        killer.addXP(bountyXP);
        this.addFloatingText(`+${bountyXP} BOUNTY!`, victim.x, victim.y, '#00ff87');
      }

      // Check if local player died
      if (victim === this.localPlayer) {
        this.onLocalPlayerDeath();
      }
    }
  }

  onLocalPlayerDeath() {
    this.gameState = 'DEAD';
    const survivedSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    const deathScreen = document.getElementById('death-screen');
    const finalScore = document.getElementById('death-score');
    const finalKills = document.getElementById('death-kills');
    const finalTime = document.getElementById('death-time');

    if (finalScore) finalScore.textContent = Math.floor(this.localPlayer.score).toLocaleString();
    if (finalKills) finalKills.textContent = this.localPlayer.kills;
    if (finalTime) finalTime.textContent = `${survivedSeconds}s`;
    if (deathScreen) deathScreen.style.display = 'flex';
  }

  maintainArena() {
    // Clean dead shapes & respawn
    this.shapes = this.shapes.filter(s => !s.isDead);
    if (this.shapes.length < CONFIG.MAX_SHAPES) {
      this.populateShapes();
    }

    // Clean dead bots & respawn
    this.bots = this.bots.filter(b => !b.bot.isDead);
    this.players = this.players.filter(p => !p.isDead);
    if (this.bots.length < this.targetBotCount) {
      this.populateBots();
    }
  }

  getLeaderboardData() {
    return this.players
      .map(p => ({ id: p.id, name: p.name, score: p.score }))
      .sort((a, b) => b.score - a.score);
  }

  getSnapshot(leaderboard = this.getLeaderboardData()) {
    return {
      leaderboard,
      shapes: this.shapes.map(s => ({
        id: s.id,
        x: Math.round(s.x),
        y: Math.round(s.y),
        typeKey: s.typeKey,
        health: Math.round(s.health),
        maxHealth: s.maxHealth,
        rotation: +(s.rotation.toFixed(2))
      })),
      bullets: this.bullets.map(b => ({
        id: b.id,
        x: Math.round(b.x),
        y: Math.round(b.y),
        vx: +b.vx.toFixed(1),
        vy: +b.vy.toFixed(1),
        angle: +b.angle.toFixed(2),
        speed: +b.speed.toFixed(1),
        damage: b.damage,
        penetration: b.penetration,
        radius: b.radius,
        ownerId: b.ownerId,
        color: b.color,
        glow: b.glow
      })),
      drones: this.drones.map(d => ({
        id: d.id,
        x: Math.round(d.x),
        y: Math.round(d.y),
        angle: +d.angle.toFixed(2),
        radius: d.radius,
        color: d.color,
        glow: d.glow,
        ownerId: d.owner ? d.owner.id : null
      })),
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        color: p.color,
        isBot: p.isBot,
        x: Math.round(p.x),
        y: Math.round(p.y),
        level: p.level,
        score: Math.round(p.score),
        xp: Math.round(p.xp || 0),
        kills: p.kills || 0,
        health: Math.round(p.health),
        maxHealth: p.maxHealth,
        aimAngle: +p.aimAngle.toFixed(2),
        currentClassKey: p.currentClassKey,
        stats: p.stats,
        statPoints: p.statPoints
      }))
    };
  }

  broadcastWorldState(leaderboard) {
    const snapshot = this.getSnapshot(leaderboard);
    this.network.broadcastSnapshot(snapshot);
  }

  // Particle Effects
  createSparkExplosion(x, y, color = '#ffffff', count = 6) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 3.5 + 1.5,
        color,
        life: 1.0,
        decay: Math.random() * 0.05 + 0.03
      });
    }
  }

  createDeathExplosion(x, y, color = '#ff0055') {
    for (let i = 0; i < 24; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 7 + 2;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 5 + 2,
        color,
        life: 1.0,
        decay: Math.random() * 0.03 + 0.02
      });
    }
  }

  addFloatingText(text, x, y, color = '#ffffff') {
    this.floatingTexts.push({ text, x, y, color, life: 1.0 });
  }

  // Render Frame
  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const scale = window.devicePixelRatio || 1;

    ctx.save();
    ctx.clearRect(0, 0, w, h);
    ctx.scale(scale, scale);

    const viewW = window.innerWidth;
    const viewH = window.innerHeight;

    // Camera transform
    ctx.save();
    ctx.translate(viewW / 2, viewH / 2);
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.translate(-this.camera.x, -this.camera.y);

    // 1. Draw Grid Background & World Boundaries
    this.renderArenaGrid(ctx);

    // 2. Draw Shapes
    for (const shape of this.shapes) {
      if (this.isInView(shape.x, shape.y, shape.radius + 50)) {
        shape.render(ctx);
      }
    }

    // 3. Draw Bullets
    for (const bullet of this.bullets) {
      if (this.isInView(bullet.x, bullet.y, 40)) {
        bullet.render(ctx);
      }
    }

    // 4. Draw Drones
    for (const drone of this.drones) {
      if (this.isInView(drone.x, drone.y, 40)) {
        drone.render(ctx);
      }
    }

    // 5. Draw Players & Bots
    for (const player of this.players) {
      if (this.isInView(player.x, player.y, player.radius + 60)) {
        player.render(ctx);
      }
    }

    // 6. Draw Particles
    for (const p of this.particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // 7. Draw Floating Numbers
    for (const ft of this.floatingTexts) {
      ctx.save();
      ctx.font = 'bold 16px "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = ft.color;
      ctx.globalAlpha = Math.max(0, ft.life);
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 6;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    ctx.restore(); // Restore Camera

    // 8. Virtual Touch Joysticks
    this.input.renderTouchJoysticks(ctx);

    ctx.restore();
  }

  isInView(x, y, margin = 50) {
    const halfW = (window.innerWidth / 2) / this.camera.zoom + margin;
    const halfH = (window.innerHeight / 2) / this.camera.zoom + margin;
    return (
      x >= this.camera.x - halfW &&
      x <= this.camera.x + halfW &&
      y >= this.camera.y - halfH &&
      y <= this.camera.y + halfH
    );
  }

  renderArenaGrid(ctx) {
    const arenaW = CONFIG.ARENA.WIDTH;
    const arenaH = CONFIG.ARENA.HEIGHT;
    const gridStep = CONFIG.ARENA.GRID_SIZE;

    // Background fill
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, arenaW, arenaH);

    // Center Nest zone
    ctx.beginPath();
    ctx.arc(arenaW / 2, arenaH / 2, CONFIG.ARENA.SAFE_ZONE_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(156, 54, 181, 0.08)';
    ctx.fill();

    // Subtle Neon Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;

    const startX = Math.max(0, Math.floor((this.camera.x - window.innerWidth) / gridStep) * gridStep);
    const endX = Math.min(arenaW, Math.ceil((this.camera.x + window.innerWidth) / gridStep) * gridStep);
    const startY = Math.max(0, Math.floor((this.camera.y - window.innerHeight) / gridStep) * gridStep);
    const endY = Math.min(arenaH, Math.ceil((this.camera.y + window.innerHeight) / gridStep) * gridStep);

    ctx.beginPath();
    for (let x = startX; x <= endX; x += gridStep) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, arenaH);
    }
    for (let y = startY; y <= endY; y += gridStep) {
      ctx.moveTo(0, y);
      ctx.lineTo(arenaW, y);
    }
    ctx.stroke();

    // Red Glowing Danger Perimeter Border
    ctx.save();
    ctx.strokeStyle = '#ff0055';
    ctx.shadowColor = '#ff0055';
    ctx.shadowBlur = 20;
    ctx.lineWidth = 6;
    ctx.strokeRect(0, 0, arenaW, arenaH);
    ctx.restore();
  }

  toggleMenu(show) {
    const menu = document.getElementById('main-menu');
    const hud = document.getElementById('hud-container');
    if (menu) menu.style.display = show ? 'flex' : 'none';
    if (hud) hud.style.display = show ? 'none' : 'block';
  }
}
