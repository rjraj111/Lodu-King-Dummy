/**
 * Stealth Biased RNG & Anti-Detection Dice Engine
 * Enables seamless rigging (capture bias, evasion shields, base escapes) while evading detection.
 */
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
    if (player === 'fair' || player === 'none') player = null;
    this.favoredPlayer = player;
    console.log(`[DiceEngine] Favored winner set to: ${this.favoredPlayer || 'FAIR'}`);
  }

  getFavoredPlayer() {
    return this.favoredPlayer;
  }

  queueOverride(value) {
    const num = parseInt(value, 10);
    if (num >= 1 && num <= 6) {
      this.overrideQueue.push(num);
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
    if (this.overrideQueue.length > 0) {
      rollResult = this.overrideQueue.shift();
      return this._recordAndReturn(currentPlayer, rollResult);
    }

    const isFavored = this.favoredPlayer && (currentPlayer === this.favoredPlayer);
    const hasFavoredActive = Boolean(this.favoredPlayer);

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
    if (this.consecutiveSixes[currentPlayer] >= 2 && rollResult === 6) {
      rollResult = Math.floor(Math.random() * 5) + 1; // pick 1..5
    }

    return this._recordAndReturn(currentPlayer, rollResult);
  }

  _computeFavoredRoll(player, gameState) {
    const tokens = gameState ? gameState.players[player].tokens : [];
    const allInBase = tokens.length > 0 && tokens.every(t => t.step === -1);

    // A. Auto Capture or Capture Bias
    const captureDistance = this._findBestCaptureDistance(player, gameState);
    if (this.autoCapturePending && captureDistance) {
      this.autoCapturePending = false;
      return captureDistance;
    }
    this.autoCapturePending = false;

    // 75% capture bias if opponent in range
    if (captureDistance && Math.random() < 0.75) {
      return captureDistance;
    }

    // B. Base Escape: If all tokens stuck in base, grant a 6 within 2-3 rolls
    if (allInBase) {
      this.turnsWithoutSix[player] = (this.turnsWithoutSix[player] || 0) + 1;
      if (this.turnsWithoutSix[player] >= 2) {
        this.turnsWithoutSix[player] = 0;
        return 6;
      }
      if (Math.random() < 0.38) {
        return 6;
      }
    }

    // C. Home Alignment: Check if token can finish cleanly into center
    const winningDistance = this._findExactHomeFinishRoll(player, gameState);
    if (winningDistance && Math.random() < 0.70) {
      return winningDistance;
    }

    // D. Safe Tile landing advantage
    const safeDistance = this._findSafeTileDistance(player, gameState);
    if (safeDistance && Math.random() < 0.45) {
      return safeDistance;
    }

    // Natural distribution
    return Math.floor(Math.random() * 6) + 1;
  }

  _computeOpponentRoll(player, gameState) {
    let allowedRolls = [1, 2, 3, 4, 5, 6];

    // Evasion Shield: Remove any roll that captures a favored player's token
    if (this.favoredPlayer && gameState) {
      const lethalRolls = this._findLethalRollsAgainstFavored(player, gameState);
      if (lethalRolls.length > 0) {
        allowedRolls = allowedRolls.filter(r => !lethalRolls.includes(r));
      }
    }

    if (allowedRolls.length === 0) allowedRolls = [1, 2, 3, 4, 5];

    // Cap excessive sixes for opponents
    const opponentTokens = gameState ? gameState.players[player].tokens : [];
    const allInBase = opponentTokens.length > 0 && opponentTokens.every(t => t.step === -1);
    if (allInBase && Math.random() < 0.22 && allowedRolls.includes(6)) {
      return 6;
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
    const favoredTokens = gameState.players[this.favoredPlayer].tokens;

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
          return gameState.getGlobalTileIndex(this.favoredPlayer, t.step) === targetGlobalTile;
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
}

// Global singleton instance
window.diceEngine = new DiceEngine();
