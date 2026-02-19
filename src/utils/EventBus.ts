import { GameEvent } from '../types';

type EventCallback = (event: GameEvent) => void;

export class EventBus {
  private listeners: Map<string, EventCallback[]> = new Map();

  on(eventType: string, callback: EventCallback): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(callback);
  }

  off(eventType: string, callback: EventCallback): void {
    const cbs = this.listeners.get(eventType);
    if (cbs) {
      this.listeners.set(eventType, cbs.filter(cb => cb !== callback));
    }
  }

  emit(event: GameEvent): void {
    const cbs = this.listeners.get(event.type);
    if (cbs) {
      for (const cb of cbs) cb(event);
    }
    // Also emit to wildcard listeners
    const wildcards = this.listeners.get('*');
    if (wildcards) {
      for (const cb of wildcards) cb(event);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}
