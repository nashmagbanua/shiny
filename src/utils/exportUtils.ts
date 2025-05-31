
import { Chemical, ChemicalUsage } from '@/types/chemical';

export class ExportUtils {
  static exportToExcel(chemicals: Chemical[], usageHistory: ChemicalUsage[]) {
    // Create CSV content for chemicals
    const chemicalHeaders = [
      'Chemical Name',
      'Current Balance',
      'Unit',
      'Original Quantity',
      'Supplier',
      'Date Received',
      'Expiry Date',
      'Storage Location',
      'Remarks'
    ];

    const chemicalRows = chemicals.map(chemical => [
      chemical.name,
      chemical.currentBalance.toString(),
      chemical.unit,
      chemical.quantity.toString(),
      chemical.supplier,
      chemical.dateReceived,
      chemical.expiryDate,
      chemical.storageLocation,
      chemical.remarks || ''
    ]);

    // Create CSV content for usage history
    const usageHeaders = [
      'Chemical Name',
      'Quantity Used',
      'Date Used',
      'Person In Charge',
      'Remarks'
    ];

    const usageRows = usageHistory.map(usage => [
      usage.chemicalName,
      usage.quantityUsed.toString(),
      usage.dateUsed,
      usage.personInCharge,
      usage.remarks || ''
    ]);

    // Convert to CSV format
    const chemicalCSV = [
      chemicalHeaders.join(','),
      ...chemicalRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const usageCSV = [
      usageHeaders.join(','),
      ...usageRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Combine both sections
    const fullCSV = [
      'CHEMICAL INVENTORY REPORT',
      `Generated on: ${new Date().toLocaleString()}`,
      '',
      'CURRENT INVENTORY:',
      chemicalCSV,
      '',
      'USAGE HISTORY:',
      usageCSV
    ].join('\n');

    // Create and download file
    const blob = new Blob([fullCSV], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `chemical_inventory_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  static printReport(chemicals: Chemical[]) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Chemical Inventory Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .low-stock { color: #d32f2f; font-weight: bold; }
            .near-expiry { color: #f57c00; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Chemical Inventory Report</h1>
          <p>Generated on: ${new Date().toLocaleString()}</p>
          <table>
            <thead>
              <tr>
                <th>Chemical Name</th>
                <th>Current Balance</th>
                <th>Unit</th>
                <th>Supplier</th>
                <th>Expiry Date</th>
                <th>Storage Location</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${chemicals.map(chemical => {
                const isLowStock = chemical.currentBalance <= chemical.quantity * 0.1;
                const isNearExpiry = new Date(chemical.expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                return `
                  <tr>
                    <td>${chemical.name}</td>
                    <td class="${isLowStock ? 'low-stock' : ''}">${chemical.currentBalance.toFixed(2)}</td>
                    <td>${chemical.unit}</td>
                    <td>${chemical.supplier}</td>
                    <td class="${isNearExpiry ? 'near-expiry' : ''}">${chemical.expiryDate}</td>
                    <td>${chemical.storageLocation}</td>
                    <td>
                      ${isLowStock ? 'Low Stock' : ''}
                      ${isNearExpiry ? 'Near Expiry' : ''}
                      ${!isLowStock && !isNearExpiry ? 'Good' : ''}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  }
}
