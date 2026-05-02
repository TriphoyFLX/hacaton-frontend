import { useState, useEffect, useCallback, useMemo } from 'react';
import { useStudioStore } from '../store/useStudioStore';
import { useGrid } from '../timeline/useGrid';
import { NoteBlock } from './NoteBlock';
import type { Note } from '../models';

// Color palette for notes by pitch (FL Studio style)
const NOTE_COLORS = [
  '#ff6b6b', // C - Red
  '#ff9f40', // C# - Orange  
  '#ffd93d', // D - Yellow
  '#6bcf7f', // D# - Green
  '#4ecdc4', // E - Cyan
  '#4a90e2', // F - Blue
  '#9b59b6', // F# - Purple
  '#e91e63', // G - Pink
  '#ff6b9d', // G# - Light Pink
  '#c9e265', // A - Lime
  '#95e1d3', // A# - Mint
  '#3dc1d3', // B - Sky Blue
];

const getNoteColor = (pitch: number): string => {
  const noteIndex = pitch % 12;
  return NOTE_COLORS[noteIndex] || '#3b82f6';
};

interface EnhancedNoteGridProps {
  clipId: string;
}

export function EnhancedNoteGrid({ clipId }: EnhancedNoteGridProps) {
  const { notes, addNote, removeNote, updateNote, clips } = useStudioStore();
  const { config } = useGrid();
  
  const clip = clips.find(c => c.id === clipId);
  const clipNotes = notes.filter(note => note.clipId === clipId);
  
  // Ghost notes from other clips on the same track
  const ghostNotes = useMemo(() => {
    if (!clip) return [];
    const trackClips = clips.filter(c => c.trackId === clip.trackId && c.id !== clipId);
    return notes.filter(note => trackClips.some(c => note.clipId === c.id));
  }, [clip, clips, notes]);

  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragEnd, setDragEnd] = useState({ x: 0, y: 0 });
  const [velocities, setVelocities] = useState<Record<string, number>>({});
  
  const minPitch = 36; // C2
  const maxPitch = 96; // C7
  const pitchRange = maxPitch - minPitch + 1;
  
  const pixelsPerBeat = config.pixelsPerBeat;
  const pixelsPerSemitone = 12;
  const gridWidth = 800;
  const gridHeight = pitchRange * pixelsPerSemitone;
  
  const beatToPixels = useCallback((beat: number) => beat * pixelsPerBeat, [pixelsPerBeat]);
  const pitchToPixels = useCallback((pitch: number) => (maxPitch - pitch) * pixelsPerSemitone, [maxPitch, pixelsPerSemitone]);
  
  const pixelsToBeat = useCallback((pixels: number) => pixels / pixelsPerBeat, [pixelsPerBeat]);
  const pixelsToPitch = useCallback((pixels: number) => maxPitch - pixels / pixelsPerSemitone, [maxPitch, pixelsPerSemitone]);

  const handleNoteSelect = useCallback((noteId: string, selected: boolean) => {
    setSelectedNotes(prev => 
      selected 
        ? [...prev, noteId]
        : prev.filter(id => id !== noteId)
    );
  }, []);

  const handleGridClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const beat = pixelsToBeat(x - 60);
    const pitch = Math.round(pixelsToPitch(y));
    
    if (pitch >= minPitch && pitch <= maxPitch && beat >= 0 && beat < 16) {
      const existingNote = clipNotes.find(n => 
        Math.abs(n.start - beat) < 0.125 && n.pitch === pitch
      );
      
      if (existingNote) {
        removeNote(existingNote.id);
      } else {
        const newNote: Omit<Note, 'id'> = {
          clipId,
          pitch,
          start: Math.floor(beat * 4) / 4, // Snap to 16th notes
          duration: 1,
          velocity: 100,
        };
        addNote(newNote);
        setVelocities(prev => ({ ...prev, [newNote.clipId]: 100 }));
      }
    }
  }, [isDragging, pixelsToBeat, pixelsToPitch, minPitch, maxPitch, clipNotes, clipId, removeNote, addNote]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Delete' && selectedNotes.length > 0) {
      selectedNotes.forEach(noteId => removeNote(noteId));
      setSelectedNotes([]);
    }
  }, [selectedNotes, removeNote]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex flex-col h-full">
      {/* Note Grid */}
      <div className="flex-1 relative bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
        {/* Grid lines */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Beat lines */}
          {Array.from({ length: 17 }).map((_, i) => (
            <div
              key={`beat-${i}`}
              className="absolute top-0 bottom-0 border-l border-gray-800"
              style={{ left: `${60 + i * pixelsPerBeat}px` }}
            />
          ))}
          
          {/* Pitch lines */}
          {Array.from({ length: pitchRange + 1 }).map((_, i) => (
            <div
              key={`pitch-${i}`}
              className="absolute left-0 right-0 border-t border-gray-800"
              style={{ top: `${i * pixelsPerSemitone}px` }}
            />
          ))}
        </div>

        {/* Ghost Notes */}
        {ghostNotes.map((ghostNote) => {
          const left = beatToPixels(ghostNote.start) + 60;
          const top = pitchToPixels(ghostNote.pitch);
          const width = Math.max(pixelsPerBeat * 0.25, ghostNote.duration * pixelsPerBeat - 2);
          const height = pixelsPerSemitone - 2;
          
          return (
            <div
              key={`ghost-${ghostNote.id}`}
              className="absolute pointer-events-none"
              style={{
                left,
                top,
                width,
                height,
                backgroundColor: getNoteColor(ghostNote.pitch),
                opacity: 0.2,
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '2px',
              }}
            />
          );
        })}

        {/* Regular Notes */}
        {clipNotes.map((note) => (
          <NoteBlock
            key={note.id}
            note={note}
            pixelsPerBeat={pixelsPerBeat}
            pixelsPerSemitone={pixelsPerSemitone}
            minPitch={minPitch}
            maxPitch={maxPitch}
            isSelected={selectedNotes.includes(note.id)}
            onSelect={handleNoteSelect}
            onDelete={() => removeNote(note.id)}
            onUpdate={updateNote}
          />
        ))}

        {/* Click handler */}
        <div
          className="absolute inset-0 cursor-crosshair"
          onClick={handleGridClick}
          style={{ paddingLeft: '60px' }}
        />
      </div>

      {/* Velocity Editor Panel */}
      <div className="h-24 bg-gray-800 border-t border-gray-700 p-2">
        <div className="text-xs text-gray-400 mb-1">Velocity Editor</div>
        <div className="flex gap-1 h-16">
          {clipNotes.map((note) => (
            <div key={note.id} className="flex-1 flex flex-col items-center">
              <div className="text-xs text-gray-500 truncate w-full text-center">
                {note.pitch}
              </div>
              <input
                type="range"
                min="0"
                max="127"
                value={velocities[note.id] || note.velocity}
                onChange={(e) => {
                  const velocity = parseInt(e.target.value);
                  setVelocities(prev => ({ ...prev, [note.id]: velocity }));
                  updateNote(note.id, { velocity });
                }}
                className="h-12 transform -rotate-90 w-12"
                style={{
                  background: `linear-gradient(to top, 
                    ${getNoteColor(note.pitch)} 0%, 
                    ${getNoteColor(note.pitch)} ${(velocities[note.id] || note.velocity) / 127 * 100}%, 
                    #374151 ${(velocities[note.id] || note.velocity) / 127 * 100}%, 
                    #374151 100%)`
                }}
              />
              <div className="text-xs text-gray-400">
                {velocities[note.id] || note.velocity}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
