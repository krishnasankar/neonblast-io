// ============================================================================
// NEONBLAST.IO - Base Spatial Entity
// ============================================================================

import { CONFIG } from '../config.js';

export class Entity {
  constructor(x, y, radius = 20, mass = 1) {
    this.id = 'ent_' + Math.random().toString(36).substr(2, 9);
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = radius;
    this.mass = mass;
    this.friction = 0.92;

    this.maxHealth = 100;
    this.health = 100;
    this.bodyDamage = 10;
    this.isDead = false;

    // Flash white on damage
    this.hitFlash = 0;
  }

  update(dt = 1) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.vx *= Math.pow(this.friction, dt);
    this.vy *= Math.pow(this.friction, dt);

    if (this.hitFlash > 0) {
      this.hitFlash = Math.max(0, this.hitFlash - 0.08 * dt);
    }

    this.constrainToBounds();
  }

  constrainToBounds() {
    const pad = this.radius;
    const maxX = CONFIG.ARENA.WIDTH;
    const maxY = CONFIG.ARENA.HEIGHT;

    if (this.x < pad) {
      this.x = pad;
      this.vx = -this.vx * CONFIG.ARENA.WALL_BOUNCE;
    } else if (this.x > maxX - pad) {
      this.x = maxX - pad;
      this.vx = -this.vx * CONFIG.ARENA.WALL_BOUNCE;
    }

    if (this.y < pad) {
      this.y = pad;
      this.vy = -this.vy * CONFIG.ARENA.WALL_BOUNCE;
    } else if (this.y > maxY - pad) {
      this.y = maxY - pad;
      this.vy = -this.vy * CONFIG.ARENA.WALL_BOUNCE;
    }
  }

  takeDamage(amount, attacker = null) {
    if (this.isDead) return false;
    this.health -= amount;
    this.hitFlash = 1.0;
    if (this.health <= 0) {
      this.health = 0;
      this.isDead = true;
      return true; // Fatal blow
    }
    return false;
  }

  // Draw health bar above entity
  renderHealthBar(ctx, offsetY = 12) {
    if (this.health >= this.maxHealth) return; // Don't show if full health

    const barWidth = Math.max(34, this.radius * 1.8);
    const barHeight = 4.5;
    const barX = this.x - barWidth / 2;
    const barY = this.y + this.radius + offsetY;

    const healthRatio = Math.max(0, Math.min(1, this.health / this.maxHealth));

    ctx.save();
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2, 2);
    } else {
      ctx.rect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);
    }
    ctx.fill();

    // Health Fill
    ctx.fillStyle = healthRatio > 0.5 ? '#00ff87' : healthRatio > 0.25 ? '#ffd43b' : '#ff0844';
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(barX, barY, Math.max(0, barWidth * healthRatio), barHeight, 1.5);
    } else {
      ctx.rect(barX, barY, Math.max(0, barWidth * healthRatio), barHeight);
    }
    ctx.fill();
    ctx.restore();
  }

  // Elastic collision impulse with another circular entity
  resolveCollision(other) {
    const dx = other.x - this.x;
    const dy = other.y - this.y;
    const dist = Math.hypot(dx, dy);
    const minDist = this.radius + other.radius;

    if (dist > 0 && dist < minDist) {
      const overlap = minDist - dist;
      const nx = dx / dist;
      const ny = dy / dist;

      // Separate based on relative mass
      const totalMass = this.mass + other.mass;
      const m1Ratio = other.mass / totalMass;
      const m2Ratio = this.mass / totalMass;

      this.x -= nx * overlap * m1Ratio;
      this.y -= ny * overlap * m1Ratio;
      other.x += nx * overlap * m2Ratio;
      other.y += ny * overlap * m2Ratio;

      // Relative velocity
      const rvx = other.vx - this.vx;
      const rvy = other.vy - this.vy;
      const velAlongNormal = rvx * nx + rvy * ny;

      // Do not resolve if velocities are separating
      if (velAlongNormal > 0) return;

      const restitution = 0.6;
      const impulse = (-(1 + restitution) * velAlongNormal) / (1 / this.mass + 1 / other.mass);

      this.vx -= (impulse / this.mass) * nx;
      this.vy -= (impulse / this.mass) * ny;
      other.vx += (impulse / other.mass) * nx;
      other.vy += (impulse / other.mass) * ny;
    }
  }
}
