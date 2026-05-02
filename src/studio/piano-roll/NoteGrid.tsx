import { useRef, useCallback, useState } from "react";
import { useStudioStore } from "../store/useStudioStore";
import { NoteBlock } from "./NoteBlock";

interface NoteGridProps {
  clipId: string;
  clipDuration: number;
}

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function getNoteName(midiNote: number): string {
  const octave = Math.floor(midiNote / 12) - 1;
  const noteIndex = midiNote % 12;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
}

export function NoteGrid({ clipId, clipDuration }: NoteGridProps) {
  const notes = useStudioStore((state) => state.notes.filter((n) => n.clipId === clipId));
  const addNote = useStudioStore((state) => state.addNote);
  const removeNote = useStudioStore((state) => state.removeNote);
  const snapStrength = useStudioStore((state) => state.ui.snapStrength);
  const gridRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Piano roll settings
  const pixelsPerBeat = 40;
  const pixelsPerSemitone = 16;
  const minPitch = 24; // C1
  const maxPitch = 96; // C7
  const totalBeats = Math.max(16, clipDuration);

  const snapToGrid = useCallback(
    (value: number, grid: number = snapStrength): number => {
      return Math.round(value / grid) * grid;
    },
    [snapStrength]
  );

  const handleGridClick = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging || e.button !== 0) return;

      const rect = gridRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left - 60; // offset for piano keys
      const y = rect.height - (e.clientY - rect.top);

      const start = snapToGrid(Math.max(0, x / pixelsPerBeat));
      const pitch = Math.min(maxPitch, Math.max(minPitch, minPitch + Math.floor(y / pixelsPerSemitone)));

      if (start < totalBeats) {
        addNote({
          clipId,
          pitch,
          start,
          duration: 1,
          velocity: 100,
        });
      }
    },
    [clipId, addNote, snapToGrid, pixelsPerBeat, pixelsPerSemitone, minPitch, maxPitch, totalBeats, isDragging]
  );

  const visibleNotes = notes.filter((n) => n.pitch >= minPitch && n.pitch <= maxPitch);

  return (
    <div className="w-full h-full flex overflow-hidden">
      {/* Piano Keys */}
      <div className="flex-shrink-0 w-[60px] overflow-hidden bg-gray-800 border-r border-gray-700">
        {Array.from({ length: maxPitch - minPitch + 1 }, (_, i) => {
          const pitch = maxPitch - i;
          const isBlackKey = [1, 3, 6, 8, 10].includes(pitch % 12);
          const isC = pitch % 12 === 0;

          return (
            <div
              key={pitch}
              className={`flex items-center px-2 text-xs border-b border-gray-700 ${
                isBlackKey ? "bg-gray-900 text-gray-400" : "bg-gray-100 text-gray-900"
              } ${isC ? "font-bold" : ""}`}
              style={{ height: pixelsPerSemitone }}
            >
              {isC && getNoteName(pitch)}
            </div>
          );
        })}
      </div>

      {/* Note Grid */}
      <div
        ref={gridRef}
        className="flex-1 relative overflow-auto cursor-crosshair"
        onClick={handleGridClick}
        onMouseDown={() => setIsDragging(false)}
      >
        <div
          className="relative"
          style={{
            width: totalBeats * pixelsPerBeat + 60,
            height: (maxPitch - minPitch + 1) * pixelsPerSemitone,
          }}
        >
          {/* Grid Lines */}
          {/* Vertical beat lines */}
          {Array.from({ length: Math.ceil(totalBeats / snapStrength) + 1 }, (_, i) => i * snapStrength).map(
            (beat) => (
              <div
                key={`v-${beat}`}
                className={`absolute top-0 bottom-0 ${beat % 1 === 0 ? "bg-gray-700" : "bg-gray-800"}`}
                style={{ left: beat * pixelsPerBeat + 60, width: 1 }}
              />
            )
          )}

          {/* Horizontal pitch lines */}
          {Array.from({ length: maxPitch - minPitch + 2 }, (_, i) => i).map((i) => {
            const pitch = maxPitch - i + 1;
            const isBlackKey = pitch % 12 in { 1: true, 3: true, 6: true, 8: true, 10: true };
            return (
              <div
                key={`h-${i}`}
                className={`absolute left-0 right-0 ${isBlackKey ? "bg-gray-800/50" : "bg-gray-700/30"}`}
                style={{ top: i * pixelsPerSemitone, height: 1 }}
              />
            );
          })}

          {/* Beat numbers */}
          {Array.from({ length: Math.ceil(totalBeats) + 1 }, (_, i) => i).map((beat) => (
            <div
              key={`label-${beat}`}
              className="absolute top-1 text-xs text-gray-500 font-mono"
              style={{ left: beat * pixelsPerBeat + 65 }}
            >
              {beat}
            </div>
          ))}

          {/* Note Blocks */}
          {visibleNotes.map((note) => (
            <NoteBlock
              key={note.id}
              note={note}
              pixelsPerBeat={pixelsPerBeat}
              pixelsPerSemitone={pixelsPerSemitone}
              minPitch={minPitch}
              maxPitch={maxPitch}
              onDragStart={() => setIsDragging(true)}
              onDragEnd={() => setTimeout(() => setIsDragging(false), 0)}
              onDelete={() => removeNote(note.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
