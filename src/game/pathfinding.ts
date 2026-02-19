import { Vector2, TileType } from '../types';
import { distance } from '../utils/math';
import { CONFIG } from '../config/gameConfig';

/**
 * Check if a tile is passable for movement
 * Water (1) and mountains (3) are impassable
 */
export function isPassable(
  mapTiles: TileType[][],
  tx: number,
  ty: number,
  cols: number,
  rows: number
): boolean {
  if (tx < 0 || tx >= cols || ty < 0 || ty >= rows) {
    return false;
  }
  const tileType = mapTiles[ty][tx];
  return tileType !== 1 && tileType !== 3; // not water, not mountain
}

/**
 * Check if a diagonal move between two tiles is valid (no diagonal cutting)
 */
function isDiagonalPassable(
  mapTiles: TileType[][],
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  cols: number,
  rows: number
): boolean {
  const dx = toX - fromX;
  const dy = toY - fromY;

  // Check adjacent tiles to prevent cutting corners
  if (Math.abs(dx) === 1 && Math.abs(dy) === 1) {
    // Moving diagonally - check that both cardinal neighbors are passable
    return (
      isPassable(mapTiles, fromX + dx, fromY, cols, rows) &&
      isPassable(mapTiles, fromX, fromY + dy, cols, rows)
    );
  }
  return true;
}

interface AStarNode {
  x: number;
  y: number;
  g: number; // cost from start
  h: number; // heuristic to end
  f: number; // g + h
  parent: AStarNode | null;
}

/**
 * A* pathfinding algorithm with 8-directional movement
 * Returns simplified path with intermediate waypoints removed
 */
export function findPath(
  mapTiles: TileType[][],
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  cols: number,
  rows: number,
  tileSize: number
): Vector2[] {
  // Convert world coordinates to tile coordinates
  let startTx = Math.floor(startX / tileSize);
  let startTy = Math.floor(startY / tileSize);
  let endTx = Math.floor(endX / tileSize);
  let endTy = Math.floor(endY / tileSize);

  // Clamp to map bounds
  startTx = Math.max(0, Math.min(startTx, cols - 1));
  startTy = Math.max(0, Math.min(startTy, rows - 1));
  endTx = Math.max(0, Math.min(endTx, cols - 1));
  endTy = Math.max(0, Math.min(endTy, rows - 1));

  // If destination is impassable, find nearest passable tile
  if (!isPassable(mapTiles, endTx, endTy, cols, rows)) {
    let found = false;
    // Spiral search outward
    for (let radius = 1; radius <= Math.max(cols, rows) && !found; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
          const tx = endTx + dx;
          const ty = endTy + dy;
          if (isPassable(mapTiles, tx, ty, cols, rows)) {
            endTx = tx;
            endTy = ty;
            found = true;
            break;
          }
        }
        if (found) break;
      }
    }
  }

  // If start == end, return empty path
  if (startTx === endTx && startTy === endTy) {
    return [];
  }

  const openSet = new Map<string, AStarNode>();
  const closedSet = new Set<string>();
  const key = (x: number, y: number) => `${x},${y}`;

  const startNode: AStarNode = {
    x: startTx,
    y: startTy,
    g: 0,
    h: distance(startTx, startTy, endTx, endTy),
    f: 0,
    parent: null,
  };
  startNode.f = startNode.g + startNode.h;
  openSet.set(key(startTx, startTy), startNode);

  let iterations = 0;
  const maxIterations = 500;

  while (openSet.size > 0 && iterations < maxIterations) {
    iterations++;

    // Find node with lowest f score
    let current: AStarNode | null = null;
    let currentKey = '';
    for (const [k, node] of openSet) {
      if (!current || node.f < current.f) {
        current = node;
        currentKey = k;
      }
    }

    if (!current) break;

    if (current.x === endTx && current.y === endTy) {
      // Reconstruct path
      const pathTiles: Array<{ x: number; y: number }> = [];
      let node: AStarNode | null = current;
      while (node) {
        pathTiles.unshift({ x: node.x, y: node.y });
        node = node.parent;
      }

      // Simplify path by removing intermediate waypoints
      const simplified: Vector2[] = [];
      for (const tile of pathTiles) {
        // Convert tile coords to world coords (center of tile)
        simplified.push({
          x: tile.x * tileSize + tileSize / 2,
          y: tile.y * tileSize + tileSize / 2,
        });
      }

      // Line-of-sight simplification
      const result: Vector2[] = [];
      if (simplified.length > 0) {
        result.push(simplified[0]);
        let lastAddedIdx = 0;

        for (let i = 2; i < simplified.length; i++) {
          // Check if we can skip to point i from lastAdded
          const canSkip = canLineOfSight(
            mapTiles,
            simplified[lastAddedIdx].x,
            simplified[lastAddedIdx].y,
            simplified[i].x,
            simplified[i].y,
            tileSize,
            cols,
            rows
          );

          if (!canSkip) {
            result.push(simplified[i - 1]);
            lastAddedIdx = i - 1;
          }
        }
        if (result[result.length - 1] !== simplified[simplified.length - 1]) {
          result.push(simplified[simplified.length - 1]);
        }
      }

      return result;
    }

    openSet.delete(currentKey);
    closedSet.add(currentKey);

    // Check all 8 neighbors
    const neighbors = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 1, dy: 1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: -1, dy: -1 },
    ];

    for (const { dx, dy } of neighbors) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      const neighborKey = key(nx, ny);

      if (closedSet.has(neighborKey)) continue;
      if (!isPassable(mapTiles, nx, ny, cols, rows)) continue;
      if (!isDiagonalPassable(mapTiles, current.x, current.y, nx, ny, cols, rows)) {
        continue;
      }

      const movementCost = Math.abs(dx) + Math.abs(dy) === 2 ? 1.414 : 1; // diagonal cost
      const g = current.g + movementCost;
      const h = distance(nx, ny, endTx, endTy);
      const f = g + h;

      const neighbor = openSet.get(neighborKey);
      if (!neighbor || g < neighbor.g) {
        const newNode: AStarNode = {
          x: nx,
          y: ny,
          g,
          h,
          f,
          parent: current,
        };
        openSet.set(neighborKey, newNode);
      }
    }
  }

  // No path found, return empty
  return [];
}

/**
 * Check if there's a line of sight between two world coordinates
 */
function canLineOfSight(
  mapTiles: TileType[][],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  tileSize: number,
  cols: number,
  rows: number
): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance === 0) return true;

  const steps = Math.ceil(distance / (tileSize / 2));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = x1 + dx * t;
    const y = y1 + dy * t;
    const tx = Math.floor(x / tileSize);
    const ty = Math.floor(y / tileSize);

    if (!isPassable(mapTiles, tx, ty, cols, rows)) {
      return false;
    }
  }

  return true;
}
