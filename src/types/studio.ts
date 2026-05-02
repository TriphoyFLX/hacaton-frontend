export interface Track {
  id: string;
  name: string;
  color: string;
  volume: number;
  pan: number;
  muted: boolean;
  solo: boolean;
  clips: Clip[];
  fx: TrackFx;
  automation: TrackAutomation;
  mixerChannel: number;
}

export interface Clip {
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

export interface PatternClip {
  id: string;
  patternId: string;
  trackId: string;
  startTime: number;
  stepCount: number;
  color: string;
  name: string;
}

export interface PatternClipboard {
  name: string;
  tracks: { [trackId: string]: boolean[] };
  stepCount: number;
}

export interface FxPlugin {
  enabled: boolean;
}

export interface EqFx extends FxPlugin {
  lowGain: number;
  midGain: number;
  highGain: number;
}

export interface CompressorFx extends FxPlugin {
  threshold: number;
  ratio: number;
}

export interface ReverbFx extends FxPlugin {
  amount: number;
}

export interface DelayFx extends FxPlugin {
  time: number;
  feedback: number;
  wet: number;
}

export interface ChorusFx extends FxPlugin {
  rate: number;
  depth: number;
  wet: number;
}

export interface LimiterFx extends FxPlugin {
  ceiling: number;
}

export type FxOrder = 'eq-comp-reverb' | 'comp-eq-reverb';

export interface TrackFx {
  order: FxOrder;
  eq: EqFx;
  compressor: CompressorFx;
  reverb: ReverbFx;
  delay: DelayFx;
  chorus: ChorusFx;
  limiter: LimiterFx;
}

export interface AutomationPoint {
  time: number;
  value: number;
}

export type AutomationTarget = 'volume' | 'eq.low' | 'eq.mid' | 'eq.high' | 'comp.threshold' | 'comp.ratio' | 'reverb.amount' | 'delay.time' | 'delay.feedback' | 'delay.wet' | 'chorus.rate' | 'chorus.depth' | 'chorus.wet' | 'limiter.ceiling';

export interface TrackAutomation {
  [key: string]: AutomationPoint[];
}

export interface StudioProject {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  tracks: Track[];
}

export interface MidiInputDevice {
  id: string;
  name: string;
  manufacturer?: string;
  state?: string;
  connection?: string;
  onmidimessage: ((event: MIDIMessageEvent) => void) | null;
}

export interface Pattern {
  id: string;
  name: string;
  tracks: { [trackId: string]: boolean[] };
}

export type HintKey = 'quickStart' | 'addTrackAudio' | 'playButton' | 'commandPalette';
export type SmartTrackPresetKey = keyof typeof SMART_TRACK_PRESETS;

export const TRACK_COLORS = ['bg-yellow-500', 'bg-pink-500', 'bg-indigo-500', 'bg-orange-500', 'bg-cyan-500', 'bg-emerald-500', 'bg-red-500'];

export const TRACK_TEMPLATES = [
  { label: 'Vocal', color: 'bg-pink-500' },
  { label: 'Drums', color: 'bg-red-500' },
  { label: 'Bass', color: 'bg-green-500' },
  { label: 'Synth', color: 'bg-indigo-500' },
];

export const SMART_TRACK_PRESETS = {
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
