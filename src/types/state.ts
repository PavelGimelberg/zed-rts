import { Unit, Building, Sector, Projectile, Particle, Explosion, TileType } from './entities';

export interface GameState {
  tick: number;
  isRunning: boolean;
  winner: 0 | 1 | 2; // 0=none, 1=red, 2=blue
  winReason: string;

  // World
  mapTiles: TileType[][];
  worldWidth: number;
  worldHeight: number;

  // Entities (using Record for serialization, keyed by id)
  units: Record<string, Unit>;
  buildings: Record<string, Building>;
  sectors: Sector[];
  projectiles: Record<string, Projectile>;

  // Visual effects (client-only, not networked)
  particles: Particle[];
  explosions: Explosion[];

  // Deterministic counters (for multiplayer sync)
  nextUnitId: number;
  nextProjectileId: number;

  // Events emitted this tick (for audio/UI)
  events: GameEvent[];
}

export type GameEvent =
  | { type: 'unitFired'; unitId: string; targetId: string; isRocket: boolean }
  | { type: 'unitDied'; unitId: string; x: number; y: number; team: number }
  | { type: 'sectorCaptured'; sectorId: number; team: number }
  | { type: 'unitProduced'; unitId: string; buildingId: string; team: number }
  | { type: 'buildingDestroyed'; buildingId: string; x: number; y: number }
  | { type: 'gameOver'; winner: number; reason: string };
