import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useStudioStore } from "../store/useStudioStore";
import type { Clip } from "../models";
import { useGrid } from "./useGrid";
import { Music, AudioWaveform } from "lucide-react";

interface ClipBlockProps {
  clip: Clip;
  onResize: (clipId: string, newDuration: number) => void;
}

export function ClipBlock({ clip, onResize }: ClipBlockProps) {
  const { config, beatToPixels, getTrackYPosition } = useGrid();
  const selectedClipId = useStudioStore((state) => state.ui.selectedClipId);
  const selectClip = useStudioStore((state) => state.selectClip);
  const openPianoRoll = useStudioStore((state) => state.openPianoRoll);
  const isSelected = selectedClipId === clip.id;

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
    backgroundColor: clip.color,
    borderRadius: "4px",
    opacity: isDragging ? 0.5 : 1,
    transform: CSS.Translate.toString(transform),
    cursor: isDragging ? "grabbing" : "grab",
    border: isSelected ? "2px solid white" : "1px solid rgba(0,0,0,0.3)",
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectClip(clip.id);
  };

  const handleDoubleClick = () => {
    if (clip.type === "midi") {
      openPianoRoll(clip.id);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className="flex items-center gap-2 px-2 overflow-hidden select-none group"
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
      {isSelected && (
        <div
          className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize bg-white/20 hover:bg-white/40"
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
    </div>
  );
}
