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

const HouseholdBudgetCalculator: React.FC = () => {
  const [incomes, setIncomes] = useState<FinancialEntry[]>([]);
  const [expenses, setExpenses] = useState<FinancialEntry[]>([]);
  const [notification, setNotification] = useState<{ message: string; type: string }>({ message: '', type: '' });

  // Initial default entries
  const defaultIncomeCategories = ['Gehalt Person 1', 'Gehalt Person 2', 'Nebenjob', 'Sonstige Einnahmen'];
  const defaultExpenseCategories = ['Miete/Hypothek', 'Nebenkosten', 'Lebensmittel', 'Transport', 'Versicherungen'];

  useEffect(() => {
    resetTables();
  }, []);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: '', type: '' }), 3000);
  };

  const calculateTotals = () => {
    const totalIncome = incomes.reduce((sum, entry) => sum + parseFloat(entry.amount || '0'), 0);
    const totalExpenses = expenses.reduce((sum, entry) => sum + parseFloat(entry.amount || '0'), 0);
    const balance = totalIncome - totalExpenses;

    return { totalIncome, totalExpenses, balance };
  };

  const addIncomeRow = () => {
    setIncomes([...incomes, { category: 'Neue Einnahme', amount: '0', purpose: '' }]);
  };

  const addExpenseRow = () => {
    setExpenses([...expenses, { category: 'Neue Ausgabe', amount: '0', purpose: '' }]);
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

  const saveData = () => {
    try {
      const data: BudgetData = { incomes, expenses };
      localStorage.setItem('haushaltsrechner', JSON.stringify(data));
      showNotification('Daten wurden erfolgreich gespeichert!', 'success');
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      showNotification('Fehler beim Speichern der Daten.', 'error');
    }
  };

  const loadData = () => {
    try {
      const jsonData = localStorage.getItem('haushaltsrechner');
      if (!jsonData) {
        showNotification('Keine gespeicherten Daten gefunden.', 'error');
        resetTables();
        return;
      }

      const data: BudgetData = JSON.parse(jsonData);
      setIncomes(data.incomes);
      setExpenses(data.expenses);
      showNotification('Daten wurden erfolgreich geladen!', 'success');
    } catch (error) {
      console.error('Fehler beim Laden:', error);
      showNotification('Fehler beim Laden der Daten.', 'error');
    }
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
  };

  const { totalIncome, totalExpenses, balance } = calculateTotals();

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-100">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Haushalts-Ein- und Ausgabenrechner für Familien</h1>

      {notification.message && (
        <div className={`p-4 rounded mb-4 ${
          notification.type === 'success'
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        }`}>
          {notification.message}
        </div>
      )}

      <div className="flex justify-between mb-6">
        <div>
          <button
            onClick={saveData}
            className="bg-blue-500 text-white px-4 py-2 rounded mr-2 hover:bg-blue-600"
          >
            Daten speichern
          </button>
          <button
            onClick={loadData}
            className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
          >
            Daten laden
          </button>
        </div>
        <button
          onClick={() => {
            if (window.confirm('Möchten Sie wirklich alle Daten zurücksetzen?')) {
              resetTables();
              showNotification('Daten wurden zurückgesetzt.', 'success');
            }
          }}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          Zurücksetzen
        </button>
      </div>

      <FinancialTable
        title="Einnahmen"
        entries={incomes}
        onAddRow={addIncomeRow}
        onDeleteRow={deleteIncomeRow}
        onUpdateEntry={updateIncomeEntry}
        total={totalIncome}
      />

      <FinancialTable
        title="Ausgaben"
        entries={expenses}
        onAddRow={addExpenseRow}
        onDeleteRow={deleteExpenseRow}
        onUpdateEntry={updateExpenseEntry}
        total={totalExpenses}
      />

      <div className="bg-white p-6 rounded shadow mt-6">
        <h2 className="text-xl font-bold mb-4">Zusammenfassung</h2>
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left bg-gray-800 text-white p-2">Beschreibung</th>
              <th className="text-right bg-gray-800 text-white p-2">Betrag (€)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-2">Summe Einnahmen</td>
              <td className="p-2 text-right">{totalIncome.toFixed(2)} €</td>
            </tr>
            <tr>
              <td className="p-2">Summe Ausgaben</td>
              <td className="p-2 text-right">{totalExpenses.toFixed(2)} €</td>
            </tr>
            <tr className="font-bold bg-gray-100">
              <td className="p-2">Bilanz (Einnahmen - Ausgaben)</td>
              <td className={`p-2 text-right ${
                balance > 0 ? 'text-green-600' :
                balance < 0 ? 'text-red-600' : ''
              }`}>
                {balance.toFixed(2)} €
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

interface FinancialTableProps {
  title: string;
  entries: FinancialEntry[];
  total: number;
  onAddRow: () => void;
  onDeleteRow: (index: number) => void;
  onUpdateEntry: (index: number, field: keyof FinancialEntry, value: string) => void;
}

const FinancialTable: React.FC<FinancialTableProps> = ({
  title,
  entries,
  total,
  onAddRow,
  onDeleteRow,
  onUpdateEntry
}) => {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      <table className="w-full bg-white rounded shadow">
        <thead>
          <tr>
            <th className="p-2 text-left bg-blue-500 text-white">Kategorie</th>
            <th className="p-2 text-left bg-blue-500 text-white">Betrag (€)</th>
            <th className="p-2 text-left bg-blue-500 text-white">Verwendungszweck</th>
            <th className="p-2 text-center bg-blue-500 text-white w-16">Aktion</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => (
            <tr key={index}>
              <td className="p-2">
                <input
                  type="text"
                  value={entry.category}
                  onChange={(e) => onUpdateEntry(index, 'category', e.target.value)}
                  className="w-full p-1 border rounded"
                />
              </td>
              <td className="p-2">
                <input
                  type="number"
                  step="0.01"
                  value={entry.amount}
                  onChange={(e) => onUpdateEntry(index, 'amount', e.target.value)}
                  className="w-full p-1 border rounded"
                />
              </td>
              <td className="p-2">
                <input
                  type="text"
                  value={entry.purpose}
                  onChange={(e) => onUpdateEntry(index, 'purpose', e.target.value)}
                  className="w-full p-1 border rounded"
                  placeholder="Verwendungszweck"
                />
              </td>
              <td className="p-2 text-center">
                <button
                  onClick={() => onDeleteRow(index)}
                  className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                >
                  X
                </button>
              </td>
            </tr>
          ))}
          <tr className="font-bold bg-gray-100">
            <td className="p-2">Summe {title}</td>
            <td className="p-2" colSpan={3}>{total.toFixed(2)} €</td>
          </tr>
        </tbody>
      </table>
      <button
        onClick={onAddRow}
        className="mt-2 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
      >
        + Weitere {title.slice(0, -1)} hinzufügen
      </button>
    </div>
  );
};

export default HouseholdBudgetCalculator;
