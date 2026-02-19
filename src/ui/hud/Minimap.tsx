interface Props {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onClick: (e: React.MouseEvent<HTMLCanvasElement>) => void;
}

export function Minimap({ canvasRef, onClick }: Props) {
  return (
    <div className="minimap-container">
      <canvas
        ref={canvasRef}
        width={180}
        height={120}
        onClick={onClick}
      />
    </div>
  );
}
