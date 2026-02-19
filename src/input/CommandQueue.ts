import { Command } from '../types';

export class CommandQueue {
  private queue: Command[] = [];

  enqueue(cmd: Command): void {
    this.queue.push(cmd);
  }

  enqueueAll(cmds: Command[]): void {
    this.queue.push(...cmds);
  }

  drain(): Command[] {
    const cmds = [...this.queue];
    this.queue = [];
    return cmds;
  }

  isEmpty(): boolean {
    return this.queue.length === 0;
  }
}
