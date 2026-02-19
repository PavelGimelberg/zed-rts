/**
 * SoundEffects.ts
 * Procedural sound effect generation using Web Audio API
 */

export class SoundEffects {
  private ctx: AudioContext;
  private sfxGain: GainNode;
  private lastShootTime = 0;
  private lastExplosionTime = 0;

  constructor(ctx: AudioContext, sfxGain: GainNode) {
    this.ctx = ctx;
    this.sfxGain = sfxGain;
  }

  /**
   * Play selection sound - ascending sine chirp
   */
  playSelect(): void {
    const now = this.ctx.currentTime;
    const duration = 0.15;

    // Create oscillator
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.05, now + duration);

    // Frequency sweep: 800Hz -> 1200Hz -> 900Hz
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.linearRampToValueAtTime(1200, now + duration * 0.5);
    osc.frequency.linearRampToValueAtTime(900, now + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + duration);
  }

  /**
   * Play command/confirmation sound - ascending square wave chirp
   */
  playCommand(): void {
    const now = this.ctx.currentTime;
    const duration = 0.12;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.05, now + duration);

    // Frequency sweep: 400Hz -> 600Hz -> 500Hz
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.linearRampToValueAtTime(600, now + duration * 0.5);
    osc.frequency.linearRampToValueAtTime(500, now + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + duration);
  }

  /**
   * Play shooting sound - throttled to max 8/second
   * Different sound for bullets vs rockets
   */
  playShoot(isRocket: boolean = false): void {
    const now = this.ctx.currentTime;

    // Throttle: max 8 shoots per second
    if (now - this.lastShootTime < 0.125) {
      return;
    }
    this.lastShootTime = now;

    if (isRocket) {
      this.playRocketShoot();
    } else {
      this.playBulletShoot();
    }
  }

  /**
   * Bullet shoot - quick pop with pitch drop
   */
  private playBulletShoot(): void {
    const now = this.ctx.currentTime;
    const duration = 0.08;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    // Frequency drop: 900Hz -> 1200Hz -> 200Hz
    osc.frequency.setValueAtTime(900, now);
    osc.frequency.linearRampToValueAtTime(1200, now + duration * 0.2);
    osc.frequency.exponentialRampToValueAtTime(200, now + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + duration);
  }

  /**
   * Rocket shoot - sawtooth rumble with noise burst
   */
  private playRocketShoot(): void {
    const now = this.ctx.currentTime;
    const duration = 0.15;

    // Sawtooth rumble
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.05, now + duration);

    // Frequency sweep: 80Hz -> 40Hz
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + duration);

    // White noise burst (0.3s decay)
    this.playWhiteNoiseBurst(now, 0.3, 0.3);
  }

  /**
   * Play explosion sound - throttled to max 5/second
   */
  playExplosion(): void {
    const now = this.ctx.currentTime;

    // Throttle: max 5 explosions per second
    if (now - this.lastExplosionTime < 0.2) {
      return;
    }
    this.lastExplosionTime = now;

    const duration = 0.5;

    // Low sine boom: 120Hz -> 30Hz over 0.5s
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.05, now + duration);

    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + duration);

    // White noise crackle: 0.3s decay
    this.playWhiteNoiseBurst(now, 0.35, 0.3);
  }

  /**
   * Play capture/victory sound - rising arpeggio
   */
  playCapture(): void {
    const now = this.ctx.currentTime;

    // C5, E5, G5, C6 (pentatonic rise)
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const noteDuration = 0.25;
    const noteSpacing = 0.08;

    notes.forEach((freq, i) => {
      const noteStart = now + i * noteSpacing;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteStart);

      gain.gain.setValueAtTime(0.25, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.02, noteStart + noteDuration);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(noteStart);
      osc.stop(noteStart + noteDuration);
    });
  }

  /**
   * Play build/production complete sound - ascending triangle wave
   */
  playBuildComplete(): void {
    const now = this.ctx.currentTime;
    const duration = 0.2;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.05, now + duration);

    // Frequency sweep: 600Hz -> 900Hz
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.linearRampToValueAtTime(900, now + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + duration);
  }

  /**
   * Utility: Play white noise burst (for explosions, impacts, etc)
   */
  private playWhiteNoiseBurst(
    startTime: number,
    duration: number,
    decayTime: number
  ): void {
    const bufferSize = this.ctx.sampleRate * decayTime;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Fill buffer with white noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();

    source.buffer = buffer;
    gain.gain.setValueAtTime(0.25, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

    source.connect(gain);
    gain.connect(this.sfxGain);

    source.start(startTime);
    source.stop(startTime + duration);
  }
}
