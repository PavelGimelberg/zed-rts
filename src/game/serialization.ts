import { GameState } from '../types';

/**
 * Serialize game state to JSON string for multiplayer sync
 * Only serializes deterministic parts (units, buildings, sectors, projectiles, tick, winner)
 */
export function serializeState(state: GameState): string {
  const serializableState = {
    tick: state.tick,
    winner: state.winner,
    winReason: state.winReason,
    isRunning: state.isRunning,
    units: state.units,
    buildings: state.buildings,
    sectors: state.sectors,
    projectiles: state.projectiles,
  };

  return JSON.stringify(serializableState);
}

/**
 * Deserialize game state from JSON string
 * Returns a partial game state that can be merged back
 */
export function deserializeState(json: string): Partial<GameState> {
  try {
    const parsed = JSON.parse(json);
    return {
      tick: parsed.tick || 0,
      winner: parsed.winner || 0,
      winReason: parsed.winReason || '',
      isRunning: parsed.isRunning !== undefined ? parsed.isRunning : true,
      units: parsed.units || {},
      buildings: parsed.buildings || {},
      sectors: parsed.sectors || [],
      projectiles: parsed.projectiles || {},
    };
  } catch (e) {
    console.error('Failed to deserialize state:', e);
    return {};
  }
}
