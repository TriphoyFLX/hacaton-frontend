import { useCallback, useState, useRef, useEffect } from "react";
import { Play, Pause, Square, Repeat, Settings2, Volume2 } from "lucide-react";
import { useTransport } from "../engine/useTransport";
import { useStudioStore } from "../store/useStudioStore";
import { globalScheduler } from "../engine/scheduler";
import { FL_COLORS, FL_GRADIENTS, FL_SHADOWS, FL_BORDER_RADIUS } from "../styles/flStudioColors";

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
    <div className="flex flex-col rounded-lg" style={{ backgroundColor: FL_COLORS.TRANSPORT_BG, boxShadow: FL_SHADOWS.PANEL, border: `1px solid ${FL_COLORS.BORDER_DARK}` }}>
      {/* Main Controls Row */}
      <div className="flex items-center gap-4 px-4 py-3">
        {/* Transport Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={togglePlay}
            className={`p-3 rounded-lg transition-all duration-150 ${
              isPlaying
                ? ""
                : ""
            }`}
            style={{
              backgroundColor: isPlaying ? FL_COLORS.PLAY_BUTTON : FL_COLORS.BUTTON_BG,
              color: FL_COLORS.TEXT_PRIMARY,
              border: `1px solid ${isPlaying ? FL_COLORS.PLAY_BUTTON : FL_COLORS.BORDER_DARK}`,
              boxShadow: isPlaying ? FL_SHADOWS.GLOW : 'none'
            }}
            onMouseEnter={(e) => {
              if (!isPlaying) {
                e.currentTarget.style.backgroundColor = FL_COLORS.BUTTON_HOVER;
                e.currentTarget.style.borderColor = FL_COLORS.ACCENT_BLUE;
              }
            }}
            onMouseLeave={(e) => {
              if (!isPlaying) {
                e.currentTarget.style.backgroundColor = FL_COLORS.BUTTON_BG;
                e.currentTarget.style.borderColor = FL_COLORS.BORDER_DARK;
              }
            }}
            title={isPlaying ? "Pause (Space)" : "Play (Space)"}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>

          <button
            onClick={stop}
            className="p-3 rounded-lg transition-all duration-150"
            style={{
              backgroundColor: FL_COLORS.STOP_BUTTON,
              color: FL_COLORS.TEXT_PRIMARY,
              border: `1px solid ${FL_COLORS.STOP_BUTTON}`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = FL_COLORS.STOP_BUTTON + 'DD';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = FL_COLORS.STOP_BUTTON;
            }}
            title="Stop (Esc)"
          >
            <Square className="w-5 h-5" />
          </button>

          <button
            onClick={toggleLoop}
            className={`p-3 rounded-lg transition-all duration-150 ${
              loopEnabled
                ? ""
                : ""
            }`}
            style={{
              backgroundColor: loopEnabled ? FL_COLORS.ACCENT_BLUE : FL_COLORS.BUTTON_BG,
              color: FL_COLORS.TEXT_PRIMARY,
              border: `1px solid ${loopEnabled ? FL_COLORS.ACCENT_BLUE : FL_COLORS.BORDER_DARK}`,
            }}
            onMouseEnter={(e) => {
              if (!loopEnabled) {
                e.currentTarget.style.backgroundColor = FL_COLORS.BUTTON_HOVER;
                e.currentTarget.style.borderColor = FL_COLORS.ACCENT_BLUE;
              }
            }}
            onMouseLeave={(e) => {
              if (!loopEnabled) {
                e.currentTarget.style.backgroundColor = FL_COLORS.BUTTON_BG;
                e.currentTarget.style.borderColor = FL_COLORS.BORDER_DARK;
              }
            }}
            title="Toggle Loop"
          >
            <Repeat className="w-5 h-5" />
          </button>
        </div>

        {/* Time Display */}
        <div className="flex items-center gap-3">
          <div 
            className="flex items-center px-4 py-2 rounded-lg font-mono" 
            style={{ 
              backgroundColor: FL_COLORS.DARK_BG,
              border: `1px solid ${FL_COLORS.BORDER_DARK}`,
              color: FL_COLORS.TEXT_PRIMARY
            }}
          >
            <span className="text-xl font-bold tabular-nums">
              {bars.toString().padStart(2, "0")}
            </span>
            <span className="text-lg mx-1" style={{ color: FL_COLORS.TEXT_MUTED }}>:</span>
            <span className="text-xl font-bold tabular-nums">
              {beats.toString().padStart(2, "0")}
            </span>
            <span className="text-lg mx-1" style={{ color: FL_COLORS.TEXT_MUTED }}>:</span>
            <span className="text-xl font-bold tabular-nums" style={{ color: FL_COLORS.TEXT_HIGHLIGHT }}>
              {ticks.toString().padStart(2, "0")}
            </span>
          </div>

          {/* Beat counter */}
          <div className="text-sm font-mono" style={{ color: FL_COLORS.TEXT_MUTED }}>
            {currentTime.toFixed(2)} beats
          </div>
        </div>

        {/* BPM Control */}
        <div className="flex items-center gap-3 ml-auto">
          <Settings2 className="w-4 h-4" style={{ color: FL_COLORS.TEXT_MUTED }} />
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium" style={{ color: FL_COLORS.TEXT_SECONDARY }}>BPM</span>
            <input
              type="number"
              value={bpm}
              onChange={(e) => setBpm(parseInt(e.target.value) || 120)}
              min={20}
              max={300}
              className="w-16 px-2 py-1 font-mono text-center rounded outline-none transition-colors"
              style={{
                backgroundColor: FL_COLORS.DARK_BG,
                border: `1px solid ${FL_COLORS.BORDER_DARK}`,
                color: FL_COLORS.TEXT_PRIMARY,
              }}
              onFocus={(e) => {
                e.target.style.borderColor = FL_COLORS.ACCENT_BLUE;
                e.target.style.boxShadow = FL_SHADOWS.FOCUS;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = FL_COLORS.BORDER_DARK;
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Snap strength */}
          <div className="flex items-center gap-2" style={{ borderLeft: `1px solid ${FL_COLORS.BORDER_DARK}`, paddingLeft: '12px' }}>
            <span className="text-sm font-medium" style={{ color: FL_COLORS.TEXT_SECONDARY }}>Snap</span>
            <select
              value={useStudioStore((state) => state.ui.snapStrength)}
              onChange={(e) => useStudioStore.getState().setSnapStrength(parseFloat(e.target.value))}
              className="px-2 py-1 rounded outline-none transition-colors"
              style={{
                backgroundColor: FL_COLORS.DARK_BG,
                border: `1px solid ${FL_COLORS.BORDER_DARK}`,
                color: FL_COLORS.TEXT_PRIMARY,
              }}
              onFocus={(e) => {
                e.target.style.borderColor = FL_COLORS.ACCENT_BLUE;
                e.target.style.boxShadow = FL_SHADOWS.FOCUS;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = FL_COLORS.BORDER_DARK;
                e.target.style.boxShadow = 'none';
              }}
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
      <div className="flex items-center gap-3 px-4 py-2 select-none" style={{ backgroundColor: FL_COLORS.DARK_BG, borderTop: `1px solid ${FL_COLORS.BORDER_DARK}` }}>
        <span className="text-xs font-mono" style={{ color: FL_COLORS.TEXT_MUTED }}>0</span>
        <div
          ref={seekBarRef}
          className={`flex-1 h-3 rounded-full cursor-pointer relative overflow-hidden ${
            isDraggingSeek ? "" : ""
          }`}
          style={{
            backgroundColor: FL_COLORS.BUTTON_BG,
            border: `1px solid ${FL_COLORS.BORDER_DARK}`,
          }}
          onMouseDown={handleSeekMouseDown}
        >
          {/* Progress fill - RED */}
          <div
            className="absolute top-0 left-0 h-full rounded-full transition-all duration-75"
            style={{ 
              width: `${seekProgress}%`,
              backgroundColor: FL_COLORS.PLAYHEAD
            }}
          />
          {/* Drag handle */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full shadow-lg border-2 transition-transform ${
              isDraggingSeek ? "scale-125" : "scale-100 hover:scale-110"
            }`}
            style={{ 
              left: `calc(${seekProgress}% - 8px)`,
              backgroundColor: FL_COLORS.TEXT_PRIMARY,
              borderColor: FL_COLORS.PLAYHEAD
            }}
          />
        </div>
        <span className="text-xs font-mono" style={{ color: FL_COLORS.TEXT_MUTED }}>{MAX_BEATS}</span>
      </div>

      {/* Volume Control Row */}
      <div className="flex items-center gap-3 px-4 py-2" style={{ backgroundColor: FL_COLORS.PANEL_BG, borderTop: `1px solid ${FL_COLORS.BORDER_DARK}` }}>
        <Volume2 className="w-4 h-4" style={{ color: FL_COLORS.TEXT_MUTED }} />
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(masterVolume * 100)}
          onChange={handleVolumeChange}
          className="w-32 h-2 rounded-lg appearance-none cursor-pointer transition-colors"
          style={{
            backgroundColor: FL_COLORS.BUTTON_BG,
            accentColor: FL_COLORS.ACCENT_GREEN,
          }}
        />
        <span className="text-sm font-mono" style={{ color: FL_COLORS.TEXT_MUTED, width: '32px' }}>
          {Math.round(masterVolume * 100)}%
        </span>
      </div>
    </div>
  );
}
