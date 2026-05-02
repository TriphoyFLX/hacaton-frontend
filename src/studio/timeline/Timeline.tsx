import { useState, useCallback, useRef, useEffect } from "react";
import { DndContext, DragEndEvent, DragOverlay, useDroppable } from "@dnd-kit/core";
import { useStudioStore } from "../store/useStudioStore";
import { useTransport } from "../engine/useTransport";
import { useGrid } from "./useGrid";
import { TrackLane } from "./TrackLane";
import { ClipBlock } from "./ClipBlock";
import { Ruler } from "./Ruler";
import { Playhead } from "./Playhead";
import { LoopRegion } from "./LoopRegion";
import type { Clip } from "../models";
import { handleAudioFileDrop, filterAudioFiles } from "../utils/timelineUtils";
import { TimelineDropZone } from "../components/TimelineDropZone";

function TimelineDroppable({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { setNodeRef } = useDroppable({
    id: "timeline",
  });

  return (
    <div ref={setNodeRef} className={className}>
      {children}
    </div>
  );
}

export function Timeline() {
  const tracks = useStudioStore((state) => state.tracks);
  const clips = useStudioStore((state) => state.clips);
  const moveClip = useStudioStore((state) => state.moveClip);
  const resizeClip = useStudioStore((state) => state.resizeClip);
  const selectClip = useStudioStore((state) => state.selectClip);
  const setZoom = useStudioStore((state) => state.setZoom);
  const zoom = useStudioStore((state) => state.ui.zoom);
  const { config, snapToGrid, pixelsToBeat, getTrackAtY } = useGrid();
  const { seek } = useTransport();
  const [activeDrag, setActiveDrag] = useState<Clip | null>(null);
  const [selectedClips, setSelectedClips] = useState<string[]>([]);
  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false);
  const [marqueeStart, setMarqueeStart] = useState({ x: 0, y: 0 });
  const [marqueeEnd, setMarqueeEnd] = useState({ x: 0, y: 0 });
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [isDropZoneActive, setIsDropZoneActive] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Native drag-and-drop handlers for audio files
  useEffect(() => {
    const container = timelineRef.current;
    if (!container) return;

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDropZoneActive(true);
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDropZoneActive(false);
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDropZoneActive(false);
      
      const files = e.dataTransfer?.files;
      if (!files?.length) return;

      // Filter only audio files
      const audioFiles = filterAudioFiles(files);
      if (!audioFiles.length) return;

      console.log(`🎵 Dropped ${audioFiles.length} audio file(s) on timeline`);

      // Process each audio file
      for (const file of audioFiles) {
        await handleAudioFileDrop(file, e.clientX, e.clientY, container, config.pixelsPerBeat);
      }
    };

    container.addEventListener('dragover', handleDragOver);
    container.addEventListener('dragleave', handleDragLeave);
    container.addEventListener('drop', handleDrop);

    return () => {
      container.removeEventListener('dragover', handleDragOver);
      container.removeEventListener('dragleave', handleDragLeave);
      container.removeEventListener('drop', handleDrop);
    };
  }, [config.pixelsPerBeat]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, delta, over } = event;
      setActiveDrag(null);

      if (!active || !over) return;

      const clipId = active.id as string;
      const clip = clips.find((c) => c.id === clipId);
      if (!clip) return;

      // Calculate new position
      const deltaX = delta.x;
      const deltaY = delta.y;

      const newStartPixels = clip.start * config.pixelsPerBeat + deltaX;
      const newStart = snapToGrid(pixelsToBeat(newStartPixels));

      // Find new track from Y position
      let newTrackId: string | undefined;
      if (timelineRef.current) {
        const rect = timelineRef.current.getBoundingClientRect();
        const mouseEvent = event.activatorEvent as MouseEvent;
        const clientY = mouseEvent.clientY + deltaY;
        const relativeY = clientY - rect.top;
        newTrackId = getTrackAtY(relativeY, 40); // header offset
      }

      moveClip(clipId, Math.max(0, newStart), newTrackId);
    },
    [clips, config.pixelsPerBeat, snapToGrid, pixelsToBeat, getTrackAtY, moveClip]
  );

  // Handle mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.25 : 0.25;
      setZoom(Math.max(0.25, Math.min(4, zoom + delta)));
    }
  }, [zoom, setZoom]);

  // Track keyboard modifiers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Marquee selection handlers
  const handleMarqueeStart = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0 || e.target !== e.currentTarget) return;
    
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    setIsMarqueeSelecting(true);
    setMarqueeStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setMarqueeEnd({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    
    if (!isShiftPressed) {
      setSelectedClips([]);
    }
  }, [isShiftPressed]);

  const handleMarqueeMove = useCallback((e: React.MouseEvent) => {
    if (!isMarqueeSelecting) return;
    
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    setMarqueeEnd({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, [isMarqueeSelecting]);

  const handleMarqueeEnd = useCallback(() => {
    if (!isMarqueeSelecting) return;
    
    setIsMarqueeSelecting(false);
    
    // Check which clips are in selection
    const selectedIds: string[] = [];
    clips.forEach(clip => {
      const clipX = clip.start * config.pixelsPerBeat;
      const clipY = getTrackYPosition(clip.trackId);
      const clipWidth = clip.duration * config.pixelsPerBeat;
      const clipHeight = config.trackHeight;
      
      const marqueeLeft = Math.min(marqueeStart.x, marqueeEnd.x);
      const marqueeRight = Math.max(marqueeStart.x, marqueeEnd.x);
      const marqueeTop = Math.min(marqueeStart.y, marqueeEnd.y);
      const marqueeBottom = Math.max(marqueeStart.y, marqueeEnd.y);
      
      if (
        clipX < marqueeRight &&
        clipX + clipWidth > marqueeLeft &&
        clipY < marqueeBottom &&
        clipY + clipHeight > marqueeTop
      ) {
        selectedIds.push(clip.id);
      }
    });
    
    setSelectedClips(prev => {
      const newSelection = isShiftPressed ? [...prev, ...selectedIds] : selectedIds;
      return [...new Set(newSelection)]; // Remove duplicates
    });
  }, [isMarqueeSelecting, marqueeStart, marqueeEnd, clips, config, isShiftPressed]);

  const getTrackYPosition = useCallback((trackId: string): number => {
    const index = tracks.findIndex(t => t.id === trackId);
    return config.headerHeight + index * config.trackHeight;
  }, [tracks, config]);

  const handleTimelineClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target !== e.currentTarget && !(e.target as HTMLElement).dataset.seek) return;

      if (timelineRef.current) {
        const rect = timelineRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const beat = pixelsToBeat(x);
        
        // Find which track was clicked
        const trackId = getTrackAtY(y, config.headerHeight);
        
        if (trackId) {
          // Find the clip at this position and select it to sync pattern
          const clipAtPosition = clips.find(clip => {
            const clipX = clip.start * config.pixelsPerBeat;
            const clipWidth = clip.duration * config.pixelsPerBeat;
            const clipY = getTrackYPosition(clip.trackId);
            
            return clip.trackId === trackId && 
                   x >= clipX && x <= clipX + clipWidth &&
                   y >= clipY && y <= clipY + config.trackHeight;
          });
          
          if (clipAtPosition) {
            selectClip(clipAtPosition.id);
          }
        }
        
        seek(Math.max(0, beat));
      }
    },
    [pixelsToBeat, seek, clips, config, getTrackYPosition, selectClip]
  );

  const handleResize = useCallback(
    (clipId: string, newDuration: number) => {
      resizeClip(clipId, snapToGrid(newDuration));
    },
    [snapToGrid, resizeClip]
  );

  return (
    <DndContext onDragEnd={handleDragEnd} onDragStart={(e: any) => setActiveDrag(e.active.data.current?.clip)}>
      <div className="flex flex-col h-full bg-gray-950 overflow-hidden">
        {/* Timeline Ruler */}
        <div className="flex border-b border-gray-800">
          <div className="w-48 bg-gray-900 border-r border-gray-800 flex items-center justify-center">
            <span className="text-xs text-gray-500 font-medium">TRACKS</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <Ruler />
          </div>
        </div>

        {/* Timeline Content */}
        <div
          ref={timelineRef}
          data-timeline-playhead-container
          className="flex-1 overflow-auto relative"
          onClick={handleTimelineClick}
          onMouseDown={handleMarqueeStart}
          onMouseMove={handleMarqueeMove}
          onMouseUp={handleMarqueeEnd}
          onWheel={handleWheel}
        >
          <TimelineDropZone 
            isActive={isDropZoneActive}
            onDrop={(files) => {
              console.log(`🎵 Drop zone received ${files.length} files`);
            }}
          />
          <TimelineDroppable className="min-w-max">
            {/* Track Lanes */}
            {tracks.map((track) => (
              <TrackLane key={track.id} track={track} height={config.trackHeight} />
            ))}

            {/* Clips Overlay */}
            <div
              className="absolute top-0 pointer-events-none"
              style={{
                left: 192, // width of track headers (w-48 = 12rem = 192px)
                right: 0,
                top: 0,
              }}
            >
              {clips.map((clip) => (
                <div key={clip.id} className="pointer-events-auto">
                  <ClipBlock 
                    clip={clip} 
                    onResize={handleResize}
                    isSelected={selectedClips.includes(clip.id)}
                    onSelect={(selected) => {
                      if (selected) {
                        setSelectedClips(prev => isShiftPressed ? [...prev, clip.id] : [clip.id]);
                      } else {
                        setSelectedClips(prev => prev.filter(id => id !== clip.id));
                      }
                    }}
                  />
                </div>
              ))}
              
              {/* Marquee selection overlay */}
              {isMarqueeSelecting && (
                <div
                  className="absolute border-2 border-blue-400 bg-blue-400/20 pointer-events-none"
                  style={{
                    left: Math.min(marqueeStart.x, marqueeEnd.x),
                    top: Math.min(marqueeStart.y, marqueeEnd.y),
                    width: Math.abs(marqueeEnd.x - marqueeStart.x),
                    height: Math.abs(marqueeEnd.y - marqueeStart.y),
                  }}
                />
              )}
            </div>
            
            {/* Playhead */}
            <Playhead />
            
            {/* Loop Region */}
            <LoopRegion />
          </TimelineDroppable>
        </div>
      </div>

      <DragOverlay>
        {activeDrag ? (
          <div
            className="rounded pointer-events-none"
            style={{
              width: activeDrag.duration * config.pixelsPerBeat,
              height: config.trackHeight - 4,
              backgroundColor: activeDrag.color,
              opacity: 0.8,
            }}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
