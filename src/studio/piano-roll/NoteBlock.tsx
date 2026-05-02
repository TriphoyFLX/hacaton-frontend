import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useStudioStore } from "../store/useStudioStore";
import type { Note } from "../models";
import { useState, useCallback, useEffect } from "react";

interface NoteBlockProps {
  note: Note;
  pixelsPerBeat: number;
  pixelsPerSemitone: number;
  minPitch: number;
  maxPitch: number;
  onDelete: () => void;
  isSelected?: boolean;
  onSelect?: (noteId: string, selected: boolean) => void;
  onUpdate?: (noteId: string, updates: Partial<Note>) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export function NoteBlock({
  note,
  pixelsPerBeat,
  pixelsPerSemitone,
  maxPitch,
  onDelete,
  isSelected = false,
  onSelect,
  onUpdate,
  onDragStart,
  onDragEnd,
}: NoteBlockProps) {
  const snapStrength = useStudioStore((state) => state.ui.snapStrength);
  const [, setIsResizing] = useState(false);

  const snapToGrid = useCallback(
    (value: number): number => Math.round(value / snapStrength) * snapStrength,
    [snapStrength]
  );

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `note-${note.id}`,
    data: { type: "note", note },
  });

  // Notify parent of drag state changes
  useEffect(() => {
    if (isDragging) {
      onDragStart?.();
    } else {
      onDragEnd?.();
    }
  }, [isDragging, onDragStart, onDragEnd]);

  const left = 60 + note.start * pixelsPerBeat;
  const top = (maxPitch - note.pitch) * pixelsPerSemitone;
  const width = Math.max(pixelsPerBeat * 0.25, note.duration * pixelsPerBeat - 2);
  const height = pixelsPerSemitone - 2;

  const style = {
    position: "absolute" as const,
    left,
    top,
    width,
    height,
    backgroundColor: isSelected ? "#60a5fa" : "#3b82f6",
    border: isSelected ? "2px solid white" : "1px solid #2563eb",
    borderRadius: "3px",
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.7 : 1,
    cursor: isDragging ? "grabbing" : "grab",
    zIndex: isDragging ? 100 : 1,
  };


  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(note.id, !isSelected);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDelete();
      }}
      className="group"
    >
      {/* Velocity indicator */}
      <div
        className="absolute top-0 left-0 bottom-0 bg-white/30"
        style={{ width: `${note.velocity}%` }}
      />

      {/* Resize handle */}
      <div
        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize bg-blue-600/50 opacity-0 group-hover:opacity-100"
        onPointerDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setIsResizing(true);

          const startX = e.clientX;
          const startDuration = note.duration;

          const handleMove = (moveEvent: PointerEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const deltaBeats = deltaX / pixelsPerBeat;
            const newDuration = Math.max(0.125, snapToGrid(startDuration + deltaBeats));
            onUpdate?.(note.id, { duration: newDuration });
          };

          const handleUp = () => {
            setIsResizing(false);
            document.removeEventListener("pointermove", handleMove);
            document.removeEventListener("pointerup", handleUp);
          };

          document.addEventListener("pointermove", handleMove);
          document.addEventListener("pointerup", handleUp);
        }}
      />

      {/* Velocity display on hover */}
      <div className="absolute -top-5 left-0 bg-gray-800 text-white text-xs px-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">
        Vel: {note.velocity}
      </div>
    </div>
  );
}
