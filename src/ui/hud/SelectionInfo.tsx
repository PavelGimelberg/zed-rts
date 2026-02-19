import { GameState, TEAM, UnitType } from '../../types';
import { BUILDING_DEFS, UNIT_DEFS, CONFIG } from '../../config/gameConfig';

interface Props {
  state: GameState;
  selectedUnitIds: string[];
  selectedBuildingId: string | null;
}

export function SelectionInfo({ state, selectedUnitIds, selectedBuildingId }: Props) {
  // If building selected
  if (selectedBuildingId) {
    const building = Object.values(state.buildings).find(b => b.id === selectedBuildingId);
    if (building) {
      const def = BUILDING_DEFS[building.type];
      const teamName = building.owner === TEAM.RED ? 'RED' : 'BLUE';
      const producing = building.producing;
      const progress = building.prodTimer;
      const productionTicks = producing ? CONFIG.BASE_PROD_TIME * UNIT_DEFS[producing].prodTime : 0;
      const timeRemaining = Math.max(0, productionTicks - progress);
      const secondsRemaining = Math.ceil(timeRemaining / 60);

      return (
        <div className="selection-info">
          <h3>{def.name}</h3>
          <p>Team: <span style={{ color: building.owner === TEAM.RED ? '#ff6666' : '#6666ff' }}>{teamName}</span></p>
          <p>HP: {building.hp}/{def.hp}</p>
          {producing && (
            <p>Producing: {UNIT_DEFS[producing].name} ({secondsRemaining}s)</p>
          )}
          {!producing && <p>No unit in production</p>}
        </div>
      );
    }
  }

  // If units selected
  if (selectedUnitIds.length > 0) {
    if (selectedUnitIds.length === 1) {
      const unit = Object.values(state.units).find(u => u.id === selectedUnitIds[0]);
      if (unit) {
        const def = UNIT_DEFS[unit.type];
        const teamName = unit.owner === TEAM.RED ? 'RED' : 'BLUE';
        const stateLabels: Record<string, string> = { idle: 'Idle', moving: 'Moving', attacking: 'Attacking' };
        const unitState = stateLabels[unit.state] || 'Unknown';

        return (
          <div className="selection-info">
            <h3>{def.name}</h3>
            <p>Team: <span style={{ color: unit.owner === TEAM.RED ? '#ff6666' : '#6666ff' }}>{teamName}</span></p>
            <p>HP: {unit.hp}/{def.hp}</p>
            <p>Damage: {def.damage} | Range: {def.range}px | Speed: {def.speed}px/s</p>
            <p>State: {unitState}</p>
          </div>
        );
      }
    } else {
      // Multiple units selected
      const typeCount: Record<string, number> = {};
      for (const id of selectedUnitIds) {
        const unit = Object.values(state.units).find(u => u.id === id);
        if (unit) {
          typeCount[unit.type] = (typeCount[unit.type] || 0) + 1;
        }
      }

      return (
        <div className="selection-info">
          <h3>Selected Units: {selectedUnitIds.length}</h3>
          {Object.entries(typeCount).map(([type, count]) => (
            <p key={type}>
              {UNIT_DEFS[type as UnitType]?.name}: {count}
            </p>
          ))}
        </div>
      );
    }
  }

  // Nothing selected
  return (
    <div className="selection-info">
      <h3>No Selection</h3>
      <p>Click on units or buildings to select them</p>
      <p>Right-click to move or attack</p>
    </div>
  );
}
