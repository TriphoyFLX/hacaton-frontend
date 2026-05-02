import { useState } from 'react';
import { Music, Play, Zap, Flame } from 'lucide-react';
import { FL_PATTERNS } from '../patterns/flPatterns';
import { useStudioStore } from '../store/useStudioStore';
import { FL_INITIAL_CHANNELS } from '../store/initialState';

/**
 * FL STUDIO QUICK START
 * 
 * One-click professional beats that actually work
 */
export function FLQuickStart() {
  const { addChannel, setChannelSteps, channels } = useStudioStore();
  const [isLoading, setIsLoading] = useState(false);

  const loadFLDemo = async () => {
    setIsLoading(true);
    
    try {
      // Add all FL Studio drum channels
      for (const channelData of FL_INITIAL_CHANNELS) {
        const newChannel = addChannel(channelData);
        
        // Set steps immediately
        setTimeout(() => {
          const currentState = useStudioStore.getState();
          const createdChannel = currentState.channels.find(c => c.name === channelData.name);
          if (createdChannel) {
            setChannelSteps(createdChannel.id, channelData.steps);
          }
        }, 50);
      }
      
      console.log('🎵 FL Studio Demo loaded - Press Play to hear professional drums!');
    } catch (error) {
      console.error('Failed to load FL Demo:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPattern = async (patternIndex: number) => {
    setIsLoading(true);
    
    try {
      const pattern = FL_PATTERNS[patternIndex];
      
      // Clear existing channels for clean pattern
      const existingIds = channels.map(c => c.id);
      
      // Add pattern channels
      for (const channelData of pattern.channels) {
        addChannel(channelData);
        
        // Set steps after channel creation
        setTimeout(() => {
          const currentState = useStudioStore.getState();
          const createdChannel = currentState.channels.find(c => 
            c.name === channelData.name && !existingIds.includes(c.id)
          );
          if (createdChannel) {
            const steps = pattern.steps[channelData.name] || new Array(16).fill(false);
            setChannelSteps(createdChannel.id, steps);
          }
        }, 50);
      }
      
      console.log(`🎵 Loaded ${pattern.name} - Press Play!`);
    } catch (error) {
      console.error('Failed to load pattern:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 rounded-xl p-6 border border-purple-500/30">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 px-3 py-1.5 rounded-lg">
          <Flame className="w-4 h-4 text-white" />
          <span className="text-sm font-bold text-white">QUICK START</span>
        </div>
        <span className="text-xs text-purple-300">Professional beats ready instantly</span>
      </div>

      {/* Main Demo Button */}
      <button
        onClick={loadFLDemo}
        disabled={isLoading}
        className="w-full mb-4 group flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold rounded-xl transition-all duration-200 shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transform hover:scale-105 disabled:scale-100"
      >
        {isLoading ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Loading...</span>
          </>
        ) : (
          <>
            <Zap className="w-5 h-5" />
            <span>Load FL Studio Demo</span>
            <Music className="w-5 h-5" />
          </>
        )}
      </button>

      {/* Pattern Grid */}
      <div className="grid grid-cols-2 gap-2">
        {FL_PATTERNS.slice(0, 6).map((pattern, index) => (
          <button
            key={index}
            onClick={() => loadPattern(index)}
            disabled={isLoading}
            className="group flex items-center justify-between p-3 bg-gray-800/50 hover:bg-gray-700/50 disabled:bg-gray-800/30 rounded-lg border border-gray-600/30 hover:border-purple-500/30 transition-all duration-200"
          >
            <div className="text-left">
              <div className="text-xs font-semibold text-white group-hover:text-purple-300">
                {pattern.name}
              </div>
              <div className="text-[10px] text-gray-500">
                {pattern.genre}
              </div>
            </div>
            <Play className="w-3 h-3 text-gray-400 group-hover:text-purple-400" />
          </button>
        ))}
      </div>

      {/* Instructions */}
      <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
        <div className="flex items-center gap-2 mb-1">
          <Play className="w-3 h-3 text-purple-400" />
          <span className="text-xs font-semibold text-purple-300">How to use:</span>
        </div>
        <ul className="text-xs text-purple-200 space-y-1">
          <li>• Click any pattern to load professional drums</li>
          <li>• Press Play button to hear the beat</li>
          <li>• Click steps to edit the pattern</li>
          <li>• Use Mute/Solo to mix instruments</li>
        </ul>
      </div>
    </div>
  );
}
