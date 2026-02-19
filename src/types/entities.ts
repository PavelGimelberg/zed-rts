// Team
export type TeamId = 0 | 1 | 2; // NONE=0, RED=1, BLUE=2
export const TEAM = { NONE: 0 as TeamId, RED: 1 as TeamId, BLUE: 2 as TeamId };

// Tile types
export type TileType = 0 | 1 | 2 | 3 | 4; // grass=0, water=1, road=2, mountain=3, dirt=4

// Unit types
export type UnitType = 'grunt' | 'psycho' | 'tough' | 'sniper' | 'jeep' | 'tank' | 'heavy';
export type BuildingType = 'fort' | 'robotFactory' | 'vehicleFactory';
export type UnitState = 'idle' | 'moving' | 'attacking';

export interface Vector2 { x: number; y: number; }

export interface Unit {
  id: string;
  type: UnitType;
  owner: TeamId;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  state: UnitState;
  path: Vector2[];
  fireCooldown: number;
  attackTargetId: string | null; // ID of unit or building
  selected: boolean;
}

export interface Building {
  id: string;
  type: BuildingType;
  owner: TeamId;
  sectorId: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  producing: UnitType | null;
  prodTimer: number;
  prodMaxTime: number;
  rallyX: number;
  rallyY: number;
  size: number;
}

export interface Sector {
  id: number;
  x: number; y: number; w: number; h: number;
  flagX: number; flagY: number;
  owner: TeamId;
  captureProgress: number;
  capturingTeam: TeamId;
  buildingType: BuildingType;
}

export interface Projectile {
  id: string;
  x: number; y: number;
  targetX: number; targetY: number;
  targetId: string | null;
  speed: number;
  damage: number;
  team: TeamId;
  isRocket: boolean;
  trail: Array<{ x: number; y: number; life: number }>;
  alive: boolean;
}

export interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  color: string;
  size: number;
}

export interface Explosion {
  x: number; y: number;
  size: number;
  frame: number;
  maxFrame: number;
}

export interface UnitDefinition {
  name: string;
  hp: number;
  damage: number;
  range: number;
  speed: number;
  fireRate: number;
  size: number;
  prodTime: number;
  isVehicle: boolean;
  color: string;
}

export interface BuildingDefinition {
  name: string;
  hp: number;
  size: number;
  produces: UnitType[] | null;
}

export interface TeamColors {
  main: string;
  light: string;
  dark: string;
  fill: string;
  flag: string;
}
