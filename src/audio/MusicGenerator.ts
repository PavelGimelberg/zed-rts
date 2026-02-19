/**
 * MusicGenerator.ts
 * Procedural music generation - D minor pentatonic ambient background music
 */

export class MusicGenerator {
  private ctx: AudioContext;
  private musicGain: GainNode;
  private playing = false;
  private scheduler: ReturnType<typeof setTimeout> | null = null;
  private beat = 0;
  private nextBeat = 0;

  // D minor pentatonic scale notes (in Hz)
  private bassNotes = [73.42, 82.41, 98.0, 110.0, 130.81, 146.83]; // A2, E2, B2, A2, C3, D3
  private melodyNotes = [293.66, 329.63, 349.23, 392.0, 440.0, 523.25]; // D4, E4, F4, G4, A4, C5
  private padChordNotes = [146.83, 164.81, 196.0, 220.0, 246.94]; // D3, E3, G3, A3, B3

  constructor(ctx: AudioContext, musicGain: GainNode) {
    this.ctx = ctx;
    this.musicGain = musicGain;
  }

  /**
   * Start playing background music
   */
  start(): void {
    if (this.playing) return;
    this.playing = true;
    this.beat = 0;
    this.nextBeat = this.ctx.currentTime + 0.1;
    this.scheduleBeat();
  }

  /**
   * Stop playing background music
   */
  stop(): void {
    this.playing = false;
    if (this.scheduler) {
      clearTimeout(this.scheduler);
      this.scheduler = null;
    }
  }

  /**
   * Schedule the next beat of music
   * Runs every 150ms to schedule audio 0.3s ahead
   */
  private scheduleBeat(): void {
    if (!this.playing) return;

    const beatDuration = 60 / 75; // 75 BPM = 0.8s per beat
    const now = this.ctx.currentTime;

    // Schedule audio while nextBeat is ahead
    while (this.nextBeat < now + 0.3) {
      this.scheduleAudioAtBeat(this.beat, this.nextBeat);
      this.beat++;
      this.nextBeat += beatDuration;

      // Regenerate patterns every 32 beats (longer section)
      if (this.beat % 32 === 0) {
        this.beat = 0;
      }
    }

    // Schedule next scheduler call in 150ms
    this.scheduler = setTimeout(() => {
      this.scheduleBeat();
    }, 150);
  }

  /**
   * Schedule all audio elements for a specific beat
   */
  private scheduleAudioAtBeat(beat: number, beatTime: number): void {
    const beatDuration = 60 / 75; // 0.8s

    // Kick drum on beats 0 and 2 (first half of measure)
    if (beat % 4 === 0 || beat % 4 === 2) {
      this.playKickDrum(beatTime, 0.3);
    }

    // Bass notes (sawtooth) on beats 0 and 2
    if (beat % 4 === 0 || beat % 4 === 2) {
      const bassIndex = Math.floor(beat / 2) % this.bassNotes.length;
      this.playBassNote(beatTime, beatDuration * 1.5, this.bassNotes[bassIndex]);
    }

    // Hi-hat on every other beat (quick metallic hit)
    if (beat % 2 === 0) {
      this.playHiHat(beatTime, 0.1);
    }

    // Melody line (sparse, interesting pattern)
    if (beat % 8 === 0 || beat % 8 === 2 || beat % 8 === 5) {
      const melodyIndex = (beat + Math.floor(beat / 8)) % this.melodyNotes.length;
      this.playMelodyNote(
        beatTime + beatDuration * 0.5,
        beatDuration * 0.8,
        this.melodyNotes[melodyIndex]
      );
    }

    // Pad chord every 8 beats (atmospheric)
    if (beat % 8 === 0) {
      this.playPadChord(beatTime, beatDuration * 2);
    }
  }

  /**
   * Kick drum - sine wave pitch drop with attack
   */
  private playKickDrum(startTime: number, duration: number): void {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(150, startTime);
    filter.frequency.exponentialRampToValueAtTime(40, startTime + duration);

    // Pitch drop: 150Hz -> 40Hz
    osc.frequency.setValueAtTime(150, startTime);
    osc.frequency.exponentialRampToValueAtTime(40, startTime + duration);

    // Volume envelope
    gain.gain.setValueAtTime(0.4, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  /**
   * Bass note - sawtooth through lowpass filter
   */
  private playBassNote(
    startTime: number,
    duration: number,
    frequency: number
  ): void {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(frequency, startTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, startTime);

    // Smooth attack and release
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.2, startTime + duration * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.05, startTime + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  /**
   * Hi-hat - white noise through highpass filter
   */
  private playHiHat(startTime: number, duration: number): void {
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // White noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    source.buffer = buffer;
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(8000, startTime);

    // Quick decay
    gain.gain.setValueAtTime(0.15, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    source.start(startTime);
    source.stop(startTime + duration);
  }

  /**
   * Melody note - square wave with smooth filtering
   */
  private playMelodyNote(
    startTime: number,
    duration: number,
    frequency: number
  ): void {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'square';
    osc.frequency.setValueAtTime(frequency, startTime);

    filter.type = 'lowpass';
    // Lowpass sweep: 2000Hz -> 600Hz for musical filtering
    filter.frequency.setValueAtTime(2000, startTime);
    filter.frequency.exponentialRampToValueAtTime(600, startTime + duration);

    // Attack and release
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.2, startTime + duration * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.05, startTime + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  /**
   * Pad chord - sine waves playing together for ambient harmony
   */
  private playPadChord(startTime: number, duration: number): void {
    const chordNotes = this.padChordNotes;

    chordNotes.forEach((frequency) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, startTime);

      // Long, smooth attack and release for pad sound
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.15, startTime + duration * 0.2);
      gain.gain.linearRampToValueAtTime(0.1, startTime + duration * 0.8);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

      osc.connect(gain);
      gain.connect(this.musicGain);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  }
}
