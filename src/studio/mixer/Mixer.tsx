import { useState } from 'react';
import { useStudioStore } from '../store/useStudioStore';
import { Volume2, Headphones, Zap, Settings } from 'lucide-react';

export function Mixer() {
  const { channels, updateChannel } = useStudioStore();
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);

  const handleVolumeChange = (channelId: string, volume: number) => {
    updateChannel(channelId, { volume });
  };

  const handlePanChange = (channelId: string, pan: number) => {
    updateChannel(channelId, { pan });
  };

  const handleMuteToggle = (channelId: string) => {
    const channel = channels.find(ch => ch.id === channelId);
    if (channel) {
      updateChannel(channelId, { muted: !channel.muted });
    }
  };

  const handleSoloToggle = (channelId: string) => {
    const channel = channels.find(ch => ch.id === channelId);
    if (channel) {
      updateChannel(channelId, { solo: !channel.solo });
    }
  };

  return (
    <div className="fixed bottom-20 left-0 right-0 bg-gray-900 border-t border-gray-700 z-30 transition-all duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-gradient-to-r from-gray-800 to-gray-900 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-gradient-to-r from-orange-600/20 to-red-600/20 px-3 py-1.5 rounded-lg border border-orange-500/30">
            <Volume2 className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-bold text-white tracking-wide">MIXER</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 transition-colors">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Channel Strips */}
      <div className="flex gap-2 p-4 overflow-x-auto bg-gray-900">
        {/* Channel Strips */}
        {channels.map((channel) => (
          <div
            key={channel.id}
            className={`flex flex-col items-center w-20 bg-gray-800 rounded-lg border-2 transition-all duration-150 ${
              selectedChannel === channel.id
                ? 'border-blue-500 shadow-lg shadow-blue-500/20'
                : 'border-gray-700 hover:border-gray-600'
            }`}
            onClick={() => setSelectedChannel(channel.id)}
          >
            {/* Channel Name */}
            <div className="text-xs text-gray-400 truncate w-full text-center px-1 py-2 border-b border-gray-700">
              {channel.name}
            </div>

            {/* Peak Meter */}
            <div className="flex-1 relative w-full py-2">
              <div className="absolute inset-x-0 top-0 bottom-0 bg-gray-700 rounded">
                <div 
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-green-500 via-yellow-500 to-red-500 rounded transition-all duration-100"
                  style={{ height: `${channel.volume * 100}%` }}
                />
              </div>
            </div>

            {/* Volume Fader */}
            <div className="w-full px-2 py-2">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={channel.volume}
                onChange={(e) => handleVolumeChange(channel.id, parseFloat(e.target.value))}
                className="w-full h-1 bg-gray-700 accent-blue-500 transform -rotate-90 origin-center"
                style={{
                  width: '60px',
                  marginLeft: '-20px',
                  marginTop: '30px',
                  marginBottom: '30px'
                }}
              />
              <div className="text-xs text-center text-gray-400">
                {Math.round(channel.volume * 100)}
              </div>
            </div>

            {/* Pan Control */}
            <div className="w-full px-2 pb-2">
              <input
                type="range"
                min="-1"
                max="1"
                step="0.1"
                value={channel.pan}
                onChange={(e) => handlePanChange(channel.id, parseFloat(e.target.value))}
                className="w-full h-1 bg-gray-700 accent-green-500"
              />
              <div className="text-xs text-center text-gray-400">
                {channel.pan > 0 ? `R${Math.abs(Math.round(channel.pan * 10))}` : 
                 channel.pan < 0 ? `L${Math.abs(Math.round(channel.pan * 10))}` : 'C'}
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex gap-1 pb-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleMuteToggle(channel.id);
                }}
                className={`flex-1 px-1 py-1 text-xs rounded transition-colors ${
                  channel.muted
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                M
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSoloToggle(channel.id);
                }}
                className={`flex-1 px-1 py-1 text-xs rounded transition-colors ${
                  channel.solo
                    ? 'bg-yellow-600 text-black'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                S
              </button>
            </div>

            {/* FX Slot */}
            <div className="w-full px-1 pb-2">
              <button className="w-full py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 transition-colors flex items-center justify-center gap-1">
                <Zap className="w-3 h-3" />
                FX
              </button>
            </div>
          </div>
        ))}

        {/* Master Channel */}
        <div className="flex flex-col items-center w-20 bg-gradient-to-b from-gray-800 to-gray-900 rounded-lg border-2 border-orange-500 shadow-lg shadow-orange-500/20">
          <div className="text-xs text-orange-400 truncate w-full text-center px-1 py-2 border-b border-orange-600 font-bold">
            MASTER
          </div>

          {/* Master Peak Meter */}
          <div className="flex-1 relative w-full py-2">
            <div className="absolute inset-x-0 top-0 bottom-0 bg-gray-700 rounded">
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-orange-500 via-yellow-500 to-red-500 rounded" style={{ height: '80%' }} />
            </div>
          </div>

          {/* Master Volume */}
          <div className="w-full px-2 py-2">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              defaultValue="0.8"
              className="w-full h-1 bg-gray-700 accent-orange-500 transform -rotate-90 origin-center"
              style={{
                width: '60px',
                marginLeft: '-20px',
                marginTop: '30px',
                marginBottom: '30px'
              }}
            />
            <div className="text-xs text-center text-orange-400 font-bold">80</div>
          </div>

          {/* Master Controls */}
          <div className="w-full px-1 pb-2">
            <button className="w-full py-1 bg-orange-600 hover:bg-orange-500 rounded text-xs text-black font-bold transition-colors flex items-center justify-center gap-1">
              <Headphones className="w-3 h-3" />
              OUT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
