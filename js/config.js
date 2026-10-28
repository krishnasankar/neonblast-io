// ============================================================================
// NEONBLAST.IO - Configuration & Game Constants
// ============================================================================

export const CONFIG = {
  // Arena settings
  ARENA: {
    WIDTH: 5000,
    HEIGHT: 5000,
    GRID_SIZE: 50,
    WALL_BOUNCE: 0.8,
    SAFE_ZONE_RADIUS: 250, // Arena center with Alpha Pentagon nest
  },

  // Game loop & balance
  TICK_RATE: 60,
  DEFAULT_BOTS: 20,
  MAX_BOTS: 50,
  MAX_SHAPES: 320,
  ALPHA_PENTAGON_COUNT: 2,

  // Level & XP formulas
  LEVELS: {
    MAX_LEVEL: 45,
    BASE_XP: 30,
    XP_EXPONENT: 1.22,
    STAT_POINTS_PER_LEVEL: 1,
    MAX_STAT_LEVEL: 7, // 7 points per stat max
  },

  // Upgrade definitions (8 attributes)
  UPGRADES: [
    { id: 'healthRegen', name: 'Health Regen', key: '1', color: '#ff6b6b', icon: '❤️' },
    { id: 'maxHealth', name: 'Max Health', key: '2', color: '#f06595', icon: '🛡️' },
    { id: 'bodyDamage', name: 'Body Damage', key: '3', color: '#cc5de8', icon: '⚡' },
    { id: 'bulletSpeed', name: 'Bullet Speed', key: '4', color: '#845ef7', icon: '🚀' },
    { id: 'bulletPenetration', name: 'Bullet Penetration', key: '5', color: '#5c7cfa', icon: '🔱' },
    { id: 'bulletDamage', name: 'Bullet Damage', key: '6', color: '#339af0', icon: '💥' },
    { id: 'reload', name: 'Reload Rate', key: '7', color: '#22b8cf', icon: '⏱️' },
    { id: 'movementSpeed', name: 'Movement Speed', key: '8', color: '#20c997', icon: '💨' },
  ],

  // Shape Definitions (Spawnable ambient food & XP)
  SHAPES: {
    SQUARE: {
      sides: 4,
      radius: 16,
      health: 30,
      xp: 15,
      score: 10,
      bodyDamage: 8,
      color: '#ffe066',
      glow: '#ffd43b',
      weight: 60, // Spawn weight
    },
    TRIANGLE: {
      sides: 3,
      radius: 18,
      health: 70,
      xp: 40,
      score: 25,
      bodyDamage: 14,
      color: '#ff922b',
      glow: '#f76707',
      weight: 25,
    },
    PENTAGON: {
      sides: 5,
      radius: 28,
      health: 220,
      xp: 180,
      score: 130,
      bodyDamage: 22,
      color: '#4dabf7',
      glow: '#339af0',
      weight: 12,
    },
    ALPHA_PENTAGON: {
      sides: 5,
      radius: 80,
      health: 3500,
      xp: 3200,
      score: 3000,
      bodyDamage: 45,
      color: '#cc5de8',
      glow: '#ae3ec9',
      weight: 0, // Spawned in special nest center
    },
    GREEN_GEM: {
      sides: 6,
      radius: 14,
      health: 120,
      xp: 1000,
      score: 1000,
      bodyDamage: 20,
      color: '#51cf66',
      glow: '#40c057',
      weight: 3, // Rare gem
    }
  },

  // Player Color Palette Options
  PLAYER_COLORS: [
    { name: 'Neon Cyan', body: '#00f2fe', barrel: '#009ffd', glow: 'rgba(0, 242, 254, 0.6)' },
    { name: 'Neon Crimson', body: '#ff0844', barrel: '#ff4e50', glow: 'rgba(255, 8, 68, 0.6)' },
    { name: 'Cyber Violet', body: '#b100ff', barrel: '#7928ca', glow: 'rgba(177, 0, 255, 0.6)' },
    { name: 'Electric Lime', body: '#00ff87', barrel: '#60efff', glow: 'rgba(0, 255, 135, 0.6)' },
    { name: 'Solar Amber', body: '#f6d365', barrel: '#fda085', glow: 'rgba(246, 211, 101, 0.6)' },
    { name: 'Hyper Orange', body: '#ff5858', barrel: '#f09819', glow: 'rgba(255, 88, 88, 0.6)' },
    { name: 'Cosmic Pink', body: '#f77062', barrel: '#fe5196', glow: 'rgba(254, 81, 150, 0.6)' },
  ],

  // Bot Names for lively arena simulation
  BOT_NAMES: [
    'NovaStrike', 'CyberViper', 'QuantumGamer', 'ShadowRox', 'Vortex99',
    'ApexPredator', 'NeonSamurai', 'HyperGlitch', 'StarDrifter', 'ZeroCool',
    'PixelReaper', 'ChronoTrigger', 'VoidWalker', 'Aetherium', 'FluxCapacitor',
    'LaserRaptor', 'DarkMatter', 'TurboTitan', 'MatrixNeo', 'BlazeFalcon',
    'OmegaByte', 'GhostShell', 'EchoPulse', 'Solaris', 'CosmoRider'
  ],

  // Class Evolution Trees
  CLASSES: {
    // TIER 1
    basic: {
      name: 'Basic Tank',
      tier: 1,
      minLevel: 1,
      description: 'Standard single-barrel combat vessel.',
      bodyRadius: 22,
      baseSpeed: 3.4,
      barrels: [
        { length: 40, width: 16, angle: 0, recoil: 0.15, spread: 0.03, reloadTime: 22, damage: 20, speed: 7.5, pen: 1 }
      ],
      evolutions: ['twin', 'sniper', 'machine_gun', 'flank_guard']
    },

    // TIER 2 (Level 10)
    twin: {
      name: 'Twin',
      tier: 2,
      minLevel: 10,
      description: 'Dual parallel barrels with rapid alternate firing.',
      bodyRadius: 22,
      baseSpeed: 3.3,
      barrels: [
        { length: 40, width: 14, angle: 0, offset: -8, recoil: 0.12, spread: 0.04, reloadTime: 20, damage: 16, speed: 7.5, pen: 1, delay: 0 },
        { length: 40, width: 14, angle: 0, offset: 8, recoil: 0.12, spread: 0.04, reloadTime: 20, damage: 16, speed: 7.5, pen: 1, delay: 10 }
      ],
      evolutions: ['triple_shot', 'quad_tank']
    },

    sniper: {
      name: 'Sniper',
      tier: 2,
      minLevel: 10,
      description: 'Extended barrel delivering high-velocity, lethal rounds.',
      bodyRadius: 22,
      baseSpeed: 3.2,
      zoomMultiplier: 1.25,
      barrels: [
        { length: 55, width: 15, angle: 0, recoil: 0.25, spread: 0.01, reloadTime: 42, damage: 38, speed: 11.0, pen: 1.4 }
      ],
      evolutions: ['assassin', 'overseer']
    },

    machine_gun: {
      name: 'Machine Gun',
      tier: 2,
      minLevel: 10,
      description: 'Conical barrel firing high-volume rapid spray.',
      bodyRadius: 22,
      baseSpeed: 3.3,
      barrels: [
        { length: 38, width: 22, taper: 1.4, angle: 0, recoil: 0.14, spread: 0.16, reloadTime: 12, damage: 13, speed: 7.2, pen: 0.9 }
      ],
      evolutions: ['destroyer', 'gunner']
    },

    flank_guard: {
      name: 'Flank Guard',
      tier: 2,
      minLevel: 10,
      description: 'Equipped with forward and rear defense cannons.',
      bodyRadius: 22,
      baseSpeed: 3.4,
      barrels: [
        { length: 40, width: 16, angle: 0, recoil: 0.15, spread: 0.03, reloadTime: 22, damage: 20, speed: 7.5, pen: 1 },
        { length: 34, width: 16, angle: Math.PI, recoil: 0.15, spread: 0.03, reloadTime: 22, damage: 18, speed: 7.5, pen: 1 }
      ],
      evolutions: ['tri_angle', 'smasher']
    },

    // TIER 3 (Level 25)
    triple_shot: {
      name: 'Triple Shot',
      tier: 3,
      minLevel: 25,
      description: 'Three forward barrels covering a broad firing arc.',
      bodyRadius: 24,
      baseSpeed: 3.2,
      barrels: [
        { length: 42, width: 14, angle: 0, recoil: 0.12, spread: 0.04, reloadTime: 22, damage: 18, speed: 8.0, pen: 1.1 },
        { length: 38, width: 14, angle: 0.45, recoil: 0.12, spread: 0.04, reloadTime: 22, damage: 18, speed: 8.0, pen: 1.1 },
        { length: 38, width: 14, angle: -0.45, recoil: 0.12, spread: 0.04, reloadTime: 22, damage: 18, speed: 8.0, pen: 1.1 }
      ],
      evolutions: ['octo_tank', 'streamliner']
    },

    quad_tank: {
      name: 'Quad Tank',
      tier: 3,
      minLevel: 25,
      description: 'Barrels in 4 cardinal directions for all-around barrage.',
      bodyRadius: 24,
      baseSpeed: 3.2,
      barrels: [
        { length: 40, width: 15, angle: 0, recoil: 0.12, spread: 0.04, reloadTime: 22, damage: 18, speed: 7.8, pen: 1.1 },
        { length: 40, width: 15, angle: Math.PI / 2, recoil: 0.12, spread: 0.04, reloadTime: 22, damage: 18, speed: 7.8, pen: 1.1 },
        { length: 40, width: 15, angle: Math.PI, recoil: 0.12, spread: 0.04, reloadTime: 22, damage: 18, speed: 7.8, pen: 1.1 },
        { length: 40, width: 15, angle: -Math.PI / 2, recoil: 0.12, spread: 0.04, reloadTime: 22, damage: 18, speed: 7.8, pen: 1.1 }
      ],
      evolutions: ['octo_tank']
    },

    assassin: {
      name: 'Assassin',
      tier: 3,
      minLevel: 25,
      description: 'Specialized long-range sniper with enhanced radar zoom.',
      bodyRadius: 23,
      baseSpeed: 3.1,
      zoomMultiplier: 1.45,
      barrels: [
        { length: 65, width: 15, angle: 0, recoil: 0.3, spread: 0.005, reloadTime: 48, damage: 56, speed: 13.0, pen: 1.8 }
      ],
      evolutions: ['railgun']
    },

    destroyer: {
      name: 'Destroyer',
      tier: 3,
      minLevel: 25,
      description: 'Fires massive, devastating heavy shells with strong recoil.',
      bodyRadius: 25,
      baseSpeed: 3.1,
      barrels: [
        { length: 44, width: 32, angle: 0, recoil: 0.55, spread: 0.02, reloadTime: 55, damage: 75, speed: 6.8, pen: 2.5, bulletRadius: 18 }
      ],
      evolutions: ['annihilator', 'hybrid']
    },

    gunner: {
      name: 'Gunner',
      tier: 3,
      minLevel: 25,
      description: 'Four rapid micro-cannons suppressing enemy targets.',
      bodyRadius: 23,
      baseSpeed: 3.3,
      barrels: [
        { length: 36, width: 9, angle: 0, offset: -9, recoil: 0.06, spread: 0.06, reloadTime: 16, damage: 11, speed: 8.5, pen: 0.8, delay: 0 },
        { length: 36, width: 9, angle: 0, offset: 9, recoil: 0.06, spread: 0.06, reloadTime: 16, damage: 11, speed: 8.5, pen: 0.8, delay: 4 },
        { length: 32, width: 9, angle: 0, offset: -4, recoil: 0.06, spread: 0.06, reloadTime: 16, damage: 11, speed: 8.5, pen: 0.8, delay: 8 },
        { length: 32, width: 9, angle: 0, offset: 4, recoil: 0.06, spread: 0.06, reloadTime: 16, damage: 11, speed: 8.5, pen: 0.8, delay: 12 }
      ],
      evolutions: ['streamliner']
    },

    tri_angle: {
      name: 'Tri-Angle',
      tier: 3,
      minLevel: 25,
      description: 'Forward blaster with dual rear thrusters for supersonic mobility.',
      bodyRadius: 23,
      baseSpeed: 3.8,
      barrels: [
        { length: 40, width: 16, angle: 0, recoil: 0.15, spread: 0.03, reloadTime: 22, damage: 22, speed: 8.0, pen: 1.1 },
        { length: 30, width: 14, angle: Math.PI - 0.45, recoil: 0.28, spread: 0.05, reloadTime: 16, damage: 12, speed: 7.0, pen: 0.8, isThruster: true },
        { length: 30, width: 14, angle: -Math.PI + 0.45, recoil: 0.28, spread: 0.05, reloadTime: 16, damage: 12, speed: 7.0, pen: 0.8, isThruster: true }
      ],
      evolutions: ['booster']
    },

    overseer: {
      name: 'Overseer',
      tier: 3,
      minLevel: 25,
      description: 'Deploys and commands autonomous hunter drones.',
      bodyRadius: 24,
      baseSpeed: 3.2,
      isDroneSpawner: true,
      maxDrones: 6,
      droneReload: 45,
      barrels: [
        { length: 28, width: 26, taper: 1.3, angle: Math.PI / 2, isDroneSpawnerBarrel: true },
        { length: 28, width: 26, taper: 1.3, angle: -Math.PI / 2, isDroneSpawnerBarrel: true }
      ],
      evolutions: ['overlord']
    },

    smasher: {
      name: 'Smasher',
      tier: 3,
      minLevel: 25,
      description: 'Armed with spinning armored spikes. Ramming power maximized.',
      bodyRadius: 28,
      baseSpeed: 3.7,
      isMeleeOnly: true,
      spikes: 8,
      bodyDamageMultiplier: 2.2,
      maxHealthMultiplier: 1.6,
      barrels: [],
      evolutions: ['mega_smasher']
    },

    // TIER 4 (Level 40)
    octo_tank: {
      name: 'Octo Tank',
      tier: 4,
      minLevel: 40,
      description: 'Eight barrels unleashing a 360-degree storm of fire.',
      bodyRadius: 26,
      baseSpeed: 3.1,
      barrels: [
        { length: 38, width: 15, angle: 0, recoil: 0.08, spread: 0.03, reloadTime: 20, damage: 18, speed: 8.0, pen: 1.1 },
        { length: 38, width: 15, angle: Math.PI / 4, recoil: 0.08, spread: 0.03, reloadTime: 20, damage: 18, speed: 8.0, pen: 1.1 },
        { length: 38, width: 15, angle: Math.PI / 2, recoil: 0.08, spread: 0.03, reloadTime: 20, damage: 18, speed: 8.0, pen: 1.1 },
        { length: 38, width: 15, angle: 3 * Math.PI / 4, recoil: 0.08, spread: 0.03, reloadTime: 20, damage: 18, speed: 8.0, pen: 1.1 },
        { length: 38, width: 15, angle: Math.PI, recoil: 0.08, spread: 0.03, reloadTime: 20, damage: 18, speed: 8.0, pen: 1.1 },
        { length: 38, width: 15, angle: -3 * Math.PI / 4, recoil: 0.08, spread: 0.03, reloadTime: 20, damage: 18, speed: 8.0, pen: 1.1 },
        { length: 38, width: 15, angle: -Math.PI / 2, recoil: 0.08, spread: 0.03, reloadTime: 20, damage: 18, speed: 8.0, pen: 1.1 },
        { length: 38, width: 15, angle: -Math.PI / 4, recoil: 0.08, spread: 0.08, reloadTime: 20, damage: 18, speed: 8.0, pen: 1.1 }
      ],
      evolutions: []
    },

    annihilator: {
      name: 'Annihilator',
      tier: 4,
      minLevel: 40,
      description: 'Colossal cannon firing massive explosive rounds.',
      bodyRadius: 27,
      baseSpeed: 3.1,
      barrels: [
        { length: 46, width: 42, angle: 0, recoil: 0.7, spread: 0.02, reloadTime: 60, damage: 110, speed: 7.2, pen: 3.0, bulletRadius: 24 }
      ],
      evolutions: []
    },

    overlord: {
      name: 'Overlord',
      tier: 4,
      minLevel: 40,
      description: 'Commands 8 lethal combat drones in synchronized formation.',
      bodyRadius: 26,
      baseSpeed: 3.2,
      isDroneSpawner: true,
      maxDrones: 8,
      droneReload: 35,
      barrels: [
        { length: 28, width: 26, taper: 1.3, angle: 0, isDroneSpawnerBarrel: true },
        { length: 28, width: 26, taper: 1.3, angle: Math.PI / 2, isDroneSpawnerBarrel: true },
        { length: 28, width: 26, taper: 1.3, angle: Math.PI, isDroneSpawnerBarrel: true },
        { length: 28, width: 26, taper: 1.3, angle: -Math.PI / 2, isDroneSpawnerBarrel: true }
      ],
      evolutions: []
    },

    railgun: {
      name: 'Railgun Sniper',
      tier: 4,
      minLevel: 40,
      description: 'Fires high-velocity hyper-dense beams that pierce all targets.',
      bodyRadius: 24,
      baseSpeed: 3.1,
      zoomMultiplier: 1.6,
      barrels: [
        { length: 78, width: 14, angle: 0, recoil: 0.4, spread: 0.002, reloadTime: 52, damage: 85, speed: 16.0, pen: 3.5, bulletRadius: 9 }
      ],
      evolutions: []
    },

    streamliner: {
      name: 'Streamliner',
      tier: 4,
      minLevel: 40,
      description: 'Five layered cannons creating a relentless laser-like volley.',
      bodyRadius: 24,
      baseSpeed: 3.2,
      zoomMultiplier: 1.3,
      barrels: [
        { length: 65, width: 14, angle: 0, recoil: 0.05, spread: 0.02, reloadTime: 25, damage: 16, speed: 9.5, pen: 1.1, delay: 0 },
        { length: 55, width: 16, angle: 0, recoil: 0.05, spread: 0.02, reloadTime: 25, damage: 16, speed: 9.5, pen: 1.1, delay: 5 },
        { length: 47, width: 18, angle: 0, recoil: 0.05, spread: 0.02, reloadTime: 25, damage: 16, speed: 9.5, pen: 1.1, delay: 10 },
        { length: 39, width: 20, angle: 0, recoil: 0.05, spread: 0.02, reloadTime: 25, damage: 16, speed: 9.5, pen: 1.1, delay: 15 },
        { length: 31, width: 22, angle: 0, recoil: 0.05, spread: 0.02, reloadTime: 25, damage: 16, speed: 9.5, pen: 1.1, delay: 20 }
      ],
      evolutions: []
    },

    hybrid: {
      name: 'Hybrid',
      tier: 4,
      minLevel: 40,
      description: 'Destroyer front cannon combined with autonomous rear defense drones.',
      bodyRadius: 26,
      baseSpeed: 3.1,
      isDroneSpawner: true,
      maxDrones: 2,
      droneReload: 40,
      barrels: [
        { length: 45, width: 34, angle: 0, recoil: 0.6, spread: 0.02, reloadTime: 56, damage: 85, speed: 7.0, pen: 2.8, bulletRadius: 20 },
        { length: 26, width: 24, taper: 1.3, angle: Math.PI, isDroneSpawnerBarrel: true }
      ],
      evolutions: []
    },

    booster: {
      name: 'Booster',
      tier: 4,
      minLevel: 40,
      description: 'Extreme propulsion tank with four high-output rear thrusters.',
      bodyRadius: 24,
      baseSpeed: 4.2,
      barrels: [
        { length: 42, width: 16, angle: 0, recoil: 0.16, spread: 0.03, reloadTime: 20, damage: 24, speed: 8.5, pen: 1.2 },
        { length: 34, width: 14, angle: Math.PI - 0.45, recoil: 0.32, spread: 0.05, reloadTime: 14, damage: 13, speed: 7.2, pen: 0.8, isThruster: true },
        { length: 34, width: 14, angle: -Math.PI + 0.45, recoil: 0.32, spread: 0.05, reloadTime: 14, damage: 13, speed: 7.2, pen: 0.8, isThruster: true },
        { length: 28, width: 12, angle: Math.PI - 0.25, recoil: 0.28, spread: 0.05, reloadTime: 14, damage: 11, speed: 7.0, pen: 0.7, isThruster: true },
        { length: 28, width: 12, angle: -Math.PI + 0.25, recoil: 0.28, spread: 0.05, reloadTime: 14, damage: 11, speed: 7.0, pen: 0.7, isThruster: true }
      ],
      evolutions: []
    },

    mega_smasher: {
      name: 'Mega Smasher',
      tier: 4,
      minLevel: 40,
      description: 'Gigantic spiked kinetic fortress. Unstoppable close-combat juggernaut.',
      bodyRadius: 34,
      baseSpeed: 3.9,
      isMeleeOnly: true,
      spikes: 12,
      bodyDamageMultiplier: 3.0,
      maxHealthMultiplier: 2.2,
      barrels: [],
      evolutions: []
    }
  }
};
