import { GameState } from '../types';
import { TEAM_COLORS } from '../config/gameConfig';
import { Camera } from './Camera';

export class MinimapRenderer {
  render(
    miniCtx: CanvasRenderingContext2D,
    state: GameState,
    camera: Camera,
    miniW: number,
    miniH: number,
    canvasW: number,
    canvasH: number
  ): void {
    const scaleX = miniW / state.worldWidth;
    const scaleY = miniH / state.worldHeight;

    // Clear minimap
    miniCtx.fillStyle = '#1a1a1a';
    miniCtx.fillRect(0, 0, miniW, miniH);

    // Draw sector fills
    for (const sector of state.sectors) {
      const x = sector.x * scaleX;
      const y = sector.y * scaleY;
      const w = sector.w * scaleX;
      const h = sector.h * scaleY;

      const teamColor = TEAM_COLORS[sector.owner];
      miniCtx.fillStyle = teamColor.fill;
      miniCtx.globalAlpha = 0.4;
      miniCtx.fillRect(x, y, w, h);
      miniCtx.globalAlpha = 1;
    }

    // Draw sector borders
    for (const sector of state.sectors) {
      const x = sector.x * scaleX;
      const y = sector.y * scaleY;
      const w = sector.w * scaleX;
      const h = sector.h * scaleY;

      const teamColor = TEAM_COLORS[sector.owner];
      miniCtx.strokeStyle = teamColor.main;
      miniCtx.lineWidth = 0.5;
      miniCtx.strokeRect(x, y, w, h);
    }

    // Draw unit dots
    for (const unitId in state.units) {
      const unit = state.units[unitId];
      if (unit.hp <= 0) continue;

      const x = unit.x * scaleX;
      const y = unit.y * scaleY;

      miniCtx.fillStyle = unit.owner === 1 ? '#f44' : '#44f';
      const radius = unit.type === 'grunt' || unit.type === 'psycho' || unit.type === 'tough' || unit.type === 'sniper' ? 1.5 : 2;
      miniCtx.beginPath();
      miniCtx.arc(x, y, radius, 0, 2 * Math.PI);
      miniCtx.fill();
    }

    // Draw building dots
    for (const buildingId in state.buildings) {
      const building = state.buildings[buildingId];
      if (building.hp <= 0) continue;

      const x = building.x * scaleX;
      const y = building.y * scaleY;

      const teamColor = TEAM_COLORS[building.owner];
      const isLight = building.type === 'fort';
      miniCtx.fillStyle = isLight ? teamColor.light : teamColor.main;
      miniCtx.beginPath();
      miniCtx.arc(x, y, 2.5, 0, 2 * Math.PI);
      miniCtx.fill();
    }

    // Draw camera viewport as a polygon.
    // The iso viewport maps to a rotated diamond in flat world space,
    // so we convert the 4 screen corners → flat world coords.
    const tl = camera.screenToWorld(0, 0, canvasW, canvasH);
    const tr = camera.screenToWorld(canvasW, 0, canvasW, canvasH);
    const br = camera.screenToWorld(canvasW, canvasH, canvasW, canvasH);
    const bl = camera.screenToWorld(0, canvasH, canvasW, canvasH);

    const corners = [tl, tr, br, bl];

    miniCtx.strokeStyle = '#fff';
    miniCtx.globalAlpha = 0.6;
    miniCtx.lineWidth = 1.2;
    miniCtx.beginPath();
    miniCtx.moveTo(corners[0].x * scaleX, corners[0].y * scaleY);
    for (let i = 1; i < corners.length; i++) {
      miniCtx.lineTo(corners[i].x * scaleX, corners[i].y * scaleY);
    }
    miniCtx.closePath();
    miniCtx.stroke();
    miniCtx.globalAlpha = 1;
  }
}
