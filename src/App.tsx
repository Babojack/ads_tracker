import React, { useState, useEffect } from 'react';
import { Activity, BarChart2, Target, Brain, Plus, Download, Upload } from 'lucide-react';
import ProjectTracker from './components/trackers/ProjectTracker';
import GoalsTracker from './components/trackers/GoalsTracker';
import MoodTracker from './components/trackers/MoodTracker';
import LifeEQTracker from './components/trackers/LifeEQTracker';
import TodoTracker from './components/trackers/TodoTracker';

type TabId = 'projects' | 'goals' | 'mood' | 'lifeEQ' | 'todos';

interface Tab {
  id: TabId;
  name: string;
  Icon: React.FC<any>;
}

/**
 * Кастомный хук для синхронизации состояния с localStorage.
 * При инициализации пытается загрузить значение из localStorage,
 * а затем записывает новое значение при каждом изменении state.
 */
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error(error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue] as const;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useLocalStorage<TabId>('activeTab', 'projects');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const tabs: Tab[] = [
    { id: 'projects', name: 'Project Tracker', Icon: Activity },
    { id: 'goals', name: 'Goals Tracker', Icon: Target },
    { id: 'mood', name: 'Mood Tracker', Icon: BarChart2 },
    { id: 'lifeEQ', name: 'LifeEQ Tracker', Icon: Brain },
    { id: 'todos', name: 'ToDo\'s', Icon: Plus },
  ];

  const handleTabClick = (tabId: TabId) => {
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);
  };

  const exportAllProgress = () => {
    const progressData = {
      activeTab: localStorage.getItem('activeTab'),
      projects: localStorage.getItem('projects'),
      goals: localStorage.getItem('goals'),
      mood: localStorage.getItem('mood'),
      lifeEQ: localStorage.getItem('lifeEQ'),
      todos: localStorage.getItem('todos')
    };

    const jsonData = JSON.stringify(progressData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'life_tracker_progress.json';
    link.click();
  };

  const importAllProgress = () => {
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
            Object.entries(importedData).forEach(([key, value]) => {
              if (value) localStorage.setItem(key, value as string);
            });
            window.location.reload(); // Перезагрузка для обновления данных
          } catch (error) {
            console.error('Ошибка импорта', error);
            alert('Не удалось импортировать файл');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <nav className="mb-4 sm:mb-6 md:mb-8 flex justify-between items-center">
          <div>
            {/* Mobile Menu */}
            <div className="md:hidden mb-4">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="w-full bg-gray-800/50 p-3 rounded-lg flex items-center justify-between"
              >
                <div className="flex items-center space-x-2">
                  {(() => {
                    const activeTabData = tabs.find(tab => tab.id === activeTab);
                    const IconComponent = activeTabData?.Icon;
                    return (
                      <>
                        {IconComponent && <IconComponent className="w-5 h-5" />}
                        <span>{activeTabData?.name}</span>
                      </>
                    );
                  })()}
                </div>
                <svg
                  className={`w-5 h-5 transition-transform duration-200 ${isMobileMenuOpen ? 'transform rotate-180' : ''
                    }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Mobile Menu Dropdown */}
              {isMobileMenuOpen && (
                <div className="mt-2 bg-gray-800/50 rounded-lg overflow-hidden">
                  {tabs.map((tab) => {
                    const IconComponent = tab.Icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleTabClick(tab.id)}
                        className={`w-full flex items-center space-x-2 p-3 transition-colors ${activeTab === tab.id
                            ? 'bg-blue-500'
                            : 'hover:bg-gray-700'
                          }`}
                      >
                        <IconComponent className="w-5 h-5" />
                        <span>{tab.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:block">
              <div className="flex flex-wrap gap-2 justify-center w-full bg-gray-800/50 p-3 sm:p-4 rounded-lg">
                {tabs.map((tab) => {
                  const IconComponent = tab.Icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabClick(tab.id)}
                      className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg transition-all duration-300 ${activeTab === tab.id
                          ? 'bg-blue-500 shadow-lg'
                          : 'hover:bg-gray-700'
                        }`}
                    >
                      <IconComponent className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="text-sm sm:text-base whitespace-nowrap">{tab.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Export/Import Buttons */}
          <div className="flex space-x-2">
            <button
              onClick={exportAllProgress}
              className="bg-green-500 hover:bg-green-600 p-2 rounded-lg"
              title="Export All Progress"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={importAllProgress}
              className="bg-blue-500 hover:bg-blue-600 p-2 rounded-lg"
              title="Import All Progress"
            >
              <Upload className="w-5 h-5" />
            </button>
          </div>
        </nav>

        <div className="bg-gray-800/50 rounded-lg p-3 sm:p-4 md:p-6">
          {activeTab === 'projects' && <ProjectTracker />}
          {activeTab === 'goals' && <GoalsTracker />}
          {activeTab === 'mood' && <MoodTracker />}
          {activeTab === 'lifeEQ' && <LifeEQTracker />}
          {activeTab === 'todos' && <TodoTracker />}
        </div>
      </div>
    </div>
  );
};

export default App;
