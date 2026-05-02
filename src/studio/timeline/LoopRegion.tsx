import { useState, useCallback, useRef, useEffect } from 'react';
import { useStudioStore } from '../store/useStudioStore';
import { useGrid } from './useGrid';

export function LoopRegion() {
  const { ui, setLoopRegion } = useStudioStore();
  const { config } = useGrid();
  const [isDraggingStart, setIsDraggingStart] = useState(false);
  const [isDraggingEnd, setIsDraggingEnd] = useState(false);
  const [isDraggingRegion, setIsDraggingRegion] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, beat: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const loopStart = ui.loopStart || 0;
  const loopEnd = ui.loopEnd || 4;
  const loopEnabled = ui.loopEnabled || false;

  const handleMouseDownStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDraggingStart(true);
    setDragStart({ x: e.clientX, beat: loopStart });
  }, [loopStart]);

  const handleMouseDownEnd = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDraggingEnd(true);
    setDragStart({ x: e.clientX, beat: loopEnd });
  }, [loopEnd]);

  const handleMouseDownRegion = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDraggingRegion(true);
    setDragStart({ x: e.clientX, beat: loopStart });
  }, [loopStart]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const deltaX = e.clientX - dragStart.x;
    const deltaBeats = deltaX / config.pixelsPerBeat;

    if (isDraggingStart) {
      const newStart = Math.max(0, dragStart.beat + deltaBeats);
      setLoopRegion(newStart, Math.max(newStart + 1, loopEnd));
    } else if (isDraggingEnd) {
      const newEnd = Math.max(0, dragStart.beat + deltaBeats);
      setLoopRegion(loopStart, Math.max(loopStart + 1, newEnd));
    } else if (isDraggingRegion) {
      const newStart = Math.max(0, dragStart.beat + deltaBeats);
      const duration = loopEnd - loopStart;
      setLoopRegion(newStart, newStart + duration);
    }
  }, [isDraggingStart, isDraggingEnd, isDraggingRegion, dragStart, config.pixelsPerBeat, loopStart, loopEnd, setLoopRegion]);

  const handleMouseUp = useCallback(() => {
    setIsDraggingStart(false);
    setIsDraggingEnd(false);
    setIsDraggingRegion(false);
  }, []);

  // Global mouse event listeners
  useEffect(() => {
    if (isDraggingStart || isDraggingEnd || isDraggingRegion) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingStart, isDraggingEnd, isDraggingRegion, handleMouseMove, handleMouseUp]);

  const left = loopStart * config.pixelsPerBeat;
  const width = (loopEnd - loopStart) * config.pixelsPerBeat;

  return (
    <div
      ref={containerRef}
      className={`absolute top-0 bottom-0 pointer-events-none transition-opacity ${
        loopEnabled ? 'opacity-100' : 'opacity-30'
      }`}
      style={{ left, width }}
    >
      {/* Loop region background */}
      <div className="absolute inset-0 bg-green-500/10 border-y border-green-500/30" />
      
      {/* Start handle */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize pointer-events-auto transition-colors ${
          isDraggingStart ? 'bg-green-400' : 'bg-green-500/50 hover:bg-green-400'
        }`}
        onMouseDown={handleMouseDownStart}
      />
      
      {/* End handle */}
      <div
        className={`absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize pointer-events-auto transition-colors ${
          isDraggingEnd ? 'bg-green-400' : 'bg-green-500/50 hover:bg-green-400'
        }`}
        onMouseDown={handleMouseDownEnd}
      />
      
      {/* Region drag area */}
      <div
        className="absolute inset-2 cursor-move pointer-events-auto"
        onMouseDown={handleMouseDownRegion}
      />
      
      {/* Loop indicators */}
      <div className="absolute -top-6 left-0 text-xs text-green-400 font-mono bg-gray-800 px-1 rounded">
        {loopStart.toFixed(1)}
      </div>
      <div className="absolute -top-6 right-0 text-xs text-green-400 font-mono bg-gray-800 px-1 rounded">
        {loopEnd.toFixed(1)}
      </div>
      
      {/* Loop icon */}
      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-green-400">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
        </svg>
      </div>
    </div>
  );
}
