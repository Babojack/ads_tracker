import React from 'react';
import { X } from 'lucide-react';

interface NoteProps {
  note: {
    id: number;
    text: string;
    timestamp: string;
  };
  onDelete: () => void;
}

const Note: React.FC<NoteProps> = ({ note, onDelete }) => (
  <div className="bg-gray-800/50 p-2 rounded flex justify-between items-start">
    <div>
      <p className="text-sm">{note.text}</p>
      <p className="text-xs text-gray-400">{new Date(note.timestamp).toLocaleString()}</p>
    </div>
    <button onClick={onDelete} className="p-1 hover:bg-gray-600 rounded">
      <X className="w-4 h-4" />
    </button>
  </div>
);

export default Note;
