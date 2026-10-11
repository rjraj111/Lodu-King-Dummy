/**
 * Authentic Sound Engine for Ludo King Clone
 * Uses original Gametion/Ludo King audio tracks with procedural fallback
 */
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.musicMuted = false;
    this.initialized = false;

    // Check saved preferences
    try {
      this.muted = localStorage.getItem('ludo_sound_muted') === 'true';
      this.musicMuted = localStorage.getItem('ludo_music_muted') === 'true';
    } catch (e) {}

    // Preloaded Audio instances
    this.audioPool = {};
    this.audioFiles = {
      click: 'assets/audio/click.mp3',
      diceroll: 'assets/audio/diceroll.mp3',
      step: 'assets/audio/step.mp3',
      safe: 'assets/audio/safe.mp3',
      death: 'assets/audio/death.mp3',
      panta: 'assets/audio/panta.mp3',
      gamestart: 'assets/audio/gamestartsound.mp3',
      congratulations: 'assets/audio/congratulations.mp3',
      music: 'assets/audio/music.mp3'
    };

    this.bgm = null;
    this.preloadAudio();
  }

  preloadAudio() {
    try {
      for (const [key, path] of Object.entries(this.audioFiles)) {
        if (key === 'music') {
          this.bgm = new Audio(path);
          this.bgm.loop = true;
          this.bgm.volume = 0.28;
        } else {
          const audio = new Audio(path);
          audio.preload = 'auto';
          this.audioPool[key] = audio;
        }
      }
    } catch (e) {
      console.warn('Audio preloading error, will fallback to WebAudio synth:', e);
    }
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.initialized = true;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playAudioFile(key, volume = 1.0) {
    if (this.muted) return;
    try {
      // Create clone or reuse for overlapping rapid sounds
      const src = this.audioFiles[key];
      if (src) {
        const sound = new Audio(src);
        sound.volume = volume;
        sound.play().catch(() => {
          // If browser policy blocked or file unavailable, use procedural synth
          this.fallbackSynth(key);
        });
        return;
      }
    } catch (e) {
      this.fallbackSynth(key);
    }
  }

  startMusic() {
    if (this.musicMuted || this.muted) return;
    if (this.bgm) {
      this.bgm.currentTime = 0;
      this.bgm.play().catch(() => {});
    }
  }

  stopMusic() {
    if (this.bgm) {
      this.bgm.pause();
    }
  }

  toggleMusic() {
    this.musicMuted = !this.musicMuted;
    try {
      localStorage.setItem('ludo_music_muted', this.musicMuted);
    } catch (e) {}
    if (this.musicMuted) {
      this.stopMusic();
    } else {
      this.startMusic();
    }
    return !this.musicMuted;
  }

  toggleMute() {
    this.muted = !this.muted;
    try {
      localStorage.setItem('ludo_sound_muted', this.muted);
    } catch (e) {}
    if (this.muted) {
      this.stopMusic();
    }
    return this.muted;
  }

  isMuted() {
    return this.muted;
  }

  // 1. Authentic Dice Roll
  playDiceRoll() {
    this.init();
    if (this.muted) return;
    this.playAudioFile('diceroll', 0.9);
  }

  // 2. Authentic Token Hop / Step
  playTokenHop(stepNumber = 0) {
    this.init();
    if (this.muted) return;
    this.playAudioFile('step', 0.85);
  }

  // 3. Authentic Safe Star Landing
  playSafeTileChime() {
    this.init();
    if (this.muted) return;
    this.playAudioFile('safe', 1.0);
  }

  // 4. Authentic Opponent Capture / Death
  playCaptureExplosion() {
    this.init();
    if (this.muted) return;
    this.playAudioFile('death', 1.0);
  }

  // 5. Authentic Home Triangle Finish ("Panta")
  playPanta() {
    this.init();
    if (this.muted) return;
    this.playAudioFile('panta', 1.0);
  }

  // 6. Authentic Victory Fanfare / Congratulations
  playVictoryFanfare() {
    this.init();
    if (this.muted) return;
    this.stopMusic();
    this.playAudioFile('congratulations', 1.0);
  }

  // 7. Authentic Game Start Fanfare
  playGameStart() {
    this.init();
    if (this.muted) return;
    this.playAudioFile('gamestart', 0.9);
  }

  // 8. Authentic Button Click
  playTap() {
    this.init();
    if (this.muted) return;
    this.playAudioFile('click', 0.7);
  }

  // 9. Turn prompt bell
  playTurnBell() {
    this.init();
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1760, now + 0.05);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.13);
    } catch (e) {}
  }

  // Synth Fallback if MP3 is unavailable
  fallbackSynth(type) {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    try {
      if (type === 'diceroll') {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.2);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.22);
      } else if (type === 'step') {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.07);
      } else if (type === 'click') {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.03);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.035);
      }
    } catch (e) {}
  }
}

// Global singleton instance
window.soundEngine = new SoundEngine();
