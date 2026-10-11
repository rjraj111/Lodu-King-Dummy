/**
 * Ludo King Lobby Controller & Stealth Setup Rigging
 * Manages mode launches, realistic toasts, and disguised long-press winner rigging in Pass N Play setup.
 */

document.addEventListener('DOMContentLoaded', () => {
  const lobbyView = document.getElementById('lobby-view');
  const gameView = document.getElementById('game-view');
  const setupModal = document.getElementById('setupModal');
  const toastElem = document.getElementById('serverToast');

  // Mode Buttons
  const btnPlayOnline = document.getElementById('btnPlayOnline');
  const btnPlayFriends = document.getElementById('btnPlayFriends');
  const btnVsComputer = document.getElementById('btnVsComputer');
  const btnPassNPlay = document.getElementById('btnPassNPlay');
  const btnStartMatch = document.getElementById('btnStartMatch');
  const btnCloseSetup = document.getElementById('btnCloseSetup');
  const backToLobbyBtn = document.getElementById('backToLobbyBtn');

  // Player count buttons in setup
  let selectedPlayerCount = 4;
  const countButtons = document.querySelectorAll('.player-count-btn');
  countButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      countButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedPlayerCount = parseInt(btn.dataset.count, 10);
      updateSetupAvatarsDisplay();
    });
  });

  function updateSetupAvatarsDisplay() {
    const slots = document.querySelectorAll('.setup-player-card');
    slots.forEach((slot, idx) => {
      if (idx < selectedPlayerCount) {
        slot.style.opacity = '1';
        slot.style.pointerEvents = 'auto';
      } else {
        slot.style.opacity = '0.35';
        slot.style.pointerEvents = 'none';
      }
    });
  }

  // Realistic Toast for Online / Friends
  function showToast(msg) {
    if (!toastElem) return;
    toastElem.innerHTML = `<span class="spinner"></span><span>${msg}</span>`;
    toastElem.classList.add('show');
    if (window.soundEngine) window.soundEngine.playTap();
    setTimeout(() => {
      toastElem.classList.remove('show');
    }, 2400);
  }

  if (btnPlayOnline) {
    btnPlayOnline.addEventListener('click', () => {
      showToast('Connecting to global matchmaking server...');
      setTimeout(() => {
        launchGameMode('vs_computer', ['red', 'green', 'yellow', 'blue']);
      }, 1400);
    });
  }

  if (btnPlayFriends) {
    btnPlayFriends.addEventListener('click', () => {
      showToast('Connecting to private lobby server...');
      setTimeout(() => {
        launchGameMode('pass_n_play', ['red', 'green', 'yellow', 'blue']);
      }, 1400);
    });
  }

  if (btnVsComputer) {
    btnVsComputer.addEventListener('click', () => {
      if (window.soundEngine) window.soundEngine.playTap();
      launchGameMode('vs_computer', ['red', 'green', 'yellow', 'blue']);
    });
  }

  if (btnPassNPlay) {
    btnPassNPlay.addEventListener('click', () => {
      if (window.soundEngine) window.soundEngine.playTap();
      setupModal.classList.add('open');
      updateSetupAvatarsDisplay();
    });
  }

  if (btnCloseSetup) {
    btnCloseSetup.addEventListener('click', () => {
      setupModal.classList.remove('open');
    });
  }

  if (btnStartMatch) {
    btnStartMatch.addEventListener('click', () => {
      setupModal.classList.remove('open');
      const order = ['red', 'green', 'yellow', 'blue'].slice(0, selectedPlayerCount);
      launchGameMode('pass_n_play', order);
    });
  }

  if (backToLobbyBtn) {
    backToLobbyBtn.addEventListener('click', () => {
      if (window.soundEngine) window.soundEngine.playTap();
      gameView.classList.remove('active');
      lobbyView.style.display = 'flex';
    });
  }

  function launchGameMode(mode, activePlayers) {
    lobbyView.style.display = 'none';
    gameView.classList.add('active');
    window.boardManager.startGame({ mode, activePlayers });
  }

  /* ============================================================
     DISGUISED STEALTH RIGGING (Pass N Play Setup)
     Long-press (touch & hold for 1.5s) on any avatar sets Guaranteed Winner!
     Haptic feedback (navigator.vibrate(25)) confirms silently without any UI!
     ============================================================ */
  document.querySelectorAll('.setup-player-card').forEach(card => {
    const color = card.dataset.color;
    let pressTimer = null;
    let didTriggerRig = false;

    const startPress = (e) => {
      didTriggerRig = false;
      pressTimer = setTimeout(() => {
        // Long-press 1.5 seconds reached!
        window.diceEngine.setFavoredPlayer(color);

        // Silent physical haptic feedback
        if (window.AndroidNative && window.AndroidNative.triggerHaptic) {
          window.AndroidNative.triggerHaptic(25);
        } else if (navigator.vibrate) {
          navigator.vibrate(25);
        }

        didTriggerRig = true;
        console.log(`[Stealth] Stealth rigging armed: ${color} is Guaranteed Winner.`);
      }, 1500);
    };

    const cancelPress = () => {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    };

    card.addEventListener('pointerdown', startPress);
    card.addEventListener('pointerup', cancelPress);
    card.addEventListener('pointerleave', cancelPress);
    card.addEventListener('pointercancel', cancelPress);
  });
});
