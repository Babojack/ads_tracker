import React, { useState, useEffect } from 'react';
import { Plus, X, Download, Upload } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';

interface Category {
  name: string;
  value: number;
}

const useLocalStorage = <T,>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
};

const LifeEQTracker: React.FC = () => {
  const [categories, setCategories] = useLocalStorage<Category[]>('lifeEqCategories', [
    { name: 'Health', value: 8 },
    { name: 'Relationships', value: 7 },
    { name: 'Career', value: 6 },
    { name: 'Finance', value: 5 },
    { name: 'Growth', value: 7 },
    { name: 'Leisure', value: 6 }
  ]);
  const [newCategory, setNewCategory] = useState('');
  const [chartDimension, setChartDimension] = useState({ width: 300, height: 300 });

  useEffect(() => {
    const updateDimensions = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setChartDimension({ width: 280, height: 280 });
      } else if (width < 768) {
        setChartDimension({ width: 320, height: 320 });
      } else {
        setChartDimension({ width: 400, height: 400 });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  return (
    <div className="w-full space-y-6 p-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="w-full bg-gray-700/50 rounded-lg p-4 flex justify-center items-center min-h-[300px] lg:min-h-[400px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={280}>
            <RadarChart data={categories}>
              <PolarGrid strokeDasharray="3 3" />
              <PolarAngleAxis
                dataKey="name"
                tick={{
                  fill: '#9CA3AF',
                  fontSize: '12px',
                  fontWeight: 500
                }}
              />
              <PolarRadiusAxis
                domain={[0, 10]}
                tick={{ fill: '#9CA3AF' }}
                axisLine={{ strokeOpacity: 0.2 }}
              />
              <Radar
                name="Balance"
                dataKey="value"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.6}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-xl sm:text-2xl font-bold">Life Balance</h2>
            <div className="flex w-full sm:w-auto space-x-2">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="New Category"
                className="flex-1 sm:flex-none bg-gray-800 p-2 rounded text-sm sm:text-base min-w-[150px]"
              />
              <button
                onClick={() => {
                  if (newCategory.trim()) {
                    setCategories([...categories, { name: newCategory, value: 5 }]);
                    setNewCategory('');
                  }
                }}
                className="p-2 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors flex-shrink-0"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
            {categories.map((category, index) => (
              <div key={index} className="bg-gray-700/50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm sm:text-base font-medium">{category.name}</span>
                  <button
                    onClick={() => setCategories(categories.filter(c => c.name !== category.name))}
                    className="p-1 hover:bg-gray-600 rounded group"
                  >
                    <X className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
                  </button>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={category.value}
                  onChange={(e) => setCategories(categories.map(c =>
                    c.name === category.name ? { ...c, value: parseInt(e.target.value) } : c
                  ))}
                  className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs sm:text-sm text-gray-400 mt-1">
                  <span>0</span>
                  <span className="font-medium">{category.value}/10</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LifeEQTracker;
