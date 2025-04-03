import React, { useState, useEffect } from 'react';
import { X, Download, Upload } from 'lucide-react';
import Note from '../shared/Note';

interface MoodEntry {
  id: number;
  mood: {
    id: number;
    label: string;
    color: string;
    emoji: string;
  };
  timestamp: string;
  notes: {
    id: number;
    text: string;
    timestamp: string;
  }[];
}

const DB_NAME = 'moodTrackerDB';
const DB_VERSION = 1;
const STORE_NAME = 'moodEntries';

const useIndexedDB = <T,>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] => {
  const [data, setData] = useState<T>(initialValue);

  useEffect(() => {
    let db: IDBDatabase;
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(key);

      getRequest.onsuccess = () => {
        if (getRequest.result) {
          setData(getRequest.result.value);
        } else {
          const writeTransaction = db.transaction(STORE_NAME, 'readwrite');
          const writeStore = writeTransaction.objectStore(STORE_NAME);
          writeStore.put({ id: key, value: initialValue });
        }
      };

      getRequest.onerror = (e) => console.error('Error reading from IndexedDB', e);
    };

    request.onerror = (event) => {
      console.error('Error opening IndexedDB', (event.target as IDBOpenDBRequest).error);
    };

    return () => {
      if (db) db.close();
    };
  }, [key, initialValue]);

  const saveData = (valueOrFunction: T | ((val: T) => T)) => {
    const newValue = valueOrFunction instanceof Function ? valueOrFunction(data) : valueOrFunction;
    setData(newValue);

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const putRequest = store.put({ id: key, value: newValue });

      putRequest.onsuccess = () => {
        console.log('Data successfully saved to IndexedDB');
      };

      putRequest.onerror = (e) => {
        console.error('Error saving to IndexedDB', e);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    };

    request.onerror = (event) => {
      console.error('Error opening IndexedDB for saving', (event.target as IDBOpenDBRequest).error);
    };
  };

  return [data, saveData];
};

const exportMoodEntries = (entries: MoodEntry[]) => {
  const jsonData = JSON.stringify(entries, null, 2);
  const blob = new Blob([jsonData], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'mood_entries_backup.json';
  link.click();
};

const importMoodEntries = (setEntries: (entries: MoodEntry[]) => void) => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';

  input.onchange = (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedEntries = JSON.parse(e.target?.result as string) as MoodEntry[];
        setEntries(importedEntries);
      } catch (error) {
        console.error('Error parsing imported file:', error);
        alert('Invalid file format. Please select a valid backup file.');
      }
    };
    reader.readAsText(file);
  };

  input.click();
};

const MoodTracker: React.FC = () => {
  const [entries, setEntries] = useIndexedDB<MoodEntry[]>('moodEntriesData', []);
  const [filter, setFilter] = useState<string>('all');

  const moodLevels = [
    { id: 5, label: 'Excellent', color: 'bg-green-500', emoji: '😃' },
    { id: 4, label: 'Good', color: 'bg-blue-500', emoji: '🙂' },
    { id: 3, label: 'Neutral', color: 'bg-yellow-500', emoji: '😐' },
    { id: 2, label: 'Poor', color: 'bg-orange-500', emoji: '🙁' },
    { id: 1, label: 'Bad', color: 'bg-red-500', emoji: '😞' }
  ];

  const addEntry = (mood: typeof moodLevels[0]) => {
    const newEntries = [
      {
        id: Date.now(),
        mood,
        timestamp: new Date().toISOString(),
        notes: []
      },
      ...entries
    ];
    setEntries(newEntries);
  };

  const addNote = (entryId: number, noteText: string) => {
    if (noteText.trim()) {
      const updatedEntries = entries.map(entry =>
        entry.id === entryId ? {
          ...entry,
          notes: [...(entry.notes || []), {
            id: Date.now(),
            text: noteText.trim(),
            timestamp: new Date().toISOString()
          }]
        } : entry
      );
      setEntries(updatedEntries);
    }
  };

  const filteredEntries = filter === 'all'
    ? entries
    : entries.filter(entry => entry.mood.id === parseInt(filter));

  return (
    <div className="w-full space-y-6 p-4">
      {/* Überschrift und Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold">Mood Tracker</h2>
        <div className="flex items-center space-x-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full sm:w-auto bg-gray-800 p-2 rounded text-sm sm:text-base"
          >
            <option value="all">All Moods</option>
            {moodLevels.map(mood => (
              <option key={mood.id} value={mood.id}>
                {mood.label} Only
              </option>
            ))}
          </select>

          {/* Export/Import Buttons */}
          <div className="flex space-x-2">
            <button
              onClick={() => exportMoodEntries(entries)}
              className="flex items-center space-x-1 p-2 bg-green-500 rounded-lg hover:bg-green-600 transition-colors"
              title="Export Entries"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => importMoodEntries(setEntries)}
              className="flex items-center space-x-1 p-2 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
              title="Import Entries"
            >
              <Upload className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mood-Buttons */}
      <div className="flex flex-wrap sm:flex-nowrap justify-center gap-2 sm:gap-4">
        {moodLevels.map(mood => (
          <button
            key={mood.id}
            onClick={() => addEntry(mood)}
            className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full transition-all
              hover:opacity-80 ${mood.color} flex items-center justify-center
              text-xl sm:text-2xl shadow-lg hover:scale-110
              active:scale-95 transform duration-150`}
            title={mood.label}
          >
            {mood.emoji}
          </button>
        ))}
      </div>

      {/* Mood-Einträge */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredEntries.map(entry => (
          <div
            key={entry.id}
            className={`p-3 sm:p-4 rounded-lg ${entry.mood.color} bg-opacity-20
              backdrop-blur-sm transition-all duration-300 hover:bg-opacity-25`}
          >
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-xl sm:text-2xl">{entry.mood.emoji}</span>
                <span className="font-medium text-sm sm:text-base">{entry.mood.label}</span>
              </div>
              <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-2">
                <span className="text-xs sm:text-sm text-gray-300">
                  {new Date(entry.timestamp).toLocaleString()}
                </span>
                <button
                  onClick={() => {
                    if(window.confirm("Möchtest du diesen Eintrag wirklich löschen?")){
                      setEntries(entries.filter(e => e.id !== entry.id));
                    }
                  }}
                  className="p-1 hover:bg-gray-600 rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Eingabe für Notizen */}
            <input
              type="text"
              placeholder="Add a note and press Enter..."
              className="w-full bg-gray-800 rounded p-2 mt-2 text-sm sm:text-base
                placeholder:text-gray-500 focus:outline-none focus:ring-2
                focus:ring-blue-500 transition-all"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                  addNote(entry.id, (e.target as HTMLInputElement).value);
                  (e.target as HTMLInputElement).value = '';
                }
              }}
            />

            {/* Liste der Notizen */}
            <div className="space-y-2 mt-2">
              {entry.notes && entry.notes.map(note => (
                <Note
                  key={note.id}
                  note={note}
                  onDelete={() => setEntries(entries.map(e => ({
                    ...e,
                    notes: e.id === entry.id
                      ? e.notes.filter(n => n.id !== note.id)
                      : e.notes
                  })))}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Hinweis, falls keine Einträge vorhanden sind */}
      {filteredEntries.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <p className="text-lg">No mood entries yet.</p>
          <p className="text-sm mt-2">Click on any mood button above to start tracking!</p>
        </div>
      )}
    </div>
  );
};

export default MoodTracker;
