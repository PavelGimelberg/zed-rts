import { TeamId, UnitType, MoveCommand, AttackCommand, ProduceCommand } from '../types';

export function createMoveCommand(unitIds: string[], targetX: number, targetY: number, team: TeamId): MoveCommand {
  return {
    type: 'move',
    unitIds,
    targetX,
    targetY,
    team,
  };
}

export function createAttackCommand(unitIds: string[], targetId: string, team: TeamId): AttackCommand {
  return {
    type: 'attack',
    unitIds,
    targetId,
    team,
  };
}

export function createProduceCommand(buildingId: string, unitType: UnitType, team: TeamId): ProduceCommand {
  return {
    type: 'produce',
    buildingId,
    unitType,
    team,
  };
}
