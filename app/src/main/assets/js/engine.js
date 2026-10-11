/**
 * Core Ludo King Game Engine
 * Manages 15x15 board coordinates, player states, token movements, rules, animations, and AI.
 */

// 52 Common Outer Circuit Tiles (x, y) coordinates on 15x15 board (0..14)
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

// 5 Private Home Corridor Tiles per player (steps 51..55)
const HOME_CORRIDORS = {
  red: [
    { x: 1, y: 7 }, { x: 2, y: 7 }, { x: 3, y: 7 }, { x: 4, y: 7 }, { x: 5, y: 7 }
  ],
  green: [
    { x: 7, y: 1 }, { x: 7, y: 2 }, { x: 7, y: 3 }, { x: 7, y: 4 }, { x: 7, y: 5 }
  ],
  yellow: [
    { x: 13, y: 7 }, { x: 12, y: 7 }, { x: 11, y: 7 }, { x: 10, y: 7 }, { x: 9, y: 7 }
  ],
  blue: [
    { x: 7, y: 13 }, { x: 7, y: 12 }, { x: 7, y: 11 }, { x: 7, y: 10 }, { x: 9, y: 9 }
  ]
};

// Finish Goal Positions (step 56) in Center Triangle
const FINISH_GOALS = {
  red:    { x: 6.2, y: 7.0 },
  green:  { x: 7.0, y: 6.2 },
  yellow: { x: 7.8, y: 7.0 },
  blue:   { x: 7.0, y: 7.8 }
};

// Base Yard Slot Positions (step -1)
const BASE_SLOTS = {
  red: [
    { x: 1.8, y: 10.8 }, { x: 3.8, y: 10.8 },
    { x: 1.8, y: 12.8 }, { x: 3.8, y: 12.8 }
  ],
  green: [
    { x: 1.8, y: 1.8 }, { x: 3.8, y: 1.8 },
    { x: 1.8, y: 3.8 }, { x: 3.8, y: 3.8 }
  ],
  yellow: [
    { x: 10.8, y: 1.8 }, { x: 12.8, y: 1.8 },
    { x: 10.8, y: 3.8 }, { x: 12.8, y: 3.8 }
  ],
  blue: [
    { x: 10.8, y: 10.8 }, { x: 12.8, y: 10.8 },
    { x: 10.8, y: 12.8 }, { x: 12.8, y: 12.8 }
  ]
};

const PLAYER_START_OFFSETS = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39
};

const SAFE_TILES_SET = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

class LudoEngine {
  constructor() {
    this.playersOrder = ['red', 'green', 'yellow', 'blue'];
    this.currentTurnIndex = 0;
    this.lastDiceRoll = 0;
    this.consecutiveSixCount = 0;
    this.turnState = 'IDLE'; // 'IDLE', 'WAITING_FOR_ROLL', 'ROLLING', 'SELECTING_TOKEN', 'MOVING', 'GAME_OVER'
    this.winner = null;

    // Player configurations
    this.players = {
      red:    { name: 'Red Player',    isAI: false, tokens: [] },
      green:  { name: 'Green Player',  isAI: true,  tokens: [] },
      yellow: { name: 'Yellow Player', isAI: true,  tokens: [] },
      blue:   { name: 'Blue Player',   isAI: true,  tokens: [] }
    };

    // Initialize 4 tokens for each player
    this.playersOrder.forEach(color => {
      this.players[color].tokens = [
        { id: 0, color, step: -1, animX: 0, animY: 0 },
        { id: 1, color, step: -1, animX: 0, animY: 0 },
        { id: 2, color, step: -1, animX: 0, animY: 0 },
        { id: 3, color, step: -1, animX: 0, animY: 0 }
      ];
    });

    // Timer state
    this.turnTimeLimit = 10;
    this.timerRemaining = 10;
    this.timerInterval = null;

    // Callbacks for UI rendering
    this.onStateChange = null;
    this.onDiceRollAnim = null;
    this.onTokenMoveStep = null;
    this.onWinnerDeclared = null;
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
    if (step === -1) {
      return BASE_SLOTS[playerColor][tokenId];
    }
    if (step >= 0 && step <= 50) {
      const globalIdx = this.getGlobalTileIndex(playerColor, step);
      return BOARD_CIRCUIT[globalIdx];
    }
    if (step >= 51 && step <= 55) {
      return HOME_CORRIDORS[playerColor][step - 51];
    }
    if (step === 56) {
      return FINISH_GOALS[playerColor];
    }
    return { x: 7, y: 7 };
  }

  startNewGame() {
    this.playersOrder.forEach(color => {
      this.players[color].tokens.forEach(t => {
        t.step = -1;
      });
      window.diceEngine.resetTurnStreak(color);
    });

    this.currentTurnIndex = 0;
    this.lastDiceRoll = 0;
    this.consecutiveSixCount = 0;
    this.winner = null;
    this.turnState = 'WAITING_FOR_ROLL';

    this._startTurnTimer();
    this._notifyState();

    // If initial player is AI, trigger roll
    this._handleAITurn();
  }

  /**
   * Rolls the dice for the current player
   */
  async rollDice() {
    if (this.turnState !== 'WAITING_FOR_ROLL') return;

    this.turnState = 'ROLLING';
    this._stopTurnTimer();

    const currentPlayer = this.getCurrentPlayer();

    // Trigger visual 3D roll and rattle audio
    if (window.soundEngine) window.soundEngine.playDiceRoll();
    if (this.onDiceRollAnim) this.onDiceRollAnim(currentPlayer);

    // Get rolled number via Stealth Biased Dice Engine
    const roll = window.diceEngine.roll(currentPlayer, this);
    this.lastDiceRoll = roll;

    // Small delay to match dice rolling animation length (~550ms)
    await new Promise(r => setTimeout(r, 600));

    if (roll === 6) {
      this.consecutiveSixCount++;
    } else {
      this.consecutiveSixCount = 0;
    }

    // Check for 3 consecutive sixes penalty
    if (this.consecutiveSixCount >= 3) {
      console.log(`[Engine] 3 consecutive sixes by ${currentPlayer}! Turn forfeited.`);
      this.consecutiveSixCount = 0;
      await this._passTurn();
      return;
    }

    // Determine legal moves
    const validTokens = this.getValidTokens(currentPlayer, roll);

    if (validTokens.length === 0) {
      console.log(`[Engine] No valid moves for ${currentPlayer} with roll ${roll}`);
      // If rolled 6 with no moves (rare/blocked), gets another roll if < 3 sixes
      if (roll === 6 && this.consecutiveSixCount < 3) {
        this.turnState = 'WAITING_FOR_ROLL';
        this._startTurnTimer();
        this._notifyState();
        this._handleAITurn();
      } else {
        await new Promise(r => setTimeout(r, 700));
        await this._passTurn();
      }
      return;
    }

    this.turnState = 'SELECTING_TOKEN';
    this._startTurnTimer();
    this._notifyState();

    // If AI or only 1 valid token, execute auto move
    if (this.players[currentPlayer].isAI) {
      await new Promise(r => setTimeout(r, 450));
      const chosenToken = this._selectBestAIToken(currentPlayer, validTokens, roll);
      await this.moveToken(currentPlayer, chosenToken.id);
    } else if (validTokens.length === 1) {
      // Auto-move single legal token after brief visual cue
      await new Promise(r => setTimeout(r, 400));
      if (this.turnState === 'SELECTING_TOKEN') {
        await this.moveToken(currentPlayer, validTokens[0].id);
      }
    }
  }

  /**
   * Returns an array of tokens that can legally move with current dice roll
   */
  getValidTokens(playerColor, roll) {
    const tokens = this.players[playerColor].tokens;
    return tokens.filter(token => {
      // Token in base requires a 6 to enter the board
      if (token.step === -1) {
        return roll === 6;
      }
      // Token cannot exceed home goal (56)
      if (token.step + roll > 56) {
        return false;
      }
      // Token already finished
      if (token.step === 56) {
        return false;
      }
      return true;
    });
  }

  /**
   * Moves a token step-by-step with hop animations and triggers capture/finish rules
   */
  async moveToken(playerColor, tokenId) {
    if (this.turnState !== 'SELECTING_TOKEN') return;
    if (playerColor !== this.getCurrentPlayer()) return;

    const token = this.players[playerColor].tokens[tokenId];
    const roll = this.lastDiceRoll;
    const validTokens = this.getValidTokens(playerColor, roll);

    if (!validTokens.some(t => t.id === tokenId)) {
      return; // Invalid selection
    }

    this.turnState = 'MOVING';
    this._stopTurnTimer();
    this._notifyState();

    const startStep = token.step;
    let targetStep = startStep === -1 ? 0 : startStep + roll;

    // Step-by-step hop animation
    if (startStep === -1) {
      // Emerge from base onto start tile
      token.step = 0;
      if (window.soundEngine) window.soundEngine.playTokenHop(0);
      if (this.onTokenMoveStep) await this.onTokenMoveStep(token);
      await new Promise(r => setTimeout(r, 220));
    } else {
      // Hop tile by tile
      for (let s = startStep + 1; s <= targetStep; s++) {
        token.step = s;
        if (window.soundEngine) window.soundEngine.playTokenHop(s);
        if (this.onTokenMoveStep) await this.onTokenMoveStep(token);
        await new Promise(r => setTimeout(r, 160));
      }
    }

    // Check Tile Arrival Rules
    let getsBonusTurn = (roll === 6);

    // 1. Check if token finished into Home Goal (step 56)
    if (token.step === 56) {
      console.log(`[Engine] Token ${tokenId} of ${playerColor} reached HOME!`);
      if (window.soundEngine) window.soundEngine.playSafeTileChime();
      getsBonusTurn = true; // Finishing a token awards bonus roll!

      // Check Victory Condition
      if (this.players[playerColor].tokens.every(t => t.step === 56)) {
        this.winner = playerColor;
        this.turnState = 'GAME_OVER';
        if (window.soundEngine) window.soundEngine.playVictoryFanfare();
        if (this.onWinnerDeclared) this.onWinnerDeclared(playerColor);
        this._notifyState();
        return;
      }
    } else {
      // 2. Check Star Tile
      const globalTile = this.getGlobalTileIndex(playerColor, token.step);
      if (globalTile !== -1 && this.isSafeTile(globalTile)) {
        if (window.soundEngine) window.soundEngine.playSafeTileChime();
      }

      // 3. Check Opponent Capture
      if (globalTile !== -1 && !this.isSafeTile(globalTile)) {
        const capturedOpponent = this._checkAndExecuteCapture(playerColor, globalTile);
        if (capturedOpponent) {
          console.log(`[Engine] ${playerColor} CAPTURED ${capturedOpponent.color}'s token!`);
          if (window.soundEngine) window.soundEngine.playCaptureExplosion();
          getsBonusTurn = true; // Capturing an opponent awards bonus roll!
        }
      }
    }

    // Determine Next Action
    if (getsBonusTurn && this.consecutiveSixCount < 3) {
      console.log(`[Engine] Bonus turn granted to ${playerColor}`);
      this.turnState = 'WAITING_FOR_ROLL';
      this._startTurnTimer();
      this._notifyState();
      this._handleAITurn();
    } else {
      await this._passTurn();
    }
  }

  _checkAndExecuteCapture(attackerColor, globalTile) {
    const opponents = this.playersOrder.filter(c => c !== attackerColor);
    for (const opp of opponents) {
      for (const token of this.players[opp].tokens) {
        if (token.step >= 0 && token.step <= 50) {
          const oppGlobalTile = this.getGlobalTileIndex(opp, token.step);
          if (oppGlobalTile === globalTile) {
            // Captured! Send back to base yard
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
        if (this.turnState === 'WAITING_FOR_ROLL') {
          this.rollDice();
        }
      }, 700 + Math.random() * 300);
    }
  }

  _startTurnTimer() {
    this._stopTurnTimer();
    this.timerRemaining = this.turnTimeLimit;
    this.timerInterval = setInterval(() => {
      this.timerRemaining--;
      if (this.onTimerTick) this.onTimerTick(this.timerRemaining, this.turnTimeLimit);

      if (this.timerRemaining <= 0) {
        this._handleTimeout();
      }
    }, 1000);
    if (this.onTimerTick) this.onTimerTick(this.timerRemaining, this.turnTimeLimit);
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
      const validTokens = this.getValidTokens(current, this.lastDiceRoll);
      if (validTokens.length > 0) {
        const chosen = this._selectBestAIToken(current, validTokens, this.lastDiceRoll);
        this.moveToken(current, chosen.id);
      } else {
        this._passTurn();
      }
    }
  }

  _selectBestAIToken(playerColor, validTokens, roll) {
    let bestToken = validTokens[0];
    let bestScore = -Infinity;

    validTokens.forEach(token => {
      let score = 0;
      const targetStep = token.step === -1 ? 0 : token.step + roll;

      // 1. Finish token into Home Goal
      if (targetStep === 56) score += 1200;

      // 2. Capture an opponent
      if (targetStep <= 50) {
        const globalTile = this.getGlobalTileIndex(playerColor, targetStep);
        if (globalTile !== -1 && !this.isSafeTile(globalTile)) {
          const opponents = this.playersOrder.filter(c => c !== playerColor);
          for (const opp of opponents) {
            for (const oppT of this.players[opp].tokens) {
              if (oppT.step >= 0 && oppT.step <= 50) {
                if (this.getGlobalTileIndex(opp, oppT.step) === globalTile) {
                  score += 1000;
                }
              }
            }
          }
        }
      }

      // 3. Land on a safe star tile
      if (targetStep <= 50) {
        const globalTile = this.getGlobalTileIndex(playerColor, targetStep);
        if (globalTile !== -1 && this.isSafeTile(globalTile)) {
          score += 450;
        }
      }

      // 4. Emerge token from base
      if (token.step === -1 && roll === 6) {
        score += 350;
      }

      // 5. Advance token furthest along the board
      score += targetStep * 5;

      if (score > bestScore) {
        bestScore = score;
        bestToken = token;
      }
    });

    return bestToken;
  }

  _notifyState() {
    if (this.onStateChange) {
      this.onStateChange(this.exportState());
    }
  }

  exportState() {
    return {
      currentTurn: this.getCurrentPlayer(),
      turnState: this.turnState,
      lastDiceRoll: this.lastDiceRoll,
      winner: this.winner,
      timerRemaining: this.timerRemaining,
      favoredPlayer: window.diceEngine.getFavoredPlayer(),
      players: {
        red: {
          isAI: this.players.red.isAI,
          tokens: this.players.red.tokens.map(t => ({ id: t.id, step: t.step }))
        },
        green: {
          isAI: this.players.green.isAI,
          tokens: this.players.green.tokens.map(t => ({ id: t.id, step: t.step }))
        },
        yellow: {
          isAI: this.players.yellow.isAI,
          tokens: this.players.yellow.tokens.map(t => ({ id: t.id, step: t.step }))
        },
        blue: {
          isAI: this.players.blue.isAI,
          tokens: this.players.blue.tokens.map(t => ({ id: t.id, step: t.step }))
        }
      }
    };
  }
}

// Global singleton instance
window.LudoEngine = LudoEngine;
window.ludoEngine = new LudoEngine();
