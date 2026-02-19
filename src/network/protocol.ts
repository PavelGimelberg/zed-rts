import type { Command } from '../types/commands';
import type { TeamId } from '../types/entities';

// Client → Server messages
export type ClientMessage =
  | { type: 'createRoom' }
  | { type: 'joinRoom'; roomCode: string }
  | { type: 'turnCommands'; turn: number; commands: Command[] }
  | { type: 'leave' };

// Server → Client messages
export type ServerMessage =
  | { type: 'roomCreated'; roomCode: string; team: TeamId }
  | { type: 'roomJoined'; roomCode: string; team: TeamId }
  | { type: 'gameStart'; seed: number; turnInterval: number }
  | { type: 'turnData'; turn: number; commands: Command[] }
  | { type: 'opponentDisconnected' }
  | { type: 'error'; message: string };

export const TURN_INTERVAL = 15;
