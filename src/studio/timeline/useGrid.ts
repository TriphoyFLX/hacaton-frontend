import { useMemo, useCallback } from "react";
import { useStudioStore } from "../store/useStudioStore";

interface GridConfig {
  pixelsPerBeat: number;
  trackHeight: number;
  headerHeight: number;
  snapGrid: number;
  totalWidth: number;
  totalHeight: number;
  visibleBeats: number;
}

export function useGrid(totalBeats = 32) {
  const zoom = useStudioStore((state) => state.ui.zoom);
  const snapStrength = useStudioStore((state) => state.ui.snapStrength);
  const tracks = useStudioStore((state) => state.tracks);

  const config: GridConfig = useMemo(() => {
    const basePixelsPerBeat = 40;
    const pixelsPerBeat = basePixelsPerBeat * zoom;
    const trackHeight = 80;
    const headerHeight = 40;

    return {
      pixelsPerBeat,
      trackHeight,
      headerHeight,
      snapGrid: snapStrength,
      totalWidth: pixelsPerBeat * totalBeats,
      totalHeight: headerHeight + tracks.length * trackHeight,
      visibleBeats: totalBeats,
    };
  }, [zoom, snapStrength, totalBeats, tracks.length]);

  const snapToGrid = useCallback(
    (value: number): number => {
      const gridSize = config.snapGrid;
      return Math.round(value / gridSize) * gridSize;
    },
    [config.snapGrid]
  );

  const beatToPixels = useCallback(
    (beat: number): number => beat * config.pixelsPerBeat,
    [config.pixelsPerBeat]
  );

  const pixelsToBeat = useCallback(
    (pixels: number): number => pixels / config.pixelsPerBeat,
    [config.pixelsPerBeat]
  );

  const getTrackAtY = useCallback(
    (y: number, headerOffset = 0): string | undefined => {
      const adjustedY = y - headerOffset - config.headerHeight;
      if (adjustedY < 0) return undefined;
      
      const trackIndex = Math.floor(adjustedY / config.trackHeight);
      if (trackIndex >= 0 && trackIndex < tracks.length) {
        return tracks[trackIndex].id;
      }
      return undefined;
    },
    [config.trackHeight, config.headerHeight, tracks]
  );

  const getTrackYPosition = useCallback(
    (trackId: string): number => {
      const index = tracks.findIndex((t) => t.id === trackId);
      if (index === -1) return 0;
      return config.headerHeight + index * config.trackHeight;
    },
    [config.headerHeight, config.trackHeight, tracks]
  );

  return {
    config,
    snapToGrid,
    beatToPixels,
    pixelsToBeat,
    getTrackAtY,
    getTrackYPosition,
  };
}
