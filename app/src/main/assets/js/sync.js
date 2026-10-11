/**
 * Real-Time Game Sync Manager (HiveMQ MQTT over WSS + BroadcastChannel fallback)
 * Enables zero-backend remote control from a second smartphone or browser tab.
 */
class SyncManager {
  constructor(isController = false) {
    this.isController = isController;
    this.roomId = this._resolveRoomId();
    this.client = null;
    this.connected = false;
    this.broadcastChannel = null;
    this.onStateUpdate = null;
    this.onControlCommand = null;
    this.onConnectionChange = null;

    // Broker configuration
    this.brokerUrl = 'wss://broker.hivemq.com:8884/mqtt';
    this.topicControl = `ludoking/${this.roomId}/control`;
    this.topicState = `ludoking/${this.roomId}/state`;

    this._initLocalChannel();
  }

  _resolveRoomId() {
    // 1. Check URL query parameters: ?room=XYZ
    const params = new URLSearchParams(window.location.search);
    let room = params.get('room');
    if (room) {
      room = room.toUpperCase().trim();
      localStorage.setItem('ludo_active_room', room);
      return room;
    }

    // 2. Check hash: #XYZ
    if (window.location.hash && window.location.hash.length > 2) {
      room = window.location.hash.substring(1).toUpperCase().trim();
      localStorage.setItem('ludo_active_room', room);
      return room;
    }

    // 3. Check localStorage
    room = localStorage.getItem('ludo_active_room');
    if (room && room.length >= 4) {
      return room;
    }

    // 4. Generate persistent new 6-character room code
    const generated = 'LK' + Math.floor(1000 + Math.random() * 9000);
    localStorage.setItem('ludo_active_room', generated);
    return generated;
  }

  setRoomId(newRoomId) {
    if (!newRoomId) return;
    this.roomId = newRoomId.toUpperCase().trim();
    localStorage.setItem('ludo_active_room', this.roomId);
    this.topicControl = `ludoking/${this.roomId}/control`;
    this.topicState = `ludoking/${this.roomId}/state`;

    // Reconnect with new topics
    if (this.client) {
      this.client.end(true, () => {
        this.connect();
      });
    }
    this._initLocalChannel();
  }

  getRoomId() {
    return this.roomId;
  }

  getControllerUrl() {
    const base = window.location.origin + window.location.pathname.replace(/index\.html$/, '');
    return `${base}controller.html?room=${this.roomId}`;
  }

  _initLocalChannel() {
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        if (this.broadcastChannel) this.broadcastChannel.close();
        this.broadcastChannel = new BroadcastChannel(`ludo_channel_${this.roomId}`);
        this.broadcastChannel.onmessage = (event) => {
          this._handleIncomingRaw(event.data);
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel not supported, relying on MQTT & localStorage');
    }

    // LocalStorage storage event fallback
    window.addEventListener('storage', (e) => {
      if (e.key === `ludo_event_${this.roomId}` && e.newValue) {
        try {
          this._handleIncomingRaw(JSON.parse(e.newValue));
        } catch (err) {}
      }
    });
  }

  connect() {
    if (typeof mqtt === 'undefined') {
      console.warn('MQTT.js library not loaded yet; will retry shortly.');
      setTimeout(() => this.connect(), 1000);
      return;
    }

    const clientId = (this.isController ? 'ctrl_' : 'game_') + Math.random().toString(16).substring(2, 8);
    const options = {
      clientId,
      clean: true,
      reconnectPeriod: 4000,
      connectTimeout: 8000
    };

    console.log(`[Sync] Connecting to MQTT broker for Room ${this.roomId}...`);

    try {
      this.client = mqtt.connect(this.brokerUrl, options);

      this.client.on('connect', () => {
        this.connected = true;
        console.log(`[Sync] Connected to MQTT broker! Client ID: ${clientId}`);
        if (this.onConnectionChange) this.onConnectionChange(true);

        const subTopic = this.isController ? this.topicState : this.topicControl;
        this.client.subscribe(subTopic, (err) => {
          if (!err) {
            console.log(`[Sync] Subscribed to: ${subTopic}`);
            if (this.isController) {
              this.sendControlCommand({ action: 'REQUEST_SYNC' });
            }
          }
        });
      });

      this.client.on('message', (topic, message) => {
        try {
          const payload = JSON.parse(message.toString());
          this._handleIncomingRaw(payload);
        } catch (e) {
          console.error('[Sync] Error parsing incoming MQTT message', e);
        }
      });

      this.client.on('offline', () => {
        this.connected = false;
        console.log('[Sync] MQTT client offline');
        if (this.onConnectionChange) this.onConnectionChange(false);
      });

      this.client.on('error', (err) => {
        console.warn('[Sync] MQTT error:', err);
      });
    } catch (e) {
      console.error('[Sync] Failed to initialize MQTT client', e);
    }
  }

  _handleIncomingRaw(payload) {
    if (!payload || !payload.type) return;

    if (payload.type === 'CONTROL' && !this.isController) {
      if (this.onControlCommand) this.onControlCommand(payload.data);
    } else if (payload.type === 'STATE' && this.isController) {
      if (this.onStateUpdate) this.onStateUpdate(payload.data);
    }
  }

  // Called by main game to notify controller of state updates
  broadcastState(state) {
    const payload = {
      type: 'STATE',
      roomId: this.roomId,
      timestamp: Date.now(),
      data: state
    };

    this._send(this.topicState, payload);
  }

  // Called by controller to send instructions to the game
  sendControlCommand(data) {
    const payload = {
      type: 'CONTROL',
      roomId: this.roomId,
      timestamp: Date.now(),
      data: data
    };

    this._send(this.topicControl, payload);
  }

  _send(topic, payload) {
    const jsonStr = JSON.stringify(payload);

    // 1. Send via MQTT if connected
    if (this.client && this.connected) {
      this.client.publish(topic, jsonStr, { qos: 0 });
    }

    // 2. Send via local BroadcastChannel (instant zero-latency local fallback)
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(payload);
      } catch (e) {}
    }

    // 3. LocalStorage event fallback
    try {
      localStorage.setItem(`ludo_event_${this.roomId}`, jsonStr);
    } catch (e) {}
  }
}

// Global instance helper
window.SyncManager = SyncManager;
