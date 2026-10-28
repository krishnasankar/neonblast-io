// ============================================================================
// NEONBLAST.IO - Autonomous Escort & Attack Drones
// ============================================================================

import { Entity } from './Entity.js';

export class Drone extends Entity {
  constructor(x, y, owner) {
    super(x, y, 11, 2);

    this.owner = owner;
    this.maxHealth = 45;
    this.health = 45;
    this.bodyDamage = 26;
    this.friction = 0.94;
    this.speed = 5.8;
    this.angle = Math.random() * Math.PI * 2;
    this.orbitAngle = Math.random() * Math.PI * 2;
    this.color = owner.color.body;
    this.glow = owner.color.glow;
  }

  update(dt = 1, targetX = null, targetY = null, isRepelling = false) {
    this.orbitAngle += 0.04 * dt;

    let destX = this.owner.x;
    let destY = this.owner.y;

    if (isRepelling && targetX !== null && targetY !== null) {
      // Repel away from cursor point
      const dx = this.x - targetX;
      const dy = this.y - targetY;
      const d = Math.hypot(dx, dy) || 1;
      destX = this.x + (dx / d) * 300;
      destY = this.y + (dy / d) * 300;
    } else if (targetX !== null && targetY !== null) {
      // Fly directly to target point
      destX = targetX;
      destY = targetY;
    } else {
      // Default: Orbit smoothly around owner
      const orbitDist = 65 + (this.owner.bodyRadius || 22);
      destX = this.owner.x + Math.cos(this.orbitAngle) * orbitDist;
      destY = this.owner.y + Math.sin(this.orbitAngle) * orbitDist;
    }

    const toDx = destX - this.x;
    const toDy = destY - this.y;
    const dist = Math.hypot(toDx, toDy);

    if (dist > 5) {
      const moveSpeed = Math.min(this.speed, dist * 0.1);
      this.vx += (toDx / dist) * moveSpeed * 0.4;
      this.vy += (toDy / dist) * moveSpeed * 0.4;
      this.angle = Math.atan2(this.vy, this.vx);
    }

    super.update(dt);
  }

  hit(target) {
    const targetDamage = target.bodyDamage || 10;
    const damageToDeal = this.bodyDamage;
    const isKilled = target.takeDamage(damageToDeal, this.owner.id);

    this.takeDamage(targetDamage);
    return isKilled;
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    ctx.shadowColor = this.glow;
    ctx.shadowBlur = 10;

    // Draw glowing triangle drone
    ctx.beginPath();
    ctx.moveTo(this.radius * 1.3, 0);
    ctx.lineTo(-this.radius, -this.radius * 0.85);
    ctx.lineTo(-this.radius * 0.5, 0);
    ctx.lineTo(-this.radius, this.radius * 0.85);
    ctx.closePath();

    if (this.hitFlash > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#ffffff';
    } else {
      ctx.fillStyle = this.color;
      ctx.strokeStyle = '#ffffff';
    }

    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    this.renderHealthBar(ctx, 6);
  }
}
