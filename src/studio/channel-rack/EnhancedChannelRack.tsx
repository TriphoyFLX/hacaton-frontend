import { useState } from 'react';
import { useStudioStore } from '../store/useStudioStore';
import { StepSequencer } from './StepSequencer';
import { PatternSelector } from './PatternSelector';
import { SwingControl } from './SwingControl';
import { Plus, Settings, X } from 'lucide-react';

export function EnhancedChannelRack() {
  const { channels, patterns, ui, addChannel, openChannelRack, closeChannelRack } = useStudioStore();
  const [showSettings, setShowSettings] = useState(false);

  const activePattern = patterns.find(p => p.id === ui.activePatternId);
  const activeChannels = channels.filter(ch => activePattern?.channelIds.includes(ch.id));

  const handleAddChannel = () => {
    addChannel({
      name: `Channel ${channels.length + 1}`,
      type: 'synth',
      color: '#' + Math.floor(Math.random()*16777215).toString(16),
      muted: false,
      solo: false,
      volume: 0.8,
      pan: 0,
      stepCount: activePattern?.stepCount || 16,
    });
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 z-40 transition-all duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-gray-800 to-gray-900 border-b border-gray-700">
        <div className="flex items-center gap-6">
          {/* Logo section */}
          <div className="flex items-center gap-3 bg-gradient-to-r from-purple-600/20 to-blue-600/20 px-4 py-2 rounded-xl border border-purple-500/30 shadow-lg shadow-purple-500/10">
            <span className="text-sm font-bold text-white tracking-wide">CHANNEL RACK</span>
            <span className="text-xs text-gray-400">Enhanced</span>
          </div>
          
          {/* Pattern Selector */}
          <PatternSelector />
          
          {/* Swing Control */}
          <SwingControl />
        </div>

        <div className="flex items-center gap-3">
          {/* Add Channel Button */}
          <button
            onClick={handleAddChannel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium text-white transition-colors shadow-lg shadow-green-500/25 hover:shadow-green-500/40"
          >
            <Plus className="w-4 h-4" />
            <span>Add Channel</span>
          </button>
          
          {/* Settings Toggle */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Window controls */}
          <button
            onClick={closeChannelRack}
            className="p-2 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Channel Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {activeChannels.map((channel) => (
            <div key={channel.id} className="bg-gray-800 rounded-lg border border-gray-700 p-4">
              <StepSequencer channelId={channel.id} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
