export interface Chemical {
  id: string;
  dateReceived: string;
  name: string;
  quantity: number;
  unit: 'Liters' | 'Kilograms';
  supplier: string;
  expiryDate: string;
  storageLocation: string;
  remarks?: string;
  currentBalance: number;
}

export interface ChemicalUsage {
  id: string;
  chemicalId: string;
  chemicalName: string;
  quantityUsed: number;
  dateUsed: string;
  personInCharge: string;
  remarks?: string;
}

export interface ChemicalInventoryState {
  chemicals: Chemical[];
  usageHistory: ChemicalUsage[];
  searchTerm: string;
  filterBy: 'name' | 'date' | 'location';
  isDarkMode: boolean;
}
