import { MousePointer2, Pencil, Eraser, ZoomIn, ZoomOut, Hand, Grid3X3 } from "lucide-react";
import { useStudioStore } from "../store/useStudioStore";
import type { Tool } from "../models";

const TOOLS: { id: Tool; icon: React.ReactNode; label: string }[] = [
  { id: "select", icon: <MousePointer2 className="w-4 h-4" />, label: "Select (V)" },
  { id: "draw", icon: <Pencil className="w-4 h-4" />, label: "Draw (P)" },
  { id: "erase", icon: <Eraser className="w-4 h-4" />, label: "Erase (E)" },
];

// Separate component to avoid re-rendering entire toolbar
function OpenChannelRackButton() {
  const isOpen = useStudioStore((state) => state.ui.isChannelRackOpen);
  const openChannelRack = useStudioStore((state) => state.openChannelRack);
  
  return (
    <button
      onClick={() => openChannelRack()}
      className={`flex items-center gap-2 px-3 py-2 rounded transition-colors ${
        isOpen 
          ? "bg-blue-600 text-white" 
          : "text-gray-400 hover:text-white hover:bg-gray-700"
      }`}
      title="Open Channel Rack (Step Sequencer)"
    >
      <Grid3X3 className="w-4 h-4" />
      <span className="text-xs font-medium">Channel Rack</span>
    </button>
  );
}

export function ToolBar() {
  const selectedTool = useStudioStore((state) => state.ui.selectedTool);
  const setTool = useStudioStore((state) => state.setTool);
  const zoom = useStudioStore((state) => state.ui.zoom);
  const setZoom = useStudioStore((state) => state.setZoom);

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 border-b border-gray-700">
      {/* Tools */}
      <div className="flex items-center gap-1">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setTool(tool.id)}
            className={`p-2 rounded transition-colors ${
              selectedTool === tool.id
                ? "bg-blue-600 text-white"
                : "text-gray-400 hover:text-white hover:bg-gray-700"
            }`}
            title={tool.label}
          >
            {tool.icon}
          </button>
        ))}
      </div>

      <div className="w-px h-6 bg-gray-700 mx-2" />

      {/* Zoom Controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setZoom(zoom - 0.25)}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-xs text-gray-400 w-12 text-center font-mono">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom(zoom + 0.25)}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>

      <div className="w-px h-6 bg-gray-700 mx-2" />

      {/* Pan Tool */}
      <button
        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
        title="Pan (H)"
      >
        <Hand className="w-4 h-4" />
      </button>

      <div className="w-px h-6 bg-gray-700 mx-2" />

      {/* Channel Rack Toggle */}
      <OpenChannelRackButton />
    </div>
  );
}
