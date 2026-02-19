import { GameState, Command, TeamId } from '../types';
import { TEAM } from '../types/entities';
import { updateMovement } from './systems/movementSystem';
import { updateCombat } from './systems/combatSystem';
import { updateProduction } from './systems/productionSystem';
import { updateCapture } from './systems/captureSystem';
import { updateAI } from './systems/aiSystem';
import { checkWinCondition } from './systems/winConditionSystem';
import { findPath } from './pathfinding';
import { CONFIG } from '../config/gameConfig';

/**
 * Core game engine that processes commands and updates game state
 */
export class GameEngine {
  state: GameState;
  isMultiplayer: boolean;

  constructor(initialState: GameState, isMultiplayer = false) {
    this.state = initialState;
    this.isMultiplayer = isMultiplayer;
  }

  /**
   * Main game loop - processes commands and updates all systems
   */
  tick(commands: Command[]): GameState {
    // 1. Clear events from previous tick
    this.state = {
      ...this.state,
      events: [],
    };

    // 2. Process commands
    this.state = this.processCommands(commands);

    // 3. Run game systems in order
    this.state = updateMovement(this.state);
    this.state = updateCombat(this.state);
    this.state = updateProduction(this.state);
    this.state = updateCapture(this.state);

    // 4. Run AI (only every 30 ticks for BLUE team, skipped in multiplayer)
    if (!this.isMultiplayer && this.state.tick % 30 === 0 && this.state.isRunning) {
      const aiCommands = updateAI(this.state);
      this.state = this.processCommands(aiCommands);
      // Run movement for AI units immediately
      this.state = updateMovement(this.state);
    }

    // 5. Check win conditions (only after tick 120)
    if (this.state.tick >= 120) {
      this.state = checkWinCondition(this.state);
    }

    // 6. Increment tick
    this.state = {
      ...this.state,
      tick: this.state.tick + 1,
    };

    return this.state;
  }

  /**
   * Process all commands and update state accordingly
   */
  private processCommands(commands: Command[]): GameState {
    let state = this.state;

    for (const command of commands) {
      switch (command.type) {
        case 'move':
          state = this.processMoveCommand(state, command);
          break;
        case 'attack':
          state = this.processAttackCommand(state, command);
          break;
        case 'produce':
          state = this.processProduceCommand(state, command);
          break;
        case 'select':
          state = this.processSelectCommand(state, command);
          break;
        case 'boxSelect':
          state = this.processBoxSelectCommand(state, command);
          break;
      }
    }

    return state;
  }

  /**
   * Process move command: compute path and set state
   */
  private processMoveCommand(state: GameState, cmd: any): GameState {
    const newUnits = { ...state.units };

    for (const unitId of cmd.unitIds) {
      const unit = newUnits[unitId];
      if (!unit || unit.owner !== cmd.team) continue;

      // Compute path to target
      const path = findPath(
        state.mapTiles,
        unit.x,
        unit.y,
        cmd.targetX,
        cmd.targetY,
        CONFIG.MAP_COLS,
        CONFIG.MAP_ROWS,
        CONFIG.TILE_SIZE
      );

      newUnits[unitId] = {
        ...unit,
        path,
        state: path.length > 0 ? 'moving' : 'idle',
        attackTargetId: null,
      };
    }

    return { ...state, units: newUnits };
  }

  /**
   * Process attack command: set target and compute path toward it
   */
  private processAttackCommand(state: GameState, cmd: any): GameState {
    const newUnits = { ...state.units };

    for (const unitId of cmd.unitIds) {
      const unit = newUnits[unitId];
      if (!unit || unit.owner !== cmd.team) continue;

      // Find target position (unit or building)
      let targetX = 0;
      let targetY = 0;
      const targetUnit = state.units[cmd.targetId];
      const targetBuilding = state.buildings[cmd.targetId];

      if (targetUnit) {
        targetX = targetUnit.x;
        targetY = targetUnit.y;
      } else if (targetBuilding) {
        targetX = targetBuilding.x;
        targetY = targetBuilding.y;
      } else {
        continue; // target not found
      }

      // Compute path toward target
      const path = findPath(
        state.mapTiles,
        unit.x,
        unit.y,
        targetX,
        targetY,
        CONFIG.MAP_COLS,
        CONFIG.MAP_ROWS,
        CONFIG.TILE_SIZE
      );

      newUnits[unitId] = {
        ...unit,
        attackTargetId: cmd.targetId,
        path,
        state: path.length > 0 ? 'moving' : 'attacking',
      };
    }

    return { ...state, units: newUnits };
  }

  /**
   * Process produce command: start unit production at building
   */
  private processProduceCommand(state: GameState, cmd: any): GameState {
    const newBuildings = { ...state.buildings };
    const building = newBuildings[cmd.buildingId];

    if (!building || building.owner !== cmd.team) {
      return state;
    }

    newBuildings[cmd.buildingId] = {
      ...building,
      producing: cmd.unitType,
      prodTimer: 0,
    };

    return { ...state, buildings: newBuildings };
  }

  /**
   * Process select command: select specified units, deselect others
   */
  private processSelectCommand(state: GameState, cmd: any): GameState {
    const newUnits = { ...state.units };

    // Deselect all units belonging to this team
    for (const unitId in newUnits) {
      const unit = newUnits[unitId];
      if (unit.owner === cmd.team) {
        newUnits[unitId] = { ...unit, selected: false };
      }
    }

    // Select specified units
    for (const unitId of cmd.unitIds) {
      const unit = newUnits[unitId];
      if (unit && unit.owner === cmd.team) {
        newUnits[unitId] = { ...unit, selected: true };
      }
    }

    return { ...state, units: newUnits };
  }

  /**
   * Process box select command: select all RED units in rectangle
   * (only works for RED team in this implementation)
   */
  private processBoxSelectCommand(state: GameState, cmd: any): GameState {
    const newUnits = { ...state.units };

    // Deselect all units of this team
    for (const unitId in newUnits) {
      const unit = newUnits[unitId];
      if (unit.owner === cmd.team) {
        newUnits[unitId] = { ...unit, selected: false };
      }
    }

    // Select units within box
    for (const unitId in newUnits) {
      const unit = newUnits[unitId];
      if (unit.owner === cmd.team) {
        const inBox =
          unit.x >= cmd.left &&
          unit.x <= cmd.right &&
          unit.y >= cmd.top &&
          unit.y <= cmd.bottom;
        if (inBox) {
          newUnits[unitId] = { ...unit, selected: true };
        }
      }
    }

    return { ...state, units: newUnits };
  }
}
