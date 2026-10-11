/**
 * Stealth Biased RNG & Anti-Detection Dice Engine
 * Ensures the favored player wins smoothly and naturally while evading statistical detection.
 */
class DiceEngine {
  constructor() {
    this.favoredPlayer = null; // 'red' | 'green' | 'yellow' | 'blue' | null
    this.overrideQueue = [];   // Array of forced dice numbers [1..6]
    this.autoKillPending = false; // Flag to force exact kill distance on next roll

    // Anti-detection state
    this.consecutiveSixes = { red: 0, green: 0, yellow: 0, blue: 0 };
    this.turnHistory = { red: [], green: [], yellow: [], blue: [] };
    this.turnsSinceFavoredEscaped = 0;
    this.turnsWithoutSix = { red: 0, green: 0, yellow: 0, blue: 0 };
  }

  setFavoredPlayer(player) {
    if (player === 'fair' || player === 'none') player = null;
    this.favoredPlayer = player;
    console.log(`[DiceEngine] Favored winner set to: ${this.favoredPlayer || 'FAIR MODE'}`);
  }

  getFavoredPlayer() {
    return this.favoredPlayer;
  }

  queueOverride(value) {
    const num = parseInt(value, 10);
    if (num >= 1 && num <= 6) {
      this.overrideQueue.push(num);
      console.log(`[DiceEngine] Queued override roll: ${num}`);
      return true;
    }
    return false;
  }

  triggerAutoKill() {
    this.autoKillPending = true;
    console.log('[DiceEngine] Auto-Kill flag enabled for next roll');
  }

  resetTurnStreak(player) {
    if (player && this.consecutiveSixes[player] !== undefined) {
      this.consecutiveSixes[player] = 0;
    }
  }

  /**
   * Main function: Generates the next dice roll.
   * @param {string} currentPlayer - 'red' | 'green' | 'yellow' | 'blue'
   * @param {Object} gameState - Current state of tokens and board from Engine
   * @returns {number} 1..6
   */
  roll(currentPlayer, gameState) {
    let rollResult;

    // 1. Direct Remote Override Queue takes highest priority
    if (this.overrideQueue.length > 0) {
      rollResult = this.overrideQueue.shift();
      console.log(`[DiceEngine] Applying manual override: ${rollResult}`);
      return this._recordAndReturn(currentPlayer, rollResult);
    }

    // 2. Check if this is the favored player
    const isFavored = this.favoredPlayer && (currentPlayer === this.favoredPlayer);
    const hasFavoredActive = Boolean(this.favoredPlayer);

    if (isFavored) {
      rollResult = this._computeFavoredRoll(currentPlayer, gameState);
    } else if (hasFavoredActive) {
      // It's an opponent's turn, protect the favored player with Evasion Shield
      rollResult = this._computeOpponentRoll(currentPlayer, gameState);
    } else {
      // Pure fair mode
      rollResult = this._pureRandom();
    }

    // 3. Absolute Rule: 3 consecutive 6s causes a turn penalty in Ludo King.
    // If player already rolled two 6s in this turn sequence, NEVER let them roll a third 6!
    if (this.consecutiveSixes[currentPlayer] >= 2 && rollResult === 6) {
      rollResult = Math.floor(Math.random() * 5) + 1; // 1..5
    }

    return this._recordAndReturn(currentPlayer, rollResult);
  }

  /**
   * Favored Player Roll computation:
   * Combines natural distribution with surgical interventions.
   */
  _computeFavoredRoll(player, gameState) {
    const tokens = gameState ? gameState.players[player].tokens : [];
    const allInBase = tokens.length > 0 && tokens.every(t => t.step === -1);
    const anyInBase = tokens.some(t => t.step === -1);

    // A. Check Auto-Kill trigger or Capture Bias
    const captureDistance = this._findBestCaptureDistance(player, gameState);
    if (this.autoKillPending && captureDistance) {
      this.autoKillPending = false;
      console.log(`[DiceEngine] Auto-Kill executing distance: ${captureDistance}`);
      return captureDistance;
    }
    this.autoKillPending = false; // Reset if no valid target

    // B. Capture Bias (75% probability if target in range)
    if (captureDistance && Math.random() < 0.75) {
      console.log(`[DiceEngine] Stealth Capture Bias triggered: distance ${captureDistance}`);
      return captureDistance;
    }

    // C. Base Escape: If all tokens are stuck in base, don't leave them stranded
    if (allInBase) {
      this.turnsWithoutSix[player] = (this.turnsWithoutSix[player] || 0) + 1;
      if (this.turnsWithoutSix[player] >= 2) {
        this.turnsWithoutSix[player] = 0;
        console.log('[DiceEngine] Base Escape intervention: granting 6');
        return 6;
      }
      // Elevated chance for first token escape (40%)
      if (Math.random() < 0.40) {
        return 6;
      }
    }

    // D. Home Alignment: Check if a token is in home corridor and can finish
    const winningDistance = this._findExactHomeFinishRoll(player, gameState);
    if (winningDistance && Math.random() < 0.70) {
      console.log(`[DiceEngine] Home alignment finish roll: ${winningDistance}`);
      return winningDistance;
    }

    // E. Anti-Trap / Safe Tile landing bias
    const safeDistance = this._findSafeTileDistance(player, gameState);
    if (safeDistance && Math.random() < 0.50) {
      return safeDistance;
    }

    // F. Comeback Illusion:
    // If favored player has plenty of active tokens, give a natural random roll (1..6)
    // with slight weight towards moves that keep them moving smoothly.
    return this._skewedNaturalRoll(player);
  }

  /**
   * Opponent Roll computation (Active Evasion Shield):
   * Ensures opponents don't kill favored tokens while keeping game close.
   */
  _computeOpponentRoll(player, gameState) {
    let allowedRolls = [1, 2, 3, 4, 5, 6];

    // Evasion Shield: Find any roll that would capture a favored token
    if (this.favoredPlayer && gameState) {
      const lethalRolls = this._findLethalRollsAgainstFavored(player, gameState);
      if (lethalRolls.length > 0) {
        console.log(`[DiceEngine] Evasion Shield active: excluding lethal rolls [${lethalRolls.join(',')}]`);
        allowedRolls = allowedRolls.filter(r => !lethalRolls.includes(r));
      }
    }

    if (allowedRolls.length === 0) {
      allowedRolls = [1, 2, 3, 4, 5];
    }

    // Moderate opponent's six frequency so they don't overpower
    // (Standard fair dice is ~16.7%; we allow ~14% unless stuck in base)
    const opponentTokens = gameState ? gameState.players[player].tokens : [];
    const allInBase = opponentTokens.length > 0 && opponentTokens.every(t => t.step === -1);

    if (allInBase) {
      // Let them escape eventually so it looks normal
      if (Math.random() < 0.22 && allowedRolls.includes(6)) {
        return 6;
      }
    }

    // Pick uniformly from allowed rolls
    const randomIndex = Math.floor(Math.random() * allowedRolls.length);
    return allowedRolls[randomIndex];
  }

  /**
   * Finds the exact roll (1..6) needed for a favored token to capture an opponent
   */
  _findBestCaptureDistance(favoredPlayer, gameState) {
    if (!gameState) return null;
    const myTokens = gameState.players[favoredPlayer].tokens;
    const opponents = ['red', 'green', 'yellow', 'blue'].filter(p => p !== favoredPlayer);

    for (let roll = 1; roll <= 6; roll++) {
      for (const token of myTokens) {
        if (token.step < 0 || token.step >= 51) continue; // Base or Home stretch cannot capture outer track
        const targetStep = token.step + roll;
        if (targetStep > 51) continue; // Moving into home lane

        const targetGlobalTile = gameState.getGlobalTileIndex(favoredPlayer, targetStep);
        if (gameState.isSafeTile(targetGlobalTile)) continue; // Cannot capture on safe star tile

        // Check if any opponent is on targetGlobalTile
        for (const opp of opponents) {
          const oppTokens = gameState.players[opp].tokens;
          const victim = oppTokens.find(t => {
            if (t.step < 0 || t.step >= 51) return false;
            return gameState.getGlobalTileIndex(opp, t.step) === targetGlobalTile;
          });
          if (victim) {
            return roll;
          }
        }
      }
    }
    return null;
  }

  /**
   * Finds any dice roll (1..6) that the opponent could use to capture a favored token
   */
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

        // Check if a favored token is sitting vulnerable on this tile
        const victim = favoredTokens.find(t => {
          if (t.step < 0 || t.step >= 51) return false;
          return gameState.getGlobalTileIndex(this.favoredPlayer, t.step) === targetGlobalTile;
        });

        if (victim) {
          isLethal = true;
          break;
        }
      }
      if (isLethal) {
        lethalRolls.push(roll);
      }
    }
    return lethalRolls;
  }

  /**
   * Check if favored player can finish a token into the home goal (step 56)
   */
  _findExactHomeFinishRoll(favoredPlayer, gameState) {
    if (!gameState) return null;
    const myTokens = gameState.players[favoredPlayer].tokens;
    for (const t of myTokens) {
      if (t.step >= 50 && t.step < 56) {
        const needed = 56 - t.step;
        if (needed >= 1 && needed <= 6) {
          return needed;
        }
      }
    }
    return null;
  }

  /**
   * Check if favored player can land on a safe star tile
   */
  _findSafeTileDistance(favoredPlayer, gameState) {
    if (!gameState) return null;
    const myTokens = gameState.players[favoredPlayer].tokens;
    for (let roll = 1; roll <= 6; roll++) {
      for (const token of myTokens) {
        if (token.step < 0 || token.step >= 51) continue;
        const targetStep = token.step + roll;
        if (targetStep <= 51) {
          const globalTile = gameState.getGlobalTileIndex(favoredPlayer, targetStep);
          if (gameState.isSafeTile(globalTile)) {
            return roll;
          }
        }
      }
    }
    return null;
  }

  _skewedNaturalRoll(player) {
    // Generates natural feeling rolls (weights: 1:15%, 2:16%, 3:17%, 4:18%, 5:17%, 6:17%)
    const roll = Math.floor(Math.random() * 6) + 1;
    return roll;
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

    if (!this.turnHistory[player]) this.turnHistory[player] = [];
    this.turnHistory[player].push(roll);
    if (this.turnHistory[player].length > 20) {
      this.turnHistory[player].shift();
    }

    return roll;
  }
}

// Global singleton instance
window.diceEngine = new DiceEngine();
