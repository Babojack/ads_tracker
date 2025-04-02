import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import {
  Trash2,
  Edit,
  Save,
  X,
  ExternalLink,
  DollarSign,
  Calendar,
  Download,
  Upload,
} from 'lucide-react';

const DB_NAME = 'projectTrackerDB';
const DB_VERSION = 1;

function useIndexedDB<T>(
  storeName: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  const [data, setData] = useState<T>(initialValue);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let db: IDBDatabase | null = null;
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
          const writeTransaction = db!.transaction(storeName, 'readwrite');
          const writeStore = writeTransaction.objectStore(storeName);
          const putRequest = writeStore.put({ id: 'data', value: initialValue });

          putRequest.onsuccess = () => {
            console.log('Initial data saved to IndexedDB:', storeName);
          };

          putRequest.onerror = (e) => {
            console.error('Error saving initial data to IndexedDB', e);
          };
        }
        setIsInitialized(true);
      };

      getRequest.onerror = (e) => {
        console.error('Error reading from IndexedDB', e);
        setIsInitialized(true);
      };
    };

    request.onerror = (event) => {
      console.error('Error opening IndexedDB', (event.target as IDBOpenDBRequest).error);
      setIsInitialized(true);
    };

    return () => {
      if (db) db.close();
    };
  }, [storeName]);

  const saveData = (valueOrFn: T | ((prevVal: T) => T)) => {
    const newValue = typeof valueOrFn === 'function' ? (valueOrFn as Function)(data) : valueOrFn;
    setData(newValue);

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result as IDBDatabase;
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const putRequest = store.put({ id: 'data', value: newValue });

      putRequest.onsuccess = () => {
        console.log('Data successfully saved to IndexedDB:', storeName);
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

interface WishlistItem {
  id: string;
  name: string;
  description: string;
  priority: 'niedrig' | 'mittel' | 'hoch';
  price: string;
  url: string;
  category: string;
  targetDate: string;
  createdAt: number;
  image?: string;
}

interface Category {
  id: string;
  name: string;
}

const WishlistTracker: React.FC = () => {
  const [items, setItems] = useIndexedDB<WishlistItem[]>('wishlist', []);
  const [categories, setCategories] = useIndexedDB<Category[]>(
    'wishlist_categories',
    [
      { id: 'tech', name: 'Technology' },
      { id: 'kleidung', name: 'Clothing' },
      { id: 'hobby', name: 'Hobby' },
      { id: 'haushalt', name: 'Household' },
      { id: 'sonstiges', name: 'Miscellaneous' },
    ]
  );

  const [newCategory, setNewCategory] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemPriority, setItemPriority] = useState<'niedrig' | 'mittel' | 'hoch'>('mittel');
  const [itemPrice, setItemPrice] = useState('');
  const [itemUrl, setItemUrl] = useState('');
  const [itemCategory, setItemCategory] = useState('');
  const [itemTargetDate, setItemTargetDate] = useState('');
  const [itemImage, setItemImage] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!itemCategory && categories.length > 0) {
      setItemCategory(categories[0].id);
    }
  }, [categories]);

  const handleAddCategory = () => {
    if (newCategory.trim() === '') return;
    const categoryId = newCategory.toLowerCase().replace(/\s+/g, '-');

    setCategories((prev) => {
      const updated = [...prev];
      if (!updated.find((cat) => cat.id === categoryId)) {
        updated.push({ id: categoryId, name: newCategory });
      }
      return updated;
    });

    setNewCategory('');
  };

  const resetForm = () => {
    setItemName('');
    setItemDescription('');
    setItemPriority('mittel');
    setItemPrice('');
    setItemUrl('');
    setItemCategory(categories[0]?.id || '');
    setItemTargetDate('');
    setItemImage(undefined);
    setIsAdding(false);
    setEditingId(null);
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        setItemImage(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    setItems((prevItems) => {
      const existing = editingId ? prevItems.find((x) => x.id === editingId) : undefined;
      const newItem: WishlistItem = {
        id: editingId || `wish-${Date.now()}`,
        name: itemName,
        description: itemDescription,
        priority: itemPriority,
        price: itemPrice,
        url: itemUrl,
        category: itemCategory,
        targetDate: itemTargetDate,
        createdAt: existing?.createdAt || Date.now(),
        image: itemImage,
      };

      let updated: WishlistItem[];
      if (editingId) {
        updated = prevItems.map((it) => (it.id === editingId ? newItem : it));
      } else {
        updated = [...prevItems, newItem];
      }
      return updated;
    });

    resetForm();
  };

  const startEditing = (item: WishlistItem) => {
    setEditingId(item.id);
    setItemName(item.name);
    setItemDescription(item.description);
    setItemPriority(item.priority);
    setItemPrice(item.price);
    setItemUrl(item.url);
    setItemCategory(item.category);
    setItemTargetDate(item.targetDate);
    setItemImage(item.image);
    setIsAdding(true);
  };

  const deleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleImportData = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = reader.result as string;
        const data = JSON.parse(json);
        if (!Array.isArray(data.items) || !Array.isArray(data.categories)) {
          throw new Error('Invalid JSON format: items / categories missing');
        }
        setItems(data.items);
        setCategories(data.categories);
        alert('Import successful!');
      } catch (err) {
        alert('Error during import!');
        console.error(err);
      }
    };
    reader.readAsText(file);
  };

  const handleExportData = () => {
    try {
      const exportObj = {
        items,
        categories,
      };
      const jsonStr = JSON.stringify(exportObj, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'wishlist_backup.json';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error during export');
      console.error(err);
    }
  };

  const filteredItems = items.filter(
    (item) => filter === 'all' || item.category === filter
  );

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sortBy === 'date') {
      return b.createdAt - a.createdAt;
    } else if (sortBy === 'price') {
      return (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0);
    } else if (sortBy === 'priority') {
      const vals = { hoch: 3, mittel: 2, niedrig: 1 };
      return vals[b.priority] - vals[a.priority];
    }
    return 0;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'hoch':
        return 'bg-red-500';
      case 'mittel':
        return 'bg-yellow-500';
      case 'niedrig':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold">Wishlist</h2>
        <div className="flex flex-wrap gap-3 items-center">
          <button
            onClick={handleExportData}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Download size={18} /> Export
          </button>
          <label className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 cursor-pointer">
            <Upload size={18} /> Import
            <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
          </label>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-wrap gap-2">
          <select
            className="bg-gray-700 text-white px-3 py-2 rounded-lg"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          <select
            className="bg-gray-700 text-white px-3 py-2 rounded-lg"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="date">By Date</option>
            <option value="price">By Price</option>
            <option value="priority">By Priority</option>
          </select>

          <button
            onClick={() => setIsAdding(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            New Wish
          </button>
        </div>
      </div>

      {isAdding && (
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              {editingId ? 'Edit Wish' : 'Add New Wish'}
            </h3>
            <button onClick={resetForm} className="text-gray-400 hover:text-white">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name*</label>
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  value={itemCategory}
                  onChange={(e) => setItemCategory(e.target.value)}
                  className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Price (€)</label>
                <input
                  type="text"
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                  className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Priority</label>
                <select
                  value={itemPriority}
                  onChange={(e) =>
                    setItemPriority(e.target.value as 'niedrig' | 'mittel' | 'hoch')
                  }
                  className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg"
                >
                  <option value="niedrig">Low</option>
                  <option value="mittel">Medium</option>
                  <option value="hoch">High</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">URL</label>
                <input
                  type="url"
                  value={itemUrl}
                  onChange={(e) => setItemUrl(e.target.value)}
                  className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg"
                  placeholder="https://"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Target Date</label>
                <input
                  type="date"
                  value={itemTargetDate}
                  onChange={(e) => setItemTargetDate(e.target.value)}
                  className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Upload Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-gray-600 file:text-gray-200 hover:file:bg-gray-500 mt-1"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-1"
              >
                <Save size={18} /> Save
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-gray-700 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">Manage Categories</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {categories.map((cat) => (
            <span key={cat.id} className="bg-gray-600 px-3 py-1 rounded-lg">
              {cat.name}
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="flex-1 bg-gray-800 text-white px-3 py-2 rounded-lg"
            placeholder="New Category..."
          />
          <button
            onClick={handleAddCategory}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Add
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sortedItems.length === 0 ? (
          <div className="col-span-full text-center py-8 bg-gray-700 rounded-lg">
            <p className="text-gray-400">No wishes found in this category.</p>
          </div>
        ) : (
          sortedItems.map((item) => (
            <div key={item.id} className="bg-gray-700 rounded-lg p-4 flex flex-col h-full">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold">{item.name}</h3>
                <div className="flex gap-1">
                  <button onClick={() => startEditing(item)} className="text-blue-400 hover:text-blue-300 p-1">
                    <Edit size={18} />
                  </button>
                  <button onClick={() => deleteItem(item.id)} className="text-red-400 hover:text-red-300 p-1">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-2">
                <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(item.priority)}`}>
                  {item.priority}
                </span>
                {categories.find((c) => c.id === item.category) && (
                  <span className="text-xs bg-gray-600 px-2 py-1 rounded">
                    {categories.find((c) => c.id === item.category)?.name}
                  </span>
                )}
              </div>

              {item.image && (
                <div className="mb-2">
                  <img src={item.image} alt="Wish Item" className="max-w-full h-auto rounded" />
                </div>
              )}

              {item.description && (
                <p className="text-gray-300 text-sm mb-3 flex-grow">
                  {item.description}
                </p>
              )}

              <div className="mt-auto space-y-1 pt-2 border-t border-gray-600">
                {item.price && (
                  <div className="flex items-center gap-1 text-sm">
                    <DollarSign size={14} className="text-green-400" />
                    <span>{item.price} €</span>
                  </div>
                )}
                {item.targetDate && (
                  <div className="flex items-center gap-1 text-sm">
                    <Calendar size={14} className="text-blue-400" />
                    <span>{new Date(item.targetDate).toLocaleDateString()}</span>
                  </div>
                )}
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
                  >
                    <ExternalLink size={14} /> Link
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default WishlistTracker;
