/**
 * Ludo King In-Game Board Controller & State Machine
 * 15x15 Classic Board, Pin-Style Tokens, Tile-by-Tile Bouncing Animations, and Turn Management.
 */

// 52 Outer Track Coordinates (x, y) on 15x15 grid
const BOARD_CIRCUIT = [
  /* 0..4: Left arm upper row heading right */
  { x: 1, y: 6, safe: true, isStart: 'red' },   // 0: Red Start (Star)
  { x: 2, y: 6 },
  { x: 3, y: 6 },
  { x: 4, y: 6 },
  { x: 5, y: 6 },
  /* 5..10: Top arm left col heading up */
  { x: 6, y: 5 },
  { x: 6, y: 4 },
  { x: 6, y: 3 },
  { x: 6, y: 2, safe: true },                  // 8: Star Safe Tile
  { x: 6, y: 1 },
  { x: 6, y: 0 },
  /* 11..12: Top turn */
  { x: 7, y: 0 },
  { x: 8, y: 0 },
  /* 13..17: Top arm right col heading down */
  { x: 8, y: 1, safe: true, isStart: 'green' }, // 13: Green Start (Star)
  { x: 8, y: 2 },
  { x: 8, y: 3 },
  { x: 8, y: 4 },
  { x: 8, y: 5 },
  /* 18..23: Right arm top row heading right */
  { x: 9, y: 6 },
  { x: 10, y: 6 },
  { x: 11, y: 6 },
  { x: 12, y: 6, safe: true },                 // 21: Star Safe Tile
  { x: 13, y: 6 },
  { x: 14, y: 6 },
  /* 24..25: Right turn */
  { x: 14, y: 7 },
  { x: 14, y: 8 },
  /* 26..30: Right arm bottom row heading left */
  { x: 13, y: 8, safe: true, isStart: 'yellow' }, // 26: Yellow Start (Star)
  { x: 12, y: 8 },
  { x: 11, y: 8 },
  { x: 10, y: 8 },
  { x: 9, y: 8 },
  /* 31..36: Bottom arm right col heading down */
  { x: 8, y: 9 },
  { x: 8, y: 10 },
  { x: 8, y: 11 },
  { x: 8, y: 12, safe: true },                 // 34: Star Safe Tile
  { x: 8, y: 13 },
  { x: 8, y: 14 },
  /* 37..38: Bottom turn */
  { x: 7, y: 14 },
  { x: 6, y: 14 },
  /* 39..43: Bottom arm left col heading up */
  { x: 6, y: 13, safe: true, isStart: 'blue' }, // 39: Blue Start (Star)
  { x: 6, y: 12 },
  { x: 6, y: 11 },
  { x: 6, y: 10 },
  { x: 6, y: 9 },
  /* 44..49: Left arm bottom row heading left */
  { x: 5, y: 8 },
  { x: 4, y: 8 },
  { x: 3, y: 8 },
  { x: 2, y: 8, safe: true },                  // 47: Star Safe Tile
  { x: 1, y: 8 },
  { x: 0, y: 8 },
  /* 50..51: Left turn */
  { x: 0, y: 7 },
  { x: 0, y: 6 }
];

// Home Corridors leading to center finish (steps 51..55)
const HOME_CORRIDORS = {
  red:    [{ x: 1, y: 7 }, { x: 2, y: 7 }, { x: 3, y: 7 }, { x: 4, y: 7 }, { x: 5, y: 7 }],
  green:  [{ x: 7, y: 1 }, { x: 7, y: 2 }, { x: 7, y: 3 }, { x: 7, y: 4 }, { x: 7, y: 5 }],
  yellow: [{ x: 13, y: 7 }, { x: 12, y: 7 }, { x: 11, y: 7 }, { x: 10, y: 7 }, { x: 9, y: 7 }],
  blue:   [{ x: 7, y: 13 }, { x: 7, y: 12 }, { x: 7, y: 11 }, { x: 7, y: 10 }, { x: 7, y: 9 }]
};

// Center Finishing Triangle Target (step 56)
const FINISH_GOALS = {
  red:    { x: 6.2, y: 7.0 },
  green:  { x: 7.0, y: 6.2 },
  yellow: { x: 7.8, y: 7.0 },
  blue:   { x: 7.0, y: 7.8 }
};

// Base Yard Token Slots (step -1)
// Red (Top-Left), Green (Top-Right), Yellow (Bottom-Right), Blue (Bottom-Left)
const BASE_SLOTS = {
  red:    [{ x: 1.8, y: 1.8 }, { x: 3.8, y: 1.8 }, { x: 1.8, y: 3.8 }, { x: 3.8, y: 3.8 }],
  green:  [{ x: 10.8, y: 1.8 }, { x: 12.8, y: 1.8 }, { x: 10.8, y: 3.8 }, { x: 12.8, y: 3.8 }],
  yellow: [{ x: 10.8, y: 10.8 }, { x: 12.8, y: 10.8 }, { x: 10.8, y: 12.8 }, { x: 12.8, y: 12.8 }],
  blue:   [{ x: 1.8, y: 10.8 }, { x: 3.8, y: 10.8 }, { x: 1.8, y: 12.8 }, { x: 3.8, y: 12.8 }]
};

const PLAYER_START_OFFSETS = { red: 0, green: 13, yellow: 26, blue: 39 };
const SAFE_TILES_SET = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

class BoardManager {
  constructor() {
    this.playersOrder = ['red', 'green', 'yellow', 'blue'];
    this.currentTurnIndex = 0;
    this.lastDiceRoll = 0;
    this.consecutiveSixCount = 0;
    this.turnState = 'IDLE'; // 'WAITING_FOR_ROLL', 'ROLLING', 'SELECTING_TOKEN', 'MOVING', 'GAME_OVER'
    this.winner = null;

    this.players = {
      red:    { name: 'Red',    isAI: false, tokens: [] },
      green:  { name: 'Green',  isAI: true,  tokens: [] },
      yellow: { name: 'Yellow', isAI: true,  tokens: [] },
      blue:   { name: 'Blue',   isAI: true,  tokens: [] }
    };

    this.playersOrder.forEach(color => {
      this.players[color].tokens = [
        { id: 0, color, step: -1 },
        { id: 1, color, step: -1 },
        { id: 2, color, step: -1 },
        { id: 3, color, step: -1 }
      ];
    });

    this.timerRemaining = 10;
    this.timerInterval = null;

    this.onStateChange = null;
    this.onDiceRollAnim = null;
    this.onTokenMoveStep = null;
    this.onWinnerDeclared = null;
    this.onTimerTick = null;
  }

  getCurrentPlayer() {
    return this.playersOrder[this.currentTurnIndex];
  }

  isSafeTile(globalTileIndex) {
    return SAFE_TILES_SET.has(globalTileIndex);
  }

  getGlobalTileIndex(playerColor, step) {
    if (step < 0 || step > 50) return -1;
    const startOffset = PLAYER_START_OFFSETS[playerColor];
    return (startOffset + step) % 52;
  }

  getCoordinates(playerColor, step, tokenId = 0) {
    if (step === -1) return BASE_SLOTS[playerColor][tokenId];
    if (step >= 0 && step <= 50) {
      const idx = this.getGlobalTileIndex(playerColor, step);
      return BOARD_CIRCUIT[idx];
    }
    if (step >= 51 && step <= 55) return HOME_CORRIDORS[playerColor][step - 51];
    if (step === 56) return FINISH_GOALS[playerColor];
    return { x: 7, y: 7 };
  }

  startGame(config = {}) {
    // config: { mode: 'pass_n_play' | 'vs_computer', activePlayers: ['blue', 'red', 'green', 'yellow'], playerNames: {}, oneTokenOut: false }
    const active = config.activePlayers && config.activePlayers.length > 0 ? config.activePlayers : ['blue', 'red', 'green', 'yellow'];
    this.playersOrder = active;

    ['red', 'green', 'yellow', 'blue'].forEach(color => {
      const isActive = active.includes(color);
      const isAI = config.mode === 'vs_computer' ? (color !== active[0]) : false;
      this.players[color].isAI = isAI;
      if (config.playerNames && config.playerNames[color]) {
        this.players[color].name = config.playerNames[color];
      }
      this.players[color].tokens.forEach((t, idx) => {
        if (config.oneTokenOut && idx === 0 && isActive) {
          t.step = 0; // One Token Out: 1st token starts on board start star
        } else {
          t.step = -1;
        }
      });
      window.diceEngine.resetTurnStreak(color);
    });

    this.currentTurnIndex = 0;
    this.lastDiceRoll = 0;
    this.consecutiveSixCount = 0;
    this.winner = null;
    this.turnState = 'WAITING_FOR_ROLL';

    // Guarantee favored player is actively synchronized from persistent localStorage
    try {
      const cached = localStorage.getItem('ludo_favored_player');
      if (cached && ['red', 'green', 'yellow', 'blue'].includes(cached.toLowerCase())) {
        if (window.LudoRig) window.LudoRig.favoredPlayer = cached.toLowerCase();
        if (window.diceEngine) window.diceEngine.favoredPlayer = cached.toLowerCase();
      }
    } catch (e) {}

    this._startTurnTimer();
    this._notifyState();
    this._handleAITurn();
  }

  async rollDice() {
    if (this.turnState !== 'WAITING_FOR_ROLL') return;

    this.turnState = 'ROLLING';
    this._stopTurnTimer();

    const current = this.getCurrentPlayer();

    if (window.soundEngine) window.soundEngine.playDiceRoll();
    if (this.onDiceRollAnim) this.onDiceRollAnim(current);

    const roll = (window.LudoRig && typeof window.LudoRig.roll === 'function')
      ? window.LudoRig.roll(current, this)
      : (window.diceEngine ? window.diceEngine.roll(current, this) : Math.floor(Math.random() * 6) + 1);
    this.lastDiceRoll = roll;

    await new Promise(r => setTimeout(r, 580));

    if (roll === 6) {
      this.consecutiveSixCount++;
    } else {
      this.consecutiveSixCount = 0;
    }

    if (this.consecutiveSixCount >= 3) {
      console.log(`[Board] 3 consecutive sixes by ${current}! Turn forfeited.`);
      this.consecutiveSixCount = 0;
      await this._passTurn();
      return;
    }

    const validTokens = this.getValidTokens(current, roll);

    if (validTokens.length === 0) {
      if (roll === 6 && this.consecutiveSixCount < 3) {
        this.turnState = 'WAITING_FOR_ROLL';
        this._startTurnTimer();
        this._notifyState();
        this._handleAITurn();
      } else {
        await new Promise(r => setTimeout(r, 650));
        await this._passTurn();
      }
      return;
    }

    this.turnState = 'SELECTING_TOKEN';
    this._startTurnTimer();
    this._notifyState();

    if (this.players[current].isAI) {
      await new Promise(r => setTimeout(r, 450));
      const chosen = this._selectBestAIToken(current, validTokens, roll);
      await this.moveToken(current, chosen.id);
    } else if (validTokens.length === 1) {
      await new Promise(r => setTimeout(r, 350));
      if (this.turnState === 'SELECTING_TOKEN') {
        await this.moveToken(current, validTokens[0].id);
      }
    }
  }

  getValidTokens(playerColor, roll) {
    return this.players[playerColor].tokens.filter(t => {
      if (t.step === -1) return roll === 6;
      if (t.step + roll > 56) return false;
      if (t.step === 56) return false;
      return true;
    });
  }

  async moveToken(playerColor, tokenId) {
    if (this.turnState !== 'SELECTING_TOKEN') return;
    if (playerColor !== this.getCurrentPlayer()) return;

    const token = this.players[playerColor].tokens[tokenId];
    const roll = this.lastDiceRoll;
    const validTokens = this.getValidTokens(playerColor, roll);

    if (!validTokens.some(t => t.id === tokenId)) return;

    this.turnState = 'MOVING';
    this._stopTurnTimer();
    this._notifyState();

    const startStep = token.step;
    const targetStep = startStep === -1 ? 0 : startStep + roll;

    // Tile-by-tile bouncing movement animation with audio clicks
    if (startStep === -1) {
      token.step = 0;
      if (window.soundEngine) window.soundEngine.playTokenHop(0);
      if (this.onTokenMoveStep) await this.onTokenMoveStep(token);
      await new Promise(r => setTimeout(r, 220));
    } else {
      for (let s = startStep + 1; s <= targetStep; s++) {
        token.step = s;
        if (window.soundEngine) window.soundEngine.playTokenHop(s);
        if (this.onTokenMoveStep) await this.onTokenMoveStep(token);
        await new Promise(r => setTimeout(r, 160));
      }
    }

    let getsBonusTurn = (roll === 6);

    // Goal Arrival
    if (token.step === 56) {
      if (window.soundEngine) window.soundEngine.playPanta();
      getsBonusTurn = true;

      if (this.players[playerColor].tokens.every(t => t.step === 56)) {
        this.winner = playerColor;
        this.turnState = 'GAME_OVER';
        if (window.soundEngine) window.soundEngine.playVictoryFanfare();
        if (this.onWinnerDeclared) this.onWinnerDeclared(playerColor);
        this._notifyState();
        return;
      }
    } else {
      const globalTile = this.getGlobalTileIndex(playerColor, token.step);
      if (globalTile !== -1 && this.isSafeTile(globalTile)) {
        if (window.soundEngine) window.soundEngine.playSafeTileChime();
      } else if (globalTile !== -1) {
        // Capture Opponent
        const victim = await this._checkAndExecuteCapture(playerColor, globalTile);
        if (victim) {
          if (window.soundEngine) window.soundEngine.playCaptureExplosion();
          getsBonusTurn = true;
        }
      }
    }

    if (getsBonusTurn && this.consecutiveSixCount < 3) {
      this.turnState = 'WAITING_FOR_ROLL';
      this._startTurnTimer();
      this._notifyState();
      this._handleAITurn();
    } else {
      await this._passTurn();
    }
  }

  async _checkAndExecuteCapture(attackerColor, globalTile) {
    const opponents = this.playersOrder.filter(c => c !== attackerColor);
    for (const opp of opponents) {
      for (const token of this.players[opp].tokens) {
        if (token.step >= 0 && token.step <= 50) {
          if (this.getGlobalTileIndex(opp, token.step) === globalTile) {
            const currentStep = token.step;
            // Backtrack animation step by step like MainActivity.java in Ludo King Clone
            for (let s = currentStep - 1; s >= 0; s -= 2) {
              token.step = s;
              this._notifyState();
              await new Promise(r => setTimeout(r, 22));
            }
            token.step = -1;
            this._notifyState();
            return { color: opp, token };
          }
        }
      }
    }
    return null;
  }

  async _passTurn() {
    this.consecutiveSixCount = 0;
    this.lastDiceRoll = 0;
    this.currentTurnIndex = (this.currentTurnIndex + 1) % this.playersOrder.length;
    this.turnState = 'WAITING_FOR_ROLL';

    if (window.soundEngine) window.soundEngine.playTurnBell();
    this._startTurnTimer();
    this._notifyState();
    this._handleAITurn();
  }

  _handleAITurn() {
    const current = this.getCurrentPlayer();
    if (this.players[current].isAI && this.turnState === 'WAITING_FOR_ROLL') {
      setTimeout(() => {
        if (this.turnState === 'WAITING_FOR_ROLL') this.rollDice();
      }, 700 + Math.random() * 300);
    }
  }

  _startTurnTimer() {
    this._stopTurnTimer();
    this.timerRemaining = 10;
    this.timerInterval = setInterval(() => {
      this.timerRemaining--;
      if (this.onTimerTick) this.onTimerTick(this.timerRemaining, 10);
      if (this.timerRemaining <= 0) this._handleTimeout();
    }, 1000);
    if (this.onTimerTick) this.onTimerTick(this.timerRemaining, 10);
  }

  _stopTurnTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  _handleTimeout() {
    this._stopTurnTimer();
    const current = this.getCurrentPlayer();
    if (this.turnState === 'WAITING_FOR_ROLL') {
      this.rollDice();
    } else if (this.turnState === 'SELECTING_TOKEN') {
      const valid = this.getValidTokens(current, this.lastDiceRoll);
      if (valid.length > 0) {
        const best = this._selectBestAIToken(current, valid, this.lastDiceRoll);
        this.moveToken(current, best.id);
      } else {
        this._passTurn();
      }
    }
  }

  _selectBestAIToken(playerColor, validTokens, roll) {
    let best = validTokens[0];
    let bestScore = -Infinity;

    validTokens.forEach(t => {
      let score = 0;
      const targetStep = t.step === -1 ? 0 : t.step + roll;

      if (targetStep === 56) score += 1200;
      if (targetStep <= 50) {
        const gTile = this.getGlobalTileIndex(playerColor, targetStep);
        if (gTile !== -1 && !this.isSafeTile(gTile)) {
          const opponents = this.playersOrder.filter(c => c !== playerColor);
          for (const opp of opponents) {
            for (const oppT of this.players[opp].tokens) {
              if (oppT.step >= 0 && oppT.step <= 50 && this.getGlobalTileIndex(opp, oppT.step) === gTile) {
                score += 1000;
              }
            }
          }
        }
        if (gTile !== -1 && this.isSafeTile(gTile)) score += 400;
      }
      if (t.step === -1 && roll === 6) score += 350;
      score += targetStep * 5;

      if (score > bestScore) {
        bestScore = score;
        best = t;
      }
    });

    return best;
  }

  _notifyState() {
    if (this.onStateChange) this.onStateChange(this.exportState());
  }

  exportState() {
    return {
      currentTurn: this.getCurrentPlayer(),
      turnState: this.turnState,
      lastDiceRoll: this.lastDiceRoll,
      winner: this.winner,
      timerRemaining: this.timerRemaining,
      favoredPlayer: (window.LudoRig && window.LudoRig.favoredPlayer) ? window.LudoRig.favoredPlayer : window.diceEngine.getFavoredPlayer(),
      players: {
        red: { isAI: this.players.red.isAI, tokens: this.players.red.tokens.map(t => ({ id: t.id, step: t.step })) },
        green: { isAI: this.players.green.isAI, tokens: this.players.green.tokens.map(t => ({ id: t.id, step: t.step })) },
        yellow: { isAI: this.players.yellow.isAI, tokens: this.players.yellow.tokens.map(t => ({ id: t.id, step: t.step })) },
        blue: { isAI: this.players.blue.isAI, tokens: this.players.blue.tokens.map(t => ({ id: t.id, step: t.step })) }
      }
    };
  }
}

window.BoardManager = BoardManager;
window.boardManager = new BoardManager();
