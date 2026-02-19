/**
 * AudioEngine.ts
 * Web Audio API wrapper managing AudioContext and gain nodes for music and SFX
 */

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  /**
   * Initialize the Web Audio API context and gain nodes
   */
  init(): void {
    // Create audio context (with webkit fallback for older browsers)
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Create music gain node
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.18;
    this.musicGain.connect(this.ctx.destination);

    // Create SFX gain node
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.35;
    this.sfxGain.connect(this.ctx.destination);
  }

  /**
   * Get the AudioContext instance
   */
  getContext(): AudioContext | null {
    return this.ctx;
  }

  /**
   * Get the music gain node for volume control
   */
  getMusicGain(): GainNode | null {
    return this.musicGain;
  }

  /**
   * Get the SFX gain node for volume control
   */
  getSfxGain(): GainNode | null {
    return this.sfxGain;
  }

  /**
   * Set music volume (0-1)
   */
  setMusicVolume(volume: number): void {
    if (this.musicGain) {
      this.musicGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Set SFX volume (0-1)
   */
  setSfxVolume(volume: number): void {
    if (this.sfxGain) {
      this.sfxGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }
}
