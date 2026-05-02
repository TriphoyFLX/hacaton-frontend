import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useStudioStore } from "../store/useStudioStore";
import type { Clip } from "../models";
import { useGrid } from "./useGrid";
import { Music, AudioWaveform, Copy, Trash2, Lock, Unlock } from "lucide-react";
import { useState } from "react";

interface ClipBlockProps {
  clip: Clip;
  onResize: (clipId: string, newDuration: number) => void;
  isSelected?: boolean;
  onSelect?: (selected: boolean) => void;
  onDuplicate?: (clipId: string) => void;
  onLock?: (clipId: string, locked: boolean) => void;
}

export function ClipBlock({ clip, onResize, isSelected = false, onSelect, onDuplicate, onLock }: ClipBlockProps) {
  const { config, beatToPixels, getTrackYPosition } = useGrid();
  const selectClip = useStudioStore((state) => state.selectClip);
  const openPianoRoll = useStudioStore((state) => state.openPianoRoll);
  const removeClip = useStudioStore((state) => state.removeClip);
  const [isLocked, setIsLocked] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: clip.id,
    data: { type: "clip", clip },
  });

  const style = {
    position: "absolute" as const,
    left: beatToPixels(clip.start),
    top: getTrackYPosition(clip.trackId),
    width: beatToPixels(clip.duration),
    height: config.trackHeight - 4,
    backgroundColor: isLocked ? clip.color + "80" : clip.color,
    borderRadius: "4px",
    opacity: isDragging ? 0.5 : 1,
    transform: CSS.Translate.toString(transform),
    cursor: isLocked ? "not-allowed" : (isDragging ? "grabbing" : "grab"),
    border: isSelected ? "2px solid white" : "1px solid rgba(0,0,0,0.3)",
    boxShadow: isSelected ? "0 0 10px rgba(255,255,255,0.3)" : "none",
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLocked) {
      selectClip(clip.id);
      onSelect?.(!isSelected);
    }
  };

  const handleDoubleClick = () => {
    if (clip.type === "midi" && !isLocked) {
      openPianoRoll(clip.id);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowActions(true);
  };

  const handleDuplicate = () => {
    onDuplicate?.(clip.id);
    setShowActions(false);
  };

  const handleDelete = () => {
    removeClip(clip.id);
    setShowActions(false);
  };

  const handleLock = () => {
    const newLockedState = !isLocked;
    setIsLocked(newLockedState);
    onLock?.(clip.id, newLockedState);
    setShowActions(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      className="flex items-center gap-2 px-2 overflow-hidden select-none group hover:brightness-110 transition-all"
    >
      <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
        {clip.type === "audio" ? (
          <AudioWaveform className="w-4 h-4 text-white/80" />
        ) : (
          <Music className="w-4 h-4 text-white/80" />
        )}
      </div>
      <span className="text-xs font-medium text-white truncate">{clip.name}</span>
      
      {/* Resize handle */}
      {isSelected && !isLocked && (
        <div
          className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize bg-white/20 hover:bg-white/40 transition-colors"
          onPointerDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            const startX = e.clientX;
            const startDuration = clip.duration;

            const handleMove = (moveEvent: PointerEvent) => {
              const deltaX = moveEvent.clientX - startX;
              const deltaBeats = deltaX / config.pixelsPerBeat;
              const newDuration = Math.max(0.25, startDuration + deltaBeats);
              onResize(clip.id, newDuration);
            };

            const handleUp = () => {
              document.removeEventListener("pointermove", handleMove);
              document.removeEventListener("pointerup", handleUp);
            };

            document.addEventListener("pointermove", handleMove);
            document.addEventListener("pointerup", handleUp);
          }}
        />
      )}

      {/* Lock indicator */}
      {isLocked && (
        <div className="absolute top-1 right-1">
          <Lock className="w-3 h-3 text-white/60" />
        </div>
      )}

      {/* Context menu */}
      {showActions && (
        <div 
          className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 py-1 min-w-32"
          onMouseLeave={() => setShowActions(false)}
        >
          <button
            onClick={handleDuplicate}
            className="w-full px-3 py-2 text-left text-xs text-gray-300 hover:bg-gray-700 flex items-center gap-2"
          >
            <Copy className="w-3 h-3" />
            Duplicate
          </button>
          <button
            onClick={handleLock}
            className="w-full px-3 py-2 text-left text-xs text-gray-300 hover:bg-gray-700 flex items-center gap-2"
          >
            {isLocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
            {isLocked ? 'Unlock' : 'Lock'}
          </button>
          <button
            onClick={handleDelete}
            className="w-full px-3 py-2 text-left text-xs text-red-400 hover:bg-gray-700 flex items-center gap-2"
          >
            <Trash2 className="w-3 h-3" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
