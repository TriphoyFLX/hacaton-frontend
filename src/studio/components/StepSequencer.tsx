import { useState, useEffect } from 'react';
import { Volume2 } from 'lucide-react';

/**
 * ULTIMATE STEP SEQUENCER
 * 
 * Professional FL Studio style step sequencer with animations
 */
interface StepSequencerProps {
  steps: boolean[];
  currentStep: number;
  isPlaying: boolean;
  channelName: string;
  channelColor: string;
  onToggleStep: (stepIndex: number) => void;
  onPreviewStep?: (stepIndex: number) => void;
}

export function StepSequencer({
  steps,
  currentStep,
  isPlaying,
  channelName,
  channelColor,
  onToggleStep,
  onPreviewStep
}: StepSequencerProps) {
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);
  const [previewStep, setPreviewStep] = useState<number | null>(null);

  // Clear preview after animation
  useEffect(() => {
    if (previewStep !== null) {
      const timer = setTimeout(() => setPreviewStep(null), 150);
      return () => clearTimeout(timer);
    }
  }, [previewStep]);

  const handleStepClick = (stepIndex: number) => {
    onToggleStep(stepIndex);
    
    // Preview animation
    setPreviewStep(stepIndex);
    
    // Sound preview if provided
    if (onPreviewStep) {
      onPreviewStep(stepIndex);
    }
  };

  const getStepStyle = (stepIndex: number) => {
    const isActive = steps[stepIndex];
    const isCurrent = currentStep === stepIndex && isPlaying;
    const isHovered = hoveredStep === stepIndex;
    const isPreviewing = previewStep === stepIndex;
    const isBeatStart = stepIndex % 4 === 0;

    let baseStyle = 'relative w-full h-10 rounded-lg border-2 transition-all duration-150 cursor-pointer overflow-hidden';
    
    // Active state
    if (isActive) {
      baseStyle += ` bg-gradient-to-br from-green-500 to-green-600 border-green-400/50 shadow-lg shadow-green-500/30`;
      if (isCurrent) {
        baseStyle += ' ring-2 ring-green-400 ring-offset-2 ring-offset-gray-900 shadow-green-400/50';
      }
    } else {
      baseStyle += ' bg-gray-800/50 border-gray-700/50 hover:bg-gray-700/70';
      if (isCurrent) {
        baseStyle += ' bg-gray-700/80 border-gray-600 ring-2 ring-blue-400/50 ring-offset-2 ring-offset-gray-900';
      }
    }

    // Hover effects
    if (isHovered && !isActive) {
      baseStyle += ' transform scale-105 border-gray-600';
    } else if (isHovered && isActive) {
      baseStyle += ' transform scale-110 shadow-green-500/40';
    }

    // Beat start emphasis
    if (isBeatStart && !isActive) {
      baseStyle += ' border-l-2 border-l-gray-600';
    }

    // Preview animation
    if (isPreviewing) {
      baseStyle += ' animate-pulse ring-2 ring-white ring-offset-2 ring-offset-gray-900';
    }

    return baseStyle;
  };

  const getBeatNumber = (stepIndex: number) => {
    const beatNumber = Math.floor(stepIndex / 4) + 1;
    const isBeatStart = stepIndex % 4 === 0;
    const isCurrent = currentStep === stepIndex && isPlaying;

    if (!isBeatStart) return null;

    return (
      <span className={`text-[10px] font-mono leading-none transition-colors duration-200 ${
        isCurrent ? 'text-blue-400 font-semibold' : 'text-gray-600'
      }`}>
        {beatNumber}
      </span>
    );
  };

  return (
    <div className="flex items-center gap-1.5 px-4">
      {/* Volume indicator */}
      <div className="w-8 flex items-center justify-center">
        <Volume2 className="w-4 h-4 text-gray-500" />
      </div>

      {/* Step grid */}
      <div className="flex-1 flex items-center gap-1">
        {steps.slice(0, 16).map((isActive, stepIndex) => (
          <div key={stepIndex} className="flex-1 flex flex-col items-center gap-1">
            {/* Beat number */}
            {getBeatNumber(stepIndex)}
            {!getBeatNumber(stepIndex) && <span className="text-[10px] leading-none opacity-0">.</span>}
            
            {/* Step button */}
            <button
              className={getStepStyle(stepIndex)}
              onClick={() => handleStepClick(stepIndex)}
              onMouseEnter={() => setHoveredStep(stepIndex)}
              onMouseLeave={() => setHoveredStep(null)}
              title={`Step ${stepIndex + 1} - ${isActive ? 'Remove' : 'Add'} beat`}
            >
              {/* Inner glow effect for active steps */}
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
              )}
              
              {/* Center dot indicator */}
              {isActive && (
                <div className="relative z-10 w-2 h-2 bg-white rounded-full mx-auto shadow-sm shadow-white/50" />
              )}
              
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-white/5 opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />
              
              {/* Current step indicator */}
              {currentStep === stepIndex && isPlaying && (
                <div className="absolute inset-0 bg-blue-400/10 animate-pulse pointer-events-none" />
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Channel name indicator */}
      <div className="w-24 text-right">
        <div 
          className="text-xs font-medium truncate"
          style={{ color: channelColor }}
        >
          {channelName}
        </div>
        <div className="text-[10px] text-gray-500">
          {steps.filter(s => s).length} / {steps.length}
        </div>
      </div>
    </div>
  );
}
