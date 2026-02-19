import { TeamId, UnitType } from '../types/entities';
import { TEAM } from '../types/entities';

// 8 compass directions matching the sprite filenames
export type Direction = 'south' | 'south-east' | 'east' | 'north-east' | 'north' | 'north-west' | 'west' | 'south-west';

const ALL_DIRECTIONS: Direction[] = [
  'south', 'south-east', 'east', 'north-east',
  'north', 'north-west', 'west', 'south-west',
];

// Map angle (radians) to nearest compass direction
// 0 = east, PI/2 = south, PI = west, -PI/2 = north
export function angleToDirection(angle: number): Direction {
  // Normalise to [0, 2PI)
  const a = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  // Split into 8 sectors of 45 degrees each (PI/4)
  const sector = Math.round(a / (Math.PI / 4)) % 8;
  // sector 0 = east (angle 0), going clockwise
  const map: Direction[] = [
    'east', 'south-east', 'south', 'south-west',
    'west', 'north-west', 'north', 'north-east',
  ];
  return map[sector];
}

interface UnitSprites {
  // Idle rotation sprites per direction, per team
  rotations: Map<TeamId, Map<Direction, HTMLCanvasElement>>;
  // Walk animation frames per direction, per team
  walk: Map<TeamId, Map<Direction, HTMLCanvasElement[]>>;
  walkFrameCount: number;
}

/**
 * SpriteManager loads pixel-art sprites from /sprites/ and creates
 * team-tinted variants for RED and BLUE using hue-shift compositing.
 */
export class SpriteManager {
  private sprites: Map<UnitType, UnitSprites> = new Map();
  private loaded = false;
  private loadPromise: Promise<void> | null = null;

  /** Whether all sprites are ready to use */
  get isLoaded(): boolean {
    return this.loaded;
  }

  /** Start loading all available sprites. Safe to call multiple times. */
  async load(): Promise<void> {
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = this._loadAll();
    return this.loadPromise;
  }

  /**
   * Get the correct sprite for a unit.
   * Returns null if sprites aren't loaded yet (renderer should fall back to shapes).
   */
  getSprite(
    unitType: UnitType,
    team: TeamId,
    direction: Direction,
    isMoving: boolean,
    animFrame: number,
  ): HTMLCanvasElement | null {
    const unitSprites = this.sprites.get(unitType);
    if (!unitSprites) return null;

    if (isMoving && unitSprites.walk.has(team)) {
      const teamWalk = unitSprites.walk.get(team)!;
      // Walk animations may only exist for some directions — fall back to nearest
      const dir = teamWalk.has(direction) ? direction : this.findNearestWalkDirection(teamWalk, direction);
      if (dir) {
        const frames = teamWalk.get(dir)!;
        return frames[animFrame % frames.length];
      }
    }

    // Idle rotation
    const teamRotations = unitSprites.rotations.get(team);
    if (teamRotations && teamRotations.has(direction)) {
      return teamRotations.get(direction)!;
    }

    return null;
  }

  /** Get number of walk frames for a unit type (for animation timing) */
  getWalkFrameCount(unitType: UnitType): number {
    return this.sprites.get(unitType)?.walkFrameCount || 1;
  }

  // ── Private ──

  private async _loadAll(): Promise<void> {
    // Define which unit types have sprites available
    const availableSprites: { type: UnitType; path: string }[] = [
      { type: 'grunt', path: '/sprites/grunt' },
      // Add more unit types here as sprites are generated:
      // { type: 'tank', path: '/sprites/tank' },
    ];

    const promises = availableSprites.map(({ type, path }) => this.loadUnitSprites(type, path));
    await Promise.all(promises);
    this.loaded = true;
  }

  private async loadUnitSprites(unitType: UnitType, basePath: string): Promise<void> {
    const unitSprites: UnitSprites = {
      rotations: new Map(),
      walk: new Map(),
      walkFrameCount: 1,
    };

    // 1. Load rotation sprites (idle poses for 8 directions)
    const rotationImages = new Map<Direction, HTMLImageElement>();
    const rotationPromises = ALL_DIRECTIONS.map(async (dir) => {
      try {
        const img = await this.loadImage(`${basePath}/rotations/${dir}.png`);
        rotationImages.set(dir, img);
      } catch {
        // Direction not available — skip
      }
    });
    await Promise.all(rotationPromises);

    // 2. Load walk animation frames (may only have some directions)
    const walkImages = new Map<Direction, HTMLImageElement[]>();
    const walkPromises = ALL_DIRECTIONS.map(async (dir) => {
      const frames: HTMLImageElement[] = [];
      // Try loading frames until one fails
      for (let i = 0; i < 20; i++) {
        try {
          const img = await this.loadImage(
            `${basePath}/walk/${dir}/frame_${i.toString().padStart(3, '0')}.png`
          );
          frames.push(img);
        } catch {
          break; // No more frames
        }
      }
      if (frames.length > 0) {
        walkImages.set(dir, frames);
        unitSprites.walkFrameCount = Math.max(unitSprites.walkFrameCount, frames.length);
      }
    });
    await Promise.all(walkPromises);

    // 3. Generate team-tinted variants for RED and BLUE
    const teams: TeamId[] = [TEAM.RED, TEAM.BLUE];
    for (const team of teams) {
      // Rotation tints
      const teamRotations = new Map<Direction, HTMLCanvasElement>();
      for (const [dir, img] of rotationImages) {
        teamRotations.set(dir, this.tintSprite(img, team));
      }
      unitSprites.rotations.set(team, teamRotations);

      // Walk tints
      const teamWalk = new Map<Direction, HTMLCanvasElement[]>();
      for (const [dir, frames] of walkImages) {
        teamWalk.set(dir, frames.map(img => this.tintSprite(img, team)));
      }
      unitSprites.walk.set(team, teamWalk);
    }

    this.sprites.set(unitType, unitSprites);
  }

  /**
   * Create a team-tinted version of a sprite.
   * Uses color-multiply approach: draw base sprite, then overlay team color
   * on non-transparent pixels using 'multiply' blend mode.
   */
  private tintSprite(source: HTMLImageElement, team: TeamId): HTMLCanvasElement {
    const w = source.width;
    const h = source.height;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    // Draw original sprite
    ctx.drawImage(source, 0, 0);

    // Get the team tint color
    const tintColor = team === TEAM.RED ? '#ff6666' : '#6666ff';

    // Apply soft tint using 'multiply' composite - this preserves shading
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = tintColor;
    ctx.fillRect(0, 0, w, h);

    // Restore alpha from original (multiply affects alpha too)
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(source, 0, 0);

    ctx.globalCompositeOperation = 'source-over';
    return canvas;
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  private findNearestWalkDirection(
    teamWalk: Map<Direction, HTMLCanvasElement[]>,
    target: Direction
  ): Direction | null {
    // If the exact direction exists, use it
    if (teamWalk.has(target)) return target;

    // Find the nearest available direction by stepping through neighbors
    const idx = ALL_DIRECTIONS.indexOf(target);
    for (let offset = 1; offset <= 4; offset++) {
      const cw = ALL_DIRECTIONS[(idx + offset) % 8];
      if (teamWalk.has(cw)) return cw;
      const ccw = ALL_DIRECTIONS[(idx - offset + 8) % 8];
      if (teamWalk.has(ccw)) return ccw;
    }
    return null;
  }
}
