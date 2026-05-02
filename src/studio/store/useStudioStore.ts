import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { Track, Clip, Note, UIState, PlaybackState, Channel, Pattern } from "../models";

interface StudioState {
  tracks: Track[];
  clips: Clip[];
  notes: Note[];
  channels: Channel[];
  patterns: Pattern[];
  ui: UIState & {
    activePatternId?: string;
    isChannelRackOpen: boolean;
    sidebarWidth: number;
    channelRackHeight: number;
    swing: number;
  };
  playback: PlaybackState;
}

interface StudioActions {
  // Track actions
  addTrack: (track: Omit<Track, "id">) => void;
  removeTrack: (id: string) => void;
  updateTrack: (id: string, updates: Partial<Track>) => void;
  
  // Clip actions
  addClip: (clip: Omit<Clip, "id">) => void;
  removeClip: (id: string) => void;
  moveClip: (id: string, start: number, trackId?: string) => void;
  resizeClip: (id: string, duration: number) => void;
  selectClip: (id: string) => void;
  updateClipPattern: (clipId: string, patternId: string) => void;
  updateClip: (id: string, updates: Partial<Clip>) => void;
  duplicateClip: (id: string) => void;
  lockClip: (id: string, locked: boolean) => void;
  openPianoRoll: (clipId: string) => void;
  closePianoRoll: () => void;
  
  // Note actions
  addNote: (note: Omit<Note, "id">) => void;
  removeNote: (id: string) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  moveNote: (id: string, newPitch: number, newStart: number) => void;
  resizeNote: (id: string, newDuration: number) => void;
  getNotesForClip: (clipId: string) => Note[];
  
  // UI actions
  setZoom: (zoom: number) => void;
  setTool: (tool: UIState["selectedTool"]) => void;
  setSnapStrength: (strength: number) => void;
  toggleLoop: () => void;
  setLoopRegion: (start: number, end: number) => void;
  setSidebarWidth: (width: number) => void;
  setChannelRackHeight: (height: number) => void;
  // FL Studio specific UI actions
  setBrowserWidth: (width: number) => void;
  setChannelRackWidth: (width: number) => void;
  setMixerHeight: (height: number) => void;
  toggleMixer: () => void;
  toggleChannelRack: () => void;
  
  // Playback actions (called by engine)
  setCurrentTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setBpm: (bpm: number) => void;
  setMasterVolume: (volume: number) => void;
  resetPlayback: () => void;
  
  // Channel Rack actions
  addChannel: (channel: Omit<Channel, "id" | "steps">) => void;
  removeChannel: (id: string) => void;
  updateChannel: (id: string, updates: Partial<Channel>) => void;
  toggleChannelStep: (channelId: string, stepIndex: number) => void;
  setChannelSteps: (channelId: string, steps: boolean[]) => void;
  loadSampleToChannel: (channelId: string, file: File, audioBuffer: AudioBuffer) => void;
  reorderChannels: (oldIndex: number, newIndex: number) => void;
  openChannelRack: (patternId?: string) => void;
  closeChannelRack: () => void;
  selectPattern: (patternId: string) => void;
  addPattern: (pattern: Omit<Pattern, "id">) => void;
  removePattern: (id: string) => void;
  setSwing: (swing: number) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

const TRACK_COLORS = [
  "#3b82f6", // blue
  "#22c55e", // green
  "#ef4444", // red
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
];

const initialState: StudioState = {
  tracks: [
    { id: "track-1", name: "Drums", type: "audio", color: TRACK_COLORS[0], muted: false, solo: false, volume: 0.8 },
    { id: "track-2", name: "Bass", type: "midi", color: TRACK_COLORS[1], muted: false, solo: false, volume: 0.7 },
    { id: "track-3", name: "Lead", type: "midi", color: TRACK_COLORS[2], muted: false, solo: false, volume: 0.9 },
  ],
  clips: [
    { id: "clip-1", trackId: "track-1", start: 0, duration: 4, type: "audio", name: "Kick Pattern", color: TRACK_COLORS[0], patternId: "pat-1" },
    { id: "clip-2", trackId: "track-2", start: 0, duration: 4, type: "midi", name: "Bass Line", color: TRACK_COLORS[1] },
    { id: "clip-3", trackId: "track-3", start: 4, duration: 4, type: "midi", name: "Melody", color: TRACK_COLORS[2] },
  ],
  notes: [
    // Bass line notes
    { id: "note-1", clipId: "clip-2", pitch: 36, start: 0, duration: 1, velocity: 100 },
    { id: "note-2", clipId: "clip-2", pitch: 36, start: 1, duration: 1, velocity: 100 },
    { id: "note-3", clipId: "clip-2", pitch: 43, start: 2, duration: 1, velocity: 100 },
    { id: "note-4", clipId: "clip-2", pitch: 41, start: 3, duration: 1, velocity: 100 },
    // Melody notes
    { id: "note-5", clipId: "clip-3", pitch: 60, start: 0, duration: 0.5, velocity: 100 },
    { id: "note-6", clipId: "clip-3", pitch: 64, start: 0.5, duration: 0.5, velocity: 100 },
    { id: "note-7", clipId: "clip-3", pitch: 67, start: 1, duration: 0.5, velocity: 100 },
    { id: "note-8", clipId: "clip-3", pitch: 72, start: 2, duration: 1, velocity: 100 },
  ],
  ui: {
    zoom: 1,
    selectedTool: "select",
    selectedClipId: undefined,
    activePianoRollClipId: undefined,
    activePatternId: "pat-1", // Pre-select pattern so Channel Rack shows channels
    isChannelRackOpen: true, // OPEN BY DEFAULT - critical for UX
    sidebarWidth: 256,
    channelRackHeight: 320,
    swing: 0,
    loopStart: 0,
    loopEnd: 8,
    loopEnabled: false,
    snapStrength: 0.25,
    // FL Studio specific UI defaults
    browserWidth: 240,
    channelRackWidth: 320,
    mixerHeight: 200,
    isMixerVisible: false,
    isChannelRackVisible: true,
  },
  channels: [
    // Pre-populated with example pattern so users immediately understand
    { id: "ch-1", name: "🔊 Kick", type: "synth", color: TRACK_COLORS[0], muted: false, solo: false, volume: 0.9, pan: 0, steps: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false], stepCount: 16 },
    { id: "ch-2", name: "🔊 Snare", type: "synth", color: TRACK_COLORS[1], muted: false, solo: false, volume: 0.8, pan: 0, steps: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false], stepCount: 16 },
    { id: "ch-3", name: "🔊 Hi-Hat", type: "synth", color: TRACK_COLORS[2], muted: false, solo: false, volume: 0.6, pan: 0.2, steps: [false, true, false, true, false, true, false, true, false, true, false, true, false, true, false, true], stepCount: 16 },
    { id: "ch-4", name: "🔊 Clap", type: "synth", color: TRACK_COLORS[3], muted: false, solo: false, volume: 0.7, pan: -0.1, steps: Array(16).fill(false), stepCount: 16 },
  ],
  patterns: [
    { id: "pat-1", name: "Pattern 1", channelIds: ["ch-1", "ch-2", "ch-3", "ch-4"], stepCount: 16 },
    { id: "pat-2", name: "Pattern 2", channelIds: ["ch-1", "ch-2", "ch-3", "ch-4"], stepCount: 16 }
  ],
  playback: {
    isPlaying: false,
    currentTime: 0,
    bpm: 120,
    masterVolume: 1,
  },
};

export const useStudioStore = create<StudioState & StudioActions>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Track actions
      addTrack: (track) => {
        const newTrack: Track = {
          ...track,
          id: generateId(),
          color: track.color || TRACK_COLORS[get().tracks.length % TRACK_COLORS.length],
        };
        set((state) => ({ tracks: [...state.tracks, newTrack] }));
      },

      removeTrack: (id) => {
        set((state) => ({
          tracks: state.tracks.filter((t) => t.id !== id),
          clips: state.clips.filter((c) => c.trackId !== id),
        }));
      },

      updateTrack: (id, updates) => {
        set((state) => ({
          tracks: state.tracks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        }));
      },

      // Clip actions
      addClip: (clip) => {
        const track = get().tracks.find((t) => t.id === clip.trackId);
        const newClip: Clip = {
          ...clip,
          id: generateId(),
          color: clip.color || track?.color || TRACK_COLORS[0],
        };
        set((state) => ({ clips: [...state.clips, newClip] }));
      },

      removeClip: (id) => {
        set((state) => ({
          clips: state.clips.filter((c) => c.id !== id),
          notes: state.notes.filter((n) => n.clipId !== id),
          ui: { ...state.ui, selectedClipId: state.ui.selectedClipId === id ? undefined : state.ui.selectedClipId },
        }));
      },

      updateClip: (id, updates) => {
        set((state) => ({
          clips: state.clips.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        }));
      },

      duplicateClip: (id) => {
        set((state) => {
          const clip = state.clips.find((c) => c.id === id);
          if (!clip) return state;
          
          const newClip: Clip = {
            ...clip,
            id: generateId(),
            name: `${clip.name} Copy`,
            start: clip.start + clip.duration, // Place right after original
          };
          
          return { clips: [...state.clips, newClip] };
        });
      },

      lockClip: (id, locked) => {
        set((state) => ({
          clips: state.clips.map((c) => 
            c.id === id ? { ...c, locked } : c
          ),
        }));
      },

      moveClip: (id, newStart, newTrackId) => {
        set((state) => ({
          clips: state.clips.map((c) =>
            c.id === id ? { ...c, start: newStart, trackId: newTrackId || c.trackId } : c
          ),
        }));
      },

      resizeClip: (id, duration) => {
        set((state) => ({
          clips: state.clips.map((c) =>
            c.id === id ? { ...c, duration } : c
          ),
        }));
      },

      selectClip: (id) => {
        const clip = get().clips.find(c => c.id === id);
        if (clip && clip.patternId) {
          // Sync pattern with clip
          set((state) => ({ 
            ui: { ...state.ui, selectedClipId: id, activePatternId: clip.patternId }
          }));
        } else {
          set((state) => ({ ui: { ...state.ui, selectedClipId: id } }));
        }
      },

      openPianoRoll: (clipId) => {
        set((state) => ({ ui: { ...state.ui, activePianoRollClipId: clipId } }));
      },

      closePianoRoll: () => {
        set((state) => ({ ui: { ...state.ui, activePianoRollClipId: undefined } }));
      },

      // Note actions
      addNote: (note) => {
        const newNote: Note = { ...note, id: generateId() };
        set((state) => ({ notes: [...state.notes, newNote] }));
      },

      removeNote: (id) => {
        set((state) => ({
          notes: state.notes.filter((n) => n.id !== id),
        }));
      },

      updateNote: (id, updates) => {
        set((state) => ({
          notes: state.notes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
        }));
      },

      moveNote: (id, newPitch, newStart) => {
        set((state) => ({
          notes: state.notes.map((n) =>
            n.id === id ? { ...n, pitch: newPitch, start: newStart } : n
          ),
        }));
      },

      resizeNote: (id, newDuration) => {
        set((state) => ({
          notes: state.notes.map((n) => (n.id === id ? { ...n, duration: newDuration } : n)),
        }));
      },

      getNotesForClip: (clipId) => {
        return get().notes.filter((n) => n.clipId === clipId);
      },

      // UI actions
      setZoom: (zoom) => {
        set((state) => ({ ui: { ...state.ui, zoom: Math.max(0.25, Math.min(4, zoom)) } }));
      },

      setTool: (tool) => {
        set((state) => ({ ui: { ...state.ui, selectedTool: tool } }));
      },

      setSnapStrength: (strength) => {
        set((state) => ({ ui: { ...state.ui, snapStrength: strength } }));
      },

      toggleLoop: () => {
        set((state) => ({ ui: { ...state.ui, loopEnabled: !state.ui.loopEnabled } }));
      },

      setLoopRegion: (start, end) => {
        set((state) => ({ ui: { ...state.ui, loopStart: start, loopEnd: end } }));
      },

      setSidebarWidth: (width) => {
        const clamped = Math.max(200, Math.min(420, width));
        set((state) => ({ ui: { ...state.ui, sidebarWidth: clamped } }));
      },

      setChannelRackHeight: (height) => {
        const clamped = Math.max(160, Math.min(520, height));
        set((state) => ({ ui: { ...state.ui, channelRackHeight: clamped } }));
      },

      // Playback actions (called by engine)
      setCurrentTime: (time) => {
        set((state) => ({ playback: { ...state.playback, currentTime: time } }));
      },

      setIsPlaying: (playing) => {
        set((state) => ({ playback: { ...state.playback, isPlaying: playing } }));
      },

      setBpm: (bpm) => {
        set((state) => ({ playback: { ...state.playback, bpm: Math.max(20, Math.min(300, bpm)) } }));
      },

      setMasterVolume: (volume) => {
        set((state) => ({ playback: { ...state.playback, masterVolume: Math.max(0, Math.min(1, volume)) } }));
      },

      resetPlayback: () => {
        set((state) => ({ playback: { ...state.playback, currentTime: 0, isPlaying: false } }));
      },
      
      // Channel Rack actions
      addChannel: (channel) => {
        const newChannel: Channel = {
          ...channel,
          id: generateId(),
          steps: Array(channel.stepCount || 16).fill(false),
          color: channel.color || TRACK_COLORS[get().channels.length % TRACK_COLORS.length],
        };
        set((state) => ({ channels: [...state.channels, newChannel] }));
      },
      
      removeChannel: (id) => {
        set((state) => ({
          channels: state.channels.filter((c) => c.id !== id),
          patterns: state.patterns.map((p) => ({
            ...p,
            channelIds: p.channelIds.filter((cid) => cid !== id),
          })),
        }));
      },
      
      updateChannel: (id, updates) => {
        set((state) => ({
          channels: state.channels.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        }));
      },
      
      toggleChannelStep: (channelId, stepIndex) => {
        set((state) => ({
          channels: state.channels.map((c) => {
            if (c.id !== channelId) return c;
            const newSteps = [...c.steps];
            newSteps[stepIndex] = !newSteps[stepIndex];
            return { ...c, steps: newSteps };
          }),
        }));
      },
      
      setChannelSteps: (channelId, steps) => {
        set((state) => ({
          channels: state.channels.map((c) =>
            c.id === channelId ? { ...c, steps, stepCount: steps.length } : c
          ),
        }));
      },
      
      loadSampleToChannel: (channelId, file, audioBuffer) => {
        set((state) => ({
          channels: state.channels.map((c) =>
            c.id === channelId
              ? { ...c, type: "sample", sampleUrl: URL.createObjectURL(file), audioBuffer }
              : c
          ),
        }));
      },
      
      reorderChannels: (oldIndex, newIndex) => {
        set((state) => {
          const channels = [...state.channels];
          const [moved] = channels.splice(oldIndex, 1);
          channels.splice(newIndex, 0, moved);
          return { channels };
        });
      },
      
      openChannelRack: (patternId) => {
        set((state) => ({
          ui: { ...state.ui, isChannelRackOpen: true, activePatternId: patternId || state.patterns[0]?.id },
        }));
      },
      
      closeChannelRack: () => {
        set((state) => ({ ui: { ...state.ui, isChannelRackOpen: false } }));
      },
      
      selectPattern: (patternId) => {
        set((state) => ({ ui: { ...state.ui, activePatternId: patternId } }));
      },

      addPattern: (pattern) => {
        const newPattern: Pattern = {
          id: generateId(),
          ...pattern,
        };
        set((state) => ({ patterns: [...state.patterns, newPattern] }));
      },

      removePattern: (id) => {
        set((state) => ({
          patterns: state.patterns.filter((p) => p.id !== id),
          ui: state.ui.activePatternId === id 
            ? { ...state.ui, activePatternId: state.patterns[0]?.id }
            : state.ui,
        }));
      },

      setSwing: (swing) => {
        set((state) => ({ ui: { ...state.ui, swing: Math.max(0, Math.min(100, swing)) } }));
      },

      updateClipPattern: (clipId, patternId) => {
        set((state) => ({
          clips: state.clips.map((c) =>
            c.id === clipId ? { ...c, patternId } : c
          ),
        }));
      },

      // FL Studio specific UI actions
      setBrowserWidth: (width) => {
        const clamped = Math.max(200, Math.min(400, width));
        set((state) => ({ ui: { ...state.ui, browserWidth: clamped } }));
      },

      setChannelRackWidth: (width) => {
        const clamped = Math.max(280, Math.min(400, width));
        set((state) => ({ ui: { ...state.ui, channelRackWidth: clamped } }));
      },

      setMixerHeight: (height) => {
        const clamped = Math.max(120, Math.min(400, height));
        set((state) => ({ ui: { ...state.ui, mixerHeight: clamped } }));
      },

      toggleMixer: () => {
        set((state) => ({ ui: { ...state.ui, isMixerVisible: !state.ui.isMixerVisible } }));
      },

      toggleChannelRack: () => {
        set((state) => ({ ui: { ...state.ui, isChannelRackVisible: !state.ui.isChannelRackVisible } }));
      },
    }),
    { name: "StudioStore" }
  )
);
