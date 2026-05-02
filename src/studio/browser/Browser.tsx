import { useState } from "react";
import { ChevronDown, ChevronRight, Folder, FolderOpen, File, Music, Drum, Piano, Search } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { FL_COLORS, FL_SHADOWS } from "../styles/flStudioColors";

interface BrowserItemProps {
  id: string;
  name: string;
  type: "folder" | "sample" | "preset" | "pattern";
  icon?: React.ReactNode;
  color?: string;
  isDraggable?: boolean;
  children?: BrowserItemProps[];
}

interface DraggableSampleProps {
  id: string;
  name: string;
  type: "sample" | "preset";
  icon: React.ReactNode;
  color: string;
}

function DraggableSample({ id, name, type, icon, color }: DraggableSampleProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `browser-${id}`,
    data: { type, name, color },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-2 px-2 py-1 cursor-grab transition-colors rounded ${
        isDragging ? "opacity-50" : ""
      }`}
      style={{
        color: FL_COLORS.TEXT_SECONDARY,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = FL_COLORS.HOVER_BG;
        e.currentTarget.style.color = FL_COLORS.TEXT_PRIMARY;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "transparent";
        e.currentTarget.style.color = FL_COLORS.TEXT_SECONDARY;
      }}
    >
      <div className="w-4 h-4 rounded flex items-center justify-center" style={{ backgroundColor: color }}>
        {icon}
      </div>
      <span className="text-sm truncate">{name}</span>
    </div>
  );
}

function BrowserItem({ item, level = 0 }: { item: BrowserItemProps; level?: number }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getIcon = () => {
    if (item.icon) return item.icon;
    
    switch (item.type) {
      case "folder":
        return isExpanded ? <FolderOpen className="w-4 h-4" /> : <Folder className="w-4 h-4" />;
      case "sample":
        return <Music className="w-4 h-4" />;
      case "preset":
        return <Piano className="w-4 h-4" />;
      case "pattern":
        return <Drum className="w-4 h-4" />;
      default:
        return <File className="w-4 h-4" />;
    }
  };

  if (item.type === "folder") {
    return (
      <div>
        <div
          className="flex items-center gap-2 px-2 py-1 cursor-pointer transition-colors rounded"
          style={{
            color: FL_COLORS.TEXT_SECONDARY,
            paddingLeft: `${level * 16 + 8}px`,
          }}
          onClick={() => setIsExpanded(!isExpanded)}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = FL_COLORS.HOVER_BG;
            e.currentTarget.style.color = FL_COLORS.TEXT_PRIMARY;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = FL_COLORS.TEXT_SECONDARY;
          }}
        >
          <div className="w-4 h-4 flex items-center justify-center">
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </div>
          {getIcon()}
          <span className="text-sm font-medium">{item.name}</span>
        </div>
        {isExpanded && item.children && (
          <div>
            {item.children.map((child) => (
              <BrowserItem key={child.id} item={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (item.isDraggable) {
    return (
      <div style={{ paddingLeft: `${level * 16 + 8}px` }}>
        <DraggableSample
          id={item.id}
          name={item.name}
          type={item.type as "sample" | "preset"}
          icon={getIcon()}
          color={item.color || FL_COLORS.ACCENT_BLUE}
        />
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2 px-2 py-1 transition-colors rounded"
      style={{
        color: FL_COLORS.TEXT_SECONDARY,
        paddingLeft: `${level * 16 + 8}px`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = FL_COLORS.HOVER_BG;
        e.currentTarget.style.color = FL_COLORS.TEXT_PRIMARY;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "transparent";
        e.currentTarget.style.color = FL_COLORS.TEXT_SECONDARY;
      }}
    >
      <div className="w-4 h-4 rounded flex items-center justify-center" style={{ backgroundColor: item.color || FL_COLORS.ACCENT_BLUE }}>
        {getIcon()}
      </div>
      <span className="text-sm truncate">{item.name}</span>
    </div>
  );
}

export function Browser() {
  const [searchTerm, setSearchTerm] = useState("");

  const browserData: BrowserItemProps[] = [
    {
      id: "samples",
      name: "Samples",
      type: "folder",
      children: [
        {
          id: "drums",
          name: "Drums",
          type: "folder",
          children: [
            { id: "kick", name: "Kick", type: "sample", color: "#FF6B6B", isDraggable: true },
            { id: "snare", name: "Snare", type: "sample", color: "#4ECDC4", isDraggable: true },
            { id: "hihat", name: "Hi-Hat", type: "sample", color: "#45B7D1", isDraggable: true },
            { id: "clap", name: "Clap", type: "sample", color: "#F7DC6F", isDraggable: true },
          ],
        },
        {
          id: "bass",
          name: "Bass",
          type: "folder",
          children: [
            { id: "sub-bass", name: "Sub Bass", type: "sample", color: "#9B59B6", isDraggable: true },
            { id: "synth-bass", name: "Synth Bass", type: "sample", color: "#E74C3C", isDraggable: true },
          ],
        },
        {
          id: "melody",
          name: "Melody",
          type: "folder",
          children: [
            { id: "synth-lead", name: "Synth Lead", type: "sample", color: "#3498DB", isDraggable: true },
            { id: "piano", name: "Piano", type: "sample", color: "#2ECC71", isDraggable: true },
          ],
        },
      ],
    },
    {
      id: "presets",
      name: "Presets",
      type: "folder",
      children: [
        {
          id: "synths",
          name: "Synthesizers",
          type: "folder",
          children: [
            { id: "fmsynth", name: "FM Synth", type: "preset", color: "#E67E22", isDraggable: true },
            { id: "analog", name: "Analog", type: "preset", color: "#16A085", isDraggable: true },
            { id: "wavetable", name: "Wavetable", type: "preset", color: "#8E44AD", isDraggable: true },
          ],
        },
      ],
    },
    {
      id: "patterns",
      name: "Patterns",
      type: "folder",
      children: [
        { id: "trap-beat", name: "Trap Beat", type: "pattern", color: "#E74C3C", isDraggable: true },
        { id: "hip-hop", name: "Hip Hop", type: "pattern", color: "#3498DB", isDraggable: true },
        { id: "house", name: "House", type: "pattern", color: "#2ECC71", isDraggable: true },
      ],
    },
  ];

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: FL_COLORS.BROWSER_BG }}>
      {/* Header */}
      <div className="p-2 border-b" style={{ borderColor: FL_COLORS.BORDER_DARK }}>
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4" style={{ color: FL_COLORS.TEXT_MUTED }} />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-2 py-1 text-sm bg-transparent border rounded outline-none"
            style={{
              color: FL_COLORS.TEXT_PRIMARY,
              borderColor: FL_COLORS.BORDER_LIGHT,
            }}
            onFocus={(e) => {
              e.target.style.borderColor = FL_COLORS.ACCENT_BLUE;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = FL_COLORS.BORDER_LIGHT;
            }}
          />
        </div>
      </div>

      {/* Tree View */}
      <div className="flex-1 overflow-y-auto p-2">
        {browserData.map((item) => (
          <BrowserItem key={item.id} item={item} />
        ))}
      </div>

      {/* Status Bar */}
      <div 
        className="px-2 py-1 text-xs border-t"
        style={{ 
          borderColor: FL_COLORS.BORDER_DARK,
          backgroundColor: FL_COLORS.PANEL_BG,
          color: FL_COLORS.TEXT_MUTED
        }}
      >
        Drag samples to playlist
      </div>
    </div>
  );
}
