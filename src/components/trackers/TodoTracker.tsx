import React, { useState, useEffect } from 'react';
import { Plus, X, Trash2, Filter, ArrowUp, ArrowDown, Circle, Archive, ArchiveRestore } from 'lucide-react';

type PriorityLevel = 'high' | 'medium' | 'low' | 'none';

interface TodoNote {
  id: number;
  text: string;
  timestamp: string;
}

interface Todo {
  id: number;
  text: string;
  completed: boolean;
  notes: TodoNote[];
  priority: PriorityLevel;
  archived: boolean;
}

interface TodoGroup {
  id: number;
  title: string;
  todos: Todo[];
}

interface FilterOptions {
  showCompleted: boolean;
  priorityFilter: PriorityLevel | 'all';
  searchText: string;
  viewArchived: boolean;
}

const useLocalStorage = <T,>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });
  const setValue = (value: T | ((prev: T) => T)) => {
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

const TodoTracker: React.FC = () => {
  const [todoGroups, setTodoGroups] = useLocalStorage<TodoGroup[]>('todoGroups', [
    {
      id: Date.now(),
      title: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      todos: []
    }
  ]);
  const [newTaskInputs, setNewTaskInputs] = useState<{ [key: number]: string }>({});
  const [selectedPriorities, setSelectedPriorities] = useState<{ [key: number]: PriorityLevel }>({});
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    showCompleted: true,
    priorityFilter: 'all',
    searchText: '',
    viewArchived: false
  });
  const [showFilters, setShowFilters] = useState(false);

  // Updated the priority ranking to ensure proper sorting
  const getPriorityRank = (priority: PriorityLevel): number => {
    switch(priority) {
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0; // 'none'
    }
  };

  const addNewGroup = () => {
    const newGroup = {
      id: Date.now(),
      title: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      todos: []
    };
    setTodoGroups([newGroup, ...todoGroups]);
    setSelectedPriorities(prev => ({ ...prev, [newGroup.id]: 'none' }));
  };

  const deleteGroup = (groupId: number) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this group?');
    if (confirmDelete) {
      setTodoGroups(prevGroups => prevGroups.filter(group => group.id !== groupId));
      setSelectedPriorities(prev => {
        const newState = { ...prev };
        delete newState[groupId];
        return newState;
      });
      setNewTaskInputs(prev => {
        const newState = { ...prev };
        delete newState[groupId];
        return newState;
      });
    }
  };

  const addTodo = (groupId: number) => {
    const text = newTaskInputs[groupId] || '';
    if (text.trim()) {
      const newTodo: Todo = {
        id: Date.now(),
        text: text.trim(),
        completed: false,
        notes: [],
        priority: selectedPriorities[groupId] || 'none',
        archived: false
      };
      setTodoGroups(prevGroups =>
        prevGroups.map(group =>
          group.id === groupId
            ? { ...group, todos: [newTodo, ...group.todos].sort((a, b) => getPriorityRank(b.priority) - getPriorityRank(a.priority)) }
            : group
        )
      );
      setNewTaskInputs(prev => ({ ...prev, [groupId]: '' }));
    }
  };

  const toggleTodo = (groupId: number, todoId: number) => {
    setTodoGroups(prevGroups =>
      prevGroups.map(group =>
        group.id === groupId
          ? {
              ...group,
              todos: group.todos.map(todo =>
                todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
              ).sort((a, b) => getPriorityRank(b.priority) - getPriorityRank(a.priority))
            }
          : group
      )
    );
  };

  const addNote = (groupId: number, todoId: number, noteText: string) => {
    if (noteText.trim()) {
      setTodoGroups(prevGroups =>
        prevGroups.map(group =>
          group.id === groupId
            ? {
                ...group,
                todos: group.todos.map(todo =>
                  todo.id === todoId
                    ? {
                        ...todo,
                        notes: [
                          ...todo.notes,
                          { id: Date.now(), text: noteText.trim(), timestamp: new Date().toISOString() }
                        ]
                      }
                    : todo
                )
              }
            : group
        )
      );
    }
  };

  const deleteTodo = (groupId: number, todoId: number) => {
    setTodoGroups(prevGroups =>
      prevGroups.map(group =>
        group.id === groupId
          ? { ...group, todos: group.todos.filter(todo => todo.id !== todoId) }
          : group
      )
    );
  };

  const archiveTodo = (groupId: number, todoId: number) => {
    setTodoGroups(prevGroups =>
      prevGroups.map(group =>
        group.id === groupId
          ? {
              ...group,
              todos: group.todos.map(todo =>
                todo.id === todoId ? { ...todo, archived: true } : todo
              ).sort((a, b) => getPriorityRank(b.priority) - getPriorityRank(a.priority))
            }
          : group
      )
    );
  };

  const unarchiveTodo = (groupId: number, todoId: number) => {
    setTodoGroups(prevGroups =>
      prevGroups.map(group =>
        group.id === groupId
          ? {
              ...group,
              todos: group.todos.map(todo =>
                todo.id === todoId ? { ...todo, archived: false } : todo
              ).sort((a, b) => getPriorityRank(b.priority) - getPriorityRank(a.priority))
            }
          : group
      )
    );
  };

  const deleteNote = (groupId: number, todoId: number, noteId: number) => {
    setTodoGroups(prevGroups =>
      prevGroups.map(group =>
        group.id === groupId
          ? {
              ...group,
              todos: group.todos.map(todo =>
                todo.id === todoId
                  ? { ...todo, notes: todo.notes.filter(note => note.id !== noteId) }
                  : todo
              )
            }
          : group
      )
    );
  };

  const setPriority = (groupId: number, todoId: number, priority: PriorityLevel) => {
    setTodoGroups(prevGroups =>
      prevGroups.map(group =>
        group.id === groupId
          ? {
              ...group,
              todos: group.todos.map(todo =>
                todo.id === todoId ? { ...todo, priority } : todo
              ).sort((a, b) => getPriorityRank(b.priority) - getPriorityRank(a.priority))
            }
          : group
      )
    );
  };

  const getPriorityDisplay = (priority: PriorityLevel) => {
    switch (priority) {
      case 'high':
        return { icon: <ArrowUp className="w-4 h-4 text-red-500" />, color: 'bg-red-500/20', borderColor: 'border-red-500' };
      case 'medium':
        return { icon: <Circle className="w-4 h-4 text-yellow-500" />, color: 'bg-yellow-500/20', borderColor: 'border-yellow-500' };
      case 'low':
        return { icon: <ArrowDown className="w-4 h-4 text-green-500" />, color: 'bg-green-500/20', borderColor: 'border-green-500' };
      default:
        return { icon: null, color: '', borderColor: 'border-transparent' };
    }
  };

  const getFilteredTodos = (todos: Todo[], archived: boolean) => {
    return todos
      .filter(todo => {
        if (todo.archived !== archived) return false;
        if (!filterOptions.showCompleted && todo.completed) return false;
        if (filterOptions.priorityFilter !== 'all' && todo.priority !== filterOptions.priorityFilter) return false;
        if (
          filterOptions.searchText &&
          !todo.text.toLowerCase().includes(filterOptions.searchText.toLowerCase()) &&
          !todo.notes.some(note => note.text.toLowerCase().includes(filterOptions.searchText.toLowerCase()))
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => getPriorityRank(b.priority) - getPriorityRank(a.priority));
  };

  const hasArchivedTasks = todoGroups.some(group => group.todos.some(todo => todo.archived));

  // Add a clearer visual indicator that users can access archived tasks
  const archivedTasksCount = todoGroups.reduce(
    (count, group) => count + group.todos.filter(todo => todo.archived).length,
    0
  );

  React.useEffect(() => {
    const updatedPriorities = { ...selectedPriorities };
    let hasChanges = false;
    todoGroups.forEach(group => {
      if (!(group.id in updatedPriorities)) {
        updatedPriorities[group.id] = 'none';
        hasChanges = true;
      }
    });
    if (hasChanges) {
      setSelectedPriorities(updatedPriorities);
    }
  }, [todoGroups]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold">ToDo's</h2>
        <div className="flex gap-2">
          <button onClick={() => setShowFilters(!showFilters)} className="p-1.5 sm:p-2 bg-purple-500 rounded hover:bg-purple-600 transition-colors relative" title="Filter Tasks">
            <Filter className="w-4 h-4 sm:w-5 sm:h-5" />
            {(filterOptions.showCompleted === false || filterOptions.priorityFilter !== 'all' || filterOptions.searchText) && (
              <span className="absolute -top-1 -right-1 bg-red-500 rounded-full w-2 h-2"></span>
            )}
          </button>
          <button onClick={addNewGroup} className="p-1.5 sm:p-2 bg-blue-500 rounded hover:bg-blue-600 transition-colors" title="Add New Group">
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Archive Counter - Show only when there are archived tasks and not viewing them */}
      {!filterOptions.viewArchived && archivedTasksCount > 0 && (
        <div className="bg-gray-700 rounded-lg p-3 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-yellow-500" />
            <span className="text-gray-300">You have {archivedTasksCount} archived task{archivedTasksCount !== 1 ? 's' : ''}</span>
          </div>
          <button
            onClick={() => setFilterOptions({ ...filterOptions, viewArchived: true })}
            className="px-3 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-200 rounded text-sm transition-colors"
          >
            View Archive
          </button>
        </div>
      )}

      {showFilters && (
        <div className="bg-gray-800 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
          <h3 className="text-lg font-semibold mb-3">Filter Options</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Search</label>
              <input type="text" value={filterOptions.searchText} onChange={(e) => setFilterOptions({ ...filterOptions, searchText: e.target.value })} placeholder="Search tasks and notes..." className="w-full bg-gray-700 p-2 rounded text-sm" />
            </div>
            <div>
              <label className="block text-sm mb-1">Show Tasks</label>
              <div className="flex gap-2">
                <button onClick={() => setFilterOptions({ ...filterOptions, showCompleted: true })} className={`px-3 py-1 rounded text-sm ${filterOptions.showCompleted ? 'bg-blue-500' : 'bg-gray-700'}`}>All</button>
                <button onClick={() => setFilterOptions({ ...filterOptions, showCompleted: false })} className={`px-3 py-1 rounded text-sm ${!filterOptions.showCompleted ? 'bg-blue-500' : 'bg-gray-700'}`}>Active Only</button>
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1">Priority</label>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setFilterOptions({ ...filterOptions, priorityFilter: 'all' })} className={`px-3 py-1 rounded text-sm ${filterOptions.priorityFilter === 'all' ? 'bg-blue-500' : 'bg-gray-700'}`}>All</button>
                <button onClick={() => setFilterOptions({ ...filterOptions, priorityFilter: 'high' })} className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${filterOptions.priorityFilter === 'high' ? 'bg-blue-500' : 'bg-gray-700'}`}>
                  <ArrowUp className="w-3 h-3 text-red-500" /> High
                </button>
                <button onClick={() => setFilterOptions({ ...filterOptions, priorityFilter: 'medium' })} className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${filterOptions.priorityFilter === 'medium' ? 'bg-blue-500' : 'bg-gray-700'}`}>
                  <Circle className="w-3 h-3 text-yellow-500" /> Medium
                </button>
                <button onClick={() => setFilterOptions({ ...filterOptions, priorityFilter: 'low' })} className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${filterOptions.priorityFilter === 'low' ? 'bg-blue-500' : 'bg-gray-700'}`}>
                  <ArrowDown className="w-3 h-3 text-green-500" /> Low
                </button>
                <button onClick={() => setFilterOptions({ ...filterOptions, priorityFilter: 'none' })} className={`px-3 py-1 rounded text-sm ${filterOptions.priorityFilter === 'none' ? 'bg-blue-500' : 'bg-gray-700'}`}>No Priority</button>
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1">Archive View</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterOptions({ ...filterOptions, viewArchived: false })}
                  className={`px-3 py-1 rounded text-sm ${!filterOptions.viewArchived ? 'bg-blue-500' : 'bg-gray-700'}`}
                >
                  Active Tasks
                </button>
                <button
                  onClick={() => setFilterOptions({ ...filterOptions, viewArchived: true })}
                  className={`px-3 py-1 rounded text-sm ${filterOptions.viewArchived ? 'bg-blue-500' : 'bg-gray-700'}`}
                >
                  Archived Tasks
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={() => setFilterOptions({ showCompleted: true, priorityFilter: 'all', searchText: '', viewArchived: false })} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm">Reset Filters</button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Banner */}
      {filterOptions.viewArchived && (
        <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-yellow-500" />
            <span className="text-yellow-100 font-medium">Showing archived tasks</span>
          </div>
          <button
            onClick={() => setFilterOptions({ ...filterOptions, viewArchived: false })}
            className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-sm"
          >
            Return to active tasks
          </button>
        </div>
      )}

      {/* No archived tasks message */}
      {filterOptions.viewArchived && !hasArchivedTasks && (
        <div className="bg-gray-800 rounded-lg p-8 text-center mb-4">
          <Archive className="w-10 h-10 text-gray-500 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-300 mb-1">No archived tasks</h3>
          <p className="text-gray-500">You don't have any archived tasks yet.</p>
        </div>
      )}

      <div className="grid gap-4 sm:gap-6">
        {todoGroups.map(group => (
          <div key={group.id} className="bg-gray-800 rounded-lg p-3 sm:p-4 relative">
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <h3 className="text-lg sm:text-xl font-semibold break-words">{group.title}</h3>
              {todoGroups.length > 1 && (
                <button onClick={() => deleteGroup(group.id)} className="text-red-500 hover:bg-red-500/20 p-1.5 rounded transition-colors" title="Delete Group">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Show input only in active tasks view */}
            {!filterOptions.viewArchived && (
              <div className="space-y-2 sm:space-y-3 mb-4">
                <div className="space-y-2">
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => setSelectedPriorities({ ...selectedPriorities, [group.id]: 'high' })} className={`p-1.5 rounded-full ${selectedPriorities[group.id] === 'high' ? 'bg-red-500/50 ring-2 ring-red-500' : 'bg-gray-700 hover:bg-gray-600'}`} title="High Priority">
                      <ArrowUp className="w-5 h-5 text-red-500" />
                    </button>
                    <button onClick={() => setSelectedPriorities({ ...selectedPriorities, [group.id]: 'medium' })} className={`p-1.5 rounded-full ${selectedPriorities[group.id] === 'medium' ? 'bg-yellow-500/50 ring-2 ring-yellow-500' : 'bg-gray-700 hover:bg-gray-600'}`} title="Medium Priority">
                      <Circle className="w-5 h-5 text-yellow-500" />
                    </button>
                    <button onClick={() => setSelectedPriorities({ ...selectedPriorities, [group.id]: 'low' })} className={`p-1.5 rounded-full ${selectedPriorities[group.id] === 'low' ? 'bg-green-500/50 ring-2 ring-green-500' : 'bg-gray-700 hover:bg-gray-600'}`} title="Low Priority">
                      <ArrowDown className="w-5 h-5 text-green-500" />
                    </button>
                    <button onClick={() => setSelectedPriorities({ ...selectedPriorities, [group.id]: 'none' })} className={`p-1.5 rounded-full ${selectedPriorities[group.id] === 'none' ? 'bg-blue-500/50 ring-2 ring-blue-500' : 'bg-gray-700 hover:bg-gray-600'}`} title="No Priority">
                      <X className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input type="text" placeholder="Add new task..." value={newTaskInputs[group.id] || ''} onChange={(e) => setNewTaskInputs({ ...newTaskInputs, [group.id]: e.target.value })} className={`flex-1 bg-gray-700 p-2 rounded text-sm sm:text-base placeholder:text-gray-400 border-2 ${getPriorityDisplay(selectedPriorities[group.id] || 'none').borderColor}`} onKeyDown={(e) => { if (e.key === 'Enter' && newTaskInputs[group.id]?.trim()) { addTodo(group.id); } }} />
                    <button onClick={() => addTodo(group.id)} className="p-2 bg-blue-500 rounded hover:bg-blue-600 transition-colors">
                      <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2 sm:space-y-3">
              {getFilteredTodos(group.todos, filterOptions.viewArchived).map(todo => {
                const priorityDisplay = getPriorityDisplay(todo.priority);
                return (
                  <div key={todo.id} className={`bg-gray-700/50 p-3 sm:p-4 rounded-lg space-y-2 ${priorityDisplay.color}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2 min-w-0 flex-1">
                        <input type="checkbox" checked={todo.completed} onChange={() => toggleTodo(group.id, todo.id)} className="w-4 h-4 rounded shrink-0" />
                        <span className={`${todo.completed ? 'line-through text-gray-400' : ''} break-words text-sm sm:text-base`}>{todo.text}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="flex border border-gray-600 rounded overflow-hidden">
                          <button onClick={() => setPriority(group.id, todo.id, 'high')} className={`p-1 ${todo.priority === 'high' ? 'bg-red-500/30' : 'hover:bg-gray-600'}`} title="High Priority">
                            <ArrowUp className={`w-3 h-3 ${todo.priority === 'high' ? 'text-red-400' : 'text-red-500'}`} />
                          </button>
                          <button onClick={() => setPriority(group.id, todo.id, 'medium')} className={`p-1 ${todo.priority === 'medium' ? 'bg-yellow-500/30' : 'hover:bg-gray-600'}`} title="Medium Priority">
                            <Circle className={`w-3 h-3 ${todo.priority === 'medium' ? 'text-yellow-400' : 'text-yellow-500'}`} />
                          </button>
                          <button onClick={() => setPriority(group.id, todo.id, 'low')} className={`p-1 ${todo.priority === 'low' ? 'bg-green-500/30' : 'hover:bg-gray-600'}`} title="Low Priority">
                            <ArrowDown className={`w-3 h-3 ${todo.priority === 'low' ? 'text-green-400' : 'text-green-500'}`} />
                          </button>
                          <button onClick={() => setPriority(group.id, todo.id, 'none')} className={`p-1 ${todo.priority === 'none' ? 'bg-gray-500/30' : 'hover:bg-gray-600'}`} title="No Priority">
                            <X className="w-3 h-3 text-gray-400" />
                          </button>
                        </div>

                        {/* Archive/Unarchive Button */}
                        {todo.archived ? (
                          <button onClick={() => unarchiveTodo(group.id, todo.id)} className="p-1 hover:bg-gray-600 rounded shrink-0" title="Restore Task">
                            <ArchiveRestore className="w-4 h-4 text-blue-400" />
                          </button>
                        ) : (
                          <button onClick={() => archiveTodo(group.id, todo.id)} className="p-1 hover:bg-gray-600 rounded shrink-0" title="Archive Task">
                            <Archive className="w-4 h-4" />
                          </button>
                        )}

                        <button onClick={() => deleteTodo(group.id, todo.id)} className="p-1 hover:bg-gray-600 rounded shrink-0" title="Delete Task">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <input type="text" placeholder="Add a note and press Enter..." className="w-full bg-gray-800 p-2 rounded text-sm placeholder:text-gray-400" onKeyUp={(e) => { if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) { addNote(group.id, todo.id, (e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value = ''; } }} />
                    <div className="space-y-2 ml-4 sm:ml-6">
                      {todo.notes.map(note => (
                        <div key={note.id} className="text-sm text-gray-400 flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="break-words">{note.text}</div>
                            <span className="text-xs opacity-75 block sm:inline sm:ml-2">{new Date(note.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <button onClick={() => deleteNote(group.id, todo.id, note.id)} className="p-1 hover:bg-gray-600 rounded shrink-0">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {getFilteredTodos(group.todos, filterOptions.viewArchived).length === 0 && (
                <div className="text-center py-6 text-gray-500">
                  {group.todos.filter(todo => todo.archived === filterOptions.viewArchived).length === 0
                    ? filterOptions.viewArchived
                      ? "No archived tasks in this group."
                      : "No active tasks yet. Add your first task above!"
                    : "No tasks match your current filters."
                  }
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TodoTracker;
