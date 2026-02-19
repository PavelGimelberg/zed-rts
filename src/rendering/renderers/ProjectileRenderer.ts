import { GameState } from '../../types';
import { Camera } from '../Camera';

export class ProjectileRenderer {
  render(ctx: CanvasRenderingContext2D, state: GameState, camera: Camera, canvasW: number, canvasH: number): void {
    for (const projectileId in state.projectiles) {
      const proj = state.projectiles[projectileId];
      if (!proj.alive) continue;

      const { x: screenX, y: screenY } = camera.worldToScreen(proj.x, proj.y, canvasW, canvasH);

      // Rocket trails: circles with fading alpha along trail
      if (proj.isRocket && proj.trail.length > 0) {
        for (let i = 0; i < proj.trail.length; i++) {
          const trailPoint = proj.trail[i];
          const { x: tx, y: ty } = camera.worldToScreen(trailPoint.x, trailPoint.y, canvasW, canvasH);
          const alpha = (trailPoint.life / 30) * 0.5;
          ctx.fillStyle = `rgba(255, 150, 50, ${alpha})`;
          ctx.beginPath();
          ctx.arc(tx, ty, 2, 0, 2 * Math.PI);
          ctx.fill();
        }
      }

      if (proj.isRocket) {
        // Rockets: orange circle
        ctx.fillStyle = '#fa0';
        ctx.beginPath();
        ctx.arc(screenX, screenY, 3, 0, 2 * Math.PI);
        ctx.fill();

        ctx.fillStyle = '#ff6';
        ctx.beginPath();
        ctx.arc(screenX, screenY, 2, 0, 2 * Math.PI);
        ctx.fill();
      } else {
        // Bullets: small yellow rectangle
        ctx.fillStyle = '#ff0';
        ctx.fillRect(screenX - 1.5, screenY - 1.5, 3, 3);
      }
    }
  }
}
