import React from 'react';
import { X } from 'lucide-react';

interface MilestoneProps {
  milestone: {
    id: number;
    name: string;
    completed: boolean;
  };
  onToggle: () => void;
  onUpdate: (name: string) => void;
  onDelete: () => void;
}

const Milestone: React.FC<MilestoneProps> = ({
  milestone,
  onToggle,
  onUpdate,
  onDelete
}) => (
  <div className="flex items-center space-x-2">
    <input
      type="checkbox"
      checked={milestone.completed}
      onChange={onToggle}
      className="w-4 h-4 rounded"
    />
    <input
      type="text"
      value={milestone.name}
      onChange={(e) => onUpdate(e.target.value)}
      className={`bg-transparent text-sm outline-none flex-1 ${
        milestone.completed ? 'line-through text-gray-400' : ''
      }`}
    />
    <button onClick={onDelete} className="p-1 hover:bg-gray-600 rounded">
      <X className="w-4 h-4" />
    </button>
  </div>
);

export default Milestone;
