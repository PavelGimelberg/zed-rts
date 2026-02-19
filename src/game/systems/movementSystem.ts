import { GameState, Unit, Vector2 } from '../../types';
import { distance } from '../../utils/math';
import { CONFIG, UNIT_DEFS } from '../../config/gameConfig';

const UNIT_SEPARATION_DISTANCE = 25;
const UNIT_SEPARATION_FORCE = 1.5;

/**
 * Update unit movement, handle path following, unit separation, and cleanup
 */
export function updateMovement(state: GameState): GameState {
  let newUnits = { ...state.units };
  const unitIds = Object.keys(newUnits);

  // Process movement for each unit
  for (const unitId of unitIds) {
    const unit = newUnits[unitId];

    // Skip if unit is dead
    if (unit.hp <= 0) continue;

    const def = UNIT_DEFS[unit.type];

    // Follow path if available
    if (unit.path && unit.path.length > 0) {
      const nextWaypoint = unit.path[0];
      const dist = distance(unit.x, unit.y, nextWaypoint.x, nextWaypoint.y);

      if (dist < def.speed + 2) {
        // Close enough, move to next waypoint
        const newPath = unit.path.slice(1);
        newUnits[unitId] = {
          ...unit,
          path: newPath,
          state: newPath.length > 0 ? 'moving' : 'idle',
        };
      } else {
        // Move toward waypoint
        const dx = nextWaypoint.x - unit.x;
        const dy = nextWaypoint.y - unit.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const moveX = (dx / len) * def.speed;
        const moveY = (dy / len) * def.speed;

        newUnits[unitId] = {
          ...unit,
          x: unit.x + moveX,
          y: unit.y + moveY,
        };
      }
    } else if (unit.attackTargetId) {
      // Have a target but no path, try to move toward it
      const target = state.units[unit.attackTargetId];
      const targetBuilding = state.buildings[unit.attackTargetId];

      if (target || targetBuilding) {
        const targetX = target ? target.x : targetBuilding!.x;
        const targetY = target ? target.y : targetBuilding!.y;
        const dist = distance(unit.x, unit.y, targetX, targetY);

        if (dist > def.range) {
          // Out of range, move closer
          const dx = targetX - unit.x;
          const dy = targetY - unit.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          const moveX = (dx / len) * def.speed;
          const moveY = (dy / len) * def.speed;

          newUnits[unitId] = {
            ...unit,
            x: unit.x + moveX,
            y: unit.y + moveY,
            state: 'attacking',
          };
        } else {
          // In range, stop moving
          newUnits[unitId] = {
            ...unit,
            path: [],
            state: 'attacking',
          };
        }
      }
    }
  }

  // Unit separation: push apart friendly units that are too close
  for (const unitId of unitIds) {
    const unit = newUnits[unitId];
    if (unit.hp <= 0) continue;

    let separationX = 0;
    let separationY = 0;
    let separationCount = 0;

    for (const otherId of unitIds) {
      if (unitId === otherId) continue;
      const other = newUnits[otherId];
      if (other.owner !== unit.owner || other.hp <= 0) continue;

      const dist = distance(unit.x, unit.y, other.x, other.y);
      if (dist < UNIT_SEPARATION_DISTANCE && dist > 0) {
        const dx = unit.x - other.x;
        const dy = unit.y - other.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        separationX += (dx / len) * UNIT_SEPARATION_FORCE;
        separationY += (dy / len) * UNIT_SEPARATION_FORCE;
        separationCount++;
      }
    }

    if (separationCount > 0) {
      const def = UNIT_DEFS[unit.type];
      newUnits[unitId] = {
        ...unit,
        x: unit.x + separationX / separationCount,
        y: unit.y + separationY / separationCount,
      };
    }
  }

  // Keep units in world bounds
  for (const unitId of unitIds) {
    const unit = newUnits[unitId];
    const def = UNIT_DEFS[unit.type];
    const padding = def.size;

    newUnits[unitId] = {
      ...unit,
      x: Math.max(padding, Math.min(state.worldWidth - padding, unit.x)),
      y: Math.max(padding, Math.min(state.worldHeight - padding, unit.y)),
    };
  }

  // Clean up dead units and emit events
  let newEvents = [...state.events];
  for (const unitId of unitIds) {
    const unit = newUnits[unitId];

    if (unit.hp <= 0) {
      // Emit death event
      newEvents.push({
        type: 'unitDied',
        unitId: unit.id,
        x: unit.x,
        y: unit.y,
        team: unit.owner,
      });

      // Create explosion at death location
      const newExplosions = [
        ...state.explosions,
        {
          x: unit.x,
          y: unit.y,
          size: 30,
          frame: 0,
          maxFrame: 8,
        },
      ];

      // Create particles for explosion
      const newParticles = [...state.particles];
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const speed = 2 + Math.random() * 2;
        newParticles.push({
          x: unit.x,
          y: unit.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0.5,
          maxLife: 0.5,
          color: '#666',
          size: 4,
        });
      }

      // Remove dead unit
      delete newUnits[unitId];

      return {
        ...state,
        units: newUnits,
        explosions: newExplosions,
        particles: newParticles,
        events: newEvents,
      };
    }
  }

  return { ...state, units: newUnits, events: newEvents };
}
