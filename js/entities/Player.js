// ============================================================================
// NEONBLAST.IO - Tank Vessel (Player & Bots)
// ============================================================================

import { Entity } from './Entity.js';
import { CONFIG } from '../config.js';
import { Bullet } from './Bullet.js';
import { Drone } from './Drone.js';
import { sound } from '../audio.js';

export class Player extends Entity {
  constructor(x, y, name = 'Pilot', color = null, isBot = false) {
    super(x, y, 22, 5);

    this.name = name;
    this.isBot = isBot;
    this.color = color || CONFIG.PLAYER_COLORS[0];

    // Progression
    this.level = 1;
    this.xp = 0;
    this.score = 0;
    this.kills = 0;
    this.statPoints = 0;

    // Stat allocations (0 to 7)
    this.stats = {
      healthRegen: 0,
      maxHealth: 0,
      bodyDamage: 0,
      bulletSpeed: 0,
      bulletPenetration: 0,
      bulletDamage: 0,
      reload: 0,
      movementSpeed: 0,
    };

    // Class & Hull
    this.currentClassKey = 'basic';
    this.classDef = CONFIG.CLASSES.basic;
    this.bodyRadius = this.classDef.bodyRadius;
    this.radius = this.bodyRadius;
    this.zoom = 1.0;

    // Barrels & Timers
    this.barrelTimers = [];
    this.barrelRecoil = [];
    this.initBarrels();

    // Drones
    this.drones = [];
    this.droneSpawnTimer = 0;

    // Spikes rotation for melee smashers
    this.spikeRotation = 0;

    // Health regen timer
    this.timeSinceHit = 0;

    // Movement
    this.aimAngle = 0;
    this.recomputeStats();
  }

  initBarrels() {
    this.barrelTimers = (this.classDef.barrels || []).map(b => b.delay || 0);
    this.barrelRecoil = (this.classDef.barrels || []).map(() => 0);
  }

  // Recalculate derived attributes based on stats and class
  recomputeStats() {
    const s = this.stats;

    // Max Health: base 100 + 25 per point, multiplied by class bonus
    const classHealthMul = this.classDef.maxHealthMultiplier || 1.0;
    const oldMax = this.maxHealth;
    this.maxHealth = (100 + s.maxHealth * 28) * classHealthMul;
    if (oldMax > 0) {
      this.health = Math.min(this.maxHealth, this.health + (this.maxHealth - oldMax));
    } else {
      this.health = this.maxHealth;
    }

    // Health Regen: base 0.05 + 0.15 per point
    this.regenRate = 0.05 + s.healthRegen * 0.18;

    // Body Damage: base 15 + 7 per point, multiplied by smasher bonus
    const classDamageMul = this.classDef.bodyDamageMultiplier || 1.0;
    this.bodyDamage = (15 + s.bodyDamage * 7.5) * classDamageMul;

    // Movement Speed: base speed + bonus per point
    const baseSpd = this.classDef.baseSpeed || 3.4;
    this.speed = baseSpd * (1 + s.movementSpeed * 0.08);

    // Zoom multiplier
    this.zoom = this.classDef.zoomMultiplier || 1.0;
  }

  getXpNeeded(level = this.level) {
    return Math.floor(CONFIG.LEVELS.BASE_XP * Math.pow(CONFIG.LEVELS.XP_EXPONENT, level - 1));
  }

  addXP(amount) {
    if (this.isDead) return;
    this.xp += amount;
    this.score += amount;

    let leveledUp = false;
    while (this.level < CONFIG.LEVELS.MAX_LEVEL && this.xp >= this.getXpNeeded()) {
      this.xp -= this.getXpNeeded();
      this.level++;
      this.statPoints += CONFIG.LEVELS.STAT_POINTS_PER_LEVEL;
      leveledUp = true;
    }

    if (leveledUp) {
      this.recomputeStats();
      this.health = this.maxHealth; // Full heal on level-up
      if (!this.isBot) {
        sound.playLevelUp();
      }
    }
  }

  upgradeStat(statId) {
    if (this.statPoints <= 0) return false;
    if (this.stats[statId] === undefined) return false;
    if (this.stats[statId] >= CONFIG.LEVELS.MAX_STAT_LEVEL) return false;

    this.stats[statId]++;
    this.statPoints--;
    this.recomputeStats();
    if (!this.isBot) {
      sound.playUpgradeClick();
    }
    return true;
  }

  getAvailableEvolutions() {
    const list = [];
    const evols = this.classDef.evolutions || [];
    for (const key of evols) {
      const def = CONFIG.CLASSES[key];
      if (def && this.level >= def.minLevel) {
        list.push({ key, def });
      }
    }
    return list;
  }

  evolve(classKey) {
    const newDef = CONFIG.CLASSES[classKey];
    if (!newDef) return false;

    this.currentClassKey = classKey;
    this.classDef = newDef;
    this.bodyRadius = newDef.bodyRadius;
    this.radius = this.bodyRadius;
    this.initBarrels();
    this.recomputeStats();
    if (!this.isBot) {
      sound.playLevelUp();
    }
    return true;
  }

  takeDamage(amount, attacker = null) {
    this.timeSinceHit = 0;
    return super.takeDamage(amount, attacker);
  }

  update(dt = 1, bulletSpawnCallback = null, isFiring = false, targetAim = null, isRepelling = false) {
    this.timeSinceHit += dt;

    // Passive regeneration kicks in after 3 seconds without taking damage
    if (this.timeSinceHit > 180 && this.health < this.maxHealth) {
      this.health = Math.min(this.maxHealth, this.health + this.regenRate * 1.8 * dt);
    } else if (this.health < this.maxHealth) {
      this.health = Math.min(this.maxHealth, this.health + this.regenRate * 0.3 * dt);
    }

    // Spikes spin for melee smasher
    if (this.classDef.isMeleeOnly) {
      this.spikeRotation += 0.05 * dt;
    }

    // Update barrel recoil recovery & reload timers
    const reloadStatBonus = 1 + this.stats.reload * 0.12;
    for (let i = 0; i < this.barrelTimers.length; i++) {
      if (this.barrelTimers[i] > 0) {
        this.barrelTimers[i] = Math.max(0, this.barrelTimers[i] - reloadStatBonus * dt);
      }
      if (this.barrelRecoil[i] > 0) {
        this.barrelRecoil[i] = Math.max(0, this.barrelRecoil[i] - 0.15 * dt);
      }
    }

    // Handle firing
    if (isFiring && bulletSpawnCallback) {
      this.handleFiring(bulletSpawnCallback);
    }

    // Handle Drone spawning & updates if carrier
    if (this.classDef.isDroneSpawner) {
      this.updateDrones(dt, bulletSpawnCallback, targetAim, isRepelling);
    }

    super.update(dt);
  }

  handleFiring(bulletSpawnCallback) {
    const barrels = this.classDef.barrels || [];
    const bulletSpeedBonus = 1 + this.stats.bulletSpeed * 0.14;
    const bulletDamageBonus = 1 + this.stats.bulletDamage * 0.18;
    const bulletPenBonus = 1 + this.stats.bulletPenetration * 0.2;

    for (let i = 0; i < barrels.length; i++) {
      const b = barrels[i];
      if (b.isDroneSpawnerBarrel) continue;

      if (this.barrelTimers[i] <= 0) {
        // Fire barrel!
        this.barrelTimers[i] = b.reloadTime;
        this.barrelRecoil[i] = 1.0;

        // Angle with spread
        const spreadOffset = (Math.random() - 0.5) * (b.spread || 0.04);
        const finalAngle = this.aimAngle + (b.angle || 0) + spreadOffset;

        // Spawn position at barrel tip
        const offset = b.offset || 0;
        const perpAngle = this.aimAngle + Math.PI / 2;
        const barrelLength = b.length;
        const spawnX = this.x + Math.cos(this.aimAngle) * (barrelLength * 0.8) + Math.cos(perpAngle) * offset;
        const spawnY = this.y + Math.sin(this.aimAngle) * (barrelLength * 0.8) + Math.sin(perpAngle) * offset;

        // Recoil kick impulse on tank
        const recoilMag = (b.recoil || 0.15) * 12;
        this.vx -= Math.cos(finalAngle) * recoilMag;
        this.vy -= Math.sin(finalAngle) * recoilMag;

        // Bullet stats
        const spd = (b.speed || 7.5) * bulletSpeedBonus;
        const dmg = (b.damage || 20) * bulletDamageBonus;
        const pen = (b.pen || 1.0) * bulletPenBonus;
        const radius = b.bulletRadius || (b.width ? b.width * 0.55 : 9);

        const bullet = new Bullet(
          spawnX,
          spawnY,
          finalAngle,
          spd,
          dmg,
          pen,
          radius,
          this.id,
          this.color.body,
          this.color.glow
        );

        bulletSpawnCallback(bullet);

        // Sound effect
        if (!this.isBot) {
          const isHeavy = !!b.bulletRadius && b.bulletRadius > 15;
          sound.playShoot(1.0, isHeavy);
        }
      }
    }
  }

  updateDrones(dt, spawnCallback, targetAim, isRepelling) {
    // Clean dead drones
    this.drones = this.drones.filter(d => !d.isDead);

    // Spawn new drones if under max
    const maxDrones = this.classDef.maxDrones || 4;
    const reloadTime = (this.classDef.droneReload || 45) / (1 + this.stats.reload * 0.1);

    if (this.drones.length < maxDrones) {
      this.droneSpawnTimer += dt;
      if (this.droneSpawnTimer >= reloadTime) {
        this.droneSpawnTimer = 0;
        const drone = new Drone(this.x, this.y, this);
        this.drones.push(drone);
        if (spawnCallback) {
          spawnCallback(drone, true); // true = isDrone
        }
      }
    }

    // Update existing drones
    let targetX = null;
    let targetY = null;
    if (targetAim) {
      targetX = targetAim.x;
      targetY = targetAim.y;
    }

    for (const drone of this.drones) {
      drone.update(dt, targetX, targetY, isRepelling);
    }
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // 1. Draw Barrels with recoil animation
    const barrels = this.classDef.barrels || [];
    for (let i = 0; i < barrels.length; i++) {
      const b = barrels[i];
      const recoilOffset = (this.barrelRecoil[i] || 0) * 8;
      const length = Math.max(10, b.length - recoilOffset);
      const width = b.width || 14;
      const offset = b.offset || 0;

      ctx.save();
      ctx.rotate(this.aimAngle + (b.angle || 0));

      ctx.fillStyle = b.isThruster ? '#495057' : this.color.barrel;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;

      if (b.taper) {
        // Tapered barrel (e.g. machine gun or drone spawner)
        ctx.beginPath();
        ctx.moveTo(0, -width / 2 + offset);
        ctx.lineTo(length, -width * b.taper / 2 + offset);
        ctx.lineTo(length, width * b.taper / 2 + offset);
        ctx.lineTo(0, width / 2 + offset);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        // Standard rectangular barrel
        ctx.beginPath();
        ctx.rect(0, -width / 2 + offset, length, width);
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
    }

    // 2. Draw Body / Spikes
    if (this.classDef.isMeleeOnly) {
      // Draw spiked outer perimeter
      ctx.save();
      ctx.rotate(this.spikeRotation);
      ctx.fillStyle = '#ff0055';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;

      const numSpikes = this.classDef.spikes || 8;
      const step = (Math.PI * 2) / (numSpikes * 2);
      ctx.beginPath();
      for (let i = 0; i < numSpikes * 2; i++) {
        const rad = i % 2 === 0 ? this.radius * 1.45 : this.radius * 0.9;
        const px = Math.cos(i * step) * rad;
        const py = Math.sin(i * step) * rad;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Draw Main Vessel Hull
    ctx.shadowColor = this.color.glow;
    ctx.shadowBlur = 15;

    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);

    if (this.hitFlash > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#ffffff';
    } else {
      ctx.fillStyle = this.color.body;
      ctx.strokeStyle = '#ffffff';
    }

    ctx.lineWidth = 3;
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    // 3. Draw Name Tag & Level
    ctx.save();
    ctx.font = 'bold 12px "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 4;
    const tag = `${this.name} [Lv.${this.level}]`;
    ctx.fillText(tag, this.x, this.y - this.radius - 12);
    ctx.restore();

    // 4. Draw Health Bar
    this.renderHealthBar(ctx, 8);
  }
}
