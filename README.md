# ⚡ NEONBLAST.IO - Cyber Tank Arena

A high-intensity, glowing neon multiplayer `.io` game built with pure modern web technologies (HTML5 Canvas, ES6 Modules, Web Audio API, and WebRTC PeerJS). 

**100% serverless and static — ready to host worldwide on GitHub Pages for free with zero backend maintenance!**

![Neonblast Banner](https://img.shields.io/badge/Status-Playable-00f2fe?style=for-the-badge) ![GitHub Pages](https://img.shields.io/badge/Hosting-GitHub%20Pages-ff0844?style=for-the-badge) ![WebRTC P2P](https://img.shields.io/badge/Multiplayer-WebRTC%20PeerJS-b100ff?style=for-the-badge)

---

## 🎮 Key Features

- **Instant Play**: Enter a call-sign, select your neon vessel color, and jump straight into a 50-player arena lobby.
- **Smart Reactive Bots**: Dynamic AI bots with distinct personalities (Aggressive, Sniper, Farmer, Rammer) that navigate the arena, farm shapes, dodge incoming fire, allocate stats, and evolve their hulls.
- **WebRTC P2P Multiplayer (PeerJS)**: Host private arenas with a 6-character room code or one-click shareable URL (`?room=XYZ123`). Friends can join your lobby and duel in real time using direct peer-to-peer data channels.
- **Deep Progression & Evolution System**:
  - **8 Upgradable Stats**: Health Regen, Max Health, Body Damage, Bullet Speed, Penetration, Bullet Damage, Reload Rate, Movement Speed.
  - **4 Progression Tiers & 15+ Classes**: Basic Tank, Twin, Sniper, Machine Gun, Flank Guard, Triple Shot, Quad Tank, Assassin, Destroyer, Gunner, Tri-Angle, Overseer (Drone Carrier), Smasher (Melee Spikes), Octo Tank, Annihilator, Overlord, Railgun, Streamliner, Hybrid, Booster, and Mega Smasher.
- **Procedural Synthesizer Audio**: Web Audio API generates crisp laser blasts, heavy cannon thuds, impact clicks, level-up fanfares, and explosive rumbles directly in code with zero external audio assets.
- **Cross-Platform Responsive Controls**: Full keyboard & mouse support for desktops, plus dual virtual touch joysticks for mobile phones and tablets.
- **Dynamic Minimap & HUD**: Real-time top 10 leaderboard, live kill announcements, floating damage numbers, neon bloom, and an Alpha Pentagon boss nest in the center of the arena.

---

## 🚀 How to Host on GitHub Pages (Step-by-Step)

Because this game has zero server-side dependencies and requires no build step, you can host it directly on GitHub Pages in under a minute:

### Option A: Standard GitHub Pages (Recommended)
1. **Push this repository to GitHub**:
   ```bash
   git add .
   git commit -m "Initial commit of Neonblast.io"
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
   git push -u origin master
   ```
2. In your GitHub repository, click on **Settings** (top navigation).
3. Scroll down to **Pages** in the left sidebar (under "Code and automation").
4. Under **Build and deployment**:
   - **Source**: Select `Deploy from a branch`
   - **Branch**: Select `master` (or `main`) and `/ (root)`
   - Click **Save**.
5. Within 1–2 minutes, GitHub will display your live game URL:
   `https://YOUR_USERNAME.github.io/YOUR_REPOSITORY/`

### Option B: Automated GitHub Actions
A `.github/workflows/deploy.yml` workflow is included. If your repository settings are set to **Source: GitHub Actions**, it will automatically build and publish your game on every push!

---

## 💻 Running Locally

You can test and play the game locally using any static web server:

### Using Node / npx:
```bash
npx serve .
```

### Using Python:
```bash
python -m http.server 8000
```
Then open `http://localhost:8000` in your browser.

*(Note: Modern ES6 modules require an HTTP/HTTPS context rather than `file://` to load script modules).*

---

## 🕹️ Controls & Hotkeys

| Action | Desktop Control | Mobile / Touch |
| :--- | :--- | :--- |
| **Move** | <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> or Arrow Keys | Left Virtual Joystick |
| **Aim** | Mouse Cursor | Right Virtual Joystick |
| **Fire** | Left Click or <kbd>Spacebar</kbd> | Right Joystick Drag / Touch |
| **Auto-Fire** | <kbd>E</kbd> | Toggle on screen |
| **Auto-Spin** | <kbd>C</kbd> | — |
| **Repel Drones** | Right Click or <kbd>Shift</kbd> | — |
| **Stat Upgrades** | Keys <kbd>1</kbd> through <kbd>8</kbd> | Click `+` button in HUD |
| **Toggle Audio** | <kbd>M</kbd> or Top-Left Speaker Icon | Tap Top-Left Speaker Icon |

---

## 🛠️ Project Structure

```
├── index.html                  # HTML5 Game canvas, HUD overlays, modals & entry point
├── css/
│   └── style.css               # Cyberpunk styling, neon glassmorphism & responsive layout
├── js/
│   ├── config.js               # Arena dimensions, shapes, classes & upgrade balances
│   ├── audio.js                # Procedural Web Audio API sound generator
│   ├── input.js                # Keyboard, mouse, and mobile virtual dual joystick handler
│   ├── game.js                 # Main simulation loop, spatial grid & particle system
│   ├── entities/
│   │   ├── Entity.js           # Base physics body with elastic collision response
│   │   ├── Shape.js            # Ambient regular polygons (Square, Triangle, Pentagon, Alpha)
│   │   ├── Bullet.js           # Laser shells with penetration and recoil impulse
│   │   ├── Drone.js            # Escort & hunter combat drones for carrier classes
│   │   └── Player.js           # Tank vessel with upgrades, barrels, XP curve & evolutions
│   ├── ai/
│   │   └── BotController.js    # AI state machine (Farming, Combat, Fleeing, Dodging)
│   ├── network/
│   │   └── NetworkManager.js   # PeerJS WebRTC peer-to-peer data sync & room code broker
│   └── ui/
│       └── HUD.js              # Leaderboard, kill feed, stat upgrades & minimap
└── .github/workflows/
    └── deploy.yml              # Automated GitHub Actions deployment to GitHub Pages
```

---

## 🌐 Multiplayer Architecture

- **Solo Mode**: Plays immediately offline or online with 25+ intelligent bots.
- **Host Room**: One player clicks "Host Multiplayer Room" to become the authoritative simulation host. The game generates a unique room code and creates a WebRTC DataChannel via PeerJS.
- **Join Room**: Friends enter the 6-character room code or click the direct URL (`https://yourname.github.io/repo/?room=ABC123`) to join the host's arena.
- **Zero Hosting Fees**: Leverages public STUN and PeerJS signaling servers so no VPS, Node.js server, or cloud hosting is required!

---

## 📜 License

MIT License. Free to use, fork, modify, and host on GitHub Pages!
