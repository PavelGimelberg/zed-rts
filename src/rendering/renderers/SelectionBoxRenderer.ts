export class SelectionBoxRenderer {
  render(ctx: CanvasRenderingContext2D, dragStart: { x: number; y: number } | null, dragEnd: { x: number; y: number } | null): void {
    if (!dragStart || !dragEnd) return;

    const left = Math.min(dragStart.x, dragEnd.x);
    const top = Math.min(dragStart.y, dragEnd.y);
    const right = Math.max(dragStart.x, dragEnd.x);
    const bottom = Math.max(dragStart.y, dragEnd.y);

    const width = right - left;
    const height = bottom - top;

    ctx.strokeStyle = '#0f0';
    ctx.lineWidth = 2;
    ctx.strokeRect(left, top, width, height);

    ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
    ctx.fillRect(left, top, width, height);
  }
}
