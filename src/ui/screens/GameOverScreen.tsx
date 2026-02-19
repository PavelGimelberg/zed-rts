interface Props {
  winner: number;
  reason: string;
  onRestart: () => void;
  localTeam: number;
}

export function GameOverScreen({ winner, reason, onRestart, localTeam }: Props) {
  const isVictory = winner === localTeam;
  return (
    <div className="game-over-screen">
      <h1 style={{ color: isVictory ? '#4f4' : '#f44' }}>
        {isVictory ? 'VICTORY!' : 'DEFEAT'}
      </h1>
      <p style={{ fontSize: 18, marginBottom: 30, color: '#aaa' }}>{reason}</p>
      <button onClick={onRestart}>PLAY AGAIN</button>
    </div>
  );
}
