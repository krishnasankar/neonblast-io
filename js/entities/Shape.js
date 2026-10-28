// ============================================================================
// NEONBLAST.IO - Ambient Geometric Shapes (Food & XP)
// ============================================================================

import { Entity } from './Entity.js';
import { CONFIG } from '../config.js';

export class Shape extends Entity {
  constructor(x, y, shapeTypeKey = 'SQUARE') {
    const def = CONFIG.SHAPES[shapeTypeKey] || CONFIG.SHAPES.SQUARE;
    super(x, y, def.radius, def.health / 10);

    this.typeKey = shapeTypeKey;
    this.sides = def.sides;
    this.maxHealth = def.health;
    this.health = def.health;
    this.xp = def.xp;
    this.score = def.score;
    this.bodyDamage = def.bodyDamage;
    this.color = def.color;
    this.glow = def.glow;

    // Ambient floating & rotation
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.03;
    const speed = Math.random() * 0.4 + 0.1;
    const moveAngle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(moveAngle) * speed;
    this.vy = Math.sin(moveAngle) * speed;

    this.friction = 0.985;
    this.wobble = 0;
  }

  update(dt = 1) {
    this.rotation += this.rotationSpeed * dt;
    if (this.wobble > 0) {
      this.wobble = Math.max(0, this.wobble - 0.1 * dt);
    }
    super.update(dt);
  }

  takeDamage(amount, attacker = null) {
    this.wobble = 0.4;
    return super.takeDamage(amount, attacker);
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    // Apply hit wobble scale
    if (this.wobble > 0) {
      const s = 1 + Math.sin(this.wobble * Math.PI * 4) * 0.12;
      ctx.scale(s, s);
    }

    // Outer glow
    ctx.shadowColor = this.glow;
    ctx.shadowBlur = this.typeKey === 'ALPHA_PENTAGON' ? 25 : 12;

    ctx.beginPath();
    const step = (Math.PI * 2) / this.sides;
    for (let i = 0; i < this.sides; i++) {
      const angle = i * step;
      const px = Math.cos(angle) * this.radius;
      const py = Math.sin(angle) * this.radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();

    if (this.hitFlash > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#ffffff';
    } else {
      ctx.fillStyle = this.color;
      ctx.strokeStyle = '#ffffff';
    }

    ctx.lineWidth = 3;
    ctx.fill();
    ctx.stroke();

    // Inner detail for Alpha Pentagon
    if (this.typeKey === 'ALPHA_PENTAGON') {
      ctx.beginPath();
      for (let i = 0; i < this.sides; i++) {
        const angle = i * step + Math.PI;
        const px = Math.cos(angle) * (this.radius * 0.45);
        const py = Math.sin(angle) * (this.radius * 0.45);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }

    ctx.restore();

    // Render health bar if damaged
    this.renderHealthBar(ctx, 10);
  }
}
