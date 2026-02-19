import { GameState, TEAM, TeamId } from '../types';
import { Camera } from '../rendering/Camera';
import { CommandQueue } from './CommandQueue';
import { SelectionManager } from './SelectionManager';
import { createMoveCommand, createAttackCommand } from './CommandFactory';
import { distance } from '../utils/math';

export class InputHandler {
  private localTeam: TeamId;
  private opponentTeam: TeamId;

  keys: Record<string, boolean> = {};
  mouseX = 0;
  mouseY = 0;
  dragStart: { x: number; y: number } | null = null;
  dragEnd: { x: number; y: number } | null = null;
  isDragging = false;

  /** Accumulated wheel/trackpad scroll deltas (consumed each frame by Camera). */
  scrollDx = 0;
  scrollDy = 0;

  /** Pinch-to-zoom delta (consumed each frame by Camera). */
  zoomDelta = 0;

  private clickThreshold = 5;

  // Store bound handler references so we can properly remove them
  private boundMouseDown: (e: MouseEvent) => void;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseUp: (e: MouseEvent) => void;
  private boundContextMenu: (e: MouseEvent) => void;
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;
  private boundWheel: (e: WheelEvent) => void;

  constructor(
    private canvas: HTMLCanvasElement,
    private camera: Camera,
    private commandQueue: CommandQueue,
    private selectionManager: SelectionManager,
    private getState: () => GameState,
    localTeam: TeamId = TEAM.RED
  ) {
    this.localTeam = localTeam;
    this.opponentTeam = localTeam === TEAM.RED ? TEAM.BLUE : TEAM.RED;
    // Initialise mouse to canvas centre so edge-scroll doesn't
    // fire before the user actually moves the mouse.
    this.mouseX = canvas.width / 2;
    this.mouseY = canvas.height / 2;

    // Bind handlers once so we can add & remove the same references
    this.boundMouseDown = (e) => this.handleMouseDown(e);
    this.boundMouseMove = (e) => this.handleMouseMove(e);
    this.boundMouseUp = (e) => this.handleMouseUp(e);
    this.boundContextMenu = (e) => this.handleContextMenu(e);
    this.boundKeyDown = (e) => this.handleKeyDown(e);
    this.boundKeyUp = (e) => this.handleKeyUp(e);
    this.boundWheel = (e) => this.handleWheel(e);

    this.setup();
  }

  private setup(): void {
    this.canvas.addEventListener('mousedown', this.boundMouseDown);
    this.canvas.addEventListener('mousemove', this.boundMouseMove);
    this.canvas.addEventListener('mouseup', this.boundMouseUp);
    this.canvas.addEventListener('contextmenu', this.boundContextMenu);
    this.canvas.addEventListener('wheel', this.boundWheel, { passive: false });
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
  }

  destroy(): void {
    this.canvas.removeEventListener('mousedown', this.boundMouseDown);
    this.canvas.removeEventListener('mousemove', this.boundMouseMove);
    this.canvas.removeEventListener('mouseup', this.boundMouseUp);
    this.canvas.removeEventListener('contextmenu', this.boundContextMenu);
    this.canvas.removeEventListener('wheel', this.boundWheel);
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
  }

  /** Convert screen mouse position to flat world coords via iso reverse projection. */
  private mouseToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return this.camera.screenToWorld(
      screenX,
      screenY,
      this.canvas.width,
      this.canvas.height
    );
  }

  /** Convert world coords to screen coords. */
  private worldToScreen(wx: number, wy: number): { x: number; y: number } {
    return this.camera.worldToScreen(wx, wy, this.canvas.width, this.canvas.height);
  }

  /* ── Wheel / Trackpad ──────────────────────────────────── */

  private handleWheel(e: WheelEvent): void {
    e.preventDefault();

    // macOS trackpad pinch-to-zoom fires wheel events with ctrlKey
    if (e.ctrlKey || e.metaKey) {
      // Pinch zoom: deltaY < 0 = zoom in, deltaY > 0 = zoom out
      this.zoomDelta += -e.deltaY * 0.01;
      return;
    }

    // Normalise delta across browsers & input devices.
    // DOM_DELTA_PIXEL = 0, DOM_DELTA_LINE = 1, DOM_DELTA_PAGE = 2
    let dx = e.deltaX;
    let dy = e.deltaY;

    if (e.deltaMode === 1) {
      // Line-based scrolling (some mice / Firefox)
      dx *= 20;
      dy *= 20;
    } else if (e.deltaMode === 2) {
      // Page-based scrolling
      dx *= this.canvas.width;
      dy *= this.canvas.height;
    }

    // Accumulate — Camera.update() will consume these each frame
    this.scrollDx += dx;
    this.scrollDy += dy;
  }

  /* ── Mouse ─────────────────────────────────────────────── */

  private handleMouseDown(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = e.clientX - rect.left;
    this.mouseY = e.clientY - rect.top;

    if (e.button === 0) {
      // Left click: start drag
      this.dragStart = { x: this.mouseX, y: this.mouseY };
      this.dragEnd = { x: this.mouseX, y: this.mouseY };
      this.isDragging = false;
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = e.clientX - rect.left;
    this.mouseY = e.clientY - rect.top;

    if (this.dragStart) {
      this.dragEnd = { x: this.mouseX, y: this.mouseY };

      const dx = this.dragEnd.x - this.dragStart.x;
      const dy = this.dragEnd.y - this.dragStart.y;
      const distSquared = dx * dx + dy * dy;

      if (distSquared > this.clickThreshold * this.clickThreshold) {
        this.isDragging = true;
      }
    }
  }

  private handleMouseUp(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = e.clientX - rect.left;
    this.mouseY = e.clientY - rect.top;

    if (this.dragStart && this.dragEnd) {
      if (this.isDragging) {
        // Box select all RED units in screen-space rectangle
        const left = Math.min(this.dragStart.x, this.dragEnd.x);
        const top = Math.min(this.dragStart.y, this.dragEnd.y);
        const right = Math.max(this.dragStart.x, this.dragEnd.x);
        const bottom = Math.max(this.dragStart.y, this.dragEnd.y);

        const state = this.getState();
        const selectedUnitIds: string[] = [];

        for (const unitId in state.units) {
          const unit = state.units[unitId];
          if (unit.owner !== this.localTeam || unit.hp <= 0) continue;

          // Project unit world position to screen
          const scr = this.worldToScreen(unit.x, unit.y);

          if (scr.x >= left && scr.x <= right && scr.y >= top && scr.y <= bottom) {
            selectedUnitIds.push(unitId);
          }
        }

        this.selectionManager.selectUnits(selectedUnitIds);
        this.selectionManager.selectBuilding(null);
      } else {
        // Single-click: only change selection if clicking ON something.
        // Clicking empty space keeps the current selection (persistent groups).
        const world = this.mouseToWorld(this.mouseX, this.mouseY);
        const state = this.getState();

        // Check buildings first
        let clickedBuildingId: string | null = null;
        let closestBuildingDist = Infinity;
        for (const buildingId in state.buildings) {
          const building = state.buildings[buildingId];
          if (building.owner !== this.localTeam || building.hp <= 0) continue;

          const dist = distance(building.x, building.y, world.x, world.y);
          if (dist < 25 && dist < closestBuildingDist) {
            clickedBuildingId = buildingId;
            closestBuildingDist = dist;
          }
        }

        if (clickedBuildingId) {
          this.selectionManager.selectBuilding(clickedBuildingId);
          this.selectionManager.selectUnits([]);
        } else {
          // Check units
          let clickedUnitId: string | null = null;
          let closestUnitDist = Infinity;
          for (const unitId in state.units) {
            const unit = state.units[unitId];
            if (unit.owner !== this.localTeam || unit.hp <= 0) continue;

            const dist = distance(unit.x, unit.y, world.x, world.y);
            if (dist < 15 && dist < closestUnitDist) {
              clickedUnitId = unitId;
              closestUnitDist = dist;
            }
          }

          if (clickedUnitId) {
            // Clicked on a unit → select it (replaces current selection)
            this.selectionManager.selectUnits([clickedUnitId]);
            this.selectionManager.selectBuilding(null);
          }
          // else: clicked empty space → keep current selection
        }
      }
    }

    this.dragStart = null;
    this.dragEnd = null;
    this.isDragging = false;
  }

  private handleContextMenu(e: MouseEvent): void {
    e.preventDefault();

    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const world = this.mouseToWorld(mx, my);

    const selectedUnitIds = this.selectionManager.getSelectedUnitIds();
    if (selectedUnitIds.length === 0) return;

    const state = this.getState();

    // Check if clicking enemy unit
    let targetId: string | null = null;
    let closestDist = Infinity;

    for (const unitId in state.units) {
      const unit = state.units[unitId];
      if (unit.owner !== this.opponentTeam || unit.hp <= 0) continue;

      const dist = distance(unit.x, unit.y, world.x, world.y);
      if (dist < 20 && dist < closestDist) {
        targetId = unitId;
        closestDist = dist;
      }
    }

    // Check enemy buildings
    if (!targetId) {
      let closestBuildingDist = Infinity;
      for (const buildingId in state.buildings) {
        const building = state.buildings[buildingId];
        if (building.owner !== this.opponentTeam || building.hp <= 0) continue;

        const dist = distance(building.x, building.y, world.x, world.y);
        if (dist < 30 && dist < closestBuildingDist) {
          targetId = buildingId;
          closestBuildingDist = dist;
        }
      }
    }

    if (targetId) {
      // Create AttackCommand
      const cmd = createAttackCommand(selectedUnitIds, targetId, this.localTeam);
      this.commandQueue.enqueue(cmd);
    } else {
      // Create MoveCommand
      const cmd = createMoveCommand(selectedUnitIds, world.x, world.y, this.localTeam);
      this.commandQueue.enqueue(cmd);
    }
  }

  /* ── Keyboard ──────────────────────────────────────────── */

  private handleKeyDown(e: KeyboardEvent): void {
    this.keys[e.key] = true;
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.keys[e.key] = false;
  }
}
