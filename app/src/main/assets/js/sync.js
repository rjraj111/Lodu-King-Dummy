/**
 * Real-Time MQTT over WebSockets Sync Engine
 * Connects the main board and remote controller via broker.hivemq.com:8884/mqtt
 * Includes instant local fallback (BroadcastChannel + localStorage) for dual tabs.
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

    // MQTT Configuration
    this.brokerUrl = 'wss://broker.hivemq.com:8884/mqtt';
    this.topicControl = `ludoking/${this.roomId}/control`;
    this.topicState = `ludoking/${this.roomId}/state`;

    this._initLocalChannel();
  }

  _resolveRoomId() {
    const params = new URLSearchParams(window.location.search);
    let room = params.get('room');
    if (room) {
      room = room.toUpperCase().trim();
      localStorage.setItem('ludo_active_room', room);
      return room;
    }
    if (window.location.hash && window.location.hash.length > 2) {
      room = window.location.hash.substring(1).toUpperCase().trim();
      localStorage.setItem('ludo_active_room', room);
      return room;
    }
    room = localStorage.getItem('ludo_active_room');
    if (room && room.length >= 3) {
      return room;
    }
    const generated = 'GAME' + Math.floor(100 + Math.random() * 900);
    localStorage.setItem('ludo_active_room', generated);
    return generated;
  }

  setRoomId(newRoomId) {
    if (!newRoomId) return;
    this.roomId = newRoomId.toUpperCase().trim();
    localStorage.setItem('ludo_active_room', this.roomId);
    this.topicControl = `ludoking/${this.roomId}/control`;
    this.topicState = `ludoking/${this.roomId}/state`;

    if (this.client) {
      this.client.end(true, () => this.connect());
    }
    this._initLocalChannel();
  }

  getRoomId() {
    return this.roomId;
  }

  getControllerUrl() {
    const base = window.location.origin + window.location.pathname.replace(/(index|preview)\.html$/, '');
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
    } catch (e) {}

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
      this._mqttAttempts = (this._mqttAttempts || 0) + 1;
      if (this._mqttAttempts <= 2) {
        setTimeout(() => this.connect(), 1200);
      } else {
        console.log('[SyncManager] Offline mode active: Local BroadcastChannel & localStorage sync enabled.');
      }
      return;
    }

    const clientId = (this.isController ? 'ctrl_' : 'game_') + Math.random().toString(16).substring(2, 8);
    const options = {
      clientId,
      clean: true,
      reconnectPeriod: 4000,
      connectTimeout: 8000
    };

    try {
      this.client = mqtt.connect(this.brokerUrl, options);

      this.client.on('connect', () => {
        this.connected = true;
        if (this.onConnectionChange) this.onConnectionChange(true);

        const subTopic = this.isController ? this.topicState : this.topicControl;
        this.client.subscribe(subTopic, (err) => {
          if (!err && this.isController) {
            this.sendControlCommand({ action: 'REQUEST_SYNC' });
          }
        });
      });

      this.client.on('message', (topic, message) => {
        try {
          const payload = JSON.parse(message.toString());
          this._handleIncomingRaw(payload);
        } catch (e) {}
      });

      this.client.on('offline', () => {
        this.connected = false;
        if (this.onConnectionChange) this.onConnectionChange(false);
      });
    } catch (e) {
      console.warn('[Sync] MQTT initialization warning', e);
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

  broadcastState(state) {
    const payload = {
      type: 'STATE',
      roomId: this.roomId,
      timestamp: Date.now(),
      data: state
    };
    this._send(this.topicState, payload);
  }

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

    if (this.client && this.connected) {
      this.client.publish(topic, jsonStr, { qos: 0 });
    }
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(payload);
      } catch (e) {}
    }
    try {
      localStorage.setItem(`ludo_event_${this.roomId}`, jsonStr);
    } catch (e) {}
  }
}

window.SyncManager = SyncManager;
