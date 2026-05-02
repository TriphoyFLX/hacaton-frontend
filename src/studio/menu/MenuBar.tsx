import { File, Edit, View, Settings, HelpCircle, ChevronDown } from "lucide-react";
import { FL_COLORS, FL_GRADIENTS, FL_SHADOWS } from "../styles/flStudioColors";

export function MenuBar() {
  const menuItems = [
    { icon: File, label: "File", items: ["New", "Open", "Save", "Export"] },
    { icon: Edit, label: "Edit", items: ["Undo", "Redo", "Cut", "Copy", "Paste"] },
    { icon: View, label: "View", items: ["Playlist", "Piano Roll", "Mixer", "Browser"] },
    { icon: Settings, label: "Options", items: ["Settings", "Audio Setup", "MIDI Settings"] },
    { icon: HelpCircle, label: "Help", items: ["Manual", "Shortcuts", "About"] },
  ];

  return (
    <div className="flex items-center px-2 py-1" style={{ backgroundColor: FL_COLORS.PANEL_BG, minHeight: "28px" }}>
      {menuItems.map(({ icon: Icon, label, items }) => (
        <div key={label} className="relative group">
          <button
            className="flex items-center gap-1 px-3 py-1 text-sm transition-colors rounded"
            style={{
              color: FL_COLORS.TEXT_SECONDARY,
              backgroundColor: "transparent",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = FL_COLORS.BUTTON_HOVER;
              e.currentTarget.style.color = FL_COLORS.TEXT_PRIMARY;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = FL_COLORS.TEXT_SECONDARY;
            }}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          
          {/* Dropdown Menu */}
          <div 
            className="absolute top-full left-0 py-1 min-w-[150px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50"
            style={{
              backgroundColor: FL_COLORS.PANEL_BG,
              border: `1px solid ${FL_COLORS.BORDER_DARK}`,
              boxShadow: FL_SHADOWS.PANEL,
            }}
          >
            {items.map((item) => (
              <button
                key={item}
                className="w-full px-4 py-1 text-left text-sm transition-colors"
                style={{
                  color: FL_COLORS.TEXT_SECONDARY,
                  backgroundColor: "transparent",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = FL_COLORS.BUTTON_HOVER;
                  e.currentTarget.style.color = FL_COLORS.TEXT_PRIMARY;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = FL_COLORS.TEXT_SECONDARY;
                }}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      ))}
      
      {/* FL Studio Logo */}
      <div className="ml-auto flex items-center px-4">
        <div 
          className="text-lg font-bold"
          style={{ color: FL_COLORS.ACCENT_BLUE }}
        >
          FL STUDIO
        </div>
      </div>
    </div>
  );
}
