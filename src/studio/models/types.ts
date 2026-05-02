export type Track = {
  id: string;
  name: string;
  type: "audio" | "midi";
  muted: boolean;
  solo: boolean;
  volume: number;
  color: string;
};

export type Clip = {
  id: string;
  trackId: string;
  start: number; // in beats
  duration: number; // in beats
  type: "audio" | "midi";
  name: string;
  color: string;
};

export type Note = {
  id: string;
  clipId: string;
  pitch: number; // MIDI note (60 = C4)
  start: number; // relative to clip start, in beats
  duration: number; // in beats
  velocity: number; // 0-127
};

export type UIState = {
  zoom: number; // pixels per beat
  selectedTool: "select" | "draw" | "erase";
  selectedClipId?: string;
  activePianoRollClipId?: string;
  snapToGrid: boolean;
  gridSize: number; // in beats (1/4, 1/8, etc.)
};

export type PlaybackState = {
  isPlaying: boolean;
  currentTime: number; // in beats
  bpm: number;
  isLooping: boolean;
  loopStart: number;
  loopEnd: number;
};

export type Sample = {
  id: string;
  name: string;
  url?: string;
  type: "audio" | "midi";
  category: string;
};

export type Instrument = {
  id: string;
  name: string;
  type: "synth" | "sampler";
  preset?: string;
};
