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

    // Available players configuration
    // 2P: Blue & Red
    // 3P: Blue, Red, Green
    // 4P: Blue, Red, Green, Yellow
    const colorConfigs = [
      { color: 'blue',   defaultName: 'Player 1', icon: 'pin-blue.svg', fill: '#0072CE' },
      { color: 'red',    defaultName: 'Player 2', icon: 'pin-red.svg', fill: '#E52521' },
      { color: 'green',  defaultName: 'Player 3', icon: 'pin-green.svg', fill: '#009E49' },
      { color: 'yellow', defaultName: 'Player 4', icon: 'pin-yellow.svg', fill: '#FFC20E' }
    ];

    const activeConfigs = colorConfigs.slice(0, Math.min(count, 4));

    slotsCard.innerHTML = activeConfigs.map((cfg, idx) => `
      <div class="player-slot-row">
        <div class="slot-pin-avatar stealth-pin-trigger" data-color="${cfg.color}" title="Tap or hold pin">
          <svg viewBox="0 0 40 48" width="34" height="34">
            <ellipse cx="20" cy="46" rx="9" ry="2.5" fill="rgba(0,0,0,0.4)" />
            <path d="M20,2 C10,2 3,9 3,19 C3,28 17,44 20,45 C23,44 37,28 37,19 C37,9 30,2 20,2 Z"
                  fill="#FFFFFF" stroke="#222" stroke-width="1.8" />
            <circle cx="20" cy="19" r="10" fill="${cfg.fill}" />
          </svg>
        </div>
        <input type="text" class="slot-name-input" id="inputName-${cfg.color}" value="${cfg.defaultName}" maxlength="12" />
        <div class="slot-dice-preview">🎲</div>
      </div>
    `).join('');

    attachStealthPinRigging();
  }

  // ============================================================
  // 5. STEALTH WINNER RIGGING ON SETUP SCREEN
  // Long-pressing (1.5s) on ANY player's pin icon secretly arms Guaranteed Winner!
  // Silent physical haptic feedback (navigator.vibrate(30)) with ZERO visual hint!
  // ============================================================
  function attachStealthPinRigging() {
    document.querySelectorAll('.stealth-pin-trigger').forEach(pinElem => {
      const color = pinElem.dataset.color;
      let pressTimer = null;

      const startPress = (e) => {
        pressTimer = setTimeout(() => {
          window.diceEngine.setFavoredPlayer(color);

          // Silent physical haptic feedback
          if (window.AndroidNative && window.AndroidNative.triggerHaptic) {
            window.AndroidNative.triggerHaptic(30);
          } else if (navigator.vibrate) {
            navigator.vibrate(30);
          }

          console.log(`[Stealth] Rig armed from Setup screen: ${color.toUpperCase()} is Favored Winner!`);
        }, 1500);
      };

      const cancelPress = () => {
        if (pressTimer) {
          clearTimeout(pressTimer);
          pressTimer = null;
        }
      };

      pinElem.addEventListener('pointerdown', startPress);
      pinElem.addEventListener('pointerup', cancelPress);
      pinElem.addEventListener('pointerleave', cancelPress);
      pinElem.addEventListener('pointercancel', cancelPress);
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
