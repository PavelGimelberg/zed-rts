import { GameState } from '../../types';
import { Camera } from '../Camera';

export class EffectsRenderer {
  render(ctx: CanvasRenderingContext2D, state: GameState, camera: Camera, canvasW: number, canvasH: number): void {
    // Render particles
    for (const particle of state.particles) {
      const { x: screenX, y: screenY } = camera.worldToScreen(particle.x, particle.y, canvasW, canvasH);

      const alpha = particle.life / particle.maxLife;
      ctx.fillStyle = particle.color;
      ctx.globalAlpha = alpha;
      ctx.fillRect(screenX - particle.size / 2, screenY - particle.size / 2, particle.size, particle.size);
      ctx.globalAlpha = 1;
    }

    // Render explosions
    for (const explosion of state.explosions) {
      const { x: screenX, y: screenY } = camera.worldToScreen(explosion.x, explosion.y, canvasW, canvasH);

      const fadeAlpha = 1 - explosion.frame / explosion.maxFrame;
      const radius = (explosion.frame / explosion.maxFrame) * explosion.size;

      // Outer circle (orange)
      ctx.fillStyle = '#ff8800';
      ctx.globalAlpha = fadeAlpha * 0.7;
      ctx.beginPath();
      ctx.arc(screenX, screenY, radius, 0, 2 * Math.PI);
      ctx.fill();

      // Inner circle (red)
      ctx.fillStyle = '#ff0000';
      ctx.globalAlpha = fadeAlpha;
      ctx.beginPath();
      ctx.arc(screenX, screenY, radius * 0.6, 0, 2 * Math.PI);
      ctx.fill();

      ctx.globalAlpha = 1;
    }
  }
}
