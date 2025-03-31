import React, { useState, useRef, useEffect } from 'react';
import { Plus, X, Star, Archive } from 'lucide-react';
import Note from '../shared/Note';
import Milestone from '../shared/Milestone';

interface Goal {
  id: number;
  name: string;
  deadline: string;
  status: string;
  image: string | null;
  difficulty: number;
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
  archived: boolean;
  favorite: boolean;
}

const useLocalStorage = <T,>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error("Error retrieving from localStorage:", error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function
        ? value(storedValue)
        : value;

      // Versuch, den Wert zu serialisieren
      const jsonString = JSON.stringify(valueToStore);

      try {
        localStorage.setItem(key, jsonString);
        setStoredValue(valueToStore);
        console.log(`Successfully stored ${jsonString.length} bytes in localStorage`);
      } catch (storageError) {
        console.error("Storage error:", storageError);
        alert("Speicherfehler! Die Daten konnten nicht gespeichert werden. Möglicherweise ist der Speicherplatz voll.");

        // Versuche ohne Bilder zu speichern als Fallback
        if (Array.isArray(valueToStore)) {
          const backupData = valueToStore.map((item: any) => ({
            ...item,
            image: item.image && item.image.length > 1000 ? null : item.image
          }));

          try {
            const backupJson = JSON.stringify(backupData);
            localStorage.setItem(key, backupJson);
            setStoredValue(backupData as any);
            console.log("Fallback storage (without images) succeeded");
            alert("Bilder konnten nicht gespeichert werden. Funktionalität bleibt erhalten, aber Bilder wurden entfernt.");
          } catch (backupError) {
            console.error("Backup storage failed:", backupError);
          }
        }
      }
    } catch (error) {
      console.error("Serialization error:", error);
    }
  };

  return [storedValue, setValue];
};

interface DifficultyIndicatorProps {
  value: number;
  onChange: (newValue: number) => void;
}

const DifficultyIndicator: React.FC<DifficultyIndicatorProps> = ({ value, onChange }) => {
  const circles = [1, 2, 3, 4, 5, 6];

  const getColor = (index: number) => {
    if (index > value) return 'bg-gray-300';
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
          title={`Level of difficulty ${circle}`}
        />
      ))}
    </div>
  );
};

type SortOption = 'default' | 'alphabet' | 'date' | 'difficulty';

const ProjectTracker: React.FC = () => {
  const [goals, setGoals] = useLocalStorage<Goal[]>('projectTrackerGoals', [{
    id: 1,
    name: 'Project Name',
    deadline: new Date().toISOString(),
    status: 'Not started',
    image: null,
    difficulty: 3,
    milestones: [
      { id: 1, name: 'First Step', completed: false },
      { id: 2, name: 'Second Step', completed: false }
    ],
    notes: [],
    order: 1,
    archived: false,
    favorite: false
  }]);
  const [sortBy, setSortBy] = useState<SortOption>('default');

  // Drag and drop state
  const [draggedGoalId, setDraggedGoalId] = useState<number | null>(null);
  const [dragOverGoalId, setDragOverGoalId] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragNodeRef = useRef<HTMLDivElement | null>(null);
  const dragStartPosition = useRef({ x: 0, y: 0 });

  // Speicherplatz überwachen
  useEffect(() => {
    try {
      const storageEstimate = (navigator as any).storage?.estimate?.();
      if (storageEstimate) {
        storageEstimate.then((estimate: any) => {
          console.log(`Storage usage: ${estimate.usage / 1024 / 1024} MB of ${estimate.quota / 1024 / 1024} MB`);
        });
      }
    } catch (e) {
      console.log("Storage estimation not supported");
    }
  }, [goals]);

  const getActiveGoals = () => goals.filter(g => !g.archived);
  const getArchivedGoals = () => goals.filter(g => g.archived);

  const sortGoals = (list: Goal[]) => {
    const sorted = [...list];
    switch (sortBy) {
      case 'alphabet':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'date':
        return sorted.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
      case 'difficulty':
        return sorted.sort((a, b) => b.difficulty - a.difficulty);
      default:
        return sorted.sort((a, b) => a.order - b.order);
    }
  };

  const updateGoalStatus = (goal: Goal) => {
    const hasStarted = goal.milestones.some(m => m.completed);
    const allCompleted = goal.milestones.every(m => m.completed);
    return allCompleted ? 'Done' : (hasStarted ? 'In Progress' : 'Not Started');
  };

  const handleImageUpload = (goalId: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Überprüfe Dateigröße
      if (file.size > 1024 * 1024) {
        alert("Das Bild ist zu groß (>1MB). Bitte verwenden Sie ein kleineres Bild.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          // Bild komprimieren
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 500; // Maximale Breite begrenzen
          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH) {
            height = Math.floor(height * (MAX_WIDTH / width));
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);

            // JPEG mit reduzierter Qualität
            const compressedImage = canvas.toDataURL('image/jpeg', 0.7);

            console.log(`Original image size: ${(reader.result as string).length} bytes`);
            console.log(`Compressed image size: ${compressedImage.length} bytes`);

            setGoals(currentGoals =>
              currentGoals.map(g =>
                g.id === goalId ? { ...g, image: compressedImage } : g
              )
            );
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

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

  const addNewGoal = () => {
    try {
      const newGoal: Goal = {
        id: Date.now(),
        name: 'Project Name',
        deadline: new Date().toISOString(),
        status: 'Not started',
        image: null,
        difficulty: 3,
        milestones: [],
        notes: [],
        order: goals.length + 1,
        archived: false,
        favorite: false
      };

      const newGoals = [...goals, newGoal];
      // Teste die Speicherbarkeit
      const testJson = JSON.stringify(newGoals);

      if (testJson.length > 5000000) { // ~5MB als Sicherheitsgrenze
        throw new Error("Data size would exceed storage limits");
      }

      setGoals(newGoals);
    } catch (error) {
      console.error("Failed to add new goal:", error);
      alert("Neues Projekt konnte nicht erstellt werden. Zu viele Daten im Speicher. Bitte löschen Sie einige Projekte oder Bilder.");
    }
  };

  const deleteGoal = (goalId: number) => {
    setGoals(goals.filter(g => g.id !== goalId));
  };

  const toggleArchiveGoal = (goalId: number) => {
    setGoals(goals.map(g =>
      g.id === goalId ? { ...g, archived: !g.archived } : g
    ));
  };

  const toggleFavoriteGoal = (goalId: number) => {
    setGoals(goals.map(g =>
      g.id === goalId ? { ...g, favorite: !g.favorite } : g
    ));
  };

  // Drag and drop functions
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, goalId: number, node: HTMLDivElement) => {
    dragStartPosition.current = { x: e.clientX, y: e.clientY };
    dragNodeRef.current = node;

    setDraggedGoalId(goalId);
    setIsDragging(true);

    setTimeout(() => {
      if (dragNodeRef.current) {
        dragNodeRef.current.style.opacity = '0.4';
      }
    }, 0);

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(goalId));
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, goalId: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (draggedGoalId === goalId) return;

    setDragOverGoalId(goalId);

    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, goalId: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (draggedGoalId === goalId) return;

    setDragOverGoalId(goalId);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    setDragOverGoalId(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetGoalId: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (dragNodeRef.current) {
      dragNodeRef.current.style.opacity = '1';
    }

    if (draggedGoalId === null || draggedGoalId === targetGoalId) {
      setIsDragging(false);
      setDraggedGoalId(null);
      setDragOverGoalId(null);
      return;
    }

    const activeGoals = getActiveGoals();
    const draggedGoalIndex = activeGoals.findIndex(g => g.id === draggedGoalId);
    const targetGoalIndex = activeGoals.findIndex(g => g.id === targetGoalId);

    if (draggedGoalIndex < 0 || targetGoalIndex < 0) {
      setIsDragging(false);
      setDraggedGoalId(null);
      setDragOverGoalId(null);
      return;
    }

    const newActiveGoals = [...activeGoals];
    const [removed] = newActiveGoals.splice(draggedGoalIndex, 1);
    newActiveGoals.splice(targetGoalIndex, 0, removed);

    newActiveGoals.forEach((goal, idx) => {
      goal.order = idx + 1;
    });

    const archivedGoals = getArchivedGoals();
    setGoals([...newActiveGoals, ...archivedGoals]);

    setIsDragging(false);
    setDraggedGoalId(null);
    setDragOverGoalId(null);
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    if (dragNodeRef.current) {
      dragNodeRef.current.style.opacity = '1';
    }

    setIsDragging(false);
    setDraggedGoalId(null);
    setDragOverGoalId(null);
    dragNodeRef.current = null;
  };

  const activeGoals = sortGoals(getActiveGoals());
  const archivedGoals = getArchivedGoals();

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <h2 className="text-xl sm:text-2xl font-bold">Project Tracker</h2>
        <div className="flex items-center space-x-4 mt-2 sm:mt-0">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="bg-gray-800 text-white p-2 rounded text-sm"
          >
            <option value="default">Standard</option>
            <option value="alphabet">Alphabetisch</option>
            <option value="date">Nach Datum</option>
            <option value="difficulty">Level of difficulty</option>
          </select>
          <button
            onClick={addNewGoal}
            className="p-2 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
            aria-label="Add new project"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {activeGoals.map(goal => {
          const progress = goal.milestones.length
            ? Math.round(goal.milestones.filter(m => m.completed).length / goal.milestones.length * 100)
            : 0;

          const isDragged = draggedGoalId === goal.id;
          const isDraggedOver = dragOverGoalId === goal.id;

          return (
            <div
              key={goal.id}
              className={`bg-gray-700/50 p-3 sm:p-4 rounded-lg flex flex-col transition-all duration-200
                ${isDragged ? 'opacity-50' : 'opacity-100'}
                ${isDraggedOver ? 'border-2 border-blue-500 scale-105' : 'border border-transparent'}`}
              draggable={true}
              onDragStart={(e) => handleDragStart(e, goal.id, e.currentTarget)}
              onDragOver={(e) => handleDragOver(e, goal.id)}
              onDragEnter={(e) => handleDragEnter(e, goal.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, goal.id)}
              onDragEnd={handleDragEnd}
              style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            >
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
                      alt="Goal"
                      className="w-full h-24 sm:h-32 object-cover rounded"
                    />
                  ) : (
                    <div className="w-full h-24 sm:h-32 bg-gray-800 rounded flex items-center justify-center">
                      <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                    </div>
                  )}
                </label>
              </div>

              <div className="flex flex-col mb-3">
                <div className="flex justify-between items-center">
                  <input
                    type="text"
                    value={goal.name}
                    onChange={(e) => setGoals(goals.map(g =>
                      g.id === goal.id ? { ...g, name: e.target.value } : g
                    ))}
                    className="bg-transparent font-semibold text-sm sm:text-base outline-none max-w-full"
                  />
                </div>

                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs px-1 py-1 rounded bg-gray-800 whitespace-nowrap">
                    {goal.status}
                  </span>

                  <div className="flex items-center">
                    <button
                      onClick={() => toggleFavoriteGoal(goal.id)}
                      className={`p-1 hover:bg-gray-600 rounded ${goal.favorite ? 'text-yellow-400' : ''}`}
                      title="Toggle Favorite"
                      aria-label="Toggle favorite"
                    >
                      <Star className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                    <button
                      onClick={() => toggleArchiveGoal(goal.id)}
                      className="p-1 hover:bg-gray-600 rounded"
                      title="Toggle Archive"
                      aria-label="Toggle archive"
                    >
                      <Archive className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm("Möchtest du dieses Projekt wirklich löschen?")) {
                          deleteGoal(goal.id);
                        }
                      }}
                      className="p-1 hover:bg-gray-600 rounded"
                      aria-label="Delete project"
                    >
                      <X className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <span className="block text-xs sm:text-sm font-semibold mb-1">Level of difficulty</span>
                <DifficultyIndicator
                  value={goal.difficulty}
                  onChange={(newVal) => setGoals(goals.map(g =>
                    g.id === goal.id ? { ...g, difficulty: newVal } : g
                  ))}
                />
              </div>

              <div className="mb-3">
                <span className="block text-xs sm:text-sm font-semibold mb-1">Progress</span>
                <div className="w-full bg-gray-300 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
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
                    aria-label="Add task"
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

      {archivedGoals.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Archived Projects</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {archivedGoals.map(goal => {
              const progress = goal.milestones.length
                ? Math.round((goal.milestones.filter(m => m.completed).length / goal.milestones.length) * 100)
                : 0;
              return (
                <div
                  key={goal.id}
                  className="bg-gray-700/50 p-3 sm:p-4 rounded-lg flex flex-col opacity-70"
                >
                  <div className="relative mb-3 sm:mb-4">
                    {goal.image ? (
                      <img
                        src={goal.image}
                        alt="Goal"
                        className="w-full h-24 sm:h-32 object-cover rounded"
                      />
                    ) : (
                      <div className="w-full h-24 sm:h-32 bg-gray-800 rounded flex items-center justify-center">
                        <Plus className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col mb-3">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-sm sm:text-base">
                        {goal.name}
                      </span>
                    </div>

                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs px-1 py-1 rounded bg-gray-800 whitespace-nowrap">
                        {goal.status}
                      </span>

                      <div className="flex items-center">
                        <button
                          onClick={() => toggleArchiveGoal(goal.id)}
                          className="p-1 hover:bg-gray-600 rounded"
                          title="Toggle Archive"
                          aria-label="Unarchive project"
                        >
                          <Archive className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm("Möchtest du dieses archivierte Projekt wirklich löschen?")) {
                              deleteGoal(goal.id);
                            }
                          }}
                          className="p-1 hover:bg-gray-600 rounded"
                          aria-label="Delete project"
                        >
                          <X className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <span className="block text-xs sm:text-sm font-semibold mb-1">Level of difficulty</span>
                    <DifficultyIndicator
                      value={goal.difficulty}
                      onChange={(newVal) => setGoals(goals.map(g =>
                        g.id === goal.id ? { ...g, difficulty: newVal } : g
                      ))}
                    />
                  </div>

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
                      disabled
                      className="w-full bg-gray-800 rounded p-2 text-sm cursor-not-allowed"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectTracker;
