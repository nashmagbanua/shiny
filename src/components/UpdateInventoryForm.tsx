
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Chemical, ChemicalUsage } from '@/types/chemical';

const usageSchema = z.object({
  chemicalId: z.string().min(1, 'Please select a chemical'),
  quantityUsed: z.number().min(0.01, 'Quantity must be greater than 0'),
  dateUsed: z.string().min(1, 'Date used is required'),
  personInCharge: z.string().min(1, 'Person in charge is required'),
  remarks: z.string().optional(),
});

type UsageFormData = z.infer<typeof usageSchema>;

interface UpdateInventoryFormProps {
  chemicals: Chemical[];
  onSubmit: (usage: Omit<ChemicalUsage, 'id'>) => void;
  onCancel: () => void;
}

export const UpdateInventoryForm: React.FC<UpdateInventoryFormProps> = ({ 
  chemicals, 
  onSubmit, 
  onCancel 
}) => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<UsageFormData>({
    resolver: zodResolver(usageSchema),
    defaultValues: {
      dateUsed: new Date().toISOString().split('T')[0],
    },
  });

  const selectedChemicalId = watch('chemicalId');
  const selectedChemical = chemicals.find(c => c.id === selectedChemicalId);

  const onFormSubmit = (data: UsageFormData) => {
    const chemicalName = chemicals.find(c => c.id === data.chemicalId)?.name || '';
    onSubmit({
      ...data,
      chemicalName,
    });
    reset();
    onCancel();
  };

  const availableChemicals = chemicals.filter(c => c.currentBalance > 0);

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="chemicalId">Chemical *</Label>
          <Select value={selectedChemicalId} onValueChange={(value) => setValue('chemicalId', value)}>
            <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-blue-500">
              <SelectValue placeholder="Select a chemical" />
            </SelectTrigger>
            <SelectContent>
              {availableChemicals.map((chemical) => (
                <SelectItem key={chemical.id} value={chemical.id}>
                  {chemical.name} (Available: {chemical.currentBalance} {chemical.unit})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.chemicalId && (
            <p className="text-sm text-red-500">{errors.chemicalId.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="quantityUsed">
            Quantity Used * {selectedChemical && `(${selectedChemical.unit})`}
          </Label>
          <Input
            id="quantityUsed"
            type="number"
            step="0.01"
            {...register('quantityUsed', { valueAsNumber: true })}
            placeholder="0.00"
            max={selectedChemical?.currentBalance}
            className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
          />
          {errors.quantityUsed && (
            <p className="text-sm text-red-500">{errors.quantityUsed.message}</p>
          )}
          {selectedChemical && (
            <p className="text-xs text-gray-500">
              Available: {selectedChemical.currentBalance} {selectedChemical.unit}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="dateUsed">Date Used *</Label>
          <Input
            id="dateUsed"
            type="date"
            {...register('dateUsed')}
            className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
          />
          {errors.dateUsed && (
            <p className="text-sm text-red-500">{errors.dateUsed.message}</p>
          )}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="personInCharge">Person In Charge *</Label>
          <Input
            id="personInCharge"
            {...register('personInCharge')}
            placeholder="Enter person's name"
            className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
          />
          {errors.personInCharge && (
            <p className="text-sm text-red-500">{errors.personInCharge.message}</p>
          )}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="remarks">Remarks</Label>
          <Textarea
            id="remarks"
            {...register('remarks')}
            placeholder="Additional notes (optional)"
            className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          type="submit"
          disabled={isSubmitting || !selectedChemical}
          className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 transition-all duration-200"
        >
          {isSubmitting ? 'Updating...' : 'Update Inventory'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
};
