import { useState, useEffect } from 'react';

const DB_NAME = 'projectTrackerDB';
const DB_VERSION = 1;

export function useIndexedDB<T>(storeName: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [data, setData] = useState<T>(initialValue);

  useEffect(() => {
    let db: IDBDatabase;
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const getRequest = store.get('data');

      getRequest.onsuccess = () => {
        if (getRequest.result) {
          setData(getRequest.result.value);
        } else {
          const writeTransaction = db.transaction(storeName, 'readwrite');
          const writeStore = writeTransaction.objectStore(storeName);
          writeStore.put({ id: 'data', value: initialValue });
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
  }, [storeName, initialValue]);

  const saveData = (valueOrFunction: T | ((val: T) => T)) => {
    const newValue = valueOrFunction instanceof Function ? valueOrFunction(data) : valueOrFunction;
    setData(newValue);

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const putRequest = store.put({ id: 'data', value: newValue });

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
}
