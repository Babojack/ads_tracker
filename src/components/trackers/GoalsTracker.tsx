import React, { useState, useRef, ChangeEvent } from 'react';
import { Plus, X, Star, Archive, Download, Upload } from 'lucide-react';
import Note from '../shared/Note';
import Milestone from '../shared/Milestone';
import { useIndexedDB } from './useIndexedDB';

interface MilestoneType {
  id: number;
  name: string;
  completed: boolean;
}

interface NoteType {
  id: number;
  text: string;
  timestamp: string;
}

interface Goal {
  id: number;
  name: string;
  deadline: string;
  status: string;
  image: string | null;
  difficulty: number;
  milestones: MilestoneType[];
  notes: NoteType[];
  order: number;
  archived: boolean;
  favorite: boolean;
}

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
          title={`Priority Level ${circle}`}
        />
      ))}
    </div>
  );
};

type SortOption = 'default' | 'alphabet' | 'date' | 'difficulty';

const GoalTracker: React.FC = () => {
  // Verwende useIndexedDB statt useLocalStorage.
  const [goals, setGoals] = useIndexedDB<Goal[]>('projectGoals', [{
    id: 1,
    name: 'New Goal',
    deadline: new Date().toISOString(),
    status: 'Not Started',
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

  const [draggedGoalId, setDraggedGoalId] = useState<number | null>(null);
  const [dragOverGoalId, setDragOverGoalId] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragNodeRef = useRef<HTMLDivElement | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('default');

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

  const handleImageUpload = (goalId: number, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Image = reader.result as string;
        setGoals(currentGoals =>
          currentGoals.map(g =>
            g.id === goalId ? { ...g, image: base64Image } : g
          )
        );
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
    const newGoal: Goal = {
      id: Date.now(),
      name: 'New Goal',
      deadline: new Date().toISOString(),
      status: 'Not Started',
      image: null,
      difficulty: 3,
      milestones: [],
      notes: [],
      order: goals.length + 1,
      archived: false,
      favorite: false
    };
    setGoals([...goals, newGoal]);
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

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, goalId: number, node: HTMLDivElement) => {
    setDraggedGoalId(goalId);
    dragNodeRef.current = node;
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
    if (draggedGoalId === goalId) return;
    setDragOverGoalId(goalId);
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, goalId: number) => {
    e.preventDefault();
    if (draggedGoalId === goalId) return;
    setDragOverGoalId(goalId);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOverGoalId(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetGoalId: number) => {
    e.preventDefault();
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

  // Neue Funktionen zum Export/Import des Fortschritts
  const handleExportProgress = () => {
    try {
      const exportObj = { goals };
      const jsonStr = JSON.stringify(exportObj, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'goals_progress_backup.json';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error during export');
      console.error(err);
    }
  };

  const handleImportProgress = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = reader.result as string;
        const data = JSON.parse(json);
        if (!Array.isArray(data.goals)) {
          throw new Error('Invalid JSON format: goals missing');
        }
        setGoals(data.goals);
        alert('Import successful!');
      } catch (err) {
        alert('Error during import!');
        console.error(err);
      }
    };
    reader.readAsText(file);
  };

  const activeGoals = sortGoals(getActiveGoals());
  const archivedGoals = getArchivedGoals();

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <h2 className="text-xl sm:text-2xl font-bold">Goals Tracker</h2>
        <div className="flex items-center space-x-4 mt-2 sm:mt-0">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="bg-gray-800 text-white p-2 rounded text-sm"
          >
            <option value="default">Default</option>
            <option value="alphabet">Alphabetical</option>
            <option value="date">By Date</option>
            <option value="difficulty">By Priority</option>
          </select>
          <button
            onClick={addNewGoal}
            className="p-2 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
            aria-label="Add new goal"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Export/Import Progress Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <div className="flex flex-wrap gap-3 items-center">
          <button
            onClick={handleExportProgress}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Download size={18} /> Export Progress
          </button>
          <label className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 cursor-pointer">
            <Upload size={18} /> Import Progress
            <input type="file" accept=".json" onChange={handleImportProgress} className="hidden" />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {activeGoals.map(goal => {
          const progress = goal.milestones.length
            ? Math.round((goal.milestones.filter(m => m.completed).length / goal.milestones.length) * 100)
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
                <label htmlFor={`goal-${goal.id}`} className="cursor-pointer block">
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
                        if (window.confirm("Are you sure you want to delete this goal?")) {
                          deleteGoal(goal.id);
                        }
                      }}
                      className="p-1 hover:bg-gray-600 rounded"
                      aria-label="Delete goal"
                    >
                      <X className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="mb-3">
                <span className="block text-xs sm:text-sm font-semibold mb-1">Priority</span>
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
                  placeholder="Comments"
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
          <h3 className="text-lg font-semibold mb-4">Archived Goals</h3>
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
                          aria-label="Unarchive goal"
                        >
                          <Archive className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm("Are you sure you want to delete this goal?")) {
                              deleteGoal(goal.id);
                            }
                          }}
                          className="p-1 hover:bg-gray-600 rounded"
                          aria-label="Delete goal"
                        >
                          <X className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="mb-3">
                    <span className="block text-xs sm:text-sm font-semibold mb-1">Priority</span>
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

export default GoalTracker;
