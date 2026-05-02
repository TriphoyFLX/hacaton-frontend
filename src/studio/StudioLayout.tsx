import { useEffect } from "react";
import { DndContext, DragEndEvent, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { Sidebar } from "./sidebar/Sidebar";
import { Transport } from "./transport/Transport";
import { ToolBar } from "./transport/ToolBar";
import { Timeline } from "./timeline/Timeline";
import { PianoRoll } from "./piano-roll/PianoRoll";
import { ChannelRack } from "./channel-rack/ChannelRack";
import { ProfessionalMixer } from "./mixer/ProfessionalMixer";
import { SampleBrowser } from "./browser/SampleBrowser";
import { useStudioStore } from "./store/useStudioStore";
import { ResizablePanel } from "./components/ResizablePanel";
import { useStudioHotkeys } from "./hooks/useStudioHotkeys";
import { audioScheduler } from "./engine/audioScheduler";
import { debugAudioSystem, createTestBufferForClip } from "./utils/audioDebug";
import { midiPlayer } from "./engine/midiPlayer";

/**
 * PROFESSIONAL DAW LAYOUT
 * 
 * Hierarchy (strict visual weight):
 * 1. Transport Controls (Play/Stop/BPM) - MOST IMPORTANT
 * 2. Timeline/Workspace - MEDIUM
 * 3. Channel Rack - MEDIUM
 * 4. Sidebar - LOW
 * 5. Tools/Settings - MINIMAL
 */

export function StudioLayout() {
  const addClip = useStudioStore((state) => state.addClip);
  const tracks = useStudioStore((state) => state.tracks);
  const sidebarWidth = useStudioStore((state) => state.ui.sidebarWidth);
  const setSidebarWidth = useStudioStore((state) => state.setSidebarWidth);
  
  // Enable FL Studio hotkeys
  useStudioHotkeys();

  // Audio scheduler integration
  const { playback } = useStudioStore();
  
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
      <div className="flex flex-col h-screen w-full bg-gray-950 text-gray-100 overflow-hidden">
        {/* 
          HIERARCHY LAYER 1: TRANSPORT (Most Critical)
          - Play/Stop/BPM controls
          - Time display
          - Recording controls
        */}
        <div className="flex-shrink-0 border-b border-gray-800/50 backdrop-blur-sm bg-gray-900/95">
          <Transport />
        </div>

        {/* 
          HIERARCHY LAYER 2: TOOLBAR (Secondary)
          - Quick access tools
          - Channel Rack toggle
          - View options
        */}
        <div className="flex-shrink-0 border-b border-gray-800/30 bg-gray-900/50">
          <ToolBar />
        </div>

        {/* 
          HIERARCHY LAYER 3: MAIN WORKSPACE
          - Timeline (primary)
          - Sidebar (secondary)
        */}
        <div className="flex flex-1 overflow-hidden bg-gradient-to-b from-gray-900 to-gray-950">
          {/* Sidebar - Resizable with FL Studio style */}
          <ResizablePanel
            width={sidebarWidth}
            minWidth={200}
            maxWidth={420}
            onResize={setSidebarWidth}
            resizeDirection="horizontal"
            className="flex-shrink-0 border-r border-gray-800/30 bg-gray-900/30 backdrop-blur-sm transition-all duration-300 hover:border-gray-700/50"
          >
            <Sidebar />
          </ResizablePanel>

          {/* Main Timeline - Primary workspace */}
          <div className="flex-1 overflow-hidden relative">
            {/* Subtle grid background for professional feel */}
            <div className="absolute inset-0 opacity-5 pointer-events-none">
              <div className="h-full w-full" style={{
                backgroundImage: `
                  linear-gradient(to right, #374151 1px, transparent 1px),
                  linear-gradient(to bottom, #374151 1px, transparent 1px)
                `,
                backgroundSize: '40px 20px'
              }} />
            </div>
            
            <div className="relative z-10 h-full">
              <Timeline />
            </div>
          </div>
        </div>

        {/* 
          HIERARCHY LAYER 4: MODAL OVERLAYS
          - Piano Roll (when editing)
          - Channel Rack (docked but elevated)
        */}
        <PianoRoll />
        <ChannelRack />
        
        {/* 
          HIERARCHY LAYER 5: ADDITIONAL PANELS
          - Mixer (bottom)
          - Sample Browser (left)
        */}
        <div className="fixed bottom-0 left-0 right-0 z-30">
          <ProfessionalMixer />
        </div>
        
        <div className="fixed top-20 left-0 bottom-20 z-20">
          <SampleBrowser />
        </div>
      </div>
    </DndContext>
  );
}
