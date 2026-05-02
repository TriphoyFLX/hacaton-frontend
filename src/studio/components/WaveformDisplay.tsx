import { useEffect, useRef } from 'react';

/**
 * PROFESSIONAL WAVEFORM DISPLAY
 * 
 * Real-time waveform visualization like FL Studio
 */
interface WaveformDisplayProps {
  audioBuffer?: AudioBuffer;
  isActive: boolean;
  color: string;
  height?: number;
  className?: string;
}

export function WaveformDisplay({ 
  audioBuffer, 
  isActive, 
  color, 
  height = 40,
  className = ''
}: WaveformDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!audioBuffer) {
      // Draw placeholder waveform
      drawPlaceholderWaveform(ctx, canvas.width, canvas.height, color, isActive);
      return;
    }

    // Draw actual waveform
    drawWaveform(ctx, audioBuffer, canvas.width, canvas.height, color, isActive);
  }, [audioBuffer, color, isActive, height]);

  const drawWaveform = (
    ctx: CanvasRenderingContext2D,
    buffer: AudioBuffer,
    width: number,
    height: number,
    color: string,
    isActive: boolean
  ) => {
    const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / width);
    const amp = height / 2;

    ctx.beginPath();
    ctx.moveTo(0, amp);
    ctx.strokeStyle = isActive ? color : `${color}66`;
    ctx.lineWidth = isActive ? 2 : 1;

    for (let i = 0; i < width; i++) {
      let min = 1.0;
      let max = -1.0;

      for (let j = 0; j < step; j++) {
        const datum = data[(i * step) + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }

      ctx.lineTo(i, (1 + min) * amp);
      ctx.lineTo(i, (1 + max) * amp);
    }

    ctx.stroke();

    // Add glow effect for active state
    if (isActive) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  };

  const drawPlaceholderWaveform = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    color: string,
    isActive: boolean
  ) => {
    const amp = height / 2;
    
    ctx.beginPath();
    ctx.moveTo(0, amp);
    ctx.strokeStyle = isActive ? color : `${color}44`;
    ctx.lineWidth = isActive ? 2 : 1;

    // Generate synthetic waveform pattern
    for (let i = 0; i < width; i++) {
      const t = i / width;
      const value = Math.sin(t * Math.PI * 8) * 0.3 * Math.sin(t * Math.PI * 2) +
                   Math.sin(t * Math.PI * 16) * 0.2;
      
      ctx.lineTo(i, amp + value * amp * 0.8);
    }

    ctx.stroke();

    if (isActive) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={height}
      className={`w-full h-full ${className}`}
      style={{ imageRendering: 'crisp-edges' }}
    />
  );
}
