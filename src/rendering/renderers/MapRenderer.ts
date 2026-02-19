import { GameState } from '../../types';
import { CONFIG } from '../../config/gameConfig';
import { Camera } from '../Camera';
import { TileAtlas } from '../TileAtlas';

export class MapRenderer {
  private tileAtlas: TileAtlas | null = null;

  setTileAtlas(atlas: TileAtlas): void {
    this.tileAtlas = atlas;
  }

  render(
    ctx: CanvasRenderingContext2D,
    state: GameState,
    camera: Camera,
    canvasW: number,
    canvasH: number,
    _gameTime: number
  ): void {
    const zoom = camera.zoom;
    // Tile dimensions scaled by zoom so they always fill the grid
    const zhw = CONFIG.ISO_HALF_W * zoom;
    const zhh = CONFIG.ISO_HALF_H * zoom;
    const ztw = CONFIG.ISO_TILE_W * zoom;
    const zth = CONFIG.ISO_TILE_H * zoom;

    // Fill background with dark colour
    ctx.fillStyle = '#111122';
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Draw tiles in row-major order
    for (let row = 0; row < state.mapTiles.length; row++) {
      for (let col = 0; col < state.mapTiles[row].length; col++) {
        const { x, y } = camera.tileToScreen(col, row, canvasW, canvasH);

        // Frustum cull: skip tiles fully outside canvas (using zoomed dims)
        if (x + zhw < 0 || x - zhw > canvasW ||
            y + zhh < 0 || y - zhh > canvasH) continue;

        const tileType = state.mapTiles[row][col];

        if (this.tileAtlas?.ready) {
          const sprite = this.tileAtlas.getTile(tileType, col, row);
          if (sprite) {
            ctx.drawImage(sprite, x - zhw, y - zhh, ztw, zth);
            continue;
          }
        }

        // Fallback: flat-coloured diamond
        this.drawFallbackTile(ctx, x, y, zhw, zhh, tileType);
      }
    }
  }

  private drawFallbackTile(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number,
    hw: number, hh: number,
    tileType: number
  ): void {
    const colors = ['#4a6', '#36c', '#875', '#754', '#976'];
    ctx.fillStyle = colors[tileType] ?? '#444';
    ctx.beginPath();
    ctx.moveTo(cx, cy - hh);
    ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx, cy + hh);
    ctx.lineTo(cx - hw, cy);
    ctx.closePath();
    ctx.fill();
  }
}
