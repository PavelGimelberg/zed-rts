import { GameState, UnitType, TeamId } from '../../types';
import { BUILDING_DEFS, UNIT_DEFS, CONFIG } from '../../config/gameConfig';

interface Props {
  state: GameState;
  selectedBuildingId: string | null;
  onProduce: (buildingId: string, unitType: UnitType) => void;
  localTeam: TeamId;
}

export function ProductionPanel({ state, selectedBuildingId, onProduce, localTeam }: Props) {
  if (!selectedBuildingId) {
    return null;
  }

  const building = Object.values(state.buildings).find(b => b.id === selectedBuildingId);
  if (!building || building.owner !== localTeam || building.type === 'fort') {
    return null;
  }

  const def = BUILDING_DEFS[building.type];
  const unitTypes: UnitType[] = def.produces ?? [];
  const currentProducing = building.producing;

  const getIcon = (type: UnitType): string => {
    const unitDef = UNIT_DEFS[type];
    return unitDef.isVehicle ? '🚗' : '🤖';
  };

  return (
    <div className="production-panel">
      {unitTypes.map(type => {
        const unitDef = UNIT_DEFS[type];
        const isActive = currentProducing === type;
        const productionTicks = CONFIG.BASE_PROD_TIME * unitDef.prodTime;
        const timeSeconds = Math.ceil(productionTicks / 60);

        return (
          <button
            key={type}
            className={`prod-btn ${isActive ? 'active' : ''}`}
            onClick={() => onProduce(selectedBuildingId, type)}
            title={`Produce ${unitDef.name}`}
          >
            <div className="icon">{getIcon(type)}</div>
            <div className="label">{unitDef.name}</div>
            <div className="time">{timeSeconds}s</div>
          </button>
        );
      })}
    </div>
  );
}
