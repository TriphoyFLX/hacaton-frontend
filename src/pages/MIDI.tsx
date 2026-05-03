import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Square, Plus, Trash2, Music, Piano, Drum, Guitar, Volume2, Save, Download, Upload, Repeat, Repeat1 } from 'lucide-react';

// ================= ИНТЕРФЕЙСЫ =================
interface Note {
  id: string;
  pitch: number;
  startTime: number;
  duration: number;
  velocity: number;
  trackId: string;
}

interface Track {
  id: string;
  name: string;
  instrument: InstrumentType;
  color: string;
  notes: Note[];
  muted: boolean;
  solo: boolean;
  volume: number;
  pan: number;
  customSample?: string;
}

type InstrumentType = 'synth' | 'bass' | 'pad' | 'pluck' | 'kick' | 'snare' | 'hihat' | 'custom';

interface MIDIProject {
  id: string;
  name: string;
  bpm: number;
  tracks: Track[];
  currentTime: number;
  isPlaying: boolean;
  isRecording: boolean;
  activeTrackId: string | null;
  loopEnabled: boolean;
  loopStart: number;
  loopEnd: number;
  patternLength: number; // Длина паттерна в секундах (по умолчанию 8 тактов)
  timeSignature: [number, number];
}

// ================= СТИЛИ =================
const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');`;

const css = `
${FONT_IMPORT}

.midi-root {
  --bg: #0a0a0a;
  --bg-surface: #111111;
  --bg-elevated: #1a1a1a;
  --border: #2a2a2a;
  --border-hover: #3a3a3a;
  --border-mid: #252525;
  --text-primary: #f0f0f0;
  --text-secondary: #888888;
  --text-muted: #555555;
  --accent: #00ff88;
  --accent-dim: #00cc6a;
  --red: #ff4444;
  --red-dim: #cc0000;
  --blue: #4488ff;
  --orange: #ff8844;
  --purple: #aa44ff;
  font-family: 'Syne', sans-serif;
  background: var(--bg);
  color: var(--text-primary);
  min-height: 100vh;
  max-height: 100vh;
  overflow: hidden;
  box-sizing: border-box;
}

*, *::before, *::after { box-sizing: border-box; }

.midi-wrapper {
  max-width: 1400px;
  margin: 0 auto;
  padding: 16px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Welcome Screen */
.welcome-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  text-align: center;
  padding: 20px;
}

.welcome-title {
  font-size: 56px;
  font-weight: 800;
  margin-bottom: 8px;
  background: linear-gradient(135deg, var(--accent), var(--blue), var(--purple));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.welcome-subtitle {
  font-size: 16px;
  color: var(--text-secondary);
  margin-bottom: 40px;
  max-width: 500px;
  line-height: 1.5;
}

.instrument-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  max-width: 800px;
  width: 100%;
  margin-bottom: 24px;
}

.instrument-card {
  background: var(--bg-elevated);
  border: 2px solid var(--border);
  border-radius: 16px;
  padding: 20px 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
}

.instrument-card:hover {
  border-color: var(--accent);
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 255, 136, 0.1);
}

.instrument-card.selected {
  border-color: var(--accent);
  background: rgba(0, 255, 136, 0.08);
}

.instrument-icon {
  width: 40px;
  height: 40px;
  margin: 0 auto 8px;
  color: var(--accent);
}

.instrument-name {
  font-weight: 600;
  font-size: 16px;
  margin-bottom: 4px;
}

.instrument-desc {
  font-size: 12px;
  color: var(--text-muted);
}

.start-button {
  background: var(--accent);
  color: #000;
  border: none;
  border-radius: 12px;
  padding: 14px 48px;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  letter-spacing: 0.5px;
}

.start-button:hover:not(:disabled) {
  background: var(--accent-dim);
  transform: scale(1.02);
}

.start-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Transport Bar */
.transport-bar {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 10px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.transport-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.transport-btn {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
}

.transport-btn:hover { border-color: var(--accent); }
.transport-btn.active { background: var(--accent); color: #000; border-color: var(--accent); }
.transport-btn.record { border-color: var(--red); }
.transport-btn.record.active { background: var(--red); border-color: var(--red); }
.transport-btn.loop {
  border-color: var(--blue);
  opacity: 0.5;
}
.transport-btn.loop.active {
  opacity: 1;
  background: var(--blue);
  border-color: var(--blue);
  color: white;
}

.bpm-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 6px 12px;
}

.bpm-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; }
.bpm-input {
  width: 48px;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 700;
  text-align: center;
  font-family: 'DM Mono', monospace;
}

.pattern-length-control {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 6px 12px;
}

.pattern-length-label {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.pattern-length-select {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  color: var(--text-primary);
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  font-family: 'DM Mono', monospace;
  cursor: pointer;
}

.metronome-visual {
  display: flex;
  gap: 4px;
}

.metronome-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--border);
  transition: all 0.1s;
}

.metronome-dot.active {
  background: var(--accent);
  box-shadow: 0 0 8px var(--accent);
}

.metronome-dot.downbeat {
  width: 12px;
  height: 12px;
}

.midi-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-secondary);
}

.midi-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #333;
}

.midi-dot.connected {
  background: var(--accent);
  animation: pulse 2s infinite;
}

@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

/* Main Workspace */
.main-workspace {
  display: flex;
  gap: 12px;
  flex: 1;
  min-height: 0;
}

/* Tracks Panel */
.tracks-panel {
  width: 260px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  flex-shrink: 0;
}

.tracks-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.tracks-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-muted);
}

.track-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px;
  cursor: pointer;
  transition: all 0.15s;
}

.track-card:hover { border-color: var(--border-hover); }
.track-card.active { border-color: var(--accent); background: rgba(0,255,136,0.05); }

.track-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.track-name-input {
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-weight: 600;
  font-size: 13px;
  width: 120px;
  outline: none;
}

.track-actions {
  display: flex;
  gap: 4px;
  align-items: center;
}

.icon-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.15s;
}

.icon-btn:hover { color: var(--text-primary); background: rgba(255,255,255,0.05); }
.icon-btn.active { color: var(--accent); }
.icon-btn.solo-active { color: var(--orange); }
.icon-btn.danger:hover { color: var(--red); }

.track-note-count {
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 6px;
  font-family: 'DM Mono', monospace;
}

.volume-slider {
  width: 100%;
  height: 4px;
  -webkit-appearance: none;
  background: var(--border);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  background: var(--accent);
  border-radius: 50%;
  cursor: pointer;
}

/* Timeline Panel */
.timeline-panel {
  flex: 1;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  border-bottom: 1px solid var(--border);
}

.zoom-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.zoom-btn {
  width: 28px;
  height: 28px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 4px;
  font-size: 16px;
}

.time-ruler {
  height: 24px;
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--border);
  position: relative;
  overflow: hidden;
}

.time-marker {
  position: absolute;
  top: 2px;
  font-size: 9px;
  color: var(--text-muted);
  font-family: 'DM Mono', monospace;
  transform: translateX(-50%);
  pointer-events: none;
}

.time-marker.bar { color: var(--text-secondary); font-weight: 600; }

.piano-roll-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.piano-roll-container {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
}

.note-ruler {
  width: 60px;
  background: var(--bg-surface);
  border-right: 2px solid var(--border);
  flex-shrink: 0;
  overflow: hidden;
  position: relative;
}

.note-row {
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 8px;
  font-size: 9px;
  color: var(--text-secondary);
  border-bottom: 1px solid rgba(255,255,255,0.05);
  font-family: 'DM Mono', monospace;
  font-weight: 500;
  position: relative;
}

.note-row.black { 
  background: linear-gradient(90deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 100%);
  color: var(--text-muted);
}

.note-row.octave {
  background: rgba(0, 255, 136, 0.03);
  border-top: 1px solid rgba(0, 255, 136, 0.1);
  color: var(--accent);
  font-weight: 600;
}

.grid-viewport {
  flex: 1;
  overflow: auto;
  position: relative;
}

.grid-content {
  position: relative;
  min-height: 100%;
}

.grid-line-h {
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background: rgba(255,255,255,0.08);
  pointer-events: none;
  z-index: 1;
}

.grid-line-h.octave { 
  background: rgba(0, 255, 136, 0.15);
  height: 2px;
}

.grid-line-h.black {
  background: rgba(255,255,255,0.04);
}

.grid-line-v {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: rgba(255,255,255,0.08);
  pointer-events: none;
  z-index: 1;
}

.grid-line-v.beat { 
  background: rgba(255,255,255,0.12);
}

.grid-line-v.bar { 
  background: rgba(0, 255, 136, 0.2);
  width: 2px;
}

.grid-line-v.loop-end {
  background: var(--blue);
  width: 2px;
  opacity: 0.8;
}

.note-block {
  position: absolute;
  border-radius: 4px;
  cursor: pointer;
  min-height: 12px;
  transition: filter 0.15s ease;
  z-index: 5;
  border: 1px solid rgba(0,0,0,0.4);
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  overflow: hidden;
}

.note-block::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%);
  pointer-events: none;
}

.note-block:hover {
  filter: brightness(1.2);
  box-shadow: 0 4px 8px rgba(0,0,0,0.3);
  z-index: 10;
}

.note-block.selected {
  outline: 2px solid white;
  z-index: 15;
}

.note-resize-handle {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 8px;
  cursor: ew-resize;
  background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.2) 100%);
  border-radius: 0 3px 3px 0;
  opacity: 0;
  transition: opacity 0.15s;
}

.note-block:hover .note-resize-handle {
  opacity: 1;
}

.playhead {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(180deg, var(--accent) 0%, rgba(0, 255, 136, 0.6) 100%);
  pointer-events: none;
  z-index: 20;
  box-shadow: 0 0 12px var(--accent);
  border-radius: 1px;
}

.save-controls {
  display: flex;
  gap: 8px;
  align-items: center;
}

.save-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.15s;
}

.save-btn:hover { color: var(--text-primary); border-color: var(--border-hover); }
`;

// ================= КОНСТАНТЫ =================
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_HEIGHT = 16;
const DEFAULT_PIXELS_PER_SECOND = 200;
const LOWEST_NOTE = 36; // C2
const HIGHEST_NOTE = 108; // C8
const TOTAL_NOTES = HIGHEST_NOTE - LOWEST_NOTE + 1;

const PATTERN_OPTIONS = [
  { label: '2 такта', bars: 2 },
  { label: '4 такта', bars: 4 },
  { label: '8 тактов', bars: 8 },
  { label: '16 тактов', bars: 16 },
];

const INSTRUMENTS: { id: InstrumentType; name: string; desc: string; icon: any; color: string }[] = [
  { id: 'synth', name: 'Синтезатор', desc: 'Яркий лид', icon: Music, color: '#00ff88' },
  { id: 'bass', name: 'Бас', desc: 'Глубокий бас', icon: Guitar, color: '#4488ff' },
  { id: 'pad', name: 'Пэд', desc: 'Атмосфера', icon: Piano, color: '#aa44ff' },
  { id: 'pluck', name: 'Плак', desc: 'Чёткий плак', icon: Music, color: '#ff8844' },
  { id: 'kick', name: 'Кик', desc: 'Бочка', icon: Drum, color: '#ff4444' },
  { id: 'snare', name: 'Снейр', desc: 'Малый', icon: Drum, color: '#ffaa00' },
  { id: 'hihat', name: 'Хай-хэт', desc: 'Тарелка', icon: Drum, color: '#cccccc' },
];

// ================= WEB AUDIO СИНТЕЗ =================
class Synthesizer {
  private ctx: AudioContext;
  private masterGain: GainNode;
  private customSamples: Map<string, AudioBuffer> = new Map();

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0.8;
    this.masterGain.connect(ctx.destination);
  }

  addCustomSample(name: string, buffer: AudioBuffer) {
    this.customSamples.set(name, buffer);
  }

  playCustomSample(name: string, velocity: number, time: number, duration: number, volume: number = 0.7) {
    const buffer = this.customSamples.get(name);
    if (!buffer) return;

    const now = this.ctx.currentTime + time;
    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();

    source.buffer = buffer;
    source.playbackRate.value = 1.0;

    gain.gain.setValueAtTime(velocity * volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + Math.min(duration, buffer.duration));

    source.connect(gain);
    gain.connect(this.masterGain);
    source.start(now);
    source.stop(now + Math.min(duration, buffer.duration));

    source.onended = () => {
      source.disconnect();
      gain.disconnect();
    };
  }

  playNote(instrument: InstrumentType, frequency: number, velocity: number, time: number, duration: number, volume: number = 0.7) {
    const now = this.ctx.currentTime + time;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    velocity *= volume;

    switch (instrument) {
      case 'synth':
        osc.type = 'sawtooth';
        gain.gain.setValueAtTime(velocity * 0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, now);
        filter.frequency.exponentialRampToValueAtTime(400, now + duration);
        break;
      case 'bass':
        osc.type = 'triangle';
        gain.gain.setValueAtTime(velocity * 0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.8);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now);
        break;
      case 'pad':
        osc.type = 'sine';
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(velocity * 0.2, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3000, now);
        break;
      case 'pluck':
        osc.type = 'square';
        gain.gain.setValueAtTime(velocity * 0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(2000, now);
        filter.Q.value = 5;
        break;
      case 'kick':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
        gain.gain.setValueAtTime(velocity * 0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        break;
      case 'snare':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, now);
        gain.gain.setValueAtTime(velocity * 0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(1000, now);
        break;
      case 'hihat':
        osc.type = 'square';
        osc.frequency.setValueAtTime(8000, now);
        gain.gain.setValueAtTime(velocity * 0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(5000, now);
        break;
    }

    osc.frequency.setValueAtTime(frequency, now);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + duration + 0.1);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); filter.disconnect(); };
  }

  setMasterVolume(v: number) {
    this.masterGain.gain.value = v;
  }
}

// ================= ГЛАВНЫЙ КОМПОНЕНТ =================
export default function MIDISequencer() {
  const [project, setProject] = useState<MIDIProject | null>(null);
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentType | null>(null);
  const [midiConnected, setMidiConnected] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [zoom, setZoom] = useState(DEFAULT_PIXELS_PER_SECOND);
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [dragging, setDragging] = useState<{ noteId: string; type: 'move' | 'resize'; startX: number; startY: number; origStart: number; origPitch: number; origDuration: number } | null>(null);
  const [customSamples, setCustomSamples] = useState<{ name: string; buffer: AudioBuffer; file: File }[]>([]);
  const [showTrackMenu, setShowTrackMenu] = useState(false);
  const [testModal, setTestModal] = useState<{ show: boolean; sampleName: string }>({ show: false, sampleName: '' });

  const audioCtxRef = useRef<AudioContext | null>(null);
  const synthRef = useRef<Synthesizer | null>(null);
  const playIntervalRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);
  const midiInputsRef = useRef<Map<string, MIDIInput>>(new Map());
  const activeMIDINotes = useRef<Map<number, { startTime: number; trackId: string }>>(new Map());
  const loopCountRef = useRef<number>(0);

  // Сохранение проекта в localStorage
  const saveProject = useCallback(async () => {
    if (!project) return;
    try {
      const customSampleNames = customSamples.map(s => ({ name: s.name }));
      const data = { project, customSampleNames, timestamp: Date.now() };
      localStorage.setItem('midiSequencerProject', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save project:', error);
    }
  }, [project, customSamples]);

  const loadProject = useCallback(async () => {
    try {
      const saved = localStorage.getItem('midiSequencerProject');
      if (!saved) return null;
      const data = JSON.parse(saved);
      if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
        localStorage.removeItem('midiSequencerProject');
        return null;
      }
      return data.project;
    } catch (error) {
      console.error('Failed to load project:', error);
      localStorage.removeItem('midiSequencerProject');
      return null;
    }
  }, []);

  useEffect(() => { loadProject().then(p => p && setProject(p)); }, [loadProject]);
  useEffect(() => { if (project) { const t = setTimeout(saveProject, 1000); return () => clearTimeout(t); } }, [project, saveProject]);

  useEffect(() => {
    if (!showTrackMenu) return;
    const handler = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.track-menu-container')) setShowTrackMenu(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showTrackMenu]);

  useEffect(() => {
    audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    synthRef.current = new Synthesizer(audioCtxRef.current);
    return () => { audioCtxRef.current?.close(); };
  }, []);

  useEffect(() => {
    const setup = async () => {
      try {
        const access = await navigator.requestMIDIAccess();
        setMidiConnected(true);
        const handleMsg = (msg: any) => {
          const [cmd, note, vel] = msg.data;
          if (cmd === 144 && vel > 0) handleNoteOn(note, vel);
          else if (cmd === 128 || (cmd === 144 && vel === 0)) handleNoteOff(note);
        };
        access.inputs.forEach(i => { midiInputsRef.current.set(i.id, i); i.onmidimessage = handleMsg; });
        access.onstatechange = () => {
          midiInputsRef.current.clear();
          access.inputs.forEach(i => { midiInputsRef.current.set(i.id, i); i.onmidimessage = handleMsg; });
          setMidiConnected(access.inputs.size > 0);
        };
      } catch { setMidiConnected(false); }
    };
    setup();
  }, []);

  useEffect(() => {
    const map: Record<string, number> = {
      'a': 48, 'w': 49, 's': 50, 'e': 51, 'd': 52, 'f': 53, 't': 54, 'g': 55, 'y': 56, 'h': 57, 'u': 58, 'j': 59, 'k': 60,
      'z': 36, 'x': 37, 'c': 38, 'v': 39, 'b': 40, 'n': 41, 'm': 42, ',': 43, '.': 44, '/': 45
    };
    const down = (e: KeyboardEvent) => { if (!e.repeat && map[e.key.toLowerCase()] !== undefined && project) handleNoteOn(map[e.key.toLowerCase()], 100); };
    const up = (e: KeyboardEvent) => { if (map[e.key.toLowerCase()] !== undefined && project) handleNoteOff(map[e.key.toLowerCase()]); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [project]);

  const handleNoteOn = useCallback((pitch: number, velocity: number) => {
    if (!project || !audioCtxRef.current || !synthRef.current) return;
    const activeTrack = project.tracks.find(t => t.id === project.activeTrackId);
    if (!activeTrack || activeTrack.muted) return;

    if (activeTrack.customSample) {
      synthRef.current.playCustomSample(activeTrack.customSample, velocity / 127, 0, 0.5, activeTrack.volume);
    } else {
      const freq = 440 * Math.pow(2, (pitch - 69) / 12);
      synthRef.current.playNote(activeTrack.instrument, freq, velocity / 127, 0, 0.5, activeTrack.volume);
    }

    if (project.isRecording) {
      const relTime = project.currentTime + (audioCtxRef.current.currentTime - ((project as any)._recStartTime || audioCtxRef.current.currentTime));
      activeMIDINotes.current.set(pitch, { startTime: relTime % project.patternLength, trackId: activeTrack.id });
    }
  }, [project]);

  const handleNoteOff = useCallback((pitch: number) => {
    if (!project || !project.isRecording) return;
    const data = activeMIDINotes.current.get(pitch);
    if (!data) return;
    const relTime = project.currentTime + (audioCtxRef.current!.currentTime - ((project as any)._recStartTime || audioCtxRef.current!.currentTime));
    const startInPattern = data.startTime % project.patternLength;
    const duration = Math.max(0.05, (relTime % project.patternLength) - startInPattern);
    const note: Note = {
      id: crypto.randomUUID(),
      pitch,
      startTime: startInPattern,
      duration,
      velocity: 100,
      trackId: data.trackId
    };
    setProject(prev => prev ? {
      ...prev,
      tracks: prev.tracks.map(t => t.id === data.trackId ? { ...t, notes: [...t.notes, note] } : t)
    } : prev);
    activeMIDINotes.current.delete(pitch);
  }, [project]);

  // Воспроизведение с зацикливанием
  const startPlayback = useCallback(() => {
    if (!project || !audioCtxRef.current || !synthRef.current) return;
    
    const startTime = audioCtxRef.current.currentTime;
    const bps = project.bpm / 60;
    const patternLength = project.patternLength || 16; // fallback если не определено
    
    setProject(prev => prev ? { ...prev, isPlaying: true, currentTime: 0 } : null);

    let nextScheduleTime = 0;
    const scheduleAhead = 0.3;

    const schedule = (currentTime: number) => {
      while (nextScheduleTime < currentTime + scheduleAhead) {
        const t = nextScheduleTime % patternLength;
        project.tracks.forEach(track => {
          if (track.muted) return;
          
          // Проверяем solo дорожки
          const hasSoloTracks = project.tracks.some(t => t.solo);
          if (hasSoloTracks && !track.solo) return;
          
          track.notes.forEach(note => {
            if (note.startTime >= t && note.startTime < t + scheduleAhead) {
              const delay = note.startTime - t;
              if (track.customSample) {
                synthRef.current!.playCustomSample(track.customSample, note.velocity / 127, delay, note.duration, track.volume);
              } else {
                const freq = 440 * Math.pow(2, (note.pitch - 69) / 12);
                synthRef.current!.playNote(track.instrument, freq, note.velocity / 127, delay, note.duration, track.volume);
              }
            }
          });
        });
        nextScheduleTime += scheduleAhead;
      }
    };

    schedule(0);

    playIntervalRef.current = window.setInterval(() => {
      const elapsed = audioCtxRef.current!.currentTime - startTime;
      const loopedTime = elapsed % patternLength;
      const beatPos = Math.floor((loopedTime * bps) % project.timeSignature[0]);
      setCurrentBeat(beatPos);
      setProject(prev => {
        if (!prev) return prev;
        schedule(elapsed);
        return { ...prev, currentTime: loopedTime };
      });
    }, 20);
  }, [project]);

  const stopPlayback = useCallback(() => {
    if (playIntervalRef.current) { 
      clearInterval(playIntervalRef.current); 
      playIntervalRef.current = null; 
    }
    setProject(prev => prev ? { ...prev, isPlaying: false, isRecording: false, currentTime: 0 } : null);
    setCurrentBeat(0);
    loopCountRef.current = 0;
  }, []);

  const togglePlay = () => project?.isPlaying ? stopPlayback() : startPlayback();

  const toggleLoop = () => {
    setProject(prev => prev ? { ...prev, loopEnabled: !prev.loopEnabled } : prev);
  };

  const changePatternLength = (bars: number) => {
    const beatDuration = 60 / (project?.bpm || 120);
    const newLength = bars * 4 * beatDuration; // 4 бита в такте
    setProject(prev => prev ? { ...prev, patternLength: newLength, loopEnd: newLength } : prev);
  };

  const toggleRecord = () => {
    if (!project || !audioCtxRef.current) return;
    if (project.isRecording) {
      setProject(prev => prev ? { ...prev, isRecording: false } : null);
      return;
    }
    let count = 0;
    const totalBeats = project.timeSignature[0];
    countdownRef.current = window.setInterval(() => {
      setCurrentBeat(count % totalBeats);
      count++;
      if (count > totalBeats) {
        clearInterval(countdownRef.current!);
        const recStart = audioCtxRef.current!.currentTime;
        setProject(prev => prev ? { ...prev, isRecording: true, isPlaying: true, currentTime: 0, _recStartTime: recStart } as any : prev);
        startPlayback();
      }
    }, (60 / project.bpm) * 1000);
  };

  const handleCustomSampleUpload = async (file: File) => {
    if (!audioCtxRef.current || !synthRef.current) return;
    if (!file.type.startsWith('audio/')) { alert('Выберите аудио файл'); return; }
    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioCtxRef.current.decodeAudioData(arrayBuffer);
      const name = file.name.replace(/\.[^/.]+$/, '');
      synthRef.current.addCustomSample(name, audioBuffer);
      setCustomSamples(prev => [...prev, { name, buffer: audioBuffer, file }]);
      setTestModal({ show: true, sampleName: name });
    } catch (error) {
      console.error('Failed to load sample:', error);
      alert('Не удалось загрузить файл');
    }
  };

  const createProject = () => {
    const beatDuration = 60 / 120; // 120 BPM по умолчанию
    const patternLength = 8 * 4 * beatDuration; // 8 тактов по 4 бита
    
    if (selectedInstrument) {
      const inst = INSTRUMENTS.find(i => i.id === selectedInstrument)!;
      const track: Track = {
        id: crypto.randomUUID(),
        name: inst.name,
        instrument: selectedInstrument,
        color: inst.color,
        notes: [],
        muted: false,
        solo: false,
        volume: 0.8,
        pan: 0
      };
      setProject({
        id: crypto.randomUUID(),
        name: 'Новый проект',
        bpm: 120,
        tracks: [track],
        currentTime: 0,
        isPlaying: false,
        isRecording: false,
        activeTrackId: track.id,
        loopEnabled: true,
        loopStart: 0,
        loopEnd: patternLength,
        patternLength,
        timeSignature: [4, 4]
      });
    }
  };

  const addTrack = (instrument: InstrumentType) => {
    const inst = INSTRUMENTS.find(i => i.id === instrument)!;
    const track: Track = {
      id: crypto.randomUUID(),
      name: inst.name,
      instrument,
      color: inst.color,
      notes: [],
      muted: false,
      solo: false,
      volume: 0.8,
      pan: 0
    };
    setProject(prev => prev ? { ...prev, tracks: [...prev.tracks, track] } : prev);
  };

  const addCustomSampleTrack = (sampleName: string) => {
    const track: Track = {
      id: crypto.randomUUID(),
      name: sampleName,
      instrument: 'custom',
      color: '#ff6b6b',
      notes: [],
      muted: false,
      solo: false,
      volume: 0.8,
      pan: 0,
      customSample: sampleName
    };
    setProject(prev => prev ? { ...prev, tracks: [...prev.tracks, track], activeTrackId: track.id } : prev);
  };

  const toggleSolo = (trackId: string) => {
    setProject(prev => {
      if (!prev) return prev;
      const track = prev.tracks.find(t => t.id === trackId);
      if (!track) return prev;
      
      // Если уже в соло, выключаем
      if (track.solo) {
        return {
          ...prev,
          tracks: prev.tracks.map(t => t.id === trackId ? { ...t, solo: false } : t)
        };
      }
      
      // Включаем соло для этой дорожки, выключаем для остальных
      return {
        ...prev,
        tracks: prev.tracks.map(t => ({
          ...t,
          solo: t.id === trackId
        }))
      };
    });
  };

  const deleteTrack = (id: string) => {
    setProject(prev => prev ? {
      ...prev,
      tracks: prev.tracks.filter(t => t.id !== id),
      activeTrackId: prev.activeTrackId === id ? (prev.tracks[0]?.id || null) : prev.activeTrackId
    } : null);
  };

  const deleteSelectedNotes = () => {
    setProject(prev => prev ? {
      ...prev,
      tracks: prev.tracks.map(t => ({ ...t, notes: t.notes.filter(n => !selectedNotes.includes(n.id)) }))
    } : prev);
    setSelectedNotes([]);
  };

  const handleNoteMouseDown = (e: React.MouseEvent, note: Note) => {
    e.stopPropagation();
    e.preventDefault();
    if (e.shiftKey) {
      setSelectedNotes(prev => prev.includes(note.id) ? prev.filter(id => id !== note.id) : [...prev, note.id]);
    } else if (!selectedNotes.includes(note.id)) {
      setSelectedNotes([note.id]);
    }
    setDragging({
      noteId: note.id,
      type: 'move',
      startX: e.clientX,
      startY: e.clientY,
      origStart: note.startTime,
      origPitch: note.pitch,
      origDuration: note.duration
    });
  };

  const handleNoteResizeDown = (e: React.MouseEvent, note: Note) => {
    e.stopPropagation();
    e.preventDefault();
    setDragging({
      noteId: note.id,
      type: 'resize',
      startX: e.clientX,
      startY: e.clientY,
      origStart: note.startTime,
      origPitch: note.pitch,
      origDuration: note.duration
    });
  };

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: MouseEvent) => {
      const dx = (e.clientX - dragging.startX) / zoom;
      const dy = (e.clientY - dragging.startY) / NOTE_HEIGHT;
      setProject(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          tracks: prev.tracks.map(t => ({
            ...t,
            notes: t.notes.map(n => {
              if (n.id !== dragging.noteId) return n;
              if (dragging.type === 'move') {
                const newPitch = Math.min(HIGHEST_NOTE, Math.max(LOWEST_NOTE, Math.round(dragging.origPitch - dy)));
                return { ...n, startTime: Math.max(0, dragging.origStart + dx), pitch: newPitch };
              } else {
                return { ...n, duration: Math.max(0.05, dragging.origDuration + dx) };
              }
            })
          }))
        };
      });
    };
    const handleUp = () => setDragging(null);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp); };
  }, [dragging, zoom]);

  const handleGridClick = (e: React.MouseEvent) => {
    if (!project || !project.activeTrackId) return;
    if ((e.target as HTMLElement).closest('.note-block')) return;
    const gridEl = e.currentTarget.parentElement;
    if (!gridEl) return;
    const rect = gridEl.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top);
    const pitch = Math.min(HIGHEST_NOTE, Math.max(LOWEST_NOTE, Math.floor(HIGHEST_NOTE - y / NOTE_HEIGHT)));
    const quantize = (60 / project.bpm) / 4;
    const quantizedStart = Math.round(x / quantize) * quantize;

    const newNote: Note = {
      id: crypto.randomUUID(),
      pitch,
      startTime: quantizedStart,
      duration: quantize,
      velocity: 80,
      trackId: project.activeTrackId
    };

    if (audioCtxRef.current && synthRef.current) {
      const activeTrack = project.tracks.find(t => t.id === project.activeTrackId);
      if (activeTrack && !activeTrack.muted) {
        if (activeTrack.customSample) {
          synthRef.current.playCustomSample(activeTrack.customSample, 0.5, 0, 0.2);
        } else {
          synthRef.current.playNote(activeTrack.instrument, 440 * Math.pow(2, (pitch - 69) / 12), 0.5, 0, 0.2);
        }
      }
    }

    setProject(prev => prev ? {
      ...prev,
      tracks: prev.tracks.map(t => t.id === project.activeTrackId ? { ...t, notes: [...t.notes, newNote] } : t)
    } : prev);
  };

  const exportProject = () => {
    if (!project) return;
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${project.name}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importProject = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          setProject(JSON.parse(reader.result as string));
          audioCtxRef.current?.resume();
        } catch {}
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const getCurrentPatternBars = () => {
    if (!project) return 8;
    const beatDuration = 60 / project.bpm;
    return Math.round(project.patternLength / (4 * beatDuration));
  };

  // ================= РЕНДЕР =================
  if (!project) {
    return (
      <div className="midi-root">
        <style>{css}</style>
        <div className="welcome-screen">
          <h1 className="welcome-title">MIDI Секвенсор</h1>
          <p className="welcome-subtitle">Выберите инструмент или загрузите свой звук. Все дорожки играют вместе в зацикленном паттерне, как в FL Studio!</p>
          <div className="instrument-grid">
            {INSTRUMENTS.map(inst => (
              <div key={inst.id} className={`instrument-card ${selectedInstrument === inst.id ? 'selected' : ''}`} onClick={() => setSelectedInstrument(inst.id)}>
                <inst.icon className="instrument-icon" style={{ color: inst.color }} />
                <div className="instrument-name">{inst.name}</div>
                <div className="instrument-desc">{inst.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 20 }}>
            <input type="file" accept="audio/*" style={{ display: 'none' }} id="welcome-upload" onChange={e => e.target.files?.[0] && handleCustomSampleUpload(e.target.files[0])} />
            <button onClick={() => document.getElementById('welcome-upload')?.click()} style={{
              padding: '12px 24px', background: 'var(--bg-elevated)', border: '2px dashed var(--border-hover)',
              borderRadius: 12, color: 'var(--text-primary)', cursor: 'pointer', fontSize: 14, fontWeight: 600
            }}><Upload size={18} style={{ marginRight: 8 }} />Загрузить свой звук</button>
            {customSamples.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                {customSamples.map(s => (
                  <div key={s.name} style={{
                    background: 'rgba(0,255,136,0.1)', border: '1px solid var(--accent)', borderRadius: 8,
                    padding: '6px 12px', fontSize: 12, color: 'var(--accent)'
                  }}>{s.name}</div>
                ))}
              </div>
            )}
          </div>
          <button className="start-button" disabled={!selectedInstrument && customSamples.length === 0}
            onClick={selectedInstrument ? createProject : () => {
              if (customSamples.length > 0) {
                const beatDuration = 60 / 120;
                const patternLength = 8 * 4 * beatDuration;
                const track: Track = {
                  id: crypto.randomUUID(), name: customSamples[0].name, instrument: 'custom',
                  color: '#ff6b6b', notes: [], muted: false, solo: false, volume: 0.8, pan: 0, customSample: customSamples[0].name
                };
                setProject({
                  id: crypto.randomUUID(), name: 'Новый проект', bpm: 120, tracks: [track],
                  currentTime: 0, isPlaying: false, isRecording: false, activeTrackId: track.id,
                  loopEnabled: true, loopStart: 0, loopEnd: patternLength, patternLength, timeSignature: [4, 4]
                });
              }
            }}>Создать проект</button>
        </div>
      </div>
    );
  }

  const currentBars = getCurrentPatternBars();
  const totalBeatsInPattern = currentBars * 4;
  const maxTimeMarkers = totalBeatsInPattern * 4; // 16-е ноты

  return (
    <div className="midi-root">
      <style>{css}</style>
      <div className="midi-wrapper">
        <div className="transport-bar">
          <div className="transport-group">
            <button className={`transport-btn ${project.isPlaying ? 'active' : ''}`} onClick={togglePlay}>
              {project.isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <button className={`transport-btn record ${project.isRecording ? 'active' : ''}`} onClick={toggleRecord}>
              <svg width="16" height="16"><circle cx="8" cy="8" r="6" fill="currentColor"/></svg>
            </button>
            <button className="transport-btn" onClick={stopPlayback}><Square size={16} /></button>
            <button 
              className={`transport-btn loop ${project.loopEnabled ? 'active' : ''}`} 
              onClick={toggleLoop}
              title="Зациклить паттерн"
            >
              <Repeat size={18} />
            </button>
            <div className="metronome-visual">
              {Array.from({ length: project.timeSignature[0] }, (_, i) => (
                <div key={i} className={`metronome-dot ${i === currentBeat ? 'active' : ''} ${i === 0 ? 'downbeat' : ''}`} />
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div className="bpm-box">
              <span className="bpm-label">BPM</span>
              <input type="number" className="bpm-input" value={project.bpm}
                onChange={e => setProject(prev => prev ? { ...prev, bpm: Math.max(40, Math.min(300, +e.target.value || 120)) } : prev)} />
            </div>
            <div className="pattern-length-control">
              <span className="pattern-length-label">Паттерн</span>
              <select 
                className="pattern-length-select"
                value={currentBars}
                onChange={(e) => changePatternLength(Number(e.target.value))}
              >
                {PATTERN_OPTIONS.map(opt => (
                  <option key={opt.bars} value={opt.bars}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="midi-status">
            <div className={`midi-dot ${midiConnected ? 'connected' : ''}`} />
            <span>{midiConnected ? 'MIDI' : 'Клавиатура'}</span>
          </div>
          <div className="save-controls">
            <button className="save-btn" onClick={exportProject}><Download size={14} /> Экспорт</button>
            <button className="save-btn" onClick={importProject}><Upload size={14} /> Импорт</button>
          </div>
        </div>

        <div className="main-workspace">
          <div className="tracks-panel">
            <div className="tracks-header">
              <span className="tracks-title">Дорожки</span>
              <div className="track-menu-container" style={{ position: 'relative' }}>
                <button className="icon-btn" onClick={(e) => { e.stopPropagation(); setShowTrackMenu(!showTrackMenu); }}><Plus size={18} /></button>
                {showTrackMenu && (
                  <div style={{
                    position: 'absolute', top: '100%', right: 0, background: 'var(--bg-surface)',
                    border: '1px solid var(--border)', borderRadius: 8, padding: 8, zIndex: 1000, minWidth: 200
                  }}>
                    {INSTRUMENTS.map(inst => (
                      <button key={inst.id} style={{
                        display: 'block', width: '100%', padding: '8px 12px', background: 'transparent',
                        border: 'none', color: 'var(--text-primary)', textAlign: 'left', cursor: 'pointer', fontSize: 12
                      }} onClick={() => { addTrack(inst.id); setShowTrackMenu(false); }}>{inst.name}</button>
                    ))}
                    <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                    {customSamples.map(s => (
                      <button key={s.name} style={{
                        display: 'block', width: '100%', padding: '8px 12px', background: 'transparent',
                        border: 'none', color: 'var(--accent)', textAlign: 'left', cursor: 'pointer', fontSize: 12
                      }} onClick={() => { addCustomSampleTrack(s.name); setShowTrackMenu(false); }}>{s.name}</button>
                    ))}
                    <input type="file" accept="audio/*" style={{ display: 'none' }} id="track-upload"
                      onChange={async e => {
                        const f = e.target.files?.[0];
                        if (f) { await handleCustomSampleUpload(f); addCustomSampleTrack(f.name.replace(/\.[^/.]+$/, '')); }
                        setShowTrackMenu(false);
                      }} />
                    <button style={{
                      display: 'block', width: '100%', padding: '8px 12px', background: 'transparent',
                      border: 'none', color: 'var(--text-secondary)', textAlign: 'left', cursor: 'pointer', fontSize: 12
                    }} onClick={() => { document.getElementById('track-upload')?.click(); }}>📁 Загрузить новый...</button>
                  </div>
                )}
              </div>
            </div>
            {project.tracks.map(track => (
              <div key={track.id} className={`track-card ${project.activeTrackId === track.id ? 'active' : ''}`}
                onClick={() => setProject(prev => prev ? { ...prev, activeTrackId: track.id } : prev)}>
                <div className="track-card-header">
                  <input className="track-name-input" value={track.name}
                    onChange={e => setProject(prev => prev ? { ...prev, tracks: prev.tracks.map(t => t.id === track.id ? { ...t, name: e.target.value } : t) } : prev)} />
                  <div className="track-actions">
                    <button 
                      className={`icon-btn ${track.solo ? 'solo-active' : ''}`}
                      onClick={e => { e.stopPropagation(); toggleSolo(track.id); }}
                      title="Соло"
                    >S</button>
                    <button className={`icon-btn ${track.muted ? 'active' : ''}`}
                      onClick={e => { e.stopPropagation(); setProject(prev => prev ? { ...prev, tracks: prev.tracks.map(t => t.id === track.id ? { ...t, muted: !t.muted } : t) } : prev); }}
                      title="Заглушить"
                    >M</button>
                    <button className="icon-btn danger" onClick={e => { e.stopPropagation(); deleteTrack(track.id); }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="track-note-count">
                  {track.notes.length} нот
                  {track.customSample && <span style={{ color: 'var(--accent)', marginLeft: 4 }}>🎵</span>}
                </div>
                <input type="range" className="volume-slider" min="0" max="100" value={track.volume * 100}
                  onChange={e => setProject(prev => prev ? { ...prev, tracks: prev.tracks.map(t => t.id === track.id ? { ...t, volume: +e.target.value / 100 } : t) } : prev)} />
              </div>
            ))}
          </div>

          <div className="timeline-panel">
            <div className="timeline-header">
              <span style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 1 }}>PIANO ROLL - Все дорожки</span>
              <div className="zoom-controls">
                <button className="zoom-btn" onClick={() => setZoom(z => Math.max(50, z - 50))}>−</button>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{Math.round(zoom / DEFAULT_PIXELS_PER_SECOND * 100)}%</span>
                <button className="zoom-btn" onClick={() => setZoom(z => Math.min(800, z + 50))}>+</button>
                {selectedNotes.length > 0 && <button className="icon-btn danger" onClick={deleteSelectedNotes}><Trash2 size={14} /></button>}
              </div>
            </div>
            <div className="piano-roll-panel">
              <div className="time-ruler">
                {Array.from({ length: totalBeatsInPattern + 1 }, (_, i) => (
                  <div key={i} className={`time-marker ${i % 4 === 0 ? 'bar' : ''}`} style={{ left: i * (zoom / 4) }}>
                    {i % 4 === 0 ? `${Math.floor(i/4)+1}` : i % 2 === 0 ? '•' : ''}
                  </div>
                ))}
              </div>
              <div className="piano-roll-container">
                <div className="note-ruler">
                  {Array.from({ length: TOTAL_NOTES }, (_, i) => {
                    const note = HIGHEST_NOTE - i;
                    const name = NOTE_NAMES[note % 12];
                    const octave = Math.floor(note / 12) - 1;
                    const isBlack = [1, 3, 6, 8, 10].includes(note % 12);
                    const isOctave = note % 12 === 0;
                    return (
                      <div key={note} className={`note-row ${isBlack ? 'black' : ''} ${isOctave ? 'octave' : ''}`} style={{ height: NOTE_HEIGHT }}>
                        {isOctave ? `${name}${octave}` : name}
                      </div>
                    );
                  })}
                </div>
                <div className="grid-viewport">
                  <div className="grid-content" style={{ 
                    width: Math.max(2000, (zoom / 4) * totalBeatsInPattern), 
                    height: TOTAL_NOTES * NOTE_HEIGHT 
                  }}>
                    {/* Горизонтальные линии */}
                    {Array.from({ length: TOTAL_NOTES + 1 }, (_, i) => {
                      const note = HIGHEST_NOTE - i + 1;
                      const isOctave = note % 12 === 0;
                      const isBlack = [1, 3, 6, 8, 10].includes(note % 12);
                      return <div key={`h${i}`} className={`grid-line-h ${isOctave ? 'octave' : ''} ${isBlack ? 'black' : ''}`} style={{ top: i * NOTE_HEIGHT }} />;
                    })}
                    
                    {/* Вертикальные линии */}
                    {Array.from({ length: totalBeatsInPattern + 1 }, (_, i) => (
                      <div key={`v${i}`} className={`grid-line-v ${i % 4 === 0 ? (i % (currentBars * 4) === 0 ? 'bar' : 'beat') : ''}`} style={{ left: i * (zoom / 4) }} />
                    ))}
                    
                    {/* Линия конца паттерна */}
                    <div className="grid-line-v loop-end" style={{ left: project.patternLength * zoom }} />
                    
                    {/* Ноты всех дорожек */}
                    {project.tracks.map(track =>
                      track.notes.map(note => {
                        if (note.pitch < LOWEST_NOTE || note.pitch > HIGHEST_NOTE) return null;
                        const isActive = track.id === project.activeTrackId;
                        const isMuted = track.muted;
                        return (
                          <div key={note.id}
                            className={`note-block ${selectedNotes.includes(note.id) ? 'selected' : ''}`}
                            style={{
                              left: note.startTime * zoom,
                              top: (HIGHEST_NOTE - note.pitch) * NOTE_HEIGHT,
                              width: Math.max(4, note.duration * zoom),
                              height: NOTE_HEIGHT - 2,
                              backgroundColor: track.color,
                              opacity: isMuted ? 0.3 : (isActive ? 1 : 0.7),
                              border: isActive ? '2px solid var(--accent)' : '1px solid rgba(0,0,0,0.4)',
                              zIndex: isActive ? 8 : 5
                            }}
                            onMouseDown={(e) => handleNoteMouseDown(e, note)}>
                            <div className="note-resize-handle" onMouseDown={(e) => handleNoteResizeDown(e, note)} />
                          </div>
                        );
                      })
                    )}
                    
                    {/* Playhead */}
                    <div className="playhead" style={{ left: project.currentTime * zoom }} />
                    
                    {/* Кликабельная область для новых нот */}
                    <div style={{ position: 'absolute', inset: 0, zIndex: 3 }} onClick={handleGridClick} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}