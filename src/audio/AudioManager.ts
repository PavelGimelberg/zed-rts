/**
 * AudioManager.ts
 * Central audio system - connects game events to audio playback
 * Listens to GameEvents via EventBus and plays appropriate sounds
 */

import { EventBus } from '../utils/EventBus';
import { AudioEngine } from './AudioEngine';
import { SoundEffects } from './SoundEffects';
import { MusicGenerator } from './MusicGenerator';
import { GameEvent } from '../types';

export class AudioManager {
  private engine: AudioEngine;
  private sfx: SoundEffects | null = null;
  private music: MusicGenerator | null = null;
  private eventBus: EventBus | null;

  constructor(eventBus?: EventBus) {
    this.engine = new AudioEngine();
    this.eventBus = eventBus ?? null;
  }

  /**
   * Initialize the audio system
   * Must be called once at startup or after user interaction
   */
  init(): void {
    this.engine.init();
    const ctx = this.engine.getContext();
    const sfxGain = this.engine.getSfxGain();

    if (!ctx || !sfxGain) {
      console.error('Failed to initialize audio context');
      return;
    }

    this.sfx = new SoundEffects(ctx, sfxGain);

    const musicGain = this.engine.getMusicGain();
    if (musicGain) {
      this.music = new MusicGenerator(ctx, musicGain);
    }

    // Subscribe to game events
    this.subscribeToGameEvents();
  }

  /**
   * Subscribe to all game event types
   */
  private subscribeToGameEvents(): void {
    if (!this.eventBus) return;

    this.eventBus.on('unitFired', (event: GameEvent) => {
      if (event.type === 'unitFired') {
        this.sfx?.playShoot(event.isRocket);
      }
    });

    this.eventBus.on('unitDied', (event: GameEvent) => {
      if (event.type === 'unitDied') {
        this.sfx?.playExplosion();
      }
    });

    this.eventBus.on('sectorCaptured', (event: GameEvent) => {
      if (event.type === 'sectorCaptured') {
        this.sfx?.playCapture();
      }
    });

    this.eventBus.on('unitProduced', (event: GameEvent) => {
      if (event.type === 'unitProduced') {
        this.sfx?.playBuildComplete();
      }
    });

    this.eventBus.on('buildingDestroyed', (event: GameEvent) => {
      if (event.type === 'buildingDestroyed') {
        this.sfx?.playExplosion();
      }
    });

    this.eventBus.on('gameOver', (event: GameEvent) => {
      if (event.type === 'gameOver') {
        this.stopMusic();
      }
    });
  }

  /**
   * Start playing background music
   */
  startMusic(): void {
    if (this.music) {
      this.music.start();
    }
  }

  /**
   * Stop playing background music
   */
  stopMusic(): void {
    if (this.music) {
      this.music.stop();
    }
  }

  /**
   * Handle a batch of game events (called once per game tick)
   * Plays all sounds for events that occurred this tick
   */
  handleEvents(events: GameEvent[]): void {
    for (const event of events) {
      switch (event.type) {
        case 'unitFired':
          this.sfx?.playShoot(event.isRocket);
          break;

        case 'unitDied':
          this.sfx?.playExplosion();
          break;

        case 'sectorCaptured':
          this.sfx?.playCapture();
          break;

        case 'unitProduced':
          this.sfx?.playBuildComplete();
          break;

        case 'buildingDestroyed':
          this.sfx?.playExplosion();
          break;

        case 'gameOver':
          this.stopMusic();
          break;
      }
    }
  }

  /**
   * Play UI sound - selection highlight
   * Called by UI, not game events
   */
  playSelect(): void {
    this.sfx?.playSelect();
  }

  /**
   * Play UI sound - command confirmation
   * Called by UI, not game events
   */
  playCommand(): void {
    this.sfx?.playCommand();
  }

  /**
   * Set music volume (0-1)
   */
  setMusicVolume(volume: number): void {
    this.engine.setMusicVolume(volume);
  }

  /**
   * Set SFX volume (0-1)
   */
  setSfxVolume(volume: number): void {
    this.engine.setSfxVolume(volume);
  }
}
