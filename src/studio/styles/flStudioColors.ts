// FL Studio 21 Exact Color Scheme
export const FL_COLORS = {
  // Main backgrounds
  MAIN_BG: '#2D2D30',           // Main dark gray background
  PANEL_BG: '#252526',          // Panel backgrounds
  DARK_BG: '#1E1E1E',           // Darker backgrounds
  
  // Browser/Plugin windows
  BROWSER_BG: '#3C3C3C',       // Browser background
  BROWSER_HEADER: '#464647',    // Browser header
  
  // Channel Rack
  CHANNEL_BG: '#2A2A2A',        // Channel rack background
  CHANNEL_ACTIVE: '#4A90E2',    // Active channel highlight
  CHANNEL_MUTE: '#FF6B6B',      // Muted channel
  CHANNEL_SOLO: '#4ECDC4',      // Solo channel
  
  // Playlist/Timeline
  PLAYLIST_BG: '#2D2D30',       // Playlist background
  TRACK_LANE: '#383838',        // Track lane background
  TRACK_HEADER: '#464647',     // Track header
  GRID_LINES: '#4A4A4A',        // Grid lines
  PLAYHEAD: '#00FF00',          // Playhead color
  
  // Piano Roll
  PIANO_ROLL_BG: '#2D2D30',     // Piano roll background
  PIANO_KEYS: '#1E1E1E',        // Piano keys background
  WHITE_KEY: '#FFFFFF',         // White piano key
  BLACK_KEY: '#000000',         // Black piano key
  NOTE_COLOR: '#4A90E2',        // Default note color
  NOTE_SELECTED: '#FFD700',     // Selected note
  
  // Transport
  TRANSPORT_BG: '#1E1E1E',      // Transport background
  BUTTON_BG: '#3C3C3C',         // Button background
  BUTTON_HOVER: '#4A4A4A',      // Button hover
  BUTTON_ACTIVE: '#007ACC',     // Active button
  PLAY_BUTTON: '#00FF00',       // Play button
  STOP_BUTTON: '#FF4444',       // Stop button
  
  // Text
  TEXT_PRIMARY: '#FFFFFF',       // Primary text
  TEXT_SECONDARY: '#CCCCCC',     // Secondary text
  TEXT_MUTED: '#888888',        // Muted text
  TEXT_HIGHLIGHT: '#00FF00',    // Highlight text
  
  // Accents
  ACCENT_BLUE: '#007ACC',       // Primary accent (FL blue)
  ACCENT_GREEN: '#4ECDC4',      // Green accent
  ACCENT_ORANGE: '#FF9500',     // Orange accent
  ACCENT_RED: '#FF4444',        // Red accent
  ACCENT_PURPLE: '#9B59B6',     // Purple accent
  
  // Borders
  BORDER_LIGHT: '#4A4A4A',       // Light borders
  BORDER_DARK: '#2A2A2A',        // Dark borders
  BORDER_ACTIVE: '#007ACC',     // Active borders
  
  // Clips/Patterns
  CLIP_AUDIO: '#E74C3C',        // Audio clip color
  CLIP_MIDI: '#3498DB',         // MIDI clip color
  CLIP_PATTERN: '#F39C12',      // Pattern clip color
  CLIP_AUTOMATION: '#9B59B6',   // Automation clip color
  
  // Step Sequencer
  STEP_OFF: '#2A2A2A',           // Step off
  STEP_ON: '#4A90E2',           // Step on
  STEP_CURRENT: '#00FF00',      // Current step
  STEP_GRID: '#4A4A4A',         // Step grid lines
  
  // Mixer
  MIXER_BG: '#2D2D30',         // Mixer background
  FADER_TRACK: '#1E1E1E',      // Fader track
  FADER_HANDLE: '#4A90E2',      // Fader handle
  METER_BG: '#1E1E1E',          // Meter background
  METER_GREEN: '#00FF00',       // Green meter
  METER_YELLOW: '#FFD700',       // Yellow meter
  METER_RED: '#FF4444',          // Red meter
  
  // UI Elements
  SCROLLBAR: '#4A4A4A',         // Scrollbar
  SCROLLBAR_THUMB: '#6A6A6A',   // Scrollbar thumb
  TOOLTIP_BG: '#1E1E1E',        // Tooltip background
  TOOLTIP_TEXT: '#FFFFFF',      // Tooltip text
  
  // Selection
  SELECTION_BG: 'rgba(74, 144, 226, 0.3)',  // Selection background
  SELECTION_BORDER: '#4A90E2',  // Selection border
  
  // Hover states
  HOVER_BG: 'rgba(255, 255, 255, 0.1)',     // Hover background
  HOVER_BORDER: 'rgba(255, 255, 255, 0.2)', // Hover border
  
  // Focus states
  FOCUS_BORDER: '#007ACC',      // Focus border
  FOCUS_SHADOW: '0 0 0 2px rgba(0, 122, 204, 0.5)', // Focus shadow
};

// FL Studio specific gradients
export const FL_GRADIENTS = {
  // Button gradients
  BUTTON_DEFAULT: 'linear-gradient(180deg, #4A4A4A 0%, #3C3C3C 100%)',
  BUTTON_HOVER: 'linear-gradient(180deg, #5A5A5A 0%, #4A4A4A 100%)',
  BUTTON_ACTIVE: 'linear-gradient(180deg, #007ACC 0%, #005A9E 100%)',
  
  // Panel gradients
  PANEL_HEADER: 'linear-gradient(180deg, #464647 0%, #3C3C3C 100%)',
  CHANNEL_HEADER: 'linear-gradient(180deg, #4A4A4A 0%, #3C3C3C 100%)',
  
  // Transport gradients
  TRANSPORT_GRADIENT: 'linear-gradient(180deg, #2D2D30 0%, #1E1E1E 100%)',
};

// FL Studio shadows
export const FL_SHADOWS = {
  PANEL: '0 2px 8px rgba(0, 0, 0, 0.3)',
  BUTTON: '0 1px 3px rgba(0, 0, 0, 0.2)',
  INSET: 'inset 0 1px 3px rgba(0, 0, 0, 0.3)',
  GLOW: '0 0 8px rgba(74, 144, 226, 0.5)',
  FOCUS: '0 0 0 2px rgba(0, 122, 204, 0.5)',
};

// FL Studio fonts
export const FL_FONTS = {
  PRIMARY: '"Segoe UI", system-ui, -apple-system, sans-serif',
  MONOSPACE: '"Consolas", "Monaco", monospace',
  BOLD: '600',
  NORMAL: '400',
};

// FL Studio spacing
export const FL_SPACING = {
  XS: '2px',
  SM: '4px',
  MD: '8px',
  LG: '12px',
  XL: '16px',
  XXL: '24px',
};

// FL Studio border radius
export const FL_BORDER_RADIUS = {
  NONE: '0',
  SM: '2px',
  MD: '4px',
  LG: '6px',
};
