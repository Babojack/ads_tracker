import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import Note from '../shared/Note';
import Milestone from '../shared/Milestone';

// Интерфейсы
interface Goal {
  id: number;
  name: string;
  deadline: string;
  status: string;
  image: string | null;
  difficulty: number; // Schwierigkeitsgrad (1-6)
  milestones: {
    id: number;
    name: string;
    completed: boolean;
  }[];
  notes: {
    id: number;
    text: string;
    timestamp: string;
  }[];
  order: number;
}

// Custom Hook für localStorage
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
      const valueToStore = value instanceof Function
        ? value(storedValue)
        : value;
      setStoredValue(valueToStore);
      localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
};

// Neuer Component für den Schwierigkeits-Indicator
interface DifficultyIndicatorProps {
  value: number;
  onChange: (newValue: number) => void;
}

const DifficultyIndicator: React.FC<DifficultyIndicatorProps> = ({ value, onChange }) => {
  // 6 Kreise
  const circles = [1, 2, 3, 4, 5, 6];

  const getColor = (index: number) => {
    if (index > value) return 'bg-gray-300'; // inaktiv
    // Aktive Kreise: 1-2: grün, 3-4: gelb, 5-6: rot
    if (index <= 2) return 'bg-green-500';
    if (index <= 4) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex space-x-1">
      {circles.map((circle) => (
        <button
          key={circle}
          onClick={() => onChange(circle)}
          className={`w-6 h-6 rounded-full ${getColor(circle)} border border-gray-500`}
          title={`Level of difficulty  ${circle}`}
        />
      ))}
    </div>
  );
};

type SortOption = 'default' | 'alphabet' | 'date' | 'difficulty';

const ProjectTracker: React.FC = () => {
  // Verwende hier den eigenen Key für den Project Tracker
  const [goals, setGoals] = useLocalStorage<Goal[]>('projectTrackerGoals', [{
    id: 1,
    name: 'Project Name',
    deadline: new Date().toISOString(),
    status: 'Not started',
    image: null,
    difficulty: 3, // Standardwert
    milestones: [
      { id: 1, name: 'First Step', completed: false },
      { id: 2, name: 'Second Step', completed: false }
    ],
    notes: [],
    order: 1
  }]);
  const [sortBy, setSortBy] = useState<SortOption>('default');

  // Sortierfunktion
  const getDisplayedGoals = () => {
    const goalsCopy = [...goals];
    switch (sortBy) {
      case 'alphabet':
        return goalsCopy.sort((a, b) => a.name.localeCompare(b.name));
      case 'date':
        return goalsCopy.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
      case 'difficulty':
        return goalsCopy.sort((a, b) => b.difficulty - a.difficulty);
      default:
        return goalsCopy.sort((a, b) => a.order - b.order);
    }
  };

  // Funktion zur Aktualisierung des Zielstatus
  const updateGoalStatus = (goal: Goal) => {
    const hasStarted = goal.milestones.some(m => m.completed);
    const allCompleted = goal.milestones.every(m => m.completed);
    return allCompleted ? 'Завершена' : (hasStarted ? 'В процессе' : 'Не начата');
  };

  // Funktion zum Hinzufügen eines Bildes
  const handleImageUpload = (goalId: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setGoals(goals.map(g =>
          g.id === goalId ? { ...g, image: reader.result as string } : g
        ));
      };
      reader.readAsDataURL(file);
    }
  };

  // Funktion zum Hinzufügen einer Notiz
  const addNote = (goalId: number, note: string) => {
    setGoals(goals.map(g =>
      g.id === goalId ? {
        ...g,
        notes: [{
          id: Date.now(),
          text: note,
          timestamp: new Date().toISOString()
        }, ...g.notes]
      } : g
    ));
  };

  // Funktion zum Hinzufügen eines neuen Ziels
  const addNewGoal = () => {
    const newGoal: Goal = {
      id: Date.now(),
      name: 'Project Name',
      deadline: new Date().toISOString(),
      status: 'Не начата',
      image: null,
      difficulty: 3, // Standard-Schwierigkeitsgrad
      milestones: [],
      notes: [],
      order: goals.length + 1
    };
    setGoals([...goals, newGoal]);
  };

  // Funktion zum Löschen eines Ziels
  const deleteGoal = (goalId: number) => {
    setGoals(goals.filter(g => g.id !== goalId));
  };

  // Funktion zum Löschen aller Ziele im localStorage
  const clearAllGoals = () => {
    localStorage.removeItem('projectTrackerGoals');
    setGoals([]);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header mit Titel und Sortieroptionen */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <h2 className="text-xl sm:text-2xl font-bold">Goals</h2>
        <div className="flex items-center space-x-4 mt-2 sm:mt-0">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="bg-gray-800 text-white p-2 rounded text-sm"
          >
            <option value="default">Standard</option>
            <option value="alphabet">Alphabetisch</option>
            <option value="date">Nach Datum</option>
            <option value="difficulty">Level of difficulty
            </option>
          </select>
          <button
            onClick={addNewGoal}
            className="p-2 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {getDisplayedGoals().map(goal => {
          // Berechnung des Fortschritts in Prozent (basierend auf den Meilensteinen)
          const progress = goal.milestones.length
            ? Math.round(goal.milestones.filter(m => m.completed).length / goal.milestones.length * 100)
            : 0;
          return (
            <div key={goal.id} className="bg-gray-700/50 p-3 sm:p-4 rounded-lg flex flex-col">
              <div className="relative mb-3 sm:mb-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(goal.id, e)}
                  className="hidden"
                  id={`goal-${goal.id}`}
                />
                <label
                  htmlFor={`goal-${goal.id}`}
                  className="cursor-pointer block"
                >
                  {goal.image ? (
                    <img
                      src={goal.image}
                      alt="Цель"
                      className="w-full h-24 sm:h-32 object-cover rounded"
                    />
                  ) : (
                    <div className="w-full h-24 sm:h-32 bg-gray-800 rounded flex items-center justify-center">
                      <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                    </div>
                  )}
                </label>
              </div>

              <div className="flex justify-between items-center mb-3">
                <input
                  type="text"
                  value={goal.name}
                  onChange={(e) => setGoals(goals.map(g =>
                    g.id === goal.id ? { ...g, name: e.target.value } : g
                  ))}
                  className="bg-transparent font-semibold text-sm sm:text-base outline-none max-w-[60%]"
                />
                <div className="flex items-center space-x-2">
                  <span className="text-xs sm:text-sm px-2 py-1 rounded bg-gray-800 whitespace-nowrap">{goal.status}</span>
                  <button
                    onClick={() => deleteGoal(goal.id)}
                    className="p-1 hover:bg-gray-600 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Schwierigkeits-Indicator */}
              <div className="mb-3">
                <span className="block text-xs sm:text-sm font-semibold mb-1">Level of difficulty</span>
                <DifficultyIndicator
                  value={goal.difficulty}
                  onChange={(newVal) => setGoals(goals.map(g =>
                    g.id === goal.id ? { ...g, difficulty: newVal } : g
                  ))}
                />
              </div>

              {/* Fortschrittsanzeige */}
              <div className="mb-3">
                <span className="block text-xs sm:text-sm font-semibold mb-1">Progress</span>
                <div className="w-full bg-gray-300 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${progress}%` }}></div>
                </div>
                <span className="text-xs">{progress}%</span>
              </div>

              <div className="mb-3">
                <label className="text-xs sm:text-sm font-semibold block mb-1">Deadline</label>
                <input
                  type="date"
                  value={goal.deadline.split('T')[0]}
                  onChange={(e) => setGoals(goals.map(g =>
                    g.id === goal.id ? { ...g, deadline: new Date(e.target.value).toISOString() } : g
                  ))}
                  className="w-full bg-gray-800 rounded p-2 text-sm"
                />
              </div>

              <div className="space-y-2 mb-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs sm:text-sm font-semibold">Tasks</h3>
                  <button
                    onClick={() => setGoals(goals.map(g =>
                      g.id === goal.id ? {
                        ...g,
                        milestones: [...g.milestones, {
                          id: Date.now(),
                          name: 'New Task',
                          completed: false
                        }]
                      } : g
                    ))}
                    className="p-1 hover:bg-gray-600 rounded"
                  >
                    <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                </div>
                <div className="max-h-28 sm:max-h-32 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                  {goal.milestones.map(milestone => (
                    <Milestone
                      key={milestone.id}
                      milestone={milestone}
                      onToggle={() => {
                        const updatedGoal = {
                          ...goal,
                          milestones: goal.milestones.map(m =>
                            m.id === milestone.id ? { ...m, completed: !m.completed } : m
                          )
                        };
                        updatedGoal.status = updateGoalStatus(updatedGoal);
                        setGoals(goals.map(g =>
                          g.id === goal.id ? updatedGoal : g
                        ));
                      }}
                      onUpdate={(name) => setGoals(goals.map(g => ({
                        ...g,
                        milestones: g.id === goal.id
                          ? g.milestones.map(m =>
                            m.id === milestone.id ? { ...m, name } : m
                          )
                          : g.milestones
                      })))}
                      onDelete={() => setGoals(goals.map(g => ({
                        ...g,
                        milestones: g.id === goal.id
                          ? g.milestones.filter(m => m.id !== milestone.id)
                          : g.milestones
                      })))}
                    />
                  ))}
                </div>
              </div>

              <div className="flex-1 flex flex-col min-h-[120px]">
                <input
                  type="text"
                  placeholder="Comment"
                  className="w-full bg-gray-800 rounded p-2 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                      addNote(goal.id, (e.target as HTMLInputElement).value.trim());
                      (e.target as HTMLInputElement).value = '';
                    }
                  }}
                />
                <div className="flex-1 max-h-28 sm:max-h-32 overflow-y-auto space-y-2 mt-2 pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                  {goal.notes.map(note => (
                    <Note
                      key={note.id}
                      note={note}
                      onDelete={() => setGoals(goals.map(g => ({
                        ...g,
                        notes: g.id === goal.id
                          ? g.notes.filter(n => n.id !== note.id)
                          : g.notes
                      })))}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProjectTracker;
