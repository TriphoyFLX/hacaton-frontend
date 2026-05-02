import { useState, useCallback, useEffect, useRef } from "react";
import { useStudioStore } from "../store/useStudioStore";
import { useTransport } from "../engine/useTransport";
import { useGrid } from "./useGrid";

// Track header width in pixels (w-48 = 12rem = 192px)
const HEADER_OFFSET = 192;

export function Playhead() {
  const currentTime = useStudioStore((state) => state.playback.currentTime);
  const { beatToPixels, pixelsToBeat } = useGrid();
  const { seek } = useTransport();
  const [isDragging, setIsDragging] = useState(false);
  const [dragBeat, setDragBeat] = useState(0);
  const timelineRef = useRef<HTMLDivElement | null>(null);

  // Find timeline container on mount
  useEffect(() => {
    // Playhead is inside TimelineDroppable which is inside the scrollable timeline div
    const timeline = document.querySelector('[data-timeline-playhead-container]') as HTMLDivElement;
    if (timeline) {
      timelineRef.current = timeline;
    }
  }, []);

  // Calculate position relative to timeline content area
  const playheadLeft = beatToPixels(currentTime) + HEADER_OFFSET;
  const displayLeft = isDragging ? beatToPixels(dragBeat) + HEADER_OFFSET : playheadLeft;

  // Convert mouse X to beats within timeline
  const getBeatFromMouse = useCallback((clientX: number): number => {
    const timeline = timelineRef.current;
    if (!timeline) return 0;

    const rect = timeline.getBoundingClientRect();
    // Calculate X relative to timeline, accounting for scroll
    const relativeX = clientX - rect.left + timeline.scrollLeft;
    // Subtract header offset to get position in the track content area
    const contentX = relativeX - HEADER_OFFSET;
    // Convert pixels to beats
    return Math.max(0, pixelsToBeat(contentX));
  }, [pixelsToBeat]);

  // Start dragging
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Get timeline reference if not already set
    if (!timelineRef.current) {
      const el = (e.currentTarget as HTMLElement).closest('[data-timeline-playhead-container]') as HTMLDivElement;
      if (el) timelineRef.current = el;
    }
    
    const beat = getBeatFromMouse(e.clientX);
    setIsDragging(true);
    setDragBeat(beat);
  }, [getBeatFromMouse]);

  // Handle global mouse move/up while dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const beat = getBeatFromMouse(e.clientX);
      setDragBeat(beat);
    };

    const handleMouseUp = (e: MouseEvent) => {
      const beat = getBeatFromMouse(e.clientX);
      setIsDragging(false);
      seek(beat);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp, { once: true });

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, [isDragging, getBeatFromMouse, seek]);

  return (
    <div
      className="absolute top-0 bottom-0 z-50 select-none"
      style={{ left: displayLeft }}
    >
      {/* Draggable playhead line with extended hit area */}
      <div
        className="absolute top-0 bottom-0 cursor-ew-resize group"
        onMouseDown={handleMouseDown}
        style={{ left: -8, width: 16 }} // Extended hit area (8px on each side)
      >
        {/* Visible playhead line */}
        <div 
          className={`absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-red-500 transition-transform ${
            isDragging ? "scale-x-150" : ""
          }`} 
        />
      </div>
      
      {/* Playhead triangle */}
      <div 
        className={`absolute -top-0 -left-1.5 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-red-500 cursor-ew-resize transition-transform ${
          isDragging ? "scale-125" : ""
        }`}
        onMouseDown={handleMouseDown}
      />
      
      {/* Time indicator */}
      <div 
        className={`absolute -top-6 -left-6 bg-red-500 text-white text-xs font-mono px-1.5 py-0.5 rounded cursor-ew-resize whitespace-nowrap transition-transform ${
          isDragging ? "scale-110 bg-red-600" : ""
        }`}
        onMouseDown={handleMouseDown}
      >
        {(isDragging ? dragBeat : currentTime).toFixed(2)}
      </div>

      {/* Visual feedback during drag - full height overlay */}
      {isDragging && (
        <div 
          className="fixed top-0 bottom-0 w-0.5 bg-red-500/30 pointer-events-none"
          style={{ left: displayLeft }}
        />
      )}
    </div>
  );
}
