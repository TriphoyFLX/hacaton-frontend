import { useCallback, useRef, memo } from 'react';
import { Volume2, VolumeX, Trash2, Music, Upload } from 'lucide-react';
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
      className="flex items-center h-12 border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
      style={{ backgroundColor: channel.muted ? undefined : `${channel.color}10` }}
    >
      {/* Channel Number */}
      <div className="w-8 flex items-center justify-center text-xs text-gray-500 font-mono">
        {index + 1}
      </div>

      {/* Mute / Solo Buttons - Clearer labels */}
      <div className="flex gap-1 px-2">
        <button
          onClick={() => onUpdate(channel.id, { muted: !channel.muted })}
          className={`w-7 h-7 text-xs font-bold rounded transition-colors ${
            channel.muted 
              ? 'bg-red-500 text-white shadow-[0_0_8px_rgba(239,68,68,0.4)]' 
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          }`}
          title={channel.muted ? "Click to unmute" : "Click to mute"}
        >
          M
        </button>
        <button
          onClick={() => onUpdate(channel.id, { solo: !channel.solo })}
          className={`w-7 h-7 text-xs font-bold rounded transition-colors ${
            channel.solo 
              ? 'bg-yellow-500 text-black shadow-[0_0_8px_rgba(234,179,8,0.4)]' 
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          }`}
          title={channel.solo ? "Click to unsolo" : "Click to solo"}
        >
          S
        </button>
      </div>

      {/* Channel Name / Sample - PROMINENT */}
      <div className="w-36 px-3 flex items-center gap-2">
        {channel.type === 'sample' ? (
          <div className="w-6 h-6 rounded bg-green-500/20 flex items-center justify-center">
            <Music className="w-3.5 h-3.5 text-green-400" />
          </div>
        ) : (
          <div 
            className="w-6 h-6 rounded bg-blue-500/20 flex items-center justify-center cursor-pointer hover:bg-blue-500/40 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            title="Click to upload sample"
          >
            <Upload className="w-3.5 h-3.5 text-blue-400" />
          </div>
        )}
        <span className="text-sm font-medium text-gray-200 truncate flex-1">{channel.name}</span>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* Step Sequencer Grid - BIGGER, CLEARER */}
      <div className="flex-1 flex items-center px-3 gap-1">
        {/* Beat numbers row above */}
        <div className="flex-1 flex items-center gap-1">
          {channel.steps.slice(0, 16).map((isActive, stepIndex) => {
            const isCurrentStep = currentStep === stepIndex;
            const beatNumber = Math.floor(stepIndex / 4) + 1;
            const isBeatStart = stepIndex % 4 === 0;
            
            return (
              <div key={stepIndex} className="flex-1 flex flex-col items-center gap-0.5">
                {/* Beat number label */}
                {isBeatStart && (
                  <span className="text-[10px] text-gray-600 font-mono leading-none">{beatNumber}</span>
                )}
                {!isBeatStart && <span className="text-[10px] leading-none">&nbsp;</span>}
                
                {/* Step button - BIGGER with clear ON/OFF states */}
                <button
                  onClick={() => {
                    onToggleStep(channel.id, stepIndex);
                    // Preview sound immediately when adding a step
                    if (!isActive) {
                      globalChannelRackEngine.previewStep(channel);
                    }
                  }}
                  className={`
                    w-full h-9 rounded transition-all duration-75 border-2
                    ${isActive 
                      ? channel.muted 
                        ? 'bg-red-900/50 border-red-800' 
                        : 'bg-green-500 border-green-400 hover:bg-green-400 shadow-[0_0_8px_rgba(34,197,94,0.3)]'
                      : 'bg-gray-800 border-gray-700 hover:bg-gray-700 hover:border-gray-600'
                    }
                    ${isCurrentStep && isPlaying ? 'ring-2 ring-blue-400 ring-offset-1 ring-offset-gray-900' : ''}
                    ${isCurrentStep && !isActive ? 'bg-gray-700 border-gray-600' : ''}
                    ${isBeatStart ? 'border-l-gray-600' : ''}
                  `}
                  title={`Step ${stepIndex + 1} - Click to ${isActive ? 'remove' : 'add'} beat`}
                >
                  {/* Small dot indicator for active state */}
                  {isActive && !channel.muted && (
                    <div className="w-1.5 h-1.5 bg-white rounded-full mx-auto" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Volume Slider - With visual feedback */}
      <div className="w-28 px-2 flex items-center gap-2 group">
        <button
          onClick={() => onUpdate(channel.id, { muted: !channel.muted })}
          className={`p-1.5 rounded transition-colors ${
            channel.muted ? 'text-red-500' : 'text-gray-400 hover:text-white'
          }`}
          title={channel.muted ? "Unmute" : "Mute"}
        >
          {channel.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={channel.volume}
          onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
          className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
      </div>

      {/* Pan Slider - Cleaner */}
      <div className="w-24 px-2 flex items-center gap-1">
        <span className="text-[10px] text-gray-500 font-medium">L</span>
        <input
          type="range"
          min="-1"
          max="1"
          step="0.05"
          value={channel.pan}
          onChange={(e) => handlePanChange(parseFloat(e.target.value))}
          className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
        />
        <span className="text-[10px] text-gray-500 font-medium">R</span>
      </div>

      {/* Delete Button - More subtle */}
      <button
        onClick={() => onRemove(channel.id)}
        className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
        title="Remove channel"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
});
