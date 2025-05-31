
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Chemical } from '@/types/chemical';

const chemicalSchema = z.object({
  dateReceived: z.string().min(1, 'Date received is required'),
  name: z.string().min(1, 'Chemical name is required'),
  quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
  unit: z.enum(['Liters', 'Kilograms']),
  supplier: z.string().min(1, 'Supplier is required'),
  expiryDate: z.string().min(1, 'Expiry date is required'),
  storageLocation: z.string().min(1, 'Storage location is required'),
  remarks: z.string().optional(),
});

type ChemicalFormData = z.infer<typeof chemicalSchema>;

interface AddChemicalFormProps {
  onSubmit: (chemical: Omit<Chemical, 'id' | 'currentBalance'>) => void;
  onCancel: () => void;
}

export const AddChemicalForm: React.FC<AddChemicalFormProps> = ({ onSubmit, onCancel }) => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ChemicalFormData>({
    resolver: zodResolver(chemicalSchema),
    defaultValues: {
      dateReceived: new Date().toISOString().split('T')[0],
      unit: 'Liters',
    },
  });

  const selectedUnit = watch('unit');

  const onFormSubmit = (data: ChemicalFormData) => {
    onSubmit(data);
    reset();
    onCancel();
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dateReceived">Date Received *</Label>
          <Input
            id="dateReceived"
            type="date"
            {...register('dateReceived')}
            className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
          />
          {errors.dateReceived && (
            <p className="text-sm text-red-500">{errors.dateReceived.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Chemical Name *</Label>
          <Input
            id="name"
            {...register('name')}
            placeholder="Enter chemical name"
            className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity *</Label>
          <Input
            id="quantity"
            type="number"
            step="0.01"
            {...register('quantity', { valueAsNumber: true })}
            placeholder="0.00"
            className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
          />
          {errors.quantity && (
            <p className="text-sm text-red-500">{errors.quantity.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="unit">Unit *</Label>
          <Select value={selectedUnit} onValueChange={(value) => setValue('unit', value as 'Liters' | 'Kilograms')}>
            <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-blue-500">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Liters">Liters</SelectItem>
              <SelectItem value="Kilograms">Kilograms</SelectItem>
            </SelectContent>
          </Select>
          {errors.unit && (
            <p className="text-sm text-red-500">{errors.unit.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="supplier">Supplier *</Label>
          <Input
            id="supplier"
            {...register('supplier')}
            placeholder="Enter supplier name"
            className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
          />
          {errors.supplier && (
            <p className="text-sm text-red-500">{errors.supplier.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="expiryDate">Expiry Date *</Label>
          <Input
            id="expiryDate"
            type="date"
            {...register('expiryDate')}
            className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
          />
          {errors.expiryDate && (
            <p className="text-sm text-red-500">{errors.expiryDate.message}</p>
          )}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="storageLocation">Storage Location *</Label>
          <Input
            id="storageLocation"
            {...register('storageLocation')}
            placeholder="Enter storage location"
            className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
          />
          {errors.storageLocation && (
            <p className="text-sm text-red-500">{errors.storageLocation.message}</p>
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
          disabled={isSubmitting}
          className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 transition-all duration-200"
        >
          {isSubmitting ? 'Adding...' : 'Add Chemical'}
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
