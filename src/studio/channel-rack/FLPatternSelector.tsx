import { useState } from 'react';
import { Music, Play, Plus } from 'lucide-react';
import { FL_PATTERNS, createFLPattern } from '../patterns/flPatterns';
import { useStudioStore } from '../store/useStudioStore';

/**
 * FL STUDIO STYLE PATTERN SELECTOR
 * 
 * Quick access to professional drum patterns
 * One-click pattern loading like FL Studio
 */
export function FLPatternSelector() {
  const [selectedGenre, setSelectedGenre] = useState('All');
  const { addChannel, selectPattern, setChannelSteps, channels } = useStudioStore();

  const genres = ['All', ...FL_PATTERNS.reduce((acc, pattern) => {
    if (!acc.includes(pattern.genre)) acc.push(pattern.genre);
    return acc;
  }, [] as string[])];

  const filteredPatterns = selectedGenre === 'All' 
    ? FL_PATTERNS 
    : FL_PATTERNS.filter(p => p.genre === selectedGenre);

  const loadPattern = async (flPattern: typeof FL_PATTERNS[0]) => {
    // Clear existing channels first for clean pattern load
    const existingChannelIds = channels.map(c => c.id);
    
    // Add channels with professional drum sounds
    for (const channelData of flPattern.channels) {
      const newChannel = addChannel(channelData);
      // Set steps for the newly created channel
      const steps = flPattern.steps[channelData.name] || new Array(16).fill(false);
      
      // Wait a tick for the channel to be created, then set steps
      setTimeout(() => {
        const currentState = useStudioStore.getState();
        const createdChannel = currentState.channels.find(c => 
          c.name === channelData.name && !existingChannelIds.includes(c.id)
        );
        if (createdChannel) {
          setChannelSteps(createdChannel.id, steps);
        }
      }, 10);
    }
    
    // Select first pattern (we'll use existing pattern)
    selectPattern('pat-1');
    
    console.log(`🎵 Loaded FL Studio pattern: ${flPattern.name}`);
  };

  return (
    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 bg-gradient-to-r from-purple-600/20 to-pink-600/20 px-3 py-1.5 rounded-lg border border-purple-500/30">
          <Music className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-bold text-white">FL PATTERNS</span>
        </div>
        
        {/* Genre Filter */}
        <select
          value={selectedGenre}
          onChange={(e) => setSelectedGenre(e.target.value)}
          className="px-3 py-1.5 bg-gray-700/50 border border-gray-600/50 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-purple-500/50"
        >
          {genres.map(genre => (
            <option key={genre} value={genre}>{genre}</option>
          ))}
        </select>
      </div>

      {/* Pattern Grid */}
      <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
        {filteredPatterns.map((pattern, index) => (
          <div
            key={index}
            className="group flex items-center justify-between p-3 bg-gray-700/30 rounded-lg border border-gray-600/30 hover:bg-gray-700/50 hover:border-purple-500/30 transition-all duration-200"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">{pattern.name}</span>
                <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full">
                  {pattern.genre}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">{pattern.description}</p>
              
              {/* Pattern Preview */}
              <div className="flex items-center gap-1 mt-2">
                {Object.entries(pattern.steps).slice(0, 3).map(([instrument, steps]) => (
                  <div key={instrument} className="flex items-center gap-1">
                    <span className="text-xs text-gray-500 w-12 truncate">{instrument}:</span>
                    <div className="flex gap-0.5">
                      {steps.slice(0, 8).map((step, i) => (
                        <div
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full ${
                            step ? 'bg-green-400' : 'bg-gray-600'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <button
              onClick={() => loadPattern(pattern)}
              className="group/btn flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white text-xs font-semibold rounded-lg transition-all duration-200 shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transform hover:scale-105"
            >
              <Plus className="w-3.5 h-3.5" />
              Load
            </button>
          </div>
        ))}
      </div>

      {/* Quick Start Tips */}
      <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <div className="flex items-center gap-2 mb-1">
          <Play className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-semibold text-blue-300">Quick Start</span>
        </div>
        <ul className="text-xs text-blue-200 space-y-1">
          <li>• Click any pattern to load professional drums</li>
          <li>• Press Play to hear the beat</li>
          <li>• Click steps to edit the pattern</li>
        </ul>
      </div>
    </div>
  );
}
