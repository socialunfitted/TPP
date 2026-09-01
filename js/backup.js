// ============================================================
// BACKUP SERVICE — Export & Import all data
// ============================================================

const BackupService = {
  async exportBackup() {
    try {
      const [bills, customers, products, expenses, settings] = await Promise.all([
        BillsDB.getAll(),
        CustomersDB.getAll(),
        ProductsDB.getAll(),
        ExpensesDB.getAll(),
        SettingsDB.getAll()
      ]);

      const backup = {
        version: 1,
        exportedAt: new Date().toISOString(),
        appName: 'Thanjai Paruthi Paal POS',
        data: { bills, customers, products, expenses, settings }
      };

      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const today = new Date().toISOString().slice(0, 10);
      const a = document.createElement('a');
      a.href = url;
      a.download = `thanjai-paruthi-paal-backup-${today}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('Backup exported successfully!', 'success');
    } catch (err) {
      console.error('Backup export error:', err);
      showToast('Failed to export backup. Please try again.', 'error');
    }
  },

  importBackup(file) {
    return new Promise((resolve, reject) => {
      if (!file || !file.name.endsWith('.json')) {
        showToast('Please select a valid JSON backup file.', 'error');
        reject(new Error('Invalid file'));
        return;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const backup = JSON.parse(e.target.result);
          if (!backup.data || !backup.version) {
            throw new Error('Invalid backup file format');
          }

          showConfirm(
            'Import Backup',
            'This will overwrite ALL existing data including bills, customers, products, expenses, and settings. This action cannot be undone. Continue?',
            async () => {
              try {
                await this.performImport(backup.data);
                showToast('Backup imported successfully! Refreshing...', 'success');
                setTimeout(() => window.location.reload(), 1500);
                resolve(true);
              } catch (err) {
                showToast('Import failed: ' + err.message, 'error');
                reject(err);
              }
            },
            () => reject(new Error('Cancelled')),
            'Yes, Import & Overwrite',
            'btn-danger'
          );
        } catch (err) {
          showToast('Invalid backup file: ' + err.message, 'error');
          reject(err);
        }
      };
      reader.readAsText(file);
    });
  },

  async performImport(data) {
    // Clear all stores
    await dbClear('bills');
    await dbClear('customers');
    await dbClear('products');
    await dbClear('expenses');
    await dbClear('settings');

    // Import bills
    if (data.bills) {
      for (const bill of data.bills) {
        await dbAdd('bills', bill);
      }
    }

    // Import customers
    if (data.customers) {
      for (const customer of data.customers) {
        await dbAdd('customers', customer);
      }
    }

    // Import products
    if (data.products) {
      for (const product of data.products) {
        await dbAdd('products', product);
      }
    }

    // Import expenses
    if (data.expenses) {
      for (const expense of data.expenses) {
        await dbAdd('expenses', expense);
      }
    }

    // Import settings
    if (data.settings) {
      for (const [key, value] of Object.entries(data.settings)) {
        await SettingsDB.set(key, value);
      }
    }
  },

  async exportCSV(bills) {
    const headers = ['Bill No', 'Date', 'Time', 'Customer', 'Mobile', 'Items', 'Subtotal', 'Discount', 'Grand Total', 'Payment', 'Status'];
    const rows = bills.map(b => [
      b.billNumber,
      b.date,
      b.time,
      b.customerName || 'Walk-in',
      b.customerMobile || '',
      (b.items || []).map(i => `${i.name}×${i.qty}`).join('; '),
      b.subtotal,
      b.discount,
      b.grandTotal,
      b.paymentMethod,
      b.paymentStatus
    ]);

    const csv = [headers, ...rows].map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const today = new Date().toISOString().slice(0, 10);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TPP-Sales-${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('CSV exported!', 'success');
  }
};
