import { useDraggable } from "@dnd-kit/core";
import { Music, AudioWaveform, Drum, Guitar, Piano, Mic, Waves, Plus } from "lucide-react";
import { useStudioStore } from "../store/useStudioStore";
import type { Track } from "../models";
import { AudioSampleLoader } from "../components/AudioSampleLoader";

interface SidebarItemProps {
  id: string;
  name: string;
  icon: React.ReactNode;
  type: "sample" | "instrument";
  color?: string;
}

function SidebarItem({ id, name, icon, type, color = "#3b82f6" }: SidebarItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `sidebar-${id}`,
    data: { type, name, color },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-3 p-3 bg-gray-800 rounded-lg cursor-grab hover:bg-gray-700 transition-colors border border-gray-700 ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="w-10 h-10 rounded flex items-center justify-center" style={{ backgroundColor: color }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{name}</p>
        <p className="text-xs text-gray-500 capitalize">{type}</p>
      </div>
    </div>
  );
}

const SAMPLES: SidebarItemProps[] = [
  { id: "kick", name: "Kick Drum", icon: <Drum className="w-5 h-5 text-white" />, type: "sample", color: "#ef4444" },
  { id: "snare", name: "Snare", icon: <Drum className="w-5 h-5 text-white" />, type: "sample", color: "#f59e0b" },
  { id: "hihat", name: "Hi-Hat", icon: <Waves className="w-5 h-5 text-white" />, type: "sample", color: "#22c55e" },
  { id: "clap", name: "Clap", icon: <AudioWaveform className="w-5 h-5 text-white" />, type: "sample", color: "#3b82f6" },
  { id: "bass", name: "Bass Shot", icon: <AudioWaveform className="w-5 h-5 text-white" />, type: "sample", color: "#8b5cf6" },
];

// Real sound files from sounds folder
const REAL_SAMPLES: SidebarItemProps[] = [
  { id: "choise-hat", name: "CHOISE Hat", icon: <Waves className="w-5 h-5 text-white" />, type: "sample", color: "#10b981" },
  { id: "make-it-bleed-hat", name: "MAKE IT BLEED Op Hat", icon: <Waves className="w-5 h-5 text-white" />, type: "sample", color: "#06b6d4" },
  { id: "masked-up-clap", name: "MASKED UP Clap", icon: <AudioWaveform className="w-5 h-5 text-white" />, type: "sample", color: "#f59e0b" },
  { id: "you-ready-kick", name: "YOU READY？Kick", icon: <Drum className="w-5 h-5 text-white" />, type: "sample", color: "#ef4444" },
];

const INSTRUMENTS: SidebarItemProps[] = [
  { id: "piano", name: "Grand Piano", icon: <Piano className="w-5 h-5 text-white" />, type: "instrument", color: "#ec4899" },
  { id: "synth", name: "Synth Lead", icon: <Music className="w-5 h-5 text-white" />, type: "instrument", color: "#14b8a6" },
  { id: "bass-synth", name: "Bass Synth", icon: <Guitar className="w-5 h-5 text-white" />, type: "instrument", color: "#f97316" },
  { id: "pad", name: "Ambient Pad", icon: <Waves className="w-5 h-5 text-white" />, type: "instrument", color: "#6366f1" },
  { id: "voice", name: "Vocal", icon: <Mic className="w-5 h-5 text-white" />, type: "instrument", color: "#a855f7" },
];

export function Sidebar() {
  const addTrack = useStudioStore((state) => state.addTrack);

  const handleAddTrack = () => {
    const types: Track["type"][] = ["audio", "midi", "audio"];
    const names = ["New Audio Track", "New MIDI Track", "New Audio Track"];
    const randomIndex = Math.floor(Math.random() * 3);
    
    addTrack({
      name: names[randomIndex],
      type: types[randomIndex],
      color: "",
      muted: false,
      solo: false,
      volume: 0.8,
    });
  };

  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Library</h2>
      </div>

      {/* Add Track Button */}
      <div className="p-4 border-b border-gray-800">
        <button
          onClick={handleAddTrack}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium text-white transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Track
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Real Samples Section */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Real Samples</h3>
          <div className="space-y-2">
            {REAL_SAMPLES.map((sample) => (
              <SidebarItem key={sample.id} {...sample} />
            ))}
          </div>
        </div>

        {/* Basic Samples Section */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Basic Samples</h3>
          <div className="space-y-2">
            {SAMPLES.map((sample) => (
              <SidebarItem key={sample.id} {...sample} />
            ))}
          </div>
        </div>

        {/* Instruments Section */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Instruments</h3>
          <div className="space-y-2">
            {INSTRUMENTS.map((instrument) => (
              <SidebarItem key={instrument.id} {...instrument} />
            ))}
          </div>
        </div>

        {/* Audio Sample Loader */}
        <div>
          <AudioSampleLoader />
        </div>
      </div>

      {/* Footer hint */}
      <div className="p-4 border-t border-gray-800">
        <p className="text-xs text-gray-500 text-center">
          Drag items to timeline to create clips
        </p>
      </div>
    </div>
  );
}
