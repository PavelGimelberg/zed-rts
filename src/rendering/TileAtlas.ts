import { TileType } from '../types';
import { CONFIG } from '../config/gameConfig';

/**
 * Loads Screaming Brain Studios isometric sprite-sheets,
 * extracts individual tiles, removes background colours,
 * and scales them to the render tile size.
 *
 * Tile selection uses large consistent patches so adjacent
 * tiles of the same type look uniform.
 */

const SHEET_TILE_W = 256;
const SHEET_TILE_H = 128;
const SHEET_COLS = 3;
const SHEET_ROWS = 6;

interface SheetDef {
  path: string;
  transColor: [number, number, number]; // RGB to treat as transparent
}

const SHEETS: Record<string, SheetDef> = {
  forest:   { path: 'tiles/Overworld - Forest - Flat 256x128.png',   transColor: [0, 0, 0] },
  terrain1: { path: 'tiles/Overworld - Terrain 1 - Flat 256x128.png', transColor: [0, 0, 0] },
  terrain2: { path: 'tiles/Overworld - Terrain 2 - Flat 256x128.png', transColor: [0, 0, 0] },
  terrain3: { path: 'tiles/Overworld - Terrain 3 - Flat 256x128.png', transColor: [255, 0, 255] },
  water:    { path: 'tiles/Overworld - Water - Flat 256x128.png',     transColor: [255, 0, 255] },
};

/**
 * Which sprite-sheet tiles map to each game TileType.
 *   patchSize — how many tiles in a patch share the same variant.
 *               Higher = more uniform look. 0 = always use first variant.
 */
const TILE_MAPPING: Record<TileType, { sheet: string; indices: number[]; patchSize: number }> = {
  0: { sheet: 'forest',   indices: [0, 1, 2],    patchSize: 6 },  // GRASS — big patches
  1: { sheet: 'water',    indices: [0, 1],        patchSize: 8 },  // WATER — very uniform
  2: { sheet: 'terrain2', indices: [0],           patchSize: 0 },  // ROAD  — single variant always
  3: { sheet: 'terrain3', indices: [0, 1],        patchSize: 5 },  // MOUNTAIN
  4: { sheet: 'terrain1', indices: [0],           patchSize: 0 },  // DIRT  — single variant always
};

export class TileAtlas {
  /** Keyed by sheet name → array of canvases scaled to render size. */
  private tiles: Record<string, HTMLCanvasElement[]> = {};
  private _ready = false;

  get ready(): boolean { return this._ready; }

  async load(): Promise<void> {
    const promises = Object.entries(SHEETS).map(async ([name, def]) => {
      const img = await this.loadImage(def.path);
      this.tiles[name] = this.extractAndScale(img, def.transColor);
    });
    await Promise.all(promises);
    this._ready = true;
  }

  /** Pick a deterministic, consistent tile sprite for the given tile type and position. */
  getTile(tileType: TileType, col: number, row: number): HTMLCanvasElement | null {
    const mapping = TILE_MAPPING[tileType];
    if (!mapping) return null;
    const sheetTiles = this.tiles[mapping.sheet];
    if (!sheetTiles) return null;

    let idx: number;
    if (mapping.patchSize <= 0 || mapping.indices.length <= 1) {
      // Single variant — always the same tile
      idx = mapping.indices[0];
    } else {
      // Group into patches: tiles in the same patch get the same variant.
      // Use integer division to create square patches.
      const ps = mapping.patchSize;
      const patchCol = Math.floor(col / ps);
      const patchRow = Math.floor(row / ps);
      // Simple stable hash for the patch
      const hash = Math.abs(patchCol * 31 + patchRow * 17);
      idx = mapping.indices[hash % mapping.indices.length];
    }

    return sheetTiles[idx] ?? sheetTiles[0] ?? null;
  }

  /* ── Internals ───────────────────────────────────────────── */

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load: ${src}`));
      img.src = src;
    });
  }

  private extractAndScale(
    img: HTMLImageElement,
    tc: [number, number, number]
  ): HTMLCanvasElement[] {
    const renderW = CONFIG.ISO_TILE_W;
    const renderH = CONFIG.ISO_TILE_H;
    const results: HTMLCanvasElement[] = [];

    for (let row = 0; row < SHEET_ROWS; row++) {
      for (let col = 0; col < SHEET_COLS; col++) {
        // Extract full-res tile from sprite sheet
        const sx = col * SHEET_TILE_W;
        const sy = row * SHEET_TILE_H;
        const raw = document.createElement('canvas');
        raw.width = SHEET_TILE_W;
        raw.height = SHEET_TILE_H;
        const rawCtx = raw.getContext('2d')!;
        rawCtx.drawImage(img, sx, sy, SHEET_TILE_W, SHEET_TILE_H, 0, 0, SHEET_TILE_W, SHEET_TILE_H);

        // Remove background colour → transparent
        const imgData = rawCtx.getImageData(0, 0, SHEET_TILE_W, SHEET_TILE_H);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
          if (Math.abs(d[i] - tc[0]) < 15 &&
              Math.abs(d[i + 1] - tc[1]) < 15 &&
              Math.abs(d[i + 2] - tc[2]) < 15) {
            d[i + 3] = 0;
          }
        }
        rawCtx.putImageData(imgData, 0, 0);

        // Scale to render size
        const scaled = document.createElement('canvas');
        scaled.width = renderW;
        scaled.height = renderH;
        const sctx = scaled.getContext('2d')!;
        sctx.imageSmoothingEnabled = true;
        sctx.imageSmoothingQuality = 'high';
        sctx.drawImage(raw, 0, 0, SHEET_TILE_W, SHEET_TILE_H, 0, 0, renderW, renderH);

        results.push(scaled);
      }
    }
    return results;
  }
}
