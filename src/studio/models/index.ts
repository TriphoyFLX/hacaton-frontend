export interface Track {
  id: string;
  name: string;
  type: "audio" | "midi";
  color: string;
  muted: boolean;
  solo: boolean;
  volume: number;
}

export interface Clip {
  id: string;
  trackId: string;
  start: number;
  duration: number;
  type: "audio" | "midi";
  name: string;
  color: string;
  patternId?: string; // Link to pattern for pattern clips
}

export interface Note {
  id: string;
  clipId: string;
  pitch: number;
  start: number;
  duration: number;
  velocity: number;
}

export type Tool = "select" | "draw" | "erase";

export interface UIState {
  zoom: number;
  selectedTool: Tool;
  selectedClipId?: string;
  activePianoRollClipId?: string;
  loopStart: number;
  loopEnd: number;
  loopEnabled: boolean;
  snapStrength: number;
  // FL Studio specific UI state
  browserWidth: number;
  channelRackWidth: number;
  mixerHeight: number;
  isMixerVisible: boolean;
  isChannelRackVisible: boolean;
  activePatternId?: string;
  isChannelRackOpen: boolean;
  sidebarWidth: number;
  channelRackHeight: number;
  swing: number;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  bpm: number;
  masterVolume: number; // 0-1
}

// Channel Rack Types
export interface Channel {
  id: string;
  name: string;
  type: "sample" | "synth";
  color: string;
  muted: boolean;
  solo: boolean;
  volume: number; // 0-1
  pan: number; // -1 to 1
  steps: boolean[]; // 16, 32, or 64 steps
  stepCount: number; // 16, 32, 64
  sampleUrl?: string; // For samples
  audioBuffer?: AudioBuffer; // Decoded audio data
}

export interface Pattern {
  id: string;
  name: string;
  channelIds: string[]; // Which channels are in this pattern
  stepCount: number;
}
