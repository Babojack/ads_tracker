import React, { useState, useEffect } from 'react';

// Types for income and expense entries
interface FinancialEntry {
  category: string;
  amount: string;
  purpose: string;
}

interface BudgetData {
  incomes: FinancialEntry[];
  expenses: FinancialEntry[];
}

const DB_NAME = 'householdBudgetDB';
const DB_VERSION = 1;

// IndexedDB-Hook als Ersatz für localStorage,
// der alle Daten unter dem Key "data" in einem einzigen Object Store speichert.
export function useIndexedDB<T>(storeName: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [data, setData] = useState<T>(initialValue);

  useEffect(() => {
    let db: IDBDatabase;
    console.log(`Opening IndexedDB "${DB_NAME}" for store "${storeName}"...`);

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      db = (event.target as IDBOpenDBRequest).result;
      console.log('onupgradeneeded - creating store if not existing:', storeName);

      // Einfacher Store ohne keyPath – wir speichern alles unter key "data"
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName);
      }
    };

    request.onsuccess = (event) => {
      db = (event.target as IDBOpenDBRequest).result;
      console.log(`IndexedDB opened successfully: ${DB_NAME} / Store: ${storeName}`);

      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const getRequest = store.get('data');

      getRequest.onsuccess = () => {
        if (getRequest.result) {
          console.log('Existing data found:', getRequest.result);
          setData(getRequest.result);
        } else {
          console.log('No existing data, using initialValue...');
          const writeTransaction = db.transaction(storeName, 'readwrite');
          const writeStore = writeTransaction.objectStore(storeName);
          writeStore.put(initialValue, 'data');
        }
      };

      getRequest.onerror = (e) => {
        console.error('Error reading from IndexedDB:', e);
      };
    };

    request.onerror = (event) => {
      console.error(`Error opening IndexedDB "${DB_NAME}":`, (event.target as IDBOpenDBRequest).error);
    };

    return () => {
      if (db) {
        console.log(`Closing DB "${DB_NAME}"...`);
        db.close();
      }
    };
  }, [storeName, initialValue]);

  const setValue = (value: T | ((val: T) => T)) => {
    const newValue = value instanceof Function ? value(data) : value;
    setData(newValue);

    console.log('Saving new data to IndexedDB:', newValue);
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      // Wir speichern das gesamte "data"-Objekt (in deinem Fall "FinancialEntry[]") unter dem Key "data"
      const putRequest = store.put(newValue, 'data');

      putRequest.onsuccess = () => {
        console.log('Data successfully saved to IndexedDB:', newValue);
      };

      putRequest.onerror = (e) => {
        console.error('Error saving to IndexedDB:', e);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    };

    request.onerror = (event) => {
      console.error('Error opening IndexedDB for saving:', (event.target as IDBOpenDBRequest).error);
    };
  };

  return [data, setValue];
}

// Utility functions für Export und Import
export function exportData(data: any, filename: string = 'progress.json') {
  const jsonData = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonData], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

export function importData(callback: (data: any) => void) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target?.result as string);
          callback(importedData);
        } catch (error) {
          console.error('Import error', error);
          alert('Could not import file');
        }
      };
      reader.readAsText(file);
    }
  };
  input.click();
}

const HouseholdBudgetCalculator: React.FC = () => {
  const defaultIncomeCategories = ['Salary Person 1', 'Salary Person 2', 'Side Job', 'Other Income'];
  const defaultExpenseCategories = ['Rent/Mortgage', 'Utilities', 'Groceries', 'Transportation', 'Insurance'];

  // Statt localStorage: useIndexedDB
  const [incomes, setIncomes] = useIndexedDB<FinancialEntry[]>('incomes',
    defaultIncomeCategories.map(category => ({
      category,
      amount: '0',
      purpose: ''
    }))
  );

  const [expenses, setExpenses] = useIndexedDB<FinancialEntry[]>('expenses',
    defaultExpenseCategories.map(category => ({
      category,
      amount: '0',
      purpose: ''
    }))
  );

  const [notification, setNotification] = useState<{ message: string; type: string }>({ message: '', type: '' });

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: '', type: '' }), 3000);
  };

  // Summen berechnen
  const calculateTotals = () => {
    const totalIncome = incomes.reduce((sum, entry) => sum + parseFloat(entry.amount || '0'), 0);
    const totalExpenses = expenses.reduce((sum, entry) => sum + parseFloat(entry.amount || '0'), 0);
    const balance = totalIncome - totalExpenses;
    return { totalIncome, totalExpenses, balance };
  };

  const addIncomeRow = () => {
    setIncomes([...incomes, { category: 'New Income', amount: '0', purpose: '' }]);
  };

  const addExpenseRow = () => {
    setExpenses([...expenses, { category: 'New Expense', amount: '0', purpose: '' }]);
  };

  const deleteIncomeRow = (index: number) => {
    const newIncomes = [...incomes];
    newIncomes.splice(index, 1);
    setIncomes(newIncomes);
  };

  const deleteExpenseRow = (index: number) => {
    const newExpenses = [...expenses];
    newExpenses.splice(index, 1);
    setExpenses(newExpenses);
  };

  const updateIncomeEntry = (index: number, field: keyof FinancialEntry, value: string) => {
    const newIncomes = [...incomes];
    newIncomes[index][field] = value;
    setIncomes(newIncomes);
  };

  const updateExpenseEntry = (index: number, field: keyof FinancialEntry, value: string) => {
    const newExpenses = [...expenses];
    newExpenses[index][field] = value;
    setExpenses(newExpenses);
  };

  const resetTables = () => {
    const defaultIncomes = defaultIncomeCategories.map(category => ({
      category,
      amount: '0',
      purpose: ''
    }));
    const defaultExpenses = defaultExpenseCategories.map(category => ({
      category,
      amount: '0',
      purpose: ''
    }));
    setIncomes(defaultIncomes);
    setExpenses(defaultExpenses);
    showNotification('Data reset.', 'success');
  };

  const { totalIncome, totalExpenses, balance } = calculateTotals();

  // Export- und Import-Funktionen
  const handleExport = () => {
    const data: BudgetData = { incomes, expenses };
    exportData(data, 'household_budget.json');
  };

  const handleImport = () => {
    importData((importedData: BudgetData) => {
      if (importedData.incomes && importedData.expenses) {
        setIncomes(importedData.incomes);
        setExpenses(importedData.expenses);
        showNotification('Data imported successfully.', 'success');
      } else {
        showNotification('Invalid data format.', 'error');
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 bg-gray-900">
      <h1 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Household Budget Calculator</h1>

      {notification.message && (
        <div
          className={`p-3 sm:p-4 rounded mb-4 ${
            notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {notification.message}
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-end mb-4 sm:mb-6 space-y-2 sm:space-y-0 sm:space-x-2">
        <button
          onClick={() => {
            if (window.confirm('Are you sure you want to reset all data?')) {
              resetTables();
            }
          }}
          className="bg-gray-500 text-white px-3 py-2 sm:px-4 sm:py-2 rounded hover:bg-gray-600 text-sm sm:text-base"
        >
          Reset
        </button>
        <button
          onClick={handleExport}
          className="bg-blue-500 text-white px-3 py-2 sm:px-4 sm:py-2 rounded hover:bg-blue-600 text-sm sm:text-base"
        >
          Export
        </button>
        <button
          onClick={handleImport}
          className="bg-blue-500 text-white px-3 py-2 sm:px-4 sm:py-2 rounded hover:bg-blue-600 text-sm sm:text-base"
        >
          Import
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Incomes */}
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-4">Income</h2>
          <div className="bg-gray-800 rounded-lg p-3 sm:p-4">
            {incomes.map((entry, index) => (
              <div
                key={index}
                className="mb-2 sm:mb-4 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2"
              >
                <input
                  type="text"
                  value={entry.category}
                  onChange={(e) => updateIncomeEntry(index, 'category', e.target.value)}
                  className="w-full sm:w-1/3 p-2 bg-gray-700 text-white rounded text-sm"
                  placeholder="Category"
                />
                <input
                  type="number"
                  step="0.01"
                  value={entry.amount}
                  onChange={(e) => updateIncomeEntry(index, 'amount', e.target.value)}
                  className="w-full sm:w-1/3 p-2 bg-gray-700 text-white rounded text-sm"
                  placeholder="Amount"
                />
                <input
                  type="text"
                  value={entry.purpose}
                  onChange={(e) => updateIncomeEntry(index, 'purpose', e.target.value)}
                  className="w-full sm:w-1/3 p-2 bg-gray-700 text-white rounded text-sm"
                  placeholder="Purpose"
                />
                <button
                  onClick={() => deleteIncomeRow(index)}
                  className="bg-red-500 text-white px-3 py-2 rounded self-start"
                >
                  X
                </button>
              </div>
            ))}
            <button
              onClick={addIncomeRow}
              className="bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600 text-sm"
            >
              + Add Income
            </button>
          </div>
        </div>

        {/* Expenses */}
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-4">Expenses</h2>
          <div className="bg-gray-800 rounded-lg p-3 sm:p-4">
            {expenses.map((entry, index) => (
              <div
                key={index}
                className="mb-2 sm:mb-4 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2"
              >
                <input
                  type="text"
                  value={entry.category}
                  onChange={(e) => updateExpenseEntry(index, 'category', e.target.value)}
                  className="w-full sm:w-1/3 p-2 bg-gray-700 text-white rounded text-sm"
                  placeholder="Category"
                />
                <input
                  type="number"
                  step="0.01"
                  value={entry.amount}
                  onChange={(e) => updateExpenseEntry(index, 'amount', e.target.value)}
                  className="w-full sm:w-1/3 p-2 bg-gray-700 text-white rounded text-sm"
                  placeholder="Amount"
                />
                <input
                  type="text"
                  value={entry.purpose}
                  onChange={(e) => updateExpenseEntry(index, 'purpose', e.target.value)}
                  className="w-full sm:w-1/3 p-2 bg-gray-700 text-white rounded text-sm"
                  placeholder="Purpose"
                />
                <button
                  onClick={() => deleteExpenseRow(index)}
                  className="bg-red-500 text-white px-3 py-2 rounded self-start"
                >
                  X
                </button>
              </div>
            ))}
            <button
              onClick={addExpenseRow}
              className="bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600 text-sm"
            >
              + Add Expense
            </button>
          </div>
        </div>
      </div>

      {/* Zusammenfassung */}
      <div className="mt-4 sm:mt-6 bg-gray-800 rounded-lg p-3 sm:p-4">
        <h2 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-4">Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-white">
          <div className="bg-gray-700 p-3 sm:p-4 rounded">
            <h3 className="text-base sm:text-lg font-semibold">Total Income</h3>
            <p className="text-xl sm:text-2xl font-bold text-green-400">
              {totalIncome.toFixed(2)} $
            </p>
          </div>
          <div className="bg-gray-700 p-3 sm:p-4 rounded">
            <h3 className="text-base sm:text-lg font-semibold">Total Expenses</h3>
            <p className="text-xl sm:text-2xl font-bold text-red-400">
              {totalExpenses.toFixed(2)} $
            </p>
          </div>
          <div className="bg-gray-700 p-3 sm:p-4 rounded">
            <h3 className="text-base sm:text-lg font-semibold">Balance</h3>
            <p
              className={`text-xl sm:text-2xl font-bold ${
                balance > 0 ? 'text-green-400' : balance < 0 ? 'text-red-400' : 'text-white'
              }`}
            >
              {balance.toFixed(2)} $
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HouseholdBudgetCalculator;
