// ============================================================================
// NEONBLAST.IO - User Input Manager (Keyboard, Mouse, Touch Joysticks)
// ============================================================================

export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = {};
    this.mouse = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      isDown: false,
      rightDown: false
    };

    // Toggles
    this.autoFire = false;
    this.autoSpin = false;
    this.spinAngle = 0;

    // Callbacks
    this.onUpgradeRequested = null; // func(index)

    // Touch joystick state
    this.touchEnabled = false;
    this.touchMove = { active: false, startX: 0, startY: 0, curX: 0, curY: 0, vx: 0, vy: 0 };
    this.touchAim = { active: false, startX: 0, startY: 0, curX: 0, curY: 0, angle: 0, isFiring: false };

    this.bindEvents();
  }

  bindEvents() {
    // Keyboard
    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
      this.keys[e.code] = true;

      // Auto-fire toggle 'E'
      if (e.key.toLowerCase() === 'e') {
        this.autoFire = !this.autoFire;
      }

      // Auto-spin toggle 'C'
      if (e.key.toLowerCase() === 'c') {
        this.autoSpin = !this.autoSpin;
      }

      // Number keys 1-8 for quick upgrade
      const num = parseInt(e.key, 10);
      if (!isNaN(num) && num >= 1 && num <= 8) {
        if (this.onUpgradeRequested) {
          this.onUpgradeRequested(num - 1);
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
      this.keys[e.code] = false;
    });

    // Mouse
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.mouse.isDown = true;
      } else if (e.button === 2) {
        this.mouse.rightDown = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.mouse.isDown = false;
      } else if (e.button === 2) {
        this.mouse.rightDown = false;
      }
    });

    // Prevent context menu in canvas to allow right-click abilities
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Window blur reset
    window.addEventListener('blur', () => {
      this.keys = {};
      this.mouse.isDown = false;
      this.mouse.rightDown = false;
    });

    // Touch support (Mobile)
    this.bindTouchEvents();
  }

  bindTouchEvents() {
    const handleTouchStart = (e) => {
      this.touchEnabled = true;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.clientX < window.innerWidth / 2) {
          // Left half -> movement joystick
          if (!this.touchMove.active) {
            this.touchMove.active = true;
            this.touchMove.identifier = touch.identifier;
            this.touchMove.startX = touch.clientX;
            this.touchMove.startY = touch.clientY;
            this.touchMove.curX = touch.clientX;
            this.touchMove.curY = touch.clientY;
            this.touchMove.vx = 0;
            this.touchMove.vy = 0;
          }
        } else {
          // Right half -> aim & shoot joystick
          if (!this.touchAim.active) {
            this.touchAim.active = true;
            this.touchAim.identifier = touch.identifier;
            this.touchAim.startX = touch.clientX;
            this.touchAim.startY = touch.clientY;
            this.touchAim.curX = touch.clientX;
            this.touchAim.curY = touch.clientY;
            this.touchAim.isFiring = true;
          }
        }
      }
    };

    const handleTouchMove = (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (this.touchMove.active && touch.identifier === this.touchMove.identifier) {
          this.touchMove.curX = touch.clientX;
          this.touchMove.curY = touch.clientY;
          const dx = touch.clientX - this.touchMove.startX;
          const dy = touch.clientY - this.touchMove.startY;
          const dist = Math.hypot(dx, dy);
          const maxDist = 55;
          if (dist > 0) {
            const factor = Math.min(dist, maxDist) / maxDist;
            this.touchMove.vx = (dx / dist) * factor;
            this.touchMove.vy = (dy / dist) * factor;
          }
        } else if (this.touchAim.active && touch.identifier === this.touchAim.identifier) {
          this.touchAim.curX = touch.clientX;
          this.touchAim.curY = touch.clientY;
          const dx = touch.clientX - this.touchAim.startX;
          const dy = touch.clientY - this.touchAim.startY;
          if (Math.hypot(dx, dy) > 8) {
            this.touchAim.angle = Math.atan2(dy, dx);
            this.touchAim.isFiring = true;
          }
        }
      }
    };

    const handleTouchEnd = (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (this.touchMove.active && touch.identifier === this.touchMove.identifier) {
          this.touchMove.active = false;
          this.touchMove.vx = 0;
          this.touchMove.vy = 0;
        } else if (this.touchAim.active && touch.identifier === this.touchAim.identifier) {
          this.touchAim.active = false;
          this.touchAim.isFiring = false;
        }
      }
    };

    this.canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    this.canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });
  }

  // Get movement direction normalized (dx, dy)
  getMovement() {
    if (this.touchMove.active) {
      return { x: this.touchMove.vx, y: this.touchMove.vy };
    }

    let x = 0;
    let y = 0;

    if (this.keys['w'] || this.keys['arrowup']) y -= 1;
    if (this.keys['s'] || this.keys['arrowdown']) y += 1;
    if (this.keys['a'] || this.keys['arrowleft']) x -= 1;
    if (this.keys['d'] || this.keys['arrowright']) x += 1;

    if (x !== 0 && y !== 0) {
      const invLen = 1 / Math.SQRT2;
      x *= invLen;
      y *= invLen;
    }

    return { x, y };
  }

  // Get current aim angle relative to player center on screen
  getAimAngle(playerScreenX, playerScreenY) {
    if (this.autoSpin) {
      this.spinAngle += 0.04;
      return this.spinAngle;
    }

    if (this.touchAim.active) {
      return this.touchAim.angle;
    }

    const dx = this.mouse.x - playerScreenX;
    const dy = this.mouse.y - playerScreenY;
    return Math.atan2(dy, dx);
  }

  isFiring() {
    if (this.touchAim.active) {
      return this.touchAim.isFiring;
    }
    return this.autoFire || this.mouse.isDown || !!this.keys['space'];
  }

  isRepelling() {
    return this.mouse.rightDown || !!this.keys['shiftleft'] || !!this.keys['shiftright'];
  }

  // Draw on-screen virtual joysticks when touch is active
  renderTouchJoysticks(ctx) {
    if (!this.touchEnabled) return;

    // Movement joystick
    if (this.touchMove.active) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.touchMove.startX, this.touchMove.startY, 50, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.strokeStyle = 'rgba(0, 242, 254, 0.4)';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      const stickX = this.touchMove.startX + this.touchMove.vx * 40;
      const stickY = this.touchMove.startY + this.touchMove.vy * 40;
      ctx.arc(stickX, stickY, 22, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 242, 254, 0.7)';
      ctx.shadowColor = '#00f2fe';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.restore();
    }

    // Aim joystick
    if (this.touchAim.active) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.touchAim.startX, this.touchAim.startY, 50, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.strokeStyle = 'rgba(255, 8, 68, 0.4)';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      const stickX = this.touchAim.startX + Math.cos(this.touchAim.angle) * 35;
      const stickY = this.touchAim.startY + Math.sin(this.touchAim.angle) * 35;
      ctx.arc(stickX, stickY, 22, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 8, 68, 0.7)';
      ctx.shadowColor = '#ff0844';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.restore();
    }
  }
}
