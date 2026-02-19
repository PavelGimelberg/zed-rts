import { GameState } from '../../types';
import { TEAM } from '../../types/entities';
import { distance } from '../../utils/math';

/**
 * Check for win conditions
 * Only runs after tick 120
 */
export function checkWinCondition(state: GameState): GameState {
  // Only check after tick 120
  if (state.tick < 120) {
    return state;
  }

  // If game is already over, return as is
  if (!state.isRunning) {
    return state;
  }

  let newEvents = [...state.events];

  // Find forts
  const redFort = Object.values(state.buildings).find(
    (b) => b.type === 'fort' && b.owner === TEAM.RED
  );
  const blueFort = Object.values(state.buildings).find(
    (b) => b.type === 'fort' && b.owner === TEAM.BLUE
  );

  // 1. Red fort destroyed -> BLUE wins
  if (redFort && redFort.hp <= 0) {
    newEvents.push({
      type: 'gameOver',
      winner: TEAM.BLUE,
      reason: 'Red fort destroyed',
    });
    return {
      ...state,
      winner: TEAM.BLUE,
      winReason: 'Red fort destroyed',
      isRunning: false,
      events: newEvents,
    };
  }

  // 2. Blue fort destroyed -> RED wins
  if (blueFort && blueFort.hp <= 0) {
    newEvents.push({
      type: 'gameOver',
      winner: TEAM.RED,
      reason: 'Blue fort destroyed',
    });
    return {
      ...state,
      winner: TEAM.RED,
      winReason: 'Blue fort destroyed',
      isRunning: false,
      events: newEvents,
    };
  }

  // 3. BLUE unit within 20px of RED fort -> BLUE wins
  if (redFort) {
    const blueUnitsNearRedFort = Object.values(state.units).filter((u) => {
      if (u.owner !== TEAM.BLUE || u.hp <= 0) return false;
      const dist = distance(u.x, u.y, redFort.x, redFort.y);
      return dist < 20;
    });

    if (blueUnitsNearRedFort.length > 0) {
      newEvents.push({
        type: 'gameOver',
        winner: TEAM.BLUE,
        reason: 'Fort infiltrated',
      });
      return {
        ...state,
        winner: TEAM.BLUE,
        winReason: 'Fort infiltrated',
        isRunning: false,
        events: newEvents,
      };
    }
  }

  // 4. RED unit within 20px of BLUE fort -> RED wins
  if (blueFort) {
    const redUnitsNearBlueFort = Object.values(state.units).filter((u) => {
      if (u.owner !== TEAM.RED || u.hp <= 0) return false;
      const dist = distance(u.x, u.y, blueFort.x, blueFort.y);
      return dist < 20;
    });

    if (redUnitsNearBlueFort.length > 0) {
      newEvents.push({
        type: 'gameOver',
        winner: TEAM.RED,
        reason: 'Fort infiltrated',
      });
      return {
        ...state,
        winner: TEAM.RED,
        winReason: 'Fort infiltrated',
        isRunning: false,
        events: newEvents,
      };
    }
  }

  // 5. RED has no units and no producing buildings -> BLUE wins
  const redUnits = Object.values(state.units).filter((u) => u.owner === TEAM.RED && u.hp > 0);
  const redProducingBuildings = Object.values(state.buildings).filter(
    (b) => b.owner === TEAM.RED && b.hp > 0 && b.producing !== null
  );

  if (redUnits.length === 0 && redProducingBuildings.length === 0) {
    newEvents.push({
      type: 'gameOver',
      winner: TEAM.BLUE,
      reason: 'Red eliminated',
    });
    return {
      ...state,
      winner: TEAM.BLUE,
      winReason: 'Red eliminated',
      isRunning: false,
      events: newEvents,
    };
  }

  // 6. BLUE has no units and no producing buildings -> RED wins
  const blueUnits = Object.values(state.units).filter((u) => u.owner === TEAM.BLUE && u.hp > 0);
  const blueProducingBuildings = Object.values(state.buildings).filter(
    (b) => b.owner === TEAM.BLUE && b.hp > 0 && b.producing !== null
  );

  if (blueUnits.length === 0 && blueProducingBuildings.length === 0) {
    newEvents.push({
      type: 'gameOver',
      winner: TEAM.RED,
      reason: 'Blue eliminated',
    });
    return {
      ...state,
      winner: TEAM.RED,
      winReason: 'Blue eliminated',
      isRunning: false,
      events: newEvents,
    };
  }

  return { ...state, events: newEvents };
}
