import React, { useState } from 'react';
import { Plus, X, Trash2, Filter, ArrowUp, ArrowDown, Circle } from 'lucide-react';

// Define priority levels
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
}

interface TodoGroup {
  id: number;
  title: string;
  todos: Todo[];
}

// Filter options interface
interface FilterOptions {
  showCompleted: boolean;
  priorityFilter: PriorityLevel | 'all';
  searchText: string;
}

// Custom Hook for localStorage
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
      title: new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      todos: []
    }
  ]);

  // State for new task input
  const [newTaskInputs, setNewTaskInputs] = useState<{[key: number]: string}>({});

  // State for selected priority when creating a new task
  const [selectedPriorities, setSelectedPriorities] = useState<{[key: number]: PriorityLevel}>({});

  // Filter state
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    showCompleted: true,
    priorityFilter: 'all',
    searchText: '',
  });

  // State for filter panel visibility
  const [showFilters, setShowFilters] = useState(false);

  const addNewGroup = () => {
    const newGroup = {
      id: Date.now(),
      title: new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      todos: []
    };
    setTodoGroups([newGroup, ...todoGroups]);
    // Initialize selected priority for new group
    setSelectedPriorities(prev => ({...prev, [newGroup.id]: 'none'}));
  };

  const deleteGroup = (groupId: number) => {
    // Confirm deletion to prevent accidental removal
    const confirmDelete = window.confirm('Are you sure you want to delete this group?');
    if (confirmDelete) {
      setTodoGroups(prevGroups =>
        prevGroups.filter(group => group.id !== groupId)
      );
      // Clean up state for this group
      setSelectedPriorities(prev => {
        const newState = {...prev};
        delete newState[groupId];
        return newState;
      });
      setNewTaskInputs(prev => {
        const newState = {...prev};
        delete newState[groupId];
        return newState;
      });
    }
  };

  const addTodo = (groupId: number) => {
    const text = newTaskInputs[groupId] || '';
    if (text.trim()) {
      const newTodo = {
        id: Date.now(),
        text: text.trim(),
        completed: false,
        notes: [],
        priority: selectedPriorities[groupId] || 'none' as PriorityLevel
      };

      setTodoGroups(prevGroups =>
        prevGroups.map(group =>
          group.id === groupId
            ? { ...group, todos: [newTodo, ...group.todos] }
            : group
        )
      );

      // Clear input after adding
      setNewTaskInputs(prev => ({...prev, [groupId]: ''}));
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
              )
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
                          {
                            id: Date.now(),
                            text: noteText.trim(),
                            timestamp: new Date().toISOString()
                          }
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

  // Function to set priority of existing todo
  const setPriority = (groupId: number, todoId: number, priority: PriorityLevel) => {
    setTodoGroups(prevGroups =>
      prevGroups.map(group =>
        group.id === groupId
          ? {
              ...group,
              todos: group.todos.map(todo =>
                todo.id === todoId ? { ...todo, priority } : todo
              )
            }
          : group
      )
    );
  };

  // Helper function to get priority icon and color
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

  // Filter todos based on filter options
  const getFilteredTodos = (todos: Todo[]) => {
    return todos.filter(todo => {
      // Filter by completion status
      if (!filterOptions.showCompleted && todo.completed) {
        return false;
      }

      // Filter by priority
      if (filterOptions.priorityFilter !== 'all' && todo.priority !== filterOptions.priorityFilter) {
        return false;
      }

      // Filter by search text
      if (
        filterOptions.searchText &&
        !todo.text.toLowerCase().includes(filterOptions.searchText.toLowerCase()) &&
        !todo.notes.some(note =>
          note.text.toLowerCase().includes(filterOptions.searchText.toLowerCase())
        )
      ) {
        return false;
      }

      return true;
    });
  };

  // Initialize selected priority for any groups that don't have it yet
  React.useEffect(() => {
    const updatedPriorities = {...selectedPriorities};
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
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-1.5 sm:p-2 bg-purple-500 rounded hover:bg-purple-600 transition-colors relative"
            title="Filter Tasks"
          >
            <Filter className="w-4 h-4 sm:w-5 sm:h-5" />
            {(filterOptions.showCompleted === false ||
              filterOptions.priorityFilter !== 'all' ||
              filterOptions.searchText) && (
              <span className="absolute -top-1 -right-1 bg-red-500 rounded-full w-2 h-2"></span>
            )}
          </button>
          <button
            onClick={addNewGroup}
            className="p-1.5 sm:p-2 bg-blue-500 rounded hover:bg-blue-600 transition-colors"
            title="Add New Group"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-gray-800 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
          <h3 className="text-lg font-semibold mb-3">Filter Options</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Search</label>
              <input
                type="text"
                value={filterOptions.searchText}
                onChange={(e) => setFilterOptions({...filterOptions, searchText: e.target.value})}
                placeholder="Search tasks and notes..."
                className="w-full bg-gray-700 p-2 rounded text-sm"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Show Tasks</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterOptions({...filterOptions, showCompleted: true})}
                  className={`px-3 py-1 rounded text-sm ${filterOptions.showCompleted ? 'bg-blue-500' : 'bg-gray-700'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterOptions({...filterOptions, showCompleted: false})}
                  className={`px-3 py-1 rounded text-sm ${!filterOptions.showCompleted ? 'bg-blue-500' : 'bg-gray-700'}`}
                >
                  Active Only
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1">Priority</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterOptions({...filterOptions, priorityFilter: 'all'})}
                  className={`px-3 py-1 rounded text-sm ${filterOptions.priorityFilter === 'all' ? 'bg-blue-500' : 'bg-gray-700'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterOptions({...filterOptions, priorityFilter: 'high'})}
                  className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${filterOptions.priorityFilter === 'high' ? 'bg-blue-500' : 'bg-gray-700'}`}
                >
                  <ArrowUp className="w-3 h-3 text-red-500" /> High
                </button>
                <button
                  onClick={() => setFilterOptions({...filterOptions, priorityFilter: 'medium'})}
                  className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${filterOptions.priorityFilter === 'medium' ? 'bg-blue-500' : 'bg-gray-700'}`}
                >
                  <Circle className="w-3 h-3 text-yellow-500" /> Medium
                </button>
                <button
                  onClick={() => setFilterOptions({...filterOptions, priorityFilter: 'low'})}
                  className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${filterOptions.priorityFilter === 'low' ? 'bg-blue-500' : 'bg-gray-700'}`}
                >
                  <ArrowDown className="w-3 h-3 text-green-500" /> Low
                </button>
                <button
                  onClick={() => setFilterOptions({...filterOptions, priorityFilter: 'none'})}
                  className={`px-3 py-1 rounded text-sm ${filterOptions.priorityFilter === 'none' ? 'bg-blue-500' : 'bg-gray-700'}`}
                >
                  No Priority
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => {
                  setFilterOptions({
                    showCompleted: true,
                    priorityFilter: 'all',
                    searchText: ''
                  });
                }}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:gap-6">
        {todoGroups.map(group => (
          <div key={group.id} className="bg-gray-800 rounded-lg p-3 sm:p-4 relative">
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <h3 className="text-lg sm:text-xl font-semibold break-words">
                {group.title}
              </h3>
              {todoGroups.length > 1 && (
                <button
                  onClick={() => deleteGroup(group.id)}
                  className="text-red-500 hover:bg-red-500/20 p-1.5 rounded transition-colors"
                  title="Delete Group"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="space-y-2 sm:space-y-3">
              <div className="space-y-2">
                {/* Priority selection and input */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setSelectedPriorities({...selectedPriorities, [group.id]: 'high'})}
                    className={`p-1.5 rounded-full ${selectedPriorities[group.id] === 'high' ? 'bg-red-500/50 ring-2 ring-red-500' : 'bg-gray-700 hover:bg-gray-600'}`}
                    title="High Priority"
                  >
                    <ArrowUp className="w-5 h-5 text-red-500" />
                  </button>
                  <button
                    onClick={() => setSelectedPriorities({...selectedPriorities, [group.id]: 'medium'})}
                    className={`p-1.5 rounded-full ${selectedPriorities[group.id] === 'medium' ? 'bg-yellow-500/50 ring-2 ring-yellow-500' : 'bg-gray-700 hover:bg-gray-600'}`}
                    title="Medium Priority"
                  >
                    <Circle className="w-5 h-5 text-yellow-500" />
                  </button>
                  <button
                    onClick={() => setSelectedPriorities({...selectedPriorities, [group.id]: 'low'})}
                    className={`p-1.5 rounded-full ${selectedPriorities[group.id] === 'low' ? 'bg-green-500/50 ring-2 ring-green-500' : 'bg-gray-700 hover:bg-gray-600'}`}
                    title="Low Priority"
                  >
                    <ArrowDown className="w-5 h-5 text-green-500" />
                  </button>
                  <button
                    onClick={() => setSelectedPriorities({...selectedPriorities, [group.id]: 'none'})}
                    className={`p-1.5 rounded-full ${selectedPriorities[group.id] === 'none' ? 'bg-blue-500/50 ring-2 ring-blue-500' : 'bg-gray-700 hover:bg-gray-600'}`}
                    title="No Priority"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add new task..."
                    value={newTaskInputs[group.id] || ''}
                    onChange={(e) => setNewTaskInputs({...newTaskInputs, [group.id]: e.target.value})}
                    className={`flex-1 bg-gray-700 p-2 rounded text-sm sm:text-base placeholder:text-gray-400 border-2 ${getPriorityDisplay(selectedPriorities[group.id] || 'none').borderColor}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newTaskInputs[group.id]?.trim()) {
                        addTodo(group.id);
                      }
                    }}
                  />
                  <button
                    onClick={() => addTodo(group.id)}
                    className="p-2 bg-blue-500 rounded hover:bg-blue-600 transition-colors"
                  >
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 sm:space-y-3">
                {getFilteredTodos(group.todos).map(todo => {
                  const priorityDisplay = getPriorityDisplay(todo.priority);

                  return (
                    <div
                      key={todo.id}
                      className={`bg-gray-700/50 p-3 sm:p-4 rounded-lg space-y-2 ${priorityDisplay.color}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={todo.completed}
                            onChange={() => toggleTodo(group.id, todo.id)}
                            className="w-4 h-4 rounded shrink-0"
                          />
                          <span className={`${todo.completed ? 'line-through text-gray-400' : ''} break-words text-sm sm:text-base`}>
                            {todo.text}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {/* Priority buttons for existing tasks */}
                          <div className="flex border border-gray-600 rounded overflow-hidden">
                            <button
                              onClick={() => setPriority(group.id, todo.id, 'high')}
                              className={`p-1 ${todo.priority === 'high' ? 'bg-red-500/30' : 'hover:bg-gray-600'}`}
                              title="High Priority"
                            >
                              <ArrowUp className={`w-3 h-3 ${todo.priority === 'high' ? 'text-red-400' : 'text-red-500'}`} />
                            </button>
                            <button
                              onClick={() => setPriority(group.id, todo.id, 'medium')}
                              className={`p-1 ${todo.priority === 'medium' ? 'bg-yellow-500/30' : 'hover:bg-gray-600'}`}
                              title="Medium Priority"
                            >
                              <Circle className={`w-3 h-3 ${todo.priority === 'medium' ? 'text-yellow-400' : 'text-yellow-500'}`} />
                            </button>
                            <button
                              onClick={() => setPriority(group.id, todo.id, 'low')}
                              className={`p-1 ${todo.priority === 'low' ? 'bg-green-500/30' : 'hover:bg-gray-600'}`}
                              title="Low Priority"
                            >
                              <ArrowDown className={`w-3 h-3 ${todo.priority === 'low' ? 'text-green-400' : 'text-green-500'}`} />
                            </button>
                            <button
                              onClick={() => setPriority(group.id, todo.id, 'none')}
                              className={`p-1 ${todo.priority === 'none' ? 'bg-gray-500/30' : 'hover:bg-gray-600'}`}
                              title="No Priority"
                            >
                              <X className="w-3 h-3 text-gray-400" />
                            </button>
                          </div>

                          <button
                            onClick={() => deleteTodo(group.id, todo.id)}
                            className="p-1 hover:bg-gray-600 rounded shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <input
                        type="text"
                        placeholder="Add a note and press Enter..."
                        className="w-full bg-gray-800 p-2 rounded text-sm placeholder:text-gray-400"
                        onKeyUp={(e) => {
                          if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                            addNote(group.id, todo.id, (e.target as HTMLInputElement).value);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }}
                      />

                      <div className="space-y-2 ml-4 sm:ml-6">
                        {todo.notes.map(note => (
                          <div key={note.id} className="text-sm text-gray-400 flex justify-between items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="break-words">{note.text}</div>
                              <span className="text-xs opacity-75 block sm:inline sm:ml-2">
                                {new Date(note.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <button
                              onClick={() => deleteNote(group.id, todo.id, note.id)}
                              className="p-1 hover:bg-gray-600 rounded shrink-0"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {getFilteredTodos(group.todos).length === 0 && (
                  <div className="text-center py-6 text-gray-500">
                    {group.todos.length === 0
                      ? "No tasks yet. Add your first task above!"
                      : "No tasks match your current filters."}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TodoTracker;
