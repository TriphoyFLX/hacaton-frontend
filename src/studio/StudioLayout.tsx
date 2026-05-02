import { DndContext, DragEndEvent, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { Sidebar } from "./sidebar/Sidebar";
import { Transport } from "./transport/Transport";
import { ToolBar } from "./transport/ToolBar";
import { Timeline } from "./timeline/Timeline";
import { PianoRoll } from "./piano-roll/PianoRoll";
import { ChannelRack } from "./channel-rack/ChannelRack";
import { useStudioStore } from "./store/useStudioStore";

export function StudioLayout() {
  const addClip = useStudioStore((state) => state.addClip);
  const tracks = useStudioStore((state) => state.tracks);

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!active || !over) return;

    // Handle sidebar items being dropped on timeline
    if (active.id.toString().startsWith("sidebar-") && over.id === "timeline") {
      const data = active.data.current;
      if (!data) return;

      // Find the track at the drop position (default to first track)
      const targetTrack = tracks[0];
      if (!targetTrack) return;

      // Create a new clip
      addClip({
        trackId: targetTrack.id,
        start: 0,
        duration: 4,
        type: data.type === "instrument" ? "midi" : "audio",
        name: data.name,
        color: data.color,
      });
    }
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-screen w-full bg-gray-950 text-gray-100 overflow-hidden">
        {/* Top Bar - Transport */}
        <Transport />

        {/* Tool Bar */}
        <ToolBar />

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <Sidebar />

          {/* Timeline */}
          <div className="flex-1 overflow-hidden">
            <Timeline />
          </div>
        </div>

        {/* Piano Roll Modal */}
        <PianoRoll />
        
        {/* Channel Rack Dock */}
        <ChannelRack />
      </div>
    </DndContext>
  );
}
