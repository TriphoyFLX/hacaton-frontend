import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Pause, Square, Plus, Trash2, Music, Piano, Drum, Guitar,
  Download, Upload, Repeat, Sliders, Activity, Volume2,
  MoreVertical, X, Check, Save, Headphones, Waves, Settings,
  Radio, Zap, Wind, Speaker
} from 'lucide-react';
import DesktopOnlyGate from '../components/DesktopOnlyGate';

// ================= TYPES =================
interface Note {
  id: string;
  pitch: number;
  startTime: number;
  duration: number;
  velocity: number;
  trackId: string;
  patternId: string;
}

interface Pattern {
  id: string;
  name: string;
  length: number;
}

interface PlaylistClip {
  id: string;
  patternId: string;
  startBar: number;
  lane: number;
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
  reverbSend: number;
  delaySend: number;
}

type InstrumentType = 'synth' | 'bass' | 'pad' | 'kick' | 'snare' | 'hihat' | 'custom';

interface MIDIProject {
  id: string;
  name: string;
  bpm: number;
  tracks: Track[];
  isPlaying: boolean;
  activeTrackId: string | null;
  patternLength: number;
  metronomeEnabled: boolean;
  patterns: Pattern[];
  activePatternId: string;
  arrangement: PlaylistClip[];
  transportMode: 'pattern' | 'song';
}

type DragState = {
  id: string;
  type: 'move' | 'resize';
  startX: number;
  startY: number;
  origStart: number;
  origPitch: number;
  origDur: number;
  trackId: string;
};

type PlaylistDragState = {
  clipId: string;
  startX: number;
  startY: number;
  origStartBar: number;
  origLane: number;
};

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
  --blue: #4488ff;
  --orange: #ff8844;
  --purple: #aa44ff;
  font-family: 'Syne', sans-serif;
  background: var(--bg);
  color: var(--text-primary);
  height: 100%;
  min-height: 0;
  overflow: hidden;
  box-sizing: border-box;
}

*, *::before, *::after { box-sizing: border-box; }

.midi-wrapper {
  max-width: 1400px;
  margin: 0 auto;
  padding: 16px;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.welcome-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100%;
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
}

.start-button:hover:not(:disabled) {
  background: var(--accent-dim);
  transform: scale(1.02);
}

.start-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

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
.transport-btn.loop { border-color: var(--blue); opacity: 0.5; }
.transport-btn.loop.active { opacity: 1; background: var(--blue); border-color: var(--blue); color: white; }

.bpm-box, .pattern-length-control {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 6px 12px;
}

.bpm-label, .pattern-length-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; }

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

.metronome-visual { display: flex; gap: 4px; }

.metronome-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--border);
  transition: all 0.1s;
}

.metronome-dot.active { background: var(--accent); box-shadow: 0 0 8px var(--accent); }
.metronome-dot.downbeat { width: 12px; height: 12px; }

.midi-status { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-secondary); }

.midi-dot { width: 8px; height: 8px; border-radius: 50%; background: #333; }

.midi-dot.connected { background: var(--accent); animation: pulse 2s infinite; }

@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

.main-workspace { display: flex; gap: 12px; flex: 1; min-height: 0; }

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

.tracks-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }

.tracks-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); }

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

.track-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }

.track-name-input {
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-weight: 600;
  font-size: 13px;
  width: 100px;
  outline: none;
}

.track-actions { display: flex; gap: 4px; align-items: center; }

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

.track-note-count { font-size: 11px; color: var(--text-muted); margin-bottom: 6px; font-family: 'DM Mono', monospace; }

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

.zoom-controls { display: flex; align-items: center; gap: 4px; }

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

.piano-roll-panel { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

.piano-roll-container { flex: 1; display: flex; overflow: hidden; position: relative; }

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

.note-row.active { background: rgba(0, 255, 136, 0.2) !important; color: var(--accent) !important; font-weight: 700 !important; }

.grid-viewport { flex: 1; overflow: auto; position: relative; }

.grid-content { position: relative; min-height: 100%; }

.grid-line-h {
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background: rgba(255,255,255,0.08);
  pointer-events: none;
  z-index: 1;
}

.grid-line-h.octave { background: rgba(0, 255, 136, 0.15); height: 2px; }
.grid-line-h.black { background: rgba(255,255,255,0.04); }

.grid-line-v {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: rgba(255,255,255,0.08);
  pointer-events: none;
  z-index: 1;
}

.grid-line-v.beat { background: rgba(255,255,255,0.12); }
.grid-line-v.bar { background: rgba(0, 255, 136, 0.2); width: 2px; }
.grid-line-v.loop-end { background: var(--blue); width: 2px; opacity: 0.8; }

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

.note-block:hover { filter: brightness(1.2); box-shadow: 0 4px 8px rgba(0,0,0,0.3); z-index: 10; }
.note-block.selected { outline: 2px solid white; z-index: 15; }

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

.note-block:hover .note-resize-handle { opacity: 1; }

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

.save-controls { display: flex; gap: 8px; align-items: center; }

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

.virtual-keyboard { background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 12px; padding: 12px; margin-bottom: 12px; }

.virtual-keyboard-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.keys-container { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; position: relative; margin-bottom: 8px; }

.white-key {
  height: 60px;
  background: #555;
  border-radius: 6px;
  border: 1px solid var(--border);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  font-size: 10px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.1s ease;
  padding-bottom: 4px;
  user-select: none;
}

.white-key:active, .white-key.active { background: var(--accent); color: #000; font-weight: 600; border-color: var(--accent); }

.black-key {
  position: absolute;
  width: 10%;
  height: 35px;
  background: #333;
  border-radius: 4px;
  border: 1px solid var(--border);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  font-size: 8px;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.1s ease;
  padding-bottom: 2px;
  z-index: 2;
  user-select: none;
}

.black-key:active, .black-key.active { background: var(--accent); color: #000; font-weight: 600; border-color: var(--accent); }

.test-button, .add-test-notes-button {
  width: 100%;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 8px;
}

.test-button { background: var(--accent); color: #000; }

.add-test-notes-button { background: var(--bg-surface); color: var(--text-primary); border: 1px solid var(--border); }
`;

// ================= КОНСТАНТЫ =================
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_HEIGHT = 16;
const DEFAULT_PIXELS_PER_SECOND = 200;
const LOWEST_NOTE = 36;
const HIGHEST_NOTE = 96;
const TOTAL_NOTES = HIGHEST_NOTE - LOWEST_NOTE + 1;

const INSTRUMENTS: { id: InstrumentType; name: string; icon: any; color: string }[] = [
  { id: 'synth', name: 'NEON LEAD', icon: Zap, color: '#00D1FF' },
  { id: 'bass', name: 'SUB BASS', icon: Headphones, color: '#00FF88' },
  { id: 'pad', name: 'AMBIENT', icon: Waves, color: '#BD00FF' },
  { id: 'kick', name: 'KICK', icon: Radio, color: '#FF4500' },
  { id: 'snare', name: 'SNARE', icon: Wind, color: '#FFA500' },
  { id: 'hihat', name: 'HI-HAT', icon: Music, color: '#FFFFFF' },
];

const PLAYLIST_LANES = 8;
const PLAYLIST_LANE_HEIGHT = 28;
const PLAYLIST_LABEL_WIDTH = 88;
const MIN_PATTERN_LENGTH = 5;
const PATTERN_LENGTH_OPTIONS = [5, 8, 16, 32, 64];

function computePatternLength(tracks: Track[], patternId: string): number {
  let maxEnd = 0;
  tracks.forEach(track => {
    track.notes.forEach(note => {
      if (note.patternId !== patternId) return;
      maxEnd = Math.max(maxEnd, note.startTime + note.duration);
    });
  });
  return maxEnd > 0 ? Math.max(MIN_PATTERN_LENGTH, Math.ceil(maxEnd)) : MIN_PATTERN_LENGTH;
}

function normalizeProjectPatterns(project: MIDIProject): MIDIProject {
  const patterns = project.patterns.map(pattern => ({
    ...pattern,
    length: computePatternLength(project.tracks, pattern.id),
  }));
  const activePattern = patterns.find(pattern => pattern.id === project.activePatternId) || patterns[0];
  return {
    ...project,
    patterns,
    patternLength: activePattern?.length ?? MIN_PATTERN_LENGTH,
  };
}

// ================= AUDIO ENGINE =================
class AudioEngine {
  ctx: AudioContext;
  masterGain: GainNode;
  reverbNode: ConvolverNode | null = null;
  delayNode: DelayNode;
  delayGain: GainNode;
  analyzer: AnalyserNode;
  samples: Map<string, AudioBuffer> = new Map();

  constructor() {
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.analyzer = this.ctx.createAnalyser();
    
    try {
      this.reverbNode = this.ctx.createConvolver();
      const sampleRate = this.ctx.sampleRate;
      const length = sampleRate * 2;
      const impulse = this.ctx.createBuffer(2, length, sampleRate);
      
      for (let channel = 0; channel < 2; channel++) {
        const data = impulse.getChannelData(channel);
        for (let i = 0; i < length; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
        }
      }
      this.reverbNode.buffer = impulse;
    } catch (e) {
      console.warn('Reverb not supported');
    }
    
    this.delayNode = this.ctx.createDelay(2.0);
    this.delayGain = this.ctx.createGain();
    this.delayNode.delayTime.value = 0.375;
    this.delayGain.gain.value = 0.3;
    
    this.masterGain.connect(this.analyzer);
    this.analyzer.connect(this.ctx.destination);
    
    this.delayNode.connect(this.delayGain);
    this.delayGain.connect(this.masterGain);
    this.delayGain.connect(this.delayNode);

    this.masterGain.gain.value = 0.7;
    this.analyzer.fftSize = 256;
  }

  async loadSample(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    const id = crypto.randomUUID();
    this.samples.set(id, audioBuffer);
    return id;
  }

  playMetronome(time: number, isDownbeat: boolean) {
    const now = this.ctx.currentTime + time;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.frequency.setValueAtTime(isDownbeat ? 1000 : 600, now);
    g.gain.setValueAtTime(0.2, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  playNote(track: Track, pitch: number, time: number, duration: number, velocity: number = 0.8) {
    const now = this.ctx.currentTime + time;
    const freq = 440 * Math.pow(2, (pitch - 69) / 12);
    const vol = velocity * track.volume;

    const mainGain = this.ctx.createGain();
    mainGain.gain.setValueAtTime(0, now);
    mainGain.gain.linearRampToValueAtTime(vol * 0.4, now + 0.005);
    mainGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    if (track.customSample && this.samples.has(track.customSample)) {
      const source = this.ctx.createBufferSource();
      source.buffer = this.samples.get(track.customSample)!;
      source.playbackRate.value = freq / 440;
      source.connect(mainGain);
      source.start(now);
      source.stop(now + duration + 0.1);
    } else {
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const oscGain1 = this.ctx.createGain();
      const oscGain2 = this.ctx.createGain();
      
      osc1.frequency.setValueAtTime(freq, now);
      osc2.frequency.setValueAtTime(freq * 2, now);
      
      switch(track.instrument) {
        case 'synth':
          osc1.type = 'sawtooth';
          osc2.type = 'square';
          oscGain1.gain.value = 0.7;
          oscGain2.gain.value = 0.3;
          break;
        case 'bass':
          osc1.type = 'triangle';
          osc2.type = 'sine';
          oscGain1.gain.value = 0.8;
          oscGain2.gain.value = 0.2;
          const oscSub = this.ctx.createOscillator();
          const subGain = this.ctx.createGain();
          oscSub.frequency.setValueAtTime(freq / 2, now);
          oscSub.type = 'sine';
          subGain.gain.value = 0.4;
          oscSub.connect(subGain);
          subGain.connect(mainGain);
          oscSub.start(now);
          oscSub.stop(now + duration + 0.1);
          break;
        case 'pad':
          osc1.type = 'sine';
          osc2.type = 'triangle';
          oscGain1.gain.value = 0.5;
          oscGain2.gain.value = 0.5;
          break;
        case 'kick':
          osc1.frequency.setValueAtTime(150, now);
          osc1.frequency.exponentialRampToValueAtTime(30, now + 0.1);
          osc1.type = 'sine';
          osc2.type = 'triangle';
          oscGain1.gain.value = 1;
          oscGain2.gain.value = 0.3;
          break;
        case 'snare':
          const bufferSize = this.ctx.sampleRate * 0.1;
          const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
          const data = noiseBuffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
          }
          const noise = this.ctx.createBufferSource();
          noise.buffer = noiseBuffer;
          const noiseFilter = this.ctx.createBiquadFilter();
          noiseFilter.type = 'highpass';
          noiseFilter.frequency.value = 1000;
          const noiseGain = this.ctx.createGain();
          noiseGain.gain.value = 0.5;
          noise.connect(noiseFilter);
          noiseFilter.connect(noiseGain);
          noiseGain.connect(mainGain);
          noise.start(now);
          noise.stop(now + 0.1);
          
          osc1.frequency.setValueAtTime(200, now);
          osc1.type = 'sine';
          oscGain1.gain.value = 0.4;
          break;
        case 'hihat':
          const hhBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.05, this.ctx.sampleRate);
          const hhData = hhBuffer.getChannelData(0);
          for (let i = 0; i < hhBuffer.length; i++) {
            hhData[i] = Math.random() * 2 - 1;
          }
          const hhNoise = this.ctx.createBufferSource();
          hhNoise.buffer = hhBuffer;
          const hhFilter = this.ctx.createBiquadFilter();
          hhFilter.type = 'highpass';
          hhFilter.frequency.value = 5000;
          const hhGain = this.ctx.createGain();
          hhGain.gain.setValueAtTime(0.3, now);
          hhGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
          hhNoise.connect(hhFilter);
          hhFilter.connect(hhGain);
          hhGain.connect(mainGain);
          hhNoise.start(now);
          hhNoise.stop(now + 0.1);
          return;
        default:
          osc1.type = 'sine';
          osc2.type = 'sine';
      }
      
      osc1.connect(oscGain1);
      osc2.connect(oscGain2);
      oscGain1.connect(mainGain);
      oscGain2.connect(mainGain);
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + duration + 0.1);
      osc2.stop(now + duration + 0.1);
    }

    mainGain.connect(this.masterGain);
    
    if (track.delaySend > 0) {
      const delaySendGain = this.ctx.createGain();
      delaySendGain.gain.value = track.delaySend;
      mainGain.connect(delaySendGain);
      delaySendGain.connect(this.delayNode);
    }
    
    if (track.reverbSend > 0 && this.reverbNode) {
      const reverbSendGain = this.ctx.createGain();
      reverbSendGain.gain.value = track.reverbSend;
      mainGain.connect(reverbSendGain);
      reverbSendGain.connect(this.reverbNode);
      this.reverbNode.connect(this.masterGain);
    }
  }
}

// ================= ГЛАВНЫЙ КОМПОНЕНТ =================
function MIDISequencer() {
  const [project, setProject] = useState<MIDIProject | null>(null);
  const [playheadTime, setPlayheadTime] = useState(0);
  const [zoom, setZoom] = useState(180);
  const [editorView, setEditorView] = useState<'piano' | 'playlist'>('piano');
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [quantizeGrid, setQuantizeGrid] = useState(0.125);
  
  const engineRef = useRef<AudioEngine | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);
  const lastMetronomeBeatRef = useRef(-1);
  const scheduledNotesRef = useRef<Set<string>>(new Set());
  const dragStateRef = useRef<DragState | null>(null);
  const playlistDragRef = useRef<PlaylistDragState | null>(null);
  const playheadRef = useRef(0);
  const isPlayingRef = useRef(false);

  const snapToGrid = useCallback((value: number) => {
    return Math.round(value / quantizeGrid) * quantizeGrid;
  }, [quantizeGrid]);

  const getActivePattern = useCallback((p: MIDIProject) => {
    return p.patterns.find(pattern => pattern.id === p.activePatternId) || p.patterns[0];
  }, []);

  const getTimelineLength = useCallback((p: MIDIProject) => {
    if (p.transportMode === 'pattern') {
      const activePattern = getActivePattern(p);
      return activePattern ? activePattern.length : p.patternLength;
    }
    const arrangementEnd = p.arrangement.reduce((maxEnd, clip) => {
      const clipLength = computePatternLength(p.tracks, clip.patternId);
      const clipEnd = clip.startBar + clipLength;
      return Math.max(maxEnd, clipEnd);
    }, p.patternLength);
    return Math.max(p.patternLength, arrangementEnd);
  }, [getActivePattern]);

  const getEngine = useCallback(() => {
    if (!engineRef.current) engineRef.current = new AudioEngine();
    if (engineRef.current.ctx.state === 'suspended') engineRef.current.ctx.resume();
    return engineRef.current;
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('aura_pro_sequencer_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<MIDIProject>;
        const fallbackPatternId = crypto.randomUUID();
        const tracks = (parsed.tracks ?? []).map(track => ({
          ...track,
          notes: (track.notes ?? []).map(note => ({
            ...note,
            patternId: note.patternId ?? (parsed.activePatternId || fallbackPatternId),
          })),
        }));
        const patterns = parsed.patterns && parsed.patterns.length > 0
          ? parsed.patterns
          : [{ id: parsed.activePatternId || fallbackPatternId, name: 'Pattern 1', length: parsed.patternLength || MIN_PATTERN_LENGTH }];
        const projectSafe = normalizeProjectPatterns({
          id: parsed.id || crypto.randomUUID(),
          name: parsed.name || 'midnight_studio_v1',
          bpm: parsed.bpm || 124,
          tracks,
          isPlaying: false,
          activeTrackId: parsed.activeTrackId || tracks[0]?.id || null,
          patternLength: parsed.patternLength || patterns[0]?.length || MIN_PATTERN_LENGTH,
          metronomeEnabled: parsed.metronomeEnabled ?? true,
          patterns,
          activePatternId: parsed.activePatternId || patterns[0].id,
          arrangement: parsed.arrangement && parsed.arrangement.length > 0
            ? parsed.arrangement
            : [{ id: crypto.randomUUID(), patternId: patterns[0].id, startBar: 0, lane: 0 }],
          transportMode: parsed.transportMode || 'pattern',
        });
        playheadRef.current = 0;
        setPlayheadTime(0);
        setProject(projectSafe);
      } catch (e) {
        console.error('Failed to load project:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (!project) return;
    const save = () => {
      try {
        localStorage.setItem('aura_pro_sequencer_v2', JSON.stringify(project));
      } catch (e) {
        console.error('Save failed:', e);
      }
    };
    const timer = window.setTimeout(save, 400);
    return () => window.clearTimeout(timer);
  }, [project]);

  // Auto-expand/shrink pattern length by note content; empty patterns stay at MIN_PATTERN_LENGTH.
  useEffect(() => {
    if (!project) return;
    setProject(prev => {
      if (!prev) return prev;
      const normalized = normalizeProjectPatterns(prev);
      const sameLength = normalized.patterns.every((pattern, i) => pattern.length === prev.patterns[i]?.length);
      if (sameLength && normalized.patternLength === prev.patternLength) {
        return prev;
      }
      return normalized;
    });
  }, [project?.tracks, project?.activePatternId]);

  useEffect(() => {
    const save = () => {
      const p = project;
      if (!p) return;
      try {
        localStorage.setItem('aura_pro_sequencer_v2', JSON.stringify(p));
      } catch {
        // ignore
      }
    };
    window.addEventListener('beforeunload', save);
    window.addEventListener('pagehide', save);
    const onVis = () => {
      if (document.visibilityState === 'hidden') save();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('beforeunload', save);
      window.removeEventListener('pagehide', save);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [project]);

  // ГЛОБАЛЬНЫЕ ОБРАБОТЧИКИ ДЛЯ ПЕРЕТАСКИВАНИЯ
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dragging = dragStateRef.current;
      if (!dragging) return;
      if (!project) return;
      
      const deltaX = e.clientX - dragging.startX;
      const deltaY = e.clientY - dragging.startY;
      const beatDelta = deltaX / zoom;
      const pitchDelta = Math.round(-deltaY / NOTE_HEIGHT);

      setProject(prev => {
        if (!prev) return prev;
        
        return {
          ...prev,
          tracks: prev.tracks.map(track => ({
            ...track,
            notes: track.notes.map(note => {
              if (note.id !== dragging.id) return note;
              
              if (dragging.type === 'move') {
                const newStartTime = Math.max(0, Math.min(prev.patternLength - quantizeGrid, dragging.origStart + beatDelta));
                const newPitch = Math.max(LOWEST_NOTE, Math.min(HIGHEST_NOTE, dragging.origPitch + pitchDelta));
                const quantized = snapToGrid(newStartTime);
                
                return {
                  ...note,
                  startTime: quantized,
                  pitch: newPitch,
                };
              } else if (dragging.type === 'resize') {
                const newDuration = Math.max(quantizeGrid, snapToGrid(dragging.origDur + beatDelta));
                
                return {
                  ...note,
                  duration: newDuration,
                };
              }
              
              return note;
            })
          }))
        };
      });
    };

    const handleMouseUp = () => {
      dragStateRef.current = null;
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, zoom, project, quantizeGrid, snapToGrid]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const dragging = playlistDragRef.current;
      if (!dragging) return;
      setProject(prev => {
        if (!prev) return prev;
        const deltaX = e.clientX - dragging.startX;
        const deltaY = e.clientY - dragging.startY;
        const startBar = snapToGrid(dragging.origStartBar + deltaX / zoom);
        const lane = Math.max(0, Math.min(PLAYLIST_LANES - 1, dragging.origLane + Math.round(deltaY / PLAYLIST_LANE_HEIGHT)));
        return {
          ...prev,
          arrangement: prev.arrangement.map(clip => clip.id === dragging.clipId ? { ...clip, startBar: Math.max(0, startBar), lane } : clip),
        };
      });
    };

    const handleMouseUp = () => {
      playlistDragRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [snapToGrid, zoom]);

  const createNewProject = () => {
    const trackId = crypto.randomUUID();
    const patternId = crypto.randomUUID();
    playheadRef.current = 0;
    setPlayheadTime(0);
    setProject({
      id: crypto.randomUUID(),
      name: "midnight_studio_v1",
      bpm: 124,
      tracks: [{
        id: trackId,
        name: "Neon Lead",
        instrument: 'synth',
        color: '#00D1FF',
        notes: [],
        muted: false,
        solo: false,
        volume: 0.8,
        pan: 0,
        reverbSend: 0.2,
        delaySend: 0.3
      }],
      isPlaying: false,
      activeTrackId: trackId,
      patternLength: MIN_PATTERN_LENGTH,
      metronomeEnabled: true,
      patterns: [{ id: patternId, name: 'Pattern 1', length: MIN_PATTERN_LENGTH }],
      activePatternId: patternId,
      arrangement: [{ id: crypto.randomUUID(), patternId, startBar: 0, lane: 0 }],
      transportMode: 'pattern',
    });
  };

  const togglePlayback = useCallback(() => {
    if (!project) return;
    
    if (project.isPlaying) {
      stopPlayback();
    } else {
      getEngine();
      startPlayback();
    }
  }, [project]);

  const startPlayback = useCallback(() => {
    if (!project) return;
    
    const eng = getEngine();
    const timelineLength = getTimelineLength(project);
    
    setProject(prev => prev ? { ...prev, isPlaying: true } : null);
    isPlayingRef.current = true;
    lastTimeRef.current = eng.ctx.currentTime;
    lastMetronomeBeatRef.current = -1;
    scheduledNotesRef.current.clear();
    playheadRef.current = Math.min(playheadRef.current, Math.max(0, timelineLength - quantizeGrid));
    let lastUiUpdate = 0;

    const scheduleNotes = () => {
      const snapshot = project;
      if (!snapshot) return;

      if (!isPlayingRef.current) {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        return;
      }

      const now = eng.ctx.currentTime;
      const delta = Math.min(now - lastTimeRef.current, 0.05);
      lastTimeRef.current = now;

      const bps = snapshot.bpm / 60;
      const beatDelta = delta * bps;
      const prevTime = playheadRef.current;
      let nextTime = prevTime + beatDelta;
      const currentTimelineLength = getTimelineLength(snapshot);

      if (snapshot.metronomeEnabled) {
        const currentBeat = Math.floor(nextTime);
        const lastBeat = Math.floor(prevTime);
        if (currentBeat !== lastBeat) {
          eng.playMetronome(0, currentBeat % 4 === 0);
        }
      }

      const lookahead = 0.2;
      const lookaheadBeats = lookahead * bps;
      const windowStart = prevTime;
      const windowEnd = windowStart + lookaheadBeats;
      const wrappedWindow = windowEnd >= currentTimelineLength;
      const normalizedWindowEnd = wrappedWindow ? windowEnd - currentTimelineLength : windowEnd;
      const soloExists = snapshot.tracks.some(t => t.solo);

      snapshot.tracks.forEach(track => {
        if (track.muted) return;
        if (soloExists && !track.solo) return;

        const scheduleNoteAt = (note: Note, absoluteStart: number) => {
          const noteKey = `${note.id}-${Math.floor(absoluteStart * 1000)}`;
          const isInWindow = wrappedWindow
            ? (absoluteStart >= windowStart || absoluteStart < normalizedWindowEnd)
            : (absoluteStart >= windowStart && absoluteStart < normalizedWindowEnd);
          if (isInWindow && !scheduledNotesRef.current.has(noteKey)) {
            scheduledNotesRef.current.add(noteKey);
            const beatsUntilNote = wrappedWindow && absoluteStart < windowStart
              ? absoluteStart + currentTimelineLength - windowStart
              : absoluteStart - windowStart;
            const delay = beatsUntilNote / bps;
            if (delay >= 0 && delay < lookahead) {
              eng.playNote(track, note.pitch, delay, note.duration / bps, note.velocity / 127);
            }
          }
        };

        if (snapshot.transportMode === 'pattern') {
          track.notes
            .filter(note => note.patternId === snapshot.activePatternId)
            .forEach(note => scheduleNoteAt(note, note.startTime));
        } else {
          snapshot.arrangement.forEach(clip => {
            const clipPattern = snapshot.patterns.find(pattern => pattern.id === clip.patternId);
            if (!clipPattern) return;
            track.notes
              .filter(note => note.patternId === clip.patternId)
              .forEach(note => scheduleNoteAt(note, clip.startBar + note.startTime));
          });
        }
      });

      if (nextTime >= currentTimelineLength) {
        nextTime = nextTime % currentTimelineLength;
        scheduledNotesRef.current.clear();
      }

      playheadRef.current = nextTime;
      if (now - lastUiUpdate > 1 / 30) {
        lastUiUpdate = now;
        setPlayheadTime(nextTime);
      }

      rafRef.current = requestAnimationFrame(scheduleNotes);
    };

    rafRef.current = requestAnimationFrame(scheduleNotes);
  }, [project, getEngine, getTimelineLength, quantizeGrid]);

  const stopPlayback = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    scheduledNotesRef.current.clear();
    isPlayingRef.current = false;
    playheadRef.current = 0;
    setPlayheadTime(0);
    setProject(prev => prev ? { ...prev, isPlaying: false } : null);
  }, []);

  const handleNewProject = useCallback(() => {
    stopPlayback();
    createNewProject();
    setSelectedNotes([]);
  }, [stopPlayback]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!project) return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayback();
      }

      if ((e.code === 'Delete' || e.code === 'Backspace') && selectedNotes.length > 0) {
        e.preventDefault();
        setProject(prev => prev ? ({
          ...prev,
          tracks: prev.tracks.map(track => ({
            ...track,
            notes: track.notes.filter(n => !selectedNotes.includes(n.id)),
          })),
        }) : prev);
        setSelectedNotes([]);
      }

      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyD' && selectedNotes.length > 0) {
        e.preventDefault();
        setProject(prev => {
          if (!prev) return prev;
          const activePattern = prev.patterns.find(pattern => pattern.id === prev.activePatternId) || prev.patterns[0];
          return {
            ...prev,
            tracks: prev.tracks.map(track => {
              const duplicates = track.notes
                .filter(n => selectedNotes.includes(n.id))
                .map(n => ({
                  ...n,
                  id: crypto.randomUUID(),
                  startTime: Math.min(activePattern.length - quantizeGrid, n.startTime + quantizeGrid),
                }));
              return { ...track, notes: [...track.notes, ...duplicates] };
            }),
          };
        });
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [project, selectedNotes, quantizeGrid, togglePlayback]);

  // КЛИК ПО ГРИДУ - ДОБАВЛЕНИЕ/УДАЛЕНИЕ НОТ
  const handleNoteContextDelete = useCallback((noteId: string) => {
    setProject(prev => prev ? ({
      ...prev,
      tracks: prev.tracks.map(track => ({
        ...track,
        notes: track.notes.filter(note => note.id !== noteId),
      })),
    }) : prev);
    setSelectedNotes(prev => prev.filter(id => id !== noteId));
  }, []);

  const handlePlaylistClipDelete = useCallback((clipId: string) => {
    setProject(prev => prev ? ({
      ...prev,
      arrangement: prev.arrangement.filter(clip => clip.id !== clipId),
    }) : prev);
  }, []);

  const handleGridClick = useCallback((e: React.MouseEvent) => {
    if (!project || !project.activeTrackId || isDragging) return;
    const activePattern = getActivePattern(project);
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const beat = x / zoom;
    const pitch = HIGHEST_NOTE - Math.floor(y / NOTE_HEIGHT);
    const quantizedBeat = snapToGrid(beat);

    setProject(prev => {
      if (!prev) return prev;
      const activeTrack = prev.tracks.find(t => t.id === prev.activeTrackId);
      if (!activeTrack) return prev;

      // Проверяем существующую ноту
      const existingNote = activeTrack.notes.find(n => 
        n.patternId === activePattern.id &&
        n.pitch === pitch && 
        Math.abs(n.startTime - quantizedBeat) < quantizeGrid / 2
      );

      if (existingNote) {
        // Удаляем ноту при повторном клике
        const newNotes = activeTrack.notes.filter(n => n.id !== existingNote.id);
        return {
          ...prev,
          tracks: prev.tracks.map(t => 
            t.id === prev.activeTrackId ? { ...t, notes: newNotes } : t
          )
        };
      }

      // Добавляем новую ноту
      const newNote: Note = {
        id: crypto.randomUUID(),
        pitch,
        startTime: quantizedBeat,
        duration: quantizeGrid,
        velocity: 100,
        trackId: prev.activeTrackId!,
        patternId: activePattern.id,
      };
      
      const eng = getEngine();
      eng.playNote(activeTrack, pitch, 0, 0.15);
      
      return {
        ...prev,
        tracks: prev.tracks.map(t => 
          t.id === prev.activeTrackId 
            ? { ...t, notes: [...t.notes, newNote] } 
            : t
        )
      };
    });
  }, [project, isDragging, zoom, getEngine, quantizeGrid, snapToGrid, getActivePattern]);

  // НАЧАЛО ПЕРЕТАСКИВАНИЯ НОТЫ
  const handleNoteMouseDown = useCallback((note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    dragStateRef.current = {
      id: note.id,
      type: 'move',
      startX: e.clientX,
      startY: e.clientY,
      origStart: note.startTime,
      origPitch: note.pitch,
      origDur: note.duration,
      trackId: note.trackId
    };
    setIsDragging(true);
    setSelectedNotes(prev => e.shiftKey ? (prev.includes(note.id) ? prev : [...prev, note.id]) : [note.id]);
  }, []);

  // НАЧАЛО РАСШИРЕНИЯ НОТЫ
  const handleResizeMouseDown = useCallback((note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    dragStateRef.current = {
      id: note.id,
      type: 'resize',
      startX: e.clientX,
      startY: e.clientY,
      origStart: note.startTime,
      origPitch: note.pitch,
      origDur: note.duration,
      trackId: note.trackId
    };
    setIsDragging(true);
    setSelectedNotes(prev => e.shiftKey ? (prev.includes(note.id) ? prev : [...prev, note.id]) : [note.id]);
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !project) return;
    
    const eng = getEngine();
    const sid = await eng.loadSample(file);
    const tid = crypto.randomUUID();
    
    const newTrack: Track = {
      id: tid,
      name: file.name.split('.')[0],
      instrument: 'custom',
      color: '#FFFFFF',
      notes: [],
      muted: false,
      solo: false,
      volume: 0.8,
      pan: 0,
      customSample: sid,
      reverbSend: 0,
      delaySend: 0
    };
    
    setProject({ 
      ...project, 
      tracks: [...project.tracks, newTrack], 
      activeTrackId: tid 
    });
  };

  const addDefaultTrack = (type: InstrumentType) => {
    if (!project) return;
    const inst = INSTRUMENTS.find(i => i.id === type) || INSTRUMENTS[0];
    const tid = crypto.randomUUID();
    
    const newTrack: Track = {
      id: tid,
      name: inst.name,
      instrument: type,
      color: inst.color,
      notes: [],
      muted: false,
      solo: false,
      volume: 0.7,
      pan: 0,
      reverbSend: 0,
      delaySend: 0
    };
    
    setProject({ 
      ...project, 
      tracks: [...project.tracks, newTrack],
      activeTrackId: tid
    });
  };

  const handleDeleteTrack = useCallback((trackId: string) => {
    if (!project || project.tracks.length <= 1) return;
    
    const newTracks = project.tracks.filter(t => t.id !== trackId);
    const newActiveTrackId = newTracks[0].id;
    
    setProject({
      ...project,
      tracks: newTracks,
      activeTrackId: newActiveTrackId
    });
  }, [project]);

  const duplicatePatternNotes = useCallback(() => {
    if (!project) return;
    const activePattern = getActivePattern(project);
    const offset = activePattern.length;
    setProject({
      ...project,
      tracks: project.tracks.map((track) => ({
        ...track,
        notes: [
          ...track.notes,
          ...track.notes
            .filter((n) => n.patternId === activePattern.id && n.startTime + n.duration <= offset)
            .map((n) => ({
              ...n,
              id: crypto.randomUUID(),
              startTime: n.startTime + offset,
            })),
        ],
      })),
    });
  }, [project, getActivePattern]);

  const createPattern = useCallback(() => {
    if (!project) return;
    const nextIndex = project.patterns.length + 1;
    const newPattern: Pattern = {
      id: crypto.randomUUID(),
      name: `Pattern ${nextIndex}`,
      length: MIN_PATTERN_LENGTH,
    };
    setProject({
      ...project,
      patterns: [...project.patterns, newPattern],
      activePatternId: newPattern.id,
      transportMode: 'pattern',
    });
    playheadRef.current = 0;
    setPlayheadTime(0);
  }, [project]);

  const addPatternToPlaylist = useCallback(() => {
    if (!project) return;
    const activePattern = getActivePattern(project);
    const nextStart = project.arrangement.reduce((maxStart, clip) => {
      const clipLength = computePatternLength(project.tracks, clip.patternId);
      const end = clip.startBar + clipLength;
      return Math.max(maxStart, end);
    }, 0);
    const laneUsage = new Set(project.arrangement.filter(clip => clip.startBar === nextStart).map(clip => clip.lane));
    let lane = 0;
    while (laneUsage.has(lane) && lane < PLAYLIST_LANES - 1) lane += 1;
    const clip: PlaylistClip = {
      id: crypto.randomUUID(),
      patternId: activePattern.id,
      startBar: nextStart,
      lane,
    };
    setProject({
      ...project,
      arrangement: [...project.arrangement, clip],
      transportMode: 'song',
    });
  }, [project, getActivePattern]);

  const addPatternClipAt = useCallback((patternId: string, startBar: number, lane: number) => {
    if (!project) return;
    const safeLane = Math.max(0, Math.min(PLAYLIST_LANES - 1, lane));
    const safeStartBar = Math.max(0, snapToGrid(startBar));
    const clip: PlaylistClip = {
      id: crypto.randomUUID(),
      patternId,
      startBar: safeStartBar,
      lane: safeLane,
    };
    setProject({
      ...project,
      arrangement: [...project.arrangement, clip],
      transportMode: 'song',
      activePatternId: patternId,
    });
    setEditorView('playlist');
  }, [project, snapToGrid]);

  const exportProject = () => {
    if (!project) return;
    
    const exportData = {
      ...project,
      exportDate: new Date().toISOString(),
      version: '2.0'
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string) as Partial<MIDIProject>;
        if (imported.tracks && imported.bpm) {
          const fallbackPatternId = imported.activePatternId || crypto.randomUUID();
          const patterns = imported.patterns && imported.patterns.length > 0
            ? imported.patterns
            : [{ id: fallbackPatternId, name: 'Pattern 1', length: imported.patternLength || MIN_PATTERN_LENGTH }];
          const upgraded: MIDIProject = {
            id: imported.id || crypto.randomUUID(),
            name: imported.name || 'imported_project',
            bpm: imported.bpm,
            tracks: imported.tracks.map(track => ({
              ...track,
              notes: track.notes.map(note => ({
                ...note,
                patternId: note.patternId || patterns[0].id,
              })),
            })),
            isPlaying: false,
            activeTrackId: imported.activeTrackId || imported.tracks[0]?.id || null,
            patternLength: imported.patternLength || patterns[0].length,
            metronomeEnabled: imported.metronomeEnabled ?? true,
            patterns,
            activePatternId: imported.activePatternId || patterns[0].id,
            arrangement: imported.arrangement && imported.arrangement.length > 0
              ? imported.arrangement
              : [{ id: crypto.randomUUID(), patternId: patterns[0].id, startBar: 0, lane: 0 }],
            transportMode: imported.transportMode || 'pattern',
          };
          playheadRef.current = 0;
          setPlayheadTime(0);
          setProject(normalizeProjectPatterns(upgraded));
        }
      } catch (err) {
        console.error('Failed to import project:', err);
      }
    };
    reader.readAsText(file);
  };

  if (!project) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{ textAlign: 'center', maxWidth: 500 }}>
          <div style={{ 
            width: 120, 
            height: 120, 
            background: 'linear-gradient(135deg, #00D1FF, #BD00FF)', 
            borderRadius: '2rem', 
            margin: '0 auto 32px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            boxShadow: '0 0 60px rgba(0,209,255,0.3), 0 0 120px rgba(189,0,255,0.2)',
          }}>
            <Speaker style={{ color: 'white', width: 60, height: 60 }} />
          </div>
          <h1 style={{ 
            fontSize: '64px', 
            fontWeight: '800', 
            marginBottom: '16px',
            background: 'linear-gradient(135deg, #00D1FF, #BD00FF)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-2px'
          }}>
            AURA PRO
          </h1>
          <p style={{ 
            color: '#888', 
            marginBottom: '48px', 
            fontSize: '14px', 
            textTransform: 'uppercase', 
            letterSpacing: '4px',
            fontWeight: '300'
          }}>
            Advanced MIDI Sequencer
          </p>
          
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 48 }}>
            <button 
              onClick={createNewProject}
              style={{ 
                padding: '16px 32px', 
                background: 'linear-gradient(135deg, #00D1FF, #BD00FF)', 
                color: 'white', 
                fontWeight: 'bold', 
                borderRadius: '16px', 
                border: 'none', 
                cursor: 'pointer',
                fontSize: '14px',
                letterSpacing: '1px',
                transition: 'transform 0.2s, box-shadow 0.2s',
                boxShadow: '0 8px 32px rgba(0,209,255,0.3)'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              New Session
            </button>
            
            <label style={{ 
              padding: '16px 32px', 
              background: 'rgba(255,255,255,0.05)', 
              color: 'white', 
              fontWeight: 'bold', 
              borderRadius: '16px', 
              border: '1px solid rgba(255,255,255,0.1)',
              cursor: 'pointer',
              fontSize: '14px',
              letterSpacing: '1px',
              transition: 'background 0.2s'
            }}>
              <input 
                type="file" 
                accept=".json" 
                onChange={importProject} 
                style={{ display: 'none' }} 
              />
              Import Project
            </label>
          </div>
          
          <div style={{ color: '#555', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase' }}>
            Press Space to Play • Click to Add Notes • Drag to Move
          </div>
        </div>
      </div>
    );
  }

  const activePattern = getActivePattern(project);
  const timelineLength = getTimelineLength(project);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh', 
      background: '#0a0a0a', 
      color: '#F5F5F7',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: '0 24px', 
        height: 64, 
        borderBottom: '1px solid rgba(255,255,255,0.05)', 
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(20px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 48 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ 
              width: 36, 
              height: 36, 
              borderRadius: 10, 
              background: 'linear-gradient(135deg, #00D1FF, #BD00FF)',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(0,209,255,0.3)'
            }}>
              <Activity size={18} style={{ color: 'white' }} />
            </div>
            <span style={{ 
              fontSize: '11px', 
              fontWeight: 'bold', 
              textTransform: 'uppercase', 
              letterSpacing: '2px' 
            }}>
              {project.name}
            </span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 32, paddingLeft: 32, borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '9px', color: '#666', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Tempo</span>
              <input 
                type="number" 
                value={project.bpm} 
                onChange={e => {
                  const val = parseInt(e.target.value);
                  if (val > 0 && val <= 300) setProject({...project, bpm: val});
                }}
                style={{ 
                  background: 'transparent', 
                  fontSize: '18px', 
                  fontFamily: 'monospace', 
                  width: 56, 
                  border: 'none', 
                  color: '#00D1FF', 
                  outline: 'none',
                  fontWeight: 'bold'
                }} 
              />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: 32, borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: '9px', color: '#666', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Metronome</span>
              <button 
                onClick={() => setProject({...project, metronomeEnabled: !project.metronomeEnabled})}
                style={{ 
                  fontSize: '10px', fontWeight: 'bold', background: 'none', border: 'none', 
                  cursor: 'pointer', color: project.metronomeEnabled ? '#00D1FF' : '#666',
                  letterSpacing: '1px', padding: '2px 0'
                }}
              >
                {project.metronomeEnabled ? 'ACTIVE' : 'MUTED'}
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: 32, borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: '9px', color: '#666', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Pattern Selector</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <select
                  value={project.activePatternId}
                  onChange={e => {
                    playheadRef.current = 0;
                    setPlayheadTime(0);
                    setProject({ ...project, activePatternId: e.target.value, transportMode: 'pattern' });
                  }}
                  style={{
                    background: 'transparent', border: 'none', color: '#00D1FF',
                    fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', outline: 'none'
                  }}
                >
                  {project.patterns.map(pattern => (
                    <option key={pattern.id} value={pattern.id}>{pattern.name}</option>
                  ))}
                </select>
                <button onClick={createPattern} style={{ border: 'none', background: 'rgba(0,209,255,0.15)', color: '#00D1FF', borderRadius: 6, cursor: 'pointer', padding: '2px 6px' }}>+</button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: 20, borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: '9px', color: '#666', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Length</span>
              <select
                value={activePattern.length}
                onChange={e => {
                  const nextLength = parseInt(e.target.value, 10);
                  setProject({
                    ...project,
                    patternLength: nextLength,
                    patterns: project.patterns.map(pattern => pattern.id === project.activePatternId ? { ...pattern, length: nextLength } : pattern),
                  });
                }}
                style={{
                  background: 'transparent', border: 'none', color: '#00D1FF',
                  fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', outline: 'none'
                }}
              >
                {Array.from(new Set([...PATTERN_LENGTH_OPTIONS, activePattern.length]))
                  .sort((a, b) => a - b)
                  .map(len => (
                    <option key={len} value={len}>{len} BARS</option>
                  ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: 32, borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: '9px', color: '#666', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Quantize</span>
              <select
                value={quantizeGrid}
                onChange={e => setQuantizeGrid(parseFloat(e.target.value))}
                style={{
                  background: 'transparent', border: 'none', color: '#00D1FF',
                  fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', outline: 'none'
                }}
              >
                <option value={0.5}>1/2</option>
                <option value={0.25}>1/4</option>
                <option value={0.125}>1/8</option>
                <option value={0.0625}>1/16</option>
                <option value={0.03125}>1/32</option>
              </select>
            </div>

            <button
              onClick={duplicatePatternNotes}
              title="Duplicate all notes to next pattern block"
              style={{
                padding: '6px 12px',
                background: 'rgba(0,209,255,0.15)',
                border: '1px solid rgba(0,209,255,0.3)',
                borderRadius: 8,
                color: '#00D1FF',
                fontSize: '10px',
                fontWeight: 'bold',
                cursor: 'pointer',
                letterSpacing: '1px',
              }}
            >
              DUP PATTERN
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, overflow: 'hidden' }}>
            <button
              onClick={() => setProject({ ...project, transportMode: 'pattern' })}
              style={{
                border: 'none',
                padding: '6px 10px',
                cursor: 'pointer',
                background: project.transportMode === 'pattern' ? 'rgba(0,209,255,0.2)' : 'transparent',
                color: project.transportMode === 'pattern' ? '#00D1FF' : '#888',
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              PATTERN
            </button>
            <button
              onClick={() => setProject({ ...project, transportMode: 'song' })}
              style={{
                border: 'none',
                padding: '6px 10px',
                cursor: 'pointer',
                background: project.transportMode === 'song' ? 'rgba(0,209,255,0.2)' : 'transparent',
                color: project.transportMode === 'song' ? '#00D1FF' : '#888',
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              SONG
            </button>
          </div>
          <button
            onClick={addPatternToPlaylist}
            style={{ border: '1px solid rgba(0,209,255,0.3)', background: 'rgba(0,209,255,0.1)', color: '#00D1FF', borderRadius: 8, cursor: 'pointer', fontSize: 10, padding: '7px 10px' }}
          >
            + TO PLAYLIST
          </button>
          <button
            onClick={handleNewProject}
            style={{ border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)', color: '#ddd', borderRadius: 8, cursor: 'pointer', fontSize: 10, padding: '7px 10px' }}
          >
            NEW PROJECT
          </button>
          <span style={{ fontSize: '9px', color: '#444', letterSpacing: '1px' }}>AUTO-SAVED</span>
          <div style={{ 
            display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 14, 
            padding: 4, border: '1px solid rgba(255,255,255,0.05)', gap: 4
          }}>
            <button onClick={stopPlayback} style={{ padding: '10px', background: 'none', border: 'none', borderRadius: 10, cursor: 'pointer', color: '#999' }}>
              <Square size={16} />
            </button>
            <button onClick={togglePlayback} style={{ 
              padding: '10px 20px', 
              background: project.isPlaying ? 'linear-gradient(135deg, #FF4500, #FFA500)' : 'linear-gradient(135deg, #00D1FF, #BD00FF)',
              border: 'none', borderRadius: 10, cursor: 'pointer', color: 'white',
              boxShadow: project.isPlaying ? '0 4px 20px rgba(255,69,0,0.3)' : '0 4px 20px rgba(0,209,255,0.3)'
            }}>
              {project.isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>
          </div>
          
          <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.05)' }} />
          
          <button onClick={() => setProject(null)} style={{ padding: '8px', background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{ 
          width: 300, borderRight: '1px solid rgba(255,255,255,0.05)', 
          background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(20px)',
          display: 'flex', flexDirection: 'column', flexShrink: 0 
        }}>
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24, overflowY: 'auto', flex: 1 }}>
            <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 12, background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px', color: '#777', marginBottom: 8 }}>Browser</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {project.patterns.map(pattern => (
                  <button
                    key={pattern.id}
                    onClick={() => setProject({ ...project, activePatternId: pattern.id, transportMode: 'pattern' })}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/x-pattern-id', pattern.id);
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '6px 8px',
                      borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: pattern.id === project.activePatternId ? 'rgba(0,209,255,0.12)' : 'rgba(255,255,255,0.02)',
                      color: pattern.id === project.activePatternId ? '#00D1FF' : '#a3a3a3',
                      cursor: 'pointer',
                      fontSize: 11,
                    }}
                  >
                    <span>{pattern.name}</span>
                    <span>{pattern.length} bars</span>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '2px', color: '#666' }}>Track List</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="file" id="sample-in" style={{ display: 'none' }} accept="audio/*" onChange={handleFileUpload} />
                <label htmlFor="sample-in" style={{ 
                  padding: '8px', borderRadius: 8, cursor: 'pointer',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Upload size={14} />
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {project.tracks.map(track => (
                <div key={track.id} onClick={() => setProject({...project, activeTrackId: track.id})} style={{ 
                  padding: 16, borderRadius: 16, border: '1px solid', cursor: 'pointer', 
                  transition: 'all 0.2s', 
                  background: project.activeTrackId === track.id ? 'rgba(255,255,255,0.08)' : 'transparent', 
                  borderColor: project.activeTrackId === track.id ? 'rgba(255,255,255,0.15)' : 'transparent', 
                  opacity: project.activeTrackId === track.id ? 1 : 0.5
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: track.color, boxShadow: `0 0 12px ${track.color}` }} />
                      <span style={{ fontSize: '12px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>{track.name}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={e => { e.stopPropagation(); setProject({...project, tracks: project.tracks.map(t => t.id === track.id ? {...t, muted: !t.muted} : t)}); }} style={{ 
                        width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        fontSize: '9px', fontWeight: 'bold', borderRadius: 6, border: 'none', cursor: 'pointer', 
                        background: track.muted ? '#ff4444' : 'rgba(255,255,255,0.1)', color: 'white'
                      }}>M</button>
                      <button onClick={e => { e.stopPropagation(); setProject({...project, tracks: project.tracks.map(t => t.id === track.id ? {...t, solo: !t.solo} : t)}); }} style={{ 
                        width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        fontSize: '9px', fontWeight: 'bold', borderRadius: 6, border: 'none', cursor: 'pointer', 
                        background: track.solo ? '#00D1FF' : 'rgba(255,255,255,0.1)', color: 'white'
                      }}>S</button>
                      {project.tracks.length > 1 && (
                        <button onClick={e => { e.stopPropagation(); handleDeleteTrack(track.id); }} style={{ 
                          width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', 
                          fontSize: '12px', fontWeight: 'bold', borderRadius: 6, border: 'none', cursor: 'pointer', 
                          background: 'rgba(255,68,68,0.2)', color: '#ff4444'
                        }}>×</button>
                      )}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Volume2 size={12} style={{ color: '#666' }} />
                    <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: track.color, width: `${track.volume * 100}%`, borderRadius: 2, boxShadow: `0 0 8px ${track.color}44` }} />
                    </div>
                    <span style={{ fontSize: '9px', color: '#666', fontFamily: 'monospace', minWidth: 32, textAlign: 'right' }}>{Math.round(track.volume * 100)}%</span>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <h3 style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '2px', color: '#666', marginBottom: 16 }}>Add Instrument</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {INSTRUMENTS.map(inst => (
                  <button key={inst.id} onClick={() => addDefaultTrack(inst.id)} style={{ 
                    padding: 14, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', 
                    borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s', 
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: '#999'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = inst.color; e.currentTarget.style.color = inst.color; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#999'; }}>
                    <inst.icon size={16} />
                    <span style={{ fontSize: '8px', fontWeight: 'bold', letterSpacing: '1px' }}>{inst.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Piano Roll */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', background: '#0a0a0a', overflow: 'hidden' }}>
          {/* Toolbar */}
          <div style={{ 
            height: 40, borderBottom: '1px solid rgba(255,255,255,0.05)', 
            display: 'flex', alignItems: 'center', padding: '0 24px', gap: 32, 
            fontSize: '10px', letterSpacing: '1px', fontFamily: 'monospace', color: '#666', flexShrink: 0 
          }}>
            <span>TIMELINE VIEW</span>
            <div style={{ display: 'flex', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, overflow: 'hidden' }}>
              <button
                onClick={() => setEditorView('piano')}
                style={{ border: 'none', padding: '4px 8px', cursor: 'pointer', background: editorView === 'piano' ? 'rgba(0,209,255,0.18)' : 'transparent', color: editorView === 'piano' ? '#00D1FF' : '#888', fontSize: 10 }}
              >
                PIANO
              </button>
              <button
                onClick={() => setEditorView('playlist')}
                style={{ border: 'none', padding: '4px 8px', cursor: 'pointer', background: editorView === 'playlist' ? 'rgba(0,209,255,0.18)' : 'transparent', color: editorView === 'playlist' ? '#00D1FF' : '#888', fontSize: 10 }}
              >
                PLAYLIST
              </button>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <button onClick={() => setZoom(z => Math.max(50, z - 20))} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>Zoom -</button>
              <button onClick={() => setZoom(z => Math.min(600, z + 20))} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>Zoom +</button>
              <button onClick={() => setProject({...project, tracks: project.tracks.map(t => ({...t, notes: []}))})} style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', fontWeight: 'bold' }}>Clear All</button>
              <button onClick={exportProject} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>Export JSON</button>
            </div>
          </div>

          {editorView === 'piano' && (
          <div style={{ flex: 1, overflow: 'auto', position: 'relative', userSelect: 'none' }}>
            <div style={{ display: 'flex', minHeight: '100%' }}>
              {/* Piano Keyboard */}
              <div style={{ 
                width: 64, position: 'sticky', left: 0, zIndex: 30, 
                borderRight: '1px solid rgba(255,255,255,0.05)', 
                background: 'rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column', flexShrink: 0 
              }}>
                {Array.from({ length: TOTAL_NOTES }).map((_, i) => {
                  const pitch = HIGHEST_NOTE - i;
                  const isC = pitch % 12 === 0;
                  const isBlack = [1, 3, 6, 8, 10].includes(pitch % 12);
                  return (
                    <div key={pitch} style={{ 
                      height: NOTE_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', 
                      paddingRight: 12, borderBottom: '1px solid rgba(255,255,255,0.01)', 
                      fontSize: '9px', fontFamily: 'monospace', 
                      background: isBlack ? 'rgba(0,0,0,0.4)' : 'transparent', 
                      color: isC ? '#00D1FF' : '#666', fontWeight: isC ? 'bold' : 'normal' 
                    }}>
                      {isC ? `C${Math.floor(pitch/12)-1}` : ''}
                    </div>
                  );
                })}
              </div>

              {/* Grid */}
              <div style={{ 
                position: 'relative', flex: 1, 
                background: 'radial-gradient(rgba(255,255,255,0.02) 1px, transparent 1px)', 
                backgroundSize: '40px 40px', 
                width: activePattern.length * zoom, 
                height: TOTAL_NOTES * NOTE_HEIGHT 
              }}>
                {/* Horizontal grid lines */}
                {Array.from({ length: TOTAL_NOTES }).map((_, i) => (
                  <div key={`h-${i}`} style={{ 
                    position: 'absolute', left: 0, right: 0, height: 1, 
                    background: i % 12 === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)', 
                    top: i * NOTE_HEIGHT 
                  }} />
                ))}
                
                {/* Vertical grid lines */}
                {Array.from({ length: activePattern.length * Math.round(1 / quantizeGrid) + 1 }).map((_, i) => (
                  <div key={`v-${i}`} style={{ 
                    position: 'absolute', top: 0, bottom: 0, width: 1, 
                    left: i * (zoom * quantizeGrid), 
                    background: i % Math.round(4 / quantizeGrid) === 0 ? 'rgba(255,255,255,0.2)' : 
                               i % Math.round(1 / quantizeGrid) === 0 ? 'rgba(255,255,255,0.08)' : 
                               'rgba(255,255,255,0.02)' 
                  }} />
                ))}

                {/* Notes */}
                {project.tracks.map(track => (
                  track.notes.filter(note => note.patternId === activePattern.id).map(note => {
                    const isActive = project.activeTrackId === track.id;
                    const isDraggingNote = dragStateRef.current?.id === note.id;
                    
                    return (
                      <div 
                        key={note.id} 
                        onMouseDown={(e) => handleNoteMouseDown(note, e)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleNoteContextDelete(note.id);
                        }}
                        style={{
                          position: 'absolute',
                          left: note.startTime * zoom,
                          top: (HIGHEST_NOTE - note.pitch) * NOTE_HEIGHT,
                          width: Math.max(8, note.duration * zoom),
                          height: NOTE_HEIGHT - 1,
                          backgroundColor: track.color,
                          opacity: isActive ? 0.9 : 0.3,
                          borderRadius: 4,
                          border: `1px solid ${isDraggingNote ? '#FFFFFF' : 'rgba(0,0,0,0.3)'}`,
                          cursor: isDraggingNote ? 'grabbing' : 'grab',
                          zIndex: isActive ? 20 : 10,
                          boxShadow: isActive ? `0 0 16px ${track.color}66, inset 0 1px 0 rgba(255,255,255,0.2)` : 'none',
                          transition: isDraggingNote ? 'none' : 'box-shadow 0.2s',
                        }}
                      >
                        {/* Resize handle */}
                        <div 
                          onMouseDown={(e) => handleResizeMouseDown(note, e)}
                          style={{ 
                            position: 'absolute', right: -2, top: 0, bottom: 0, 
                            width: 12, cursor: 'ew-resize',
                            background: 'rgba(255,255,255,0.1)',
                            borderRadius: '0 4px 4px 0',
                            opacity: isActive ? 1 : 0,
                            transition: 'opacity 0.2s'
                          }}
                          onMouseEnter={e => { if (isActive) e.currentTarget.style.opacity = '1'; }}
                          onMouseLeave={e => { if (isActive && !isDragging) e.currentTarget.style.opacity = '0'; }}
                        />
                      </div>
                    );
                  })
                ))}

                {/* Playhead */}
                <div style={{ 
                  position: 'absolute', top: 0, bottom: 0, width: 3, 
                  background: '#00D1FF', zIndex: 40, 
                  boxShadow: '0 0 20px #00D1FF', 
                  left: playheadTime * zoom 
                }}>
                  <div style={{ 
                    position: 'absolute', top: -4, left: -5, 
                    width: 12, height: 12, background: '#00D1FF', 
                    borderRadius: '50%', boxShadow: '0 0 15px #00D1FF' 
                  }} />
                </div>

                {/* Clickable area */}
                <div 
                  style={{ position: 'absolute', inset: 0, zIndex: 5, cursor: isDragging ? 'grabbing' : 'crosshair' }} 
                  onClick={handleGridClick} 
                />
              </div>
            </div>
          </div>
          )}

          {/* Playlist */}
          <div style={{ height: editorView === 'playlist' ? '100%' : 220, borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.35)', padding: '10px 12px', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: '#8a8a8a', letterSpacing: '1px' }}>PLAYLIST</span>
              <span style={{ fontSize: 10, color: '#5f5f5f' }}>{project.transportMode.toUpperCase()} • {timelineLength} bars</span>
            </div>
            <div
              style={{
                position: 'relative',
                width: PLAYLIST_LABEL_WIDTH + timelineLength * zoom,
                minHeight: Math.max(PLAYLIST_LANES * PLAYLIST_LANE_HEIGHT + 30, editorView === 'playlist' ? 430 : PLAYLIST_LANES * PLAYLIST_LANE_HEIGHT + 30),
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8,
                background: '#111',
                overflow: 'hidden',
              }}
              onDragOver={(e) => {
                if (e.dataTransfer.types.includes('application/x-pattern-id')) {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'copy';
                }
              }}
              onDrop={(e) => {
                const patternId = e.dataTransfer.getData('application/x-pattern-id');
                if (!patternId) return;
                e.preventDefault();
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left - PLAYLIST_LABEL_WIDTH;
                const y = e.clientY - rect.top - 30;
                const startBar = x / zoom;
                const lane = Math.floor(y / PLAYLIST_LANE_HEIGHT);
                addPatternClipAt(patternId, startBar, lane);
              }}
            >
              <div style={{ position: 'absolute', left: 0, top: 0, width: PLAYLIST_LABEL_WIDTH, height: 30, borderRight: '1px solid rgba(255,255,255,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)', background: '#161616', zIndex: 6 }} />
              <div style={{ position: 'absolute', left: PLAYLIST_LABEL_WIDTH, top: 0, width: timelineLength * zoom, height: 30, borderBottom: '1px solid rgba(255,255,255,0.08)', background: '#141414', zIndex: 5 }}>
                {Array.from({ length: timelineLength + 1 }).map((_, bar) => (
                  <div key={`bar-${bar}`} style={{ position: 'absolute', left: bar * zoom, top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.18)' }}>
                    <span style={{ position: 'absolute', top: 7, left: 4, fontSize: 10, color: '#6e6e6e', fontFamily: 'monospace' }}>{bar + 1}</span>
                  </div>
                ))}
                {Array.from({ length: timelineLength * 4 + 1 }).map((_, step) => (
                  <div
                    key={`sub-${step}`}
                    style={{
                      position: 'absolute',
                      left: step * (zoom / 4),
                      top: 16,
                      bottom: 0,
                      width: 1,
                      background: step % 4 === 0 ? 'transparent' : 'rgba(255,255,255,0.05)',
                    }}
                  />
                ))}
              </div>

              {Array.from({ length: PLAYLIST_LANES }).map((_, lane) => (
                <div
                  key={`lane-${lane}`}
                  style={{
                    position: 'absolute',
                    left: 0,
                    width: PLAYLIST_LABEL_WIDTH,
                    top: 30 + lane * PLAYLIST_LANE_HEIGHT,
                    height: PLAYLIST_LANE_HEIGHT,
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                    borderRight: '1px solid rgba(255,255,255,0.08)',
                    borderBottom: '1px solid rgba(0,0,0,0.4)',
                    background: lane % 2 === 0 ? '#141414' : '#121212',
                    color: '#5b6670',
                    fontSize: 9,
                    padding: '8px 6px',
                    letterSpacing: '0.5px',
                    zIndex: 4,
                  }}
                >
                  Track {lane + 1}
                </div>
              ))}
              <div style={{ position: 'absolute', left: PLAYLIST_LABEL_WIDTH, top: 30, width: timelineLength * zoom, height: PLAYLIST_LANES * PLAYLIST_LANE_HEIGHT }}>
                {Array.from({ length: PLAYLIST_LANES }).map((_, lane) => (
                  <div
                    key={`lane-grid-${lane}`}
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: lane * PLAYLIST_LANE_HEIGHT,
                      height: PLAYLIST_LANE_HEIGHT,
                      borderTop: '1px solid rgba(255,255,255,0.05)',
                      borderBottom: '1px solid rgba(0,0,0,0.35)',
                      background: lane % 2 === 0 ? '#131313' : '#101010',
                    }}
                  />
                ))}
                {Array.from({ length: timelineLength * 4 + 1 }).map((_, step) => (
                  <div
                    key={`timeline-step-${step}`}
                    style={{
                      position: 'absolute',
                      left: step * (zoom / 4),
                      top: 0,
                      bottom: 0,
                      width: 1,
                      background: step % 4 === 0 ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.04)',
                    }}
                  />
                ))}
              </div>
              {project.arrangement.map(clip => {
                const pattern = project.patterns.find(item => item.id === clip.patternId);
                if (!pattern) return null;
                const clipLength = computePatternLength(project.tracks, clip.patternId);
                const selected = clip.patternId === project.activePatternId;
                return (
                  <div
                    key={clip.id}
                    onClick={() => setProject({ ...project, activePatternId: clip.patternId, transportMode: 'song' })}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handlePlaylistClipDelete(clip.id);
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      playlistDragRef.current = {
                        clipId: clip.id,
                        startX: e.clientX,
                        startY: e.clientY,
                        origStartBar: clip.startBar,
                        origLane: clip.lane,
                      };
                    }}
                    style={{
                      position: 'absolute',
                      left: PLAYLIST_LABEL_WIDTH + clip.startBar * zoom + 1,
                      top: 30 + clip.lane * PLAYLIST_LANE_HEIGHT + 4,
                      width: Math.max(24, clipLength * zoom - 2),
                      height: PLAYLIST_LANE_HEIGHT - 8,
                      borderRadius: 4,
                      border: selected ? '1px solid #00D1FF' : '1px solid rgba(255,255,255,0.2)',
                      background: selected ? 'linear-gradient(180deg, rgba(0,209,255,0.35), rgba(0,209,255,0.18))' : 'linear-gradient(180deg, rgba(0,209,255,0.22), rgba(0,209,255,0.1))',
                      color: selected ? '#d8faff' : '#95c6d2',
                      fontSize: 9,
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 6px',
                      cursor: 'grab',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      zIndex: 6,
                    }}
                  >
                    {pattern.name}
                  </div>
                );
              })}
              <div
                style={{
                  position: 'absolute',
                  top: 30,
                  bottom: 0,
                  width: 2,
                  background: '#00D1FF',
                  boxShadow: '0 0 12px rgba(0,209,255,0.8)',
                  left: PLAYLIST_LABEL_WIDTH + playheadTime * zoom,
                  zIndex: 7,
                  pointerEvents: 'none',
                }}
              />
            </div>
          </div>

          {/* Bottom Mixer */}
          <div style={{ 
            height: 128, borderTop: '1px solid rgba(255,255,255,0.05)', 
            display: 'flex', alignItems: 'center', padding: '0 40px', gap: 64, 
            flexShrink: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(20px)'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 200 }}>
              <h3 style={{ fontSize: 14, fontStyle: 'italic', fontFamily: 'serif', color: '#00D1FF', margin: 0, letterSpacing: '1px' }}>MASTER FX</h3>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', fontWeight: 'bold', color: '#666', textTransform: 'uppercase' }}>
                    <span>Reverb</span>
                    <span>25%</span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: '#00D1FF', width: '25%', boxShadow: '0 0 10px #00D1FF' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', fontWeight: 'bold', color: '#666', textTransform: 'uppercase' }}>
                    <span>Delay</span>
                    <span>33%</span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: '#BD00FF', width: '33%', boxShadow: '0 0 10px #BD00FF' }} />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ width: 1, height: 48, background: 'rgba(255,255,255,0.05)' }} />

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#666', textTransform: 'uppercase', letterSpacing: '2px' }}>Waveform Monitor</div>
              <div style={{ 
                height: 48, background: 'rgba(0,0,0,0.8)', borderRadius: 8, 
                border: '1px solid rgba(255,255,255,0.05)', display: 'flex', 
                alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' 
              }}>
                <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: '100%', padding: '0 16px', width: '100%' }}>
                  {Array.from({ length: 64 }).map((_, i) => (
                    <div key={i} style={{ 
                      flex: 1, 
                      height: project.isPlaying ? `${Math.random() * 80 + 10}%` : '5%', 
                      background: 'rgba(0,209,255,0.3)', 
                      borderRadius: '2px 2px 0 0',
                      transition: 'height 0.1s'
                    }} />
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16 }}>
              <button onClick={exportProject} style={{ 
                padding: '12px 24px', background: 'rgba(0,209,255,0.1)', 
                border: '1px solid rgba(0,209,255,0.2)', borderRadius: 16, 
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, 
                cursor: 'pointer', color: '#00D1FF', transition: 'all 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,209,255,0.2)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(0,209,255,0.3)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,209,255,0.1)'; e.currentTarget.style.boxShadow = 'none'; }}>
                <Download size={20} />
                <span style={{ fontSize: '8px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Export</span>
              </button>
              
              <label style={{ 
                padding: '12px 24px', background: 'rgba(255,255,255,0.05)', 
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, 
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, 
                cursor: 'pointer', color: '#666', transition: 'all 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#666'; }}>
                <Upload size={20} />
                <span style={{ fontSize: '8px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Import</span>
                <input type="file" accept=".json" onChange={importProject} style={{ display: 'none' }} />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MIDI() {
  return (
    <DesktopOnlyGate feature="MIDI секвенсор" hint="Редактор нот удобнее на компьютере или планшете в альбомной ориентации.">
      <MIDISequencer />
    </DesktopOnlyGate>
  );
}