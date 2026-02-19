import { CONFIG } from '../config/gameConfig';
import { clamp } from '../utils/math';

/**
 * Isometric camera with smooth trackpad scrolling and zoom.
 *
 * Projection (rotated so the map fills a widescreen naturally):
 *   isoX = (col + row) * ISO_HALF_W
 *   isoY = (row - col) * ISO_HALF_H
 *
 * Camera (x, y) is the centre of the viewport in iso-world space.
 */
export class Camera {
  x = 0;
  y = 0;

  /** Current zoom level (1 = default). */
  zoom = 1;
  private minZoom = 0.35;
  private maxZoom = 2.5;

  /** Smooth velocity for trackpad scrolling only. */
  private vx = 0;
  private vy = 0;
  private friction = 0.82;
  private minVelocity = 0.15;

  /* ── Isometric projection helpers ────────────────────────── */

  /** Convert flat world-pixel coords → isometric screen coords. */
  worldToScreen(
    wx: number,
    wy: number,
    canvasW: number,
    canvasH: number
  ): { x: number; y: number } {
    const col = wx / CONFIG.TILE_SIZE;
    const row = wy / CONFIG.TILE_SIZE;
    const isoX = (col + row) * CONFIG.ISO_HALF_W;
    const isoY = (row - col) * CONFIG.ISO_HALF_H;
    return {
      x: (isoX - this.x) * this.zoom + canvasW / 2,
      y: (isoY - this.y) * this.zoom + canvasH / 2,
    };
  }

  /** Convert screen (mouse) coords → flat world-pixel coords. */
  screenToWorld(
    sx: number,
    sy: number,
    canvasW: number,
    canvasH: number
  ): { x: number; y: number } {
    const isoX = (sx - canvasW / 2) / this.zoom + this.x;
    const isoY = (sy - canvasH / 2) / this.zoom + this.y;
    const col = (isoX / CONFIG.ISO_HALF_W - isoY / CONFIG.ISO_HALF_H) / 2;
    const row = (isoX / CONFIG.ISO_HALF_W + isoY / CONFIG.ISO_HALF_H) / 2;
    return {
      x: col * CONFIG.TILE_SIZE,
      y: row * CONFIG.TILE_SIZE,
    };
  }

  /** Convert tile (col, row) → screen coords. */
  tileToScreen(
    col: number,
    row: number,
    canvasW: number,
    canvasH: number
  ): { x: number; y: number } {
    const isoX = (col + row) * CONFIG.ISO_HALF_W;
    const isoY = (row - col) * CONFIG.ISO_HALF_H;
    return {
      x: (isoX - this.x) * this.zoom + canvasW / 2,
      y: (isoY - this.y) * this.zoom + canvasH / 2,
    };
  }

  /* ── Camera movement ─────────────────────────────────────── */

  update(
    keys: Record<string, boolean>,
    mouseX: number,
    mouseY: number,
    canvasW: number,
    canvasH: number,
    _worldW: number,
    _worldH: number,
    scrollDx: number,
    scrollDy: number,
    zoomDelta: number
  ): void {
    const speed = CONFIG.CAMERA_SPEED;
    const zone = CONFIG.EDGE_SCROLL_ZONE;

    // ── 1. Keyboard → move camera directly (no momentum) ──
    let directX = 0;
    let directY = 0;
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) directX -= speed;
    if (keys['ArrowRight'] || keys['d'] || keys['D']) directX += speed;
    if (keys['ArrowUp'] || keys['w'] || keys['W']) directY -= speed;
    if (keys['ArrowDown'] || keys['s'] || keys['S']) directY += speed;

    // ── 2. Edge scroll → only when mouse is actually moving near edges ──
    //    Uses a narrow zone and gentle speed; doesn't interfere with trackpad.
    if (mouseX >= 0 && mouseX <= canvasW && mouseY >= 0 && mouseY <= canvasH) {
      const topZone = zone;
      const bottomZone = zone;
      const leftZone = zone;
      const rightZone = zone;

      if (mouseX < leftZone) directX -= speed * 0.6 * (1 - mouseX / leftZone);
      if (mouseX > canvasW - rightZone) directX += speed * 0.6 * (1 - (canvasW - mouseX) / rightZone);
      if (mouseY < topZone) directY -= speed * 0.6 * (1 - mouseY / topZone);
      if (mouseY > canvasH - bottomZone) directY += speed * 0.6 * (1 - (canvasH - mouseY) / bottomZone);
    }

    // Apply direct movement (keyboard + edge scroll) — NO momentum
    this.x += directX;
    this.y += directY;

    // If keyboard/edge scroll active, kill any trackpad momentum
    if (directX !== 0 || directY !== 0) {
      this.vx = 0;
      this.vy = 0;
    }

    // ── 3. Trackpad / wheel scroll → velocity-based with momentum ──
    if (scrollDx !== 0 || scrollDy !== 0) {
      this.vx += scrollDx / this.zoom;
      this.vy += scrollDy / this.zoom;
    }

    // ── 4. Pinch-to-zoom ──
    if (zoomDelta !== 0) {
      const oldZoom = this.zoom;
      this.zoom = clamp(this.zoom + zoomDelta, this.minZoom, this.maxZoom);
      // Zoom towards mouse cursor
      const wx = (mouseX - canvasW / 2) / oldZoom + this.x;
      const wy = (mouseY - canvasH / 2) / oldZoom + this.y;
      this.x = wx - (mouseX - canvasW / 2) / this.zoom;
      this.y = wy - (mouseY - canvasH / 2) / this.zoom;
    }

    // ── 5. Apply trackpad velocity ──
    this.x += this.vx;
    this.y += this.vy;

    // ── 6. Friction on trackpad velocity only ──
    this.vx *= this.friction;
    this.vy *= this.friction;
    if (Math.abs(this.vx) < this.minVelocity) this.vx = 0;
    if (Math.abs(this.vy) < this.minVelocity) this.vy = 0;

    // ── 7. Clamp to isometric world bounds ──
    const cols = CONFIG.MAP_COLS;
    const rows = CONFIG.MAP_ROWS;
    const hw = CONFIG.ISO_HALF_W;
    const hh = CONFIG.ISO_HALF_H;
    // Rotated projection: isoX = (col+row)*hw, isoY = (row-col)*hh
    const minIsoX = -hw;
    const maxIsoX = (cols + rows) * hw + hw;
    const minIsoY = -cols * hh - hh;
    const maxIsoY = rows * hh + hh;

    this.x = clamp(this.x, minIsoX, maxIsoX);
    this.y = clamp(this.y, minIsoY, maxIsoY);

    // Kill velocity at boundaries
    if (this.x <= minIsoX || this.x >= maxIsoX) this.vx = 0;
    if (this.y <= minIsoY || this.y >= maxIsoY) this.vy = 0;
  }

  /** Centre camera on the map. */
  centreOnMap(): void {
    const midCol = CONFIG.MAP_COLS / 2;
    const midRow = CONFIG.MAP_ROWS / 2;
    this.x = (midCol + midRow) * CONFIG.ISO_HALF_W;
    this.y = (midRow - midCol) * CONFIG.ISO_HALF_H;
  }
}
