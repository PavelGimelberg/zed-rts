import {
  GameState,
  Command,
  MoveCommand,
  AttackCommand,
  ProduceCommand,
} from '../../types';
import { TEAM } from '../../types/entities';
import { distance } from '../../utils/math';
import { CONFIG, UNIT_DEFS } from '../../config/gameConfig';

/**
 * AI system for BLUE team (runs every 30 ticks)
 * Returns array of commands for BLUE units and buildings
 */
export function updateAI(state: GameState): Command[] {
  const commands: Command[] = [];

  // Get all BLUE units
  const blueUnits = Object.values(state.units).filter(
    (u) => u.owner === TEAM.BLUE && u.hp > 0
  );

  // Get idle BLUE units
  const idleUnits = blueUnits.filter((u) => u.state === 'idle' || u.path.length === 0);

  // Determine strategy
  const strategy = determineStrategy(state, blueUnits);

  // Process commands based on strategy
  if (strategy === 'expand') {
    expandStrategy(state, idleUnits, commands);
  } else if (strategy === 'attack') {
    attackStrategy(state, idleUnits, commands);
  }

  // Production commands
  productionStrategy(state, commands);

  return commands;
}

/**
 * Determine AI strategy based on game state
 */
function determineStrategy(state: GameState, blueUnits: any[]): 'expand' | 'attack' {
  // Count neutral and enemy sectors
  const neutralSectors = state.sectors.filter((s) => s.owner === TEAM.NONE).length;
  const enemySectors = state.sectors.filter((s) => s.owner === TEAM.RED).length;

  // Count RED units
  const redUnits = Object.values(state.units).filter(
    (u) => u.owner === TEAM.RED && u.hp > 0
  ).length;

  // If we have fewer than 15 units and neutral sectors exist, expand
  if (neutralSectors > 0 && blueUnits.length < 15) {
    return 'expand';
  }

  // If we have significantly more units than enemy, attack
  if (blueUnits.length > redUnits + 3) {
    return 'attack';
  }

  // If we have at least 5 units, attack
  if (blueUnits.length > 5) {
    return 'attack';
  }

  return 'expand';
}

/**
 * Expansion strategy: send units to uncaptured/enemy sectors
 */
function expandStrategy(state: GameState, idleUnits: any[], commands: Command[]): void {
  if (idleUnits.length === 0) return;

  // Find nearest uncaptured or enemy sector
  const targetSector = state.sectors.find((s) => s.owner !== TEAM.BLUE);
  if (!targetSector) return;

  // Send up to 4 idle units to capture it
  const unitsToSend = idleUnits.slice(0, 4);
  const unitIds = unitsToSend.map((u) => u.id);

  commands.push({
    type: 'move',
    unitIds,
    targetX: targetSector.flagX,
    targetY: targetSector.flagY,
    team: TEAM.BLUE,
  });
}

/**
 * Attack strategy: send units to attack RED units or fort
 */
function attackStrategy(state: GameState, idleUnits: any[], commands: Command[]): void {
  if (idleUnits.length === 0) return;

  // Find RED fort
  const redFort = Object.values(state.buildings).find(
    (b) => b.type === 'fort' && b.owner === TEAM.RED && b.hp > 0
  );

  // Find closest RED unit
  const redUnits = Object.values(state.units).filter(
    (u) => u.owner === TEAM.RED && u.hp > 0
  );

  let targetX = 0;
  let targetY = 0;
  let targetId: string | null = null;

  if (redUnits.length > 0) {
    // Find closest RED unit to our idle units
    let closestUnit = redUnits[0];
    let minDist = Infinity;

    for (const redUnit of redUnits) {
      const unitDist = idleUnits.reduce((min, ourUnit) => {
        const dist = distance(ourUnit.x, ourUnit.y, redUnit.x, redUnit.y);
        return Math.min(min, dist);
      }, Infinity);

      if (unitDist < minDist) {
        minDist = unitDist;
        closestUnit = redUnit;
      }
    }

    targetX = closestUnit.x;
    targetY = closestUnit.y;
    targetId = closestUnit.id;
  } else if (redFort && redFort.hp > 0) {
    // No units, attack fort
    targetX = redFort.x;
    targetY = redFort.y;
    targetId = redFort.id;
  } else {
    // No target found
    return;
  }

  // Send attack command if we have a valid target
  if (targetId) {
    const unitIds = idleUnits.map((u) => u.id);
    commands.push({
      type: 'attack',
      unitIds,
      targetId,
      team: TEAM.BLUE,
    });
  } else {
    // Move to target position
    const unitIds = idleUnits.map((u) => u.id);
    commands.push({
      type: 'move',
      unitIds,
      targetX,
      targetY,
      team: TEAM.BLUE,
    });
  }
}

/**
 * Production strategy: manage unit production at factories
 */
function productionStrategy(state: GameState, commands: Command[]): void {
  // Get BLUE buildings
  const blueBuildings = Object.values(state.buildings).filter(
    (b) => b.owner === TEAM.BLUE && b.hp > 0
  );

  // Get current unit composition
  const blueUnits = Object.values(state.units).filter((u) => u.owner === TEAM.BLUE && u.hp > 0);
  const unitCounts: Record<string, number> = {};

  for (const unit of blueUnits) {
    unitCounts[unit.type] = (unitCounts[unit.type] || 0) + 1;
  }

  // Strategy: produce tanks and heavy tanks from vehicle factories
  for (const building of blueBuildings) {
    if (building.type === 'vehicleFactory') {
      // Produce tanks first, then heavy
      const tankCount = unitCounts['tank'] || 0;
      const heavyCount = unitCounts['heavy'] || 0;

      let unitType: string | null = null;
      if (tankCount < 3) {
        unitType = 'tank';
      } else if (heavyCount < 2) {
        unitType = 'heavy';
      } else {
        // Random between tank and heavy
        unitType = Math.random() > 0.5 ? 'tank' : 'heavy';
      }

      if (building.producing !== unitType) {
        commands.push({
          type: 'produce',
          buildingId: building.id,
          unitType: unitType as any,
          team: TEAM.BLUE,
        });
      }
    } else if (building.type === 'robotFactory') {
      // Produce mixed robot units
      let unitType: string | null = null;

      const totalUnits = blueUnits.length;

      if (totalUnits < 3) {
        // Early game: produce grunts
        unitType = 'grunt';
      } else if ((unitCounts['tough'] || 0) < 2) {
        // Need tough units
        unitType = 'tough';
      } else {
        // Random mix
        const options = ['grunt', 'psycho', 'tough'];
        unitType = options[Math.floor(Math.random() * options.length)];
      }

      if (building.producing !== unitType) {
        commands.push({
          type: 'produce',
          buildingId: building.id,
          unitType: unitType as any,
          team: TEAM.BLUE,
        });
      }
    }
  }
}
