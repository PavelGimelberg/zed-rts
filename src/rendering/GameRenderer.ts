import { GameState } from '../types';
import { Camera } from './Camera';
import { TileAtlas } from './TileAtlas';
import { SpriteManager } from './SpriteManager';
import { MapRenderer } from './renderers/MapRenderer';
import { SectorRenderer } from './renderers/SectorRenderer';
import { UnitRenderer } from './renderers/UnitRenderer';
import { BuildingRenderer } from './renderers/BuildingRenderer';
import { ProjectileRenderer } from './renderers/ProjectileRenderer';
import { EffectsRenderer } from './renderers/EffectsRenderer';
import { SelectionBoxRenderer } from './renderers/SelectionBoxRenderer';
import { MinimapRenderer } from './MinimapRenderer';

export class GameRenderer {
  private mapRenderer: MapRenderer;
  private sectorRenderer: SectorRenderer;
  private unitRenderer: UnitRenderer;
  private buildingRenderer: BuildingRenderer;
  private projectileRenderer: ProjectileRenderer;
  private effectsRenderer: EffectsRenderer;
  private selectionBoxRenderer: SelectionBoxRenderer;
  private minimapRenderer: MinimapRenderer;

  constructor() {
    this.mapRenderer = new MapRenderer();
    this.sectorRenderer = new SectorRenderer();
    this.unitRenderer = new UnitRenderer();
    this.buildingRenderer = new BuildingRenderer();
    this.projectileRenderer = new ProjectileRenderer();
    this.effectsRenderer = new EffectsRenderer();
    this.selectionBoxRenderer = new SelectionBoxRenderer();
    this.minimapRenderer = new MinimapRenderer();
  }

  setTileAtlas(atlas: TileAtlas): void {
    this.mapRenderer.setTileAtlas(atlas);
  }

  setSpriteManager(manager: SpriteManager): void {
    this.unitRenderer.setSpriteManager(manager);
  }

  render(
    ctx: CanvasRenderingContext2D,
    miniCtx: CanvasRenderingContext2D | null,
    state: GameState,
    camera: Camera,
    canvasW: number,
    canvasH: number,
    gameTime: number,
    dragStart: { x: number; y: number } | null,
    dragEnd: { x: number; y: number } | null,
    selectedBuildingId: string | null,
    selectedUnitIds: string[],
    miniW: number,
    miniH: number
  ): void {
    // Clear main canvas
    ctx.clearRect(0, 0, canvasW, canvasH);

    // 1. Render map tiles (isometric)
    this.mapRenderer.render(ctx, state, camera, canvasW, canvasH, gameTime);

    // 2. Render sector fills, borders, and flags
    this.sectorRenderer.render(ctx, state, camera, canvasW, canvasH, gameTime);

    // 3. Render buildings
    this.buildingRenderer.render(ctx, state, camera, canvasW, canvasH, gameTime, selectedBuildingId);

    // 4. Render projectile trails
    this.projectileRenderer.render(ctx, state, camera, canvasW, canvasH);

    // 5. Render units
    this.unitRenderer.render(ctx, state, camera, canvasW, canvasH, selectedUnitIds, gameTime);

    // 6. Render projectiles (on top of units)
    this.projectileRenderer.render(ctx, state, camera, canvasW, canvasH);

    // 7. Render explosions & particles
    this.effectsRenderer.render(ctx, state, camera, canvasW, canvasH);

    // 8. Render selection box
    this.selectionBoxRenderer.render(ctx, dragStart, dragEnd);

    // Render minimap on separate context (may be null before HUD mounts)
    if (miniCtx) {
      this.minimapRenderer.render(miniCtx, state, camera, miniW, miniH, canvasW, canvasH);
    }
  }
}
