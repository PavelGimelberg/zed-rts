import { GameState, TEAM } from '../../types';

interface Props {
  state: GameState;
}

export function ResourceBar({ state }: Props) {
  // Count sectors per team
  const redSectors = state.sectors.filter(s => s.owner === TEAM.RED).length;
  const blueSectors = state.sectors.filter(s => s.owner === TEAM.BLUE).length;

  // Count units per team
  const redUnits = Object.values(state.units).filter(u => u.owner === TEAM.RED).length;
  const blueUnits = Object.values(state.units).filter(u => u.owner === TEAM.BLUE).length;

  // Format game time as MM:SS from state.tick / 60 (assuming 60 ticks per second)
  const totalSeconds = Math.floor(state.tick / 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="resource-bar">
      <div className="team-red">
        <strong>RED:</strong> {redSectors} Sectors | {redUnits} Units
      </div>
      <div className="game-time">{timeDisplay}</div>
      <div className="team-blue">
        <strong>BLUE:</strong> {blueUnits} Units | {blueSectors} Sectors
      </div>
    </div>
  );
}
