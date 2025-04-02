import React, { useState, useEffect } from 'react';

// --------------------------------------------------------
//    1. Typen und Interfaces
// --------------------------------------------------------
interface FinancialEntry {
  category: string;
  amount: string;
  purpose: string;
}

interface BudgetData {
  incomes: FinancialEntry[];
  expenses: FinancialEntry[];
}

// --------------------------------------------------------
//    2. Konstanten & Hilfsfunktionen
// --------------------------------------------------------

// DB_NAME und DB_VERSION festlegen
const DB_NAME = 'householdBudgetDB';
const DB_VERSION = 4; // Version nochmals erhöht, um sicherzustellen, dass Store-Struktur neu angelegt wird

// parseGermanFloat: Ersetzt Komma durch Punkt und parst dann
function parseGermanFloat(value: string): number {
  return parseFloat(value.replace(',', '.'));
}

// --------------------------------------------------------
//    3. Initialisieren der IndexedDB
// --------------------------------------------------------
function initDB(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    console.log(`Initializing IndexedDB "${DB_NAME}" with version ${DB_VERSION}`);
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      console.log('DB upgrade needed, creating stores...');

      // Lösche existierende Stores, falls sie vorhanden sind
      if (db.objectStoreNames.contains('incomes')) {
        db.deleteObjectStore('incomes');
      }
      if (db.objectStoreNames.contains('expenses')) {
        db.deleteObjectStore('expenses');
      }

      // Erstelle neue Stores
      db.createObjectStore('incomes');
      db.createObjectStore('expenses');

      console.log('Stores successfully created');
    };

    request.onsuccess = () => {
      console.log('IndexedDB initialized successfully');
      resolve(true);
    };

    request.onerror = (event) => {
      console.error('Error initializing IndexedDB:', (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

// --------------------------------------------------------
//    4. useIndexedDB Hook (überarbeitet)
// --------------------------------------------------------
export function useIndexedDB<T>(
  storeName: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  const [data, setData] = useState<T>(initialValue);
  const [isInitialized, setIsInitialized] = useState(false);

  // Laden der Daten aus IndexedDB
  const loadData = () => {
    console.log(`Loading data from store "${storeName}"...`);

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const getRequest = store.get('data');

      getRequest.onsuccess = () => {
        if (getRequest.result) {
          console.log(`[${storeName}] Data loaded:`, getRequest.result);
          setData(getRequest.result);
        } else {
          console.log(`[${storeName}] No data found, using initialValue`);
          saveData(initialValue);
        }
        setIsInitialized(true);
      };

      getRequest.onerror = (e) => {
        console.error(`[${storeName}] Error loading data:`, e);
        setIsInitialized(true);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    };

    request.onerror = (event) => {
      console.error(`Error opening DB for reading:`, (event.target as IDBOpenDBRequest).error);
      setIsInitialized(true);
    };
  };

  // Speichern der Daten in IndexedDB
  const saveData = (valueToSave: T) => {
    console.log(`[${storeName}] Saving data:`, valueToSave);

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      const putRequest = store.put(valueToSave, 'data');

      putRequest.onsuccess = () => {
        console.log(`[${storeName}] Data successfully saved`);
      };

      putRequest.onerror = (e) => {
        console.error(`[${storeName}] Error saving data:`, e);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    };

    request.onerror = (event) => {
      console.error(`Error opening DB for writing:`, (event.target as IDBOpenDBRequest).error);
    };
  };

  // Initialisierung und Laden beim ersten Rendern
  useEffect(() => {
    // Initialisiere DB und lade anschließend die Daten
    initDB()
      .then(() => loadData())
      .catch(error => console.error('Failed to initialize DB:', error));
  }, [storeName]); // Abhängigkeit nur vom storeName

  // Funktion zum Aktualisieren des Zustands und Speichern in IndexedDB
  const setValue = (value: T | ((val: T) => T)) => {
    const newValue = value instanceof Function ? value(data) : value;
    setData(newValue);
    saveData(newValue);
  };

  return [data, setValue];
}

// --------------------------------------------------------
//    5. Export- / Import-Funktionen
// --------------------------------------------------------
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

// --------------------------------------------------------
//    6. Hauptkomponente
// --------------------------------------------------------
const HouseholdBudgetCalculator: React.FC = () => {
  // Default-Kategorien
  const defaultIncomeCategories = [
    'Salary Person 1',
    'Salary Person 2',
    'Side Job',
    'Other Income',
  ];
  const defaultExpenseCategories = [
    'Rent/Mortgage',
    'Utilities',
    'Groceries',
    'Transportation',
    'Insurance',
  ];

  // Initialer Zustand für Income und Expenses
  const initialIncomes = defaultIncomeCategories.map((category) => ({
    category,
    amount: '0',
    purpose: '',
  }));

  const initialExpenses = defaultExpenseCategories.map((category) => ({
    category,
    amount: '0',
    purpose: '',
  }));

  // State kommt aus unseren useIndexedDB Hooks
  const [incomes, setIncomes] = useIndexedDB<FinancialEntry[]>('incomes', initialIncomes);
  const [expenses, setExpenses] = useIndexedDB<FinancialEntry[]>('expenses', initialExpenses);

  // Notification-System
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
  }>({ message: '', type: 'success' });

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: '', type: 'success' }), 3000);
  };

  // Summen berechnen
  const calculateTotals = () => {
    const totalIncome = incomes.reduce(
      (sum, entry) => sum + parseGermanFloat(entry.amount || '0'),
      0
    );
    const totalExpenses = expenses.reduce(
      (sum, entry) => sum + parseGermanFloat(entry.amount || '0'),
      0
    );
    const balance = totalIncome - totalExpenses;
    return { totalIncome, totalExpenses, balance };
  };

  // Debug-Log: Was ist gerade in incomes / expenses drin?
  useEffect(() => {
    console.log('Current incomes:', incomes);
    console.log('Current expenses:', expenses);
  }, [incomes, expenses]);

  // Neue Zeile hinzufügen
  const addIncomeRow = () => {
    const newIncomes = [...incomes, { category: 'New Income', amount: '0', purpose: '' }];
    setIncomes(newIncomes);
  };

  const addExpenseRow = () => {
    const newExpenses = [...expenses, { category: 'New Expense', amount: '0', purpose: '' }];
    setExpenses(newExpenses);
  };

  // Zeile löschen
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

  // Eingaben updaten
  const updateIncomeEntry = (index: number, field: keyof FinancialEntry, value: string) => {
    const newIncomes = [...incomes];
    newIncomes[index] = { ...newIncomes[index], [field]: value };
    console.log('[Incomes] Updating to:', newIncomes);
    setIncomes(newIncomes);
  };

  const updateExpenseEntry = (index: number, field: keyof FinancialEntry, value: string) => {
    const newExpenses = [...expenses];
    newExpenses[index] = { ...newExpenses[index], [field]: value };
    console.log('[Expenses] Updating to:', newExpenses);
    setExpenses(newExpenses);
  };

  // Auf Default zurücksetzen
  const resetTables = () => {
    setIncomes(initialIncomes);
    setExpenses(initialExpenses);
    showNotification('Data reset.', 'success');
  };

  // Export / Import
  const handleExport = () => {
    const data: BudgetData = { incomes, expenses };
    exportData(data, 'household_budget.json');
    showNotification('Data exported successfully.', 'success');
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

  // Werte ausrechnen
  const { totalIncome, totalExpenses, balance } = calculateTotals();

  // --------------------------------------------------------
  //    RENDER
  // --------------------------------------------------------
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 bg-gray-900">
      <h1 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">
        Household Budget Calculator
      </h1>

      {/* Notifications */}
      {notification.message && (
        <div
          className={`p-3 sm:p-4 rounded mb-4 ${
            notification.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Button-Leiste */}
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

      {/* Incomes / Expenses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Incomes */}
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-4">
            Income
          </h2>
          <div className="bg-gray-800 rounded-lg p-3 sm:p-4">
            {incomes.map((entry, index) => (
              <div
                key={`income-${index}`}
                className="mb-2 sm:mb-4 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2"
              >
                <input
                  type="text"
                  value={entry.category}
                  onChange={(e) =>
                    updateIncomeEntry(index, 'category', e.target.value)
                  }
                  className="w-full sm:w-1/3 p-2 bg-gray-700 text-white rounded text-sm"
                  placeholder="Category"
                />
                <input
                  type="text"
                  value={entry.amount}
                  onChange={(e) =>
                    updateIncomeEntry(index, 'amount', e.target.value)
                  }
                  className="w-full sm:w-1/3 p-2 bg-gray-700 text-white rounded text-sm"
                  placeholder="Amount"
                />
                <input
                  type="text"
                  value={entry.purpose}
                  onChange={(e) =>
                    updateIncomeEntry(index, 'purpose', e.target.value)
                  }
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
          <h2 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-4">
            Expenses
          </h2>
          <div className="bg-gray-800 rounded-lg p-3 sm:p-4">
            {expenses.map((entry, index) => (
              <div
                key={`expense-${index}`}
                className="mb-2 sm:mb-4 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2"
              >
                <input
                  type="text"
                  value={entry.category}
                  onChange={(e) =>
                    updateExpenseEntry(index, 'category', e.target.value)
                  }
                  className="w-full sm:w-1/3 p-2 bg-gray-700 text-white rounded text-sm"
                  placeholder="Category"
                />
                <input
                  type="text"
                  value={entry.amount}
                  onChange={(e) =>
                    updateExpenseEntry(index, 'amount', e.target.value)
                  }
                  className="w-full sm:w-1/3 p-2 bg-gray-700 text-white rounded text-sm"
                  placeholder="Amount"
                />
                <input
                  type="text"
                  value={entry.purpose}
                  onChange={(e) =>
                    updateExpenseEntry(index, 'purpose', e.target.value)
                  }
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
        <h2 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-4">
          Summary
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-white">
          <div className="bg-gray-700 p-3 sm:p-4 rounded">
            <h3 className="text-base sm:text-lg font-semibold">Total Income</h3>
            <p className="text-xl sm:text-2xl font-bold">
              {totalIncome.toFixed(2)} $
            </p>
          </div>
          <div className="bg-gray-700 p-3 sm:p-4 rounded">
            <h3 className="text-base sm:text-lg font-semibold">Total Expenses</h3>
            <p className="text-xl sm:text-2xl font-bold">
              {totalExpenses.toFixed(2)} $
            </p>
          </div>
          <div className="bg-gray-700 p-3 sm:p-4 rounded">
            <h3 className="text-base sm:text-lg font-semibold">Balance</h3>
            <p
              className={`text-xl sm:text-2xl font-bold ${
                balance > 0
                  ? 'text-green-400'
                  : balance < 0
                  ? 'text-red-400'
                  : 'text-white'
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
