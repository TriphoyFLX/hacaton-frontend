import { useState, useRef, useCallback, memo } from 'react';
import { Volume2, VolumeX, Trash2, Music, Upload, Headphones } from 'lucide-react';
import { WaveformDisplay } from './WaveformDisplay';
import { StepSequencer } from './StepSequencer';
import type { Channel } from '../models';

/**
 * PROFESSIONAL CHANNEL STRIP
 * 
 * Ultimate FL Studio style channel with waveform and advanced controls
 */
interface ProChannelStripProps {
  channel: Channel;
  index: number;
  currentStep: number;
  isPlaying: boolean;
  onToggleStep: (channelId: string, stepIndex: number) => void;
  onUpdate: (id: string, updates: Partial<Channel>) => void;
  onRemove: (id: string) => void;
  onLoadSample?: (channelId: string, file: File) => Promise<void>;
  onPreviewStep?: (channelId: string, stepIndex: number) => void;
}

export const ProChannelStrip = memo(function ProChannelStrip({
  channel,
  index,
  currentStep,
  isPlaying,
  onToggleStep,
  onUpdate,
  onRemove,
  onLoadSample,
  onPreviewStep
}: ProChannelStripProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isCurrentStep = currentStep === index && isPlaying;

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onLoadSample) {
      await onLoadSample(channel.id, file);
    }
  }, [channel.id, onLoadSample]);

  const handleVolumeChange = useCallback((value: number) => {
    onUpdate(channel.id, { volume: value });
  }, [channel.id, onUpdate]);

  const handlePanChange = useCallback((value: number) => {
    onUpdate(channel.id, { pan: value });
  }, [channel.id, onUpdate]);

  const handleMuteToggle = useCallback(() => {
    onUpdate(channel.id, { muted: !channel.muted });
  }, [channel.id, onUpdate]);

  const handleSoloToggle = useCallback(() => {
    onUpdate(channel.id, { solo: !channel.solo });
  }, [channel.id, onUpdate]);

  const handleStepClick = useCallback((stepIndex: number) => {
    onToggleStep(channel.id, stepIndex);
    if (onPreviewStep) {
      onPreviewStep(channel.id, stepIndex);
    }
  }, [channel.id, onToggleStep, onPreviewStep]);

  return (
    <div 
      className={`group flex items-center h-16 border-b border-gray-700/50 transition-all duration-200 ${
        channel.muted 
          ? 'bg-gray-800/30 opacity-60' 
          : isHovered 
            ? 'bg-gray-800/20' 
            : 'hover:bg-gray-800/10'
      }`}
      style={{ 
        background: channel.muted 
          ? undefined 
          : `linear-gradient(135deg, ${channel.color}08 0%, ${channel.color}04 100%)`
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Channel Number */}
      <div className="w-12 flex items-center justify-center">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all duration-200 ${
          isCurrentStep
            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 animate-pulse'
            : 'bg-gray-700/50 text-gray-400 group-hover:bg-gray-600/50'
        }`}>
          {index + 1}
        </div>
      </div>

      {/* Channel Controls */}
      <div className="w-24 flex items-center gap-2 px-3">
        {/* Mute/Solo buttons */}
        <div className="flex gap-1">
          <button
            onClick={handleMuteToggle}
            className={`group/btn w-7 h-7 text-xs font-bold rounded-lg transition-all duration-200 flex items-center justify-center ${
              channel.muted 
                ? 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30 transform scale-105' 
                : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600/70 hover:text-red-400'
            }`}
            title={channel.muted ? "Unmute" : "Mute"}
          >
            <span className="transition-transform group-hover/btn:scale-110">M</span>
          </button>
          <button
            onClick={handleSoloToggle}
            className={`group/btn w-7 h-7 text-xs font-bold rounded-lg transition-all duration-200 flex items-center justify-center ${
              channel.solo 
                ? 'bg-gradient-to-br from-yellow-500 to-orange-500 text-black shadow-lg shadow-yellow-500/30 transform scale-105' 
                : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600/70 hover:text-yellow-400'
            }`}
            title={channel.solo ? "Unsolo" : "Solo"}
          >
            <span className="transition-transform group-hover/btn:scale-110">S</span>
          </button>
        </div>
      </div>

      {/* Channel Info with Waveform */}
      <div className="w-48 px-3">
        <div className="flex items-center gap-3">
          {/* Instrument icon */}
          <div className="relative">
            {channel.type === 'sample' ? (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center border border-green-500/30">
                <Music className="w-5 h-5 text-green-400" />
              </div>
            ) : (
              <div 
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center cursor-pointer hover:from-blue-500/30 hover:to-purple-500/30 transition-all duration-200 border border-blue-500/30"
                onClick={() => fileInputRef.current?.click()}
                title="Upload sample"
              >
                <Upload className="w-5 h-5 text-blue-400" />
              </div>
            )}
            
            {/* Status indicator */}
            <div className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-gray-900 transition-all duration-200 ${
              channel.type === 'sample' 
                ? 'bg-green-400 shadow-sm shadow-green-400/50' 
                : 'bg-blue-400 shadow-sm shadow-blue-400/50'
            }`} />
            
            {/* Recording indicator */}
            {isRecording && (
              <div className="absolute -top-1 -left-1 w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-sm shadow-red-500/50" />
            )}
          </div>
          
          {/* Channel details */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-200 truncate group-hover:text-white transition-colors">
              {channel.name}
            </div>
            <div className="text-xs text-gray-500 truncate">
              {channel.type === 'sample' ? 'Sample' : 'Synth'} • {channel.steps.filter(s => s).length} steps
            </div>
          </div>
        </div>
        
        {/* Waveform display */}
        <div className="mt-2">
          <WaveformDisplay
            isActive={isCurrentStep}
            color={channel.color}
            height={20}
          />
        </div>
      </div>

      {/* Step Sequencer */}
      <div className="flex-1">
        <StepSequencer
          steps={channel.steps}
          currentStep={currentStep}
          isPlaying={isPlaying}
          channelName={channel.name}
          channelColor={channel.color}
          onToggleStep={(stepIndex) => handleStepClick(stepIndex)}
        />
      </div>

      {/* Output Controls */}
      <div className="w-44 flex items-center gap-4 px-3">
        {/* Volume slider */}
        <div className="flex-1">
          <div className="relative">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={channel.volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-gray-700/50 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, ${channel.color}80 0%, ${channel.color}80 ${channel.volume * 100}%, #374151 ${channel.volume * 100}%, #374151 100%)`
              }}
            />
            <div 
              className={`absolute -top-1 w-3 h-3 rounded-full transition-all duration-200 ${
                channel.volume > 0.7
                  ? 'bg-green-400 shadow-sm shadow-green-400/50'
                  : channel.volume > 0.3
                  ? 'bg-yellow-400 shadow-sm shadow-yellow-400/50'
                  : 'bg-gray-500'
              }`} 
              style={{ left: `${channel.volume * 100}%`, transform: 'translateX(-50%)' }}
            />
          </div>
          <span className="text-xs text-gray-500 font-mono text-center mt-1 block">
            {Math.round(channel.volume * 100)}%
          </span>
        </div>

        {/* Pan control */}
        <div className="w-16">
          <div className="relative">
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
            <div 
              className="absolute -top-1 w-2.5 h-2.5 bg-white rounded-full shadow-sm shadow-white/50 transition-all duration-200" 
              style={{ left: `${50 + channel.pan * 50}%`, transform: 'translateX(-50%)' }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-gray-500 mt-1">
            <span>L</span>
            <span>R</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="w-16 flex items-center gap-2 px-3">
        {/* Solo/Mute indicators */}
        <div className="flex gap-1">
          {channel.muted && (
            <div className="w-2 h-2 bg-red-400 rounded-full" title="Muted" />
          )}
          {channel.solo && (
            <div className="w-2 h-2 bg-yellow-400 rounded-full" title="Solo" />
          )}
        </div>
        
        {/* Delete button */}
        <button
          onClick={() => onRemove(channel.id)}
          className="group p-2 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-200"
          title="Remove channel"
        >
          <Trash2 className="w-4 h-4 transition-transform group-hover:scale-110" />
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
});

ProChannelStrip.displayName = 'ProChannelStrip';
