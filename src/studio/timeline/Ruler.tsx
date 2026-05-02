import { useStudioStore } from "../store/useStudioStore";
import { useGrid } from "./useGrid";

export function Ruler() {
  const zoom = useStudioStore((state) => state.ui.zoom);
  const { config, beatToPixels } = useGrid(32);

  const beats = Array.from({ length: config.visibleBeats + 1 }, (_, i) => i);
  
  // Calculate which beats to show labels for based on zoom
  const labelInterval = zoom < 0.5 ? 4 : zoom < 1 ? 2 : 1;

  return (
    <div
      className="h-10 bg-gray-800 border-b border-gray-700 relative"
      style={{ width: config.totalWidth }}
    >
      {beats.map((beat) => (
        <div
          key={beat}
          className="absolute top-0 bottom-0 border-l border-gray-600"
          style={{ left: beatToPixels(beat) }}
        >
          {beat % labelInterval === 0 && (
            <span className="absolute top-1 left-1 text-xs text-gray-400 font-mono">
              {beat}
            </span>
          )}
          {/* Bar markers */}
          {beat % 4 === 0 && (
            <div className="absolute top-0 left-0 w-0.5 h-full bg-gray-500" />
          )}
        </div>
      ))}
      
      {/* Measure labels */}
      {Array.from({ length: Math.ceil(config.visibleBeats / 4) }, (_, i) => i).map((bar) => (
        <div
          key={`bar-${bar}`}
          className="absolute top-5 left-0 px-1 text-xs text-gray-500 font-bold"
          style={{ left: beatToPixels(bar * 4) }}
        >
          {bar + 1}
        </div>
      ))}
    </div>
  );
}
