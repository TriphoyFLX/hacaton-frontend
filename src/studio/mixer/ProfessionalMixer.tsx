import { useState, useEffect, useRef } from "react";
import { Volume2, Mic2, Settings, X, Maximize2, Minimize2 } from "lucide-react";
import { useStudioStore } from "../store/useStudioStore";
import type { Track } from "../models";

interface MixerChannelProps {
  track: Track;
  isMaster?: boolean;
}

function MixerChannel({ track, isMaster = false }: MixerChannelProps) {
  const updateTrack = useStudioStore((state) => state.updateTrack);
  const [volume, setVolume] = useState(track.volume);
  const [isMuted, setIsMuted] = useState(track.muted);
  const [isSolo, setIsSolo] = useState(track.solo);
  const [pan, setPan] = useState(0);
  const [showEffects, setShowEffects] = useState(false);

  // Sync local state with store
  useEffect(() => {
    setVolume(track.volume);
    setIsMuted(track.muted);
    setIsSolo(track.solo);
  }, [track]);

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    updateTrack(track.id, { volume: newVolume });
  };

  const handleMuteToggle = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    updateTrack(track.id, { muted: newMuted });
  };

  const handleSoloToggle = () => {
    const newSolo = !isSolo;
    setIsSolo(newSolo);
    updateTrack(track.id, { solo: newSolo });
  };

  const handlePanChange = (newPan: number) => {
    setPan(newPan);
    updateTrack(track.id, { pan: newPan });
  };

  if (isMaster) {
    return (
      <div className="flex flex-col items-center bg-gray-800 border border-gray-700 rounded-lg p-3 w-24">
        <div className="text-xs text-gray-400 font-bold mb-2">MASTER</div>
        
        {/* VU Meter */}
        <div className="w-full h-32 bg-gray-900 rounded mb-3 relative overflow-hidden">
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-green-500 via-yellow-500 to-red-500" style={{ height: '70%' }} />
          <div className="absolute top-1 left-0 right-0 h-0.5 bg-red-600" />
        </div>

        {/* Volume Control */}
        <div className="flex flex-col items-center mb-3">
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="h-24 w-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-vertical"
            style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
          />
          <span className="text-xs text-gray-400 mt-1">{Math.round(volume * 100)}</span>
        </div>

        {/* Master Controls */}
        <div className="flex gap-1">
          <button className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-400 hover:text-white transition-colors">
            <Settings className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center bg-gray-800 border border-gray-700 rounded-lg p-3 w-24 hover:bg-gray-750 transition-colors">
      {/* Track Name */}
      <div className="text-xs text-gray-300 font-medium mb-2 truncate w-full text-center">
        {track.name}
      </div>

      {/* VU Meter */}
      <div className="w-full h-24 bg-gray-900 rounded mb-2 relative overflow-hidden">
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-green-500 via-yellow-500 to-red-500" style={{ height: `${volume * 80}%` }} />
        <div className="absolute top-1 left-0 right-0 h-0.5 bg-red-600" />
        {isMuted && (
          <div className="absolute inset-0 bg-red-900/50 flex items-center justify-center">
            <span className="text-red-400 text-xs font-bold">MUTE</span>
          </div>
        )}
      </div>

      {/* Volume Control */}
      <div className="flex flex-col items-center mb-2">
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
          className="h-20 w-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-vertical"
          style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
        />
        <span className="text-xs text-gray-400 mt-1">{Math.round(volume * 100)}</span>
      </div>

      {/* Pan Control */}
      <div className="flex flex-col items-center mb-2">
        <div className="text-xs text-gray-500 mb-1">PAN</div>
        <input
          type="range"
          min={-1}
          max={1}
          step={0.1}
          value={pan}
          onChange={(e) => handlePanChange(parseFloat(e.target.value))}
          className="w-16 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
        />
        <span className="text-xs text-gray-400 mt-1">{pan === 0 ? 'C' : pan < 0 ? `${Math.abs(pan * 100)}L` : `${Math.round(pan * 100)}R`}</span>
      </div>

      {/* Channel Controls */}
      <div className="flex gap-1 mb-2">
        <button
          onClick={handleMuteToggle}
          className={`p-1.5 rounded transition-colors ${
            isMuted 
              ? "bg-red-600 text-white hover:bg-red-500" 
              : "bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white"
          }`}
          title="Mute"
        >
          <Volume2 className="w-3 h-3" />
        </button>
        <button
          onClick={handleSoloToggle}
          className={`p-1.5 rounded transition-colors ${
            isSolo 
              ? "bg-yellow-600 text-white hover:bg-yellow-500" 
              : "bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white"
          }`}
          title="Solo"
        >
          <span className="text-xs font-bold">S</span>
        </button>
      </div>

      {/* Effects Button */}
      <button
        onClick={() => setShowEffects(!showEffects)}
        className={`p-1.5 rounded transition-colors ${
          showEffects 
            ? "bg-blue-600 text-white hover:bg-blue-500" 
            : "bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white"
        }`}
        title="Effects"
      >
        <Settings className="w-3 h-3" />
      </button>

      {/* Effects Panel */}
      {showEffects && (
        <div className="absolute top-full mt-1 bg-gray-900 border border-gray-700 rounded-lg p-2 z-50 min-w-32">
          <div className="text-xs text-gray-400 mb-2">Effects</div>
          <div className="space-y-1">
            <button className="w-full text-left px-2 py-1 text-xs text-gray-300 hover:bg-gray-700 rounded">
              Reverb
            </button>
            <button className="w-full text-left px-2 py-1 text-xs text-gray-300 hover:bg-gray-700 rounded">
              Delay
            </button>
            <button className="w-full text-left px-2 py-1 text-xs text-gray-300 hover:bg-gray-700 rounded">
              EQ
            </button>
            <button className="w-full text-left px-2 py-1 text-xs text-gray-300 hover:bg-gray-700 rounded">
              Compressor
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ProfessionalMixer() {
  const tracks = useStudioStore((state) => state.tracks);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const mixerRef = useRef<HTMLDivElement>(null);

  return (
    <div 
      ref={mixerRef}
      className={`bg-gray-900 border-t border-gray-700 transition-all duration-300 ${
        isMinimized ? 'h-12' : isMaximized ? 'fixed inset-0 z-50' : 'h-64'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Mic2 className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-white">MIXER</span>
          <span className="text-xs text-gray-500">({tracks.length} tracks)</span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
            title={isMaximized ? "Restore" : "Maximize"}
          >
            {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
            title="Minimize"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mixer Channels */}
      {!isMinimized && (
        <div className={`flex gap-2 p-4 overflow-x-auto ${
          isMaximized ? 'h-full items-center justify-center' : 'items-end'
        }`}>
          {/* Track Channels */}
          {tracks.map((track) => (
            <MixerChannel key={track.id} track={track} />
          ))}
          
          {/* Master Channel */}
          <div className="border-l-2 border-gray-600 pl-4 ml-2">
            <MixerChannel 
              track={{ 
                id: 'master', 
                name: 'Master', 
                type: 'audio', 
                color: '#1f2937', 
                muted: false, 
                solo: false, 
                volume: 1 
              }} 
              isMaster={true} 
            />
          </div>
        </div>
      )}

      {/* Minimized State Info */}
      {isMinimized && (
        <div className="flex items-center justify-center h-full">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>{tracks.length} Tracks</span>
            <span>•</span>
            <span>Click to expand</span>
          </div>
        </div>
      )}
    </div>
  );
}
