export class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  // Returns float between 0 and 1
  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) & 0xffffffff;
    return (this.seed >>> 0) / 0xffffffff;
  }

  // Returns float between min and max
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  // Returns integer between min (inclusive) and max (exclusive)
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max));
  }
}
