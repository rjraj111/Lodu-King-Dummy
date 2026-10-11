/**
 * Procedural Web Audio Sound Engine for Ludo King Clone
 * Synthesizes all sounds purely client-side without external asset dependencies.
 */
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.initialized = false;
    // Check saved mute preference
    try {
      this.muted = localStorage.getItem('ludo_sound_muted') === 'true';
    } catch (e) {}
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

  toggleMute() {
    this.muted = !this.muted;
    try {
      localStorage.setItem('ludo_sound_muted', this.muted);
    } catch (e) {}
    return this.muted;
  }

  isMuted() {
    return this.muted;
  }

  // Helper to get master gain node
  createMasterGain(duration, maxGain = 0.3) {
    if (this.muted || !this.ctx) return null;
    const now = this.ctx.currentTime;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(maxGain, now);
    gain.connect(this.ctx.destination);
    return { gain, now };
  }

  // 1. Realistic Dice Roll Rattle
  playDiceRoll() {
    this.init();
    if (this.muted || !this.ctx) return;

    const rattleCount = 7;
    const now = this.ctx.currentTime;

    for (let i = 0; i < rattleCount; i++) {
      const time = now + i * 0.045 + (Math.random() * 0.015);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      // Sharp click sound simulating dice tumbler
      osc.type = i % 2 === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(350 + Math.random() * 450, time);
      osc.frequency.exponentialRampToValueAtTime(120, time + 0.04);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200 + Math.random() * 600, time);
      filter.Q.setValueAtTime(3, time);

      gain.gain.setValueAtTime(0.25, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(time);
      osc.stop(time + 0.045);
    }

    // Impact thump at the end
    const impactTime = now + 0.35;
    const thump = this.ctx.createOscillator();
    const thumpGain = this.ctx.createGain();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(180, impactTime);
    thump.frequency.exponentialRampToValueAtTime(45, impactTime + 0.08);

    thumpGain.gain.setValueAtTime(0.35, impactTime);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, impactTime + 0.09);

    thump.connect(thumpGain);
    thumpGain.connect(this.ctx.destination);
    thump.start(impactTime);
    thump.stop(impactTime + 0.09);
  }

  // 2. Token Hop / Step Tick (Rising melodic marimba)
  playTokenHop(stepNumber = 0) {
    this.init();
    if (this.muted || !this.ctx) return;

    const baseFreqs = [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50];
    const freq = baseFreqs[stepNumber % baseFreqs.length] * (1 + Math.floor(stepNumber / 8) * 0.15);
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.85, now + 0.07);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.085);
  }

  // 3. Star Safe Tile Celestial Chime
  playSafeTileChime() {
    this.init();
    if (this.muted || !this.ctx) return;

    const notes = [659.25, 880.00, 1046.50, 1318.51, 1760.00]; // E5, A5, C6, E6, A6
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const time = now + idx * 0.05;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.22, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(time);
      osc.stop(time + 0.36);
    });
  }

  // 4. Opponent Token Capture Explosion / Whack
  playCaptureExplosion() {
    this.init();
    if (this.muted || !this.ctx) return;

    const now = this.ctx.currentTime;

    // Sub-bass thump
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'triangle';
    sub.frequency.setValueAtTime(220, now);
    sub.frequency.exponentialRampToValueAtTime(35, now + 0.25);

    subGain.gain.setValueAtTime(0.5, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    sub.connect(subGain);
    subGain.connect(this.ctx.destination);
    sub.start(now);
    sub.stop(now + 0.29);

    // Punch noise burst
    const bufferSize = this.ctx.sampleRate * 0.2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.04));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(1400, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(120, now + 0.2);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noise.start(now);

    // Cartoon slide whistle out
    const slide = this.ctx.createOscillator();
    const slideGain = this.ctx.createGain();
    slide.type = 'sine';
    slide.frequency.setValueAtTime(800, now + 0.05);
    slide.frequency.exponentialRampToValueAtTime(150, now + 0.35);

    slideGain.gain.setValueAtTime(0.25, now + 0.05);
    slideGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    slide.connect(slideGain);
    slideGain.connect(this.ctx.destination);
    slide.start(now + 0.05);
    slide.stop(now + 0.39);
  }

  // 5. Victory Fanfare (Triumphant brass trumpet sequence)
  playVictoryFanfare() {
    this.init();
    if (this.muted || !this.ctx) return;

    const now = this.ctx.currentTime;
    // Triumphant fanfare notes: G4, C5, E5, G5, G5, G5, C6 (Held)
    const melody = [
      { note: 392.00, dur: 0.12, time: 0.00 },
      { note: 523.25, dur: 0.12, time: 0.15 },
      { note: 659.25, dur: 0.12, time: 0.30 },
      { note: 783.99, dur: 0.22, time: 0.45 },
      { note: 659.25, dur: 0.12, time: 0.72 },
      { note: 783.99, dur: 0.12, time: 0.88 },
      { note: 1046.50, dur: 0.65, time: 1.05 }
    ];

    melody.forEach(item => {
      const startTime = now + item.time;
      const osc = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Brass-like harmonic layering
      osc.type = 'sawtooth';
      osc2.type = 'triangle';
      osc.frequency.setValueAtTime(item.note, startTime);
      osc2.frequency.setValueAtTime(item.note * 1.002, startTime);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, startTime);
      filter.frequency.exponentialRampToValueAtTime(1100, startTime + item.dur);

      gain.gain.setValueAtTime(0.25, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + item.dur);

      osc.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc2.start(startTime);
      osc.stop(startTime + item.dur + 0.05);
      osc2.stop(startTime + item.dur + 0.05);
    });
  }

  // 6. Turn Change Prompt / Countdown Warning
  playTurnBell() {
    this.init();
    if (this.muted || !this.ctx) return;

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
  }

  // 7. Subtle Tap Click
  playTap() {
    this.init();
    if (this.muted || !this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.03);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.035);
  }
}

// Global singleton instance
window.soundEngine = new SoundEngine();
