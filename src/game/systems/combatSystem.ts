import { GameState, Unit, Projectile, UnitType } from '../../types';
import { distance } from '../../utils/math';
import { UNIT_DEFS } from '../../config/gameConfig';

/**
 * Update combat: unit firing, projectile movement, and damage
 */
export function updateCombat(state: GameState): GameState {
  let newUnits = { ...state.units };
  let newProjectiles = { ...state.projectiles };
  let newBuildings = { ...state.buildings };
  let newParticles = [...state.particles];
  let newExplosions = [...state.explosions];
  let newEvents = [...state.events];
  let nextProjId = state.nextProjectileId;

  // Update unit fire cooldowns and fire
  for (const unitId in newUnits) {
    const unit = newUnits[unitId];
    if (unit.hp <= 0) continue;

    const def = UNIT_DEFS[unit.type];

    // Decrease fire cooldown
    let fireCooldown = Math.max(0, unit.fireCooldown - 1);

    // Scan for targets
    let closestEnemy: Unit | null = null;
    let closestEnemyDist = def.range;

    let closestBuilding: any = null;
    let closestBuildingDist = def.range;

    // First, check explicit attack target
    if (unit.attackTargetId) {
      const target = state.units[unit.attackTargetId];
      const targetBuilding = state.buildings[unit.attackTargetId];

      if (target && target.owner !== unit.owner && target.hp > 0) {
        const dist = distance(unit.x, unit.y, target.x, target.y);
        if (dist <= def.range) {
          closestEnemy = target;
          closestEnemyDist = dist;
        }
      } else if (targetBuilding && targetBuilding.owner !== unit.owner && targetBuilding.hp > 0) {
        const dist = distance(unit.x, unit.y, targetBuilding.x, targetBuilding.y);
        if (dist <= def.range) {
          closestBuilding = targetBuilding;
          closestBuildingDist = dist;
        }
      }
    }

    // Scan for closest enemy unit
    for (const otherId in newUnits) {
      const other = newUnits[otherId];
      if (other.owner !== unit.owner && other.hp > 0) {
        const dist = distance(unit.x, unit.y, other.x, other.y);
        if (dist < closestEnemyDist) {
          closestEnemy = other;
          closestEnemyDist = dist;
        }
      }
    }

    // Scan for closest enemy building (if no unit target)
    if (!closestEnemy) {
      for (const buildingId in newBuildings) {
        const building = newBuildings[buildingId];
        if (building.owner !== unit.owner && building.hp > 0) {
          const dist = distance(unit.x, unit.y, building.x, building.y);
          if (dist < closestBuildingDist) {
            closestBuilding = building;
            closestBuildingDist = dist;
          }
        }
      }
    }

    // Fire if ready and have target
    if (fireCooldown === 0) {
      let fired = false;

      if (closestEnemy) {
        fireProjectile(
          newProjectiles,
          unit,
          closestEnemy.x,
          closestEnemy.y,
          closestEnemy.id,
          newEvents,
          nextProjId++
        );
        fireCooldown = def.fireRate;
        fired = true;
      } else if (closestBuilding) {
        fireProjectile(
          newProjectiles,
          unit,
          closestBuilding.x,
          closestBuilding.y,
          closestBuilding.id,
          newEvents,
          nextProjId++
        );
        fireCooldown = def.fireRate;
        fired = true;
      }
    }

    newUnits[unitId] = { ...unit, fireCooldown };
  }

  // Update projectiles
  const projectileIds = Object.keys(newProjectiles);
  for (const projId of projectileIds) {
    const proj = newProjectiles[projId];
    if (!proj.alive) continue;

    const def = UNIT_DEFS[findProjectileSourceType(proj)];
    if (!def) continue;

    // If has targetId, track target position
    if (proj.targetId) {
      const target = state.units[proj.targetId];
      if (target && target.hp > 0) {
        proj.targetX = target.x;
        proj.targetY = target.y;
      }
    }

    // Move toward target
    const dx = proj.targetX - proj.x;
    const dy = proj.targetY - proj.y;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len > 0) {
      proj.x += (dx / len) * proj.speed;
      proj.y += (dy / len) * proj.speed;
    }

    // Add trail for rockets
    if (proj.isRocket) {
      proj.trail.push({ x: proj.x, y: proj.y, life: 0.3 });
    }

    // Check if hit target
    const distToTarget = distance(proj.x, proj.y, proj.targetX, proj.targetY);
    if (distToTarget < proj.speed * 2) {
      proj.alive = false;

      // Apply damage
      let targetHit = false;

      // Check if hit unit
      if (proj.targetId && state.units[proj.targetId]) {
        const target = newUnits[proj.targetId];
        if (target && target.hp > 0) {
          target.hp -= proj.damage;
          targetHit = true;

          if (target.hp <= 0) {
            newEvents.push({
              type: 'unitDied',
              unitId: target.id,
              x: target.x,
              y: target.y,
              team: target.owner,
            });
          }
        }
      }

      // Check if hit building
      if (proj.targetId && state.buildings[proj.targetId]) {
        const target = newBuildings[proj.targetId];
        if (target && target.hp > 0) {
          target.hp -= proj.damage;
          targetHit = true;

          if (target.hp <= 0) {
            newEvents.push({
              type: 'buildingDestroyed',
              buildingId: target.id,
              x: target.x,
              y: target.y,
            });
          }
        }
      }

      // Create particles at impact
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const speed = 1 + Math.random() * 1.5;
        newParticles.push({
          x: proj.x,
          y: proj.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0.4,
          maxLife: 0.4,
          color: '#ff6',
          size: 3,
        });
      }

      // Rocket splash damage
      if (proj.isRocket) {
        const splashRadius = 30;
        const splashDamage = proj.damage * 0.3;

        for (const otherId in newUnits) {
          const other = newUnits[otherId];
          if (other.owner === proj.team || other.hp <= 0) continue;
          const dist = distance(proj.x, proj.y, other.x, other.y);
          if (dist < splashRadius) {
            other.hp -= splashDamage;
            if (other.hp <= 0) {
              newEvents.push({
                type: 'unitDied',
                unitId: other.id,
                x: other.x,
                y: other.y,
                team: other.owner,
              });
            }
          }
        }

        for (const buildingId in newBuildings) {
          const building = newBuildings[buildingId];
          if (building.owner === proj.team || building.hp <= 0) continue;
          const dist = distance(proj.x, proj.y, building.x, building.y);
          if (dist < splashRadius) {
            building.hp -= splashDamage;
            if (building.hp <= 0) {
              newEvents.push({
                type: 'buildingDestroyed',
                buildingId: building.id,
                x: building.x,
                y: building.y,
              });
            }
          }
        }
      }

      newExplosions.push({
        x: proj.x,
        y: proj.y,
        size: proj.isRocket ? 40 : 20,
        frame: 0,
        maxFrame: 6,
      });
    }
  }

  // Remove dead projectiles
  for (const projId of projectileIds) {
    if (!newProjectiles[projId].alive) {
      delete newProjectiles[projId];
    }
  }

  // Update particles (age them)
  const updatedParticles = newParticles
    .map((p) => ({ ...p, life: p.life - 0.016 }))
    .filter((p) => p.life > 0);

  // Update explosions (age them)
  const updatedExplosions = newExplosions
    .map((e) => ({ ...e, frame: e.frame + 0.5 }))
    .filter((e) => e.frame < e.maxFrame);

  return {
    ...state,
    units: newUnits,
    projectiles: newProjectiles,
    buildings: newBuildings,
    particles: updatedParticles,
    explosions: updatedExplosions,
    events: newEvents,
    nextProjectileId: nextProjId,
  };
}

/**
 * Fire a projectile from a unit toward a target
 */
function fireProjectile(
  projectiles: Record<string, Projectile>,
  unit: Unit,
  targetX: number,
  targetY: number,
  targetId: string | null,
  events: any[],
  projCounter: number
): void {
  const def = UNIT_DEFS[unit.type];
  const isRocket = unit.type === 'psycho' || unit.type === 'sniper';
  const projId = `proj_${projCounter}`;

  const projectile: Projectile = {
    id: projId,
    x: unit.x,
    y: unit.y,
    targetX,
    targetY,
    targetId,
    speed: isRocket ? 4 : 6,
    damage: def.damage,
    team: unit.owner,
    isRocket,
    trail: [],
    alive: true,
  };

  projectiles[projId] = projectile;

  events.push({
    type: 'unitFired',
    unitId: unit.id,
    targetId: targetId || '',
    isRocket,
  });
}

/**
 * Determine the unit type that fired a projectile
 */
function findProjectileSourceType(proj: Projectile): UnitType {
  // Infer from damage and rocket status
  if (proj.isRocket) {
    if (proj.damage > 20) return 'sniper';
    return 'psycho';
  }
  // Non-rocket defaults
  if (proj.damage > 30) return 'heavy';
  if (proj.damage > 25) return 'tank';
  if (proj.damage > 15) return 'tough';
  if (proj.damage > 7) return 'psycho';
  if (proj.damage > 5) return 'jeep';
  return 'grunt';
}
