import {
  TileType,
  Sector,
  Building,
  TeamId,
  BuildingType,
} from '../types';
import { CONFIG, SECTOR_DEFS, BUILDING_DEFS, UNIT_DEFS } from '../config/gameConfig';
import { SeededRandom } from '../utils/random';
import { TEAM } from '../types/entities';

export interface MapGenerationResult {
  mapTiles: TileType[][];
  sectors: Sector[];
  buildings: Building[];
}

/**
 * Generate the complete game map with terrain, sectors, and buildings
 */
export function generateMap(rng: SeededRandom): MapGenerationResult {
  const { MAP_COLS, MAP_ROWS, TILE_SIZE } = CONFIG;

  // Initialize with grass (type 0)
  const mapTiles: TileType[][] = Array.from({ length: MAP_ROWS }, () =>
    Array(MAP_COLS).fill(0 as TileType)
  );

  // Generate river (horizontal, sinusoidal)
  const riverY = Math.floor(MAP_ROWS / 2);
  const riverWaveAmplitude = 2;
  const riverWaveFreq = 0.3;

  for (let x = 0; x < MAP_COLS; x++) {
    const waveOffset = Math.sin(x * riverWaveFreq) * riverWaveAmplitude;
    const ry = riverY + Math.round(waveOffset);

    // Create river with some width
    for (let dy = -1; dy <= 1; dy++) {
      const y = ry + dy;
      if (y >= 0 && y < MAP_ROWS) {
        // Skip gaps at edges (0, MAP_COLS/2-1, MAP_COLS-1) for bridges
        const isGap =
          x === 0 ||
          x === MAP_COLS - 1 ||
          (x >= MAP_COLS / 2 - 2 && x <= MAP_COLS / 2 + 1);
        if (!isGap) {
          mapTiles[y][x] = 1; // water
        }
      }
    }
  }

  // Create bridge tiles (road over water) at the gaps
  const bridgeX = [0, Math.floor(MAP_COLS / 2), MAP_COLS - 1];
  for (const bx of bridgeX) {
    for (let dy = -1; dy <= 1; dy++) {
      const y = riverY + dy;
      if (y >= 0 && y < MAP_ROWS && bx >= 0 && bx < MAP_COLS) {
        mapTiles[y][bx] = 2; // road
      }
    }
  }

  // Create horizontal roads
  const roadY1 = 4;
  const roadY2 = MAP_ROWS - 5;

  for (let x = 0; x < MAP_COLS; x++) {
    if (mapTiles[roadY1][x] !== 1) {
      mapTiles[roadY1][x] = 2; // road
    }
    if (mapTiles[roadY2][x] !== 1) {
      mapTiles[roadY2][x] = 2; // road
    }
  }

  // Create vertical road at center
  const roadXCenter = Math.floor(MAP_COLS / 2);
  for (let y = 0; y < MAP_ROWS; y++) {
    if (mapTiles[y][roadXCenter] !== 1) {
      mapTiles[y][roadXCenter] = 2; // road
    }
  }

  // Generate mountain clusters at specific positions
  const mountainPositions = [
    { x: 6, y: 8 },
    { x: MAP_COLS - 8, y: 6 },
    { x: 5, y: MAP_ROWS - 8 },
    { x: MAP_COLS - 6, y: MAP_ROWS - 7 },
  ];

  for (const pos of mountainPositions) {
    const clusterSize = rng.int(4, 7);
    for (let i = 0; i < clusterSize; i++) {
      const x = pos.x + rng.int(-3, 4);
      const y = pos.y + rng.int(-3, 4);
      if (x >= 0 && x < MAP_COLS && y >= 0 && y < MAP_ROWS) {
        if (mapTiles[y][x] === 0) {
          // only on grass
          mapTiles[y][x] = 3; // mountain
        }
      }
    }
  }

  // Add dirt patches near factories
  const factoryPositions = [
    { x: 10, y: 10 },
    { x: MAP_COLS - 12, y: 10 },
    { x: 10, y: MAP_ROWS - 12 },
    { x: MAP_COLS - 12, y: MAP_ROWS - 12 },
  ];

  for (const pos of factoryPositions) {
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        const x = pos.x + dx;
        const y = pos.y + dy;
        if (x >= 0 && x < MAP_COLS && y >= 0 && y < MAP_ROWS) {
          if (mapTiles[y][x] === 0 && rng.next() > 0.5) {
            mapTiles[y][x] = 4; // dirt
          }
        }
      }
    }
  }

  // Create sectors with their buildings
  const sectors = SECTOR_DEFS.map((def) => ({ ...def }));
  const buildings: Building[] = [];

  for (let i = 0; i < sectors.length; i++) {
    const sector = sectors[i];
    const buildingDef = BUILDING_DEFS[sector.buildingType];

    const building: Building = {
      id: `bld_${i}`,
      type: sector.buildingType,
      owner: sector.owner,
      sectorId: sector.id,
      x: sector.flagX,
      y: sector.flagY - 50, // position above flag
      hp: buildingDef.hp,
      maxHp: buildingDef.hp,
      producing: buildingDef.produces ? buildingDef.produces[0] : null,
      prodTimer: 0,
      prodMaxTime: 0,
      rallyX: sector.flagX,
      rallyY: sector.flagY + 50, // below flag
      size: buildingDef.size,
    };

    // Calculate initial prodMaxTime
    if (building.producing) {
      const baseTime = CONFIG.BASE_PROD_TIME * UNIT_DEFS[building.producing].prodTime;
      building.prodMaxTime = baseTime;
    }

    buildings.push(building);
  }

  return { mapTiles, sectors, buildings };
}
