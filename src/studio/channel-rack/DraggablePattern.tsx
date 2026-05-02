import { useDraggable } from '@dnd-kit/core';
import { Pattern } from '../models';

interface DraggablePatternProps {
  pattern: Pattern;
}

export function DraggablePattern({ pattern }: DraggablePatternProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `pattern-${pattern.id}`,
    data: { type: 'pattern', pattern },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`cursor-grab px-3 py-2 rounded bg-[#2a2a3a] text-white text-sm font-medium transition-all duration-150 ${
        isDragging 
          ? 'opacity-50 ring-2 ring-blue-500 shadow-lg scale-105' 
          : 'hover:bg-[#3a3a3a] hover:shadow-md'
      }`}
    >
      🎵 {pattern.name}
    </div>
  );
}
