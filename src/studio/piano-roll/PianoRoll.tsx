import { X, Plus } from "lucide-react";
import { useStudioStore } from "../store/useStudioStore";
import { NoteGrid } from "./NoteGrid";

export function PianoRoll() {
  const activePianoRollClipId = useStudioStore((state) => state.ui.activePianoRollClipId);
  const clips = useStudioStore((state) => state.clips);
  const closePianoRoll = useStudioStore((state) => state.closePianoRoll);
  const addNote = useStudioStore((state) => state.addNote);

  if (!activePianoRollClipId) return null;

  const clip = clips.find((c) => c.id === activePianoRollClipId);
  if (!clip) return null;

  const handleAddNote = () => {
    // Add a note at the beginning with C4 pitch (60)
    addNote({
      clipId: clip.id,
      pitch: 60,
      start: 0,
      duration: 1,
      velocity: 100,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-6xl h-[80vh] bg-gray-900 rounded-lg border border-gray-700 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-white">{clip.name} - Piano Roll</h3>
            <div className="flex items-center gap-2 px-3 py-1 bg-gray-800 rounded text-sm">
              <span className="text-gray-400">Duration:</span>
              <span className="text-white font-mono">{clip.duration.toFixed(2)} beats</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddNote}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-sm text-white transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Note
            </button>
            <button
              onClick={closePianoRoll}
              className="p-2 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Piano Roll Grid */}
        <div className="flex-1 overflow-hidden">
          <NoteGrid clipId={clip.id} clipDuration={clip.duration} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-3 border-t border-gray-800 text-sm text-gray-400">
          <span>Click to add notes • Drag to move • Double-click to delete</span>
          <div className="flex items-center gap-4">
            <span className="text-gray-500">C4 = MIDI 60</span>
            <span className="text-gray-500">Middle C</span>
          </div>
        </div>
      </div>
    </div>
  );
}
