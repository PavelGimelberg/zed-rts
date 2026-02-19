import { WebSocketServer, WebSocket } from 'ws';

const PORT = parseInt(process.env.PORT || '8080');
const TURN_INTERVAL = 15;

// ── Types ──

interface Room {
  code: string;
  seed: number;
  players: Map<string, WebSocket>;
  teamAssignment: Map<string, number>;
  currentTurn: number;
  turnCommands: Map<string, unknown[]>;
  started: boolean;
}

// ── State ──

const rooms = new Map<string, Room>();
const playerToRoom = new Map<WebSocket, string>();
let nextPlayerId = 0;

// ── Room code generation ──

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code: string;
  do {
    code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms.has(code));
  return code;
}

// ── Message sending ──

function send(ws: WebSocket, msg: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function broadcast(room: Room, msg: unknown): void {
  for (const ws of room.players.values()) {
    send(ws, msg);
  }
}

// ── Message handling ──

function handleMessage(ws: WebSocket, playerId: string, data: string): void {
  let msg: { type: string; [key: string]: unknown };
  try {
    msg = JSON.parse(data);
  } catch {
    return;
  }

  switch (msg.type) {
    case 'createRoom': {
      const code = generateRoomCode();
      const room: Room = {
        code,
        seed: Math.floor(Math.random() * 0xffffffff),
        players: new Map([[playerId, ws]]),
        teamAssignment: new Map([[playerId, 1]]), // RED
        currentTurn: 0,
        turnCommands: new Map(),
        started: false,
      };
      rooms.set(code, room);
      playerToRoom.set(ws, code);
      send(ws, { type: 'roomCreated', roomCode: code, team: 1 });
      console.log(`Room ${code} created by ${playerId}`);
      break;
    }

    case 'joinRoom': {
      const code = (msg.roomCode as string).toUpperCase();
      const room = rooms.get(code);

      if (!room) {
        send(ws, { type: 'error', message: 'Room not found' });
        return;
      }
      if (room.players.size >= 2) {
        send(ws, { type: 'error', message: 'Room is full' });
        return;
      }
      if (room.started) {
        send(ws, { type: 'error', message: 'Game already started' });
        return;
      }

      room.players.set(playerId, ws);
      room.teamAssignment.set(playerId, 2); // BLUE
      playerToRoom.set(ws, code);

      send(ws, { type: 'roomJoined', roomCode: code, team: 2 });
      console.log(`${playerId} joined room ${code}`);

      // Both players present — start game
      room.started = true;
      broadcast(room, {
        type: 'gameStart',
        seed: room.seed,
        turnInterval: TURN_INTERVAL,
      });
      console.log(`Game started in room ${code} (seed: ${room.seed})`);
      break;
    }

    case 'turnCommands': {
      const roomCode = playerToRoom.get(ws);
      if (!roomCode) return;
      const room = rooms.get(roomCode);
      if (!room || !room.started) return;

      const commands = (msg.commands as unknown[]) || [];
      room.turnCommands.set(playerId, commands);

      // Check if both players have submitted
      if (room.turnCommands.size >= 2) {
        // Combine all commands
        const allCommands: unknown[] = [];
        for (const cmds of room.turnCommands.values()) {
          allCommands.push(...cmds);
        }

        // Broadcast combined turn data
        broadcast(room, {
          type: 'turnData',
          turn: room.currentTurn,
          commands: allCommands,
        });

        room.turnCommands.clear();
        room.currentTurn++;
      }
      break;
    }

    case 'leave': {
      handleDisconnect(ws, playerId);
      break;
    }
  }
}

function handleDisconnect(ws: WebSocket, playerId: string): void {
  const roomCode = playerToRoom.get(ws);
  if (!roomCode) return;

  const room = rooms.get(roomCode);
  if (!room) return;

  room.players.delete(playerId);
  room.teamAssignment.delete(playerId);
  playerToRoom.delete(ws);

  // Notify remaining player
  for (const otherWs of room.players.values()) {
    send(otherWs, { type: 'opponentDisconnected' });
  }

  // Clean up room if empty
  if (room.players.size === 0) {
    rooms.delete(roomCode);
    console.log(`Room ${roomCode} deleted (empty)`);
  } else {
    console.log(`${playerId} left room ${roomCode}`);
  }
}

// ── Server setup ──

const wss = new WebSocketServer({ port: PORT });

wss.on('connection', (ws) => {
  const playerId = `p${nextPlayerId++}`;
  console.log(`${playerId} connected`);

  ws.on('message', (data) => {
    handleMessage(ws, playerId, data.toString());
  });

  ws.on('close', () => {
    handleDisconnect(ws, playerId);
    console.log(`${playerId} disconnected`);
  });
});

console.log(`ZED-RTS server running on port ${PORT}`);
