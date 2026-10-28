// ============================================================================
// NEONBLAST.IO - Intelligent Reactive AI Bot Controller
// ============================================================================

import { CONFIG } from '../config.js';

export class BotController {
  constructor(botPlayer) {
    this.bot = botPlayer;

    // Personality profile
    const archetypes = ['AGGRESSIVE', 'FARMER', 'BALANCED', 'SNIPER', 'RAMMER'];
    this.archetype = archetypes[Math.floor(Math.random() * archetypes.length)];

    this.state = 'FARMING';
    this.target = null;
    this.targetType = null; // 'SHAPE' or 'PLAYER'
    this.stateTimer = 0;
    this.strafeDir = Math.random() < 0.5 ? 1 : -1;
    this.strafeTimer = 0;

    // Preferred stat distribution order based on archetype
    this.statPriorities = this.getStatPriorities();
  }

  getStatPriorities() {
    switch (this.archetype) {
      case 'RAMMER':
        return ['movementSpeed', 'maxHealth', 'bodyDamage', 'healthRegen'];
      case 'SNIPER':
        return ['bulletSpeed', 'bulletDamage', 'bulletPenetration', 'reload', 'movementSpeed'];
      case 'AGGRESSIVE':
        return ['bulletDamage', 'reload', 'bulletSpeed', 'movementSpeed', 'maxHealth'];
      case 'FARMER':
        return ['reload', 'bulletDamage', 'bulletPenetration', 'movementSpeed', 'healthRegen'];
      default:
        return ['bulletDamage', 'bulletSpeed', 'reload', 'maxHealth', 'movementSpeed', 'bulletPenetration'];
    }
  }

  update(dt, allPlayers, allShapes, allBullets) {
    if (this.bot.isDead) return;

    this.stateTimer += dt;
    this.strafeTimer += dt;
    if (this.strafeTimer > 80 + Math.random() * 60) {
      this.strafeDir *= -1;
      this.strafeTimer = 0;
    }

    // 1. Check for Auto-Upgrades
    this.handleAutoUpgrades();

    // 2. Check for Auto-Evolutions
    this.handleAutoEvolution();

    // 3. Evaluate Environment & Determine State
    const nearbyEnemy = this.findNearestEnemy(allPlayers);
    const healthRatio = this.bot.health / this.bot.maxHealth;

    if (healthRatio < 0.32 && nearbyEnemy) {
      this.state = 'FLEEING';
      this.target = nearbyEnemy;
    } else if (nearbyEnemy && (this.archetype === 'AGGRESSIVE' || (nearbyEnemy.dist < 600 && healthRatio > 0.4))) {
      this.state = 'COMBAT';
      this.target = nearbyEnemy;
    } else {
      this.state = 'FARMING';
      this.target = this.findBestShape(allShapes);
    }

    // 4. Check for incoming bullet threat (Dodge reflex)
    const incomingBullet = this.findThreateningBullet(allBullets);

    // 5. Execute Movement & Aiming according to State
    this.executeBehavior(dt, incomingBullet);
  }

  handleAutoUpgrades() {
    if (this.bot.statPoints <= 0) return;

    for (const statId of this.statPriorities) {
      if (this.bot.upgradeStat(statId)) {
        if (this.bot.statPoints <= 0) break;
      }
    }
    // Fallback to any upgrade if priority is maxed
    if (this.bot.statPoints > 0) {
      for (const u of CONFIG.UPGRADES) {
        if (this.bot.upgradeStat(u.id)) {
          if (this.bot.statPoints <= 0) break;
        }
      }
    }
  }

  handleAutoEvolution() {
    const evolutions = this.bot.getAvailableEvolutions();
    if (evolutions.length > 0) {
      // Pick evolution suited to archetype if possible
      let chosen = evolutions[0];
      if (this.archetype === 'SNIPER') {
        chosen = evolutions.find(e => e.key.includes('sniper') || e.key.includes('assassin') || e.key.includes('railgun')) || chosen;
      } else if (this.archetype === 'RAMMER') {
        chosen = evolutions.find(e => e.key.includes('smasher') || e.key.includes('booster') || e.key.includes('tri_angle')) || chosen;
      } else {
        chosen = evolutions[Math.floor(Math.random() * evolutions.length)];
      }
      this.bot.evolve(chosen.key);
    }
  }

  findNearestEnemy(players) {
    let nearest = null;
    let minDist = 900; // Visual radius

    for (const p of players) {
      if (p.id === this.bot.id || p.isDead) continue;
      const dist = Math.hypot(p.x - this.bot.x, p.y - this.bot.y);
      if (dist < minDist) {
        minDist = dist;
        nearest = { player: p, dist };
      }
    }
    return nearest;
  }

  findBestShape(shapes) {
    let best = null;
    let bestScore = -Infinity;

    for (const s of shapes) {
      if (s.isDead) continue;
      const dist = Math.hypot(s.x - this.bot.x, s.y - this.bot.y);
      if (dist > 750) continue;

      // Score shapes by value and distance
      const score = (s.xp * 10) / (dist + 50);
      if (score > bestScore) {
        bestScore = score;
        best = s;
      }
    }
    return best;
  }

  findThreateningBullet(bullets) {
    for (const b of bullets) {
      if (b.ownerId === this.bot.id || b.isDead) continue;
      const dist = Math.hypot(b.x - this.bot.x, b.y - this.bot.y);
      if (dist < 220) {
        // Check if moving towards bot
        const toBotX = this.bot.x - b.x;
        const toBotY = this.bot.y - b.y;
        const dot = b.vx * toBotX + b.vy * toBotY;
        if (dot > 0) return b;
      }
    }
    return null;
  }

  executeBehavior(dt, incomingBullet) {
    let moveDirX = 0;
    let moveDirY = 0;
    let aimX = this.bot.x + Math.cos(this.bot.aimAngle) * 100;
    let aimY = this.bot.y + Math.sin(this.bot.aimAngle) * 100;
    let shouldFire = false;

    if (this.state === 'FLEEING' && this.target) {
      // Run away from threat
      const enemy = this.target.player;
      const angleAway = Math.atan2(this.bot.y - enemy.y, this.bot.x - enemy.x);
      moveDirX = Math.cos(angleAway);
      moveDirY = Math.sin(angleAway);

      // Shoot behind to propel forward with recoil and damage pursuer
      aimX = enemy.x;
      aimY = enemy.y;
      shouldFire = true;
    } else if (this.state === 'COMBAT' && this.target) {
      const enemy = this.target.player;
      const dx = enemy.x - this.bot.x;
      const dy = enemy.y - this.bot.y;
      const dist = Math.hypot(dx, dy) || 1;
      const angle = Math.atan2(dy, dx);

      // Lead aim prediction
      const bulletSpeed = (this.bot.classDef.barrels?.[0]?.speed || 7.5) * (1 + this.bot.stats.bulletSpeed * 0.14);
      const timeToHit = dist / bulletSpeed;
      aimX = enemy.x + enemy.vx * timeToHit * 0.7;
      aimY = enemy.y + enemy.vy * timeToHit * 0.7;
      shouldFire = true;

      // Movement: rammer charges in, shooter maintains kiting distance
      if (this.bot.classDef.isMeleeOnly || this.archetype === 'RAMMER') {
        moveDirX = Math.cos(angle);
        moveDirY = Math.sin(angle);
      } else {
        const idealDist = this.archetype === 'SNIPER' ? 500 : 320;
        if (dist > idealDist + 60) {
          moveDirX = Math.cos(angle);
          moveDirY = Math.sin(angle);
        } else if (dist < idealDist - 60) {
          moveDirX = -Math.cos(angle);
          moveDirY = -Math.sin(angle);
        } else {
          // Circle / strafe
          const strafeAngle = angle + (Math.PI / 2) * this.strafeDir;
          moveDirX = Math.cos(strafeAngle);
          moveDirY = Math.sin(strafeAngle);
        }
      }
    } else if (this.state === 'FARMING') {
      if (this.target) {
        const dx = this.target.x - this.bot.x;
        const dy = this.target.y - this.bot.y;
        const dist = Math.hypot(dx, dy) || 1;
        const angle = Math.atan2(dy, dx);

        aimX = this.target.x;
        aimY = this.target.y;
        shouldFire = true;

        if (this.bot.classDef.isMeleeOnly) {
          // Ram into shape
          moveDirX = Math.cos(angle);
          moveDirY = Math.sin(angle);
        } else if (dist > 180) {
          moveDirX = Math.cos(angle);
          moveDirY = Math.sin(angle);
        } else {
          // Strafe around shape while blasting
          const strafeAngle = angle + (Math.PI / 2) * this.strafeDir;
          moveDirX = Math.cos(strafeAngle) * 0.6;
          moveDirY = Math.sin(strafeAngle) * 0.6;
        }
      } else {
        // Wander toward arena center nest
        const centerDx = CONFIG.ARENA.WIDTH / 2 - this.bot.x;
        const centerDy = CONFIG.ARENA.HEIGHT / 2 - this.bot.y;
        const dist = Math.hypot(centerDx, centerDy) || 1;
        moveDirX = centerDx / dist;
        moveDirY = centerDy / dist;
      }
    }

    // Dodge reflex: dodge perpendicular to incoming fire
    if (incomingBullet) {
      const bAngle = Math.atan2(incomingBullet.vy, incomingBullet.vx);
      const dodgeAngle = bAngle + (Math.PI / 2) * this.strafeDir;
      moveDirX = moveDirX * 0.3 + Math.cos(dodgeAngle) * 0.7;
      moveDirY = moveDirY * 0.3 + Math.sin(dodgeAngle) * 0.7;
    }

    // Apply movement acceleration
    const norm = Math.hypot(moveDirX, moveDirY);
    if (norm > 0) {
      const spd = this.bot.speed * 0.35;
      this.bot.vx += (moveDirX / norm) * spd * dt;
      this.bot.vy += (moveDirY / norm) * spd * dt;
    }

    // Update aim angle & target point
    this.bot.aimAngle = Math.atan2(aimY - this.bot.y, aimX - this.bot.x);
    this.isFiring = shouldFire;
    this.targetAim = { x: aimX, y: aimY };
  }
}
