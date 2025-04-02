import React, { useState } from 'react';
import { Trash2, Edit, Save, X, ExternalLink, DollarSign, Calendar } from 'lucide-react';
import { useIndexedDB } from './useIndexedDB';

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
  const [categories, setCategories] = useIndexedDB<Category[]>('wishlist_categories', [
    { id: 'tech', name: 'Technik' },
    { id: 'kleidung', name: 'Kleidung' },
    { id: 'hobby', name: 'Hobby' },
    { id: 'haushalt', name: 'Haushalt' },
    { id: 'sonstiges', name: 'Sonstiges' },
  ]);
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
  const [itemCategory, setItemCategory] = useState(categories[0]?.id || '');
  const [itemTargetDate, setItemTargetDate] = useState('');
  const [itemImage, setItemImage] = useState<string | undefined>(undefined);

  const handleAddCategory = () => {
    if (newCategory.trim() === '') return;
    const categoryId = newCategory.toLowerCase().replace(/\s+/g, '-');
    setCategories((prev) => [...prev, { id: categoryId, name: newCategory }]);
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newItem: WishlistItem = {
      id: editingId || `wish-${Date.now()}`,
      name: itemName,
      description: itemDescription,
      priority: itemPriority,
      price: itemPrice,
      url: itemUrl,
      category: itemCategory,
      targetDate: itemTargetDate,
      createdAt: editingId
        ? items.find(item => item.id === editingId)?.createdAt || Date.now()
        : Date.now(),
      image: itemImage,
    };
    if (editingId) {
      setItems((prev) => prev.map(item => (item.id === editingId ? newItem : item)));
    } else {
      setItems((prev) => [...prev, newItem]);
    }
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
    setItems((prev) => prev.filter(item => item.id !== id));
  };

  const filteredItems = items.filter(item => {
    if (filter === 'all') return true;
    return item.category === filter;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sortBy === 'date') return b.createdAt - a.createdAt;
    if (sortBy === 'price') {
      const priceA = parseFloat(a.price) || 0;
      const priceB = parseFloat(b.price) || 0;
      return priceB - priceA;
    }
    if (sortBy === 'priority') {
      const priorityValues = { hoch: 3, mittel: 2, niedrig: 1 };
      return priorityValues[b.priority] - priorityValues[a.priority];
    }
    return 0;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'hoch': return 'bg-red-500';
      case 'mittel': return 'bg-yellow-500';
      case 'niedrig': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold">Wunschliste</h2>
        <div className="flex flex-wrap gap-2">
          <select
            className="bg-gray-700 text-white px-3 py-2 rounded-lg"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">Alle Kategorien</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            className="bg-gray-700 text-white px-3 py-2 rounded-lg"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="date">Nach Datum</option>
            <option value="price">Nach Preis</option>
            <option value="priority">Nach Priorität</option>
          </select>
          <button
            onClick={() => setIsAdding(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Neuer Wunsch
          </button>
        </div>
      </div>
      {isAdding && (
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              {editingId ? 'Wunsch bearbeiten' : 'Neuen Wunsch hinzufügen'}
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
                <label className="block text-sm font-medium mb-1">Kategorie</label>
                <select
                  value={itemCategory}
                  onChange={(e) => setItemCategory(e.target.value)}
                  className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg"
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Preis (€)</label>
                <input
                  type="text"
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                  className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Priorität</label>
                <select
                  value={itemPriority}
                  onChange={(e) => setItemPriority(e.target.value as 'niedrig' | 'mittel' | 'hoch')}
                  className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg"
                >
                  <option value="niedrig">Niedrig</option>
                  <option value="mittel">Mittel</option>
                  <option value="hoch">Hoch</option>
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
                <label className="block text-sm font-medium mb-1">Zieldatum</label>
                <input
                  type="date"
                  value={itemTargetDate}
                  onChange={(e) => setItemTargetDate(e.target.value)}
                  className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Bild hinzufügen</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="block w-full text-sm text-gray-400
                    file:mr-4 file:py-2 file:px-4
                    file:rounded file:border-0
                    file:text-sm file:font-semibold
                    file:bg-gray-600 file:text-gray-200
                    hover:file:bg-gray-500
                    mt-1"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Beschreibung</label>
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
                Abbrechen
              </button>
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-1"
              >
                <Save size={18} /> Speichern
              </button>
            </div>
          </form>
        </div>
      )}
      <div className="bg-gray-700 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">Kategorien verwalten</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {categories.map((category) => (
            <span key={category.id} className="bg-gray-600 px-3 py-1 rounded-lg">
              {category.name}
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="flex-1 bg-gray-800 text-white px-3 py-2 rounded-lg"
            placeholder="Neue Kategorie..."
          />
          <button
            onClick={handleAddCategory}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Hinzufügen
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sortedItems.length === 0 ? (
          <div className="col-span-full text-center py-8 bg-gray-700 rounded-lg">
            <p className="text-gray-400">Keine Wünsche in dieser Kategorie gefunden.</p>
          </div>
        ) : (
          sortedItems.map((item) => (
            <div key={item.id} className="bg-gray-700 rounded-lg p-4 flex flex-col h-full">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold">{item.name}</h3>
                <div className="flex gap-1">
                  <button
                    onClick={() => startEditing(item)}
                    className="text-blue-400 hover:text-blue-300 p-1"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="text-red-400 hover:text-red-300 p-1"
                  >
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
                  <img
                    src={item.image}
                    alt="Wish Item"
                    className="max-w-full h-auto rounded"
                  />
                </div>
              )}
              {item.description && (
                <p className="text-gray-300 text-sm mb-3 flex-grow">{item.description}</p>
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
