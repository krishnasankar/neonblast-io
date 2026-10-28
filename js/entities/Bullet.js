// ============================================================================
// NEONBLAST.IO - Projectiles & Laser Shells
// ============================================================================

import { Entity } from './Entity.js';

export class Bullet extends Entity {
  constructor(x, y, angle, speed, damage, penetration, radius = 9, ownerId = null, color = '#00f2fe', glow = '#00f2fe') {
    super(x, y, radius, damage / 5);

    this.ownerId = ownerId;
    this.angle = angle;
    this.speed = speed;
    this.damage = damage;
    this.penetration = penetration;
    this.maxPenetration = penetration;
    this.color = color;
    this.glow = glow;

    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.friction = 0.998; // Low friction for bullets

    this.lifespan = 130; // Frames before disappearing
    this.age = 0;
    this.trail = [];
  }

  update(dt = 1) {
    this.age += dt;
    if (this.age >= this.lifespan) {
      this.isDead = true;
      return;
    }

    // Save trail history
    this.trail.unshift({ x: this.x, y: this.y, alpha: 1.0 });
    if (this.trail.length > 5) {
      this.trail.pop();
    }

    super.update(dt);
  }

  // Hit target, deal damage and reduce penetration
  hit(target) {
    const targetDamage = target.bodyDamage || 10;
    const damageToDeal = Math.min(this.penetration * 20, this.damage);

    const isKilled = target.takeDamage(damageToDeal, this.ownerId);

    // Bullet loses durability equal to target resistance
    this.penetration -= targetDamage / 25;
    if (this.penetration <= 0) {
      this.isDead = true;
    }

    return isKilled;
  }

  render(ctx) {
    ctx.save();

    // Draw glowing motion trail
    for (let i = 0; i < this.trail.length; i++) {
      const pt = this.trail[i];
      const trailAlpha = (1 - i / this.trail.length) * 0.35;
      const trailRadius = this.radius * (1 - i / this.trail.length * 0.4);

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, trailRadius, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.globalAlpha = trailAlpha;
      ctx.fill();
    }

    ctx.globalAlpha = 1.0;
    ctx.shadowColor = this.glow;
    ctx.shadowBlur = 12;

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    ctx.restore();
  }
}
