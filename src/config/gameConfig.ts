import { UnitDefinition, BuildingDefinition, TeamColors, UnitType, BuildingType, TeamId, TileType, Sector } from '../types';
import { TEAM } from '../types/entities';

// Game configuration constants
export const CONFIG = {
  TILE_SIZE: 40,          // flat-world tile size (used by game logic)
  MAP_COLS: 40,
  MAP_ROWS: 28,
  ISO_TILE_W: 128,        // isometric tile render width
  ISO_TILE_H: 64,         // isometric tile render height
  ISO_HALF_W: 64,         // half-width for iso projection
  ISO_HALF_H: 32,         // half-height for iso projection
  CAMERA_SPEED: 12,
  EDGE_SCROLL_ZONE: 30,
  CAPTURE_TIME: 120,
  CAPTURE_RANGE: 60,
  BASE_PROD_TIME: 3000,
  PROD_SPEED_PER_SECTOR: 0.08,
} as const;

// Unit definitions (3x slower speeds)
export const UNIT_DEFS: Record<UnitType, UnitDefinition> = {
  grunt: {
    name: 'Grunt',
    hp: 40,
    damage: 5,
    range: 80,
    speed: 0.73,
    fireRate: 30,
    size: 8,
    prodTime: 0.3,
    isVehicle: false,
    color: '#8d8',
  },
  psycho: {
    name: 'Psycho',
    hp: 55,
    damage: 7,
    range: 100,
    speed: 0.67,
    fireRate: 15,
    size: 9,
    prodTime: 0.5,
    isVehicle: false,
    color: '#dd8',
  },
  tough: {
    name: 'Tough',
    hp: 90,
    damage: 18,
    range: 120,
    speed: 0.47,
    fireRate: 60,
    size: 10,
    prodTime: 0.8,
    isVehicle: false,
    color: '#d88',
  },
  sniper: {
    name: 'Sniper',
    hp: 35,
    damage: 25,
    range: 200,
    speed: 0.60,
    fireRate: 70,
    size: 8,
    prodTime: 0.7,
    isVehicle: false,
    color: '#8dd',
  },
  jeep: {
    name: 'Jeep',
    hp: 70,
    damage: 8,
    range: 110,
    speed: 1.17,
    fireRate: 20,
    size: 14,
    prodTime: 0.55,
    isVehicle: true,
    color: '#9b9',
  },
  tank: {
    name: 'Tank',
    hp: 180,
    damage: 30,
    range: 150,
    speed: 0.50,
    fireRate: 55,
    size: 16,
    prodTime: 1.0,
    isVehicle: true,
    color: '#99b',
  },
  heavy: {
    name: 'Heavy Tank',
    hp: 300,
    damage: 45,
    range: 160,
    speed: 0.33,
    fireRate: 75,
    size: 18,
    prodTime: 1.5,
    isVehicle: true,
    color: '#b99',
  },
};

// Building definitions
export const BUILDING_DEFS: Record<BuildingType, BuildingDefinition> = {
  fort: {
    name: 'Command Fort',
    hp: 500,
    size: 32,
    produces: null,
  },
  robotFactory: {
    name: 'Robot Factory',
    hp: 200,
    size: 24,
    produces: ['grunt', 'psycho', 'tough', 'sniper'],
  },
  vehicleFactory: {
    name: 'Vehicle Factory',
    hp: 250,
    size: 26,
    produces: ['jeep', 'tank', 'heavy'],
  },
};

// Team colors
export const TEAM_COLORS = {
  [TEAM.NONE]: {
    main: '#888',
    light: '#aaa',
    dark: '#666',
    fill: '#777',
    flag: '#999',
  },
  [TEAM.RED]: {
    main: '#f44',
    light: '#f88',
    dark: '#c00',
    fill: '#e44',
    flag: '#ff6666',
  },
  [TEAM.BLUE]: {
    main: '#44f',
    light: '#88f',
    dark: '#00c',
    fill: '#44e',
    flag: '#6666ff',
  },
} as Record<TeamId, TeamColors>;

// Tile colors with 3 variants each for noise
export const TILE_COLORS: Record<TileType, string[]> = {
  0: ['#4a6', '#5b7', '#396'], // grass variants
  1: ['#36c', '#47d', '#25b'], // water variants
  2: ['#875', '#986', '#764'], // road variants
  3: ['#754', '#865', '#643'], // mountain variants
  4: ['#976', '#a87', '#865'], // dirt variants
};

// Sector definitions (3x3 grid layout)
// RED owns: 0, 1, 3 (top-left cluster)
// BLUE owns: 5, 7, 8 (bottom-right cluster)
// Neutral: 2, 4, 6
export const SECTOR_DEFS: Sector[] = [
  // Row 0
  {
    id: 0,
    x: 0,
    y: 0,
    w: 533,
    h: 373,
    flagX: 266,
    flagY: 186,
    owner: TEAM.RED,
    captureProgress: 0,
    capturingTeam: TEAM.NONE,
    buildingType: 'fort',
  },
  {
    id: 1,
    x: 533,
    y: 0,
    w: 533,
    h: 373,
    flagX: 799,
    flagY: 186,
    owner: TEAM.RED,
    captureProgress: 0,
    capturingTeam: TEAM.NONE,
    buildingType: 'robotFactory',
  },
  {
    id: 2,
    x: 1066,
    y: 0,
    w: 534,
    h: 373,
    flagX: 1333,
    flagY: 186,
    owner: TEAM.NONE,
    captureProgress: 0,
    capturingTeam: TEAM.NONE,
    buildingType: 'vehicleFactory',
  },
  // Row 1
  {
    id: 3,
    x: 0,
    y: 373,
    w: 533,
    h: 373,
    flagX: 266,
    flagY: 559,
    owner: TEAM.RED,
    captureProgress: 0,
    capturingTeam: TEAM.NONE,
    buildingType: 'vehicleFactory',
  },
  {
    id: 4,
    x: 533,
    y: 373,
    w: 533,
    h: 373,
    flagX: 799,
    flagY: 559,
    owner: TEAM.NONE,
    captureProgress: 0,
    capturingTeam: TEAM.NONE,
    buildingType: 'robotFactory',
  },
  {
    id: 5,
    x: 1066,
    y: 373,
    w: 534,
    h: 373,
    flagX: 1333,
    flagY: 559,
    owner: TEAM.BLUE,
    captureProgress: 0,
    capturingTeam: TEAM.NONE,
    buildingType: 'robotFactory',
  },
  // Row 2
  {
    id: 6,
    x: 0,
    y: 746,
    w: 533,
    h: 374,
    flagX: 266,
    flagY: 933,
    owner: TEAM.NONE,
    captureProgress: 0,
    capturingTeam: TEAM.NONE,
    buildingType: 'vehicleFactory',
  },
  {
    id: 7,
    x: 533,
    y: 746,
    w: 533,
    h: 374,
    flagX: 799,
    flagY: 933,
    owner: TEAM.BLUE,
    captureProgress: 0,
    capturingTeam: TEAM.NONE,
    buildingType: 'robotFactory',
  },
  {
    id: 8,
    x: 1066,
    y: 746,
    w: 534,
    h: 374,
    flagX: 1333,
    flagY: 933,
    owner: TEAM.BLUE,
    captureProgress: 0,
    capturingTeam: TEAM.NONE,
    buildingType: 'fort',
  },
];
