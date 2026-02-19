import { GameState, Unit, UnitType, TeamId } from '../types';
import { TEAM } from '../types/entities';
import { CONFIG, UNIT_DEFS } from '../config/gameConfig';
import { generateMap } from './mapGenerator';
import { SeededRandom } from '../utils/random';

/**
 * Create initial game state with map, sectors, buildings, and starting units
 */
export function createInitialState(seed?: number): GameState {
  const rng = new SeededRandom(seed ?? Math.floor(Math.random() * 0xffffffff));

  const { mapTiles, sectors, buildings } = generateMap(rng);

  const worldWidth = CONFIG.MAP_COLS * CONFIG.TILE_SIZE;
  const worldHeight = CONFIG.MAP_ROWS * CONFIG.TILE_SIZE;

  let state: GameState = {
    tick: 0,
    isRunning: true,
    winner: TEAM.NONE,
    winReason: '',
    mapTiles,
    worldWidth,
    worldHeight,
    units: {},
    buildings: {},
    sectors,
    projectiles: {},
    particles: [],
    explosions: [],
    nextUnitId: 0,
    nextProjectileId: 0,
    events: [],
  };

  // Add buildings to state
  for (const building of buildings) {
    state.buildings[building.id] = building;
  }

  // Spawn starting units for RED team
  const redStartX = 160;
  const redStartY = 160;

  // 3 grunts
  for (let i = 0; i < 3; i++) {
    const [newState] = spawnUnit(state, 'grunt', redStartX + i * 30, redStartY, TEAM.RED);
    state = newState;
  }

  // 1 psycho
  [state] = spawnUnit(state, 'psycho', redStartX + 90, redStartY, TEAM.RED);

  // 1 tough
  [state] = spawnUnit(state, 'tough', redStartX + 120, redStartY, TEAM.RED);

  // Spawn starting units for BLUE team
  const blueStartX = worldWidth - 160;
  const blueStartY = worldHeight - 160;

  // 3 grunts
  for (let i = 0; i < 3; i++) {
    [state] = spawnUnit(state, 'grunt', blueStartX - i * 30, blueStartY, TEAM.BLUE);
  }

  // 1 psycho
  [state] = spawnUnit(state, 'psycho', blueStartX - 90, blueStartY, TEAM.BLUE);

  // 1 tough
  [state] = spawnUnit(state, 'tough', blueStartX - 120, blueStartY, TEAM.BLUE);

  return state;
}

/**
 * Spawn a unit at the given position and add it to state
 * Returns [updatedState, unit]
 */
export function spawnUnit(
  state: GameState,
  type: UnitType,
  x: number,
  y: number,
  team: TeamId
): [GameState, Unit] {
  const def = UNIT_DEFS[type];

  // Generate unique ID using deterministic counter
  const unitId = `unit_${state.nextUnitId}`;

  const unit: Unit = {
    id: unitId,
    type,
    owner: team,
    x,
    y,
    hp: def.hp,
    maxHp: def.hp,
    state: 'idle',
    path: [],
    fireCooldown: 0,
    attackTargetId: null,
    selected: false,
  };

  const newState = { ...state };
  newState.units = { ...state.units, [unitId]: unit };
  newState.nextUnitId = state.nextUnitId + 1;

  return [newState, unit];
}
