/**
 * Ludo King Multi-Screen Flow & Stealth Rigging Engine
 * Controls Screen 1 (Gametion), Screen 2 (Brand Splash), Screen 3 (Lobby),
 * Screen 4 (Modal 1 Select Game & Modal 2 Choose Color), and transitions to Screen 5.
 */

document.addEventListener('DOMContentLoaded', () => {
  const gametionSplash = document.getElementById('gametionSplash');
  const brandSplash = document.getElementById('brandSplash');
  const lobbyView = document.getElementById('lobby-view');
  const gameView = document.getElementById('game-view');
  const modalSelectGame = document.getElementById('modalSelectGame');
  const modalChooseColor = document.getElementById('modalChooseColor');
  const toastElem = document.getElementById('serverToast');

  // ============================================================
  // 1. SPLASH SCREEN FLOW (Screen 1 -> Screen 2 -> Screen 3)
  // ============================================================
  let splashSkipped = false;

  function endSplashSequence() {
    if (splashSkipped) return;
    splashSkipped = true;
    if (gametionSplash) gametionSplash.classList.add('hidden');
    if (brandSplash) brandSplash.classList.add('hidden');
    if (lobbyView) lobbyView.style.display = 'flex';
  }

  // Tap anywhere on splash to skip immediately
  if (gametionSplash) {
    gametionSplash.addEventListener('click', endSplashSequence);
  }
  if (brandSplash) {
    brandSplash.addEventListener('click', endSplashSequence);
  }

  // Automatic timed sequence: Gametion 1.5s -> Brand Splash 2.0s -> Lobby
  setTimeout(() => {
    if (!splashSkipped && gametionSplash) {
      gametionSplash.classList.add('hidden');
      setTimeout(() => {
        if (!splashSkipped && brandSplash) {
          brandSplash.classList.add('hidden');
          if (lobbyView) lobbyView.style.display = 'flex';
        }
      }, 2000); // 2.0s Brand Splash
    }
  }, 1500); // 1.5s Gametion Splash

  // ============================================================
  // 2. MAIN LOBBY INTERACTIONS (Screen 3)
  // ============================================================
  const btnPlayOnline = document.getElementById('btnPlayOnline');
  const btnPlayTeamUp = document.getElementById('btnPlayTeamUp');
  const btnPlayFriends = document.getElementById('btnPlayFriends');
  const btnVsComputer = document.getElementById('btnVsComputer');
  const btnPassNPlay = document.getElementById('btnPassNPlay');

  function showRealisticToast(msg) {
    if (!toastElem) return;
    toastElem.innerHTML = `<span class="spinner"></span><span>${msg}</span>`;
    toastElem.classList.add('show');
    if (window.soundEngine) window.soundEngine.playTap();

    setTimeout(() => {
      toastElem.innerHTML = `<span style="color: #FF5252;">⚠️</span><span>Network Error: Connection timed out.</span>`;
      setTimeout(() => {
        toastElem.classList.remove('show');
      }, 2200);
    }, 1800);
  }

  if (btnPlayOnline) {
    btnPlayOnline.addEventListener('click', () => {
      showRealisticToast('Connecting to global matchmaking server...');
    });
  }

  if (btnPlayTeamUp) {
    btnPlayTeamUp.addEventListener('click', () => {
      showRealisticToast('Connecting to 2v2 matchmaking server...');
    });
  }

  if (btnPlayFriends) {
    btnPlayFriends.addEventListener('click', () => {
      showRealisticToast('Connecting to private lobby server...');
    });
  }

  if (btnVsComputer) {
    btnVsComputer.addEventListener('click', () => {
      if (window.soundEngine) window.soundEngine.playTap();
      launchGameMode('vs_computer', ['blue', 'red'], { blue: 'You', red: 'Computer' }, false);
    });
  }

  if (btnPassNPlay) {
    btnPassNPlay.addEventListener('click', () => {
      if (window.soundEngine) window.soundEngine.playTap();
      if (modalSelectGame) modalSelectGame.classList.add('open');
    });
  }

  // ============================================================
  // 3. PASS N PLAY MODAL 1: SELECT GAME (Image 4)
  // ============================================================
  const btnCloseSelectGame = document.getElementById('btnCloseSelectGame');
  const btnNextToColorSelect = document.getElementById('btnNextToColorSelect');
  const gameModeOptions = document.querySelectorAll('.game-mode-option-row');
  let selectedGameType = 'classic';

  if (btnCloseSelectGame) {
    btnCloseSelectGame.addEventListener('click', () => {
      if (window.soundEngine) window.soundEngine.playTap();
      modalSelectGame.classList.remove('open');
    });
  }

  gameModeOptions.forEach(row => {
    row.addEventListener('click', () => {
      if (window.soundEngine) window.soundEngine.playTap();
      gameModeOptions.forEach(r => r.querySelector('.mode-check-pill')?.classList.remove('active'));
      const pill = row.querySelector('.mode-check-pill');
      if (pill) pill.classList.add('active');
      selectedGameType = row.dataset.type || 'classic';
    });
  });

  // Token carousel selection
  document.querySelectorAll('.token-item-slot').forEach(slot => {
    slot.addEventListener('click', () => {
      if (slot.classList.contains('locked')) {
        showRealisticToast('Level 10 required to unlock token skin!');
        return;
      }
      if (window.soundEngine) window.soundEngine.playTap();
      document.querySelectorAll('.token-item-slot').forEach(s => s.classList.remove('selected'));
      slot.classList.add('selected');
    });
  });

  if (btnNextToColorSelect) {
    btnNextToColorSelect.addEventListener('click', () => {
      if (window.soundEngine) window.soundEngine.playTap();
      modalSelectGame.classList.remove('open');
      if (modalChooseColor) modalChooseColor.classList.add('open');
      renderPlayerSlotsForCount(selectedPlayerCount);
    });
  }

  // ============================================================
  // 4. PASS N PLAY MODAL 2: CHOOSE COLOR & NAME (Image 5)
  // ============================================================
  const btnBackToSelectGame = document.getElementById('btnBackToSelectGame');
  const btnPlayMatch = document.getElementById('btnPlayMatch');
  const btnPlayOneTokenOut = document.getElementById('btnPlayOneTokenOut');
  let selectedPlayerCount = 2; // Default 2P (Image 5)

  if (btnBackToSelectGame) {
    btnBackToSelectGame.addEventListener('click', () => {
      if (window.soundEngine) window.soundEngine.playTap();
      modalChooseColor.classList.remove('open');
      modalSelectGame.classList.add('open');
    });
  }

  // Player count tabs [2P, 3P, 4P, 5P, 6P]
  const countTabs = document.querySelectorAll('.pcount-tab-pill');
  countTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      if (window.soundEngine) window.soundEngine.playTap();
      countTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      selectedPlayerCount = parseInt(tab.dataset.count, 10);
      renderPlayerSlotsForCount(selectedPlayerCount);
    });
  });

  function renderPlayerSlotsForCount(count) {
    const slotsCard = document.getElementById('modalPlayerSlotsCard');
    if (!slotsCard) return;

    const colorConfigs = [
      { color: 'blue',   defaultName: 'Player 1', fill: '#0072CE' },
      { color: 'red',    defaultName: 'Player 2', fill: '#E52521' },
      { color: 'green',  defaultName: 'Player 3', fill: '#009E49' },
      { color: 'yellow', defaultName: 'Player 4', fill: '#FFC20E' }
    ];

    const activeConfigs = colorConfigs.slice(0, Math.min(count, 4));

    slotsCard.innerHTML = activeConfigs.map((cfg, idx) => `
      <div class="player-slot-row" data-color="${cfg.color}">
        <div class="slot-pin-avatar stealth-pin-trigger" data-color="${cfg.color}" title="Hold 800ms to rig winner" style="cursor: pointer; display: flex; align-items: center; justify-content: center; -webkit-user-select: none; user-select: none; touch-action: manipulation;">
          <img src="assets/images/${cfg.color}piece.png" alt="${cfg.color}" style="width: 32px; height: 38px; object-fit: contain; filter: drop-shadow(0 3px 5px rgba(0,0,0,0.5)); pointer-events: none;" />
        </div>
        <input type="text" class="slot-name-input" id="inputName-${cfg.color}" value="${cfg.defaultName}" maxlength="12" />
        <div class="slot-dice-preview">
          <img src="assets/images/dice6.png" alt="Dice" style="width: 24px; height: 24px; object-fit: contain;" />
        </div>
      </div>
    `).join('');

    attachStealthPinRigging();
  }

  // ============================================================
  // 5. STEALTH WINNER RIGGING ON SETUP SCREEN
  // Long-pressing (holds for 800ms) on ANY player's pin or avatar secretly arms Guaranteed Winner!
  // Displays sleek on-screen toast confirmation: "✓ [Color] Ready" (fades after 1.5s),
  // physical haptic vibration (50ms), and state persistence via localStorage!
  // ============================================================
  function attachStealthPinRigging() {
    const targets = document.querySelectorAll('#modalChooseColor .stealth-pin-trigger, #modalChooseColor .slot-pin-avatar, #modalChooseColor .player-slot-row');

    targets.forEach(elem => {
      const color = elem.dataset.color || elem.closest('[data-color]')?.dataset.color;
      if (!color) return;

      let pressTimer = null;
      let startX = 0;
      let startY = 0;
      let lastTap = 0;
      let isLongPressed = false;

      const triggerRig = () => {
        if (window.isGameStarted) return;
        if (window.LudoRig && typeof window.LudoRig.setWinner === 'function') {
          window.LudoRig.setWinner(color);
        } else {
          try { localStorage.setItem('ludo_favored_player', color.toLowerCase()); } catch (e) {}
          if (window.diceEngine) window.diceEngine.setFavoredPlayer(color);
          if (navigator.vibrate) try { navigator.vibrate(50); } catch (e) {}
          if (window.showStealthToast) window.showStealthToast(color);
        }
        console.log(`[Stealth] Rig confirmed from Setup screen (800ms hold): ${color.toUpperCase()} Ready!`);
      };

      const startPress = (e) => {
        if (window.isGameStarted) return;
        isLongPressed = false;
        const pt = e.touches ? e.touches[0] : e;
        startX = pt.clientX;
        startY = pt.clientY;

        // Double-tap shortcut fallback (<350ms)
        const now = Date.now();
        if (now - lastTap < 350) {
          triggerRig();
          lastTap = 0;
          return;
        }
        lastTap = now;

        // Exactly 800ms long-press hold requirement
        pressTimer = setTimeout(() => {
          isLongPressed = true;
          triggerRig();
        }, 800);
      };

      const movePress = (e) => {
        if (!pressTimer) return;
        const pt = e.touches ? e.touches[0] : e;
        if (Math.hypot(pt.clientX - startX, pt.clientY - startY) > 14) {
          clearTimeout(pressTimer);
          pressTimer = null;
        }
      };

      const cancelPress = (e) => {
        if (pressTimer) {
          clearTimeout(pressTimer);
          pressTimer = null;
        }
        if (isLongPressed && e && e.cancelable) {
          e.preventDefault();
        }
      };

      elem.addEventListener('pointerdown', startPress);
      elem.addEventListener('pointermove', movePress);
      elem.addEventListener('pointerup', cancelPress);
      elem.addEventListener('pointerleave', cancelPress);
      elem.addEventListener('pointercancel', cancelPress);
      elem.addEventListener('touchstart', startPress, { passive: true });
      elem.addEventListener('touchmove', movePress, { passive: true });
      elem.addEventListener('touchend', cancelPress);
      elem.addEventListener('touchcancel', cancelPress);
    });
  }

  // Launch from Modal 2 Buttons
  if (btnPlayMatch) {
    btnPlayMatch.addEventListener('click', () => {
      startMatchFromSetup(false);
    });
  }

  if (btnPlayOneTokenOut) {
    btnPlayOneTokenOut.addEventListener('click', () => {
      startMatchFromSetup(true);
    });
  }

  function startMatchFromSetup(oneTokenOut = false) {
    if (window.soundEngine) window.soundEngine.playTap();
    modalChooseColor.classList.remove('open');

    const colorOrder = ['blue', 'red', 'green', 'yellow'];
    const activePlayers = colorOrder.slice(0, Math.min(selectedPlayerCount, 4));

    const playerNames = {};
    activePlayers.forEach(c => {
      const input = document.getElementById(`inputName-${c}`);
      playerNames[c] = input && input.value.trim() ? input.value.trim() : `Player ${c}`;
    });

    launchGameMode('pass_n_play', activePlayers, playerNames, oneTokenOut);
  }

  function launchGameMode(mode, activePlayers, playerNames, oneTokenOut = false) {
    if (lobbyView) lobbyView.style.display = 'none';
    if (gameView) gameView.classList.add('active');

    if (window.soundEngine) {
      window.soundEngine.playGameStart();
      setTimeout(() => {
        window.soundEngine.startMusic();
      }, 1200);
    }

    // Update base labels and pill labels with customized player names
    ['blue', 'red', 'green', 'yellow'].forEach(c => {
      const nameElem = document.getElementById(`name-${c}`);
      const baseLabel = document.getElementById(`baseLabel-${c}`);
      const pillBox = document.getElementById(`corner-${c}`);

      if (activePlayers.includes(c)) {
        if (pillBox) pillBox.style.display = 'flex';
        const name = playerNames && playerNames[c] ? playerNames[c] : `Player ${c}`;
        if (nameElem) nameElem.textContent = name;
        if (baseLabel) baseLabel.textContent = name;
      } else {
        if (pillBox) pillBox.style.display = 'none';
      }
    });

    window.boardManager.startGame({
      mode,
      activePlayers,
      playerNames,
      oneTokenOut
    });
  }
});
