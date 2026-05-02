import { useState, useCallback, useEffect, useRef, memo } from 'react';
import { useStudioStore } from '../store/useStudioStore';
import { globalChannelRackEngine } from '../engine/channelRackEngine';
import { getSampleLoader } from '../engine/sampleLoader';
import { ChannelStrip } from './ChannelStrip';
import { Plus, X, Music, ChevronDown, ChevronUp, Upload, Play, FileAudio } from 'lucide-react';
import type { Channel } from '../models';

// Memoized channel list to prevent unnecessary re-renders
const ChannelList = memo(function ChannelList({ 
  channels, 
  currentStep,
  isPlaying,
  onToggleStep,
  onUpdateChannel,
  onRemoveChannel,
  onLoadSample,
}: { 
  channels: Channel[];
  currentStep: number;
  isPlaying: boolean;
  onToggleStep: (channelId: string, stepIndex: number) => void;
  onUpdateChannel: (id: string, updates: Partial<Channel>) => void;
  onRemoveChannel: (id: string) => void;
  onLoadSample: (channelId: string, file: File) => Promise<void>;
}) {
  return (
    <div className="flex-1 overflow-y-auto">
      {channels.map((channel, index) => (
        <ChannelStrip
          key={channel.id}
          channel={channel}
          index={index}
          currentStep={currentStep}
          isPlaying={isPlaying}
          onToggleStep={onToggleStep}
          onUpdate={onUpdateChannel}
          onRemove={onRemoveChannel}
          onLoadSample={onLoadSample}
        />
      ))}
    </div>
  );
});

export function ChannelRack() {
  const store = useStudioStore();
  const { 
    channels, 
    patterns,
    ui, 
    playback,
    addChannel, 
    removeChannel, 
    updateChannel,
    toggleChannelStep,
    closeChannelRack,
    loadSampleToChannel,
  } = store;
  const { bpm, isPlaying } = playback;

  const [currentStep, setCurrentStep] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const activePattern = patterns.find(p => p.id === ui.activePatternId);
  const patternChannels = channels.filter(c => activePattern?.channelIds.includes(c.id));

  // Sync with channel rack engine playback
  useEffect(() => {
    globalChannelRackEngine.onStep((step) => {
      setCurrentStep(step);
    });
  }, []);

  // Start/stop channel rack engine with transport
  useEffect(() => {
    if (isPlaying && ui.isChannelRackOpen) {
      const stepCount = activePattern?.stepCount || 16;
      globalChannelRackEngine.start(bpm, stepCount);
    } else {
      globalChannelRackEngine.stop();
      setCurrentStep(0);
    }

    return () => {
      globalChannelRackEngine.stop();
    };
  }, [isPlaying, bpm, ui.isChannelRackOpen, activePattern?.stepCount]);

  // Handle sample loading
  const handleLoadSample = useCallback(async (channelId: string, file: File) => {
    try {
      const sampleLoader = getSampleLoader();
      const audioBuffer = await sampleLoader.loadSample(file);
      loadSampleToChannel(channelId, file, audioBuffer);
      globalChannelRackEngine.loadChannelSample(channelId, audioBuffer);
    } catch (error) {
      console.error('Failed to load sample:', error);
      alert('Failed to load sample. Please try a different file.');
    }
  }, [loadSampleToChannel]);

  // Add new channel
  const handleAddChannel = useCallback(() => {
    const newChannel = {
      name: `Channel ${channels.length + 1}`,
      type: 'synth' as const,
      color: '#3b82f6',
      muted: false,
      solo: false,
      volume: 0.8,
      pan: 0,
      stepCount: 16,
    };
    addChannel(newChannel);
  }, [addChannel, channels.length]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(f => 
      f.type.startsWith('audio/') || f.name.endsWith('.wav') || f.name.endsWith('.mp3')
    );

    for (const file of files) {
      // Create a new channel for each dropped file
      const newChannel = {
        name: file.name.replace(/\.[^/.]+$/, ''),
        type: 'sample' as const,
        color: '#22c55e',
        muted: false,
        solo: false,
        volume: 0.8,
        pan: 0,
        stepCount: 16,
      };
      
      // Add channel then load sample
      addChannel(newChannel);
      
      // Get the newly created channel ID (last one in the list)
      const state = useStudioStore.getState();
      const lastChannel = state.channels[state.channels.length - 1];
      if (lastChannel) {
        try {
          const sampleLoader = getSampleLoader();
          const audioBuffer = await sampleLoader.loadSample(file);
          loadSampleToChannel(lastChannel.id, file, audioBuffer);
          globalChannelRackEngine.loadChannelSample(lastChannel.id, audioBuffer);
        } catch (error) {
          console.error('Failed to load dropped sample:', error);
        }
      }
    }
  }, [addChannel, loadSampleToChannel]);

  if (!ui.isChannelRackOpen) return null;

  return (
    <div 
      className={`fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 z-40 transition-all duration-200 ${
        isMinimized ? 'h-10' : 'h-80'
      } ${isDragging ? 'ring-2 ring-blue-500' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header - Clear branding */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-700">
            <Music className="w-5 h-5 text-blue-400" />
            <span className="text-sm font-bold text-white">STEP SEQUENCER</span>
          </div>
          
          {/* Playing indicator */}
          {isPlaying && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/20 rounded-full">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-medium text-green-400">PLAYING</span>
            </div>
          )}
          
          {/* Quick instruction hint */}
          <span className="text-xs text-gray-500 hidden sm:inline">
            Click squares to add beats • Press ▶ to play
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* BIG Add Sound Button - Primary Action */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-lg transition-all shadow-lg hover:shadow-green-500/20"
          >
            <Upload className="w-4 h-4" />
            Add Your Sound
          </button>
          
          {/* Add Synth Channel - Secondary */}
          <button
            onClick={handleAddChannel}
            className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm rounded-lg transition-colors border border-gray-600"
          >
            <Plus className="w-4 h-4" />
            Add Synth
          </button>
          
          {/* Minimize/Close */}
          <div className="flex items-center gap-1 ml-2 border-l border-gray-700 pl-2">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 transition-colors"
              title="Minimize"
            >
              {isMinimized ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            <button
              onClick={closeChannelRack}
              className="p-2 hover:bg-red-500/20 hover:text-red-400 rounded-lg text-gray-400 transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.wav,.mp3,.ogg"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          files.forEach(file => handleLoadSample(`ch-${Date.now()}`, file));
        }}
      />

      {/* Drag Overlay - Clear visual feedback */}
      {isDragging && (
        <div className="absolute inset-0 bg-blue-600/20 border-4 border-blue-500 border-dashed z-50 flex items-center justify-center">
          <div className="bg-gray-900 px-6 py-4 rounded-xl border border-blue-500 shadow-2xl">
            <Upload className="w-12 h-12 text-blue-400 mx-auto mb-2" />
            <p className="text-lg font-bold text-white text-center">Drop audio file here</p>
            <p className="text-sm text-gray-400 text-center">WAV or MP3</p>
          </div>
        </div>
      )}

      {/* Empty State - When no channels */}
      {!isMinimized && patternChannels.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Play className="w-10 h-10 text-gray-600" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No sounds yet</h3>
            <p className="text-gray-400 mb-6">
              Add your first sound to start making beats
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg transition-all"
              >
                <FileAudio className="w-5 h-5" />
                Upload Sound
              </button>
              <button
                onClick={handleAddChannel}
                className="flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-all"
              >
                <Plus className="w-5 h-5" />
                Create Synth
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Channel List */}
      {!isMinimized && patternChannels.length > 0 && (
        <>
          {/* Column Headers */}
          <div className="flex items-center px-4 py-2 bg-gray-850 border-b border-gray-800 text-xs text-gray-500">
            <div className="w-8">#</div>
            <div className="w-16 text-center">MUTE</div>
            <div className="w-32">SOUND NAME</div>
            <div className="flex-1 text-center">CLICK SQUARES TO MAKE BEATS</div>
            <div className="w-24 text-center">VOLUME</div>
            <div className="w-20 text-center">PAN</div>
            <div className="w-8"></div>
          </div>
          <ChannelList
            channels={patternChannels}
            currentStep={currentStep}
            isPlaying={isPlaying}
            onToggleStep={toggleChannelStep}
            onUpdateChannel={updateChannel}
            onRemoveChannel={removeChannel}
            onLoadSample={handleLoadSample}
          />
        </>
      )}
    </div>
  );
}
