import { useEffect } from "react";
import { DndContext, DragEndEvent, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { Sidebar } from "./sidebar/Sidebar";
import { Transport } from "./transport/Transport";
import { ToolBar } from "./transport/ToolBar";
import { Timeline } from "./timeline/Timeline";
import { PianoRoll } from "./piano-roll/PianoRoll";
import { ChannelRack } from "./channel-rack/ChannelRack";
import { useStudioStore } from "./store/useStudioStore";
import { ResizablePanel } from "./components/ResizablePanel";
import { useStudioHotkeys } from "./hooks/useStudioHotkeys";
import { audioScheduler } from "./engine/audioScheduler";
import { debugAudioSystem, createTestBufferForClip } from "./utils/audioDebug";
import { midiPlayer } from "./engine/midiPlayer";
import { FL_COLORS, FL_GRADIENTS, FL_SHADOWS, FL_SPACING, FL_BORDER_RADIUS } from "./styles/flStudioColors";
import { Mixer } from "./mixer/Mixer";
import { Browser } from "./browser/Browser";
import { MenuBar } from "./menu/MenuBar";
/**
 * FL STUDIO 21 LAYOUT
 * 
 * Exact FL Studio layout structure:
 * 1. Menu Bar (top) - File, Edit, View, etc.
 * 2. Browser Panel (left) - Samples, presets, patterns
 * 3. Channel Rack (left-center) - Step sequencer
 * 4. Playlist/Timeline (center) - Main workspace
 * 5. Piano Roll (modal) - MIDI editor
 * 6. Mixer (bottom) - Audio mixing
 * 7. Transport Controls (top-left) - Play/Stop/BPM
 */

export function StudioLayout() {
  const addClip = useStudioStore((state) => state.addClip);
  const tracks = useStudioStore((state) => state.tracks);
  const browserWidth = useStudioStore((state) => state.ui.browserWidth || 240);
  const setBrowserWidth = useStudioStore((state) => state.setBrowserWidth);
  const channelRackWidth = useStudioStore((state) => state.ui.channelRackWidth || 320);
  const setChannelRackWidth = useStudioStore((state) => state.setChannelRackWidth);
  const mixerHeight = useStudioStore((state) => state.ui.mixerHeight || 200);
  const setMixerHeight = useStudioStore((state) => state.setMixerHeight);
  const isMixerVisible = useStudioStore((state) => state.ui.isMixerVisible);
  const toggleMixer = useStudioStore((state) => state.toggleMixer);
  
  // Enable FL Studio hotkeys
  useStudioHotkeys();

  // Audio scheduler integration
  const playback = useStudioStore((s) => s.playback);
  
  useEffect(() => {
    if (playback.isPlaying) {
      audioScheduler.start();
      midiPlayer.start();
    } else {
      audioScheduler.stop();
      midiPlayer.stop();
    }
  }, [playback.isPlaying]);

  // Debug audio system on mount
  useEffect(() => {
    // Make debug functions available globally
    if (typeof window !== 'undefined') {
      (window as any).debugAudio = debugAudioSystem;
      (window as any).createTestAudio = createTestBufferForClip;
      
      console.log('🔧 Audio debug functions available:');
      console.log('   - debugAudio() - Check audio system status');
      console.log('   - createTestAudio(clipId) - Create test buffer for clip');
    }
    
    // Debug current state
    setTimeout(() => {
      debugAudioSystem();
    }, 1000);
  }, []);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!active || !over) return;

    // Handle sidebar items being dropped on timeline
    if (active.id.toString().startsWith("sidebar-") && over.id === "timeline") {
      const data = active.data.current;
      if (!data) return;

      // Find the track at the drop position (default to first track)
      const targetTrack = tracks[0];
      if (!targetTrack) return;

      let duration = 4; // Default duration
      
      // For real audio samples, try to get actual duration
      if (data.type === "sample" && data.name.includes("@")) {
        // Map sample IDs to their file paths
        const sampleFiles: Record<string, string> = {
          "choise-hat": "/src/pages/sounds/CHOISE Hat @babyxprod.wav",
          "make-it-bleed-hat": "/src/pages/sounds/MAKE IT BLEED Op Hat #1 @babyxprod.wav",
          "masked-up-clap": "/src/pages/sounds/MASKED UP Clap @bangtozzy.wav",
          "you-ready-kick": "/src/pages/sounds/YOU READY？Kick @bangtozzy.wav",
        };
        
        const sampleId = active.id.toString().replace("sidebar-", "");
        const filePath = sampleFiles[sampleId];
        
        if (filePath) {
          try {
            // Try to load audio to get duration
            const response = await fetch(filePath);
            const arrayBuffer = await response.arrayBuffer();
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            duration = audioBuffer.duration; // Use actual audio duration
          } catch (error) {
            console.warn("Could not load audio duration, using default:", error);
            duration = 2; // Fallback for real samples
          }
        }
      }

      // Create a new clip with proper duration
      addClip({
        trackId: targetTrack.id,
        start: 0,
        duration: Math.max(0.5, duration), // Minimum 0.5 seconds
        type: data.type === "instrument" ? "midi" : "audio",
        name: data.name,
        color: data.color,
      });
    }

    // Handle pattern drag-and-drop from Channel Rack to Timeline
    if (active.id.toString().startsWith("pattern-") && over.id === "timeline") {
      const pattern = active.data.current?.pattern;
      if (!pattern) return;

      // Find appropriate track for pattern
      const targetTrack = tracks[0]; // Could be enhanced to choose track based on pattern type
      if (!targetTrack) return;

      // Create a new clip from pattern
      addClip({
        trackId: targetTrack.id,
        start: 0,
        duration: pattern.stepCount / 4, // Convert steps to beats (16 steps = 1 bar = 4 beats)
        type: "audio",
        name: pattern.name,
        color: "#f0b90b", // Pattern clip color
        patternId: pattern.id,
      });
    }
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-screen w-full overflow-hidden" style={{ backgroundColor: FL_COLORS.MAIN_BG }}>
        {/* 
          FL STUDIO LAYER 1: MENU BAR (Top)
          - File, Edit, View, Options, Help
          - FL Studio style menu
        */}
        <div className="flex-shrink-0" style={{ backgroundColor: FL_COLORS.PANEL_BG, borderBottom: `1px solid ${FL_COLORS.BORDER_DARK}` }}>
          <MenuBar />
        </div>

        {/* 
          FL STUDIO LAYER 2: MAIN WORKSPACE
          - Browser (left)
          - Channel Rack (left-center)
          - Playlist/Timeline (center)
        */}
        <div className="flex flex-1 overflow-hidden">
          {/* Browser Panel - FL Style */}
          <ResizablePanel
            width={browserWidth}
            minWidth={200}
            maxWidth={400}
            onResize={setBrowserWidth}
            resizeDirection="horizontal"
            className="flex-shrink-0 border-r"
            style={{ 
              borderColor: FL_COLORS.BORDER_DARK,
              backgroundColor: FL_COLORS.BROWSER_BG,
              boxShadow: FL_SHADOWS.PANEL
            }}
          >
            <Browser />
          </ResizablePanel>

          {/* Channel Rack - FL Style */}
          <ResizablePanel
            width={channelRackWidth}
            minWidth={280}
            maxWidth={400}
            onResize={setChannelRackWidth}
            resizeDirection="horizontal"
            className="flex-shrink-0 border-r"
            style={{ 
              borderColor: FL_COLORS.BORDER_DARK,
              backgroundColor: FL_COLORS.CHANNEL_BG,
              boxShadow: FL_SHADOWS.PANEL
            }}
          >
            <ChannelRack />
          </ResizablePanel>

          {/* Main Playlist/Timeline - Primary workspace */}
          <div className="flex-1 flex flex-col overflow-hidden relative" style={{ backgroundColor: FL_COLORS.PLAYLIST_BG }}>
            {/* Transport Controls - FL Style (top-left of timeline) */}
            <div className="absolute top-4 left-4 z-10" style={{ boxShadow: FL_SHADOWS.PANEL }}>
              <Transport />
            </div>
            
            {/* Timeline - FL Style */}
            <div className="flex-1 relative">
              <Timeline />
            </div>
          </div>
        </div>

        {/* 
          FL STUDIO LAYER 3: MIXER (Bottom)
          - Collapsible mixer panel
          - Channel strips
        */}
        {isMixerVisible && (
          <ResizablePanel
            width={800}
            height={mixerHeight}
            minHeight={120}
            maxHeight={400}
            onResize={(w, h) => h && setMixerHeight(h)}
            resizeDirection="vertical"
            className="border-t"
            style={{ 
              borderColor: FL_COLORS.BORDER_DARK,
              backgroundColor: FL_COLORS.MIXER_BG,
              boxShadow: FL_SHADOWS.PANEL
            }}
          >
            <Mixer />
          </ResizablePanel>
        )}

        {/* 
          FL STUDIO LAYER 4: MODAL OVERLAYS
          - Piano Roll (when editing)
        */}
        <PianoRoll />
      </div>
    </DndContext>
  );
}
