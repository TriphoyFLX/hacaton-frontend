import { useState, useCallback, useRef } from "react";
import { DndContext, DragEndEvent, DragOverlay, useDroppable } from "@dnd-kit/core";
import { useStudioStore } from "../store/useStudioStore";
import { useTransport } from "../engine/useTransport";
import { useGrid } from "./useGrid";
import { TrackLane } from "./TrackLane";
import { ClipBlock } from "./ClipBlock";
import { Ruler } from "./Ruler";
import { Playhead } from "./Playhead";
import type { Clip } from "../models";
import type { DragStartEvent } from "@dnd-kit/core";

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
  const { config, snapToGrid, pixelsToBeat, getTrackAtY } = useGrid();
  const { seek } = useTransport();
  const [activeDrag, setActiveDrag] = useState<Clip | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

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

  const handleTimelineClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target !== e.currentTarget && !(e.target as HTMLElement).dataset.seek) return;

      if (timelineRef.current) {
        const rect = timelineRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const beat = pixelsToBeat(x);
        seek(Math.max(0, beat));
      }
    },
    [pixelsToBeat, seek]
  );

  const handleResize = useCallback(
    (clipId: string, newDuration: number) => {
      resizeClip(clipId, snapToGrid(newDuration));
    },
    [snapToGrid, resizeClip]
  );

  return (
    <DndContext onDragEnd={handleDragEnd} onDragStart={(e: DragStartEvent) => setActiveDrag(e.active.data.current?.clip)}>
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
        >
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
                bottom: 0,
              }}
            >
              <div className="relative h-full" style={{ width: config.totalWidth }}>
                {clips.map((clip) => (
                  <div key={clip.id} className="pointer-events-auto">
                    <ClipBlock clip={clip} onResize={handleResize} />
                  </div>
                ))}
              </div>
            </div>

            {/* Playhead */}
            <Playhead />
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
