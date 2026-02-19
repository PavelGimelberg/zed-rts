import { GameState, Building } from '../../types';
import { CONFIG, UNIT_DEFS } from '../../config/gameConfig';
import { TEAM } from '../../types/entities';
import { spawnUnit } from '../GameState';

/**
 * Update production: unit creation at factories
 */
export function updateProduction(state: GameState): GameState {
  let newState = { ...state };
  let newBuildings = { ...state.buildings };
  let newEvents = [...state.events];

  for (const buildingId in newBuildings) {
    const building = newBuildings[buildingId];

    // Skip if not producing or not owned
    if (!building.producing || building.owner === TEAM.NONE) {
      continue;
    }

    // Count sectors owned by this building's team
    let sectorCount = 0;
    for (const sector of state.sectors) {
      if (sector.owner === building.owner) {
        sectorCount++;
      }
    }

    // Recalculate production time with speed bonus
    const baseTime = CONFIG.BASE_PROD_TIME * UNIT_DEFS[building.producing].prodTime;
    const speedBonus = 1 + (sectorCount - 1) * CONFIG.PROD_SPEED_PER_SECTOR;
    const prodMaxTime = Math.max(baseTime / speedBonus, 60);

    building.prodMaxTime = prodMaxTime;
    building.prodTimer += 1;

    // Check if unit is complete
    if (building.prodTimer >= prodMaxTime) {
      // Spawn unit at rally point with deterministic offset based on next unit ID
      const idSeed = newState.nextUnitId;
      const offsetX = ((((idSeed * 1664525 + 1013904223) & 0xffffffff) >>> 0) / 0xffffffff - 0.5) * 40;
      const offsetY = ((((idSeed * 1664525 + 1013904223 + 12345) & 0xffffffff) >>> 0) / 0xffffffff - 0.5) * 40;
      const spawnX = building.rallyX + offsetX;
      const spawnY = building.rallyY + offsetY;

      const [stateAfterSpawn, unit] = spawnUnit(
        newState,
        building.producing,
        spawnX,
        spawnY,
        building.owner
      );
      newState = stateAfterSpawn;

      // Reset production timer
      building.prodTimer = 0;

      // Emit event for audio/UI
      newEvents.push({
        type: 'unitProduced',
        unitId: unit.id,
        buildingId: building.id,
        team: building.owner,
      });
    }
  }

  return {
    ...newState,
    buildings: newBuildings,
    events: newEvents,
  };
}
