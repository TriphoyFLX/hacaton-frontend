import { useRef, useCallback, useState, useEffect } from "react";
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
  const updateNote = useStudioStore((state) => state.updateNote);
  const snapStrength = useStudioStore((state) => state.ui.snapStrength);
  const gridRef = useRef<HTMLDivElement>(null);
  const [, setIsDragging] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [scale, setScale] = useState('C Major');
  const [quantize, setQuantize] = useState(snapStrength);
  const [velocity, setVelocity] = useState(100);

  // Piano roll settings
  const pixelsPerBeat = 40;
  const pixelsPerSemitone = 16;
  const minPitch = 24; // C1
  const maxPitch = 96; // C7
  const totalBeats = Math.max(16, clipDuration);

  const snapToGrid = useCallback(
    (value: number, grid: number = quantize): number => {
      return Math.round(value / grid) * grid;
    },
    [quantize]
  );

  // Scale highlighting
  const isNoteInScale = useCallback((pitch: number): boolean => {
    const scaleNotes = {
      'C Major': [0, 2, 4, 5, 7, 9, 11],
      'G Major': [7, 9, 11, 0, 2, 4, 6],
      'D Minor': [2, 4, 5, 7, 9, 11, 0],
      'A Minor': [9, 11, 0, 1, 3, 5, 8],
    };
    const currentScale = scaleNotes[scale as keyof typeof scaleNotes] || scaleNotes['C Major'];
    return currentScale.includes(pitch % 12);
  }, [scale]);

  // Keyboard modifiers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleGridClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;

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
          velocity,
        });
      }
    },
    [clipId, addNote, snapToGrid, pixelsPerBeat, pixelsPerSemitone, minPitch, maxPitch, totalBeats, velocity]
  );

  const handleNoteSelect = useCallback((noteId: string, selected: boolean) => {
    if (selected) {
      setSelectedNotes(prev => isShiftPressed ? [...prev, noteId] : [noteId]);
    } else {
      setSelectedNotes(prev => prev.filter(id => id !== noteId));
    }
  }, [isShiftPressed]);

  const deleteSelectedNotes = useCallback(() => {
    selectedNotes.forEach(noteId => removeNote(noteId));
    setSelectedNotes([]);
  }, [selectedNotes, removeNote]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelectedNotes();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteSelectedNotes]);

  const visibleNotes = notes.filter((n) => n.pitch >= minPitch && n.pitch <= maxPitch);

  return (
    <div className="w-full h-full flex overflow-hidden">
      {/* Piano Keys */}
      <div className="flex-shrink-0 w-[60px] overflow-hidden bg-gray-800 border-r border-gray-700">
        {Array.from({ length: maxPitch - minPitch + 1 }, (_, i) => {
          const pitch = maxPitch - i;
          const isBlackKey = [1, 3, 6, 8, 10].includes(pitch % 12);
          const isC = pitch % 12 === 0;
          const isInScale = isNoteInScale(pitch);

          return (
            <div
              key={pitch}
              className={`flex items-center px-2 text-xs border-b border-gray-700 ${
                isBlackKey ? "bg-gray-900 text-gray-400" : 
                isInScale ? "bg-blue-50 text-blue-900" : "bg-gray-100 text-gray-900"
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
      >
        {/* Controls Bar */}
        <div className="absolute top-0 left-0 right-0 bg-gray-800/90 backdrop-blur-sm border-b border-gray-700 p-2 flex items-center gap-4 z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Scale:</span>
            <select
              value={scale}
              onChange={(e) => setScale(e.target.value)}
              className="px-2 py-1 bg-gray-900 border border-gray-600 rounded text-xs text-white"
            >
              <option value="C Major">C Major</option>
              <option value="G Major">G Major</option>
              <option value="D Minor">D Minor</option>
              <option value="A Minor">A Minor</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Quantize:</span>
            <select
              value={quantize}
              onChange={(e) => setQuantize(parseFloat(e.target.value))}
              className="px-2 py-1 bg-gray-900 border border-gray-600 rounded text-xs text-white"
            >
              <option value={1}>Bar</option>
              <option value={0.5}>1/2</option>
              <option value={0.25}>1/4</option>
              <option value={0.125}>1/8</option>
              <option value={0.0625}>1/16</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Velocity:</span>
            <input
              type="range"
              min={1}
              max={127}
              value={velocity}
              onChange={(e) => setVelocity(parseInt(e.target.value))}
              className="w-20 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-xs text-gray-400 font-mono w-8">{velocity}</span>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>Selected: {selectedNotes.length}</span>
            {selectedNotes.length > 0 && (
              <button
                onClick={deleteSelectedNotes}
                className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded"
              >
                Delete
              </button>
            )}
          </div>
        </div>
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

          {/* Horizontal pitch lines with scale highlighting */}
          {Array.from({ length: maxPitch - minPitch + 2 }, (_, i) => i).map((i) => {
            const pitch = maxPitch - i + 1;
            const isBlackKey = [1, 3, 6, 8, 10].includes(pitch % 12);
            const isInScale = isNoteInScale(pitch);
            return (
              <div
                key={`h-${i}`}
                className={`absolute left-0 right-0 ${
                  isBlackKey ? "bg-gray-800/50" : 
                  isInScale ? "bg-blue-500/20" : "bg-gray-700/30"
                }`}
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
              isSelected={selectedNotes.includes(note.id)}
                            onDragStart={() => setIsDragging(true)}
              onDragEnd={() => setIsDragging(false)}
              onSelect={(noteId, selected) => handleNoteSelect(noteId, selected)}
              onDelete={() => removeNote(note.id)}
              onUpdate={updateNote}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
