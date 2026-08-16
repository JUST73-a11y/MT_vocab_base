// Web Audio API Sound and Music Synthesizer for LexiGo Games
// This operates without external files, ensuring fast loading and offline functionality.

class SoundManager {
  private ctx: AudioContext | null = null;
  private bgRunning: boolean = false;
  private bgTimeouts: number[] = [];
  private masterGain: GainNode | null = null;
  private reverbNode: ConvolverNode | null = null;

  // Settings
  private musicEnabled: boolean = true;
  private sfxEnabled: boolean = true;
  private volume: number = 0.5; // 0.0 to 1.0

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.musicEnabled = localStorage.getItem('lexigo_music_enabled') !== 'false';
        this.sfxEnabled = localStorage.getItem('lexigo_sfx_enabled') !== 'false';
        const savedVolume = localStorage.getItem('lexigo_volume');
        if (savedVolume !== null) {
          this.volume = parseFloat(savedVolume);
        }
      } catch (e) {
        console.warn('LocalStorage not available:', e);
      }
    }
  }

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtor) {
        this.ctx = new AudioCtor();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
        this.updateVolume();

        // Create a simple impulse response for reverb
        this.reverbNode = this.createReverb(1.5, 2.0);
        const reverbGain = this.ctx.createGain();
        reverbGain.gain.value = 0.15;
        this.masterGain.connect(this.reverbNode);
        this.reverbNode.connect(reverbGain);
        reverbGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private createReverb(seconds: number, decay: number): ConvolverNode {
    const ctx = this.ctx!;
    const rate = ctx.sampleRate;
    const len = rate * seconds;
    const impulse = ctx.createBuffer(2, len, rate);
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < len; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    const convolver = ctx.createConvolver();
    convolver.buffer = impulse;
    return convolver;
  }

  private playPianoNote(freq: number, when: number, duration: number, velocity: number) {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;

    // Fundamental (sine)
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, when);

    // Warm harmonics
    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2, when);

    const osc3 = ctx.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(freq * 3, when);

    const g1 = ctx.createGain(); g1.gain.setValueAtTime(1.0, when);
    const g2 = ctx.createGain(); g2.gain.setValueAtTime(0.2, when);
    const g3 = ctx.createGain(); g3.gain.setValueAtTime(0.05, when);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, when);
    env.gain.linearRampToValueAtTime(velocity, when + 0.008); // Piano attack
    env.gain.exponentialRampToValueAtTime(velocity * 0.6, when + 0.15);
    env.gain.exponentialRampToValueAtTime(0.001, when + duration);

    osc1.connect(g1);
    osc2.connect(g2);
    osc3.connect(g3);

    g1.connect(env);
    g2.connect(env);
    g3.connect(env);

    env.connect(this.masterGain);

    osc1.start(when);
    osc2.start(when);
    osc3.start(when);

    osc1.stop(when + duration + 0.1);
    osc2.stop(when + duration + 0.1);
    osc3.stop(when + duration + 0.1);
  }

  public playHiHat(when: number, velocity: number) {
    if (!this.ctx || !this.masterGain || !this.sfxEnabled) return;
    const ctx = this.ctx;
    const bufferSize = Math.floor(ctx.sampleRate * 0.05);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7000, when);

    const env = ctx.createGain();
    env.gain.setValueAtTime(velocity, when);
    env.gain.exponentialRampToValueAtTime(0.001, when + 0.05);

    source.connect(filter);
    filter.connect(env);
    env.connect(this.masterGain);

    source.start(when);
    source.stop(when + 0.06);
  }

  public playCorrect() {
    this.initContext();
    if (!this.ctx || !this.masterGain || !this.sfxEnabled) return;
    const now = this.ctx.currentTime;

    // Happy rising C major arpeggio
    const chord = [261.63, 329.63, 392.00, 523.25, 659.25];
    chord.forEach((freq, idx) => {
      this.playPianoNote(freq, now + idx * 0.08, 0.6, 0.45);
    });

    // Ringing chime on top
    const chime = this.ctx.createOscillator();
    chime.type = 'sine';
    chime.frequency.setValueAtTime(1046.50, now + 0.32); // C6
    const chimeGain = this.ctx.createGain();
    chimeGain.gain.setValueAtTime(0, now + 0.32);
    chimeGain.gain.linearRampToValueAtTime(0.18, now + 0.34);
    chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    chime.connect(chimeGain);
    chimeGain.connect(this.masterGain);
    chime.start(now + 0.32);
    chime.stop(now + 1.3);
  }

  public playWrong() {
    this.initContext();
    if (!this.ctx || !this.masterGain || !this.sfxEnabled) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Dual sawtooth low buzzer (130Hz & 138Hz dissonance)
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(130, now);
    osc2.frequency.setValueAtTime(138.5, now);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, now);
    filter.frequency.exponentialRampToValueAtTime(150, now + 0.35);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.5, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(env);
    env.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.36);
    osc2.stop(now + 0.36);
  }

  public playTick() {
    this.initContext();
    if (!this.ctx || !this.masterGain || !this.sfxEnabled) return;
    const now = this.ctx.currentTime;
    // High woodblock tick
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, now);
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.15, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(env);
    env.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  public playCombo(comboCount: number) {
    this.initContext();
    if (!this.ctx || !this.masterGain || !this.sfxEnabled) return;
    const now = this.ctx.currentTime;
    // Higher pitches for bigger combos
    const baseFreq = 329.63; // E4
    const multiplier = 1 + (comboCount * 0.1);
    this.playPianoNote(baseFreq * multiplier, now, 0.5, 0.4);
    this.playPianoNote(baseFreq * multiplier * 1.5, now + 0.05, 0.5, 0.3);
  }

  // ── ⚔️ DUEL BATTLE SPECIALIZED SFX ──────────────────────────────────────────

  public playSwordClash() {
    this.initContext();
    if (!this.ctx || !this.masterGain || !this.sfxEnabled) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // 1. Metal strike (High noise burst through bandpass)
    const bufferSize = Math.floor(ctx.sampleRate * 0.25);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.04));
    }
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;

    const metalFilter = ctx.createBiquadFilter();
    metalFilter.type = 'bandpass';
    metalFilter.frequency.setValueAtTime(3200, now);
    metalFilter.Q.setValueAtTime(8, now);

    const metalGain = ctx.createGain();
    metalGain.gain.setValueAtTime(0.7, now);
    metalGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    noiseSource.connect(metalFilter);
    metalFilter.connect(metalGain);
    metalGain.connect(this.masterGain);
    noiseSource.start(now);
    noiseSource.stop(now + 0.26);

    // 2. High metallic ring (sine harmonic chime)
    [2400, 3600, 4800].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.2 / (idx + 1), now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.8 + idx * 0.2);
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(now);
      osc.stop(now + 1.1);
    });

    // 3. Low energy impact punch
    const punch = ctx.createOscillator();
    punch.type = 'sine';
    punch.frequency.setValueAtTime(140, now);
    punch.frequency.exponentialRampToValueAtTime(30, now + 0.35);
    const punchGain = ctx.createGain();
    punchGain.gain.setValueAtTime(0.6, now);
    punchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    punch.connect(punchGain);
    punchGain.connect(this.masterGain);
    punch.start(now);
    punch.stop(now + 0.36);
  }

  public playBattleCountdown(count: number) {
    this.initContext();
    if (!this.ctx || !this.masterGain || !this.sfxEnabled) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    if (count > 0) {
      // Beep tick
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.35, now);
      env.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(env);
      env.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.16);
    } else {
      // FIGHT! / GO sound: Explosive chord + high lead
      this.playSwordClash();
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(587.33, now); // D5
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2000, now);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.4, now);
      env.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.connect(filter);
      filter.connect(env);
      env.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.65);
    }
  }

  public playStreakFire() {
    this.initContext();
    if (!this.ctx || !this.masterGain || !this.sfxEnabled) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.25);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.3, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(filter);
    filter.connect(env);
    env.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.32);
  }

  public playVictoryFanfare() {
    this.initContext();
    if (!this.ctx || !this.masterGain || !this.sfxEnabled) return;
    const now = this.ctx.currentTime;

    // Fanfare arpeggio: C4, E4, G4, C5, E5, G5
    const notes = [
      { f: 523.25, t: 0.0, d: 0.18 },  // C5
      { f: 659.25, t: 0.15, d: 0.18 }, // E5
      { f: 783.99, t: 0.30, d: 0.18 }, // G5
      { f: 1046.50, t: 0.45, d: 0.6 }, // C6 (Long hold)
    ];

    notes.forEach(n => {
      this.playPianoNote(n.f, now + n.t, n.d, 0.55);
    });
  }

  public playDefeatTone() {
    this.initContext();
    if (!this.ctx || !this.masterGain || !this.sfxEnabled) return;
    const now = this.ctx.currentTime;

    const notes = [
      { f: 392.00, t: 0.0, d: 0.4 },  // G4
      { f: 349.23, t: 0.3, d: 0.4 },  // F4
      { f: 311.13, t: 0.6, d: 0.4 },  // Eb4
      { f: 261.63, t: 0.9, d: 0.8 },  // C4
    ];

    notes.forEach(n => {
      this.playPianoNote(n.f, now + n.t, n.d, 0.35);
    });
  }

  public startMusic() {
    this.initContext();
    if (!this.ctx || !this.musicEnabled || this.bgRunning) return;
    this.bgRunning = true;

    // Waltz like waltzy melody
    const C4 = 261.63, D4 = 293.66, E4 = 329.63, F4 = 349.23,
          G4 = 392.00, A4 = 440.00, B4 = 493.88, C5 = 523.25;
    const C3 = 130.81, G3 = 196.00, E3 = 164.81, F3 = 174.61;

    const melody = [
      { f: E4, d: 0.9 }, { f: G4, d: 0.9 }, { f: A4, d: 1.3 }, { f: G4, d: 0.9 },
      { f: E4, d: 0.9 }, { f: C4, d: 1.3 }, { f: D4, d: 0.9 }, { f: F4, d: 0.9 },
      { f: G4, d: 1.8 }, { f: E4, d: 0.9 }, { f: C5, d: 0.9 }, { f: B4, d: 1.3 },
      { f: A4, d: 0.9 }, { f: G4, d: 0.9 }, { f: E4, d: 1.8 }
    ];

    const bass = [
      { f: C3, d: 1.8 }, { f: G3, d: 1.8 }, { f: E3, d: 1.8 }, { f: F3, d: 1.8 },
      { f: G3, d: 1.8 }, { f: C3, d: 1.8 }
    ];

    let melodyIndex = 0;
    const playMelodyStep = () => {
      if (!this.bgRunning || !this.ctx) return;
      const note = melody[melodyIndex % melody.length];
      melodyIndex++;
      this.playPianoNote(note.f, this.ctx.currentTime, 1.8, 0.22);
      const timer = window.setTimeout(playMelodyStep, note.d * 1000);
      this.bgTimeouts.push(timer);
    };

    let bassIndex = 0;
    const playBassStep = () => {
      if (!this.bgRunning || !this.ctx) return;
      const note = bass[bassIndex % bass.length];
      bassIndex++;
      this.playPianoNote(note.f, this.ctx.currentTime, 2.5, 0.15);
      const timer = window.setTimeout(playBassStep, note.d * 1000);
      this.bgTimeouts.push(timer);
    };

    playMelodyStep();
    const bassTimer = window.setTimeout(playBassStep, 450);
    this.bgTimeouts.push(bassTimer);
  }

  public stopMusic() {
    this.bgRunning = false;
    this.bgTimeouts.forEach(t => clearTimeout(t));
    this.bgTimeouts = [];
  }

  private updateVolume() {
    if (this.masterGain) {
      this.masterGain.gain.value = this.volume * 0.4; // Scaled max
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    this.updateVolume();
    try {
      localStorage.setItem('lexigo_volume', this.volume.toString());
    } catch (e) {}
  }

  public getVolume(): number {
    return this.volume;
  }

  public setMusicEnabled(enabled: boolean) {
    this.musicEnabled = enabled;
    try {
      localStorage.setItem('lexigo_music_enabled', this.musicEnabled.toString());
    } catch (e) {}
    if (enabled) {
      this.startMusic();
    } else {
      this.stopMusic();
    }
  }

  public isMusicEnabled(): boolean {
    return this.musicEnabled;
  }

  public setSfxEnabled(enabled: boolean) {
    this.sfxEnabled = enabled;
    try {
      localStorage.setItem('lexigo_sfx_enabled', this.sfxEnabled.toString());
    } catch (e) {}
  }

  public isSfxEnabled(): boolean {
    return this.sfxEnabled;
  }
}

// Export a singleton instance
export const soundManager = new SoundManager();
