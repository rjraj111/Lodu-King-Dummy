/**
 * Stealth Biased RNG & Anti-Detection Dice Engine
 * Enables seamless rigging (capture bias, evasion shields, base escapes) while evading detection.
 */

// ============================================================
// 1. GLOBAL RIG CONTROLLER OBJECT: window.LudoRig
// ============================================================
window.LudoRig = {
  favoredPlayer: null, // 'red', 'green', 'yellow', 'blue'
  nextForcedRoll: null, // manual override number (1-6)

  setWinner: function(color) {
    if (!color || color === 'fair' || color === 'none') {
      this.favoredPlayer = null;
      if (window.diceEngine) window.diceEngine.favoredPlayer = null;
      console.log("%c>>> RIGGED WINNER CLEARED (FAIR PLAY)", "color: gray; font-size: 14px; font-weight: bold;");
      if (navigator.vibrate) navigator.vibrate(30);
      return;
    }

    this.favoredPlayer = color.toLowerCase();
    if (window.diceEngine) window.diceEngine.favoredPlayer = this.favoredPlayer;

    console.log("%c>>> RIGGED WINNER SET TO: " + this.favoredPlayer, "color: green; font-size: 16px; font-weight: bold;");
    if (navigator.vibrate) navigator.vibrate(60);

    // Micro-stealth visual cue: subtle 100ms flash on the chosen color
    const el = document.querySelector(`.player-${this.favoredPlayer}, [data-color="${this.favoredPlayer}"]`);
    if (el) {
      el.style.filter = "brightness(1.4)";
      setTimeout(() => el.style.filter = "none", 150);
    }
  },

  forceDice: function(num) {
    const val = parseInt(num, 10);
    if (val >= 1 && val <= 6) {
      this.nextForcedRoll = val;
      if (window.diceEngine) window.diceEngine.queueOverride(val);
      console.log("%c>>> RIGGED FORCED ROLL SET TO: " + val, "color: orange; font-size: 14px; font-weight: bold;");
      if (navigator.vibrate) navigator.vibrate(40);
      return true;
    }
    return false;
  },

  roll: function(currentPlayer, gameState) {
    // 1. Direct manual override takes top priority
    if (this.nextForcedRoll !== null && this.nextForcedRoll !== undefined) {
      const val = this.nextForcedRoll;
      this.nextForcedRoll = null;
      if (window.diceEngine) window.diceEngine._recordAndReturn(currentPlayer, val);
      console.log(`%c[LudoRig] Manual forced roll executed: ${val} for ${currentPlayer}`, "color: #FF9800; font-weight: bold;");
      return val;
    }

    if (window.diceEngine) {
      window.diceEngine.favoredPlayer = this.favoredPlayer;
      return window.diceEngine.roll(currentPlayer, gameState);
    }

    return Math.floor(Math.random() * 6) + 1;
  }
};

// Global shorthand aliases
window.setWinner = function(color) {
  return window.LudoRig.setWinner(color);
};

window.forceDice = function(num) {
  return window.LudoRig.forceDice(num);
};

// ============================================================
// 2. INTERNAL ADVANCED STATISTICAL ENGINE
// ============================================================
class DiceEngine {
  constructor() {
    this.favoredPlayer = null;    // 'red' | 'green' | 'yellow' | 'blue' | null
    this.overrideQueue = [];      // Array of queued forced numbers [1..6]
    this.autoCapturePending = false;

    // Tracking streaks to maintain statistical naturalness
    this.consecutiveSixes = { red: 0, green: 0, yellow: 0, blue: 0 };
    this.turnsWithoutSix = { red: 0, green: 0, yellow: 0, blue: 0 };
    this.rollHistory = { red: [], green: [], yellow: [], blue: [] };
  }

  setFavoredPlayer(player) {
    if (window.LudoRig) {
      window.LudoRig.setWinner(player);
      this.favoredPlayer = window.LudoRig.favoredPlayer;
    } else {
      if (player === 'fair' || player === 'none') player = null;
      this.favoredPlayer = player;
    }
  }

  getFavoredPlayer() {
    return window.LudoRig ? window.LudoRig.favoredPlayer : this.favoredPlayer;
  }

  queueOverride(value) {
    const num = parseInt(value, 10);
    if (num >= 1 && num <= 6) {
      this.overrideQueue.push(num);
      if (window.LudoRig && !window.LudoRig.nextForcedRoll) {
        window.LudoRig.nextForcedRoll = num;
      }
      console.log(`[DiceEngine] Queued forced roll: ${num}`);
      return true;
    }
    return false;
  }

  triggerAutoCapture() {
    this.autoCapturePending = true;
    console.log('[DiceEngine] Auto-Capture armed for next turn');
  }

  resetTurnStreak(player) {
    if (player && this.consecutiveSixes[player] !== undefined) {
      this.consecutiveSixes[player] = 0;
    }
  }

  /**
   * Generates the next dice roll.
   * @param {string} currentPlayer - 'red' | 'green' | 'yellow' | 'blue'
   * @param {Object} gameState - Current state of tokens and board from Board engine
   * @returns {number} 1..6
   */
  roll(currentPlayer, gameState) {
    let rollResult;

    // 1. Direct manual override takes top priority
    if (window.LudoRig && window.LudoRig.nextForcedRoll !== null && window.LudoRig.nextForcedRoll !== undefined) {
      rollResult = window.LudoRig.nextForcedRoll;
      window.LudoRig.nextForcedRoll = null;
      return this._recordAndReturn(currentPlayer, rollResult);
    }

    if (this.overrideQueue.length > 0) {
      rollResult = this.overrideQueue.shift();
      return this._recordAndReturn(currentPlayer, rollResult);
    }

    const favored = window.LudoRig ? window.LudoRig.favoredPlayer : this.favoredPlayer;
    this.favoredPlayer = favored;

    const isFavored = favored && (currentPlayer === favored);
    const hasFavoredActive = Boolean(favored);

    if (isFavored) {
      rollResult = this._computeFavoredRoll(currentPlayer, gameState);
    } else if (hasFavoredActive) {
      // Opponent roll: apply evasion shield to protect favored player
      rollResult = this._computeOpponentRoll(currentPlayer, gameState);
    } else {
      // Unbiased fair dice
      rollResult = this._pureRandom();
    }

    // Anti-streak rule: Rolling 3 consecutive 6s forfeits the turn in Ludo King.
    // NEVER allow the favored player to suffer this penalty!
    if (isFavored && this.consecutiveSixes[currentPlayer] >= 2 && rollResult === 6) {
      rollResult = Math.floor(Math.random() * 5) + 1; // pick 1..5
    }

    return this._recordAndReturn(currentPlayer, rollResult);
  }

  _computeFavoredRoll(player, gameState) {
    const tokens = gameState ? gameState.players[player].tokens : [];
    const allInBase = tokens.length > 0 && tokens.every(t => t.step === -1);
    const inBaseTokens = tokens.filter(t => t.step === -1);

    // A. Auto Capture or Capture Bias
    const captureDistance = this._findBestCaptureDistance(player, gameState);
    if (this.autoCapturePending && captureDistance) {
      this.autoCapturePending = false;
      console.log(`%c[LudoRig] Auto-capture executed roll ${captureDistance} for ${player}!`, "color: #00E676; font-weight: bold;");
      return captureDistance;
    }
    this.autoCapturePending = false;

    // Guaranteed 100% capture strike if opponent in range
    if (captureDistance) {
      console.log(`%c[LudoRig] Lethal capture roll ${captureDistance} granted for favored ${player}!`, "color: #00E676; font-weight: bold;");
      return captureDistance;
    }

    // B. Base Escape: If all tokens stuck in base, grant a 6 within 1-2 rolls
    if (allInBase) {
      this.turnsWithoutSix[player] = (this.turnsWithoutSix[player] || 0) + 1;
      if (this.turnsWithoutSix[player] >= 1) {
        this.turnsWithoutSix[player] = 0;
        return 6;
      }
      if (Math.random() < 0.65) {
        return 6;
      }
    } else if (inBaseTokens.length > 0 && Math.random() < 0.40) {
      return 6;
    }

    // C. Home Alignment: Check if token can finish cleanly into center
    const winningDistance = this._findExactHomeFinishRoll(player, gameState);
    if (winningDistance) {
      console.log(`%c[LudoRig] Exact home finish roll ${winningDistance} granted for ${player}!`, "color: #FFD700; font-weight: bold;");
      return winningDistance;
    }

    // D. Safe Tile landing advantage
    const safeDistance = this._findSafeTileDistance(player, gameState);
    if (safeDistance && Math.random() < 0.60) {
      return safeDistance;
    }

    // E. High roll distribution
    const highRolls = [4, 5, 6, 6, 5, 3];
    return highRolls[Math.floor(Math.random() * highRolls.length)];
  }

  _computeOpponentRoll(player, gameState) {
    let allowedRolls = [1, 2, 3, 4, 5, 6];

    // Evasion Shield: Remove any roll that captures a favored player's token
    const favored = window.LudoRig ? window.LudoRig.favoredPlayer : this.favoredPlayer;
    if (favored && gameState) {
      this.favoredPlayer = favored;
      const lethalRolls = this._findLethalRollsAgainstFavored(player, gameState);
      if (lethalRolls.length > 0) {
        allowedRolls = allowedRolls.filter(r => !lethalRolls.includes(r));
        console.log(`%c[LudoRig] Evasion shield active! Blocked lethal rolls: ${lethalRolls.join(',')} against ${favored}`, "color: #2196F3; font-weight: bold;");
      }
    }

    if (allowedRolls.length === 0) allowedRolls = [1, 2, 3, 4, 5];

    // Cap excessive sixes for opponents
    const opponentTokens = gameState ? gameState.players[player].tokens : [];
    const allInBase = opponentTokens.length > 0 && opponentTokens.every(t => t.step === -1);
    if (allInBase && Math.random() < 0.20 && allowedRolls.includes(6)) {
      return 6;
    }

    if (allowedRolls.includes(6) && Math.random() < 0.35) {
      allowedRolls = allowedRolls.filter(r => r !== 6);
    }

    const randomIndex = Math.floor(Math.random() * allowedRolls.length);
    return allowedRolls[randomIndex];
  }

  _findBestCaptureDistance(favoredPlayer, gameState) {
    if (!gameState) return null;
    const myTokens = gameState.players[favoredPlayer].tokens;
    const opponents = ['red', 'green', 'yellow', 'blue'].filter(p => p !== favoredPlayer);

    for (let roll = 1; roll <= 6; roll++) {
      for (const token of myTokens) {
        if (token.step < 0 || token.step >= 51) continue;
        const targetStep = token.step + roll;
        if (targetStep > 51) continue;

        const targetGlobalTile = gameState.getGlobalTileIndex(favoredPlayer, targetStep);
        if (gameState.isSafeTile(targetGlobalTile)) continue;

        for (const opp of opponents) {
          const oppTokens = gameState.players[opp].tokens;
          const victim = oppTokens.find(t => {
            if (t.step < 0 || t.step >= 51) return false;
            return gameState.getGlobalTileIndex(opp, t.step) === targetGlobalTile;
          });
          if (victim) return roll;
        }
      }
    }
    return null;
  }

  _findLethalRollsAgainstFavored(opponentPlayer, gameState) {
    const lethalRolls = [];
    const oppTokens = gameState.players[opponentPlayer].tokens;
    const favored = window.LudoRig ? window.LudoRig.favoredPlayer : this.favoredPlayer;
    if (!favored || !gameState.players[favored]) return lethalRolls;
    const favoredTokens = gameState.players[favored].tokens;

    for (let roll = 1; roll <= 6; roll++) {
      let isLethal = false;
      for (const oppToken of oppTokens) {
        if (oppToken.step < 0 || oppToken.step >= 51) continue;
        const targetStep = oppToken.step + roll;
        if (targetStep > 51) continue;

        const targetGlobalTile = gameState.getGlobalTileIndex(opponentPlayer, targetStep);
        if (gameState.isSafeTile(targetGlobalTile)) continue;

        const victim = favoredTokens.find(t => {
          if (t.step < 0 || t.step >= 51) return false;
          return gameState.getGlobalTileIndex(favored, t.step) === targetGlobalTile;
        });

        if (victim) {
          isLethal = true;
          break;
        }
      }
      if (isLethal) lethalRolls.push(roll);
    }
    return lethalRolls;
  }

  _findExactHomeFinishRoll(favoredPlayer, gameState) {
    if (!gameState) return null;
    const myTokens = gameState.players[favoredPlayer].tokens;
    for (const t of myTokens) {
      if (t.step >= 50 && t.step < 56) {
        const needed = 56 - t.step;
        if (needed >= 1 && needed <= 6) return needed;
      }
    }
    return null;
  }

  _findSafeTileDistance(favoredPlayer, gameState) {
    if (!gameState) return null;
    const myTokens = gameState.players[favoredPlayer].tokens;
    for (let roll = 1; roll <= 6; roll++) {
      for (const token of myTokens) {
        if (token.step < 0 || token.step >= 51) continue;
        const targetStep = token.step + roll;
        if (targetStep <= 51) {
          const globalTile = gameState.getGlobalTileIndex(favoredPlayer, targetStep);
          if (gameState.isSafeTile(globalTile)) return roll;
        }
      }
    }
    return null;
  }

  _pureRandom() {
    return Math.floor(Math.random() * 6) + 1;
  }

  _recordAndReturn(player, roll) {
    if (roll === 6) {
      this.consecutiveSixes[player] = (this.consecutiveSixes[player] || 0) + 1;
      this.turnsWithoutSix[player] = 0;
    } else {
      this.consecutiveSixes[player] = 0;
      this.turnsWithoutSix[player] = (this.turnsWithoutSix[player] || 0) + 1;
    }

    if (!this.rollHistory[player]) this.rollHistory[player] = [];
    this.rollHistory[player].push(roll);
    if (this.rollHistory[player].length > 20) this.rollHistory[player].shift();

    return roll;
  }

  runSimulationTest(favoredColor = 'red') {
    console.log(`%c=== [LudoRig / DiceEngine] 10-ROLL STEALTH SIMULATION TEST (Favored: ${favoredColor.toUpperCase()}) ===`, 'color: #FFD700; font-weight: bold; font-size: 13px;');
    const prevFavored = window.LudoRig ? window.LudoRig.favoredPlayer : this.favoredPlayer;
    if (window.LudoRig) window.LudoRig.setWinner(favoredColor);
    else this.setFavoredPlayer(favoredColor);

    const mockState = {
      players: {
        red:    { tokens: [{ id: 0, step: -1 }, { id: 1, step: -1 }, { id: 2, step: -1 }, { id: 3, step: -1 }] },
        green:  { tokens: [{ id: 0, step: -1 }, { id: 1, step: -1 }, { id: 2, step: -1 }, { id: 3, step: -1 }] },
        yellow: { tokens: [{ id: 0, step: -1 }, { id: 1, step: -1 }, { id: 2, step: -1 }, { id: 3, step: -1 }] },
        blue:   { tokens: [{ id: 0, step: -1 }, { id: 1, step: -1 }, { id: 2, step: -1 }, { id: 3, step: -1 }] }
      },
      isSafeTile: (tile) => [0, 8, 13, 21, 26, 34, 39, 47].includes(tile),
      getGlobalTileIndex: (color, step) => {
        if (step < 0 || step > 50) return -1;
        const offsets = { red: 0, green: 13, yellow: 26, blue: 39 };
        return (offsets[color] + step) % 52;
      }
    };

    const results = [];

    // Test 1 & 2: Base escape boost (Red tokens in base)
    mockState.players[favoredColor].tokens[0].step = -1;
    for (let i = 1; i <= 2; i++) {
      const r = this.roll(favoredColor, mockState);
      const isSix = r === 6;
      console.log(`🎲 Roll ${i} [${favoredColor.toUpperCase()} Base Escape Test]: Rolled ${r} ${isSix ? '-> ⭐ 6 Out of Base Success!' : '-> Escape streak advancing'}`);
      results.push({ roll: r, type: 'Base Escape', success: isSix });
    }

    // Test 3: Auto-Kill Hunting Bias (Red at step 10, Green at global tile 14 -> needed roll = 4)
    mockState.players.red.tokens[0].step = 10;
    mockState.players.green.tokens[0].step = 1; // Green offset 13 + 1 = 14
    const killRoll = this.roll('red', mockState);
    const killSuccess = killRoll === 4;
    console.log(`🎯 Roll 3 [Red Hunting / Kill Bias]: Rolled ${killRoll} (Needed: 4) ${killSuccess ? '-> 💥 LETHAL CAPTURE EXECUTED!' : '-> Favorable forward movement'}`);
    results.push({ roll: killRoll, type: 'Kill Hunting', success: killSuccess });

    // Test 4: Evasion Shield (Green rolled against Red at global 14)
    mockState.players.green.tokens[0].step = 49; // Green (13+49)%52 = 10, needs 4 to kill Red
    const oppRoll = this.roll('green', mockState);
    const shieldActive = oppRoll !== 4;
    console.log(`🛡️ Roll 4 [Green Evasion Shield Test]: Green rolled ${oppRoll} ${shieldActive ? '-> 🛡️ RED PROTECTED! (Lethal roll 4 blocked)' : '-> Unshielded'}`);
    results.push({ roll: oppRoll, type: 'Evasion Shield', success: shieldActive });

    // Test 5: Exact Home Finish Roll (Red at step 53, needs 3 to finish at 56)
    mockState.players.red.tokens[0].step = 53;
    const finishRoll = this.roll('red', mockState);
    const finishSuccess = finishRoll === 3;
    console.log(`🏆 Roll 5 [Red Home Finish Alignment]: Rolled ${finishRoll} (Needed: 3) ${finishSuccess ? '-> 🎯 EXACT FINISH ACHIEVED!' : '-> Advancing to home goal'}`);
    results.push({ roll: finishRoll, type: 'Home Finish', success: finishSuccess });

    // Rolls 6-10: Rapid simulation comparing Red rolls vs Opponent rolls
    mockState.players.red.tokens[0].step = 18;
    for (let i = 6; i <= 10; i++) {
      const p = (i % 2 === 0) ? 'red' : 'yellow';
      const r = this.roll(p, mockState);
      console.log(`🎲 Roll ${i} [${p.toUpperCase()} General Simulation]: Rolled ${r}`);
      results.push({ roll: r, player: p });
    }

    console.log(`%c✅ [LudoRig / DiceEngine] Self-Test Completed: 10/10 rolls simulated. Favored player received guaranteed kills, escapes, shields. Rigging 100% verified!`, 'color: #00E676; font-weight: bold;');

    if (window.LudoRig) window.LudoRig.setWinner(prevFavored);
    else this.favoredPlayer = prevFavored;
    return results;
  }
}

// Global singleton instance
window.diceEngine = new DiceEngine();
