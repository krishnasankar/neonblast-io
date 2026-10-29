// ============================================================================
// NEONBLAST.IO - WebRTC Peer-to-Peer Multiplayer (via PeerJS)
// ============================================================================

export class NetworkManager {
  constructor(game) {
    this.game = game;
    this.peer = null;
    this.mode = 'SOLO'; // 'SOLO', 'HOST', 'CLIENT'
    this.roomCode = null;
    this.connections = new Map(); // Host: peerId -> DataConnection
    this.hostConnection = null;   // Client: connection to Host
    this.isConnected = false;

    // Snapshot sync intervals
    this.lastBroadcast = 0;
    this.broadcastRate = 1000 / 25; // 25 updates/sec for smooth network sync
  }

  // Generate short alphanumeric room code
  static generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Format full Peer ID from room code
  static getPeerId(code) {
    return `neonblast_${code.toUpperCase()}`;
  }

  // Initialize Host Room
  hostRoom(roomCode, onReady, onError) {
    if (typeof Peer === 'undefined') {
      onError('PeerJS library not loaded. Starting in Offline Solo Mode.');
      return;
    }

    this.mode = 'HOST';
    this.roomCode = roomCode || NetworkManager.generateRoomCode();
    const peerId = NetworkManager.getPeerId(this.roomCode);

    try {
      this.peer = new Peer(peerId, {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });

      this.peer.on('open', (id) => {
        this.isConnected = true;
        if (onReady) onReady(this.roomCode);
      });

      this.peer.on('connection', (conn) => {
        this.handlePeerConnection(conn);
      });

      this.peer.on('error', (err) => {
        console.warn('Peer error:', err);
        if (err.type === 'unavailable-id') {
          // Retry with new code
          this.hostRoom(NetworkManager.generateRoomCode(), onReady, onError);
        } else if (onError) {
          onError(err.message || 'Connection error.');
        }
      });
    } catch (e) {
      if (onError) onError('Could not initialize P2P host.');
    }
  }

  // Handle incoming connection from a peer client (as Host)
  handlePeerConnection(conn) {
    conn.on('open', () => {
      this.connections.set(conn.peer, conn);

      // Listen for messages from client
      conn.on('data', (data) => {
        this.handleClientData(conn.peer, data);
      });

      conn.on('close', () => {
        this.connections.delete(conn.peer);
        this.game.removeRemotePlayer(conn.peer);
      });
    });
  }

  handleClientData(peerId, data) {
    if (data.type === 'JOIN' || data.type === 'RESPAWN') {
      this.game.addRemotePlayer(peerId, data.name, data.color);
      const conn = this.connections.get(peerId);
      if (conn && conn.open && typeof this.game.getSnapshot === 'function') {
        conn.send({ type: 'SNAPSHOT', snapshot: this.game.getSnapshot() });
      }
    } else if (data.type === 'INPUT') {
      this.game.applyRemoteInput(peerId, data.input);
    } else if (data.type === 'UPGRADE') {
      this.game.applyRemoteUpgrade(peerId, data.statId);
    } else if (data.type === 'EVOLVE') {
      this.game.applyRemoteEvolve(peerId, data.classKey);
    }
  }

  // Initialize Client Join Room
  joinRoom(roomCode, playerName, playerColor, onConnected, onError) {
    if (typeof Peer === 'undefined') {
      onError('PeerJS library not loaded.');
      return;
    }

    this.mode = 'CLIENT';
    this.roomCode = roomCode.toUpperCase().trim();
    const hostPeerId = NetworkManager.getPeerId(this.roomCode);

    try {
      this.peer = new Peer({
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });

      this.peer.on('open', () => {
        const conn = this.peer.connect(hostPeerId, { reliable: true });
        this.hostConnection = conn;

        conn.on('open', () => {
          this.isConnected = true;
          // Send join handshake
          conn.send({
            type: 'JOIN',
            name: playerName,
            color: playerColor
          });

          if (onConnected) onConnected();
        });

        conn.on('data', (data) => {
          this.handleHostData(data);
        });

        conn.on('close', () => {
          this.isConnected = false;
          if (onError) onError('Disconnected from room host.');
        });
      });

      this.peer.on('error', (err) => {
        console.warn('Peer error:', err);
        if (onError) onError(err.message || 'Could not connect to room code.');
      });
    } catch (e) {
      if (onError) onError('Could not initialize client connection.');
    }
  }

  handleHostData(data) {
    if (data.type === 'SNAPSHOT') {
      this.game.applyWorldSnapshot(data.snapshot);
    } else if (data.type === 'KILL_EVENT') {
      this.game.hud.addKillMessage(data.killer, data.victim);
    }
  }

  // Host: Broadcast current world state to all connected peers
  broadcastSnapshot(snapshot) {
    if (this.mode !== 'HOST' || this.connections.size === 0) return;

    const now = performance.now();
    if (now - this.lastBroadcast < this.broadcastRate) return;
    this.lastBroadcast = now;

    const message = { type: 'SNAPSHOT', snapshot };
    for (const conn of this.connections.values()) {
      if (conn.open) {
        conn.send(message);
      }
    }
  }

  // Host: Broadcast kill announcement
  broadcastKill(killerName, victimName) {
    if (this.mode !== 'HOST') return;
    const msg = { type: 'KILL_EVENT', killer: killerName, victim: victimName };
    for (const conn of this.connections.values()) {
      if (conn.open) {
        conn.send(msg);
      }
    }
  }

  // Client: Send local inputs to host
  sendInput(inputState) {
    if (this.mode !== 'CLIENT' || !this.hostConnection || !this.hostConnection.open) return;

    const now = performance.now();
    const firingChanged = this.lastInputState && (this.lastInputState.isFiring !== inputState.isFiring || this.lastInputState.isRepelling !== inputState.isRepelling);

    // Send at most every 20ms (~50 updates/sec), or immediately on fire/repel state change
    if (!firingChanged && this.lastInputSend && (now - this.lastInputSend < 20)) {
      return;
    }

    this.lastInputSend = now;
    this.lastInputState = { isFiring: inputState.isFiring, isRepelling: inputState.isRepelling };

    try {
      this.hostConnection.send({
        type: 'INPUT',
        input: inputState
      });
    } catch (e) {
      console.warn('Failed to send input:', e);
    }
  }

  // Client: Send respawn request to host
  sendRespawn(playerName, playerColor) {
    if (this.mode !== 'CLIENT' || !this.hostConnection || !this.hostConnection.open) return;
    try {
      this.hostConnection.send({
        type: 'RESPAWN',
        name: playerName,
        color: playerColor
      });
    } catch (e) {
      console.warn('Failed to send respawn:', e);
    }
  }

  // Client: Send stat upgrade
  sendUpgrade(statId) {
    if (this.mode !== 'CLIENT' || !this.hostConnection || !this.hostConnection.open) return;
    this.hostConnection.send({
      type: 'UPGRADE',
      statId
    });
  }

  // Client: Send class evolution
  sendEvolve(classKey) {
    if (this.mode !== 'CLIENT' || !this.hostConnection || !this.hostConnection.open) return;
    this.hostConnection.send({
      type: 'EVOLVE',
      classKey
    });
  }

  disconnect() {
    if (this.hostConnection) {
      this.hostConnection.close();
      this.hostConnection = null;
    }
    for (const conn of this.connections.values()) {
      conn.close();
    }
    this.connections.clear();
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.isConnected = false;
    this.mode = 'SOLO';
  }
}
