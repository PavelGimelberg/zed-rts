import { GameState, TeamId } from '../../types';
import { CONFIG } from '../../config/gameConfig';
import { distance } from '../../utils/math';

/**
 * Update sector capture: count units, determine capturing team, update progress
 */
export function updateCapture(state: GameState): GameState {
  let newSectors = state.sectors.map((s) => ({ ...s }));
  let newBuildings = { ...state.buildings };
  let newEvents = [...state.events];

  for (let i = 0; i < newSectors.length; i++) {
    const sector = newSectors[i];

    // Count RED and BLUE units within CAPTURE_RANGE of flag
    let redCount = 0;
    let blueCount = 0;

    for (const unitId in state.units) {
      const unit = state.units[unitId];
      if (unit.hp <= 0) continue;

      const dist = distance(unit.x, unit.y, sector.flagX, sector.flagY);
      if (dist <= CONFIG.CAPTURE_RANGE) {
        if (unit.owner === 1) {
          redCount++;
        } else if (unit.owner === 2) {
          blueCount++;
        }
      }
    }

    // Determine capturing team
    let capturingTeam: TeamId = 0 as TeamId; // NONE
    if (redCount > blueCount) {
      capturingTeam = 1; // RED
    } else if (blueCount > redCount) {
      capturingTeam = 2; // BLUE
    }

    // Update capture progress
    let progress = sector.captureProgress;

    if (capturingTeam !== sector.owner && capturingTeam !== 0) {
      // Being contested by new team
      if (sector.capturingTeam !== capturingTeam) {
        sector.capturingTeam = capturingTeam;
        progress = 0;
      } else {
        // Increase progress (speed = min(unitCount, 4))
        const teamCount = capturingTeam === 1 ? redCount : blueCount;
        const captureSpeed = Math.min(teamCount, 4);
        progress += captureSpeed;
      }
    } else if (capturingTeam === 0) {
      // Not being contested, decay progress
      progress = Math.max(0, progress - 0.5);
    }

    // Check if captured
    if (progress >= CONFIG.CAPTURE_TIME && capturingTeam !== sector.owner) {
      // Transfer ownership
      sector.owner = capturingTeam;
      sector.captureProgress = 0;
      sector.capturingTeam = 0 as TeamId;

      // Transfer buildings in this sector
      for (const buildingId in newBuildings) {
        const building = newBuildings[buildingId];
        if (building.sectorId === sector.id) {
          building.owner = capturingTeam;
        }
      }

      // Emit capture event
      newEvents.push({
        type: 'sectorCaptured',
        sectorId: sector.id,
        team: capturingTeam,
      });
    } else {
      sector.captureProgress = progress;
    }
  }

  return {
    ...state,
    sectors: newSectors,
    buildings: newBuildings,
    events: newEvents,
  };
}
