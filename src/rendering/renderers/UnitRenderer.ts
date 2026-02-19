import { GameState, Unit } from '../../types';
import { TEAM_COLORS, UNIT_DEFS } from '../../config/gameConfig';
import { Camera } from '../Camera';
import { SpriteManager, angleToDirection, Direction } from '../SpriteManager';

export class UnitRenderer {
  private spriteManager: SpriteManager | null = null;

  /** Attach a SpriteManager for sprite-based rendering */
  setSpriteManager(manager: SpriteManager): void {
    this.spriteManager = manager;
  }

  render(
    ctx: CanvasRenderingContext2D,
    state: GameState,
    camera: Camera,
    canvasW: number,
    canvasH: number,
    selectedUnitIds: string[],
    gameTime: number
  ): void {
    const selectedSet = new Set(selectedUnitIds);
    const selectedCount = selectedSet.size;

    for (const unitId in state.units) {
      const unit = state.units[unitId];
      if (unit.hp <= 0) continue;

      const { x: screenX, y: screenY } = camera.worldToScreen(unit.x, unit.y, canvasW, canvasH);
      const def = UNIT_DEFS[unit.type];
      const teamColor = TEAM_COLORS[unit.owner];
      const isSelected = selectedSet.has(unitId);

      // ── Selection visuals (drawn under the unit) ──
      if (isSelected) {
        const pulse = 0.7 + 0.3 * Math.sin(gameTime * 0.08);

        // Outer glow ring
        ctx.save();
        ctx.globalAlpha = 0.3 * pulse;
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(screenX, screenY, def.size + 8, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.restore();

        // Inner solid selection ring
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(screenX, screenY, def.size + 4, 0, 2 * Math.PI);
        ctx.stroke();

        // Iso-style diamond ground marker
        const dw = def.size * 1.6;
        const dh = def.size * 0.8;
        ctx.save();
        ctx.globalAlpha = 0.25 * pulse;
        ctx.fillStyle = '#00ff88';
        ctx.beginPath();
        ctx.moveTo(screenX, screenY - dh);
        ctx.lineTo(screenX + dw, screenY);
        ctx.lineTo(screenX, screenY + dh);
        ctx.lineTo(screenX - dw, screenY);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // ── Unit body — try sprite first, fall back to shapes ──
      const spriteDrawn = this.tryDrawSprite(ctx, unit, screenX, screenY, def.size, gameTime, state, camera, canvasW, canvasH);

      if (!spriteDrawn) {
        // Fallback: procedural shape rendering
        if (def.isVehicle) {
          this.drawVehicleShape(ctx, unit, screenX, screenY, def, teamColor, state, camera, canvasW, canvasH);
        } else {
          this.drawInfantryShape(ctx, unit, screenX, screenY, def, teamColor, state, camera, canvasW, canvasH);
        }
      }

      // Health bar if damaged
      if (unit.hp < unit.maxHp) {
        const spriteSize = spriteDrawn ? 16 : def.size; // sprite renders larger
        const barWidth = spriteDrawn ? 32 : def.size * 2.5;
        const barHeight = 3;
        const barX = screenX - barWidth / 2;
        const barY = screenY - spriteSize - 8;

        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        const healthPercent = unit.hp / unit.maxHp;
        if (healthPercent > 0.5) {
          ctx.fillStyle = '#0f0';
        } else if (healthPercent > 0.25) {
          ctx.fillStyle = '#ff0';
        } else {
          ctx.fillStyle = '#f00';
        }
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
      }

      // Type label when selected
      if (isSelected) {
        ctx.fillStyle = '#fff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(def.name, screenX, screenY + (spriteDrawn ? 18 : def.size + 15));
      }
    }

    // ── Group badge (top-centre of screen) ──
    if (selectedCount > 0) {
      this.renderGroupBadge(ctx, canvasW, selectedCount, selectedUnitIds, state);
    }
  }

  /** Draws a compact group badge at top-centre showing count and composition. */
  private renderGroupBadge(
    ctx: CanvasRenderingContext2D,
    canvasW: number,
    count: number,
    ids: string[],
    state: GameState
  ): void {
    // Count units by type
    const typeCounts: Record<string, number> = {};
    for (const id of ids) {
      const unit = state.units[id];
      if (!unit || unit.hp <= 0) continue;
      const def = UNIT_DEFS[unit.type];
      typeCounts[def.name] = (typeCounts[def.name] || 0) + 1;
    }

    const parts = Object.entries(typeCounts).map(([name, c]) => `${c} ${name}`);
    const label = `Selected: ${parts.join(', ')} (${count})`;

    ctx.font = 'bold 13px Arial';
    const textWidth = ctx.measureText(label).width;
    const padding = 10;
    const badgeW = textWidth + padding * 2;
    const badgeH = 26;
    const badgeX = (canvasW - badgeW) / 2;
    const badgeY = 44; // below resource bar

    // Background pill (using manual rounded rect for max compat)
    ctx.save();
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = '#1a1a2e';
    this.drawRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, 6);
    ctx.fill();
    ctx.restore();

    // Border
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 1;
    this.drawRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, 6);
    ctx.stroke();

    // Text
    ctx.fillStyle = '#00ff88';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, canvasW / 2, badgeY + badgeH / 2);
    ctx.textBaseline = 'alphabetic'; // reset
  }

  /** Cross-browser rounded rectangle path. */
  private drawRoundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  // ── Sprite rendering ──

  private tryDrawSprite(
    ctx: CanvasRenderingContext2D,
    unit: Unit,
    screenX: number,
    screenY: number,
    unitSize: number,
    gameTime: number,
    state: GameState,
    camera: Camera,
    canvasW: number,
    canvasH: number,
  ): boolean {
    if (!this.spriteManager || !this.spriteManager.isLoaded) return false;

    // Determine unit facing direction from movement path or attack target
    const direction = this.getUnitDirection(unit, screenX, screenY, state, camera, canvasW, canvasH);
    const isMoving = unit.state === 'moving' && unit.path.length > 0;

    // Animation frame: cycle through walk frames based on game time
    const walkFrameCount = this.spriteManager.getWalkFrameCount(unit.type);
    const animFrame = Math.floor(gameTime / 8) % walkFrameCount; // ~7.5 fps animation

    const sprite = this.spriteManager.getSprite(unit.type, unit.owner, direction, isMoving, animFrame);
    if (!sprite) return false;

    // Draw sprite centred on unit position, scaled up from 32px to a visible size
    // Sprites are 32×32, we render them at 2x scale for good visibility on the iso map
    const renderSize = 32;
    ctx.imageSmoothingEnabled = false; // crisp pixel art!
    ctx.drawImage(
      sprite,
      screenX - renderSize / 2,
      screenY - renderSize / 2,
      renderSize,
      renderSize,
    );
    ctx.imageSmoothingEnabled = true;
    return true;
  }

  private getUnitDirection(
    unit: Unit,
    screenX: number,
    screenY: number,
    state: GameState,
    camera: Camera,
    canvasW: number,
    canvasH: number,
  ): Direction {
    // Priority 1: facing attack target
    if (unit.attackTargetId) {
      const target = this.getTarget(state, unit.attackTargetId);
      if (target) {
        const tgt = camera.worldToScreen(target.x, target.y, canvasW, canvasH);
        const angle = Math.atan2(tgt.y - screenY, tgt.x - screenX);
        return angleToDirection(angle);
      }
    }
    // Priority 2: facing movement direction
    if (unit.path.length > 0) {
      const next = unit.path[0];
      const nxt = camera.worldToScreen(next.x, next.y, canvasW, canvasH);
      const angle = Math.atan2(nxt.y - screenY, nxt.x - screenX);
      return angleToDirection(angle);
    }
    // Default: south-east (classic isometric default facing)
    return 'south-east';
  }

  // ── Fallback shape rendering ──

  private drawVehicleShape(
    ctx: CanvasRenderingContext2D,
    unit: Unit,
    screenX: number,
    screenY: number,
    def: { size: number; color: string },
    teamColor: { main: string; light: string; dark: string },
    state: GameState,
    camera: Camera,
    canvasW: number,
    canvasH: number,
  ): void {
    // Vehicle: rectangle body
    ctx.fillStyle = teamColor.main;
    ctx.fillRect(screenX - def.size, screenY - def.size * 0.6, def.size * 2, def.size * 1.2);

    // Turret circle
    ctx.fillStyle = teamColor.light;
    ctx.beginPath();
    ctx.arc(screenX, screenY, def.size * 0.5, 0, 2 * Math.PI);
    ctx.fill();

    // Gun barrel
    let barrelAngle = 0;
    if (unit.attackTargetId) {
      const target = this.getTarget(state, unit.attackTargetId);
      if (target) {
        const tgt = camera.worldToScreen(target.x, target.y, canvasW, canvasH);
        barrelAngle = Math.atan2(tgt.y - screenY, tgt.x - screenX);
      }
    } else if (unit.path.length > 0) {
      const next = unit.path[0];
      const nxt = camera.worldToScreen(next.x, next.y, canvasW, canvasH);
      barrelAngle = Math.atan2(nxt.y - screenY, nxt.x - screenX);
    }

    ctx.strokeStyle = teamColor.dark;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(screenX, screenY);
    ctx.lineTo(
      screenX + Math.cos(barrelAngle) * def.size * 1.2,
      screenY + Math.sin(barrelAngle) * def.size * 1.2
    );
    ctx.stroke();

    // Tread lines
    ctx.strokeStyle = teamColor.dark;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(screenX - def.size * 0.8, screenY - def.size * 0.8);
    ctx.lineTo(screenX - def.size * 0.8, screenY + def.size * 0.8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(screenX + def.size * 0.8, screenY - def.size * 0.8);
    ctx.lineTo(screenX + def.size * 0.8, screenY + def.size * 0.8);
    ctx.stroke();
  }

  private drawInfantryShape(
    ctx: CanvasRenderingContext2D,
    unit: Unit,
    screenX: number,
    screenY: number,
    def: { size: number; color: string },
    teamColor: { main: string; light: string; dark: string },
    state: GameState,
    camera: Camera,
    canvasW: number,
    canvasH: number,
  ): void {
    // Infantry: body circle
    ctx.fillStyle = teamColor.main;
    ctx.beginPath();
    ctx.arc(screenX, screenY, def.size, 0, 2 * Math.PI);
    ctx.fill();

    // Head circle
    ctx.fillStyle = teamColor.light;
    ctx.beginPath();
    ctx.arc(screenX, screenY - def.size * 0.4, def.size * 0.5, 0, 2 * Math.PI);
    ctx.fill();

    // Type indicator circle
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.arc(screenX, screenY + def.size * 0.5, def.size * 0.3, 0, 2 * Math.PI);
    ctx.fill();

    // Weapon line toward target
    if (unit.attackTargetId) {
      const target = this.getTarget(state, unit.attackTargetId);
      if (target) {
        const tgt = camera.worldToScreen(target.x, target.y, canvasW, canvasH);
        ctx.strokeStyle = def.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(screenX, screenY);
        ctx.lineTo(tgt.x, tgt.y);
        ctx.stroke();
      }
    }
  }

  private getTarget(state: GameState, targetId: string): { x: number; y: number } | null {
    if (state.units[targetId]) {
      const u = state.units[targetId];
      return { x: u.x, y: u.y };
    }
    if (state.buildings[targetId]) {
      const b = state.buildings[targetId];
      return { x: b.x, y: b.y };
    }
    return null;
  }
}
