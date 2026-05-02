// Studio Module exports
export { StudioLayout } from "./StudioLayout";

// Store
export { useStudioStore } from "./store/useStudioStore";

// Models
export type { Track, Clip, Note, Tool, UIState, PlaybackState, Channel, Pattern } from "./models";

// Engine
export { useTransport } from "./engine/useTransport";
export { globalClock } from "./engine/clock";
export { globalScheduler } from "./engine/scheduler";
export { globalChannelRackEngine } from "./engine/channelRackEngine";
export { getSampleLoader } from "./engine/sampleLoader";

// Components
export { Timeline } from "./timeline/Timeline";
export { TrackLane } from "./timeline/TrackLane";
export { ClipBlock } from "./timeline/ClipBlock";
export { Ruler } from "./timeline/Ruler";
export { Playhead } from "./timeline/Playhead";

export { PianoRoll } from "./piano-roll/PianoRoll";
export { NoteGrid } from "./piano-roll/NoteGrid";
export { NoteBlock } from "./piano-roll/NoteBlock";

export { Sidebar } from "./sidebar/Sidebar";

export { Transport } from "./transport/Transport";
export { ToolBar } from "./transport/ToolBar";

// Channel Rack
export { ChannelRack, ChannelStrip } from "./channel-rack";

// Mixer
export { ProfessionalMixer } from "./mixer/ProfessionalMixer";
