import { Volume2, VolumeX, Trash2 } from "lucide-react";
import { useStudioStore } from "../store/useStudioStore";
import { globalScheduler } from "../engine/scheduler";
import type { Track } from "../models";

interface TrackLaneProps {
  track: Track;
  height: number;
}

export function TrackLane({ track, height }: TrackLaneProps) {
  const updateTrack = useStudioStore((state) => state.updateTrack);
  const removeTrack = useStudioStore((state) => state.removeTrack);

  return (
    <div
      className="flex border-b border-gray-800"
      style={{ height }}
    >
      {/* Track Header */}
      <div
        className="flex-shrink-0 w-48 bg-gray-900 border-r border-gray-800 flex flex-col p-2"
        style={{ height }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-200 truncate">{track.name}</span>
          <button
            onClick={() => removeTrack(track.id)}
            className="p-1 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300"
            title="Delete track"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => updateTrack(track.id, { muted: !track.muted })}
            className={`p-1 rounded text-xs font-bold transition-colors ${
              track.muted
                ? "bg-red-500 text-white"
                : "bg-gray-700 text-gray-400 hover:bg-gray-600"
            }`}
            title="Mute"
          >
            M
          </button>
          <button
            onClick={() => updateTrack(track.id, { solo: !track.solo })}
            className={`p-1 rounded text-xs font-bold transition-colors ${
              track.solo
                ? "bg-yellow-500 text-black"
                : "bg-gray-700 text-gray-400 hover:bg-gray-600"
            }`}
            title="Solo"
          >
            S
          </button>
        </div>

        <div className="flex items-center gap-2">
          {track.muted ? (
            <VolumeX className="w-4 h-4 text-gray-500" />
          ) : (
            <Volume2 className="w-4 h-4 text-gray-400" />
          )}
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={track.volume}
            onChange={(e) => {
              const newVolume = parseFloat(e.target.value);
              updateTrack(track.id, { volume: newVolume });
              globalScheduler.setTrackVolume(track.id, newVolume);
            }}
            className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>

      {/* Track Content Area */}
      <div
        className="flex-1 relative bg-gray-950"
        style={{ height }}
        data-track-id={track.id}
      >
        {/* Grid lines */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 33 }).map((_, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 border-l border-gray-800/50"
              style={{ left: i * 40 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
