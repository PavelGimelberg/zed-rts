import { GameState } from '../../types';
import { TEAM_COLORS, BUILDING_DEFS, UNIT_DEFS } from '../../config/gameConfig';
import { Camera } from '../Camera';

export class BuildingRenderer {
  render(
    ctx: CanvasRenderingContext2D,
    state: GameState,
    camera: Camera,
    canvasW: number,
    canvasH: number,
    gameTime: number,
    selectedBuildingId: string | null
  ): void {
    for (const buildingId in state.buildings) {
      const building = state.buildings[buildingId];
      if (building.hp <= 0) continue;

      const { x: screenX, y: screenY } = camera.worldToScreen(building.x, building.y, canvasW, canvasH);
      const def = BUILDING_DEFS[building.type];
      const teamColor = TEAM_COLORS[building.owner];
      const size = def.size;

      if (building.type === 'fort') {
        // Fort: large square with corner towers
        ctx.fillStyle = teamColor.main;
        ctx.fillRect(screenX - size, screenY - size, size * 2, size * 2);

        // Corner towers
        ctx.fillStyle = teamColor.dark;
        const towerSize = size * 0.4;
        ctx.fillRect(screenX - size, screenY - size, towerSize, towerSize);
        ctx.fillRect(screenX + size - towerSize, screenY - size, towerSize, towerSize);
        ctx.fillRect(screenX - size, screenY + size - towerSize, towerSize, towerSize);
        ctx.fillRect(screenX + size - towerSize, screenY + size - towerSize, towerSize, towerSize);

        // FORT label
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('FORT', screenX, screenY + 4);
      } else {
        // Factory: rectangle with chimney
        ctx.fillStyle = teamColor.main;
        ctx.fillRect(screenX - size, screenY - size * 0.7, size * 2, size * 1.4);

        // Chimney
        ctx.fillStyle = '#666';
        const chimneyX = screenX + size * 0.5;
        const chimneyY = screenY - size * 0.7;
        ctx.fillRect(chimneyX - 3, chimneyY - 10, 6, 10);

        // Smoke animation when producing
        if (building.producing) {
          ctx.fillStyle = 'rgba(200, 200, 200, 0.6)';
          const smokeOffset = Math.sin(gameTime * 0.2 + buildingId.charCodeAt(0)) * 3;
          ctx.beginPath();
          ctx.arc(chimneyX + smokeOffset, chimneyY - 12, 4, 0, 2 * Math.PI);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(chimneyX + smokeOffset * 0.5, chimneyY - 16, 3, 0, 2 * Math.PI);
          ctx.fill();
        }

        // Type label
        const typeLabel = building.type === 'robotFactory' ? 'ROBOT' : 'VEHICLE';
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(typeLabel, screenX, screenY - 5);

        // Production progress bar
        if (building.producing && building.prodMaxTime > 0) {
          const barWidth = size * 1.8;
          const barHeight = 3;
          const barX = screenX - barWidth / 2;
          const barY = screenY + size * 0.8;

          ctx.fillStyle = '#333';
          ctx.fillRect(barX, barY, barWidth, barHeight);

          const progress = building.prodTimer / building.prodMaxTime;
          ctx.fillStyle = '#0f0';
          ctx.fillRect(barX, barY, barWidth * progress, barHeight);
        }

        // Unit name below
        if (building.producing) {
          const unitDef = UNIT_DEFS[building.producing];
          ctx.fillStyle = '#ccc';
          ctx.font = '9px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(unitDef.name, screenX, screenY + size + 12);
        }
      }

      // Health bar if damaged
      if (building.hp < building.maxHp) {
        const barWidth = size * 2;
        const barHeight = 3;
        const barX = screenX - barWidth / 2;
        const barY = screenY - size - 8;

        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        const healthPercent = building.hp / building.maxHp;
        if (healthPercent > 0.5) {
          ctx.fillStyle = '#0f0';
        } else if (healthPercent > 0.25) {
          ctx.fillStyle = '#ff0';
        } else {
          ctx.fillStyle = '#f00';
        }
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
      }

      // Selection highlight if selectedBuildingId matches
      if (selectedBuildingId === buildingId) {
        ctx.strokeStyle = '#0f0';
        ctx.lineWidth = 2;
        ctx.strokeRect(screenX - size - 2, screenY - size - 2, size * 2 + 4, size * 2 + 4);
      }
    }
  }
}
