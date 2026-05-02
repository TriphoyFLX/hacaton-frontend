import { useCallback, useRef, memo } from 'react';
import { Trash2, Music, Upload } from 'lucide-react';
import type { Channel } from '../models';
import { globalChannelRackEngine } from '../engine/channelRackEngine';

interface ChannelStripProps {
  channel: Channel;
  index: number;
  currentStep: number;
  isPlaying: boolean;
  onToggleStep: (channelId: string, stepIndex: number) => void;
  onUpdate: (id: string, updates: Partial<Channel>) => void;
  onRemove: (id: string) => void;
  onLoadSample: (channelId: string, file: File) => Promise<void>;
}

export const ChannelStrip = memo(function ChannelStrip({
  channel,
  index,
  currentStep,
  isPlaying,
  onToggleStep,
  onUpdate,
  onRemove,
  onLoadSample,
}: ChannelStripProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update engine when params change
  const handleVolumeChange = useCallback((volume: number) => {
    onUpdate(channel.id, { volume });
    globalChannelRackEngine.updateChannelParams(channel.id, volume, channel.pan);
  }, [channel.id, channel.pan, onUpdate]);

  const handlePanChange = useCallback((pan: number) => {
    onUpdate(channel.id, { pan });
    globalChannelRackEngine.updateChannelParams(channel.id, channel.volume, pan);
  }, [channel.id, channel.volume, onUpdate]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onLoadSample(channel.id, file);
    }
  }, [channel.id, onLoadSample]);

  return (
    <div 
      className={`group flex items-center h-14 border-b border-gray-700/50 transition-all duration-200 ${
        channel.muted 
          ? 'bg-gray-800/30 opacity-60' 
          : 'hover:bg-gray-800/20'
      }`}
      style={{ 
        background: channel.muted 
          ? undefined 
          : `linear-gradient(135deg, ${channel.color}08 0%, ${channel.color}04 100%)`
      }}
    >
      {/* Channel Number - Professional */}
      <div className="w-10 flex items-center justify-center">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all duration-200 ${
          currentStep === index && isPlaying
            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
            : 'bg-gray-700/50 text-gray-400 group-hover:bg-gray-600/50'
        }`}>
          {index + 1}
        </div>
      </div>

      {/* Professional Mute / Solo Controls */}
      <div className="flex gap-1.5 px-3">
        <button
          onClick={() => onUpdate(channel.id, { muted: !channel.muted })}
          className={`group/btn w-8 h-8 text-xs font-bold rounded-lg transition-all duration-200 flex items-center justify-center ${
            channel.muted 
              ? 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30 transform scale-105' 
              : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600/70 hover:text-red-400 hover:shadow-md hover:shadow-red-500/20'
          }`}
          title={channel.muted ? "Unmute channel" : "Mute channel"}
        >
          <span className="transition-transform group-hover/btn:scale-110">M</span>
        </button>
        <button
          onClick={() => onUpdate(channel.id, { solo: !channel.solo })}
          className={`group/btn w-8 h-8 text-xs font-bold rounded-lg transition-all duration-200 flex items-center justify-center ${
            channel.solo 
              ? 'bg-gradient-to-br from-yellow-500 to-orange-500 text-black shadow-lg shadow-yellow-500/30 transform scale-105' 
              : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600/70 hover:text-yellow-400 hover:shadow-md hover:shadow-yellow-500/20'
          }`}
          title={channel.solo ? "Unsolo channel" : "Solo channel"}
        >
          <span className="transition-transform group-hover/btn:scale-110">S</span>
        </button>
      </div>

      {/* Channel Name / Sample / Waveform - Mini Instrument Design */}
      <div className="w-44 px-3 flex items-center gap-3">
        {/* Instrument Icon with status */}
        <div className="relative">
          {channel.type === 'sample' ? (
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center border border-green-500/30">
              <Music className="w-4 h-4 text-green-400" />
            </div>
          ) : (
            <div 
              className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center cursor-pointer hover:from-blue-500/30 hover:to-purple-500/30 transition-all duration-200 border border-blue-500/30 hover:border-blue-400/50"
              onClick={() => fileInputRef.current?.click()}
              title="Click to upload sample"
            >
              <Upload className="w-4 h-4 text-blue-400" />
            </div>
          )}
          {/* Status indicator */}
          <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-900 transition-all duration-200 ${
            channel.type === 'sample' 
              ? 'bg-green-400 shadow-sm shadow-green-400/50' 
              : 'bg-blue-400 shadow-sm shadow-blue-400/50'
          }`} />
        </div>
        
        {/* Channel name with professional styling */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-200 truncate group-hover:text-white transition-colors">
            {channel.name}
          </div>
          <div className="text-xs text-gray-500 truncate">
            {channel.type === 'sample' ? 'Sample' : 'Synth'}
          </div>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* Professional Step Sequencer Grid */}
      <div className="flex-1 flex items-center px-4 gap-1.5">
        {/* Beat numbers and steps */}
        <div className="flex-1 flex items-center gap-1">
          {channel.steps.slice(0, 16).map((isActive, stepIndex) => {
            const beatNumber = Math.floor(stepIndex / 4) + 1;
            const isBeatStart = stepIndex % 4 === 0;
            
            return (
              <div key={stepIndex} className="flex-1 flex flex-col items-center gap-1">
                {/* Beat number - Professional */}
                {isBeatStart && (
                  <span className={`text-[10px] font-mono leading-none transition-colors duration-200 ${
                    currentStep === stepIndex && isPlaying
                      ? 'text-blue-400 font-semibold'
                      : 'text-gray-600'
                  }`}>
                    {beatNumber}
                  </span>
                )}
                {!isBeatStart && <span className="text-[10px] leading-none opacity-0">.</span>}
                
                {/* Step button - Professional with glow effects */}
                <button
                  onClick={() => {
                    onToggleStep(channel.id, stepIndex);
                    // Preview sound immediately when adding a step
                    if (!isActive) {
                      globalChannelRackEngine.previewStep(channel);
                    }
                  }}
                  className={`
                    w-full h-10 rounded-lg transition-all duration-150 border relative overflow-hidden
                    ${isActive 
                      ? channel.muted 
                        ? 'bg-gradient-to-br from-red-900/50 to-red-800/50 border-red-700/50' 
                        : `bg-gradient-to-br from-green-500 to-green-600 border-green-400/50 hover:from-green-400 hover:to-green-500 shadow-lg shadow-green-500/30 transform hover:scale-105`
                      : 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-700/70 hover:border-gray-600/70'
                    }
                    ${currentStep === stepIndex && isPlaying ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-gray-900 shadow-lg shadow-blue-400/20' : ''}
                    ${currentStep === stepIndex && !isActive ? 'bg-gray-700/80 border-gray-600' : ''}
                    ${isBeatStart ? 'border-l-2 border-l-gray-600' : ''}
                  `}
                  title={`Step ${stepIndex + 1} - Click to ${isActive ? 'remove' : 'add'} beat`}
                >
                  {/* Active state indicator with glow */}
                  {isActive && !channel.muted && (
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
                  )}
                  
                  {/* Center dot for active state */}
                  {isActive && !channel.muted && (
                    <div className="relative z-10 w-2 h-2 bg-white rounded-full mx-auto shadow-sm shadow-white/50" />
                  )}
                  
                  {/* Subtle hover overlay */}
                  <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Professional Output Controls */}
      <div className="w-40 px-3 flex items-center gap-3">
        {/* Volume with visual feedback */}
        <div className="flex-1 flex items-center gap-2">
          <div className="relative">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={channel.volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-20 h-1.5 bg-gray-700/50 rounded-full appearance-none cursor-pointer slider-volume"
              style={{
                background: `linear-gradient(to right, ${channel.color}80 0%, ${channel.color}80 ${channel.volume * 100}%, #374151 ${channel.volume * 100}%, #374151 100%)`
              }}
            />
            {/* Volume indicator */}
            <div className={`absolute -top-1 left-0 w-3 h-3 rounded-full transition-all duration-200 ${
              channel.volume > 0.7
                ? 'bg-green-400 shadow-sm shadow-green-400/50'
                : channel.volume > 0.3
                ? 'bg-yellow-400 shadow-sm shadow-yellow-400/50'
                : 'bg-gray-500'
            }`} 
            style={{ left: `${channel.volume * 80 - 6}px` }}
            />
          </div>
          <span className="text-xs text-gray-500 font-mono w-8 text-right">
            {Math.round(channel.volume * 100)}%
          </span>
        </div>
      </div>

      {/* Pan Control - Professional */}
      <div className="w-28 px-2 flex items-center gap-2">
        <span className="text-[10px] text-gray-500 font-bold">L</span>
        <div className="relative flex-1">
          <input
            type="range"
            min="-1"
            max="1"
            step="0.05"
            value={channel.pan}
            onChange={(e) => handlePanChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-gray-700/50 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #10b981 0%, #10b981 50%, #8b5cf6 50%, #8b5cf6 100%)`,
              backgroundPosition: `${50 + channel.pan * 50}% 0`,
              backgroundSize: '200% 100%'
            }}
          />
          {/* Pan indicator */}
          <div 
            className="absolute -top-1 w-2.5 h-2.5 bg-white rounded-full shadow-sm shadow-white/50 transition-all duration-200" 
            style={{ left: `${50 + channel.pan * 50}%`, transform: 'translateX(-50%)' }}
          />
        </div>
        <span className="text-[10px] text-gray-500 font-bold">R</span>
      </div>

      {/* Delete Button - Professional */}
      <div className="w-10 flex items-center justify-center">
        <button
          onClick={() => onRemove(channel.id)}
          className="group p-2 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-200"
          title="Remove channel"
        >
          <Trash2 className="w-4 h-4 transition-transform group-hover:scale-110" />
        </button>
      </div>
    </div>
  );
});
