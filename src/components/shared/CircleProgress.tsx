import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import Note from '../shared/Note';
import Milestone from '../shared/Milestone';
import CircleProgress from '../shared/CircleProgress';

const GoalsTracker = () => {
  const [goals, setGoals] = useState([{
    id: 1,
    name: 'Goal 1',
    deadline: new Date().toISOString().split('T')[0],
    status: 'Not Started',
    image: null,
    milestones: [
      { id: 1, name: 'Research', completed: false },
      { id: 2, name: 'Implementation', completed: false }
    ],
    notes: []
  }]);

  const handleImageUpload = (goalId, event) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setGoals(goals.map(g =>
          g.id === goalId ? {...g, image: reader.result} : g
        ));
      };
      reader.readAsDataURL(file);
    }
  };

  const addNote = (goalId, note) => {
    if (!note.trim()) return;
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

  const calculateProgress = (goal) => {
    if (goal.milestones.length === 0) return 0;
    const completedMilestones = goal.milestones.filter(m => m.completed).length;
    return (completedMilestones / goal.milestones.length) * 100;
  };

  const updateGoalStatus = (goal) => {
    const hasStarted = goal.milestones.some(m => m.completed);
    const allCompleted = goal.milestones.every(m => m.completed);
    return allCompleted ? 'Completed' : (hasStarted ? 'In Progress' : 'Not Started');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Goals</h2>
        <button
          onClick={() => setGoals([...goals, {
            id: Date.now(),
            name: 'New Goal',
            deadline: new Date().toISOString().split('T')[0],
            status: 'Not Started',
            image: null,
            milestones: [],
            notes: []
          }])}
          className="p-2 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.map(goal => (
          <div
            key={goal.id}
            className="bg-gray-700/50 p-4 rounded-lg space-y-4 flex flex-col transition-all duration-300"
          >

            <div className="mb-4 relative">
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
                    className="w-full h-48 object-contain rounded bg-gray-800"
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-800 rounded flex items-center justify-center">
                    <Plus className="w-8 h-8 text-gray-400" />
                  </div>
                )}
              </label>

              <div className="absolute bottom-4 right-4 bg-gray-800/80 rounded-full p-1">
                <CircleProgress percentage={calculateProgress(goal)} />
              </div>
            </div>


            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <input
                type="text"
                value={goal.name}
                onChange={(e) => setGoals(goals.map(g =>
                  g.id === goal.id ? {...g, name: e.target.value} : g
                ))}
                className="bg-transparent font-semibold outline-none text-lg w-full sm:w-auto"
              />
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <input
                  type="date"
                  value={goal.deadline}
                  onChange={(e) => setGoals(goals.map(g =>
                    g.id === goal.id ? {...g, deadline: e.target.value} : g
                  ))}
                  className="bg-gray-800 p-2 rounded text-sm min-w-[130px]"
                />
                <span className="text-sm px-2 py-1 rounded bg-gray-800">
                  {goal.status}
                </span>
                <button
                  onClick={() => setGoals(goals.filter(g => g.id !== goal.id))}
                  className="p-1 hover:bg-gray-600 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Milestones */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold">Milestones</h3>
                <button
                  onClick={() => setGoals(goals.map(g =>
                    g.id === goal.id ? {
                      ...g,
                      milestones: [...g.milestones, {
                        id: Date.now(),
                        name: 'New Milestone',
                        completed: false
                      }]
                    } : g
                  ))}
                  className="p-1 hover:bg-gray-600 rounded"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {goal.milestones.map(milestone => (
                  <Milestone
                    key={milestone.id}
                    milestone={milestone}
                    onToggle={() => {
                      const updatedGoal = {
                        ...goal,
                        milestones: goal.milestones.map(m =>
                          m.id === milestone.id ? {...m, completed: !m.completed} : m
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
                            m.id === milestone.id ? {...m, name} : m
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

      
            <div className="flex-1 flex flex-col">
              <input
                type="text"
                placeholder="Add a note and press Enter..."
                className="w-full bg-gray-800 rounded p-2"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.target.value.trim()) {
                    addNote(goal.id, e.target.value.trim());
                    e.target.value = '';
                  }
                }}
              />
              <div className="flex-1 max-h-32 overflow-y-auto space-y-2 mt-2 pr-2 custom-scrollbar">
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
        ))}
      </div>
    </div>
  );
};

export default GoalsTracker;
