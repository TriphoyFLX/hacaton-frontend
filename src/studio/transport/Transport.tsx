import { useCallback, useState, useRef, useEffect } from "react";
import { Play, Pause, Square, Repeat, Settings2, Volume2 } from "lucide-react";
import { useTransport } from "../engine/useTransport";
import { useStudioStore } from "../store/useStudioStore";
import { globalScheduler } from "../engine/scheduler";

// Maximum timeline length in beats (8 bars * 4 beats)
const MAX_BEATS = 32;

export function Transport() {
  const { isPlaying, currentTime, bpm, togglePlay, stop, seek } = useTransport();
  const setBpm = useStudioStore((state) => state.setBpm);
  const loopEnabled = useStudioStore((state) => state.ui.loopEnabled);
  const toggleLoop = useStudioStore((state) => state.toggleLoop);
  const masterVolume = useStudioStore((state) => state.playback.masterVolume);
  const setMasterVolume = useStudioStore((state) => state.setMasterVolume);

  // Local state for UI during dragging
  const [seekValue, setSeekValue] = useState(currentTime);
  const [isDraggingSeek, setIsDraggingSeek] = useState(false);
  const seekBarRef = useRef<HTMLDivElement>(null);

  // Sync seekValue with currentTime when not dragging
  useEffect(() => {
    if (!isDraggingSeek) {
      setSeekValue(currentTime);
    }
  }, [currentTime, isDraggingSeek]);

  // Format time as bars:beats (assuming 4/4 time)
  const bars = Math.floor(currentTime / 4) + 1;
  const beats = Math.floor(currentTime % 4) + 1;
  const ticks = Math.floor((currentTime % 1) * 100);

  // Calculate seek position from mouse event
  const getSeekFromMouse = useCallback((clientX: number) => {
    if (!seekBarRef.current) return 0;
    const rect = seekBarRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = x / rect.width;
    return percentage * MAX_BEATS;
  }, []);

  // Handle mouse down on seek bar
  const handleSeekMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSeek(true);
    const newTime = getSeekFromMouse(e.clientX);
    setSeekValue(newTime);
  }, [getSeekFromMouse]);

  // Handle mouse move (with global listener)
  useEffect(() => {
    if (!isDraggingSeek) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newTime = getSeekFromMouse(e.clientX);
      setSeekValue(newTime);
    };

    const handleMouseUp = (e: MouseEvent) => {
      const finalTime = getSeekFromMouse(e.clientX);
      setIsDraggingSeek(false);
      seek(finalTime);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp, { once: true });

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, [isDraggingSeek, getSeekFromMouse, seek]);

  // Handle volume change - update both store and scheduler
  const handleVolumeChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value) / 100;
    setMasterVolume(newVolume);
    await globalScheduler.setMasterVolume(newVolume);
  }, [setMasterVolume]);

  // Seek bar progress percentage
  const seekProgress = Math.min((seekValue / MAX_BEATS) * 100, 100);

  return (
    <div className="flex flex-col bg-gray-900 border-b border-gray-800">
      {/* Main Controls Row */}
      <div className="flex items-center gap-6 px-6 py-3">
        {/* Transport Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={togglePlay}
            className={`p-2.5 rounded-lg transition-colors ${
              isPlaying
                ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
            }`}
            title={isPlaying ? "Pause (Space)" : "Play (Space)"}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>

          <button
            onClick={stop}
            className="p-2.5 bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            title="Stop (Esc)"
          >
            <Square className="w-5 h-5" />
          </button>

          <button
            onClick={toggleLoop}
            className={`p-2.5 rounded-lg transition-colors ${
              loopEnabled
                ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
            }`}
            title="Toggle Loop"
          >
            <Repeat className="w-5 h-5" />
          </button>
        </div>

        {/* Time Display */}
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-gray-950 px-4 py-2 rounded-lg border border-gray-800">
            <span className="text-2xl font-mono font-bold text-white tabular-nums">
              {bars.toString().padStart(2, "0")}
            </span>
            <span className="text-xl text-gray-500 mx-1">:</span>
            <span className="text-2xl font-mono font-bold text-white tabular-nums">
              {beats.toString().padStart(2, "0")}
            </span>
            <span className="text-xl text-gray-500 mx-1">:</span>
            <span className="text-2xl font-mono font-bold text-amber-400 tabular-nums">
              {ticks.toString().padStart(2, "0")}
            </span>
          </div>

          {/* Beat counter */}
          <div className="text-sm text-gray-500 font-mono">
            {currentTime.toFixed(2)} beats
          </div>
        </div>

        {/* BPM Control */}
        <div className="flex items-center gap-3 ml-auto">
          <Settings2 className="w-4 h-4 text-gray-500" />
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">BPM</span>
            <input
              type="number"
              value={bpm}
              onChange={(e) => setBpm(parseInt(e.target.value) || 120)}
              min={20}
              max={300}
              className="w-16 px-2 py-1 bg-gray-950 border border-gray-800 rounded text-white font-mono text-center focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Snap strength */}
          <div className="flex items-center gap-2 border-l border-gray-700 pl-3">
            <span className="text-sm text-gray-400">Snap</span>
            <select
              value={useStudioStore((state) => state.ui.snapStrength)}
              onChange={(e) => useStudioStore.getState().setSnapStrength(parseFloat(e.target.value))}
              className="px-2 py-1 bg-gray-950 border border-gray-800 rounded text-white text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value={1}>Bar</option>
              <option value={0.5}>1/2</option>
              <option value={0.25}>1/4</option>
              <option value={0.125}>1/8</option>
              <option value={0.0625}>1/16</option>
            </select>
          </div>
        </div>
      </div>

      {/* Seek Bar Row - RED with custom drag handling */}
      <div className="flex items-center gap-4 px-6 py-2 bg-gray-950 border-t border-gray-800 select-none">
        <span className="text-xs text-gray-500 font-mono">0</span>
        <div
          ref={seekBarRef}
          className={`flex-1 h-3 bg-gray-800 rounded-full cursor-pointer relative overflow-hidden ${
            isDraggingSeek ? "ring-2 ring-red-500/50" : ""
          }`}
          onMouseDown={handleSeekMouseDown}
        >
          {/* Progress fill - RED */}
          <div
            className="absolute top-0 left-0 h-full bg-red-500 rounded-full transition-all duration-75"
            style={{ width: `${seekProgress}%` }}
          />
          {/* Drag handle */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg border-2 border-red-500 transition-transform ${
              isDraggingSeek ? "scale-125" : "scale-100 hover:scale-110"
            }`}
            style={{ left: `calc(${seekProgress}% - 8px)` }}
          />
        </div>
        <span className="text-xs text-gray-500 font-mono">{MAX_BEATS}</span>
      </div>

      {/* Volume Control Row */}
      <div className="flex items-center gap-4 px-6 py-2 bg-gray-900 border-t border-gray-800">
        <Volume2 className="w-4 h-4 text-gray-500" />
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(masterVolume * 100)}
          onChange={handleVolumeChange}
          className="w-32 h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-green-500 hover:accent-green-400"
        />
        <span className="text-sm text-gray-400 font-mono w-12">
          {Math.round(masterVolume * 100)}%
        </span>
      </div>
    </div>
  );
}
