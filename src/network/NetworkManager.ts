import type { Command } from '../types/commands';
import type { TeamId } from '../types/entities';
import type { ClientMessage, ServerMessage } from './protocol';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'ws://localhost:8080';

export class NetworkManager {
  private ws: WebSocket | null = null;
  private localTeam: TeamId = 1;

  // Callbacks
  private onRoomCreatedCb: ((roomCode: string) => void) | null = null;
  private onOpponentJoinedCb: (() => void) | null = null;
  private onGameStartCb: ((seed: number, team: TeamId, turnInterval: number) => void) | null = null;
  private onTurnDataCb: ((turn: number, commands: Command[]) => void) | null = null;
  private onOpponentDisconnectedCb: (() => void) | null = null;
  private onErrorCb: ((msg: string) => void) | null = null;

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(SERVER_URL);

        this.ws.onopen = () => resolve();

        this.ws.onmessage = (event) => {
          const msg: ServerMessage = JSON.parse(event.data);
          this.handleMessage(msg);
        };

        this.ws.onclose = () => {
          this.ws = null;
        };

        this.ws.onerror = () => {
          reject(new Error('WebSocket connection failed'));
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.send({ type: 'leave' });
      this.ws.close();
      this.ws = null;
    }
  }

  createRoom(): void {
    this.send({ type: 'createRoom' });
  }

  joinRoom(code: string): void {
    this.send({ type: 'joinRoom', roomCode: code.toUpperCase() });
  }

  submitTurnCommands(turn: number, commands: Command[]): void {
    this.send({ type: 'turnCommands', turn, commands });
  }

  getLocalTeam(): TeamId {
    return this.localTeam;
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  // Callback registration
  onRoomCreated(cb: (roomCode: string) => void): void { this.onRoomCreatedCb = cb; }
  onOpponentJoined(cb: () => void): void { this.onOpponentJoinedCb = cb; }
  onGameStart(cb: (seed: number, team: TeamId, turnInterval: number) => void): void { this.onGameStartCb = cb; }
  onTurnData(cb: (turn: number, commands: Command[]) => void): void { this.onTurnDataCb = cb; }
  onOpponentDisconnected(cb: () => void): void { this.onOpponentDisconnectedCb = cb; }
  onError(cb: (msg: string) => void): void { this.onErrorCb = cb; }

  private send(msg: ClientMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private handleMessage(msg: ServerMessage): void {
    switch (msg.type) {
      case 'roomCreated':
        this.localTeam = msg.team;
        this.onRoomCreatedCb?.(msg.roomCode);
        break;
      case 'roomJoined':
        this.localTeam = msg.team;
        this.onOpponentJoinedCb?.();
        break;
      case 'gameStart':
        this.onGameStartCb?.(msg.seed, this.localTeam, msg.turnInterval);
        break;
      case 'turnData':
        this.onTurnDataCb?.(msg.turn, msg.commands);
        break;
      case 'opponentDisconnected':
        this.onOpponentDisconnectedCb?.();
        break;
      case 'error':
        this.onErrorCb?.(msg.message);
        break;
    }
  }
}
