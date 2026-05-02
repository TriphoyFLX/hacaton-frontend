import { useState } from 'react';
import { useStudioStore } from '../store/useStudioStore';
import { Volume2 } from 'lucide-react';

interface StepSequencerProps {
  channelId: string;
}

export function StepSequencer({ channelId }: StepSequencerProps) {
  const { channels, toggleChannelStep, updateChannel } = useStudioStore();
  const channel = channels.find(ch => ch.id === channelId);
  
  if (!channel) return null;

  const [velocities, setVelocities] = useState<number[]>(
    Array(channel.stepCount).fill(100)
  );
  const [previewStep, setPreviewStep] = useState<number | null>(null);

  const handleStepClick = (stepIndex: number) => {
    toggleChannelStep(channelId, stepIndex);
    setPreviewStep(stepIndex);
    
    // Set velocity to 100 when step is activated
    if (!channel.steps[stepIndex]) {
      setVelocities(prev => {
        const copy = [...prev];
        copy[stepIndex] = 100;
        return copy;
      });
    }
  };

  const handleVelocityChange = (stepIndex: number, velocity: number) => {
    setVelocities(prev => {
      const copy = [...prev];
      copy[stepIndex] = velocity;
      return copy;
    });
  };

  return (
    <div className="flex flex-col gap-1">
      {/* Step Count Selector */}
      <div className="flex gap-1 mb-2">
        {[16, 32, 64].map(len => (
          <button
            key={len}
            onClick={() => updateChannel(channelId, { stepCount: len })}
            className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
              channel.stepCount === len 
                ? 'bg-[#4a9eff] text-black' 
                : 'bg-[#2a2a3a] text-gray-300 hover:bg-[#3a3a3a]'
            }`}
          >
            {len}
          </button>
        ))}
      </div>

      {/* Step Grid */}
      <div className="grid grid-cols-16 gap-1">
        {Array.from({ length: channel.stepCount }).map((_, stepIndex) => (
          <div
            key={stepIndex}
            className="relative"
          >
            <button
              onClick={() => handleStepClick(stepIndex)}
              className={`w-full aspect-square border border-gray-600 rounded transition-all duration-150 relative overflow-hidden ${
                channel.steps[stepIndex] 
                  ? 'bg-[#4a9eff] border-[#5aa3ff] shadow-lg shadow-[#4a9eff]/50' 
                  : 'bg-[#1a1a24] hover:bg-[#2a2a3a] border-gray-600'
              }`}
            >
              {/* Velocity Indicator */}
              {channel.steps[stepIndex] && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
                  <div
                    className="h-full bg-yellow-400 transition-all duration-150"
                    style={{ width: `${velocities[stepIndex] || 100}%` }}
                  />
                </div>
              )}

              {/* Visual Feedback - Animated Wave */}
              {previewStep === stepIndex && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-8 h-8 bg-blue-400 rounded-full animate-ping opacity-75" />
                </div>
              )}

              {/* Step Number */}
              <div className="absolute top-0.5 left-0.5 text-xs text-gray-400 font-mono">
                {stepIndex + 1}
              </div>
            </button>

            {/* Velocity Control (small slider under each step) */}
            {channel.steps[stepIndex] && (
              <div className="absolute -bottom-6 left-0 right-0">
                <input
                  type="range"
                  min="0"
                  max="127"
                  value={velocities[stepIndex]}
                  onChange={(e) => handleVelocityChange(stepIndex, parseInt(e.target.value))}
                  className="w-full h-1 bg-gray-700 accent-yellow-400"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Channel Controls */}
      <div className="flex items-center gap-2 mt-2 p-2 bg-[#1a1a24] rounded">
        <Volume2 className="w-4 h-4 text-gray-400" />
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={channel.volume}
          onChange={(e) => updateChannel(channelId, { volume: parseFloat(e.target.value) })}
          className="flex-1 h-1 bg-gray-700 accent-blue-400"
        />
        <div className="w-4 h-4 text-gray-400 flex items-center justify-center">◐</div>
        <input
          type="range"
          min="-1"
          max="1"
          step="0.1"
          value={channel.pan}
          onChange={(e) => updateChannel(channelId, { pan: parseFloat(e.target.value) })}
          className="flex-1 h-1 bg-gray-700 accent-green-400"
        />
      </div>
    </div>
  );
}
