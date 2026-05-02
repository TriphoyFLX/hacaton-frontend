import { useState } from 'react';
import { useStudioStore } from '../store/useStudioStore';
import { ChevronDown, Plus, Copy, Trash2 } from 'lucide-react';
import { DraggablePattern } from './DraggablePattern';

export function PatternSelector() {
  const { patterns, ui, addPattern, removePattern, selectPattern } = useStudioStore();
  const [isOpen, setIsOpen] = useState(false);
  const [newPatternName, setNewPatternName] = useState('');
  
  const activePattern = patterns.find(p => p.id === ui.activePatternId);

  const handleCreatePattern = () => {
    if (newPatternName.trim()) {
      addPattern({
        name: newPatternName.trim(),
        channelIds: [],
        stepCount: 16,
      });
      setNewPatternName('');
      setIsOpen(false);
    }
  };

  const handlePatternChange = (patternId: string) => {
    selectPattern(patternId);
    
    // Update all pattern clips to use the new pattern and update their names
    const store = useStudioStore.getState();
    const patternClips = store.clips.filter(clip => clip.patternId);
    const newPattern = store.patterns.find(p => p.id === patternId);
    
    patternClips.forEach(clip => {
      store.updateClip(clip.id, { 
        patternId: patternId,
        name: newPattern ? `${newPattern.name} Pattern` : clip.name
      });
    });
  };

  const handleDuplicatePattern = () => {
    if (activePattern) {
      addPattern({
        name: `${activePattern.name} Copy`,
        channelIds: [...activePattern.channelIds],
        stepCount: activePattern.stepCount,
      });
    }
  };

  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors min-w-48"
      >
        <div className="flex items-center gap-2 flex-1">
          <span className="text-sm font-medium text-gray-200 truncate">
            {activePattern?.name || 'No Pattern'}
          </span>
          <span className="text-xs text-gray-500">
            ({activePattern?.stepCount || 16} steps)
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
          <div className="p-2 max-h-60 overflow-y-auto">
            {patterns.map((pattern) => (
              <DraggablePattern pattern={pattern} />
            ))}
          </div>

          <div className="border-t border-gray-700 p-2">
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newPatternName}
                onChange={(e) => setNewPatternName(e.target.value)}
                placeholder="New pattern name..."
                className="flex-1 px-2 py-1 bg-gray-900 border border-gray-600 rounded text-sm text-white placeholder-gray-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreatePattern();
                  }
                }}
              />
              <button
                onClick={handleCreatePattern}
                disabled={!newPatternName.trim()}
                className="px-3 py-1 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 rounded text-sm text-white transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handleDuplicatePattern}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-200 transition-colors"
              >
                <Copy className="w-3 h-3" />
                <span>Duplicate</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
