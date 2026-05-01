import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Play, Pause, Square, Circle, Mic, Plus, Volume2, Save, Download, Undo2, Redo2, Clock, Zap, Sliders, Music, Headphones, Activity, BarChart3, Settings, Monitor, Smartphone, Copy, Trash2, Search, Sparkles, GripVertical } from 'lucide-react';

interface Track {
  id: string;
  name: string;
  color: string;
  volume: number;
  muted: boolean;
  solo: boolean;
  clips: Clip[];
  fx: TrackFx;
  automation: TrackAutomation;
}

interface Clip {
  id: string;
  trackId: string;
  startTime: number;
  duration: number;
  sourceOffset: number;
  name: string;
  color: string;
  audioUrl?: string;
  fileName?: string;
  isRecording?: boolean;
}

interface FxPlugin {
  enabled: boolean;
}

interface EqFx extends FxPlugin {
  lowGain: number;
  midGain: number;
  highGain: number;
}

interface CompressorFx extends FxPlugin {
  threshold: number;
  ratio: number;
}

interface ReverbFx extends FxPlugin {
  amount: number;
}

interface DelayFx extends FxPlugin {
  time: number;
  feedback: number;
  wet: number;
}

interface ChorusFx extends FxPlugin {
  rate: number;
  depth: number;
  wet: number;
}

interface LimiterFx extends FxPlugin {
  ceiling: number;
}

type FxOrder = 'eq-comp-reverb' | 'comp-eq-reverb';

interface TrackFx {
  order: FxOrder;
  eq: EqFx;
  compressor: CompressorFx;
  reverb: ReverbFx;
  delay: DelayFx;
  chorus: ChorusFx;
  limiter: LimiterFx;
}

interface AutomationPoint {
  time: number;
  value: number;
}

type AutomationTarget = 'volume' | 'eq.low' | 'eq.mid' | 'eq.high' | 'comp.threshold' | 'comp.ratio' | 'reverb.amount' | 'delay.time' | 'delay.feedback' | 'delay.wet' | 'chorus.rate' | 'chorus.depth' | 'chorus.wet' | 'limiter.ceiling';

interface TrackAutomation {
  [key: string]: AutomationPoint[];
}

interface StudioProject {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  tracks: Track[];
}

interface MidiInputDevice {
  id: string;
  name: string;
  manufacturer?: string;
  state?: string;
  connection?: string;
  onmidimessage: ((event: MIDIMessageEvent) => void) | null;
}

const STORAGE_KEY = 'studio-projects-v1';
const STUDIO_HINTS_STORAGE_KEY = 'studio-hints-v1';
const TRACK_COLORS = ['bg-yellow-500', 'bg-pink-500', 'bg-indigo-500', 'bg-orange-500', 'bg-cyan-500', 'bg-emerald-500', 'bg-red-500'];
const TRACK_TEMPLATES = [
  { label: 'Vocal', color: 'bg-pink-500' },
  { label: 'Drums', color: 'bg-red-500' },
  { label: 'Bass', color: 'bg-green-500' },
  { label: 'Synth', color: 'bg-indigo-500' },
];
const SMART_TRACK_PRESETS = {
  vocalPolish: {
    label: 'Vocal Polish',
    fx: {
      order: 'eq-comp-reverb' as FxOrder,
      eq: { enabled: true, lowGain: -2, midGain: 3, highGain: 4 },
      compressor: { enabled: true, threshold: -18, ratio: 4 },
      reverb: { enabled: true, amount: 0.22 },
      delay: { enabled: true, time: 0.24, feedback: 0.18, wet: 0.15 },
      chorus: { enabled: false, rate: 1.5, depth: 0.2, wet: 0.1 },
      limiter: { enabled: true, ceiling: -1.2 },
    },
  },
  drumPunch: {
    label: 'Drum Punch',
    fx: {
      order: 'comp-eq-reverb' as FxOrder,
      eq: { enabled: true, lowGain: 5, midGain: 1, highGain: 2 },
      compressor: { enabled: true, threshold: -16, ratio: 6 },
      reverb: { enabled: true, amount: 0.12 },
      delay: { enabled: false, time: 0.3, feedback: 0.2, wet: 0.1 },
      chorus: { enabled: false, rate: 1.2, depth: 0.1, wet: 0.1 },
      limiter: { enabled: true, ceiling: -0.8 },
    },
  },
  bassTight: {
    label: 'Bass Tight',
    fx: {
      order: 'comp-eq-reverb' as FxOrder,
      eq: { enabled: true, lowGain: 3, midGain: -2, highGain: -3 },
      compressor: { enabled: true, threshold: -22, ratio: 5 },
      reverb: { enabled: false, amount: 0.1 },
      delay: { enabled: false, time: 0.18, feedback: 0.12, wet: 0.08 },
      chorus: { enabled: true, rate: 0.8, depth: 0.2, wet: 0.15 },
      limiter: { enabled: true, ceiling: -1 },
    },
  },
  synthWide: {
    label: 'Synth Wide',
    fx: {
      order: 'eq-comp-reverb' as FxOrder,
      eq: { enabled: true, lowGain: -1, midGain: 2, highGain: 5 },
      compressor: { enabled: true, threshold: -20, ratio: 3 },
      reverb: { enabled: true, amount: 0.28 },
      delay: { enabled: true, time: 0.32, feedback: 0.28, wet: 0.22 },
      chorus: { enabled: true, rate: 2.4, depth: 0.35, wet: 0.3 },
      limiter: { enabled: true, ceiling: -1.5 },
    },
  },
};
type SmartTrackPresetKey = keyof typeof SMART_TRACK_PRESETS;
type HintKey = 'quickStart' | 'addTrackAudio' | 'playButton' | 'commandPalette';

const createDefaultTracks = (): Track[] => [
  {
    id: '1',
    name: 'Audio 1',
    color: 'bg-purple-500',
    volume: 100,
    muted: false,
    solo: false,
    clips: [],
    fx: {
      order: 'eq-comp-reverb',
      eq: { enabled: false, lowGain: 0, midGain: 0, highGain: 0 },
      compressor: { enabled: false, threshold: -24, ratio: 4 },
      reverb: { enabled: false, amount: 0.25 },
      delay: { enabled: false, time: 0.3, feedback: 0.3, wet: 0.3 },
      chorus: { enabled: false, rate: 1.5, depth: 0.5, wet: 0.3 },
      limiter: { enabled: false, ceiling: -1 },
    },
    automation: {},
  },
  {
    id: '2',
    name: 'Audio 2',
    color: 'bg-blue-500',
    volume: 100,
    muted: false,
    solo: false,
    clips: [],
    fx: {
      order: 'eq-comp-reverb',
      eq: { enabled: false, lowGain: 0, midGain: 0, highGain: 0 },
      compressor: { enabled: false, threshold: -24, ratio: 4 },
      reverb: { enabled: false, amount: 0.25 },
      delay: { enabled: false, time: 0.3, feedback: 0.3, wet: 0.3 },
      chorus: { enabled: false, rate: 1.5, depth: 0.5, wet: 0.3 },
      limiter: { enabled: false, ceiling: -1 },
    },
    automation: {},
  },
  {
    id: '3',
    name: 'Drums',
    color: 'bg-red-500',
    volume: 100,
    muted: false,
    solo: false,
    clips: [],
    fx: {
      order: 'eq-comp-reverb',
      eq: { enabled: false, lowGain: 0, midGain: 0, highGain: 0 },
      compressor: { enabled: false, threshold: -24, ratio: 4 },
      reverb: { enabled: false, amount: 0.25 },
      delay: { enabled: false, time: 0.3, feedback: 0.3, wet: 0.3 },
      chorus: { enabled: false, rate: 1.5, depth: 0.5, wet: 0.3 },
      limiter: { enabled: false, ceiling: -1 },
    },
    automation: {},
  },
  {
    id: '4',
    name: 'Bass',
    color: 'bg-green-500',
    volume: 100,
    muted: false,
    solo: false,
    clips: [],
    fx: {
      order: 'eq-comp-reverb',
      eq: { enabled: false, lowGain: 0, midGain: 0, highGain: 0 },
      compressor: { enabled: false, threshold: -24, ratio: 4 },
      reverb: { enabled: false, amount: 0.25 },
      delay: { enabled: false, time: 0.3, feedback: 0.3, wet: 0.3 },
      chorus: { enabled: false, rate: 1.5, depth: 0.5, wet: 0.3 },
      limiter: { enabled: false, ceiling: -1 },
    },
    automation: {},
  },
];

const loadProjects = (): StudioProject[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StudioProject[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};


export default function Studio() {
  const [projects, setProjects] = useState<StudioProject[]>(() => loadProjects());
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [showProjectChooser, setShowProjectChooser] = useState(true);
  const [newProjectName, setNewProjectName] = useState('New Project');

  const [tracks, setTracks] = useState<Track[]>(createDefaultTracks());
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);
  const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>([]);
  const [projectName, setProjectName] = useState('New Project');
  const [dragOverTrackId, setDragOverTrackId] = useState<string | null>(null);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);

  const [loopEnabled, setLoopEnabled] = useState(false);
  const [loopStart, setLoopStart] = useState(0);
  const [loopEnd, setLoopEnd] = useState(8);
  const [isLoopSelecting, setIsLoopSelecting] = useState(false);
  const loopSelectRef = useRef<{ startX: number } | null>(null);

  const [fxPanelOpen, setFxPanelOpen] = useState(false);
  const [fxPanelTrackId, setFxPanelTrackId] = useState<string | null>(null);
  const [automationRecording, setAutomationRecording] = useState<AutomationTarget | null>(null);
  const [automationPoints] = useState<Map<string, AutomationPoint[]>>(new Map());
  const [showAutomationCurves, setShowAutomationCurves] = useState(true);
  const [showSpectrumAnalyzer, setShowSpectrumAnalyzer] = useState(true);
  const [showVUMeters, setShowVUMeters] = useState(true);
  const [showPluginRack, setShowPluginRack] = useState(false);
  const [history, setHistory] = useState<Track[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [metronomeEnabled, setMetronomeEnabled] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [selectedPreset, setSelectedPreset] = useState('default');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [midiDevices, setMidiDevices] = useState<MidiInputDevice[]>([]);
  const [saveIndicator, setSaveIndicator] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [trackSearch, setTrackSearch] = useState('');
  const [trackContextMenu, setTrackContextMenu] = useState<{ x: number; y: number; trackId: string } | null>(null);
  const [draggingTrackId, setDraggingTrackId] = useState<string | null>(null);
  const [showQuickTips, setShowQuickTips] = useState(true);
  const [uiMessage, setUiMessage] = useState<{ text: string; tone: 'info' | 'success' | 'warning' } | null>(null);
  const [armedTrackId, setArmedTrackId] = useState<string | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandSearch, setCommandSearch] = useState('');
  const [seenHints, setSeenHints] = useState<Record<HintKey, boolean>>({
    quickStart: false,
    addTrackAudio: false,
    playButton: false,
    commandPalette: false,
  });

  const pxPerSecond = 80;
  const snapSeconds = 0.25;
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingDropTrackIdRef = useRef<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const trackGainRef = useRef<Map<string, GainNode>>(new Map());
  const playingSourcesRef = useRef<Array<{ source: AudioBufferSourceNode; clipId: string }>>([]);
  const clipBufferCacheRef = useRef<Map<string, AudioBuffer>>(new Map());
  const clipPeaksCacheRef = useRef<Map<string, number[]>>(new Map());
  const playStartCtxTimeRef = useRef<number>(0);
  const playStartProjectTimeRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const saveIndicatorTimeoutRef = useRef<number | null>(null);
  const uiMessageTimeoutRef = useRef<number | null>(null);
  const spectrumAnalyzerRef = useRef<AnalyserNode | null>(null);
  const vuMeterLeftRef = useRef<AnalyserNode | null>(null);
  const vuMeterRightRef = useRef<AnalyserNode | null>(null);
  const spectrumCanvasRef = useRef<HTMLCanvasElement>(null);
  const vuLeftCanvasRef = useRef<HTMLCanvasElement>(null);
  const vuRightCanvasRef = useRef<HTMLCanvasElement>(null);

  const trackFxNodesRef = useRef<Map<string, {
    eqLow: BiquadFilterNode;
    eqMid: BiquadFilterNode;
    eqHigh: BiquadFilterNode;
    compressor: DynamicsCompressorNode;
    reverb: ConvolverNode;
    reverbGain: GainNode;
    delay: DelayNode;
    delayFeedback: GainNode;
    delayWet: GainNode;
    chorus: StereoPannerNode;
    chorusLfo: OscillatorNode;
    chorusDepth: GainNode;
    chorusWet: GainNode;
    limiter: DynamicsCompressorNode;
  }>>(new Map());

  const reverbImpulseCacheRef = useRef<AudioBuffer | null>(null);

  const createReverbImpulse = (ctx: BaseAudioContext, duration: number = 2, decay: number = 2): AudioBuffer => {
    const length = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return buffer;
  };

  const draggingClipRef = useRef<{
    clipId: string;
    trackId: string;
    pointerStartX: number;
    pointerStartY: number;
    clipStartTimeAtDragStart: number;
  } | null>(null);

  const trimRef = useRef<{
    clipId: string;
    trackId: string;
    pointerStartX: number;
    startTimeAtStart: number;
    durationAtStart: number;
    offsetAtStart: number;
    edge: 'left' | 'right';
  } | null>(null);
  
  const timelineRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const soloedTrackIds = useMemo(() => tracks.filter((t) => t.solo).map((t) => t.id), [tracks]);
  const filteredTracks = useMemo(() => {
    const query = trackSearch.trim().toLowerCase();
    if (!query) return tracks;
    return tracks.filter((track) => track.name.toLowerCase().includes(query));
  }, [tracks, trackSearch]);
  const selectedTracks = useMemo(() => {
    const selectedSet = new Set(selectedTrackIds);
    return tracks.filter((track) => selectedSet.has(track.id));
  }, [tracks, selectedTrackIds]);
  const groupVolumeValue = useMemo(() => {
    if (selectedTracks.length === 0) return 100;
    const avg = selectedTracks.reduce((sum, track) => sum + track.volume, 0) / selectedTracks.length;
    return Math.round(avg);
  }, [selectedTracks]);

  const projectDurationSeconds = useMemo(() => {
    const ends: number[] = [];
    tracks.forEach((t) => t.clips.forEach((c) => ends.push(c.startTime + c.duration)));
    const maxEnd = ends.length ? Math.max(...ends) : 0;
    return Math.max(60, Math.ceil(maxEnd + 10));
  }, [tracks]);

  const timelineWidthPx = useMemo(() => projectDurationSeconds * pxPerSecond, [projectDurationSeconds, pxPerSecond]);

  const ensureAudioGraph = () => {
    if (audioContextRef.current && masterGainRef.current) return;
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);
    audioContextRef.current = ctx;
    masterGainRef.current = master;
    trackGainRef.current = new Map();

    // Create analyzer nodes
    const spectrum = ctx.createAnalyser();
    spectrum.fftSize = 2048;
    spectrum.smoothingTimeConstant = 0.8;
    master.connect(spectrum);
    spectrumAnalyzerRef.current = spectrum;

    // Create VU meters
    const vuLeft = ctx.createAnalyser();
    const vuRight = ctx.createAnalyser();
    vuLeft.fftSize = 256;
    vuRight.fftSize = 256;
    vuLeft.smoothingTimeConstant = 0.9;
    vuRight.smoothingTimeConstant = 0.9;
    master.connect(vuLeft);
    master.connect(vuRight);
    vuMeterLeftRef.current = vuLeft;
    vuMeterRightRef.current = vuRight;

    if (!reverbImpulseCacheRef.current) {
      reverbImpulseCacheRef.current = createReverbImpulse(ctx);
    }
  };
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms}`;
  };

  const clampBpm = (value: number) => Math.max(40, Math.min(300, value));

  const notifyUser = useCallback((text: string, tone: 'info' | 'success' | 'warning' = 'info') => {
    setUiMessage({ text, tone });
    if (uiMessageTimeoutRef.current) {
      window.clearTimeout(uiMessageTimeoutRef.current);
    }
    uiMessageTimeoutRef.current = window.setTimeout(() => {
      setUiMessage(null);
      uiMessageTimeoutRef.current = null;
    }, 2500);
  }, []);

  const markHintSeen = useCallback((key: HintKey) => {
    setSeenHints((prev) => ({ ...prev, [key]: true }));
  }, []);

  const createProject = () => {
    const now = new Date().toISOString();
    const id = Date.now().toString();
    const project: StudioProject = {
      id,
      name: newProjectName.trim() || 'New Project',
      createdAt: now,
      updatedAt: now,
      tracks: createDefaultTracks(),
    };
    const updated = [project, ...projects];
    setProjects(updated);
    saveProjects(updated);
    setActiveProjectId(id);
    setProjectName(project.name);
    setTracks(project.tracks);
    setSelectedTrack(null);
    setCurrentTime(0);
    setShowProjectChooser(false);
  };

  const openProject = (id: string) => {
    const project = projects.find((p) => p.id === id);
    if (!project) return;
    setActiveProjectId(project.id);
    setProjectName(project.name);
    setTracks(project.tracks);
    setSelectedTrack(null);
    setCurrentTime(0);
    setShowProjectChooser(false);
  };

  const saveProjects = (projectList: StudioProject[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projectList));
    } catch (error) {
      console.error('Failed to save projects:', error);
    }
  };

  const saveCurrentProject = useCallback(() => {
    setSaveIndicator('saving');
    const now = new Date().toISOString();
    let didSave = false;

    setProjects((prev) => {
      let nextProjects = prev;
      if (activeProjectId) {
        const exists = prev.some((p) => p.id === activeProjectId);
        if (exists) {
          nextProjects = prev.map((p) =>
            p.id === activeProjectId
              ? { ...p, name: projectName.trim() || 'New Project', tracks, updatedAt: now }
              : p
          );
        } else {
          nextProjects = [
            {
              id: activeProjectId,
              name: projectName.trim() || 'New Project',
              createdAt: now,
              updatedAt: now,
              tracks,
            },
            ...prev,
          ];
        }
      } else {
        const id = Date.now().toString();
        setActiveProjectId(id);
        nextProjects = [
          {
            id,
            name: projectName.trim() || 'New Project',
            createdAt: now,
            updatedAt: now,
            tracks,
          },
          ...prev,
        ];
      }

      saveProjects(nextProjects);
      didSave = true;
      return nextProjects;
    });

    if (didSave) {
      setSaveIndicator('saved');
      if (saveIndicatorTimeoutRef.current) {
        window.clearTimeout(saveIndicatorTimeoutRef.current);
      }
      saveIndicatorTimeoutRef.current = window.setTimeout(() => {
        setSaveIndicator('idle');
        saveIndicatorTimeoutRef.current = null;
      }, 1800);
    }
  }, [activeProjectId, projectName, tracks]);

  const buildTrack = (name?: string, color?: string): Track => {
    const resolvedName = name?.trim() || `Audio ${tracks.length + 1}`;
    const resolvedColor = color || TRACK_COLORS[tracks.length % TRACK_COLORS.length];
    const newTrack: Track = {
      id: Date.now().toString(),
      name: resolvedName,
      color: resolvedColor,
      volume: 100,
      muted: false,
      solo: false,
      clips: [],
      fx: {
        order: 'eq-comp-reverb',
        eq: { enabled: false, lowGain: 0, midGain: 0, highGain: 0 },
        compressor: { enabled: false, threshold: -24, ratio: 4 },
        reverb: { enabled: false, amount: 0.25 },
        delay: { enabled: false, time: 0.3, feedback: 0.3, wet: 0.3 },
        chorus: { enabled: false, rate: 1.5, depth: 0.5, wet: 0.3 },
        limiter: { enabled: false, ceiling: -1 },
      },
      automation: {},
    };
    return newTrack;
  };

  const addTrack = (name?: string, color?: string) => {
    const newTrack = buildTrack(name, color);
    setTracks((prev) => [...prev, newTrack]);
    setSelectedTrack(newTrack.id);
    setSelectedTrackIds([newTrack.id]);
  };

  const addTrackAndOpenFilePicker = () => {
    const newTrack = buildTrack();
    setTracks((prev) => [...prev, newTrack]);
    setSelectedTrack(newTrack.id);
    setSelectedTrackIds([newTrack.id]);
    openFilePickerForTrack(newTrack.id);
  };

  const quickCreateImportAndArmRecord = () => {
    const newTrack = buildTrack('Quick Take', 'bg-cyan-500');
    setTracks((prev) => [...prev, newTrack]);
    setSelectedTrack(newTrack.id);
    setSelectedTrackIds([newTrack.id]);
    setArmedTrackId(newTrack.id);
    openFilePickerForTrack(newTrack.id);
    notifyUser('Track created, armed, and ready to record', 'success');
  };

  const getActiveTrackIds = () => {
    if (selectedTrackIds.length > 0) return selectedTrackIds;
    if (selectedTrack) return [selectedTrack];
    return [];
  };

  const selectTrackFromList = (trackId: string, keepExisting: boolean) => {
    setTrackContextMenu(null);
    if (!keepExisting) {
      setSelectedTrack(trackId);
      setSelectedTrackIds([trackId]);
      return;
    }
    setSelectedTrack(trackId);
    setSelectedTrackIds((prev) => (prev.includes(trackId) ? prev.filter((id) => id !== trackId) : [...prev, trackId]));
  };

  const applyToTracks = (trackIds: string[], updater: (track: Track) => Track) => {
    if (trackIds.length === 0) return;
    const trackSet = new Set(trackIds);
    setTracks((prev) => prev.map((track) => (trackSet.has(track.id) ? updater(track) : track)));
  };

  const applyGroupMute = () => {
    const activeTrackIds = getActiveTrackIds();
    if (activeTrackIds.length === 0) return;
    const allMuted = activeTrackIds.every((id) => tracks.find((track) => track.id === id)?.muted);
    applyToTracks(activeTrackIds, (track) => ({ ...track, muted: !allMuted }));
  };

  const applyGroupSolo = () => {
    const activeTrackIds = getActiveTrackIds();
    if (activeTrackIds.length === 0) return;
    const allSolo = activeTrackIds.every((id) => tracks.find((track) => track.id === id)?.solo);
    applyToTracks(activeTrackIds, (track) => ({ ...track, solo: !allSolo }));
  };

  const applyGroupVolume = (volume: number) => {
    const activeTrackIds = getActiveTrackIds();
    applyToTracks(activeTrackIds, (track) => ({ ...track, volume }));
  };

  const duplicateTrack = (trackId: string) => {
    const sourceTrack = tracks.find((track) => track.id === trackId);
    if (!sourceTrack) return;
    const duplicate: Track = {
      ...JSON.parse(JSON.stringify(sourceTrack)),
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: `${sourceTrack.name} Copy`,
      clips: sourceTrack.clips.map((clip) => ({
        ...clip,
        id: `${clip.id}-copy-${Math.random().toString(16).slice(2)}`,
        trackId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      })),
    };
    duplicate.clips = duplicate.clips.map((clip) => ({ ...clip, trackId: duplicate.id }));
    setTracks((prev) => [...prev, duplicate]);
    setSelectedTrack(duplicate.id);
    setSelectedTrackIds([duplicate.id]);
  };

  const removeTrack = (trackId: string) => {
    if (tracks.length <= 1) {
      notifyUser('Нужна хотя бы одна дорожка в проекте', 'warning');
      return;
    }
    const track = tracks.find((t) => t.id === trackId);
    if (!track) return;
    const shouldRemove = confirm(`Удалить дорожку "${track.name}" вместе со всеми клипами?`);
    if (!shouldRemove) return;
    setTracks((prev) => prev.filter((t) => t.id !== trackId));
    setSelectedTrackIds((prev) => prev.filter((id) => id !== trackId));
    if (selectedTrack === trackId) {
      const nextTrack = tracks.find((t) => t.id !== trackId);
      setSelectedTrack(nextTrack?.id || null);
    }
    if (fxPanelTrackId === trackId) {
      setFxPanelTrackId(null);
      setFxPanelOpen(false);
    }
    setTrackContextMenu(null);
  };

  const removeTracks = (trackIds: string[]) => {
    if (trackIds.length === 0) return;
    if (tracks.length - trackIds.length < 1) {
      notifyUser('Нужна хотя бы одна дорожка в проекте', 'warning');
      return;
    }
    const shouldRemove = confirm(`Удалить ${trackIds.length} дорожек вместе со всеми клипами?`);
    if (!shouldRemove) return;
    const trackSet = new Set(trackIds);
    setTracks((prev) => prev.filter((track) => !trackSet.has(track.id)));
    setSelectedTrackIds([]);
    if (selectedTrack && trackSet.has(selectedTrack)) {
      const fallback = tracks.find((track) => !trackSet.has(track.id));
      setSelectedTrack(fallback?.id || null);
    }
    if (fxPanelTrackId && trackSet.has(fxPanelTrackId)) {
      setFxPanelTrackId(null);
      setFxPanelOpen(false);
    }
    setTrackContextMenu(null);
  };

  const renameTrack = (trackId: string, name: string) => {
    setTracks((prev) => prev.map((track) => (track.id === trackId ? { ...track, name } : track)));
  };

  const reorderTrackByDrop = (fromTrackId: string, toTrackId: string) => {
    if (fromTrackId === toTrackId) return;
    setTracks((prev) => {
      const fromIdx = prev.findIndex((track) => track.id === fromTrackId);
      const toIdx = prev.findIndex((track) => track.id === toTrackId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const next = [...prev];
      const [item] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, item);
      return next;
    });
  };

  const applySmartPresetToTracks = (trackIds: string[], presetKey: SmartTrackPresetKey) => {
    if (trackIds.length === 0) return;
    const preset = SMART_TRACK_PRESETS[presetKey];
    applyToTracks(trackIds, (track) => ({
      ...track,
      fx: {
        ...track.fx,
        ...preset.fx,
      },
    }));
    saveToHistory();
  };

  const toggleMute = (trackId: string) => {
    setTracks(tracks.map(track => 
      track.id === trackId ? { ...track, muted: !track.muted } : track
    ));
  };

  const toggleSolo = (trackId: string) => {
    setTracks(tracks.map(track => 
      track.id === trackId ? { ...track, solo: !track.solo } : track
    ));
  };

  const updateVolume = (trackId: string, volume: number) => {
    setTracks(tracks.map(track => 
      track.id === trackId ? { ...track, volume } : track
    ));
  };

  const openFilePickerForTrack = (trackId: string) => {
    pendingDropTrackIdRef.current = trackId;
    fileInputRef.current?.click();
  };

  
  const handleAudioFilesForTrack = async (trackId: string, files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const audioFiles = fileArray.filter((f) => f.type.startsWith('audio/'));
    if (audioFiles.length === 0) {
      notifyUser('Выберите аудиофайлы (MP3, WAV, M4A и т.д.)', 'warning');
      return;
    }

    const newClips: Clip[] = audioFiles.map((file) => {
      const url = URL.createObjectURL(file);
      return {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        trackId,
        startTime: currentTime,
        duration: 5,
        sourceOffset: 0,
        name: file.name,
        fileName: file.name,
        audioUrl: url,
        color: tracks.find((t) => t.id === trackId)?.color || 'bg-gray-500',
      };
    });

    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, clips: [...t.clips, ...newClips] } : t))
    );

    // Load audio durations
    await Promise.all(
      newClips.map(
        (clip) =>
          new Promise<void>((resolve) => {
            const audio = new Audio();
            audio.src = clip.audioUrl!;
            audio.onloadedmetadata = () => {
              if (Number.isFinite(audio.duration) && audio.duration > 0) {
                setTracks((prev) =>
                  prev.map((t) =>
                    t.id === trackId
                      ? {
                          ...t,
                          clips: t.clips.map((c) =>
                            c.id === clip.id ? { ...c, duration: audio.duration } : c
                          ),
                        }
                      : t
                  )
                );
              }
              resolve();
            };
            audio.onerror = () => {
              console.error('Failed to load audio:', clip.name);
              resolve();
            };
          })
      )
    );

    // Show success message
    const track = tracks.find(t => t.id === trackId);
    if (track) {
      console.log(`✅ Добавлено ${audioFiles.length} аудиофайлов на дорожку "${track.name}"`);
    }
  };

  const startRecording = async () => {
    const targetTrackId = armedTrackId || selectedTrack;
    if (!targetTrackId) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size) audioChunksRef.current?.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current!, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const clip: Clip = {
          id: Date.now().toString(),
          trackId: targetTrackId,
          startTime: currentTime,
          duration: 5,
          sourceOffset: 0,
          name: 'Recording',
          audioUrl: url,
          color: tracks.find((t) => t.id === targetTrackId)?.color || 'bg-gray-500',
        };
        setTracks((prev) =>
          prev.map((t) => (t.id === targetTrackId ? { ...t, clips: [...t.clips, clip] } : t))
        );
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Recording failed:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const seekTo = async (time: number) => {
    setCurrentTime(time);
    if (isPlaying) {
      pausePlayback();
      setIsPlaying(false);
      await new Promise(r => setTimeout(r, 50));
      const started = await startPlaybackFrom(time);
      setIsPlaying(started);
    }
  };

  // Undo/Redo system
  const saveToHistory = useCallback(() => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(tracks)));
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [tracks, history, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setTracks(JSON.parse(JSON.stringify(history[historyIndex - 1])));
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setTracks(JSON.parse(JSON.stringify(history[historyIndex + 1])));
    }
  }, [history, historyIndex]);

  // FX Presets
  const fxPresets = {
    default: {
      eq: { enabled: false, lowGain: 0, midGain: 0, highGain: 0 },
      compressor: { enabled: false, threshold: -24, ratio: 4 },
      reverb: { enabled: false, amount: 0.25 },
      delay: { enabled: false, time: 0.3, feedback: 0.3, wet: 0.3 },
      chorus: { enabled: false, rate: 1.5, depth: 0.5, wet: 0.3 },
      limiter: { enabled: false, ceiling: -1 },
    },
    warm: {
      eq: { enabled: true, lowGain: 4, midGain: 2, highGain: -1 },
      compressor: { enabled: true, threshold: -18, ratio: 3 },
      reverb: { enabled: true, amount: 0.3 },
      delay: { enabled: false, time: 0.3, feedback: 0.3, wet: 0.3 },
      chorus: { enabled: true, rate: 2, depth: 0.3, wet: 0.2 },
      limiter: { enabled: true, ceiling: -0.5 },
    },
    bright: {
      eq: { enabled: true, lowGain: -2, midGain: 3, highGain: 6 },
      compressor: { enabled: true, threshold: -20, ratio: 4 },
      reverb: { enabled: false, amount: 0.25 },
      delay: { enabled: true, time: 0.2, feedback: 0.2, wet: 0.25 },
      chorus: { enabled: false, rate: 1.5, depth: 0.5, wet: 0.3 },
      limiter: { enabled: true, ceiling: -1 },
    },
    radio: {
      eq: { enabled: true, lowGain: 6, midGain: 1, highGain: -3 },
      compressor: { enabled: true, threshold: -15, ratio: 6 },
      reverb: { enabled: true, amount: 0.4 },
      delay: { enabled: false, time: 0.3, feedback: 0.3, wet: 0.3 },
      chorus: { enabled: false, rate: 1.5, depth: 0.5, wet: 0.3 },
      limiter: { enabled: true, ceiling: -3 },
    },
  };

  const applyPreset = (trackId: string, presetName: keyof typeof fxPresets) => {
    const preset = fxPresets[presetName];
    setTracks(prev => prev.map(t => 
      t.id === trackId 
        ? { ...t, fx: { ...t.fx, ...preset } }
        : t
    ));
    saveToHistory();
  };

  // Metronome
  useEffect(() => {
    if (!metronomeEnabled || !isPlaying) return;
    
    const interval = 60000 / (bpm * 4); // 16th notes
    const tick = () => {
      const ctx = audioContextRef.current;
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 1000;
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);
    };
    
    const intervalId = setInterval(tick, interval);
    return () => clearInterval(intervalId);
  }, [metronomeEnabled, isPlaying, bpm]);

  // Spectrum Analyzer
  useEffect(() => {
    if (!showSpectrumAnalyzer || !spectrumAnalyzerRef.current || !spectrumCanvasRef.current) return;
    
    const canvas = spectrumCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const analyzer = spectrumAnalyzerRef.current;
    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
      requestAnimationFrame(draw);
      analyzer.getByteFrequencyData(dataArray);
      
      ctx.fillStyle = theme === 'dark' ? '#111827' : '#f3f4f6';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height * 0.8;
        
        const r = barHeight + 25 * (i / bufferLength);
        const g = 250 * (i / bufferLength);
        const b = 50;
        
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        
        x += barWidth + 1;
      }
    };
    
    draw();
  }, [showSpectrumAnalyzer, theme]);

  // VU Meters
  useEffect(() => {
    if (!showVUMeters || !vuMeterLeftRef.current || !vuMeterRightRef.current || !vuLeftCanvasRef.current || !vuRightCanvasRef.current) return;
    
    const drawVUMeter = (analyzer: AnalyserNode, canvas: HTMLCanvasElement, color: string) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const bufferLength = analyzer.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const draw = () => {
        requestAnimationFrame(draw);
        analyzer.getByteTimeDomainData(dataArray);
        
        ctx.fillStyle = theme === 'dark' ? '#111827' : '#f3f4f6';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / bufferLength);
        const db = 20 * Math.log10(rms);
        
        const normalized = Math.max(0, Math.min(1, (db + 60) / 60));
        const meterHeight = normalized * canvas.height * 0.8;
        
        // Draw gradient meter
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - meterHeight);
        gradient.addColorStop(0, color);
        gradient.addColorStop(0.7, color);
        gradient.addColorStop(1, theme === 'dark' ? '#ef4444' : '#dc2626');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, canvas.height - meterHeight, canvas.width, meterHeight);
      };
      
      draw();
    };
    
    drawVUMeter(vuMeterLeftRef.current!, vuLeftCanvasRef.current!, '#10b981');
    drawVUMeter(vuMeterRightRef.current!, vuRightCanvasRef.current!, '#3b82f6');
  }, [showVUMeters, theme]);

  // MIDI Support
  useEffect(() => {
    const initMidi = async () => {
      try {
        const midi = await (navigator as any).requestMIDIAccess();
        const inputs = midi.inputs.values();
        setMidiDevices(Array.from(inputs));
        
        inputs.forEach((input: any) => {
          input.onmidimessage = (event: any) => {
            console.log('MIDI:', event.data);
            // Handle MIDI messages here
          };
        });
      } catch (error) {
        console.log('MIDI not available');
      }
    };
    
    initMidi();
  }, []);

  // Save history on track changes
  useEffect(() => {
    if (tracks.length > 0) {
      saveToHistory();
    }
  }, [tracks]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyK') {
        e.preventDefault();
        setCommandPaletteOpen(true);
        setCommandSearch('');
        markHintSeen('commandPalette');
        return;
      }

      const target = e.target as HTMLElement | null;
      const isTypingTarget =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);
      if (isTypingTarget) return;

      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
        e.preventDefault();
        saveCurrentProject();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyY') {
        e.preventDefault();
        redo();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyD' && selectedTrack) {
        e.preventDefault();
        duplicateTrack(selectedTrack);
        return;
      }

      if (e.code === 'Escape') {
        e.preventDefault();
        if (fxPanelOpen) setFxPanelOpen(false);
        if (trackContextMenu) setTrackContextMenu(null);
        setSelectedClipId(null);
        return;
      }

      if (e.code === 'KeyR' && selectedTrack) {
        e.preventDefault();
        if (isRecording) {
          stopRecording();
        } else {
          startRecording();
        }
        return;
      }

      if (e.code === 'KeyN') {
        e.preventDefault();
        addTrack();
        return;
      }

      if ((e.code === 'Delete' || e.code === 'Backspace') && e.shiftKey && selectedTrack && !selectedClipId) {
        e.preventDefault();
        const activeTrackIds = getActiveTrackIds();
        if (activeTrackIds.length > 1) {
          removeTracks(activeTrackIds);
        } else {
          removeTrack(selectedTrack);
        }
        return;
      }

      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        e.preventDefault();
        const step = e.shiftKey ? 5 : 1;
        const next = e.code === 'ArrowRight' ? currentTime + step : currentTime - step;
        seekTo(Math.max(0, next));
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (isPlaying) {
          pausePlayback();
          setIsPlaying(false);
        } else {
          setIsPlaying(true);
          void startPlaybackFrom(currentTime).then((started) => {
            if (!started) setIsPlaying(false);
          });
        }
      }
      if ((e.code === 'Delete' || e.code === 'Backspace') && selectedClipId) {
        e.preventDefault();
        setTracks((prev) =>
          prev.map((t) => ({ ...t, clips: t.clips.filter((c) => c.id !== selectedClipId) }))
        );
        setSelectedClipId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, currentTime, selectedClipId, saveCurrentProject, redo, undo, selectedTrack, isRecording, fxPanelOpen, trackContextMenu, selectedTrackIds, markHintSeen]);

  useEffect(() => {
    return () => {
      if (saveIndicatorTimeoutRef.current) {
        window.clearTimeout(saveIndicatorTimeoutRef.current);
      }
      if (uiMessageTimeoutRef.current) {
        window.clearTimeout(uiMessageTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!activeProjectId) return;
    const timeoutId = window.setTimeout(() => {
      saveCurrentProject();
    }, 700);
    return () => window.clearTimeout(timeoutId);
  }, [activeProjectId, projectName, tracks, saveCurrentProject]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STUDIO_HINTS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<Record<HintKey, boolean>>;
      setSeenHints((prev) => ({ ...prev, ...parsed }));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STUDIO_HINTS_STORAGE_KEY, JSON.stringify(seenHints));
    } catch {
      // ignore
    }
  }, [seenHints]);

  useEffect(() => {
    if (seenHints.quickStart) {
      setShowQuickTips(false);
    }
  }, [seenHints.quickStart]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const dragging = draggingClipRef.current;
      if (!dragging) return;
      const dx = e.clientX - dragging.pointerStartX;
      const deltaSeconds = dx / pxPerSecond;
      const raw = dragging.clipStartTimeAtDragStart + deltaSeconds;
      const snapped = Math.round(raw / snapSeconds) * snapSeconds;
      const nextStart = Math.max(0, snapped);

      const lanes = Array.from(document.querySelectorAll('[data-track-id]')) as HTMLElement[];
      const hoveredLane = lanes.find((el) => {
        const rect = el.getBoundingClientRect();
        return e.clientY >= rect.top && e.clientY <= rect.bottom;
      });
      const targetTrackId = hoveredLane?.dataset.trackId || dragging.trackId;

      setTracks((prev) => {
        const next = prev.map((t) => ({ ...t, clips: [...t.clips] }));

        const fromTrack = next.find((t) => t.id === dragging.trackId);
        if (!fromTrack) return prev;
        const idx = fromTrack.clips.findIndex((c) => c.id === dragging.clipId);
        if (idx === -1) return prev;

        const [clip] = fromTrack.clips.splice(idx, 1);
        const updatedClip = { ...clip, startTime: nextStart, trackId: targetTrackId };

        const toTrack = next.find((t) => t.id === targetTrackId);
        if (!toTrack) {
          fromTrack.clips.splice(idx, 0, updatedClip);
          return next;
        }

        toTrack.clips.push(updatedClip);
        draggingClipRef.current = { ...dragging, trackId: targetTrackId };
        return next;
      });
    };

    const onUp = () => {
      draggingClipRef.current = null;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [pxPerSecond]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (trimRef.current) {
        const t = trimRef.current;
        const dx = e.clientX - t.pointerStartX;
        const deltaSeconds = dx / pxPerSecond;

        setTracks((prev) =>
          prev.map((track) => {
            if (track.id !== t.trackId) return track;
            return {
              ...track,
              clips: track.clips.map((c) => {
                if (c.id !== t.clipId) return c;
                const minDur = 0.25;
                if (t.edge === 'left') {
                  const newStart = Math.max(0, t.startTimeAtStart + deltaSeconds);
                  // Snap to grid or to other clip boundaries
                  const snapCandidates = [0];
                  tracks.forEach(tr => {
                    tr.clips.forEach(cl => {
                      if (cl.id !== c.id) {
                        snapCandidates.push(cl.startTime, cl.startTime + cl.duration);
                      }
                    });
                  });
                  const nearestSnap = snapCandidates.reduce((best, cur) => 
                    Math.abs(cur - newStart) < Math.abs(best - newStart) ? cur : best
                  );
                  const snappedStart = Math.abs(newStart - nearestSnap) < 0.1 ? nearestSnap : Math.round(newStart / snapSeconds) * snapSeconds;
                  const cut = snappedStart - t.startTimeAtStart;
                  const nextDur = Math.max(minDur, t.durationAtStart - cut);
                  const nextOffset = Math.max(0, t.offsetAtStart + cut);
                  // Limit by buffer duration
                  const buffer = clipBufferCacheRef.current.get(c.id);
                  const maxOffset = buffer ? buffer.duration - nextOffset : Infinity;
                  const limitedDur = Math.min(nextDur, maxOffset);
                  return { ...c, startTime: snappedStart, duration: limitedDur, sourceOffset: nextOffset };
                }

                const newDur = Math.max(minDur, t.durationAtStart + deltaSeconds);
                const snappedDur = Math.round(newDur / snapSeconds) * snapSeconds;
                const buffer = clipBufferCacheRef.current.get(c.id);
                const maxDur = buffer ? Math.max(minDur, buffer.duration - c.sourceOffset) : Infinity;
                const limitedDur = Math.min(snappedDur, maxDur);
                return { ...c, duration: limitedDur };
              }),
            };
          })
        );
        return;
      }
    };

    const onUp = () => {
      trimRef.current = null;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [pxPerSecond, snapSeconds]);

  const getEffectiveTrackVolume = (trackId: string) => {
    const track = tracks.find((t) => t.id === trackId);
    if (!track) return 0;
    const soloSet = new Set(soloedTrackIds);
    const hasSolo = soloSet.size > 0;
    const shouldBeAudible = hasSolo ? soloSet.has(trackId) : !track.muted;
    const volume = Math.max(0, Math.min(100, track.volume)) / 100;
    return shouldBeAudible ? volume : 0;
  };

  const getTrackGain = (trackId: string) => {
    ensureAudioGraph();
    const trackGain = trackGainRef.current;
    const ctx = audioContextRef.current!;
    const existing = trackGain.get(trackId);
    if (existing) return existing;
    const g = ctx.createGain();
    g.gain.value = getEffectiveTrackVolume(trackId);
    g.connect(masterGainRef.current!);
    trackGain.set(trackId, g);
    return g;
  };

  const getTrackFxChain = (trackId: string) => {
    ensureAudioGraph();
    const cached = trackFxNodesRef.current.get(trackId);
    if (cached) return cached;

    const ctx = audioContextRef.current!;
    const eqLow = ctx.createBiquadFilter();
    eqLow.type = 'lowshelf';
    eqLow.frequency.value = 320;

    const eqMid = ctx.createBiquadFilter();
    eqMid.type = 'peaking';
    eqMid.frequency.value = 1000;
    eqMid.Q.value = 0.5;

    const eqHigh = ctx.createBiquadFilter();
    eqHigh.type = 'highshelf';
    eqHigh.frequency.value = 3200;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -24;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;

    const reverb = ctx.createConvolver();
    reverb.buffer = reverbImpulseCacheRef.current!;

    const reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.25;

    const delay = ctx.createDelay(5);
    delay.delayTime.value = 0.3;

    const delayFeedback = ctx.createGain();
    delayFeedback.gain.value = 0.3;

    const delayWet = ctx.createGain();
    delayWet.gain.value = 0.3;

    const chorus = ctx.createStereoPanner();
    const chorusLfo = ctx.createOscillator();
    chorusLfo.frequency.value = 1.5;
    const chorusDepth = ctx.createGain();
    chorusDepth.gain.value = 0.5;
    const chorusWet = ctx.createGain();
    chorusWet.gain.value = 0.3;

    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -1;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.001;

    const chain = { eqLow, eqMid, eqHigh, compressor, reverb, reverbGain, delay, delayFeedback, delayWet, chorus, chorusLfo, chorusDepth, chorusWet, limiter };
    trackFxNodesRef.current.set(trackId, chain);

    // Start LFO
    chorusLfo.start();

    // Default routing will be applied dynamically based on order in applyTrackFx
    return chain;
  };

  const applyTrackFx = (trackId: string) => {
    const track = tracks.find((t) => t.id === trackId);
    if (!track) return;

    const chain = getTrackFxChain(trackId);
    const { eqLow, eqMid, eqHigh, compressor, reverb, reverbGain, delay, delayFeedback, delayWet, chorus, chorusLfo, chorusDepth, chorusWet, limiter } = chain;

    // Disconnect all to rebuild routing
    [eqLow, eqMid, eqHigh, compressor, reverb, reverbGain, delay, delayFeedback, delayWet, chorus, chorusDepth, chorusWet, limiter].forEach(node => {
      try { node.disconnect(); } catch {}
    });

    // Apply parameters
    eqLow.gain.value = track.fx.eq.enabled ? track.fx.eq.lowGain : 0;
    eqMid.gain.value = track.fx.eq.enabled ? track.fx.eq.midGain : 0;
    eqHigh.gain.value = track.fx.eq.enabled ? track.fx.eq.highGain : 0;

    compressor.threshold.value = track.fx.compressor.enabled ? track.fx.compressor.threshold : -24;
    compressor.ratio.value = track.fx.compressor.enabled ? track.fx.compressor.ratio : 1;

    reverbGain.gain.value = track.fx.reverb.enabled ? track.fx.reverb.amount : 0;

    delay.delayTime.value = track.fx.delay.enabled ? track.fx.delay.time : 0.001;
    delayFeedback.gain.value = track.fx.delay.enabled ? track.fx.delay.feedback : 0;
    delayWet.gain.value = track.fx.delay.enabled ? track.fx.delay.wet : 0;

    chorusLfo.frequency.value = track.fx.chorus.enabled ? track.fx.chorus.rate : 0;
    chorusDepth.gain.value = track.fx.chorus.enabled ? track.fx.chorus.depth : 0;
    chorusWet.gain.value = track.fx.chorus.enabled ? track.fx.chorus.wet : 0;

    limiter.threshold.value = track.fx.limiter.enabled ? track.fx.limiter.ceiling : 0;
    limiter.ratio.value = track.fx.limiter.enabled ? 20 : 1;

    // Build chain based on order
    const trackGainNode = getTrackGain(trackId);
    eqLow.connect(eqMid);
    eqMid.connect(eqHigh);
    if (track.fx.order === 'eq-comp-reverb') {
      eqHigh.connect(compressor);
      compressor.connect(trackGainNode);
    } else {
      eqHigh.connect(trackGainNode);
      compressor.connect(trackGainNode);
    }
    // Reverb (always after EQ/Comp)
    compressor.connect(reverb);
    reverb.connect(reverbGain);
    reverbGain.connect(trackGainNode);
    // Delay
    delay.connect(delayFeedback);
    delayFeedback.connect(delay);
    delay.connect(delayWet);
    delayWet.connect(trackGainNode);
    // Chorus (simplified via pan modulation)
    chorusLfo.connect(chorusDepth);
    chorusDepth.connect(chorus.pan);
    chorus.connect(chorusWet);
    chorusWet.connect(trackGainNode);
    // Limiter at end
    trackGainNode.connect(limiter);
    limiter.connect(masterGainRef.current!);
  };

  const updateMixerGains = () => {
    if (!audioContextRef.current) return;

    trackGainRef.current.forEach((gain, trackId) => {
      gain.gain.value = getEffectiveTrackVolume(trackId);
    });
    tracks.forEach((t) => applyTrackFx(t.id));
  };

  useEffect(() => {
    updateMixerGains();
  }, [tracks, soloedTrackIds]);

  const decodeClipBuffer = async (clip: Clip): Promise<AudioBuffer | null> => {
    if (!clip.audioUrl) return null;
    const cached = clipBufferCacheRef.current.get(clip.id);
    if (cached) return cached;

    ensureAudioGraph();
    const ctx = audioContextRef.current!;
    try {
      const res = await fetch(clip.audioUrl);
      const arrayBuffer = await res.arrayBuffer();
      const buffer = await ctx.decodeAudioData(arrayBuffer);
      clipBufferCacheRef.current.set(clip.id, buffer);

      if (!clipPeaksCacheRef.current.has(clip.id)) {
        const channel = buffer.getChannelData(0);
        const buckets = 200;
        const bucketSize = Math.max(1, Math.floor(channel.length / buckets));
        const peaks: number[] = [];
        for (let i = 0; i < buckets; i++) {
          const start = i * bucketSize;
          const end = Math.min(channel.length, start + bucketSize);
          let max = 0;
          for (let j = start; j < end; j++) {
            const v = Math.abs(channel[j]);
            if (v > max) max = v;
          }
          peaks.push(max);
        }
        clipPeaksCacheRef.current.set(clip.id, peaks);
      }

      return buffer;
    } catch {
      return null;
    }
  };

  const stopAllSources = () => {
    playingSourcesRef.current.forEach(({ source }) => {
      try {
        source.stop();
      } catch {
        // ignore
      }
    });
    playingSourcesRef.current = [];
  };


  
  const audioBufferToWav = (buffer: AudioBuffer) => {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1;
    const bitDepth = 16;

    const numFrames = buffer.length;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = numFrames * blockAlign;
    const bufferSize = 44 + dataSize;

    const arrayBuffer = new ArrayBuffer(bufferSize);
    const view = new DataView(arrayBuffer);

    let offset = 0;
    const writeString = (str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
      offset += str.length;
    };

    writeString('RIFF');
    view.setUint32(offset, 36 + dataSize, true);
    offset += 4;
    writeString('WAVE');
    writeString('fmt ');
    view.setUint32(offset, 16, true);
    offset += 4;
    view.setUint16(offset, format, true);
    offset += 2;
    view.setUint16(offset, numChannels, true);
    offset += 2;
    view.setUint32(offset, sampleRate, true);
    offset += 4;
    view.setUint32(offset, byteRate, true);
    offset += 4;
    view.setUint16(offset, blockAlign, true);
    offset += 2;
    view.setUint16(offset, bitDepth, true);
    offset += 2;
    writeString('data');
    view.setUint32(offset, dataSize, true);
    offset += 4;

    const channelData: Float32Array[] = [];
    for (let ch = 0; ch < numChannels; ch++) {
      channelData.push(buffer.getChannelData(ch));
    }

    for (let i = 0; i < numFrames; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const sample = Math.max(-1, Math.min(1, channelData[ch][i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
        offset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  };

  const exportWav = async () => {
    const clipEntries: Array<{ clip: Clip; trackId: string }> = [];
    tracks.forEach((t) => t.clips.forEach((c) => clipEntries.push({ clip: c, trackId: t.id })));
    if (clipEntries.length === 0) return;

    const maxEnd = clipEntries.reduce((acc, { clip }) => Math.max(acc, clip.startTime + clip.duration), 0);
    const duration = Math.max(1, Math.min(600, maxEnd + 1));
    const sampleRate = 44100;
    const offline = new OfflineAudioContext(2, Math.ceil(duration * sampleRate), sampleRate);
    const master = offline.createGain();
    master.gain.value = 1;
    master.connect(offline.destination);

    // Create reverb impulse for offline
    const reverbBuffer = createReverbImpulse(offline as any);

    const trackFxNodes = new Map<string, any>();
    const getOfflineTrackFxChain = (trackId: string) => {
      const cached = trackFxNodes.get(trackId);
      if (cached) return cached;

      const track = tracks.find((t) => t.id === trackId);
      if (!track) return null;

      const eqLow = offline.createBiquadFilter();
      eqLow.type = 'lowshelf';
      eqLow.frequency.value = 320;

      const eqMid = offline.createBiquadFilter();
      eqMid.type = 'peaking';
      eqMid.frequency.value = 1000;
      eqMid.Q.value = 0.5;

      const eqHigh = offline.createBiquadFilter();
      eqHigh.type = 'highshelf';
      eqHigh.frequency.value = 3200;

      const compressor = offline.createDynamicsCompressor();
      compressor.threshold.value = track.fx.compressor.enabled ? track.fx.compressor.threshold : -24;
      compressor.ratio.value = track.fx.compressor.enabled ? track.fx.compressor.ratio : 1;

      const reverb = offline.createConvolver();
      reverb.buffer = reverbBuffer;

      const reverbGain = offline.createGain();
      reverbGain.gain.value = track.fx.reverb.enabled ? track.fx.reverb.amount : 0;

      const delay = offline.createDelay(5);
      delay.delayTime.value = track.fx.delay.enabled ? track.fx.delay.time : 0.001;

      const delayFeedback = offline.createGain();
      delayFeedback.gain.value = track.fx.delay.enabled ? track.fx.delay.feedback : 0;

      const delayWet = offline.createGain();
      delayWet.gain.value = track.fx.delay.enabled ? track.fx.delay.wet : 0;

      const chorus = offline.createStereoPanner();
      const chorusLfo = offline.createOscillator();
      chorusLfo.frequency.value = track.fx.chorus.enabled ? track.fx.chorus.rate : 0;
      const chorusDepth = offline.createGain();
      chorusDepth.gain.value = track.fx.chorus.enabled ? track.fx.chorus.depth : 0;
      const chorusWet = offline.createGain();
      chorusWet.gain.value = track.fx.chorus.enabled ? track.fx.chorus.wet : 0;

      const limiter = offline.createDynamicsCompressor();
      limiter.threshold.value = track.fx.limiter.enabled ? track.fx.limiter.ceiling : 0;
      limiter.ratio.value = track.fx.limiter.enabled ? 20 : 1;

      const trackGain = offline.createGain();
      trackGain.gain.value = getEffectiveTrackVolume(trackId);

      // Build chain
      eqLow.connect(eqMid);
      eqMid.connect(eqHigh);
      if (track.fx.order === 'eq-comp-reverb') {
        eqHigh.connect(compressor);
        compressor.connect(trackGain);
      } else {
        eqHigh.connect(trackGain);
        compressor.connect(trackGain);
      }
      compressor.connect(reverb);
      reverb.connect(reverbGain);
      reverbGain.connect(trackGain);
      delay.connect(delayFeedback);
      delayFeedback.connect(delay);
      delay.connect(delayWet);
      delayWet.connect(trackGain);
      chorusLfo.connect(chorusDepth);
      chorusDepth.connect(chorus.pan);
      chorus.connect(chorusWet);
      chorusWet.connect(trackGain);
      trackGain.connect(limiter);
      limiter.connect(master);

      chorusLfo.start();

      const chain = { eqLow, eqMid, eqHigh, compressor, reverb, reverbGain, delay, delayFeedback, delayWet, chorus, chorusLfo, chorusDepth, chorusWet, limiter, trackGain };
      trackFxNodes.set(trackId, chain);
      return chain;
    };

    await Promise.all(
      clipEntries.map(async ({ clip, trackId }) => {
        if (!clip.audioUrl) return;
        try {
          const res = await fetch(clip.audioUrl);
          const arr = await res.arrayBuffer();
          const decoded = await offline.decodeAudioData(arr);
          const src = offline.createBufferSource();
          src.buffer = decoded;
          const chain = getOfflineTrackFxChain(trackId);
          if (chain) {
            src.connect(chain.eqLow);
          } else {
            const gain = offline.createGain();
            gain.gain.value = getEffectiveTrackVolume(trackId);
            gain.connect(master);
            src.connect(gain);
          }
          src.start(clip.startTime + clip.sourceOffset, clip.sourceOffset, clip.duration);
        } catch {
          // ignore
        }
      })
    );

    const rendered = await offline.startRendering();
    const wavBlob = audioBufferToWav(rendered);

    const url = URL.createObjectURL(wavBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName || 'project'}.wav`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const startPlaybackFrom = async (fromTime: number): Promise<boolean> => {
    console.log('🎵 Starting playback from:', fromTime);
    
    ensureAudioGraph();
    await audioContextRef.current!.resume();
    updateMixerGains();
    stopAllSources();
    playStartCtxTimeRef.current = audioContextRef.current!.currentTime;
    playStartProjectTimeRef.current = fromTime;

    // Get all clips that should play
    const clipEntries: Array<{ clip: Clip; trackId: string }> = [];
    tracks.forEach((t) => t.clips.forEach((c) => {
      if (c.startTime + c.duration > fromTime) {
        clipEntries.push({ clip: c, trackId: t.id });
      }
    }));

    if (clipEntries.length === 0) {
      console.log('⚠️ No clips to play');
      return false;
    }

    console.log('📋 Found clips to play:', clipEntries.length);

    // Decode all audio buffers first
    const decodedClips = new Map<string, AudioBuffer>();
    await Promise.all(
      clipEntries.map(async ({ clip }) => {
        if (!clip.audioUrl) {
          console.log('⚠️ No audio URL for clip:', clip.name);
          return;
        }
        const buffer = await decodeClipBuffer(clip);
        if (buffer) {
          decodedClips.set(clip.id, buffer);
        } else {
          console.log('⚠️ Failed to decode clip:', clip.name);
        }
      })
    );

    if (decodedClips.size === 0) {
      console.log('⚠️ No decodable clips to play');
      return false;
    }

    // Start playing clips
    decodedClips.forEach((buffer, clipId) => {
      const clipEntry = clipEntries.find(e => e.clip.id === clipId);
      if (!clipEntry) return;
      
      const { clip, trackId } = clipEntry;
      
      const clipStart = clip.startTime;
      const clipEnd = clipStart + clip.duration;
      const playStart = Math.max(clipStart, fromTime);
      const playEnd = Math.min(clipEnd, fromTime + 30); // Max 30s lookahead

      if (playStart < playEnd) {
        try {
          const source = audioContextRef.current!.createBufferSource();
          source.buffer = buffer;
          
          // Apply FX chain
          const chain = getTrackFxChain(trackId);
          source.connect(chain.eqLow);
          
          const offset = clip.sourceOffset + (playStart - clipStart);
          const duration = playEnd - playStart;
          
          source.start(
            playStart - fromTime + audioContextRef.current!.currentTime,
            offset,
            duration
          );
          
          playingSourcesRef.current.push({ source, clipId });
          console.log('✅ Playing clip:', clip.name, 'from', playStart, 'duration', duration);
        } catch (error) {
          console.error('❌ Error playing clip:', clip.name, error);
        }
      }
    });

    const tick = () => {
      if (!audioContextRef.current) return;
      const currentCtxTime = audioContextRef.current.currentTime;
      const currentProjectTime = playStartProjectTimeRef.current + (currentCtxTime - playStartCtxTimeRef.current);
      setCurrentTime(currentProjectTime);

      // Loop logic
      if (loopEnabled && currentProjectTime >= loopEnd) {
        console.log('🔄 Looping back to:', loopStart);
        seekTo(loopStart);
        return;
      }

      // Stop if no more clips
      const hasMoreClips = tracks.some((t) =>
        t.clips.some((c) => c.startTime + c.duration > currentProjectTime)
      );
      if (!hasMoreClips) {
        console.log('⏹️ No more clips, stopping playback');
        pausePlayback();
        setIsPlaying(false);
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    console.log('▶️ Playback started successfully');
    return true;
  };

  const pausePlayback = () => {
    console.log('⏸️ Pausing playback');
    if (!audioContextRef.current) return;
    const t = playStartProjectTimeRef.current + (audioContextRef.current.currentTime - playStartCtxTimeRef.current);
    setCurrentTime(t);
    stopAllSources();
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const stopPlayback = () => {
    console.log('⏹️ Stopping playback');
    stopAllSources();
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setCurrentTime(0);
  };

  const commandActions = useMemo(
    () => [
      { id: 'create-import-arm', label: 'Quick Start: Create + Import + Arm Record', run: quickCreateImportAndArmRecord },
      { id: 'add-track', label: 'Add Empty Track', run: () => addTrack() },
      { id: 'add-track-audio', label: 'Add Track + Audio', run: addTrackAndOpenFilePicker },
      {
        id: 'play-from-start',
        label: 'Play From Start',
        run: async () => {
          await seekTo(0);
          const started = await startPlaybackFrom(0);
          setIsPlaying(started);
        },
      },
      {
        id: 'toggle-play',
        label: isPlaying ? 'Pause Playback' : 'Start Playback',
        run: async () => {
          if (isPlaying) {
            pausePlayback();
            setIsPlaying(false);
          } else {
            const started = await startPlaybackFrom(currentTime);
            setIsPlaying(started);
          }
        },
      },
      {
        id: 'toggle-record',
        label: isRecording ? 'Stop Recording' : 'Start Recording',
        run: () => (isRecording ? stopRecording() : startRecording()),
      },
      { id: 'save-project', label: 'Save Project', run: saveCurrentProject },
      { id: 'export-wav', label: 'Export WAV', run: exportWav },
      { id: 'open-project-picker', label: 'Open Project Chooser', run: () => setShowProjectChooser(true) },
    ],
    [isPlaying, isRecording, currentTime, saveCurrentProject]
  );

  const filteredCommandActions = useMemo(() => {
    const query = commandSearch.trim().toLowerCase();
    if (!query) return commandActions;
    return commandActions.filter((action) => action.label.toLowerCase().includes(query));
  }, [commandActions, commandSearch]);

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {uiMessage && (
        <div className={`fixed top-4 right-4 z-[70] px-3 py-2 rounded-lg shadow-xl text-sm ${
          uiMessage.tone === 'success'
            ? 'bg-green-600/90 text-white'
            : uiMessage.tone === 'warning'
              ? 'bg-yellow-600/90 text-black'
              : 'bg-gray-800/95 text-gray-100 border border-gray-600'
        }`}>
          {uiMessage.text}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        multiple
        className="hidden"
        onChange={async (e) => {
          let trackId = pendingDropTrackIdRef.current || selectedTrack;
          if (!trackId) {
            const autoTrack = buildTrack();
            setTracks((prev) => [...prev, autoTrack]);
            setSelectedTrack(autoTrack.id);
            setSelectedTrackIds([autoTrack.id]);
            trackId = autoTrack.id;
          }
          if (!e.target.files) return;
          console.log('📁 Загружаю файлы:', e.target.files.length, 'файлов');
          await handleAudioFilesForTrack(trackId, e.target.files);
          e.target.value = '';
        }}
      />

      {showProjectChooser && (
        <div className="absolute inset-0 z-50 bg-gray-900/95 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-3xl bg-gray-800 border border-gray-700 rounded-2xl p-6">
            <div className="flex items-center justify-between gap-4 mb-6">
              <h1 className="text-2xl font-bold text-white">Студия</h1>
              {activeProjectId && (
                <button
                  onClick={() => setShowProjectChooser(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white"
                >
                  Назад
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-900/40 border border-gray-700 rounded-xl p-4">
                <h2 className="text-lg font-semibold text-white mb-3">Создать новый проект</h2>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-purple-500 focus:outline-none mb-3"
                  placeholder="Название проекта"
                />
                <button
                  onClick={createProject}
                  className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-white"
                >
                  Создать
                </button>
              </div>

              <div className="bg-gray-900/40 border border-gray-700 rounded-xl p-4">
                <h2 className="text-lg font-semibold text-white mb-3">Открыть существующий</h2>
                {projects.length === 0 ? (
                  <div className="text-gray-400 text-sm">Пока нет проектов</div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-auto pr-1">
                    {projects.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => openProject(p.id)}
                        className="w-full text-left px-3 py-2 rounded bg-gray-700/60 hover:bg-gray-700 border border-gray-600"
                      >
                        <div className="text-white font-medium">{p.name}</div>
                        <div className="text-gray-400 text-xs">{new Date(p.updatedAt).toLocaleString('ru-RU')}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header with Visual Feedback */}
      <div className={`bg-gradient-to-r ${
        theme === 'dark' 
          ? 'from-gray-900 via-gray-800 to-gray-900' 
          : 'from-gray-100 via-white to-gray-200'
      } backdrop-blur border-b border-purple-500/20 p-4 shadow-xl`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Music className="text-purple-400" size={24} />
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className={`px-3 py-1.5 rounded-lg border focus:outline-none transition-all ${
                  theme === 'dark' 
                    ? 'bg-gray-700/70 text-white border-gray-600 focus:border-purple-500' 
                    : 'bg-white text-gray-900 border-gray-300 focus:border-purple-500'
                }`}
              />
            </div>
            
            {/* Visual Feedback */}
            <div className="flex items-center gap-3">
              <div className={`px-2 py-1 rounded-md text-xs font-medium ${
                theme === 'dark' ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-700'
              }`}>
                MIDI: {midiDevices.length > 0 ? `${midiDevices.length} input(s)` : 'Not connected'}
              </div>

              <div className={`px-2 py-1 rounded-md text-xs font-medium ${
                saveIndicator === 'saved'
                  ? 'bg-green-600/20 text-green-300'
                  : saveIndicator === 'saving'
                    ? 'bg-yellow-600/20 text-yellow-300'
                    : theme === 'dark'
                      ? 'bg-gray-700 text-gray-300'
                      : 'bg-gray-200 text-gray-700'
              }`}>
                {saveIndicator === 'saved' ? 'Saved' : saveIndicator === 'saving' ? 'Saving...' : 'Idle'}
              </div>

              {isPlaying && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-600/20 animate-pulse">
                  <Activity className="text-red-400" size={16} />
                  <span className="text-red-400 text-sm font-medium">PLAYING</span>
                </div>
              )}
              
              <div className="flex items-center gap-3 bg-gray-800/50 px-3 py-1.5 rounded-lg">
                <Clock className="text-purple-400" size={16} />
                <input
                  type="number"
                  min={40}
                  max={300}
                  value={bpm}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value, 10);
                    setBpm(Number.isFinite(parsed) ? clampBpm(parsed) : 120);
                  }}
                  className={`w-16 bg-transparent text-sm focus:outline-none ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}
                />
                <span className="text-purple-300 text-sm">BPM</span>
                <span className="text-gray-400 text-sm">4/4</span>
              </div>
              
              <button
                onClick={() => setMetronomeEnabled(!metronomeEnabled)}
                className={`p-2 rounded-lg transition-all ${
                  metronomeEnabled 
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                title="Metronome"
              >
                <Headphones size={16} />
              </button>
              
              {/* Theme Switcher */}
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className={`p-2 rounded-lg transition-all ${
                  theme === 'dark' 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              >
                {theme === 'dark' ? <Monitor size={16} /> : <Smartphone size={16} />}
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={undo}
              disabled={historyIndex <= 0}
              className="p-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 rounded text-white transition-all"
              title="Undo"
            >
              <Undo2 size={16} />
            </button>
            <button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="p-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 rounded text-white transition-all"
              title="Redo"
            >
              <Redo2 size={16} />
            </button>
            
            {/* Visual Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowSpectrumAnalyzer(!showSpectrumAnalyzer)}
                className={`p-2 rounded-lg transition-all ${
                  showSpectrumAnalyzer 
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 shadow-lg shadow-blue-500/25' 
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
                title="Spectrum Analyzer"
              >
                <BarChart3 size={16} />
              </button>
              <button
                onClick={() => setShowVUMeters(!showVUMeters)}
                className={`p-2 rounded-lg transition-all ${
                  showVUMeters 
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 shadow-lg shadow-green-500/25' 
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
                title="VU Meters"
              >
                <Activity size={16} />
              </button>
              <button
                onClick={() => setShowPluginRack(!showPluginRack)}
                className={`p-2 rounded-lg transition-all ${
                  showPluginRack 
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/25' 
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
                title="Plugin Rack"
              >
                <Settings size={16} />
              </button>
            </div>
            
            <button
              onClick={() => setLoopEnabled((v) => !v)}
              className={`px-3 py-2 rounded-lg text-white text-sm transition-all ${
                loopEnabled 
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg shadow-purple-500/25' 
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
              title="Loop"
            >
              <Zap size={14} className="inline mr-1" />
              Loop
            </button>
            <button
              onClick={() => setShowAutomationCurves(!showAutomationCurves)}
              className={`px-3 py-2 rounded-lg text-white text-sm transition-all ${
                showAutomationCurves 
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 shadow-lg shadow-blue-500/25' 
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
              title="Automation Curves"
            >
              <Sliders size={14} className="inline mr-1" />
              Curves
            </button>
            <button
              onClick={() => setShowProjectChooser(true)}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm transition-all"
            >
              Проект
            </button>
            <button
              onClick={saveCurrentProject}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-all"
              title="Save project (Ctrl/Cmd + S)"
            >
              <Save size={16} />
            </button>
            <button
              onClick={exportWav}
              className="p-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-lg text-white transition-all shadow-lg shadow-green-500/25"
              title="Export WAV"
            >
              <Download size={16} />
            </button>
            <div className="relative">
              {!seenHints.commandPalette && (
                <div className="absolute -top-11 right-0 text-[11px] whitespace-nowrap bg-indigo-600 text-white px-2 py-1 rounded-lg shadow-lg z-20">
                  Open command palette for instant actions
                </div>
              )}
              <button
                onClick={() => {
                  setCommandPaletteOpen(true);
                  setCommandSearch('');
                  markHintSeen('commandPalette');
                }}
                className="px-3 py-2 bg-indigo-700 hover:bg-indigo-600 rounded-lg text-white text-xs transition-all"
                title="Command Palette (Ctrl/Cmd + K)"
              >
                Ctrl/Cmd + K
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Visual Feedback Panel */}
      <div className={`flex items-center justify-center p-2 ${
        theme === 'dark' ? 'bg-gray-800/60' : 'bg-gray-200/60'
      }`}>
        {/* Spectrum Analyzer */}
        {showSpectrumAnalyzer && (
          <div className="flex items-center gap-2">
            <canvas
              ref={spectrumCanvasRef}
              width={300}
              height={60}
              className="rounded border border-gray-600"
            />
            <div className="text-xs text-gray-400">Spectrum</div>
          </div>
        )}
        
        {/* VU Meters */}
        {showVUMeters && (
          <div className="flex items-center gap-2">
            <canvas
              ref={vuLeftCanvasRef}
              width={40}
              height={60}
              className="rounded border border-gray-600"
            />
            <canvas
              ref={vuRightCanvasRef}
              width={40}
              height={60}
              className="rounded border border-gray-600"
            />
            <div className="text-xs text-gray-400">L/R</div>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="flex-1 flex overflow-hidden">
        <div className="w-72 bg-gray-800/60 backdrop-blur border-r border-gray-700 overflow-auto">
          <div className="sticky top-0 z-10 bg-gray-800/80 backdrop-blur border-b border-gray-700 p-3">
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-400">Tracks</div>
              <div className="text-xs text-purple-400">{tracks.length} total</div>
            </div>
            <div className="mt-2 relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={trackSearch}
                onChange={(e) => setTrackSearch(e.target.value)}
                placeholder="Search tracks..."
                className="w-full bg-gray-700/80 text-white pl-8 pr-3 py-1.5 rounded-lg text-xs border border-gray-600 focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>

          <div
            className="p-2 space-y-2"
            onClick={(e) => {
              if (e.target !== e.currentTarget) return;
              setSelectedTrackIds([]);
              setTrackContextMenu(null);
            }}
          >
            {showQuickTips && (
              <div className="rounded-xl border border-blue-600/40 bg-blue-900/10 p-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[11px] text-blue-300 font-medium">Quick start</div>
                    <div className="text-[11px] text-gray-300 mt-1">1) Add Track + Audio</div>
                    <div className="text-[11px] text-gray-300">2) Space to Play/Pause</div>
                    <div className="text-[11px] text-gray-300">3) Ctrl/Cmd+Click to multiselect</div>
                  </div>
                  <button
                    onClick={() => {
                      setShowQuickTips(false);
                      markHintSeen('quickStart');
                    }}
                    className="text-[10px] px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-200"
                  >
                    Hide
                  </button>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-gray-700 bg-gray-900/30 p-2">
              <div className="text-[11px] text-gray-400 mb-2 flex items-center gap-1">
                <Sparkles size={12} />
                Quick Add
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {TRACK_TEMPLATES.map((template) => (
                  <button
                    key={template.label}
                    onClick={() => addTrack(template.label, template.color)}
                    className="px-2 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-xs"
                  >
                    + {template.label}
                  </button>
                ))}
              </div>
            </div>

            {selectedTrackIds.length > 0 && (
              <div className="rounded-xl border border-purple-600/40 bg-purple-900/10 p-2 space-y-2">
                <div className="text-[11px] text-purple-300">Selected: {selectedTrackIds.length}</div>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={applyGroupMute}
                    className="px-2 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-xs"
                  >
                    Mute
                  </button>
                  <button
                    onClick={applyGroupSolo}
                    className="px-2 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-xs"
                  >
                    Solo
                  </button>
                  <button
                    onClick={() => removeTracks(selectedTrackIds)}
                    className="px-2 py-1.5 rounded-lg bg-red-700/80 hover:bg-red-700 text-white text-xs"
                  >
                    Delete
                  </button>
                </div>
                <button
                  onClick={() => {
                    const firstTrackId = selectedTrackIds[0];
                    if (!firstTrackId) return;
                    setFxPanelTrackId(firstTrackId);
                    setFxPanelOpen(true);
                  }}
                  className="w-full px-2 py-1.5 rounded-lg bg-purple-700/70 hover:bg-purple-700 text-white text-xs"
                >
                  Open FX for first selected
                </button>
                <div className="flex items-center gap-2">
                  <Volume2 size={12} className="text-gray-400" />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={groupVolumeValue}
                    onChange={(e) => applyGroupVolume(parseInt(e.target.value, 10))}
                    className="flex-1"
                  />
                  <span className="text-[11px] text-gray-300 w-8 text-right">{groupVolumeValue}</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(Object.keys(SMART_TRACK_PRESETS) as SmartTrackPresetKey[]).map((presetKey) => (
                    <button
                      key={presetKey}
                      onClick={() => applySmartPresetToTracks(selectedTrackIds, presetKey)}
                      className="px-2 py-1.5 rounded-lg bg-indigo-700/70 hover:bg-indigo-700 text-white text-[11px]"
                    >
                      {SMART_TRACK_PRESETS[presetKey].label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {filteredTracks.map((track) => {
              const trackIndex = tracks.findIndex((t) => t.id === track.id);
              const isTrackSelected = selectedTrackIds.includes(track.id);
              return (
              <div
                key={track.id}
                className={`rounded-xl border transition-all cursor-pointer ${
                  isTrackSelected ? 'border-purple-500/60 bg-gray-900/40 shadow-lg shadow-purple-500/20' : 'border-gray-700 bg-gray-900/20 hover:border-gray-600 hover:bg-gray-900/30'
                } p-3`}
                onClick={(e) => selectTrackFromList(track.id, e.ctrlKey || e.metaKey)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (!selectedTrackIds.includes(track.id)) {
                    setSelectedTrack(track.id);
                    setSelectedTrackIds([track.id]);
                  }
                  setTrackContextMenu({ x: e.clientX, y: e.clientY, trackId: track.id });
                }}
                draggable
                onDragStart={(e) => {
                  setDraggingTrackId(track.id);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!draggingTrackId) return;
                  reorderTrackByDrop(draggingTrackId, track.id);
                  setDraggingTrackId(null);
                }}
                onDragEnd={() => setDraggingTrackId(null)}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <GripVertical size={12} className="text-gray-500 shrink-0" />
                    <div className={`w-2.5 h-2.5 rounded-full ${track.color}`} />
                    <input
                      value={track.name}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => renameTrack(track.id, e.target.value)}
                      onBlur={(e) => {
                        if (e.target.value.trim()) return;
                        renameTrack(track.id, `Audio ${trackIndex + 1}`);
                      }}
                      className="bg-transparent text-white text-sm font-medium truncate focus:outline-none focus:ring-1 focus:ring-purple-500 rounded px-1 w-full"
                    />
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setArmedTrackId((prev) => (prev === track.id ? null : track.id));
                        setSelectedTrack(track.id);
                        setSelectedTrackIds([track.id]);
                      }}
                      className={`px-2 py-1 rounded text-[10px] ${
                        armedTrackId === track.id ? 'bg-fuchsia-600 text-white' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                      }`}
                    >
                      ARM
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMute(track.id);
                      }}
                      className={`px-2 py-1 rounded text-xs ${
                        track.muted ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                      }`}
                    >
                      M
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSolo(track.id);
                      }}
                      className={`px-2 py-1 rounded text-xs ${
                        track.solo ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                      }`}
                    >
                      S
                    </button>
                  </div>
                </div>

                <div className="mb-2 flex items-center justify-between text-[11px] text-gray-400">
                  <span>{track.clips.length} clip(s)</span>
                  <span>
                    {track.clips.reduce((sum, clip) => sum + clip.duration, 0).toFixed(1)}s total
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Volume2 size={14} className="text-gray-400" />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={track.volume}
                    onChange={(e) => updateVolume(track.id, parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <div className="text-gray-400 text-xs w-10 text-right">{track.volume}%</div>
                </div>

                <div className="mt-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTrack(track.id);
                      openFilePickerForTrack(track.id);
                    }}
                    className="w-full px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-xs font-medium transition-all shadow-lg shadow-purple-500/25"
                  >
                    <Plus size={12} className="inline mr-1" />
                    Add Audio
                  </button>
                  <div className="mt-1 text-center text-gray-400 text-xs">
                    or drag & drop files here
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-4 gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateTrack(track.id);
                    }}
                    className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white text-xs col-span-2"
                    title="Duplicate track"
                  >
                    <Copy size={12} className="inline" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTrack(track.id);
                    }}
                    className="px-2 py-1 rounded bg-red-700/80 hover:bg-red-700 text-white text-xs"
                    title="Delete track"
                  >
                    <Trash2 size={12} className="inline" />
                  </button>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFxPanelOpen(true);
                    setFxPanelTrackId(track.id);
                  }}
                  className="mt-1 w-full px-3 py-1.5 rounded-lg bg-purple-600/70 hover:bg-purple-600 text-white text-xs"
                >
                  FX
                </button>
              </div>
            )})}

            <button
              onClick={() => addTrack()}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-xl text-white text-sm"
            >
              <Plus size={16} />
              Add Track
            </button>
            <div className="relative">
              {!seenHints.addTrackAudio && (
                <div className="absolute -top-11 left-0 right-0 text-[11px] bg-indigo-600 text-white px-2 py-1 rounded-lg shadow-lg z-20">
                  Fastest start: one click to create track and import audio
                </div>
              )}
              <button
                onClick={() => {
                  addTrackAndOpenFilePicker();
                  markHintSeen('addTrackAudio');
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-white text-sm"
              >
                <Plus size={16} />
                Add Track + Audio
              </button>
            </div>
            <button
              onClick={async () => {
                await seekTo(0);
                const started = await startPlaybackFrom(0);
                setIsPlaying(started);
                if (!started) {
                  notifyUser('Добавь хотя бы один аудиоклип для старта', 'warning');
                }
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 rounded-xl text-white text-sm"
            >
              <Play size={16} />
              Play From Start
            </button>
            <button
              onClick={() => {
                quickCreateImportAndArmRecord();
                markHintSeen('quickStart');
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700 rounded-xl text-white text-sm font-semibold shadow-lg"
            >
              <Sparkles size={16} />
              Create + Import + Arm Record
            </button>
            <div className="mt-1 text-center text-gray-400 text-xs">
              Drag cards to reorder. Ctrl/Cmd+Click for multiselect. Right-click for actions.
            </div>
            {filteredTracks.length === 0 && (
              <div className="text-center text-xs text-gray-400 py-3">No tracks found for "{trackSearch}"</div>
            )}
          </div>
        </div>
        <div
          ref={timelineRef}
          className="relative min-h-full bg-gray-900"
          onMouseDown={async (e) => {
            if (e.button !== 0) return;
            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
            const x = e.clientX - rect.left;
            await seekTo(x / pxPerSecond);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (!dragOverTrackId && selectedTrack) {
              e.currentTarget.classList.add('bg-purple-500/10');
            }
          }}
          onDragLeave={(e) => {
            e.currentTarget.classList.remove('bg-purple-500/10');
          }}
          onDrop={async (e) => {
            e.preventDefault();
            e.currentTarget.classList.remove('bg-purple-500/10');
            if (selectedTrack) {
              console.log('🎵 Drop на таймлайн, выбранная дорожка:', selectedTrack);
              await handleAudioFilesForTrack(selectedTrack, e.dataTransfer.files);
            } else {
              const autoTrack = buildTrack(`Audio ${tracks.length + 1}`, TRACK_COLORS[tracks.length % TRACK_COLORS.length]);
              setTracks((prev) => [...prev, autoTrack]);
              setSelectedTrack(autoTrack.id);
              setSelectedTrackIds([autoTrack.id]);
              await handleAudioFilesForTrack(autoTrack.id, e.dataTransfer.files);
            }
          }}
        >
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '80px 100%, 100% 80px' }} />

          <div
            className="absolute top-0 bottom-0 w-0.5 bg-green-400/90 z-10"
            style={{ left: currentTime * pxPerSecond }}
          />

          {/* Timeline ruler */}
          <div className="sticky top-0 z-20 bg-gray-800/80 backdrop-blur border-b border-gray-700">
            <div className="relative h-10">
              <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '80px 100%' }} />
              <div
                className="relative h-full"
                onMouseDown={async (e) => {
                  const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const time = x / pxPerSecond;

                  if (e.shiftKey) {
                    setIsLoopSelecting(true);
                    loopSelectRef.current = { startX: x };
                    setLoopStart(time);
                    setLoopEnd(time);
                    return;
                  }

                  await seekTo(time);
                }}
                onMouseMove={(e) => {
                  if (!isLoopSelecting || !loopSelectRef.current) return;
                  const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const a = loopSelectRef.current.startX;
                  const start = Math.min(a, x) / pxPerSecond;
                  const end = Math.max(a, x) / pxPerSecond;
                  setLoopStart(Math.max(0, start));
                  setLoopEnd(Math.max(0, end));
                }}
                onMouseUp={() => {
                  if (!isLoopSelecting) return;
                  setIsLoopSelecting(false);
                  loopSelectRef.current = null;
                }}
              >
                <div className="absolute inset-0" style={{ width: timelineWidthPx }} />
                <div className="absolute inset-0 flex items-center px-4 text-xs text-gray-400" style={{ width: timelineWidthPx }}>
                  {Array.from({ length: Math.ceil(projectDurationSeconds / 5) + 1 }).map((_, i) => (
                    <div key={i} style={{ width: pxPerSecond * 5 }}>
                      {formatTime(i * 5)}
                    </div>
                  ))}
                </div>

                {loopEnabled && loopEnd > loopStart && (
                  <>
                    <div
                      className="absolute top-0 bottom-0 bg-purple-500/20 border border-purple-400/30"
                      style={{ left: loopStart * pxPerSecond, width: (loopEnd - loopStart) * pxPerSecond }}
                    />
                    <div
                      className="absolute top-0 bottom-0 w-2 bg-purple-400/60 cursor-ew-resize"
                      style={{ left: loopStart * pxPerSecond - 4 }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        const startX = e.clientX;
                        const startLoop = loopStart;
                        const onMove = (e: MouseEvent) => {
                          const dx = e.clientX - startX;
                          const delta = dx / pxPerSecond;
                          const newStart = Math.max(0, Math.min(loopEnd - 0.5, startLoop + delta));
                          const snapped = Math.round(newStart / snapSeconds) * snapSeconds;
                          setLoopStart(snapped);
                        };
                        const onUp = () => {
                          window.removeEventListener('mousemove', onMove);
                          window.removeEventListener('mouseup', onUp);
                        };
                        window.addEventListener('mousemove', onMove);
                        window.addEventListener('mouseup', onUp);
                      }}
                    />
                    <div
                      className="absolute top-0 bottom-0 w-2 bg-purple-400/60 cursor-ew-resize"
                      style={{ left: loopEnd * pxPerSecond - 4 }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        const startX = e.clientX;
                        const startLoop = loopEnd;
                        const onMove = (e: MouseEvent) => {
                          const dx = e.clientX - startX;
                          const delta = dx / pxPerSecond;
                          const newEnd = Math.max(loopStart + 0.5, startLoop + delta);
                          const snapped = Math.round(newEnd / snapSeconds) * snapSeconds;
                          setLoopEnd(snapped);
                        };
                        const onUp = () => {
                          window.removeEventListener('mousemove', onMove);
                          window.removeEventListener('mouseup', onUp);
                        };
                        window.addEventListener('mousemove', onMove);
                        window.addEventListener('mouseup', onUp);
                      }}
                    />
                  </>
                )}
              </div>
            </div>

            {tracks.map((track) => (
              <div
                key={track.id}
                data-track-id={track.id}
                className={`h-20 border-b border-gray-800 relative transition-all ${
                  dragOverTrackId === track.id
                    ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/50'
                    : selectedTrackIds.includes(track.id)
                      ? 'bg-gray-800/30'
                      : 'hover:bg-gray-800/20'
                }`}
                onClick={(e) => selectTrackFromList(track.id, e.ctrlKey || e.metaKey)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverTrackId(track.id);
                }}
                onDragLeave={() => {
                  setDragOverTrackId((prev) => (prev === track.id ? null : prev));
                }}
                onDrop={async (e) => {
                  e.preventDefault();
                  setDragOverTrackId(null);
                  console.log('🎵 Drop на дорожку:', track.name, 'файлов:', e.dataTransfer.files.length);
                  await handleAudioFilesForTrack(track.id, e.dataTransfer.files);
                }}
              >
                {dragOverTrackId === track.id && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-purple-600 text-white px-3 py-1 rounded-lg text-xs font-medium shadow-lg">
                      Drop audio files here
                    </div>
                  </div>
                )}
                {/* Automation Curves */}
                {showAutomationCurves && (
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Volume Automation */}
                    {(() => {
                      const points = automationPoints.get(`${track.id}:volume`) || [];
                      if (points.length < 2) return null;
                      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                      svg.setAttribute('class', 'absolute inset-0');
                      svg.style.width = '100%';
                      svg.style.height = '100%';
                      
                      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                      const d = points.map((point, i) => {
                        const x = point.time * pxPerSecond;
                        const y = 60 - (point.value / 100) * 40; // Convert volume (0-100) to Y coordinate
                        return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
                      }).join(' ');
                      path.setAttribute('d', d);
                      path.setAttribute('stroke', '#8b5cf6');
                      path.setAttribute('stroke-width', '2');
                      path.setAttribute('fill', 'none');
                      path.setAttribute('opacity', '0.8');
                      
                      svg.appendChild(path);
                      return (
                        <div dangerouslySetInnerHTML={{ __html: svg.outerHTML }} />
                      );
                    })()}
                    
                    {/* EQ Automation */}
                    {(() => {
                      const eqLowPoints = automationPoints.get(`${track.id}:eq.low`) || [];
                      if (eqLowPoints.length < 2) return null;
                      return (
                        <svg className="absolute inset-0" style={{ width: '100%', height: '100%' }}>
                          <path
                            d={eqLowPoints.map((point, i) => {
                              const x = point.time * pxPerSecond;
                              const y = 40 - ((point.value + 20) / 40) * 30; // Convert dB (-20 to +20) to Y coordinate
                              return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
                            }).join(' ')}
                            stroke="#f59e0b"
                            strokeWidth="2"
                            fill="none"
                            opacity="0.6"
                          />
                        </svg>
                      );
                    })()}
                  </div>
                )}

                {track.clips.map((clip) => (
                  <div
                    key={clip.id}
                    className={`absolute top-2 bottom-2 ${clip.color} rounded-lg px-2 flex items-center justify-between gap-2 text-white text-xs font-medium shadow-lg ring-1 transition-all hover:shadow-xl ${
                      selectedClipId === clip.id ? 'ring-white/70 scale-105' : 'ring-black/20'
                    }`}
                    style={{
                      left: clip.startTime * pxPerSecond,
                      width: Math.max(60, clip.duration * pxPerSecond),
                      minWidth: 60,
                    }}
                    title={clip.name}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setSelectedClipId(clip.id);
                      draggingClipRef.current = {
                        clipId: clip.id,
                        trackId: track.id,
                        pointerStartX: e.clientX,
                        pointerStartY: e.clientY,
                        clipStartTimeAtDragStart: clip.startTime,
                      };
                    }}
                  >
                    <div
                      className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize bg-black/20 hover:bg-black/30 rounded-l-lg transition-colors"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        trimRef.current = {
                          clipId: clip.id,
                          trackId: track.id,
                          pointerStartX: e.clientX,
                          startTimeAtStart: clip.startTime,
                          durationAtStart: clip.duration,
                          offsetAtStart: clip.sourceOffset,
                          edge: 'left',
                        };
                      }}
                    />
                    <div
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize bg-black/20 hover:bg-black/30 rounded-r-lg transition-colors"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        trimRef.current = {
                          clipId: clip.id,
                          trackId: track.id,
                          pointerStartX: e.clientX,
                          startTimeAtStart: clip.startTime,
                          durationAtStart: clip.duration,
                          offsetAtStart: clip.sourceOffset,
                          edge: 'right',
                        };
                      }}
                    />

                    <div className="absolute inset-0 opacity-35 pointer-events-none" style={{ padding: 6 }}>
                      <canvas
                        width={Math.min(900, Math.max(240, Math.floor(Math.max(60, clip.duration * pxPerSecond))))}
                        height={40}
                        style={{ width: '100%', height: '100%' }}
                        ref={(el) => {
                          if (!el) return;
                          const ctx = el.getContext('2d');
                          if (!ctx) return;
                          ctx.clearRect(0, 0, el.width, el.height);
                          ctx.fillStyle = 'rgba(255,255,255,0.85)';
                          const mid = el.height / 2;

                          const buffer = clipBufferCacheRef.current.get(clip.id);
                          if (!buffer) {
                            const peaks = clipPeaksCacheRef.current.get(clip.id);
                            if (!peaks) return;
                            for (let i = 0; i < peaks.length; i++) {
                              const x = (i / peaks.length) * el.width;
                              const h = peaks[i] * mid;
                              ctx.fillRect(x, mid - h, 1, h * 2);
                            }
                            return;
                          }

                          const channel = buffer.getChannelData(0);
                          const buckets = Math.max(60, Math.min(1000, el.width));
                          const bucketSize = Math.max(1, Math.floor(channel.length / buckets));
                          for (let i = 0; i < buckets; i++) {
                            const start = i * bucketSize;
                            const end = Math.min(channel.length, start + bucketSize);
                            let max = 0;
                            for (let j = start; j < end; j++) {
                              const v = Math.abs(channel[j]);
                              if (v > max) max = v;
                            }
                            const x = (i / buckets) * el.width;
                            const h = max * mid;
                            ctx.fillRect(x, mid - h, 1, h * 2);
                          }
                        }}
                      />
                    </div>

                    <div className="truncate pr-2">{clip.name}</div>
                    <div className="opacity-80 font-mono text-[10px]">{clip.startTime.toFixed(2)}s</div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* FX Panel */}
          {fxPanelOpen && fxPanelTrackId && (() => {
            const track = tracks.find((t) => t.id === fxPanelTrackId);
            if (!track) return null;
            return (
              <div className="w-80 bg-gray-800/60 backdrop-blur border-l border-gray-700 overflow-auto">
                <div className="sticky top-0 z-10 bg-gray-800/80 backdrop-blur border-b border-gray-700 p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-400">FX: {track.name}</div>
                    <button
                      onClick={() => setFxPanelOpen(false)}
                      className="text-gray-400 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="p-4 space-y-6">
                  {/* FX Order */}
                  <div className="bg-gray-900/40 border border-gray-700 rounded-xl p-3">
                    <div className="text-white text-sm font-medium mb-2">FX Order</div>
                    <select
                      value={track.fx.order}
                      onChange={(e) => {
                        const order = e.target.value as FxOrder;
                        setTracks((prev) =>
                          prev.map((t) =>
                            t.id === track.id
                              ? { ...t, fx: { ...t.fx, order } }
                              : t
                          )
                        );
                      }}
                      className="w-full bg-gray-700 text-white px-2 py-1 rounded text-xs"
                    >
                      <option value="eq-comp-reverb">EQ → Compressor → Reverb</option>
                      <option value="comp-eq-reverb">Compressor → EQ → Reverb</option>
                    </select>
                  </div>

                  {/* EQ */}
                  <div className="bg-gray-900/40 border border-gray-700 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-white text-sm font-medium">EQ</div>
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={track.fx.eq.enabled}
                          onChange={(e) => {
                            const enabled = e.target.checked;
                            setTracks((prev) =>
                              prev.map((t) =>
                                t.id === track.id
                                  ? {
                                      ...t,
                                      fx: { ...t.fx, eq: { ...t.fx.eq, enabled } },
                                    }
                                  : t
                              )
                            );
                          }}
                        />
                        <span className="text-gray-400">On</span>
                      </label>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">Low</span>
                        <input
                          type="range"
                          min="-20"
                          max="20"
                          step="1"
                          disabled={!track.fx.eq.enabled}
                          value={track.fx.eq.lowGain}
                          onChange={(e) => {
                            const lowGain = parseFloat(e.target.value);
                            setTracks((prev) =>
                              prev.map((t) =>
                                t.id === track.id
                                  ? {
                                      ...t,
                                      fx: { ...t.fx, eq: { ...t.fx.eq, lowGain } },
                                  }
                                : t
                              )
                            );
                          }}
                          className="w-24"
                        />
                        <span className="text-gray-400 w-10 text-right">{track.fx.eq.lowGain} dB</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">Mid</span>
                        <input
                          type="range"
                          min="-20"
                          max="20"
                          step="1"
                          disabled={!track.fx.eq.enabled}
                          value={track.fx.eq.midGain}
                          onChange={(e) => {
                            const midGain = parseFloat(e.target.value);
                            setTracks((prev) =>
                              prev.map((t) =>
                                t.id === track.id
                                  ? {
                                      ...t,
                                      fx: { ...t.fx, eq: { ...t.fx.eq, midGain } },
                                  }
                                : t
                              )
                            );
                          }}
                          className="w-24"
                        />
                        <span className="text-gray-400 w-10 text-right">{track.fx.eq.midGain} dB</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">High</span>
                        <input
                          type="range"
                          min="-20"
                          max="20"
                          step="1"
                          disabled={!track.fx.eq.enabled}
                          value={track.fx.eq.highGain}
                          onChange={(e) => {
                            const highGain = parseFloat(e.target.value);
                            setTracks((prev) =>
                              prev.map((t) =>
                                t.id === track.id
                                  ? {
                                      ...t,
                                      fx: { ...t.fx, eq: { ...t.fx.eq, highGain } },
                                  }
                                : t
                              )
                            );
                          }}
                          className="w-24"
                        />
                        <span className="text-gray-400 w-10 text-right">{track.fx.eq.highGain} dB</span>
                      </div>
                    </div>
                  </div>

                  {/* Compressor */}
                  <div className="bg-gray-900/40 border border-gray-700 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-white text-sm font-medium">Compressor</div>
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={track.fx.compressor.enabled}
                          onChange={(e) => {
                            const enabled = e.target.checked;
                            setTracks((prev) =>
                              prev.map((t) =>
                                t.id === track.id
                                  ? {
                                      ...t,
                                      fx: { ...t.fx, compressor: { ...t.fx.compressor, enabled } },
                                  }
                                : t
                              )
                            );
                          }}
                        />
                        <span className="text-gray-400">On</span>
                      </label>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">Threshold</span>
                        <input
                          type="range"
                          min="-60"
                          max="0"
                          step="1"
                          disabled={!track.fx.compressor.enabled}
                          value={track.fx.compressor.threshold}
                          onChange={(e) => {
                            const threshold = parseFloat(e.target.value);
                            setTracks((prev) =>
                              prev.map((t) =>
                                t.id === track.id
                                  ? {
                                      ...t,
                                      fx: { ...t.fx, compressor: { ...t.fx.compressor, threshold } },
                                  }
                                : t
                              )
                            );
                          }}
                          className="w-24"
                        />
                        <span className="text-gray-400 w-10 text-right">{track.fx.compressor.threshold} dB</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">Ratio</span>
                        <input
                          type="range"
                          min="1"
                          max="20"
                          step="0.5"
                          disabled={!track.fx.compressor.enabled}
                          value={track.fx.compressor.ratio}
                          onChange={(e) => {
                            const ratio = parseFloat(e.target.value);
                            setTracks((prev) =>
                              prev.map((t) =>
                                t.id === track.id
                                  ? {
                                      ...t,
                                      fx: { ...t.fx, compressor: { ...t.fx.compressor, ratio } },
                                  }
                                : t
                              )
                            );
                          }}
                          className="w-24"
                        />
                        <span className="text-gray-400 w-10 text-right">{track.fx.compressor.ratio}:1</span>
                      </div>
                    </div>
                  </div>

                  {/* Reverb */}
                  <div className="bg-gray-900/40 border border-gray-700 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-white text-sm font-medium">Reverb</div>
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={track.fx.reverb.enabled}
                          onChange={(e) => {
                            const enabled = e.target.checked;
                            setTracks((prev) =>
                              prev.map((t) =>
                                t.id === track.id
                                  ? {
                                      ...t,
                                      fx: { ...t.fx, reverb: { ...t.fx.reverb, enabled } },
                                  }
                                : t
                              )
                            );
                          }}
                        />
                        <span className="text-gray-400">On</span>
                      </label>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Amount</span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        disabled={!track.fx.reverb.enabled}
                        value={track.fx.reverb.amount}
                        onChange={(e) => {
                          const amount = parseFloat(e.target.value);
                          setTracks((prev) =>
                            prev.map((t) =>
                              t.id === track.id
                                ? {
                                      ...t,
                                      fx: { ...t.fx, reverb: { ...t.fx.reverb, amount } },
                                  }
                                : t
                              )
                            );
                        }}
                        className="w-24"
                      />
                      <span className="text-gray-400 w-10 text-right">{(track.fx.reverb.amount * 100).toFixed(0)}%</span>
                    </div>
                  </div>

                  {/* Delay */}
                  <div className="bg-gray-900/40 border border-gray-700 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-white text-sm font-medium">Delay</div>
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={track.fx.delay.enabled}
                          onChange={(e) => {
                            const enabled = e.target.checked;
                            setTracks((prev) =>
                              prev.map((t) =>
                                t.id === track.id
                                  ? {
                                      ...t,
                                      fx: { ...t.fx, delay: { ...t.fx.delay, enabled } },
                                  }
                                : t
                              )
                            );
                          }}
                        />
                        <span className="text-gray-400">On</span>
                      </label>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">Time</span>
                        <input
                          type="range"
                          min="0.01"
                          max="2"
                          step="0.01"
                          disabled={!track.fx.delay.enabled}
                          value={track.fx.delay.time}
                          onChange={(e) => {
                            const time = parseFloat(e.target.value);
                            setTracks((prev) =>
                              prev.map((t) =>
                                t.id === track.id
                                  ? {
                                      ...t,
                                      fx: { ...t.fx, delay: { ...t.fx.delay, time } },
                                  }
                                : t
                              )
                            );
                          }}
                          className="w-24"
                        />
                        <span className="text-gray-400 w-10 text-right">{track.fx.delay.time.toFixed(2)}s</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">Feedback</span>
                        <input
                          type="range"
                          min="0"
                          max="0.95"
                          step="0.05"
                          disabled={!track.fx.delay.enabled}
                          value={track.fx.delay.feedback}
                          onChange={(e) => {
                            const feedback = parseFloat(e.target.value);
                            setTracks((prev) =>
                              prev.map((t) =>
                                t.id === track.id
                                  ? {
                                      ...t,
                                      fx: { ...t.fx, delay: { ...t.fx.delay, feedback } },
                                  }
                                : t
                              )
                            );
                          }}
                          className="w-24"
                        />
                        <span className="text-gray-400 w-10 text-right">{(track.fx.delay.feedback * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">Wet</span>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          disabled={!track.fx.delay.enabled}
                          value={track.fx.delay.wet}
                          onChange={(e) => {
                            const wet = parseFloat(e.target.value);
                            setTracks((prev) =>
                              prev.map((t) =>
                                t.id === track.id
                                  ? {
                                      ...t,
                                      fx: { ...t.fx, delay: { ...t.fx.delay, wet } },
                                  }
                                : t
                              )
                            );
                          }}
                          className="w-24"
                        />
                        <span className="text-gray-400 w-10 text-right">{(track.fx.delay.wet * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Chorus */}
                  <div className="bg-gray-900/40 border border-gray-700 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-white text-sm font-medium">Chorus</div>
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={track.fx.chorus.enabled}
                          onChange={(e) => {
                            const enabled = e.target.checked;
                            setTracks((prev) =>
                              prev.map((t) =>
                                t.id === track.id
                                  ? {
                                      ...t,
                                      fx: { ...t.fx, chorus: { ...t.fx.chorus, enabled } },
                                  }
                                : t
                              )
                            );
                          }}
                        />
                        <span className="text-gray-400">On</span>
                      </label>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">Rate</span>
                        <input
                          type="range"
                          min="0.1"
                          max="10"
                          step="0.1"
                          disabled={!track.fx.chorus.enabled}
                          value={track.fx.chorus.rate}
                          onChange={(e) => {
                            const rate = parseFloat(e.target.value);
                            setTracks((prev) =>
                              prev.map((t) =>
                                t.id === track.id
                                  ? {
                                      ...t,
                                      fx: { ...t.fx, chorus: { ...t.fx.chorus, rate } },
                                  }
                                : t
                              )
                            );
                          }}
                          className="w-24"
                        />
                        <span className="text-gray-400 w-10 text-right">{track.fx.chorus.rate.toFixed(1)}Hz</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">Depth</span>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          disabled={!track.fx.chorus.enabled}
                          value={track.fx.chorus.depth}
                          onChange={(e) => {
                            const depth = parseFloat(e.target.value);
                            setTracks((prev) =>
                              prev.map((t) =>
                                t.id === track.id
                                  ? {
                                      ...t,
                                      fx: { ...t.fx, chorus: { ...t.fx.chorus, depth } },
                                  }
                                : t
                              )
                            );
                          }}
                          className="w-24"
                        />
                        <span className="text-gray-400 w-10 text-right">{(track.fx.chorus.depth * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">Wet</span>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          disabled={!track.fx.chorus.enabled}
                          value={track.fx.chorus.wet}
                          onChange={(e) => {
                            const wet = parseFloat(e.target.value);
                            setTracks((prev) =>
                              prev.map((t) =>
                                t.id === track.id
                                  ? {
                                      ...t,
                                      fx: { ...t.fx, chorus: { ...t.fx.chorus, wet } },
                                  }
                                : t
                              )
                            );
                          }}
                          className="w-24"
                        />
                        <span className="text-gray-400 w-10 text-right">{(track.fx.chorus.wet * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Limiter */}
                  <div className="bg-gray-900/40 border border-gray-700 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-white text-sm font-medium">Limiter</div>
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={track.fx.limiter.enabled}
                          onChange={(e) => {
                            const enabled = e.target.checked;
                            setTracks((prev) =>
                              prev.map((t) =>
                                t.id === track.id
                                  ? {
                                      ...t,
                                      fx: { ...t.fx, limiter: { ...t.fx.limiter, enabled } },
                                  }
                                : t
                              )
                            );
                          }}
                        />
                        <span className="text-gray-400">On</span>
                      </label>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Ceiling</span>
                      <input
                        type="range"
                        min="-12"
                        max="0"
                        step="0.5"
                        disabled={!track.fx.limiter.enabled}
                        value={track.fx.limiter.ceiling}
                        onChange={(e) => {
                          const ceiling = parseFloat(e.target.value);
                          setTracks((prev) =>
                            prev.map((t) =>
                              t.id === track.id
                                ? {
                                      ...t,
                                      fx: { ...t.fx, limiter: { ...t.fx.limiter, ceiling } },
                                  }
                                : t
                              )
                            );
                          }}
                        className="w-24"
                      />
                      <span className="text-gray-400 w-10 text-right">{track.fx.limiter.ceiling} dB</span>
                    </div>
                  </div>

                  {/* FX Presets */}
                  <div className="bg-gray-900/40 border border-gray-700 rounded-xl p-3">
                    <div className="text-white text-sm font-medium mb-2">FX Presets</div>
                    <select
                      value={selectedPreset}
                      onChange={(e) => {
                        const preset = e.target.value as keyof typeof fxPresets;
                        setSelectedPreset(preset);
                        applyPreset(track.id, preset);
                      }}
                      className="w-full bg-gray-700 text-white px-2 py-1 rounded text-xs mb-2"
                    >
                      <option value="default">Default</option>
                      <option value="warm">Warm</option>
                      <option value="bright">Bright</option>
                      <option value="radio">Radio</option>
                    </select>
                  </div>

                  {/* Automation */}
                  <div className="bg-gray-900/40 border border-gray-700 rounded-xl p-3">
                    <div className="text-white text-sm font-medium mb-2">Automation</div>
                    <div className="space-y-1">
                      <button
                        className={`w-full px-2 py-1 rounded text-xs transition-all ${
                          automationRecording === 'volume'
                            ? 'bg-red-600 text-white shadow-lg shadow-red-500/25'
                            : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                        }`}
                        onClick={() => setAutomationRecording(automationRecording === 'volume' ? null : 'volume')}
                      >
                        {automationRecording === 'volume' ? 'Recording Volume...' : 'Record Volume'}
                      </button>
                      <button
                        className={`w-full px-2 py-1 rounded text-xs transition-all ${
                          automationRecording?.startsWith('eq.')
                            ? 'bg-red-600 text-white shadow-lg shadow-red-500/25'
                            : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                        }`}
                        onClick={() => setAutomationRecording(automationRecording === 'eq.low' ? null : 'eq.low')}
                      >
                        {automationRecording === 'eq.low' ? 'Recording EQ Low...' : 'Record EQ Low'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {trackContextMenu && (
        <div
          className="fixed inset-0 z-50"
          onClick={() => setTrackContextMenu(null)}
          onContextMenu={(e) => {
            e.preventDefault();
            setTrackContextMenu(null);
          }}
        >
          <div
            className="absolute min-w-56 rounded-xl border border-gray-700 bg-gray-900/95 shadow-2xl p-2 space-y-1"
            style={{ left: trackContextMenu.x, top: trackContextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="w-full text-left px-2 py-1.5 rounded hover:bg-gray-700 text-sm text-gray-100"
              onClick={() => {
                setSelectedTrack(trackContextMenu.trackId);
                setSelectedTrackIds([trackContextMenu.trackId]);
                setTrackContextMenu(null);
              }}
            >
              Select only this track
            </button>
            <button
              className="w-full text-left px-2 py-1.5 rounded hover:bg-gray-700 text-sm text-gray-100"
              onClick={() => {
                setSelectedTrack(trackContextMenu.trackId);
                setSelectedTrackIds((prev) =>
                  prev.includes(trackContextMenu.trackId)
                    ? prev.filter((id) => id !== trackContextMenu.trackId)
                    : [...prev, trackContextMenu.trackId]
                );
                setTrackContextMenu(null);
              }}
            >
              Toggle in multiselect
            </button>
            <button
              className="w-full text-left px-2 py-1.5 rounded hover:bg-gray-700 text-sm text-gray-100"
              onClick={() => {
                duplicateTrack(trackContextMenu.trackId);
                setTrackContextMenu(null);
              }}
            >
              Duplicate track
            </button>
            <button
              className="w-full text-left px-2 py-1.5 rounded hover:bg-gray-700 text-sm text-gray-100"
              onClick={() => {
                setFxPanelOpen(true);
                setFxPanelTrackId(trackContextMenu.trackId);
                setTrackContextMenu(null);
              }}
            >
              Open FX panel
            </button>
            <div className="h-px bg-gray-700 my-1" />
            {(Object.keys(SMART_TRACK_PRESETS) as SmartTrackPresetKey[]).map((presetKey) => (
              <button
                key={presetKey}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-indigo-700/60 text-sm text-gray-100"
                onClick={() => {
                  const targets = selectedTrackIds.includes(trackContextMenu.trackId)
                    ? selectedTrackIds
                    : [trackContextMenu.trackId];
                  applySmartPresetToTracks(targets, presetKey);
                  setTrackContextMenu(null);
                }}
              >
                Apply preset: {SMART_TRACK_PRESETS[presetKey].label}
              </button>
            ))}
            <div className="h-px bg-gray-700 my-1" />
            <button
              className="w-full text-left px-2 py-1.5 rounded hover:bg-red-700/80 text-sm text-red-200"
              onClick={() => {
                removeTrack(trackContextMenu.trackId);
                setTrackContextMenu(null);
              }}
            >
              Delete track
            </button>
          </div>
        </div>
      )}

      {commandPaletteOpen && (
        <div
          className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm flex items-start justify-center pt-24 px-4"
          onClick={() => setCommandPaletteOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 border-b border-gray-700">
              <input
                autoFocus
                value={commandSearch}
                onChange={(e) => setCommandSearch(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === 'Escape') {
                    setCommandPaletteOpen(false);
                    return;
                  }
                  if (e.key === 'Enter' && filteredCommandActions[0]) {
                    const action = filteredCommandActions[0];
                    await action.run();
                    setCommandPaletteOpen(false);
                    setCommandSearch('');
                  }
                }}
                placeholder="Type a command... (e.g., add track, save, export)"
                className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg text-sm border border-gray-600 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div className="max-h-80 overflow-auto p-2 space-y-1">
              {filteredCommandActions.length === 0 ? (
                <div className="text-sm text-gray-400 px-2 py-3">No matching command</div>
              ) : (
                filteredCommandActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={async () => {
                      await action.run();
                      setCommandPaletteOpen(false);
                      setCommandSearch('');
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-700 text-sm text-gray-100"
                  >
                    {action.label}
                  </button>
                ))
              )}
            </div>
            <div className="px-3 py-2 border-t border-gray-700 text-[11px] text-gray-400">
              Enter to run first command · Esc to close
            </div>
          </div>
        </div>
      )}

      {/* Transport */}
      <div className="bg-gray-800/80 backdrop-blur border-t border-gray-700 p-4">
        <div className="flex justify-center items-center gap-4">
          <div className="relative">
            {!seenHints.playButton && (
              <div className="absolute -top-11 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] bg-green-600 text-white px-2 py-1 rounded-lg shadow-lg">
                Press Space or click Play to start
              </div>
            )}
            <button
              onClick={async () => {
                markHintSeen('playButton');
                if (isPlaying) {
                  pausePlayback();
                  setIsPlaying(false);
                  return;
                }
                setIsPlaying(true);
                const started = await startPlaybackFrom(currentTime);
                if (!started) {
                  setIsPlaying(false);
                  notifyUser('Не удалось начать воспроизведение: добавьте аудио-клип или проверьте формат файла.', 'warning');
                }
              }}
              className="p-3 bg-green-600 hover:bg-green-700 rounded-full text-white"
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
          </div>
          
          <button
            onClick={() => {
              pausePlayback();
              setIsPlaying(false);
              stopPlayback();
            }}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-white"
          >
            <Square size={16} />
          </button>
          
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={!selectedTrack && !armedTrackId}
            className={`p-3 rounded-full text-white ${
              isRecording 
                ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
                : (selectedTrack || armedTrackId)
                  ? 'bg-gray-700 hover:bg-gray-600' 
                  : 'bg-gray-600 cursor-not-allowed opacity-50'
            }`}
            title={armedTrackId ? `Armed track: ${tracks.find((t) => t.id === armedTrackId)?.name || 'unknown'}` : 'Record'}
          >
            <Mic size={20} />
          </button>
          
          <div className="flex items-center gap-2 bg-gray-700 px-3 py-2 rounded">
            <Circle size={12} className={isRecording ? 'text-red-500' : 'text-gray-400'} />
            <span className="text-white font-mono text-sm">{formatTime(currentTime)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-800/80 backdrop-blur border-t border-gray-700 p-3">
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-xs">🎧 Drag & drop audio files anywhere</span>
          <span className="text-gray-400 text-xs">🔍 Zoom: Ctrl + Scroll</span>
          <span className="text-gray-400 text-xs">▶️ Space: Play/Pause</span>
          <span className="text-gray-400 text-xs">🗑️ Delete: Remove Clip</span>
          <span className="text-gray-400 text-xs">💾 Ctrl/Cmd + S: Save</span>
          <span className="text-gray-400 text-xs">⏺️ R: Record on selected track</span>
          <span className="text-gray-400 text-xs">↔️ ←/→: Seek, Shift + ←/→: ±5s</span>
          <span className="text-gray-400 text-xs">⎋ Esc: Close panels / clear clip select</span>
          <span className="text-gray-400 text-xs">🔄 Shift + drag on ruler: Set Loop</span>
        </div>
      </div>
    </div>
  );
}
