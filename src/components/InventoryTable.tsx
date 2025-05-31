
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Filter, AlertTriangle } from 'lucide-react';
import { Chemical } from '@/types/chemical';

interface InventoryTableProps {
  chemicals: Chemical[];
  searchTerm: string;
  filterBy: 'name' | 'date' | 'location';
  onSearchChange: (term: string) => void;
  onFilterChange: (filter: 'name' | 'date' | 'location') => void;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({
  chemicals,
  searchTerm,
  filterBy,
  onSearchChange,
  onFilterChange,
}) => {
  const [sortBy, setSortBy] = useState<keyof Chemical>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const filteredChemicals = chemicals.filter(chemical => {
    if (!searchTerm) return true;
    
    switch (filterBy) {
      case 'name':
        return chemical.name.toLowerCase().includes(searchTerm.toLowerCase());
      case 'date':
        return chemical.dateReceived.includes(searchTerm) || chemical.expiryDate.includes(searchTerm);
      case 'location':
        return chemical.storageLocation.toLowerCase().includes(searchTerm.toLowerCase());
      default:
        return true;
    }
  });

  const sortedChemicals = [...filteredChemicals].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    
    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field: keyof Chemical) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const isLowStock = (chemical: Chemical) => {
    return chemical.currentBalance <= chemical.quantity * 0.1;
  };

  const isNearExpiry = (chemical: Chemical) => {
    const today = new Date();
    const expiryDate = new Date(chemical.expiryDate);
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    return expiryDate <= thirtyDaysFromNow;
  };

  return (
    <div className="space-y-4 p-4">
      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search chemicals..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 transition-all duration-200 focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="sm:w-48">
          <Select value={filterBy} onValueChange={(value) => onFilterChange(value as 'name' | 'date' | 'location')}>
            <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-blue-500">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Filter by Name</SelectItem>
              <SelectItem value="date">Filter by Date</SelectItem>
              <SelectItem value="location">Filter by Location</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-gray-800">
                <TableHead 
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => handleSort('name')}
                >
                  Chemical Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => handleSort('currentBalance')}
                >
                  Current Balance {sortBy === 'currentBalance' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => handleSort('expiryDate')}
                >
                  Expiry Date {sortBy === 'expiryDate' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => handleSort('storageLocation')}
                >
                  Storage Location {sortBy === 'storageLocation' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedChemicals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    {chemicals.length === 0 ? 'No chemicals in inventory' : 'No chemicals found matching your search'}
                  </TableCell>
                </TableRow>
              ) : (
                sortedChemicals.map((chemical) => (
                  <TableRow 
                    key={chemical.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <TableCell className="font-medium">{chemical.name}</TableCell>
                    <TableCell className={`font-medium ${isLowStock(chemical) ? 'text-red-600' : ''}`}>
                      {chemical.currentBalance.toFixed(2)}
                    </TableCell>
                    <TableCell>{chemical.unit}</TableCell>
                    <TableCell>{chemical.supplier}</TableCell>
                    <TableCell className={`${isNearExpiry(chemical) ? 'text-orange-600' : ''}`}>
                      {chemical.expiryDate}
                    </TableCell>
                    <TableCell>{chemical.storageLocation}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {isLowStock(chemical) && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Low Stock
                          </span>
                        )}
                        {isNearExpiry(chemical) && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Near Expiry
                          </span>
                        )}
                        {!isLowStock(chemical) && !isNearExpiry(chemical) && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            Good
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Summary */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        Showing {sortedChemicals.length} of {chemicals.length} chemicals
      </div>
    </div>
  );
};
