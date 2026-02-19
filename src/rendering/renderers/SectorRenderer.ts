import { GameState } from '../../types';
import { TEAM_COLORS, CONFIG } from '../../config/gameConfig';
import { Camera } from '../Camera';

export class SectorRenderer {
  render(
    ctx: CanvasRenderingContext2D,
    state: GameState,
    camera: Camera,
    canvasW: number,
    canvasH: number,
    gameTime: number
  ): void {
    for (const sector of state.sectors) {
      const teamColor = TEAM_COLORS[sector.owner];

      // Convert sector rectangle corners to iso screen coords
      const tl = camera.worldToScreen(sector.x, sector.y, canvasW, canvasH);
      const tr = camera.worldToScreen(sector.x + sector.w, sector.y, canvasW, canvasH);
      const br = camera.worldToScreen(sector.x + sector.w, sector.y + sector.h, canvasW, canvasH);
      const bl = camera.worldToScreen(sector.x, sector.y + sector.h, canvasW, canvasH);

      // Draw sector fill as an iso-projected parallelogram
      ctx.fillStyle = teamColor.fill;
      ctx.globalAlpha = 0.12;
      ctx.beginPath();
      ctx.moveTo(tl.x, tl.y);
      ctx.lineTo(tr.x, tr.y);
      ctx.lineTo(br.x, br.y);
      ctx.lineTo(bl.x, bl.y);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;

      // Draw sector border
      ctx.strokeStyle = teamColor.main + '44';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tl.x, tl.y);
      ctx.lineTo(tr.x, tr.y);
      ctx.lineTo(br.x, br.y);
      ctx.lineTo(bl.x, bl.y);
      ctx.closePath();
      ctx.stroke();

      // Draw flag at flag position (world coords -> iso screen)
      const flag = camera.worldToScreen(sector.flagX, sector.flagY, canvasW, canvasH);

      // Flag pole
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(flag.x, flag.y - 15);
      ctx.lineTo(flag.x, flag.y + 15);
      ctx.stroke();

      // Waving flag
      const waveOffset = Math.sin(gameTime * 0.1 + sector.id) * 5;
      ctx.fillStyle = teamColor.flag;
      ctx.beginPath();
      ctx.moveTo(flag.x, flag.y - 8);
      ctx.lineTo(flag.x + 15 + waveOffset, flag.y - 12);
      ctx.lineTo(flag.x + 15 + waveOffset, flag.y - 4);
      ctx.closePath();
      ctx.fill();

      // Capture progress ring
      if (sector.captureProgress > 0 && sector.capturingTeam !== 0) {
        const capturingColor = TEAM_COLORS[sector.capturingTeam];
        ctx.strokeStyle = capturingColor.main;
        ctx.lineWidth = 2;
        ctx.beginPath();
        const startAngle = -Math.PI / 2;
        const endAngle = startAngle + (sector.captureProgress / CONFIG.CAPTURE_TIME) * 2 * Math.PI;
        ctx.arc(flag.x, flag.y, 22, startAngle, endAngle);
        ctx.stroke();

        // Pulsing ring during capture
        const pulse = 0.5 + 0.5 * Math.sin(gameTime * 0.15);
        ctx.strokeStyle = capturingColor.main;
        ctx.globalAlpha = pulse * 0.5;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(flag.x, flag.y, 28, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Dashed capture range circle
      ctx.strokeStyle = '#999';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(flag.x, flag.y, CONFIG.CAPTURE_RANGE * 0.8, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}
