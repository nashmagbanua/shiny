
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Plus, Download, Moon, Sun, AlertTriangle } from 'lucide-react';
import { Chemical, ChemicalUsage, ChemicalInventoryState } from '@/types/chemical';
import { AddChemicalForm } from './AddChemicalForm';
import { UpdateInventoryForm } from './UpdateInventoryForm';
import { InventoryTable } from './InventoryTable';
import { ExportUtils } from '@/utils/exportUtils';
import { toast } from '@/hooks/use-toast';

export const ChemicalInventory = () => {
  const [state, setState] = useState<ChemicalInventoryState>({
    chemicals: [],
    usageHistory: [],
    searchTerm: '',
    filterBy: 'name',
    isDarkMode: false,
  });

  const [showAddForm, setShowAddForm] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedData = localStorage.getItem('chemicalInventory');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setState(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Error loading saved data:', error);
      }
    }
  }, []);

  // Save data to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('chemicalInventory', JSON.stringify({
      chemicals: state.chemicals,
      usageHistory: state.usageHistory,
    }));
  }, [state.chemicals, state.usageHistory]);

  // Apply dark mode
  useEffect(() => {
    if (state.isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.isDarkMode]);

  const addChemical = (chemical: Omit<Chemical, 'id' | 'currentBalance'>) => {
    const newChemical: Chemical = {
      ...chemical,
      id: Date.now().toString(),
      currentBalance: chemical.quantity,
    };
    setState(prev => ({
      ...prev,
      chemicals: [...prev.chemicals, newChemical],
    }));
    toast({
      title: "Chemical Added",
      description: `${chemical.name} has been added to inventory.`,
    });
  };

  const updateInventory = (usage: Omit<ChemicalUsage, 'id'>) => {
    const newUsage: ChemicalUsage = {
      ...usage,
      id: Date.now().toString(),
    };

    setState(prev => ({
      ...prev,
      usageHistory: [...prev.usageHistory, newUsage],
      chemicals: prev.chemicals.map(chemical => 
        chemical.id === usage.chemicalId
          ? { ...chemical, currentBalance: Math.max(0, chemical.currentBalance - usage.quantityUsed) }
          : chemical
      ),
    }));

    toast({
      title: "Inventory Updated",
      description: `Usage of ${usage.quantityUsed} ${getChemicalUnit(usage.chemicalId)} recorded.`,
    });
  };

  const getChemicalUnit = (chemicalId: string): string => {
    const chemical = state.chemicals.find(c => c.id === chemicalId);
    return chemical?.unit || '';
  };

  const exportToExcel = () => {
    setLoading(true);
    try {
      ExportUtils.exportToExcel(state.chemicals, state.usageHistory);
      toast({
        title: "Export Successful",
        description: "Chemical inventory has been exported to Excel.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "There was an error exporting the data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Check for alerts (near expiry or low stock)
  const getAlerts = () => {
    const alerts: string[] = [];
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    state.chemicals.forEach(chemical => {
      const expiryDate = new Date(chemical.expiryDate);
      const lowStockThreshold = chemical.quantity * 0.1;

      if (expiryDate <= thirtyDaysFromNow) {
        alerts.push(`${chemical.name} expires on ${chemical.expiryDate}`);
      }
      if (chemical.currentBalance <= lowStockThreshold) {
        alerts.push(`${chemical.name} is low in stock (${chemical.currentBalance} ${chemical.unit})`);
      }
    });

    return alerts;
  };

  const alerts = getAlerts();

  return (
    <div className={`min-h-screen transition-colors duration-300 ${state.isDarkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      <div className="container mx-auto p-4 space-y-6">
        {/* Header */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Chemical Inventory System
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Sun className="h-4 w-4" />
                <Switch
                  checked={state.isDarkMode}
                  onCheckedChange={(checked) => setState(prev => ({ ...prev, isDarkMode: checked }))}
                />
                <Moon className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Alerts */}
        {alerts.length > 0 && (
          <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">Alerts</h3>
                  <ul className="space-y-1 text-sm text-orange-700 dark:text-orange-300">
                    {alerts.map((alert, index) => (
                      <li key={index}>• {alert}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex-1 sm:flex-none bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transition-all duration-200"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Chemical
          </Button>
          <Button
            onClick={() => setShowUpdateForm(!showUpdateForm)}
            variant="outline"
            className="flex-1 sm:flex-none"
          >
            Update Inventory
          </Button>
          <Button
            onClick={exportToExcel}
            variant="outline"
            className="flex-1 sm:flex-none"
            disabled={loading}
          >
            <Download className="w-4 h-4 mr-2" />
            {loading ? 'Exporting...' : 'Export to Excel'}
          </Button>
        </div>

        {/* Forms */}
        {showAddForm && (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Add New Chemical</CardTitle>
            </CardHeader>
            <CardContent>
              <AddChemicalForm
                onSubmit={addChemical}
                onCancel={() => setShowAddForm(false)}
              />
            </CardContent>
          </Card>
        )}

        {showUpdateForm && (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Update Inventory</CardTitle>
            </CardHeader>
            <CardContent>
              <UpdateInventoryForm
                chemicals={state.chemicals}
                onSubmit={updateInventory}
                onCancel={() => setShowUpdateForm(false)}
              />
            </CardContent>
          </Card>
        )}

        {/* Inventory Table */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Current Inventory</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <InventoryTable
              chemicals={state.chemicals}
              searchTerm={state.searchTerm}
              filterBy={state.filterBy}
              onSearchChange={(term) => setState(prev => ({ ...prev, searchTerm: term }))}
              onFilterChange={(filter) => setState(prev => ({ ...prev, filterBy: filter }))}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChemicalInventory;
