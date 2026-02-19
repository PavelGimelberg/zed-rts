export class SelectionManager {
  selectedUnitIds: string[] = [];
  selectedBuildingId: string | null = null;

  selectUnits(ids: string[]): void {
    this.selectedUnitIds = ids;
  }

  selectBuilding(id: string | null): void {
    this.selectedBuildingId = id;
  }

  clearSelection(): void {
    this.selectedUnitIds = [];
    this.selectedBuildingId = null;
  }

  getSelectedUnitIds(): string[] {
    return this.selectedUnitIds;
  }

  getSelectedBuildingId(): string | null {
    return this.selectedBuildingId;
  }
}
