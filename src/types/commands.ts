import { TeamId, UnitType } from './entities';

export type Command =
  | MoveCommand
  | AttackCommand
  | ProduceCommand
  | SelectCommand
  | BoxSelectCommand;

export interface MoveCommand {
  type: 'move';
  unitIds: string[];
  targetX: number;
  targetY: number;
  team: TeamId;
}

export interface AttackCommand {
  type: 'attack';
  unitIds: string[];
  targetId: string;
  team: TeamId;
}

export interface ProduceCommand {
  type: 'produce';
  buildingId: string;
  unitType: UnitType;
  team: TeamId;
}

export interface SelectCommand {
  type: 'select';
  unitIds: string[];
  buildingId: string | null;
  team: TeamId;
}

export interface BoxSelectCommand {
  type: 'boxSelect';
  left: number;
  top: number;
  right: number;
  bottom: number;
  team: TeamId;
}
