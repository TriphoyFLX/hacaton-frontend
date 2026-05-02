import { useState, useCallback, useEffect, useRef, memo, useMemo } from 'react';
import { useStudioStore } from '../store/useStudioStore';
import { globalChannelRackEngine } from '../engine/channelRackEngine';
import { getSampleLoader } from '../engine/sampleLoader';
import { ProChannelStrip } from '../components/ProChannelStrip';
import { FLQuickStart } from './FLQuickStart';
import { PatternSelector } from './PatternSelector';
import { SwingControl } from './SwingControl';
import { Plus, X, Music, ChevronDown, ChevronUp, Upload } from 'lucide-react';
import type { Channel } from '../models';

// Ultimate Channel List with ProChannelStrip
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
  // Preview step function
  const handlePreviewStep = useCallback((channelId: string, stepIndex: number) => {
    const channel = channels.find(c => c.id === channelId);
    if (channel) {
      globalChannelRackEngine.previewStep(channel);
    }
  }, [channels]);
  
  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-900/50 to-gray-900/80">
      {channels.map((channel, index) => (
        <ProChannelStrip
          key={channel.id}
          channel={channel}
          index={index}
          currentStep={currentStep}
          isPlaying={isPlaying}
          onToggleStep={onToggleStep}
          onUpdate={onUpdateChannel}
          onRemove={onRemoveChannel}
          onLoadSample={onLoadSample}
          onPreviewStep={handlePreviewStep}
        />
      ))}
    </div>
  );
});

ChannelList.displayName = 'ChannelList';

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
    globalChannelRackEngine.onStep((step: number) => {
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
      // Get AudioContext from engine and initialize SampleLoader
      const audioContext = globalChannelRackEngine.getAudioContext();
      if (!audioContext) {
        console.error('AudioContext not available');
        return;
      }
      
      const sampleLoader = getSampleLoader(audioContext);
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
          const audioContext = globalChannelRackEngine.getAudioContext();
          if (!audioContext) {
            console.error('AudioContext not available for dropped sample');
            return;
          }
          
          const sampleLoader = getSampleLoader(audioContext);
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
      {/* Header - Professional DAW branding */}
      <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-gray-800 to-gray-900 border-b border-gray-700/50 backdrop-blur-sm">
        <div className="flex items-center gap-6">
          {/* Logo section with hierarchy */}
          <div className="flex items-center gap-3 bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-4 py-2 rounded-xl border border-blue-500/30 shadow-lg shadow-blue-500/10">
            <Music className="w-6 h-6 text-blue-400" />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white tracking-wide">CHANNEL RACK</span>
              <span className="text-xs text-gray-400">Pattern Sequencer</span>
            </div>
          </div>
          
          {/* Professional playing indicator */}
          {isPlaying && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full border border-green-500/30 shadow-lg shadow-green-500/10">
              <span className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse shadow-sm shadow-green-400/50" />
              <span className="text-xs font-semibold text-green-300 tracking-wide">PLAYING</span>
            </div>
          )}
          
          {/* Pattern Selector */}
          <PatternSelector />
          
          {/* Swing Control */}
          <SwingControl />
        </div>

        <div className="flex items-center gap-3">
          {/* Professional Add Sound Button - Primary Action */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="group flex items-center gap-2.5 px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transform hover:scale-105"
          >
            <Upload className="w-4.5 h-4.5 transition-transform group-hover:scale-110" />
            <span>Add Sound</span>
          </button>
          
          {/* Add Synth Channel - Secondary */}
          <button
            onClick={handleAddChannel}
            className="group flex items-center gap-2.5 px-4 py-2.5 bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-gray-200 text-sm font-medium rounded-xl transition-all duration-200 border border-gray-600/50 hover:border-gray-500/70 shadow-md hover:shadow-lg transform hover:scale-105"
          >
            <Plus className="w-4.5 h-4.5 transition-transform group-hover:rotate-90" />
            <span>Add Synth</span>
          </button>
          
          {/* Window controls - Professional style */}
          <div className="flex items-center gap-1.5 ml-4 pl-4 border-l border-gray-700/50">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="group p-2.5 hover:bg-gray-700/50 rounded-xl text-gray-400 transition-all duration-200 hover:text-gray-200"
              title="Minimize"
            >
              {isMinimized ? 
                <ChevronUp className="w-5 h-5 transition-transform group-hover:translate-y-[-2px]" /> : 
                <ChevronDown className="w-5 h-5 transition-transform group-hover:translate-y-[2px]" />
              }
            </button>
            <button
              onClick={closeChannelRack}
              className="group p-2.5 hover:bg-red-500/20 hover:text-red-400 rounded-xl text-gray-400 transition-all duration-200"
              title="Close"
            >
              <X className="w-5 h-5 transition-transform group-hover:rotate-90" />
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

      {/* Empty State - Professional with FL Patterns */}
      {patternChannels.length === 0 && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-blue-500/30">
                <Music className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Welcome to FL Studio Mode</h3>
              <p className="text-sm text-gray-400">
                Start with professional drum patterns or create your own
              </p>
            </div>
            
            {/* FL Quick Start - Working patterns */}
            <FLQuickStart />
            
            {/* Manual Options */}
            <div className="mt-6 p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
              <div className="flex items-center gap-2 mb-3">
                <Plus className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-semibold text-gray-300">Or Create Manually</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleAddChannel}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 text-gray-200 text-sm font-medium rounded-lg transition-colors border border-gray-600/50"
                >
                  <Plus className="w-4 h-4" />
                  Add Synth
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 text-gray-200 text-sm font-medium rounded-lg transition-colors border border-gray-600/50"
                >
                  <Upload className="w-4 h-4" />
                  Upload Sample
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Channel List - Professional Design */}
      {!isMinimized && patternChannels.length > 0 && (
        <>
          {/* Ultimate Column Headers */}
          <div className="flex items-center px-6 py-4 bg-gradient-to-b from-gray-800/60 to-gray-800/40 border-b border-gray-700/50 backdrop-blur-sm">
            <div className="w-12 text-xs font-bold text-gray-400 tracking-wider">#</div>
            <div className="w-24 text-center text-xs font-bold text-gray-400 tracking-wider">CTRL</div>
            <div className="w-48 text-xs font-bold text-gray-400 tracking-wider">CHANNEL</div>
            <div className="flex-1 text-center text-xs font-bold text-gray-400 tracking-wider">STEP SEQUENCER</div>
            <div className="w-44 text-center text-xs font-bold text-gray-400 tracking-wider">OUTPUT</div>
            <div className="w-16 text-center text-xs font-bold text-gray-400 tracking-wider">ACTIONS</div>
          </div>
          
          {/* Channel List with enhanced design */}
          <div className="flex-1 bg-gradient-to-b from-gray-900/50 to-gray-900/80">
            <ChannelList
              channels={patternChannels}
              currentStep={currentStep}
              isPlaying={isPlaying}
              onToggleStep={toggleChannelStep}
              onUpdateChannel={updateChannel}
              onRemoveChannel={removeChannel}
              onLoadSample={handleLoadSample}
            />
          </div>
        </>
      )}
    </div>
  );
}
