import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Pause, Square, Plus, Trash2, Music, Piano, Drum, Guitar,
  Download, Upload, Repeat, Sliders, Activity, Volume2,
  MoreVertical, X, Check, Save, Headphones, Waves, Settings,
  Radio, Zap, Wind, Speaker, Undo2, ArrowLeft, FolderOpen, RefreshCw, Mic, MicOff, Pencil
} from 'lucide-react';
import DesktopOnlyGate from '../components/DesktopOnlyGate';
import { getAuthUserId } from '../lib/authToken';
import { midiProjectsApi, type MidiProjectSummary } from '../api/midiProjects';
import {
  EQ_GAIN_LIMIT,
  EQ_BANDS,
  type ClipFx,
  VOCAL_FX_PRESETS,
  clampEqGain,
  normalizeClipFx,
  makeDistortionCurve,
  createImpulseReverb,
} from '../lib/vocalFx';

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
  /** Position on the playlist timeline (in bars) */
  startBar: number;
  lane: number;
  /** Offset into the pattern/audio (beats) */
  offsetBeats: number;
  /** Visible/playable length of this clip (beats) */
  lengthBeats: number;
  /** 'audio' clips play a dropped mp3/wav loop instead of a pattern */
  type?: 'pattern' | 'audio';
  sampleId?: string;
  name?: string;
  /** Natural duration of the audio file in seconds */
  sampleSeconds?: number;
  /** Recorded from the microphone (vocal take) */
  isVocal?: boolean;
  /** Playback volume 0..2 for audio clips */
  gain?: number;
  /** Per-clip EQ (legacy, merged into fx) */
  eq?: TrackEq;
  /** Vocal / audio processing chain */
  fx?: ClipFx;
}

interface TrackEq {
  enabled: boolean;
  /** Gain in dB, -12..+12 */
  low: number;
  mid: number;
  high: number;
}

/** Full vocal/audio insert FX — see ../lib/vocalFx */

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
  /** Natural length of loaded one-shot in seconds */
  sampleDuration?: number;
  reverbSend: number;
  delaySend: number;
  eq?: TrackEq;
}

const EQ_PRESETS: { id: string; name: string; low: number; mid: number; high: number }[] = [
  { id: 'flat', name: 'Флэт', low: 0, mid: 0, high: 0 },
  { id: 'bass', name: 'Мощный бас', low: 9, mid: -2, high: 1 },
  { id: 'bright', name: 'Яркий верх', low: -1, mid: 1, high: 8 },
  { id: 'vocal', name: 'Вокал', low: -3, mid: 5, high: 2 },
  { id: 'lofi', name: 'Lo-Fi', low: 4, mid: -6, high: -8 },
];

/** Typical browser mic + MediaRecorder lag */
const VOCAL_REC_LATENCY_SEC = 0.16;

function normalizeTrackEq(eq: Partial<TrackEq> | undefined): TrackEq {
  return {
    enabled: Boolean(eq?.enabled),
    low: clampEqGain(eq?.low),
    mid: clampEqGain(eq?.mid),
    high: clampEqGain(eq?.high),
  };
}

const PROJECT_STORAGE_PREFIX = 'aura_pro_sequencer_v2';
const LEGACY_PROJECT_STORAGE_KEY = 'aura_pro_sequencer_v2';
const MAX_SAMPLE_BYTES = 6 * 1024 * 1024;
/** MP3 encoder/decoder delay — silent gap at the start (~20ms / 0.02s) */
const MP3_START_TRIM_SEC = 0.02;

function looksLikeMp3(fileOrBytes: File | ArrayBuffer | string): boolean {
  if (typeof fileOrBytes === 'string') {
    return /\.mp3$/i.test(fileOrBytes) || /mpeg|mp3/i.test(fileOrBytes);
  }
  if (typeof File !== 'undefined' && fileOrBytes instanceof File) {
    return /\.mp3$/i.test(fileOrBytes.name) || /mpeg|mp3/i.test(fileOrBytes.type);
  }
  const bytes = new Uint8Array(fileOrBytes as ArrayBuffer);
  if (bytes.length < 3) return false;
  // ID3 tag or MPEG frame sync
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) return true;
  if (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) return true;
  return false;
}

function trimAudioBufferStart(ctx: AudioContext, buffer: AudioBuffer, trimSec: number): AudioBuffer {
  const startFrame = Math.floor(trimSec * buffer.sampleRate);
  if (startFrame <= 0 || startFrame >= buffer.length - 1) return buffer;
  const newLen = buffer.length - startFrame;
  const trimmed = ctx.createBuffer(buffer.numberOfChannels, newLen, buffer.sampleRate);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    trimmed.copyToChannel(buffer.getChannelData(ch).subarray(startFrame), ch);
  }
  return trimmed;
}

/** Remove leading near-silence (MediaRecorder / encoder padding) */
function trimLeadingSilence(
  ctx: AudioContext,
  buffer: AudioBuffer,
  threshold = 0.018,
  maxTrimSec = 0.4,
): AudioBuffer {
  const data = buffer.getChannelData(0);
  const maxSamples = Math.min(data.length - 1, Math.floor(maxTrimSec * buffer.sampleRate));
  let start = 0;
  while (start < maxSamples && Math.abs(data[start]) < threshold) start += 1;
  // keep a tiny pre-roll so attacks aren't clipped
  start = Math.max(0, start - Math.floor(0.008 * buffer.sampleRate));
  if (start < 128) return buffer;
  return trimAudioBufferStart(ctx, buffer, start / buffer.sampleRate);
}

/** Per-user save key so projects don't leak between accounts on the same browser */
function getProjectStorageKey(): string {
  const userId = getAuthUserId();
  return userId ? `${PROJECT_STORAGE_PREFIX}:${userId}` : `${PROJECT_STORAGE_PREFIX}:guest`;
}

function getProjectDraftStorageKey(projectId: string): string {
  return `${PROJECT_STORAGE_PREFIX}:draft:${getAuthUserId() || 'guest'}:${projectId}`;
}

function getSampleServerMarkerKey(sampleId: string): string {
  return `${PROJECT_STORAGE_PREFIX}:sample-server:${sampleId}`;
}

function readProjectDraft(projectId: string): Partial<MIDIProject> | null {
  const key = getProjectDraftStorageKey(projectId);
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Partial<MIDIProject>;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

/** Load a saved project for the current user, migrating the old shared save once */
function readSavedProject(): string | null {
  const key = getProjectStorageKey();
  const scoped = localStorage.getItem(key);
  if (scoped) return scoped;

  // One-time migration: the first account that opens the editor takes over the
  // legacy shared save, after which other accounts start from scratch.
  const legacy = localStorage.getItem(LEGACY_PROJECT_STORAGE_KEY);
  if (legacy && key !== LEGACY_PROJECT_STORAGE_KEY) {
    try {
      localStorage.setItem(key, legacy);
      localStorage.removeItem(LEGACY_PROJECT_STORAGE_KEY);
    } catch {
      // storage full — still return the legacy data for this session
    }
    return legacy;
  }
  return null;
}

const SAMPLE_DB_NAME = 'aura_midi_samples';
const SAMPLE_STORE = 'buffers';
const SAMPLE_DB_VERSION = 2;

let sampleDbPromise: Promise<IDBDatabase> | null = null;

function openSampleDb(): Promise<IDBDatabase> {
  if (sampleDbPromise) return sampleDbPromise;
  sampleDbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(SAMPLE_DB_NAME, SAMPLE_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(SAMPLE_STORE)) {
        db.createObjectStore(SAMPLE_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      sampleDbPromise = null;
      reject(req.error);
    };
    req.onblocked = () => {
      console.warn('IndexedDB open blocked — close other tabs with MIDI editor');
    };
  });
  return sampleDbPromise;
}

async function saveSampleToDb(id: string, arrayBuffer: ArrayBuffer): Promise<void> {
  // Blob is more reliably persisted across reloads than raw ArrayBuffer
  const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' });
  const db = await openSampleDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(SAMPLE_STORE, 'readwrite');
    tx.objectStore(SAMPLE_STORE).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('IndexedDB save aborted'));
  });
}

async function loadSampleFromDb(id: string): Promise<ArrayBuffer | null> {
  const db = await openSampleDb();
  const result = await new Promise<unknown>((resolve, reject) => {
    const tx = db.transaction(SAMPLE_STORE, 'readonly');
    const req = tx.objectStore(SAMPLE_STORE).get(id);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
  if (!result) return null;
  if (result instanceof ArrayBuffer) return result.slice(0);
  if (ArrayBuffer.isView(result)) {
    const view = result as ArrayBufferView;
    const bytes = new Uint8Array(view.byteLength);
    bytes.set(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
    return bytes.buffer;
  }
  if (typeof Blob !== 'undefined' && result instanceof Blob) {
    return (await result.arrayBuffer()).slice(0);
  }
  return null;
}

async function sampleExistsInDb(id: string): Promise<boolean> {
  const db = await openSampleDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SAMPLE_STORE, 'readonly');
    const req = tx.objectStore(SAMPLE_STORE).count(IDBKeyRange.only(id));
    req.onsuccess = () => resolve(req.result > 0);
    req.onerror = () => reject(req.error);
  });
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
  type: 'move' | 'resize-left' | 'resize-right';
  startX: number;
  startY: number;
  origStartBar: number;
  origLane: number;
  origOffsetBeats: number;
  origLengthBeats: number;
  /** Multi-move: original positions for all clips being dragged */
  moveGroup?: Array<{
    clipId: string;
    startBar: number;
    lane: number;
  }>;
};

// ================= СТИЛИ =================
const STUDIO_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');

.midi-studio {
  --st-bg: #050505;
  --st-surface: #0e0e0f;
  --st-elevated: #171718;
  --st-hover: #1f1f21;
  --st-line: rgba(255,255,255,0.1);
  --st-line-strong: rgba(255,255,255,0.18);
  --st-text: #f5f5f7;
  --st-muted: #8e8e93;
  --st-dim: #636366;
  --st-red: #ff453a;
  --st-green: #30d158;
  --st-amber: #ffd60a;
  display: flex;
  flex-direction: column;
  height: 100vh;
  background:
    radial-gradient(1200px 500px at 10% -10%, rgba(255,255,255,0.04), transparent 55%),
    var(--st-bg);
  color: var(--st-text);
  font-family: 'Instrument Sans', ui-sans-serif, sans-serif;
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
}

.midi-studio * { box-sizing: border-box; }

.st-topbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 16px;
  min-height: 58px;
  padding: 10px 18px;
  border-bottom: 1px solid var(--st-line);
  background: rgba(14,14,15,0.92);
  backdrop-filter: blur(18px);
}

.st-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.st-brand-mark {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  border: 1px solid var(--st-line);
  background: var(--st-elevated);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--st-text);
  flex-shrink: 0;
}

.st-project-name {
  width: 140px;
  background: transparent;
  border: none;
  outline: none;
  color: var(--st-text);
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.st-project-name:focus {
  border-bottom: 1px solid var(--st-line-strong);
}

.st-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 0;
  padding-left: 14px;
  border-left: 1px solid var(--st-line);
}

.st-field {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 12px;
  border-left: 1px solid transparent;
}

.st-field + .st-field { border-left-color: var(--st-line); }

.st-label {
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--st-dim);
}

.st-input, .st-select {
  background: transparent;
  border: none;
  outline: none;
  color: var(--st-text);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.01em;
  cursor: pointer;
  padding: 0;
}

.st-input { width: 52px; font-family: 'IBM Plex Mono', monospace; font-size: 15px; cursor: text; }

.st-chip {
  height: 28px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid var(--st-line);
  background: var(--st-elevated);
  color: var(--st-muted);
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
}

.st-chip:hover { background: var(--st-hover); border-color: var(--st-line-strong); color: var(--st-text); }
.st-chip.on { background: #f5f5f7; border-color: #f5f5f7; color: #111; }
.st-chip.ghost { background: transparent; }

.st-seg {
  display: inline-flex;
  border: 1px solid var(--st-line);
  border-radius: 9px;
  overflow: hidden;
  background: var(--st-elevated);
}

.st-seg button {
  border: none;
  background: transparent;
  color: var(--st-muted);
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  padding: 7px 12px;
  cursor: pointer;
}

.st-seg button.on {
  background: #f5f5f7;
  color: #111;
}

.st-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.st-transport {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border-radius: 12px;
  border: 1px solid var(--st-line);
  background: var(--st-elevated);
}

.st-transport button {
  border: none;
  background: transparent;
  color: var(--st-muted);
  border-radius: 9px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px;
  font: inherit;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.st-transport .play {
  padding: 8px 16px;
  background: #f5f5f7;
  color: #111;
}

.st-transport .play.playing {
  background: var(--st-red);
  color: #fff;
}

.st-transport .click.on { color: var(--st-text); background: rgba(255,255,255,0.08); }

.st-save-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.st-hint {
  font-size: 8px;
  color: var(--st-dim);
  margin-top: 1px;
}

.st-body { flex: 1; display: flex; overflow: hidden; min-height: 0; }

.st-side {
  width: 288px;
  flex-shrink: 0;
  border-right: 1px solid var(--st-line);
  background: rgba(14,14,15,0.96);
  display: flex;
  flex-direction: column;
}

.st-side-scroll {
  padding: 18px 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  overflow-y: auto;
  flex: 1;
}

.st-panel {
  border: 1px solid var(--st-line);
  border-radius: 14px;
  padding: 12px;
  background: var(--st-surface);
}

.st-section-title {
  margin: 0;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--st-dim);
}

.st-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  background: #080808;
  overflow: hidden;
  min-width: 0;
}

.st-toolbar {
  height: 42px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--st-line);
  display: flex;
  align-items: center;
  padding: 0 18px;
  gap: 16px;
  font-size: 11px;
  color: var(--st-muted);
  background: rgba(14,14,15,0.9);
}

.st-mixer {
  height: 120px;
  flex-shrink: 0;
  border-top: 1px solid var(--st-line);
  display: flex;
  align-items: center;
  padding: 0 28px;
  gap: 40px;
  background: rgba(14,14,15,0.96);
}

@keyframes st-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
}
`;

// ================= КОНСТАНТЫ =================
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_HEIGHT = 16;
const DEFAULT_PIXELS_PER_SECOND = 200;
const LOWEST_NOTE = 36;
const HIGHEST_NOTE = 96;
const TOTAL_NOTES = HIGHEST_NOTE - LOWEST_NOTE + 1;
/** One-shots play at natural pitch on this MIDI note (C4) */
const SAMPLE_ROOT_PITCH = 60;

function getNoteLabel(pitch: number): string {
  return `${NOTE_NAMES[pitch % 12]}${Math.floor(pitch / 12) - 1}`;
}

const INSTRUMENTS: { id: InstrumentType; name: string; icon: any; color: string }[] = [
  { id: 'synth', name: 'LEAD', icon: Zap, color: '#F5F5F7' },
  { id: 'bass', name: 'BASS', icon: Headphones, color: '#64D2FF' },
  { id: 'pad', name: 'PAD', icon: Waves, color: '#BF5AF2' },
  { id: 'kick', name: 'KICK', icon: Radio, color: '#FF9F0A' },
  { id: 'snare', name: 'SNARE', icon: Wind, color: '#FF453A' },
  { id: 'hihat', name: 'HI-HAT', icon: Music, color: '#AEAEB2' },
];

const PLAYLIST_LANES = 8;
const PLAYLIST_LANE_HEIGHT = 28;
const PLAYLIST_LABEL_WIDTH = 88;
const MIN_PATTERN_LENGTH = 4; // bars of content
const PATTERN_LENGTH_OPTIONS = [4, 5, 8, 16, 32, 64];
/** 4/4: one bar = 4 beats = 4 grid cells when quantize = 1 */
const BEATS_PER_BAR = 4;

function patternBeats(bars: number): number {
  return bars * BEATS_PER_BAR;
}

function getPatternFullBeats(tracks: Track[], patternId: string, patterns: Pattern[]): number {
  const fromNotes = computePatternLength(tracks, patternId, 1);
  const stored = patterns.find(p => p.id === patternId)?.length ?? MIN_PATTERN_LENGTH;
  return patternBeats(Math.max(fromNotes, stored, MIN_PATTERN_LENGTH));
}

function normalizePlaylistClip(
  clip: Partial<PlaylistClip> & Pick<PlaylistClip, 'id' | 'patternId' | 'startBar' | 'lane'>,
  tracks: Track[],
  patterns: Pattern[],
): PlaylistClip {
  if (clip.type === 'audio') {
    return {
      id: clip.id,
      patternId: '',
      startBar: Math.max(0, clip.startBar ?? 0),
      lane: Math.max(0, clip.lane ?? 0),
      offsetBeats: Math.max(0, clip.offsetBeats ?? 0),
      lengthBeats: Math.max(quantizeMinBeat(), clip.lengthBeats ?? BEATS_PER_BAR),
      type: 'audio',
      sampleId: clip.sampleId,
      name: clip.name || 'Audio',
      sampleSeconds: clip.sampleSeconds,
      isVocal: Boolean(clip.isVocal),
      gain: typeof clip.gain === 'number' && Number.isFinite(clip.gain)
        ? Math.max(0, Math.min(2, clip.gain))
        : 0.9,
      eq: normalizeTrackEq(clip.eq ?? clip.fx),
      fx: normalizeClipFx(clip.fx, clip.eq),
    };
  }
  const full = getPatternFullBeats(tracks, clip.patternId, patterns);
  const offsetBeats = Math.max(0, Math.min(full - quantizeMinBeat(), clip.offsetBeats ?? 0));
  const maxLen = Math.max(quantizeMinBeat(), full - offsetBeats);
  const lengthBeats = Math.max(
    quantizeMinBeat(),
    Math.min(maxLen, clip.lengthBeats ?? full),
  );
  return {
    id: clip.id,
    patternId: clip.patternId,
    startBar: Math.max(0, clip.startBar ?? 0),
    lane: Math.max(0, clip.lane ?? 0),
    offsetBeats,
    lengthBeats,
  };
}

/** Max playable beats for a clip window (pattern length or audio duration at given BPM) */
function getClipFullBeats(clip: PlaylistClip, tracks: Track[], patterns: Pattern[], bpm: number): number {
  if (clip.type === 'audio') {
    return clip.sampleSeconds ? Math.max(quantizeMinBeat(), clip.sampleSeconds * (bpm / 60)) : Infinity;
  }
  return getPatternFullBeats(tracks, clip.patternId, patterns);
}

function quantizeMinBeat() {
  return 0.5;
}

/** Fine trim step = 1/10 of current quantize cell (Alt / ⌥ Option) */
const FINE_GRID_DIVISOR = 10;

function snapBeats(value: number, grid: number, fine = false): number {
  const step = fine ? Math.max(0.001, grid / FINE_GRID_DIVISOR) : grid;
  return Math.round(value / step) * step;
}

function minTrimBeats(grid: number, fine = false): number {
  return fine ? Math.max(0.001, grid / FINE_GRID_DIVISOR) : quantizeMinBeat();
}

function normalizeTrack(track: Partial<Track> & Pick<Track, 'id' | 'notes'>): Track {
  const customSample = track.customSample;
  return {
    id: track.id,
    name: track.name || 'Track',
    // Prefer custom when a sample id is still linked (survives bad synth fallback)
    instrument: customSample ? 'custom' : (track.instrument || 'synth'),
    color: track.color || '#F5F5F7',
    notes: track.notes ?? [],
    muted: Boolean(track.muted),
    solo: Boolean(track.solo),
    volume: typeof track.volume === 'number' && Number.isFinite(track.volume) ? track.volume : 0.8,
    pan: typeof track.pan === 'number' && Number.isFinite(track.pan) ? track.pan : 0,
    customSample,
    sampleDuration: track.sampleDuration,
    reverbSend: typeof track.reverbSend === 'number' ? track.reverbSend : 0.2,
    delaySend: typeof track.delaySend === 'number' ? track.delaySend : 0.3,
    eq: normalizeTrackEq(track.eq),
  };
}

function computePatternLength(tracks: Track[], patternId: string, minimum = MIN_PATTERN_LENGTH): number {
  let maxEnd = 0;
  tracks.forEach(track => {
    track.notes.forEach(note => {
      if (note.patternId !== patternId) return;
      maxEnd = Math.max(maxEnd, note.startTime + note.duration);
    });
  });
  return maxEnd > 0
    ? Math.max(minimum, Math.ceil(maxEnd / BEATS_PER_BAR))
    : minimum;
}

function normalizeProjectPatterns(project: MIDIProject): MIDIProject {
  const patterns = project.patterns.map(pattern => {
    // Grow when notes need room; shrink when trailing bars are empty again
    const needed = computePatternLength(project.tracks, pattern.id, 1);
    return {
      ...pattern,
      length: Math.max(MIN_PATTERN_LENGTH, needed),
    };
  });
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
  private vocalReverb: ConvolverNode | null = null;
  private activeSources: Set<AudioScheduledSourceNode> = new Set();
  private activeGains: Set<GainNode> = new Set();

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

  private trackSource(source: AudioScheduledSourceNode, gain?: GainNode) {
    this.activeSources.add(source);
    if (gain) this.activeGains.add(gain);
    source.onended = () => {
      this.activeSources.delete(source);
      if (gain) this.activeGains.delete(gain);
    };
  }

  /** Hard-stop everything currently sounding (play → stop). */
  stopAll() {
    const now = this.ctx.currentTime;
    for (const source of this.activeSources) {
      try {
        source.stop(0);
      } catch {
        // already stopped
      }
    }
    this.activeSources.clear();

    for (const gain of this.activeGains) {
      try {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(0, now);
        gain.disconnect();
      } catch {
        // ignore
      }
    }
    this.activeGains.clear();

    // Kill delay feedback tails without leaving masterGain stuck at 0
    this.delayGain.gain.cancelScheduledValues(now);
    const delayLevel = this.delayGain.gain.value || 0.3;
    this.delayGain.gain.setValueAtTime(0, now);
    this.delayGain.gain.setValueAtTime(delayLevel, now + 0.05);

    // Always restore master level (setValueAtTime is more reliable than ramps after cancel)
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(0.7, now);
  }

  async resume(): Promise<void> {
    if (this.ctx.state !== 'running') {
      try {
        await this.ctx.resume();
      } catch (e) {
        console.warn('AudioContext resume failed', e);
      }
    }
  }

  async loadSample(file: File, persistedId?: string, opts?: { trimSilence?: boolean }): Promise<{ id: string; duration: number }> {
    // Keep separate copies: decodeAudioData may detach its input buffer
    const original = await file.arrayBuffer();
    const forDecode = original.slice(0);
    const forStore = original.slice(0);
    let audioBuffer = await this.ctx.decodeAudioData(forDecode);
    // Cut the fixed MP3 encoder gap so loops land on the beat
    if (looksLikeMp3(file) || looksLikeMp3(original)) {
      audioBuffer = trimAudioBufferStart(this.ctx, audioBuffer, MP3_START_TRIM_SEC);
    }
    if (opts?.trimSilence || /webm|ogg|opus/i.test(file.type) || /\.(webm|ogg|opus)$/i.test(file.name)) {
      audioBuffer = trimLeadingSilence(this.ctx, audioBuffer);
    }
    const id = persistedId || crypto.randomUUID();
    this.samples.set(id, audioBuffer);
    await saveSampleToDb(id, forStore);
    // Verify write — if this fails, sample won't survive refresh
    const ok = await sampleExistsInDb(id);
    if (!ok) {
      throw new Error('Sample failed to persist to IndexedDB');
    }
    return { id, duration: audioBuffer.duration };
  }

  async ensureSample(id: string, opts?: { trimSilence?: boolean }): Promise<AudioBuffer | null> {
    const cached = this.samples.get(id);
    if (cached) return cached;
    try {
      let raw = await loadSampleFromDb(id);
      if (!raw || raw.byteLength === 0) {
        // Project may have been opened in a different browser/device.
        const response = await midiProjectsApi.downloadSample(id);
        raw = response.data;
        if (!raw || raw.byteLength === 0) return null;
        await saveSampleToDb(id, raw.slice(0));
      }
      let audioBuffer = await this.ctx.decodeAudioData(raw.slice(0));
      if (looksLikeMp3(raw)) {
        audioBuffer = trimAudioBufferStart(this.ctx, audioBuffer, MP3_START_TRIM_SEC);
      }
      // Heuristic: webm/ogg vocal takes start with silence/padding
      const head = new Uint8Array(raw.slice(0, 4));
      const isWebm = head[0] === 0x1a && head[1] === 0x45;
      if (opts?.trimSilence || isWebm) {
        audioBuffer = trimLeadingSilence(this.ctx, audioBuffer);
      }
      this.samples.set(id, audioBuffer);
      return audioBuffer;
    } catch (e) {
      console.warn('Failed to restore sample', id, e);
      return null;
    }
  }

  /** Play sample pitched by MIDI note; gated by note length (seconds). */
  playSampleBuffer(
    buffer: AudioBuffer,
    time: number,
    volume: number,
    durationSec?: number,
    pitch: number = SAMPLE_ROOT_PITCH,
    eq?: TrackEq,
  ) {
    const now = this.ctx.currentTime + time;
    const mainGain = this.ctx.createGain();
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    // Different piano rows = different pitch (root = C4)
    // Max 8 covers up to C7 (HIGHEST_NOTE); min 0.25 covers down to C2
    const rate = Math.max(0.25, Math.min(8, Math.pow(2, (pitch - SAMPLE_ROOT_PITCH) / 12)));
    source.playbackRate.value = rate;

    // Sound lasts as long as the note (cells); sample ends earlier if pitched up / short file
    const noteLen = Math.max(0.03, durationSec ?? buffer.duration / rate);
    const playDuration = Math.min(buffer.duration / rate, noteLen);

    mainGain.gain.setValueAtTime(0, now);
    mainGain.gain.linearRampToValueAtTime(volume, now + 0.003);
    const releaseStart = now + Math.max(0.01, playDuration - 0.02);
    mainGain.gain.setValueAtTime(volume, releaseStart);
    mainGain.gain.exponentialRampToValueAtTime(0.001, now + playDuration + 0.02);

    source.connect(mainGain);
    mainGain.connect(this.eqInput(eq));
    this.trackSource(source, mainGain);
    source.start(now);
    source.stop(now + playDuration + 0.05);
    return playDuration;
  }

  /** Shared impulse for vocal/clip reverb (separate from instrument send bus). */
  private getClipReverb(): ConvolverNode | null {
    if (this.vocalReverb) return this.vocalReverb;
    this.vocalReverb = createImpulseReverb(this.ctx);
    return this.vocalReverb;
  }

  /**
   * Play an audio loop clip. Pass ClipFx for full vocal chain, or legacy TrackEq.
   */
  playClip(
    buffer: AudioBuffer,
    time: number,
    volume: number,
    offsetSec: number,
    durationSec: number,
    fxOrEq?: ClipFx | TrackEq,
  ) {
    const now = this.ctx.currentTime + time;
    const safeOffset = Math.max(0, Math.min(buffer.duration, offsetSec));
    const playDuration = Math.max(0.02, Math.min(buffer.duration - safeOffset, durationSec));
    const mainGain = this.ctx.createGain();
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    mainGain.gain.setValueAtTime(0, now);
    mainGain.gain.linearRampToValueAtTime(volume, now + 0.004);
    const releaseStart = now + Math.max(0.01, playDuration - 0.015);
    mainGain.gain.setValueAtTime(volume, releaseStart);
    mainGain.gain.linearRampToValueAtTime(0.0001, now + playDuration + 0.01);

    source.connect(mainGain);

    const fx = fxOrEq && 'compress' in fxOrEq
      ? normalizeClipFx(fxOrEq)
      : normalizeClipFx(undefined, fxOrEq as TrackEq | undefined);

    let node: AudioNode = mainGain;

    if (fx.enabled && (fx.low !== 0 || fx.mid !== 0 || fx.high !== 0)) {
      const low = this.ctx.createBiquadFilter();
      low.type = 'lowshelf';
      low.frequency.value = 200;
      low.gain.value = fx.low;
      const mid = this.ctx.createBiquadFilter();
      mid.type = 'peaking';
      mid.frequency.value = 1000;
      mid.Q.value = 0.9;
      mid.gain.value = fx.mid;
      const high = this.ctx.createBiquadFilter();
      high.type = 'highshelf';
      high.frequency.value = 3500;
      high.gain.value = fx.high;
      node.connect(low);
      low.connect(mid);
      mid.connect(high);
      node = high;
    }

    if (fx.enabled && fx.compress > 0.01) {
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -12 - fx.compress * 28;
      comp.knee.value = 6 + fx.compress * 12;
      comp.ratio.value = 2 + fx.compress * 10;
      comp.attack.value = 0.003;
      comp.release.value = 0.12 + (1 - fx.compress) * 0.18;
      node.connect(comp);
      node = comp;
    }

    if (fx.enabled && fx.drive > 0.01) {
      const shaper = this.ctx.createWaveShaper();
      // DOM typings disagree on Float32Array buffer brand across TS versions
      (shaper as WaveShaperNode).curve = makeDistortionCurve(1 + fx.drive * 40) as any;
      shaper.oversample = '2x';
      const driveGain = this.ctx.createGain();
      driveGain.gain.value = 1 - fx.drive * 0.25;
      node.connect(shaper);
      shaper.connect(driveGain);
      node = driveGain;
    }

    if (fx.enabled && fx.reverb > 0.01) {
      const dry = this.ctx.createGain();
      const wet = this.ctx.createGain();
      dry.gain.value = 1 - fx.reverb * 0.85;
      wet.gain.value = fx.reverb * 0.9;
      node.connect(dry);
      dry.connect(this.masterGain);
      const reverb = this.getClipReverb();
      if (reverb) {
        node.connect(wet);
        wet.connect(reverb);
        reverb.connect(this.masterGain);
      } else {
        node.connect(this.masterGain);
      }
    } else {
      node.connect(this.masterGain);
    }

    this.trackSource(source, mainGain);
    source.start(now, safeOffset, playDuration + 0.02);
  }

  /**
   * Per-voice 3-band EQ (low shelf 200Hz / peak 1kHz / high shelf 3.5kHz).
   * Returns the node to route track output into; masterGain when EQ is off.
   */
  eqInput(eq?: TrackEq): AudioNode {
    if (!eq || !eq.enabled || (eq.low === 0 && eq.mid === 0 && eq.high === 0)) {
      return this.masterGain;
    }
    const low = this.ctx.createBiquadFilter();
    low.type = 'lowshelf';
    low.frequency.value = 200;
    low.gain.value = eq.low;

    const mid = this.ctx.createBiquadFilter();
    mid.type = 'peaking';
    mid.frequency.value = 1000;
    mid.Q.value = 0.9;
    mid.gain.value = eq.mid;

    const high = this.ctx.createBiquadFilter();
    high.type = 'highshelf';
    high.frequency.value = 3500;
    high.gain.value = eq.high;

    low.connect(mid);
    mid.connect(high);
    high.connect(this.masterGain);
    return low;
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
    this.trackSource(osc, g);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  playNote(track: Track, pitch: number, time: number, duration: number, velocity: number = 0.8) {
    const now = this.ctx.currentTime + time;
    const freq = 440 * Math.pow(2, (pitch - 69) / 12);
    const vol = velocity * track.volume;

    // Custom one-shot: pitch follows piano row; length follows note cells
    if (track.instrument === 'custom' || track.customSample) {
      const noteSeconds = Math.max(0.03, duration);
      const safeVol = Number.isFinite(vol) ? vol : velocity * 0.8;
      const buffer = track.customSample ? this.samples.get(track.customSample) : undefined;
      if (buffer) {
        this.playSampleBuffer(buffer, time, safeVol * 0.9, noteSeconds, pitch, track.eq);
        return;
      }
      if (track.customSample) {
        // Restore from IndexedDB; keep scheduled delay if still in the future
        const scheduledAt = this.ctx.currentTime + time;
        void this.ensureSample(track.customSample).then((restored) => {
          if (!restored) return;
          const delay = Math.max(0, scheduledAt - this.ctx.currentTime);
          this.playSampleBuffer(restored, delay, safeVol * 0.9, noteSeconds, pitch, track.eq);
        });
        return;
      }
    }

    const safeVol = Number.isFinite(vol) ? vol : velocity * 0.8;
    const trackOut = this.eqInput(track.eq);
    const mainGain = this.ctx.createGain();
    mainGain.gain.setValueAtTime(0, now);
    mainGain.gain.linearRampToValueAtTime(safeVol * 0.4, now + 0.005);
    mainGain.gain.exponentialRampToValueAtTime(0.001, now + Math.max(0.05, duration));

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
        this.trackSource(oscSub);
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
        this.trackSource(noise);
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
        this.trackSource(hhNoise, mainGain);
        hhNoise.start(now);
        hhNoise.stop(now + 0.1);
        mainGain.connect(trackOut);
        return;
      default:
        osc1.type = 'sine';
        osc2.type = 'sine';
    }
    
    osc1.connect(oscGain1);
    osc2.connect(oscGain2);
    oscGain1.connect(mainGain);
    oscGain2.connect(mainGain);
    this.trackSource(osc1, mainGain);
    this.trackSource(osc2);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration + 0.1);
    osc2.stop(now + duration + 0.1);

    mainGain.connect(trackOut);
    
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

function hydrateMidiProject(raw: Partial<MIDIProject>, serverId?: string): MIDIProject {
  const fallbackPatternId = crypto.randomUUID();
  const tracks = (raw.tracks ?? []).map(track => normalizeTrack({
    ...track,
    id: track.id || crypto.randomUUID(),
    notes: (track.notes ?? []).map(note => ({
      ...note,
      patternId: note.patternId ?? (raw.activePatternId || fallbackPatternId),
    })),
  }));
  const patterns = raw.patterns && raw.patterns.length > 0
    ? raw.patterns.map(pattern => {
        const needed = computePatternLength(tracks, pattern.id, 1);
        let length = Math.max(pattern.length || MIN_PATTERN_LENGTH, needed);
        if (length === 5 && needed <= 4) length = 4;
        return { ...pattern, length: Math.max(MIN_PATTERN_LENGTH, length) };
      })
    : [{ id: raw.activePatternId || fallbackPatternId, name: 'Pattern 1', length: MIN_PATTERN_LENGTH }];

  return normalizeProjectPatterns({
    id: serverId || raw.id || crypto.randomUUID(),
    name: raw.name || 'Untitled project',
    bpm: raw.bpm || 124,
    tracks,
    isPlaying: false,
    activeTrackId: raw.activeTrackId || tracks[0]?.id || null,
    patternLength: patterns[0]?.length || MIN_PATTERN_LENGTH,
    metronomeEnabled: raw.metronomeEnabled ?? true,
    patterns,
    activePatternId: raw.activePatternId || patterns[0].id,
    arrangement: (raw.arrangement && raw.arrangement.length > 0
      ? raw.arrangement
      : [{ id: crypto.randomUUID(), patternId: patterns[0].id, startBar: 0, lane: 0 }]
    ).map(clip => normalizePlaylistClip(clip as PlaylistClip, tracks, patterns)),
    transportMode: raw.transportMode || 'pattern',
  });
}

function projectForStorage(project: MIDIProject): Record<string, unknown> {
  return JSON.parse(JSON.stringify({ ...project, isPlaying: false })) as Record<string, unknown>;
}

// ================= ГЛАВНЫЙ КОМПОНЕНТ =================
function MIDISequencer() {
  const [project, setProject] = useState<MIDIProject | null>(null);
  const [projects, setProjects] = useState<MidiProjectSummary[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectActionLoading, setProjectActionLoading] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [renamingProjectId, setRenamingProjectId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [libraryError, setLibraryError] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [playheadTime, setPlayheadTime] = useState(0);
  const [zoom, setZoom] = useState(48); // px per beat — 5 bars ≈ fits on screen, zoom to enlarge
  const [editorView, setEditorView] = useState<'piano' | 'playlist'>('piano');
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [selectedClipIds, setSelectedClipIds] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [quantizeGrid, setQuantizeGrid] = useState(0.5); // 8 cells per bar (1/8 note)
  const [eqPanelOpen, setEqPanelOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [vocalPanelClipId, setVocalPanelClipId] = useState<string | null>(null);
  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicId, setSelectedMicId] = useState(() => {
    try { return localStorage.getItem('soundlab_mic_id') || ''; } catch { return ''; }
  });
  const [micMonitorOn, setMicMonitorOn] = useState(false);
  const [micArmed, setMicArmed] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [recordElapsedSec, setRecordElapsedSec] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordStreamRef = useRef<MediaStream | null>(null);
  const recordStartBeatRef = useRef(0);
  const pendingRecordPlayRef = useRef(false);
  const monitorGainRef = useRef<GainNode | null>(null);
  const monitorSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const micMeterSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const micLevelRafRef = useRef<number | null>(null);
  const recordTimerRef = useRef<number | null>(null);
  const recordStartedAtRef = useRef(0);
  
  const engineRef = useRef<AudioEngine | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);
  const lastMetronomeBeatRef = useRef(-1);
  const scheduledNotesRef = useRef<Set<string>>(new Set());
  const loopCycleRef = useRef(0);
  const historyRef = useRef<MIDIProject[]>([]);
  const dragStateRef = useRef<DragState | null>(null);
  const playlistDragRef = useRef<PlaylistDragState | null>(null);
  const clipClipboardRef = useRef<PlaylistClip[]>([]);
  const playheadRef = useRef(0);
  const isPlayingRef = useRef(false);
  const latestProjectRef = useRef<MIDIProject | null>(null);
  const initialLibraryLoadStartedRef = useRef(false);

  const pushHistory = useCallback((snapshot: MIDIProject) => {
    const clone: MIDIProject = JSON.parse(JSON.stringify({ ...snapshot, isPlaying: false }));
    historyRef.current.push(clone);
    if (historyRef.current.length > 60) historyRef.current.shift();
  }, []);

  /** Musical edit with undo support */
  const commitProject = useCallback((recipe: (prev: MIDIProject) => MIDIProject) => {
    setProject(prev => {
      if (!prev) return prev;
      pushHistory(prev);
      return recipe(prev);
    });
  }, [pushHistory]);

  const undo = useCallback(() => {
    const snap = historyRef.current.pop();
    if (!snap) return;
    setSelectedNotes([]);
    setSelectedClipIds([]);
    setProject(prev => prev ? { ...snap, isPlaying: prev.isPlaying } : snap);
  }, []);

  const snapToGrid = useCallback((value: number, fine = false) => {
    return snapBeats(value, quantizeGrid, fine);
  }, [quantizeGrid]);

  const getActivePattern = useCallback((p: MIDIProject) => {
    return p.patterns.find(pattern => pattern.id === p.activePatternId) || p.patterns[0];
  }, []);

  const getTimelineLength = useCallback((p: MIDIProject) => {
    if (p.transportMode === 'pattern') {
      const activePattern = getActivePattern(p);
      const bars = activePattern ? activePattern.length : p.patternLength;
      return patternBeats(bars);
    }
    const arrangementEnd = p.arrangement.reduce((maxEnd, clip) => {
      const len = clip.lengthBeats ?? getPatternFullBeats(p.tracks, clip.patternId, p.patterns);
      const clipEnd = clip.startBar * BEATS_PER_BAR + len;
      return Math.max(maxEnd, clipEnd);
    }, patternBeats(p.patternLength));
    return arrangementEnd;
  }, [getActivePattern]);

  const scrubbingRef = useRef(false);

  const seekPlayheadToBeat = useCallback((rawBeat: number, mode: 'pattern' | 'song') => {
    if (!project) return;
    let next = Math.max(0, snapToGrid(rawBeat));
    if (mode === 'pattern') {
      const len = patternBeats(getActivePattern(project).length);
      next = Math.min(next, Math.max(0, len - quantizeGrid));
    } else {
      const len = getTimelineLength(project);
      next = Math.min(next, Math.max(0, len));
    }
    playheadRef.current = next;
    setPlayheadTime(next);
  }, [project, snapToGrid, quantizeGrid, getActivePattern, getTimelineLength]);

  const beginPlayheadScrub = useCallback((
    e: React.MouseEvent,
    mode: 'pattern' | 'song',
    getBeatFromClientX: (clientX: number) => number,
  ) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    scrubbingRef.current = true;
    seekPlayheadToBeat(getBeatFromClientX(e.clientX), mode);

    const onMove = (ev: MouseEvent) => {
      if (!scrubbingRef.current) return;
      seekPlayheadToBeat(getBeatFromClientX(ev.clientX), mode);
    };
    const onUp = () => {
      scrubbingRef.current = false;
      // After seek: drop "already played" keys and kill ringing audio so clips
      // can restart from the new playhead (including mid-clip).
      scheduledNotesRef.current.clear();
      if (isPlayingRef.current) {
        const eng = engineRef.current || new AudioEngine();
        engineRef.current = eng;
        eng.stopAll();
        if (eng.masterGain.gain.value < 0.05) {
          eng.masterGain.gain.cancelScheduledValues(eng.ctx.currentTime);
          eng.masterGain.gain.setValueAtTime(0.7, eng.ctx.currentTime);
        }
        lastTimeRef.current = eng.ctx.currentTime;
      }
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [seekPlayheadToBeat]);

  const getEngine = useCallback(() => {
    if (!engineRef.current) engineRef.current = new AudioEngine();
    return engineRef.current;
  }, []);

  const ensureAudio = useCallback(async () => {
    const eng = getEngine();
    await eng.resume();
    // After stopAll / suspend, always re-assert audible master level
    if (eng.masterGain.gain.value < 0.05) {
      eng.masterGain.gain.cancelScheduledValues(eng.ctx.currentTime);
      eng.masterGain.gain.setValueAtTime(0.7, eng.ctx.currentTime);
    }
    return eng;
  }, [getEngine]);

  const loadProjectLibrary = useCallback(async () => {
    setProjectsLoading(true);
    setLibraryError('');
    try {
      let list = (await midiProjectsApi.list()).data;

      // Move the previous browser-only project into the account library once.
      const localSave = readSavedProject();
      if (localSave) {
        try {
          const migrated = hydrateMidiProject(JSON.parse(localSave) as Partial<MIDIProject>);
          const created = (await midiProjectsApi.create(migrated.name, projectForStorage(migrated))).data;
          localStorage.removeItem(getProjectStorageKey());
          list = [{
            id: created.id,
            name: created.name,
            createdAt: created.createdAt,
            updatedAt: created.updatedAt,
          }, ...list];
        } catch (error) {
          console.error('Failed to migrate local MIDI project:', error);
        }
      }

      setProjects(list);
    } catch (error) {
      console.error('Failed to load MIDI projects:', error);
      setLibraryError('Не удалось загрузить проекты. Проверьте соединение и повторите.');
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialLibraryLoadStartedRef.current) return;
    initialLibraryLoadStartedRef.current = true;
    void loadProjectLibrary();
  }, [loadProjectLibrary]);

  useEffect(() => {
    latestProjectRef.current = project;
  }, [project]);

  const saveProjectNow = useCallback(async (projectToSave?: MIDIProject) => {
    const current = projectToSave || latestProjectRef.current;
    if (!current) return false;
    setSaveStatus('saving');
    const normalized = { ...current, name: current.name.trim() || 'Без названия' };
    const payload = projectForStorage(normalized);
    const serializedPayload = JSON.stringify(payload);
    try {
      const saved = (await midiProjectsApi.save(
        current.id,
        normalized.name,
        payload,
      )).data;
      if (localStorage.getItem(getProjectDraftStorageKey(current.id)) === serializedPayload) {
        localStorage.removeItem(getProjectDraftStorageKey(current.id));
      }
      setSaveStatus('saved');
      setProjects(previous => previous.map(item => (
        item.id === saved.id
          ? { ...item, name: saved.name, updatedAt: saved.updatedAt }
          : item
      )));
      return true;
    } catch (error) {
      console.error('Failed to save MIDI project:', error);
      setSaveStatus('error');
      return false;
    }
  }, []);

  // Immediate local safety draft protects edits if the tab closes before the API request finishes.
  useEffect(() => {
    if (!project) return;
    try {
      localStorage.setItem(
        getProjectDraftStorageKey(project.id),
        JSON.stringify(projectForStorage(project)),
      );
    } catch {
      // Server autosave still works if browser storage is unavailable.
    }
  }, [project]);

  // Debounced server autosave. Explicit Save uses the same function immediately.
  useEffect(() => {
    if (!project) return;
    setSaveStatus('saving');
    const timer = window.setTimeout(() => {
      void saveProjectNow(project);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [project, saveProjectNow]);

  // Restore one-shot buffers from IndexedDB after reload / HMR
  useEffect(() => {
    if (!project) return;
    let cancelled = false;
    const eng = getEngine();
    const sampleEntries = [
      ...project.tracks
        .filter(t => t.customSample)
        .map(t => ({ id: t.customSample!, name: t.name })),
      ...project.arrangement
        .filter(c => c.type === 'audio' && c.sampleId)
        .map(c => ({ id: c.sampleId!, name: c.name || 'audio-loop' })),
    ].filter((entry, index, all) => all.findIndex(item => item.id === entry.id) === index);
    if (sampleEntries.length === 0) return;

    void (async () => {
      for (const { id, name } of sampleEntries) {
        if (cancelled) return;
        // Migrate pre-server UUID samples once while their local bytes still exist.
        if (
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
          && !localStorage.getItem(getSampleServerMarkerKey(id))
        ) {
          const localBytes = await loadSampleFromDb(id);
          if (localBytes && localBytes.byteLength <= MAX_SAMPLE_BYTES) {
            try {
              const migrationFile = new File([localBytes], `${name}.wav`, { type: 'audio/wav' });
              await midiProjectsApi.uploadSample(project.id, migrationFile, id);
              try {
                localStorage.setItem(getSampleServerMarkerKey(id), '1');
              } catch {
                // Marker is optional.
              }
            } catch (error) {
              console.warn('Legacy sample server migration failed:', id, error);
            }
          }
        }
        const buf = await eng.ensureSample(id);
        if (!buf) {
          // Do NOT strip the sample id — keep it so a later retry / re-upload can fix it
          console.warn('Sample not restored yet (will retry on play):', id);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [project?.id, getEngine]);

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
    const saveWhenHidden = () => {
      if (document.visibilityState === 'hidden') void saveProjectNow();
    };
    document.addEventListener('visibilitychange', saveWhenHidden);
    return () => document.removeEventListener('visibilitychange', saveWhenHidden);
  }, [saveProjectNow]);

  // ГЛОБАЛЬНЫЕ ОБРАБОТЧИКИ ДЛЯ ПЕРЕТАСКИВАНИЯ
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dragging = dragStateRef.current;
      if (!dragging) return;
      if (!project) return;

      const fine = e.altKey; // Alt on Win/Linux, ⌥ Option on Mac
      const deltaX = e.clientX - dragging.startX;
      const deltaY = e.clientY - dragging.startY;
      const beatDelta = deltaX / zoom;
      const pitchDelta = Math.round(-deltaY / NOTE_HEIGHT);
      const minDur = fine ? Math.max(0.001, quantizeGrid / FINE_GRID_DIVISOR) : quantizeGrid;

      setProject(prev => {
        if (!prev) return prev;
        
        return {
          ...prev,
          tracks: prev.tracks.map(track => ({
            ...track,
            notes: track.notes.map(note => {
              if (note.id !== dragging.id) return note;
              
              if (dragging.type === 'move') {
                const maxStart = patternBeats(prev.patternLength) - minDur;
                const newStartTime = Math.max(0, Math.min(maxStart, dragging.origStart + beatDelta));
                const newPitch = Math.max(LOWEST_NOTE, Math.min(HIGHEST_NOTE, dragging.origPitch + pitchDelta));
                const quantized = snapToGrid(newStartTime, fine);
                
                return {
                  ...note,
                  startTime: quantized,
                  pitch: newPitch,
                };
              } else if (dragging.type === 'resize') {
                const newDuration = Math.max(minDur, snapToGrid(dragging.origDur + beatDelta, fine));
                
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
      const fine = e.altKey; // Alt on Win/Linux, ⌥ Option on Mac
      setProject(prev => {
        if (!prev) return prev;
        const deltaX = e.clientX - dragging.startX;
        const deltaY = e.clientY - dragging.startY;
        const beatDelta = deltaX / zoom;
        const minLen = minTrimBeats(quantizeGrid, fine);
        // Fine snap only while resizing edges; moves stay on the main grid unless Alt is held
        const snapMove = (v: number) => snapToGrid(v, fine);
        const snapTrim = (v: number) => snapToGrid(v, fine);

        return {
          ...prev,
          arrangement: prev.arrangement.map(clip => {
            if (dragging.type === 'move' && dragging.moveGroup) {
              const orig = dragging.moveGroup.find(g => g.clipId === clip.id);
              if (!orig) return clip;
              const startBar = Math.max(0, snapMove(orig.startBar * BEATS_PER_BAR + beatDelta) / BEATS_PER_BAR);
              const lane = Math.max(0, Math.min(PLAYLIST_LANES - 1, orig.lane + Math.round(deltaY / PLAYLIST_LANE_HEIGHT)));
              return { ...clip, startBar, lane };
            }

            if (clip.id !== dragging.clipId) return clip;
            const full = getClipFullBeats(clip, prev.tracks, prev.patterns, prev.bpm);

            if (dragging.type === 'move') {
              const startBar = Math.max(0, snapMove(dragging.origStartBar * BEATS_PER_BAR + beatDelta) / BEATS_PER_BAR);
              const lane = Math.max(0, Math.min(PLAYLIST_LANES - 1, dragging.origLane + Math.round(deltaY / PLAYLIST_LANE_HEIGHT)));
              return { ...clip, startBar, lane };
            }

            if (dragging.type === 'resize-right') {
              const maxLen = Math.max(minLen, full - dragging.origOffsetBeats);
              const lengthBeats = Math.max(minLen, Math.min(maxLen, snapTrim(dragging.origLengthBeats + beatDelta)));
              return { ...clip, lengthBeats };
            }

            // resize-left: keep right edge fixed, shift window into pattern
            const origStartBeats = dragging.origStartBar * BEATS_PER_BAR;
            const rightEdge = origStartBeats + dragging.origLengthBeats;
            let newStartBeats = snapTrim(origStartBeats + beatDelta);
            newStartBeats = Math.max(0, Math.min(rightEdge - minLen, newStartBeats));
            const lengthBeats = Math.max(minLen, rightEdge - newStartBeats);
            const offsetDelta = newStartBeats - origStartBeats;
            let offsetBeats = dragging.origOffsetBeats + offsetDelta;
            offsetBeats = Math.max(0, Math.min(full - lengthBeats, offsetBeats));
            const startBar = newStartBeats / BEATS_PER_BAR;
            return { ...clip, startBar, offsetBeats, lengthBeats };
          }),
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
  }, [snapToGrid, zoom, quantizeGrid]);

  const buildNewProject = (name: string): MIDIProject => {
    const trackId = crypto.randomUUID();
    const patternId = crypto.randomUUID();
    return {
      id: crypto.randomUUID(),
      name,
      bpm: 124,
      tracks: [{
        id: trackId,
        name: "Neon Lead",
        instrument: 'synth',
        color: '#F5F5F7',
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
      arrangement: [{
        id: crypto.randomUUID(),
        patternId,
        startBar: 0,
        lane: 0,
        offsetBeats: 0,
        lengthBeats: patternBeats(MIN_PATTERN_LENGTH),
      }],
      transportMode: 'pattern',
    };
  };

  const createNewProject = async () => {
    const name = newProjectName.trim() || `Новый проект ${projects.length + 1}`;
    setProjectActionLoading(true);
    setLibraryError('');
    try {
      const draft = buildNewProject(name);
      const created = (await midiProjectsApi.create(name, projectForStorage(draft))).data;
      playheadRef.current = 0;
      setPlayheadTime(0);
      setProject(hydrateMidiProject(created.data as Partial<MIDIProject>, created.id));
      setNewProjectName('');
      setSaveStatus('saved');
    } catch (error) {
      console.error('Failed to create MIDI project:', error);
      setLibraryError('Не удалось создать проект.');
    } finally {
      setProjectActionLoading(false);
    }
  };

  const openProject = async (id: string) => {
    setProjectActionLoading(true);
    setLibraryError('');
    try {
      const stored = (await midiProjectsApi.get(id)).data;
      const localDraft = readProjectDraft(id);
      const data = localDraft
        ? localDraft
        : stored.data as Partial<MIDIProject>;
      playheadRef.current = 0;
      setPlayheadTime(0);
      historyRef.current = [];
      setProject(hydrateMidiProject(data, stored.id));
      setSaveStatus(localDraft ? 'saving' : 'saved');
    } catch (error) {
      console.error('Failed to open MIDI project:', error);
      setLibraryError('Не удалось открыть проект.');
    } finally {
      setProjectActionLoading(false);
    }
  };

  const deleteProject = async (item: MidiProjectSummary) => {
    if (!window.confirm(`Удалить проект «${item.name}»? Это действие нельзя отменить.`)) return;
    setProjectActionLoading(true);
    try {
      await midiProjectsApi.remove(item.id);
      localStorage.removeItem(getProjectDraftStorageKey(item.id));
      setProjects(previous => previous.filter(projectItem => projectItem.id !== item.id));
      if (renamingProjectId === item.id) {
        setRenamingProjectId(null);
        setRenameDraft('');
      }
    } catch (error) {
      console.error('Failed to delete MIDI project:', error);
      setLibraryError('Не удалось удалить проект.');
    } finally {
      setProjectActionLoading(false);
    }
  };

  const beginRenameProject = (item: MidiProjectSummary) => {
    setRenamingProjectId(item.id);
    setRenameDraft(item.name);
    setLibraryError('');
  };

  const cancelRenameProject = () => {
    setRenamingProjectId(null);
    setRenameDraft('');
  };

  const saveRenameProject = async (item: MidiProjectSummary) => {
    const nextName = renameDraft.trim().slice(0, 100);
    if (!nextName) {
      setLibraryError('Название не может быть пустым.');
      return;
    }
    if (nextName === item.name) {
      cancelRenameProject();
      return;
    }
    setProjectActionLoading(true);
    setLibraryError('');
    try {
      const updated = (await midiProjectsApi.rename(item.id, nextName)).data;
      setProjects(previous => previous.map(p => (
        p.id === item.id
          ? { ...p, name: updated.name, updatedAt: updated.updatedAt }
          : p
      )));
      cancelRenameProject();
    } catch (error) {
      console.error('Failed to rename MIDI project:', error);
      setLibraryError('Не удалось переименовать проект.');
    } finally {
      setProjectActionLoading(false);
    }
  };

  const togglePlayback = useCallback(() => {
    if (!project) return;
    
    if (project.isPlaying) {
      stopPlayback();
    } else {
      void (async () => {
        const eng = await ensureAudio();
        await Promise.all([
          ...project.tracks
            .filter(t => t.customSample)
            .map(t => eng.ensureSample(t.customSample!)),
          ...project.arrangement
            .filter(c => c.type === 'audio' && c.sampleId)
            .map(c => eng.ensureSample(c.sampleId!)),
        ]);
        startPlayback();
      })();
    }
  }, [project, ensureAudio]);

  const startPlayback = useCallback(() => {
    if (!project) return;
    
    const eng = getEngine();
    // Ensure master is audible (stopAll / suspend can leave gain odd)
    if (eng.masterGain.gain.value < 0.05) {
      eng.masterGain.gain.cancelScheduledValues(eng.ctx.currentTime);
      eng.masterGain.gain.setValueAtTime(0.7, eng.ctx.currentTime);
    }
    const timelineLength = getTimelineLength(project);
    
    setProject(prev => prev ? { ...prev, isPlaying: true } : null);
    isPlayingRef.current = true;
    lastTimeRef.current = eng.ctx.currentTime;
    lastMetronomeBeatRef.current = -1;
    scheduledNotesRef.current.clear();
    loopCycleRef.current = 0;
    playheadRef.current = Math.min(playheadRef.current, Math.max(0, timelineLength - quantizeGrid));
    let lastUiUpdate = 0;

    const scheduleNotes = () => {
      const snapshot = latestProjectRef.current || project;
      if (!snapshot) return;

      if (!isPlayingRef.current) {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        return;
      }

      const now = eng.ctx.currentTime;
      const delta = Math.min(now - lastTimeRef.current, 0.05);
      lastTimeRef.current = now;

      // Don't fight the user while they drag the playhead
      if (scrubbingRef.current) {
        rafRef.current = requestAnimationFrame(scheduleNotes);
        return;
      }

      const bps = snapshot.bpm / 60;
      const beatDelta = delta * bps;
      const prevTime = playheadRef.current;
      let nextTime = prevTime + beatDelta;
      const currentTimelineLength = getTimelineLength(snapshot);
      if (currentTimelineLength <= 0) {
        rafRef.current = requestAnimationFrame(scheduleNotes);
        return;
      }

      if (snapshot.metronomeEnabled) {
        const currentBeat = Math.floor(nextTime);
        const lastBeat = Math.floor(prevTime);
        if (currentBeat !== lastBeat) {
          eng.playMetronome(0, currentBeat % 4 === 0);
        }
      }

      // Longer lookahead so notes at bar 1 are queued before the loop wraps
      const lookahead = 0.35;
      const lookaheadBeats = lookahead * bps;
      const windowStart = prevTime;
      const windowEnd = windowStart + lookaheadBeats;
      const wrappedWindow = windowEnd >= currentTimelineLength;
      const normalizedWindowEnd = wrappedWindow ? windowEnd - currentTimelineLength : windowEnd;
      const soloExists = snapshot.tracks.some(t => t.solo);
      const cycle = loopCycleRef.current;

      snapshot.tracks.forEach(track => {
        if (track.muted) return;
        if (soloExists && !track.solo) return;

        const scheduleNoteAt = (note: Note, absoluteStart: number) => {
          // Notes past the loop seam belong to the NEXT cycle — otherwise first wrap skips
          // them because they were already marked during the opening of this cycle.
          const crossesLoop = wrappedWindow && absoluteStart < windowStart;
          const noteCycle = crossesLoop ? cycle + 1 : cycle;
          const noteKey = `${note.id}-c${noteCycle}-${Math.round(absoluteStart * 1000)}`;
          const isInWindow = wrappedWindow
            ? (absoluteStart >= windowStart || absoluteStart < normalizedWindowEnd)
            : (absoluteStart >= windowStart && absoluteStart < windowEnd);
          if (isInWindow && !scheduledNotesRef.current.has(noteKey)) {
            scheduledNotesRef.current.add(noteKey);
            const beatsUntilNote = crossesLoop
              ? absoluteStart + currentTimelineLength - windowStart
              : absoluteStart - windowStart;
            const delay = beatsUntilNote / bps;
            if (delay >= 0 && delay < lookahead + 0.05) {
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
            if (clip.type === 'audio') return;
            const clipPattern = snapshot.patterns.find(pattern => pattern.id === clip.patternId);
            if (!clipPattern) return;
            const offset = clip.offsetBeats ?? 0;
            const length = clip.lengthBeats ?? getPatternFullBeats(snapshot.tracks, clip.patternId, snapshot.patterns);
            const windowEnd = offset + length;
            track.notes
              .filter(note => note.patternId === clip.patternId)
              .forEach(note => {
                if (note.startTime < offset || note.startTime >= windowEnd) return;
                const absoluteStart = clip.startBar * BEATS_PER_BAR + (note.startTime - offset);
                const clippedDuration = Math.min(note.duration, windowEnd - note.startTime);
                if (clippedDuration <= 0) return;
                scheduleNoteAt({ ...note, duration: clippedDuration }, absoluteStart);
              });
          });
        }
      });

      // Audio loop clips (dropped mp3/wav) — song mode only
      if (snapshot.transportMode === 'song') {
        snapshot.arrangement.forEach(clip => {
          if (clip.type !== 'audio' || !clip.sampleId) return;
          const clipStart = clip.startBar * BEATS_PER_BAR;
          const clipEnd = clipStart + clip.lengthBeats;
          const clipGain = clip.gain ?? 0.9;
          const baseOffsetSec = (clip.offsetBeats ?? 0) / bps;

          const clipFx = clip.fx ?? normalizeClipFx(undefined, clip.eq);
          const fireClip = (delay: number, offsetSec: number, durationSec: number) => {
            if (delay < 0 || durationSec <= 0.01) return;
            const cached = eng.samples.get(clip.sampleId!);
            if (cached) {
              eng.playClip(cached, delay, clipGain, offsetSec, durationSec, clipFx);
            } else {
              void eng.ensureSample(clip.sampleId!, { trimSilence: clip.isVocal }).then(buffer => {
                if (buffer && isPlayingRef.current) {
                  eng.playClip(buffer, 0, clipGain, offsetSec, durationSec, clipFx);
                }
              });
            }
          };

          // 1) Clip start enters lookahead — play from clip beginning
          const crossesLoop = wrappedWindow && clipStart < windowStart;
          const clipCycle = crossesLoop ? cycle + 1 : cycle;
          const startKey = `clip-${clip.id}-c${clipCycle}-start`;
          const isStartInWindow = wrappedWindow
            ? (clipStart >= windowStart || clipStart < normalizedWindowEnd)
            : (clipStart >= windowStart && clipStart < windowEnd);
          if (isStartInWindow && !scheduledNotesRef.current.has(startKey)) {
            scheduledNotesRef.current.add(startKey);
            scheduledNotesRef.current.add(`clip-${clip.id}-c${clipCycle}-mid`);
            const beatsUntilClip = crossesLoop
              ? clipStart + currentTimelineLength - windowStart
              : clipStart - windowStart;
            const delay = beatsUntilClip / bps;
            if (delay >= 0 && delay < lookahead + 0.05) {
              fireClip(delay, baseOffsetSec, clip.lengthBeats / bps);
            }
            return;
          }

          // 2) After scrub/seek: playhead is inside the clip — start mid-sample
          const midKey = `clip-${clip.id}-c${cycle}-mid`;
          const midStartKey = `clip-${clip.id}-c${cycle}-start`;
          if (
            nextTime >= clipStart
            && nextTime < clipEnd
            && !scheduledNotesRef.current.has(midStartKey)
            && !scheduledNotesRef.current.has(midKey)
          ) {
            scheduledNotesRef.current.add(midKey);
            scheduledNotesRef.current.add(midStartKey);
            const beatsIntoClip = nextTime - clipStart;
            const remainingBeats = clipEnd - nextTime;
            fireClip(0, baseOffsetSec + beatsIntoClip / bps, remainingBeats / bps);
          }
        });
      }

      if (nextTime >= currentTimelineLength) {
        const loops = Math.floor(nextTime / currentTimelineLength);
        nextTime = nextTime % currentTimelineLength;
        loopCycleRef.current += loops;
        // Drop keys from finished cycles so the set doesn't grow forever
        const keepCycle = loopCycleRef.current;
        for (const key of [...scheduledNotesRef.current]) {
          const match = key.match(/-c(\d+)-/);
          if (match && Number(match[1]) < keepCycle) {
            scheduledNotesRef.current.delete(key);
          }
        }
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
    loopCycleRef.current = 0;
    isPlayingRef.current = false;
    playheadRef.current = 0;
    setPlayheadTime(0);
    getEngine().stopAll();
    setProject(prev => prev ? { ...prev, isPlaying: false } : null);
  }, [getEngine]);

  const returnToProjects = useCallback(async () => {
    stopPlayback();
    if (project) await saveProjectNow({ ...project, isPlaying: false });
    setSelectedNotes([]);
    setSelectedClipIds([]);
    setProject(null);
    await loadProjectLibrary();
  }, [project, stopPlayback, saveProjectNow, loadProjectLibrary]);

  // КЛИК ПО ГРИДУ - ДОБАВЛЕНИЕ/УДАЛЕНИЕ НОТ
  const handleNoteContextDelete = useCallback((noteId: string) => {
    commitProject(prev => ({
      ...prev,
      tracks: prev.tracks.map(track => ({
        ...track,
        notes: track.notes.filter(note => note.id !== noteId),
      })),
    }));
    setSelectedNotes(prev => prev.filter(id => id !== noteId));
  }, [commitProject]);

  const handlePlaylistClipDelete = useCallback((clipIds: string | string[]) => {
    const ids = Array.isArray(clipIds) ? clipIds : [clipIds];
    if (ids.length === 0) return;
    commitProject(prev => ({
      ...prev,
      arrangement: prev.arrangement.filter(clip => !ids.includes(clip.id)),
    }));
    setSelectedClipIds(prev => prev.filter(id => !ids.includes(id)));
  }, [commitProject]);

  const openClipPattern = useCallback((clip: PlaylistClip) => {
    setSelectedClipIds([clip.id]);
    setProject(prev => prev ? {
      ...prev,
      activePatternId: clip.patternId,
      transportMode: 'pattern',
    } : prev);
    setEditorView('piano');
    playheadRef.current = 0;
    setPlayheadTime(0);
  }, []);

  const getSelectedClips = useCallback((p: MIDIProject) => {
    return p.arrangement.filter(c => selectedClipIds.includes(c.id));
  }, [selectedClipIds]);

  /** Selection span in beats (FL-style block duplicate/copy) */
  const getSelectionSpanBeats = useCallback((clips: PlaylistClip[]) => {
    if (clips.length === 0) return { minStart: 0, maxEnd: 0, width: 0 };
    let minStart = Infinity;
    let maxEnd = -Infinity;
    clips.forEach(c => {
      const start = c.startBar * BEATS_PER_BAR;
      const end = start + (c.lengthBeats || 0);
      minStart = Math.min(minStart, start);
      maxEnd = Math.max(maxEnd, end);
    });
    return { minStart, maxEnd, width: Math.max(0, maxEnd - minStart) };
  }, []);

  const splitSelectedClip = useCallback(() => {
    if (!project || selectedClipIds.length === 0) return;
    const splitAt = playheadRef.current;
    // Prefer the selected clip that contains the playhead; else first selected
    const selected = getSelectedClips(project);
    const clip = selected.find(c => {
      const start = c.startBar * BEATS_PER_BAR;
      const end = start + c.lengthBeats;
      return splitAt > start + quantizeMinBeat() / 2 && splitAt < end - quantizeMinBeat() / 2;
    }) || (selected.length === 1 ? selected[0] : null);
    if (!clip) return;

    const clipStart = clip.startBar * BEATS_PER_BAR;
    const clipEnd = clipStart + clip.lengthBeats;
    if (splitAt <= clipStart + quantizeMinBeat() / 2 || splitAt >= clipEnd - quantizeMinBeat() / 2) return;

    const leftLen = splitAt - clipStart;
    const rightLen = clipEnd - splitAt;
    const rightClip: PlaylistClip = {
      ...clip,
      id: crypto.randomUUID(),
      startBar: splitAt / BEATS_PER_BAR,
      offsetBeats: clip.offsetBeats + leftLen,
      lengthBeats: rightLen,
    };

    commitProject(prev => ({
      ...prev,
      arrangement: prev.arrangement.flatMap(c => {
        if (c.id !== clip.id) return [c];
        return [{ ...c, lengthBeats: leftLen }, rightClip];
      }),
      transportMode: 'song',
    }));
    setSelectedClipIds([rightClip.id]);
  }, [project, selectedClipIds, getSelectedClips, commitProject]);

  /** FL-style Ctrl+B: duplicate selection block immediately to the right */
  const duplicateSelectedClips = useCallback(() => {
    if (!project || selectedClipIds.length === 0) return;
    const selected = getSelectedClips(project);
    if (selected.length === 0) return;
    const { width } = getSelectionSpanBeats(selected);
    if (width <= 0) return;

    const copies = selected.map(clip => ({
      ...clip,
      id: crypto.randomUUID(),
      startBar: clip.startBar + width / BEATS_PER_BAR,
    }));

    commitProject(prev => ({
      ...prev,
      arrangement: [...prev.arrangement, ...copies],
      transportMode: 'song',
    }));
    setSelectedClipIds(copies.map(c => c.id));
  }, [project, selectedClipIds, getSelectedClips, getSelectionSpanBeats, commitProject]);

  const copySelectedClips = useCallback(() => {
    if (!project || selectedClipIds.length === 0) return;
    const selected = getSelectedClips(project);
    if (selected.length === 0) return;
    clipClipboardRef.current = selected.map(c => ({ ...c }));
  }, [project, selectedClipIds, getSelectedClips]);

  /** Paste at playhead, preserving relative layout of the clipboard block */
  const pasteClips = useCallback(() => {
    if (!project || clipClipboardRef.current.length === 0) return;
    const clips = clipClipboardRef.current;
    const { minStart } = getSelectionSpanBeats(clips);
    const targetStart = Math.max(0, snapToGrid(playheadRef.current));
    const shiftBeats = targetStart - minStart;

    const pasted = clips.map(clip => ({
      ...clip,
      id: crypto.randomUUID(),
      startBar: Math.max(0, (clip.startBar * BEATS_PER_BAR + shiftBeats) / BEATS_PER_BAR),
    }));

    commitProject(prev => ({
      ...prev,
      arrangement: [...prev.arrangement, ...pasted],
      transportMode: 'song',
    }));
    setSelectedClipIds(pasted.map(c => c.id));
  }, [project, getSelectionSpanBeats, snapToGrid, commitProject]);

  const selectPlaylistClip = useCallback((clip: PlaylistClip, e: { ctrlKey: boolean; metaKey: boolean }) => {
    const additive = e.ctrlKey || e.metaKey;
    setSelectedClipIds(prev => {
      if (additive) {
        return prev.includes(clip.id) ? prev.filter(id => id !== clip.id) : [...prev, clip.id];
      }
      return [clip.id];
    });
    setProject(prev => prev ? {
      ...prev,
      activePatternId: clip.type === 'audio' ? prev.activePatternId : clip.patternId,
      transportMode: 'song',
    } : prev);
  }, []);

  const beginPlaylistDrag = useCallback((
    clip: PlaylistClip,
    e: React.MouseEvent,
    type: PlaylistDragState['type'],
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!project) return;

    // Ctrl/Cmd+click = toggle selection only (no drag)
    if ((e.ctrlKey || e.metaKey) && type === 'move') {
      selectPlaylistClip(clip, e);
      return;
    }

    const alreadySelected = selectedClipIds.includes(clip.id);
    let nextSelection = selectedClipIds;
    if (!alreadySelected || type !== 'move') {
      nextSelection = [clip.id];
      setSelectedClipIds(nextSelection);
    }

    pushHistory(project);

    const moveGroup = type === 'move' && nextSelection.length > 1
      ? project.arrangement
          .filter(c => nextSelection.includes(c.id))
          .map(c => ({ clipId: c.id, startBar: c.startBar, lane: c.lane }))
      : undefined;

    playlistDragRef.current = {
      clipId: clip.id,
      type,
      startX: e.clientX,
      startY: e.clientY,
      origStartBar: clip.startBar,
      origLane: clip.lane,
      origOffsetBeats: clip.offsetBeats ?? 0,
      origLengthBeats: clip.lengthBeats ?? getPatternFullBeats(project.tracks, clip.patternId, project.patterns),
      moveGroup,
    };
  }, [project, pushHistory, selectedClipIds, selectPlaylistClip]);

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

      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      if ((e.code === 'Delete' || e.code === 'Backspace') && selectedNotes.length > 0) {
        e.preventDefault();
        commitProject(prev => ({
          ...prev,
          tracks: prev.tracks.map(track => ({
            ...track,
            notes: track.notes.filter(n => !selectedNotes.includes(n.id)),
          })),
        }));
        setSelectedNotes([]);
        return;
      }

      if ((e.code === 'Delete' || e.code === 'Backspace') && selectedClipIds.length > 0) {
        e.preventDefault();
        handlePlaylistClipDelete(selectedClipIds);
        return;
      }

      if (e.code === 'KeyS' && !e.ctrlKey && !e.metaKey && !e.altKey && selectedClipIds.length > 0) {
        e.preventDefault();
        splitSelectedClip();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyC' && selectedClipIds.length > 0 && selectedNotes.length === 0) {
        e.preventDefault();
        copySelectedClips();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyV' && clipClipboardRef.current.length > 0 && selectedNotes.length === 0) {
        e.preventDefault();
        pasteClips();
        return;
      }

      // FL Studio: Ctrl+B duplicates selection block to the right
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyB' && selectedClipIds.length > 0 && selectedNotes.length === 0) {
        e.preventDefault();
        duplicateSelectedClips();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyD' && selectedNotes.length > 0) {
        e.preventDefault();
        commitProject(prev => {
          const activePattern = prev.patterns.find(pattern => pattern.id === prev.activePatternId) || prev.patterns[0];
          return {
            ...prev,
            tracks: prev.tracks.map(track => {
              const duplicates = track.notes
                .filter(n => selectedNotes.includes(n.id))
                .map(n => ({
                  ...n,
                  id: crypto.randomUUID(),
                  startTime: Math.min(patternBeats(activePattern.length) - quantizeGrid, n.startTime + quantizeGrid),
                }));
              return { ...track, notes: [...track.notes, ...duplicates] };
            }),
          };
        });
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyD' && selectedClipIds.length > 0) {
        e.preventDefault();
        duplicateSelectedClips();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    project, selectedNotes, selectedClipIds, quantizeGrid, togglePlayback, undo, commitProject,
    handlePlaylistClipDelete, splitSelectedClip, duplicateSelectedClips, copySelectedClips, pasteClips,
  ]);

  const handleGridClick = useCallback((e: React.MouseEvent) => {
    if (!project || !project.activeTrackId || isDragging) return;
    const activePattern = getActivePattern(project);
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const beat = x / zoom;
    const pitch = HIGHEST_NOTE - Math.floor(y / NOTE_HEIGHT);
    const quantizedBeat = snapToGrid(beat);

    commitProject(prev => {
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
        const newNotes = activeTrack.notes.filter(n => n.id !== existingNote.id);
        return {
          ...prev,
          tracks: prev.tracks.map(t => 
            t.id === prev.activeTrackId ? { ...t, notes: newNotes } : t
          )
        };
      }

      const noteDuration = quantizeGrid;

      const newNote: Note = {
        id: crypto.randomUUID(),
        pitch,
        startTime: quantizedBeat,
        duration: noteDuration,
        velocity: 100,
        trackId: prev.activeTrackId!,
        patternId: activePattern.id,
      };
      
      const noteSeconds = noteDuration / (prev.bpm / 60);
      const trackSnap = activeTrack;
      const pitchSnap = pitch;
      void (async () => {
        const eng = await ensureAudio();
        if (trackSnap.customSample) {
          const buf = await eng.ensureSample(trackSnap.customSample);
          if (buf) {
            eng.playSampleBuffer(buf, 0, (trackSnap.volume || 0.9) * 0.9, noteSeconds, pitchSnap, trackSnap.eq);
          }
          // No synth fallback — missing sample stays silent until restored/re-uploaded
        } else {
          eng.playNote(trackSnap, pitchSnap, 0, noteSeconds);
        }
      })();
      
      return {
        ...prev,
        tracks: prev.tracks.map(t => 
          t.id === prev.activeTrackId 
            ? { ...t, notes: [...t.notes, newNote] } 
            : t
        )
      };
    });
  }, [project, isDragging, zoom, ensureAudio, quantizeGrid, snapToGrid, getActivePattern, commitProject]);

  // НАЧАЛО ПЕРЕТАСКИВАНИЯ НОТЫ
  const handleNoteMouseDown = useCallback((note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (project) pushHistory(project);
    
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
  }, [project, pushHistory]);

  // НАЧАЛО РАСШИРЕНИЯ НОТЫ
  const handleResizeMouseDown = useCallback((note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (project) pushHistory(project);
    
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
  }, [project, pushHistory]);

  const uploadAndLoadSample = useCallback(async (file: File) => {
    if (!project) throw new Error('No active project');
    if (file.size > MAX_SAMPLE_BYTES) {
      throw new Error('SAMPLE_TOO_LARGE');
    }
    const eng = await ensureAudio();
    const uploaded = (await midiProjectsApi.uploadSample(project.id, file)).data;
    const loaded = await eng.loadSample(file, uploaded.id);
    try {
      localStorage.setItem(getSampleServerMarkerKey(uploaded.id), '1');
    } catch {
      // Marker is only an optimization; server persistence already succeeded.
    }
    return { eng, ...loaded };
  }, [project, ensureAudio]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !project) return;
    await importAudioFile(file);
    e.target.value = '';
  };

  const importAudioFile = useCallback(async (file: File) => {
    if (!project) return;
    if (!file.type.startsWith('audio/') && !/\.(wav|mp3|ogg|flac|m4a|aiff|aif)$/i.test(file.name)) {
      console.warn('Not an audio file:', file.name, file.type);
      return;
    }

    try {
      const { eng, id: sid, duration: sampleDuration } = await uploadAndLoadSample(file);
      const tid = crypto.randomUUID();

      const newTrack: Track = {
        id: tid,
        name: file.name.replace(/\.[^.]+$/, ''),
        instrument: 'custom',
        color: '#FFFFFF',
        notes: [],
        muted: false,
        solo: false,
        volume: 0.9,
        pan: 0,
        customSample: sid,
        sampleDuration,
        reverbSend: 0,
        delaySend: 0,
      };

      // Preview the exact sample so you hear what was loaded
      const buffer = eng.samples.get(sid);
      if (buffer) eng.playSampleBuffer(buffer, 0, 0.9);

      // Keep other one-shots audible — do not force Solo on the new track
      commitProject(prev => ({
        ...prev,
        tracks: [...prev.tracks, newTrack],
        activeTrackId: tid,
      }));

      // Make sure older samples are still in memory after HMR / long session
      void Promise.all(
        project.tracks
          .filter(t => t.customSample)
          .map(t => eng.ensureSample(t.customSample!))
      );
    } catch (e) {
      console.error('Failed to import audio sample', e);
      window.alert(
        e instanceof Error && e.message === 'SAMPLE_TOO_LARGE'
          ? 'Файл слишком большой. Максимальный размер сэмпла — 6 МБ.'
          : 'Не удалось загрузить сэмпл на сервер. Попробуйте другой файл.',
      );
    }
  }, [project, uploadAndLoadSample, commitProject]);

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
    const offset = patternBeats(activePattern.length);
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
    const fullBeats = getPatternFullBeats(project.tracks, activePattern.id, project.patterns);
    const nextStartBeats = project.arrangement.reduce((maxEnd, clip) => {
      const len = clip.lengthBeats ?? getPatternFullBeats(project.tracks, clip.patternId, project.patterns);
      return Math.max(maxEnd, clip.startBar * BEATS_PER_BAR + len);
    }, 0);
    const nextStart = nextStartBeats / BEATS_PER_BAR;
    const laneUsage = new Set(
      project.arrangement
        .filter(clip => Math.abs(clip.startBar - nextStart) < 0.001)
        .map(clip => clip.lane),
    );
    let lane = 0;
    while (laneUsage.has(lane) && lane < PLAYLIST_LANES - 1) lane += 1;
    const clip: PlaylistClip = {
      id: crypto.randomUUID(),
      patternId: activePattern.id,
      startBar: nextStart,
      lane,
      offsetBeats: 0,
      lengthBeats: fullBeats,
    };
    commitProject(prev => ({
      ...prev,
      arrangement: [...prev.arrangement, clip],
      transportMode: 'song',
    }));
    setSelectedClipIds([clip.id]);
  }, [project, getActivePattern, commitProject]);

  const addPatternClipAt = useCallback((patternId: string, startBar: number, lane: number) => {
    if (!project) return;
    const safeLane = Math.max(0, Math.min(PLAYLIST_LANES - 1, lane));
    const safeStartBar = Math.max(0, Math.floor(startBar));
    const fullBeats = getPatternFullBeats(project.tracks, patternId, project.patterns);
    const clip: PlaylistClip = {
      id: crypto.randomUUID(),
      patternId,
      startBar: safeStartBar,
      lane: safeLane,
      offsetBeats: 0,
      lengthBeats: fullBeats,
    };
    commitProject(prev => ({
      ...prev,
      arrangement: [...prev.arrangement, clip],
      transportMode: 'song',
      activePatternId: patternId,
    }));
    setSelectedClipIds([clip.id]);
    setEditorView('playlist');
  }, [project, commitProject]);

  /** Drop mp3/wav loops onto the playlist: each file becomes an audio clip */
  const addAudioClipsAt = useCallback(async (files: File[], startBar: number, lane: number) => {
    if (!project || files.length === 0) return;
    const bps = project.bpm / 60;
    const newClips: PlaylistClip[] = [];
    const tooLarge: string[] = [];
    const failed: string[] = [];
    let laneCursor = Math.max(0, Math.min(PLAYLIST_LANES - 1, lane));
    for (const file of files) {
      try {
        const { id: sampleId, duration } = await uploadAndLoadSample(file);
        const lengthBeats = Math.max(quantizeMinBeat(), Math.round(duration * bps / quantizeMinBeat()) * quantizeMinBeat());
        newClips.push({
          id: crypto.randomUUID(),
          patternId: '',
          startBar: Math.max(0, Math.floor(startBar)),
          lane: laneCursor,
          offsetBeats: 0,
          lengthBeats,
          type: 'audio',
          sampleId,
          name: file.name.replace(/\.[a-z0-9]+$/i, ''),
          sampleSeconds: duration,
        });
        laneCursor = Math.min(PLAYLIST_LANES - 1, laneCursor + 1);
      } catch (error) {
        console.error('Failed to load dropped audio file:', file.name, error);
        if (error instanceof Error && error.message === 'SAMPLE_TOO_LARGE') {
          tooLarge.push(file.name);
        } else {
          failed.push(file.name);
        }
      }
    }
    if (tooLarge.length > 0) {
      window.alert(`Файлы больше 6 МБ не добавлены:\n${tooLarge.join('\n')}`);
    }
    if (failed.length > 0) {
      window.alert(`Не удалось загрузить на сервер:\n${failed.join('\n')}`);
    }
    if (newClips.length === 0) return;
    commitProject(prev => ({
      ...prev,
      arrangement: [...prev.arrangement, ...newClips],
      transportMode: 'song',
    }));
    setSelectedClipIds(newClips.map(c => c.id));
    setEditorView('playlist');
  }, [project, uploadAndLoadSample, commitProject]);

  const stopMicLevelMeter = useCallback(() => {
    if (micLevelRafRef.current) {
      cancelAnimationFrame(micLevelRafRef.current);
      micLevelRafRef.current = null;
    }
    try { micMeterSourceRef.current?.disconnect(); } catch { /* noop */ }
    micMeterSourceRef.current = null;
    micAnalyserRef.current = null;
    setMicLevel(0);
  }, []);

  const disconnectMicMonitor = useCallback(() => {
    try { monitorSourceRef.current?.disconnect(); } catch { /* noop */ }
    try { monitorGainRef.current?.disconnect(); } catch { /* noop */ }
    monitorSourceRef.current = null;
    monitorGainRef.current = null;
  }, []);

  const refreshMicDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const mics = devices.filter(d => d.kind === 'audioinput');
      setMicDevices(mics);
      if (mics.length > 0 && selectedMicId && !mics.some(m => m.deviceId === selectedMicId)) {
        setSelectedMicId(mics[0].deviceId);
      }
    } catch (error) {
      console.warn('enumerateDevices failed', error);
    }
  }, [selectedMicId]);

  const startMicLevelMeter = useCallback((stream: MediaStream, ctx: AudioContext) => {
    stopMicLevelMeter();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.7;
    const source = ctx.createMediaStreamSource(stream);
    source.connect(analyser);
    micMeterSourceRef.current = source;
    micAnalyserRef.current = analyser;
    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      setMicLevel(Math.min(1, rms * 3.2));
      micLevelRafRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, [stopMicLevelMeter]);

  const applyMicMonitor = useCallback(async (stream: MediaStream, enabled: boolean) => {
    const eng = await ensureAudio();
    disconnectMicMonitor();
    if (!enabled) return;
    const source = eng.ctx.createMediaStreamSource(stream);
    const gain = eng.ctx.createGain();
    gain.gain.value = 0.9;
    source.connect(gain);
    gain.connect(eng.ctx.destination);
    monitorSourceRef.current = source;
    monitorGainRef.current = gain;
  }, [ensureAudio, disconnectMicMonitor]);

  const closeMicStream = useCallback(() => {
    stopMicLevelMeter();
    disconnectMicMonitor();
    recordStreamRef.current?.getTracks().forEach(track => track.stop());
    recordStreamRef.current = null;
    setMicArmed(false);
  }, [stopMicLevelMeter, disconnectMicMonitor]);

  const openMicStream = useCallback(async (deviceId?: string) => {
    // Disable browser "enhancements" — they add 80–200ms latency and throw vocals off the grid.
    const constraints: MediaStreamConstraints = {
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 1,
      },
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    // Labels appear only after permission — refresh list
    await refreshMicDevices();
    const eng = await ensureAudio();
    await eng.resume();
    recordStreamRef.current = stream;
    startMicLevelMeter(stream, eng.ctx);
    if (micMonitorOn) await applyMicMonitor(stream, true);
    setMicArmed(true);
    return stream;
  }, [refreshMicDevices, ensureAudio, startMicLevelMeter, micMonitorOn, applyMicMonitor]);

  const selectMicrophone = useCallback(async (deviceId: string) => {
    setSelectedMicId(deviceId);
    try { localStorage.setItem('soundlab_mic_id', deviceId); } catch { /* noop */ }
    const wasRecording = isRecording;
    const wasArmed = micArmed || Boolean(recordStreamRef.current);
    if (wasRecording) {
      window.alert('Сначала остановите запись, потом смените микрофон.');
      return;
    }
    if (wasArmed) {
      closeMicStream();
      try {
        await openMicStream(deviceId || undefined);
      } catch (error) {
        console.error(error);
        window.alert('Не удалось переключить микрофон.');
      }
    }
  }, [isRecording, micArmed, closeMicStream, openMicStream]);

  const toggleMicMonitor = useCallback(async () => {
    const next = !micMonitorOn;
    setMicMonitorOn(next);
    const stream = recordStreamRef.current;
    if (stream) {
      try {
        await applyMicMonitor(stream, next);
      } catch (error) {
        console.error(error);
      }
    }
  }, [micMonitorOn, applyMicMonitor]);

  const armMicrophone = useCallback(async () => {
    if (recordStreamRef.current) {
      closeMicStream();
      return;
    }
    try {
      await openMicStream(selectedMicId || undefined);
    } catch (error) {
      console.error('Microphone access denied:', error);
      window.alert('Нет доступа к микрофону. Разрешите доступ в настройках браузера.');
    }
  }, [openMicStream, selectedMicId, closeMicStream]);

  const stopVocalRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try { recorder.requestData(); } catch { /* noop */ }
      recorder.stop();
    }
    mediaRecorderRef.current = null;
    setIsRecording(false);
    if (recordTimerRef.current) {
      window.clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    setRecordElapsedSec(0);
    // Keep mic armed for next take (stream stays open); just stop the recorder.
  }, []);

  const startVocalRecording = useCallback(async () => {
    if (!project || isRecording) return;
    setEditorView('playlist');

    // Always reopen mic with low-latency constraints (no AGC / echo cancel).
    let stream: MediaStream;
    try {
      closeMicStream();
      stream = await openMicStream(selectedMicId || undefined);
    } catch (error) {
      console.error('Microphone access denied:', error);
      window.alert('Нет доступа к микрофону. Разрешите доступ в настройках браузера.');
      return;
    }

    // Start backing track first so the singer hears the beat before MediaRecorder buffers.
    const eng = await ensureAudio();
    await eng.resume();
    if (project.transportMode !== 'song') {
      setProject(prev => prev ? { ...prev, transportMode: 'song' } : prev);
      if (latestProjectRef.current) {
        latestProjectRef.current = { ...latestProjectRef.current, transportMode: 'song' };
      }
    }
    if (!isPlayingRef.current) {
      await Promise.all([
        ...project.tracks
          .filter(t => t.customSample)
          .map(t => eng.ensureSample(t.customSample!)),
        ...project.arrangement
          .filter(c => c.type === 'audio' && c.sampleId)
          .map(c => eng.ensureSample(c.sampleId!)),
      ]);
      startPlayback();
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    }

    const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
      .find(type => MediaRecorder.isTypeSupported(type)) || '';
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];
    const projectIdAtStart = project.id;
    const bpmAtStart = project.bpm;
    const takeNumber = project.arrangement.filter(c => c.isVocal).length + 1;
    recordStartBeatRef.current = playheadRef.current;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstart = () => {
      // Stamp the live playhead when the recorder actually starts (not when REC was clicked).
      recordStartBeatRef.current = playheadRef.current;
    };
    recorder.onstop = () => {
      void (async () => {
        stopPlayback();
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size === 0) {
          window.alert('Пустая запись — проверьте микрофон и уровень.');
          return;
        }
        if (blob.size > MAX_SAMPLE_BYTES) {
          window.alert('Запись получилась больше 6 МБ — сократите дубль.');
          return;
        }
        const extension = (recorder.mimeType || 'audio/webm').includes('mp4') ? 'm4a' : 'webm';
        const file = new File([blob], `vocal-take-${takeNumber}.${extension}`, { type: blob.type });
        try {
          const { eng: loadEng, id: sampleId, duration } = await uploadAndLoadSample(file);
          const buf = loadEng.samples.get(sampleId);
          const trimmedDuration = buf?.duration ?? duration;
          const bps = bpmAtStart / 60;
          const lengthBeats = Math.max(quantizeMinBeat(), trimmedDuration * bps);
          // Pull clip earlier by measured input latency so takes land on the grid.
          const engLatency = (loadEng.ctx.baseLatency || 0)
            + ((loadEng.ctx as AudioContext & { outputLatency?: number }).outputLatency || 0);
          const latencySec = VOCAL_REC_LATENCY_SEC + Math.min(0.08, engLatency * 0.5);
          const startBeat = Math.max(0, recordStartBeatRef.current - latencySec * bps);
          const startBar = startBeat / BEATS_PER_BAR;
          const usedLanes = new Set((latestProjectRef.current?.arrangement ?? []).map(c => c.lane));
          let lane = PLAYLIST_LANES - 1;
          for (let i = 0; i < PLAYLIST_LANES; i++) {
            if (!usedLanes.has(i)) { lane = i; break; }
          }
          const flatFx = normalizeClipFx(undefined);
          const clip: PlaylistClip = {
            id: crypto.randomUUID(),
            patternId: '',
            startBar,
            lane,
            offsetBeats: 0,
            lengthBeats,
            type: 'audio',
            sampleId,
            name: `Вокал ${takeNumber}`,
            sampleSeconds: trimmedDuration,
            isVocal: true,
            gain: 1,
            eq: { enabled: false, low: 0, mid: 0, high: 0 },
            fx: flatFx,
          };
          commitProject(prev => {
            if (prev.id !== projectIdAtStart) return prev;
            return {
              ...prev,
              arrangement: [...prev.arrangement, clip],
              transportMode: 'song',
            };
          });
          setSelectedClipIds([clip.id]);
          setEditorView('playlist');
          setVocalPanelClipId(clip.id);
        } catch (error) {
          console.error('Failed to save vocal recording:', error);
          window.alert('Не удалось сохранить запись.');
        }
      })();
    };

    mediaRecorderRef.current = recorder;
    recorder.start(100);
    setIsRecording(true);
    recordStartedAtRef.current = Date.now();
    setRecordElapsedSec(0);
    if (recordTimerRef.current) window.clearInterval(recordTimerRef.current);
    recordTimerRef.current = window.setInterval(() => {
      setRecordElapsedSec(Math.floor((Date.now() - recordStartedAtRef.current) / 1000));
    }, 250);
  }, [
    project,
    isRecording,
    stopPlayback,
    startPlayback,
    uploadAndLoadSample,
    commitProject,
    openMicStream,
    closeMicStream,
    selectedMicId,
    ensureAudio,
  ]);

  useEffect(() => {
    void refreshMicDevices();
    const onChange = () => { void refreshMicDevices(); };
    navigator.mediaDevices?.addEventListener?.('devicechange', onChange);
    return () => navigator.mediaDevices?.removeEventListener?.('devicechange', onChange);
  }, [refreshMicDevices]);

  // Release the microphone if the editor unmounts mid-recording
  useEffect(() => () => {
    if (recordTimerRef.current) window.clearInterval(recordTimerRef.current);
    stopMicLevelMeter();
    disconnectMicMonitor();
    recordStreamRef.current?.getTracks().forEach(track => track.stop());
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, [stopMicLevelMeter, disconnectMicMonitor]);

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
    reader.onload = async (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string) as Partial<MIDIProject>;
        if (imported.tracks && imported.bpm) {
          setProjectActionLoading(true);
          const upgraded = hydrateMidiProject(imported);
          const created = (await midiProjectsApi.create(
            upgraded.name,
            projectForStorage(upgraded),
          )).data;
          playheadRef.current = 0;
          setPlayheadTime(0);
          setProject(hydrateMidiProject(created.data as Partial<MIDIProject>, created.id));
          setSaveStatus('saved');
        }
      } catch (err) {
        console.error('Failed to import project:', err);
        setLibraryError('Не удалось импортировать проект.');
      } finally {
        setProjectActionLoading(false);
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  if (!project) {
    const formatUpdated = (iso: string) =>
      new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

    return (
      <div className="midi-lib">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&display=swap');
          .midi-lib {
            --ml-bg: #050505;
            --ml-surface: #0e0e0f;
            --ml-elevated: #171718;
            --ml-hover: #1f1f21;
            --ml-line: rgba(255,255,255,0.1);
            --ml-line-strong: rgba(255,255,255,0.18);
            --ml-text: #f5f5f7;
            --ml-muted: #8e8e93;
            --ml-dim: #636366;
            --ml-red: #ff453a;
            min-height: 100vh;
            background:
              linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px),
              var(--ml-bg);
            background-size: 48px 48px, 48px 48px, auto;
            color: var(--ml-text);
            font-family: 'Instrument Sans', ui-sans-serif, sans-serif;
            padding: clamp(28px, 4vh, 56px) clamp(20px, 4vw, 56px) 56px;
            box-sizing: border-box;
            -webkit-font-smoothing: antialiased;
          }
          .midi-lib-shell {
            max-width: 1280px; margin: 0 auto;
            display: grid; grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
            gap: clamp(24px, 3vw, 48px); align-items: start;
          }
          .midi-lib-side {
            position: sticky; top: 28px;
            border: 1px solid var(--ml-line); border-radius: 18px;
            background: var(--ml-surface); padding: 28px 26px 24px;
          }
          .midi-lib-brand {
            font-size: 12px; font-weight: 600; letter-spacing: 0.2em;
            text-transform: uppercase; color: var(--ml-muted); margin: 0 0 20px;
          }
          .midi-lib-title {
            margin: 0; font-size: clamp(36px, 4vw, 52px); font-weight: 700;
            letter-spacing: -0.045em; line-height: 1.02;
          }
          .midi-lib-lead {
            margin: 12px 0 0; font-size: 15px; line-height: 1.5;
            color: var(--ml-muted); font-weight: 400;
          }
          .midi-lib-stats {
            display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
            margin: 28px 0 0;
          }
          .midi-lib-stat {
            border: 1px solid var(--ml-line); border-radius: 12px;
            padding: 14px 14px 12px; background: var(--ml-elevated);
          }
          .midi-lib-stat-label {
            font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase;
            color: var(--ml-dim); margin: 0 0 6px;
          }
          .midi-lib-stat-value {
            margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.03em;
          }
          .midi-lib-create {
            margin-top: 28px; padding-top: 22px;
            border-top: 1px solid var(--ml-line);
            display: flex; flex-direction: column; gap: 10px;
          }
          .midi-lib-create-label {
            font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase;
            color: var(--ml-dim); margin: 0;
          }
          .midi-lib-input {
            width: 100%; height: 44px; padding: 0 14px; box-sizing: border-box;
            border-radius: 10px; border: 1px solid var(--ml-line);
            background: #09090a; color: var(--ml-text);
            font: inherit; font-size: 15px; outline: none;
          }
          .midi-lib-input::placeholder { color: var(--ml-dim); }
          .midi-lib-input:focus { border-color: var(--ml-line-strong); }
          .midi-lib-actions { display: flex; gap: 8px; flex-wrap: wrap; }
          .midi-lib-btn {
            height: 42px; padding: 0 14px; border-radius: 10px;
            border: 1px solid var(--ml-line); background: var(--ml-elevated);
            color: var(--ml-text); font: inherit; font-size: 13px; font-weight: 600;
            cursor: pointer; display: inline-flex; align-items: center; gap: 7px;
            white-space: nowrap;
          }
          .midi-lib-btn:disabled { opacity: 0.4; cursor: default; }
          .midi-lib-btn:hover:not(:disabled) { background: var(--ml-hover); border-color: var(--ml-line-strong); }
          .midi-lib-btn-primary {
            background: #f5f5f7; border-color: #f5f5f7; color: #111;
            flex: 1; justify-content: center;
          }
          .midi-lib-btn-primary:hover:not(:disabled) { background: #fff; border-color: #fff; }
          .midi-lib-btn-icon { width: 42px; padding: 0; justify-content: center; }
          .midi-lib-main { min-width: 0; }
          .midi-lib-main-head {
            display: flex; align-items: flex-end; justify-content: space-between;
            gap: 16px; margin-bottom: 18px;
          }
          .midi-lib-main-title {
            margin: 0; font-size: 20px; font-weight: 600; letter-spacing: -0.02em;
          }
          .midi-lib-main-sub { margin: 4px 0 0; font-size: 13px; color: var(--ml-muted); }
          .midi-lib-error {
            margin: 0 0 16px; padding: 12px 14px; border-radius: 10px;
            border: 1px solid rgba(255,255,255,0.16); background: var(--ml-elevated);
            color: #d1d1d6; font-size: 13px;
          }
          .midi-lib-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
            gap: 12px;
          }
          .midi-lib-card {
            border: 1px solid var(--ml-line); border-radius: 14px;
            background: var(--ml-surface); padding: 18px;
            display: flex; flex-direction: column; gap: 18px; min-height: 148px;
            transition: background 0.12s ease, border-color 0.12s ease;
          }
          .midi-lib-card:hover { background: var(--ml-elevated); border-color: var(--ml-line-strong); }
          .midi-lib-card-top {
            display: flex; align-items: flex-start; justify-content: space-between; gap: 10px;
          }
          .midi-lib-card-mark {
            width: 36px; height: 36px; border-radius: 9px;
            border: 1px solid var(--ml-line); background: #0a0a0b;
            display: flex; align-items: center; justify-content: center; color: #d1d1d6;
          }
          .midi-lib-card-tools { display: flex; gap: 4px; }
          .midi-lib-icon-btn {
            width: 34px; height: 34px; border-radius: 8px; border: 1px solid transparent;
            background: transparent; color: var(--ml-muted); cursor: pointer;
            display: flex; align-items: center; justify-content: center;
          }
          .midi-lib-icon-btn:hover {
            color: var(--ml-text); border-color: var(--ml-line); background: #0a0a0b;
          }
          .midi-lib-icon-btn.danger:hover {
            color: var(--ml-red); border-color: rgba(255,69,58,0.35); background: rgba(255,69,58,0.08);
          }
          .midi-lib-card-name {
            margin: 0; font-size: 18px; font-weight: 600; letter-spacing: -0.025em;
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          }
          .midi-lib-card-meta {
            margin: 6px 0 0; font-size: 12px; color: var(--ml-muted);
          }
          .midi-lib-rename {
            width: 100%; height: 40px; padding: 0 12px; box-sizing: border-box;
            border-radius: 8px; border: 1px solid var(--ml-line-strong);
            background: #09090a; color: var(--ml-text); font: inherit; font-size: 15px; outline: none;
          }
          .midi-lib-rename-actions { display: flex; gap: 6px; margin-top: 10px; }
          .midi-lib-open {
            margin-top: auto; height: 36px; border-radius: 8px;
            border: 1px solid var(--ml-line); background: transparent;
            color: var(--ml-text); font: inherit; font-size: 13px; font-weight: 600;
            cursor: pointer; width: 100%;
          }
          .midi-lib-open:hover { background: #0a0a0b; border-color: var(--ml-line-strong); }
          .midi-lib-open:disabled { opacity: 0.45; cursor: wait; }
          .midi-lib-empty {
            padding: 72px 28px; text-align: center; color: var(--ml-muted);
            border: 1px solid var(--ml-line); border-radius: 14px; background: var(--ml-surface);
          }
          .midi-lib-empty h2 {
            margin: 14px 0 6px; font-size: 22px; font-weight: 600;
            color: var(--ml-text); letter-spacing: -0.02em;
          }
          .midi-lib-empty p { margin: 0; font-size: 14px; line-height: 1.45; }
          .midi-lib-loading {
            padding: 64px; text-align: center; color: var(--ml-muted); font-size: 14px;
            border: 1px solid var(--ml-line); border-radius: 14px; background: var(--ml-surface);
          }
          .midi-lib-foot {
            margin-top: 18px; font-size: 12px; color: var(--ml-dim);
          }
          @media (max-width: 900px) {
            .midi-lib-shell { grid-template-columns: 1fr; }
            .midi-lib-side { position: static; }
          }
        `}</style>

        <div className="midi-lib-shell">
          <aside className="midi-lib-side">
            <p className="midi-lib-brand">SoundLab</p>
            <h1 className="midi-lib-title">Projects</h1>
            <p className="midi-lib-lead">
              Библиотека битов в аккаунте. Откройте проект или создайте новый — автосохранение всегда включено.
            </p>

            <div className="midi-lib-stats">
              <div className="midi-lib-stat">
                <p className="midi-lib-stat-label">Всего</p>
                <p className="midi-lib-stat-value">{projectsLoading ? '—' : projects.length}</p>
              </div>
              <div className="midi-lib-stat">
                <p className="midi-lib-stat-label">Лимит семпла</p>
                <p className="midi-lib-stat-value" style={{ fontSize: 22 }}>6 MB</p>
              </div>
            </div>

            <div className="midi-lib-create">
              <p className="midi-lib-create-label">Новый проект</p>
              <input
                className="midi-lib-input"
                value={newProjectName}
                onChange={event => setNewProjectName(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter' && !projectActionLoading) void createNewProject();
                }}
                maxLength={100}
                placeholder="Название"
              />
              <div className="midi-lib-actions">
                <button
                  type="button"
                  className="midi-lib-btn midi-lib-btn-primary"
                  onClick={() => void createNewProject()}
                  disabled={projectActionLoading}
                >
                  <Plus size={15} />
                  Создать
                </button>
                <label className="midi-lib-btn" style={{ margin: 0 }}>
                  <Upload size={15} />
                  Импорт
                  <input type="file" accept=".json" onChange={importProject} style={{ display: 'none' }} />
                </label>
              </div>
            </div>
          </aside>

          <section className="midi-lib-main">
            <div className="midi-lib-main-head">
              <div>
                <h2 className="midi-lib-main-title">Ваши проекты</h2>
                <p className="midi-lib-main-sub">Нажмите «Открыть» или переименуйте через карандаш</p>
              </div>
              <button
                type="button"
                className="midi-lib-btn midi-lib-btn-icon"
                onClick={() => void loadProjectLibrary()}
                disabled={projectsLoading}
                title="Обновить"
              >
                <RefreshCw size={16} />
              </button>
            </div>

            {libraryError && <div className="midi-lib-error">{libraryError}</div>}

            {projectsLoading ? (
              <div className="midi-lib-loading">Загрузка…</div>
            ) : projects.length === 0 ? (
              <div className="midi-lib-empty">
                <FolderOpen size={30} strokeWidth={1.5} />
                <h2>Пока пусто</h2>
                <p>Создайте первый проект слева — он появится в этой сетке.</p>
              </div>
            ) : (
              <div className="midi-lib-grid">
                {projects.map(item => {
                  const isRenaming = renamingProjectId === item.id;
                  return (
                    <article key={item.id} className="midi-lib-card">
                      <div className="midi-lib-card-top">
                        <div className="midi-lib-card-mark">
                          <Music size={16} strokeWidth={1.75} />
                        </div>
                        <div className="midi-lib-card-tools">
                          {!isRenaming && (
                            <button
                              type="button"
                              className="midi-lib-icon-btn"
                              title="Переименовать"
                              onClick={() => beginRenameProject(item)}
                            >
                              <Pencil size={14} />
                            </button>
                          )}
                          <button
                            type="button"
                            className="midi-lib-icon-btn danger"
                            title="Удалить"
                            onClick={() => void deleteProject(item)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {isRenaming ? (
                        <div>
                          <input
                            className="midi-lib-rename"
                            value={renameDraft}
                            autoFocus
                            maxLength={100}
                            onChange={event => setRenameDraft(event.target.value)}
                            onKeyDown={event => {
                              if (event.key === 'Enter') void saveRenameProject(item);
                              if (event.key === 'Escape') cancelRenameProject();
                            }}
                          />
                          <div className="midi-lib-rename-actions">
                            <button
                              type="button"
                              className="midi-lib-btn midi-lib-btn-primary"
                              style={{ height: 34, flex: 1 }}
                              disabled={projectActionLoading}
                              onClick={() => void saveRenameProject(item)}
                            >
                              Сохранить
                            </button>
                            <button
                              type="button"
                              className="midi-lib-btn"
                              style={{ height: 34 }}
                              onClick={cancelRenameProject}
                            >
                              Отмена
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <h3 className="midi-lib-card-name" title={item.name}>{item.name}</h3>
                          <p className="midi-lib-card-meta">Изменён {formatUpdated(item.updatedAt)}</p>
                        </div>
                      )}

                      {!isRenaming && (
                        <button
                          type="button"
                          className="midi-lib-open"
                          disabled={projectActionLoading}
                          onClick={() => void openProject(item.id)}
                        >
                          Открыть
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            )}

            <p className="midi-lib-foot">Автосохранение · Проекты привязаны к аккаунту</p>
          </section>
        </div>
      </div>
    );
  }

  const activePattern = getActivePattern(project);
  const timelineLength = getTimelineLength(project);
  const patternBeatLength = patternBeats(activePattern.length);

  return (
    <div className="midi-studio">
      <style>{STUDIO_CSS}</style>

      <header className="st-topbar">
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14 }}>
          <div className="st-brand">
            <div className="st-brand-mark">
              <Activity size={15} strokeWidth={1.75} />
            </div>
            <input
              className="st-project-name"
              value={project.name}
              onChange={event => setProject({ ...project, name: event.target.value.slice(0, 100) })}
              onBlur={() => {
                if (!project.name.trim()) setProject({ ...project, name: 'Без названия' });
              }}
              title="Название проекта"
            />
          </div>

          <div className="st-meta">
            <div className="st-field">
              <span className="st-label">Tempo</span>
              <input
                className="st-input"
                type="number"
                value={project.bpm}
                onChange={e => {
                  const val = parseInt(e.target.value);
                  if (val > 0 && val <= 300) setProject({ ...project, bpm: val });
                }}
              />
            </div>

            <div className="st-field">
              <span className="st-label">Metronome</span>
              <button
                type="button"
                className={`st-chip ${project.metronomeEnabled ? 'on' : ''}`}
                title={project.metronomeEnabled ? 'Выключить метроном' : 'Включить метроном'}
                onClick={() => commitProject(prev => ({ ...prev, metronomeEnabled: !prev.metronomeEnabled }))}
              >
                <Activity size={12} />
                {project.metronomeEnabled ? 'ON' : 'OFF'}
              </button>
            </div>

            <div className="st-field">
              <span className="st-label">Pattern</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <select
                  className="st-select"
                  value={project.activePatternId}
                  onChange={e => {
                    playheadRef.current = 0;
                    setPlayheadTime(0);
                    setProject({ ...project, activePatternId: e.target.value, transportMode: 'pattern' });
                  }}
                >
                  {project.patterns.map(pattern => (
                    <option key={pattern.id} value={pattern.id}>{pattern.name}</option>
                  ))}
                </select>
                <button type="button" className="st-chip ghost" onClick={createPattern} title="Новый паттерн">+</button>
              </div>
            </div>

            <div className="st-field">
              <span className="st-label">Length</span>
              <select
                className="st-select"
                value={activePattern.length}
                onChange={e => {
                  const nextLength = parseInt(e.target.value, 10);
                  setProject({
                    ...project,
                    patternLength: nextLength,
                    patterns: project.patterns.map(pattern =>
                      pattern.id === project.activePatternId ? { ...pattern, length: nextLength } : pattern
                    ),
                  });
                  const beats = patternBeats(nextLength);
                  if (playheadRef.current >= beats) {
                    playheadRef.current = 0;
                    setPlayheadTime(0);
                  }
                }}
              >
                {Array.from(new Set([...PATTERN_LENGTH_OPTIONS, activePattern.length]))
                  .sort((a, b) => a - b)
                  .map(len => (
                    <option key={len} value={len}>{len} такта (1–{len + 1})</option>
                  ))}
              </select>
            </div>

            <div className="st-field">
              <span className="st-label">Quantize</span>
              <select
                className="st-select"
                value={quantizeGrid}
                onChange={e => setQuantizeGrid(parseFloat(e.target.value))}
                title="Зажми ⌥ Option (Mac) / Alt (Win) при обрезке — шаг 1/10 клетки"
              >
                <option value={0.5}>1/8 (8 в такте)</option>
                <option value={1}>1/4 (4 в такте)</option>
                <option value={0.25}>1/16</option>
                <option value={0.125}>1/32</option>
              </select>
              <span className="st-hint">⌥/Alt = точно</span>
            </div>

            <button type="button" className="st-chip" onClick={duplicatePatternNotes} title="Duplicate all notes to next pattern block">
              Dup Pattern
            </button>
          </div>
        </div>

        <div className="st-actions">
          <div className="st-seg">
            <button
              type="button"
              className={project.transportMode === 'pattern' ? 'on' : ''}
              onClick={() => setProject({ ...project, transportMode: 'pattern' })}
            >
              Pattern
            </button>
            <button
              type="button"
              className={project.transportMode === 'song' ? 'on' : ''}
              onClick={() => setProject({ ...project, transportMode: 'song' })}
            >
              Song
            </button>
          </div>
          <button type="button" className="st-chip" onClick={addPatternToPlaylist}>+ Playlist</button>
          <button
            type="button"
            className="st-chip"
            onClick={() => void saveProjectNow(project)}
            disabled={saveStatus === 'saving'}
          >
            <Save size={13} /> Save
          </button>
          <span
            className="st-save-dot"
            title={saveStatus === 'error' ? 'Ошибка сохранения' : saveStatus === 'saving' ? 'Сохранение…' : 'Сохранено'}
            style={{
              background: saveStatus === 'error' ? '#ff453a' : saveStatus === 'saving' ? '#ffd60a' : '#30d158',
            }}
          />
          <div className="st-transport">
            <button type="button" onClick={stopPlayback} title="Stop"><Square size={15} /></button>
            <button
              type="button"
              className={`play ${project.isPlaying ? 'playing' : ''}`}
              onClick={togglePlayback}
              title={project.isPlaying ? 'Pause' : 'Play'}
            >
              {project.isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button
              type="button"
              className={`click ${project.metronomeEnabled ? 'on' : ''}`}
              title={project.metronomeEnabled ? 'Выключить метроном' : 'Включить метроном'}
              onClick={() => commitProject(prev => ({ ...prev, metronomeEnabled: !prev.metronomeEnabled }))}
            >
              <Activity size={14} />
              {project.metronomeEnabled ? 'Click' : 'Mute'}
            </button>
          </div>
          <button type="button" className="st-chip ghost" onClick={() => void returnToProjects()} title="Вернуться к проектам">
            <ArrowLeft size={14} /> Projects
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="st-body">
        {/* Sidebar */}
        <aside className="st-side">
          <div className="st-side-scroll">
            <div className="st-panel">
              <div className="st-section-title" style={{ marginBottom: 10 }}>Browser</div>
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
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: pattern.id === project.activePatternId ? '1px solid rgba(245,245,247,0.35)' : '1px solid rgba(255,255,255,0.08)',
                      background: pattern.id === project.activePatternId ? 'rgba(245,245,247,0.1)' : 'rgba(255,255,255,0.02)',
                      color: pattern.id === project.activePatternId ? '#F5F5F7' : '#8e8e93',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 500,
                      fontFamily: 'inherit',
                    }}
                  >
                    <span>{pattern.name}</span>
                    <span style={{ color: '#636366' }}>{pattern.length} bars</span>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 className="st-section-title">Tracks</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="file" id="sample-in" style={{ display: 'none' }} accept="audio/*,.wav,.mp3,.ogg,.flac,.m4a" onChange={handleFileUpload} />
                <label
                  htmlFor="sample-in"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.dataTransfer.dropEffect = 'copy';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const file = e.dataTransfer.files?.[0];
                    if (file) void importAudioFile(file);
                  }}
                  title="Upload or drop one-shot here"
                  className="st-chip ghost"
                  style={{ width: 34, height: 34, padding: 0, justifyContent: 'center' }}
                >
                  <Upload size={14} />
                </label>
                <button
                  type="button"
                  onClick={() => setEqPanelOpen(open => !open)}
                  title="Обработка активного трека (эквалайзер)"
                  className={`st-chip ${eqPanelOpen || project.tracks.find(t => t.id === project.activeTrackId)?.eq?.enabled ? 'on' : ''}`}
                >
                  <Sliders size={13} /> FX
                </button>
              </div>
            </div>

            {eqPanelOpen && (() => {
              const activeTrack = project.tracks.find(t => t.id === project.activeTrackId);
              if (!activeTrack) return null;
              const eq = normalizeTrackEq(activeTrack.eq);
              const updateEq = (patch: Partial<TrackEq>) => {
                setProject(prev => prev ? {
                  ...prev,
                  tracks: prev.tracks.map(t => t.id === activeTrack.id
                    ? { ...t, eq: { ...normalizeTrackEq(t.eq), ...patch } }
                    : t),
                } : prev);
              };
              const activePreset = EQ_PRESETS.find(p => p.low === eq.low && p.mid === eq.mid && p.high === eq.high);
              return (
                <div className="st-panel" style={{ borderColor: 'rgba(245,245,247,0.18)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ fontSize: 11, letterSpacing: -0.01, color: '#F5F5F7', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 150 }}>
                      EQ · {activeTrack.name}
                    </div>
                    <button
                      type="button"
                      onClick={() => updateEq({ enabled: !eq.enabled })}
                      className={`st-chip ${eq.enabled ? 'on' : ''}`}
                    >
                      {eq.enabled ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  <div className="st-label" style={{ marginBottom: 6 }}>Пресеты</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                    {EQ_PRESETS.map(preset => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => updateEq({ enabled: true, low: preset.low, mid: preset.mid, high: preset.high })}
                        className={`st-chip ${activePreset?.id === preset.id ? 'on' : ''}`}
                        style={{ height: 28, fontSize: 11 }}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>

                  {EQ_BANDS.map(band => (
                    <div key={band.key} style={{ marginBottom: 10, opacity: eq.enabled ? 1 : 0.45 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 600, color: '#8e8e93', marginBottom: 4 }}>
                        <span>{band.label} <span style={{ color: '#636366' }}>{band.hint}</span></span>
                        <span style={{ color: eq[band.key] > 0 ? '#30d158' : eq[band.key] < 0 ? '#ff9f0a' : '#636366', fontFamily: "'IBM Plex Mono', monospace" }}>
                          {eq[band.key] > 0 ? '+' : ''}{eq[band.key]} dB
                        </span>
                      </div>
                      <input
                        type="range"
                        min={-EQ_GAIN_LIMIT}
                        max={EQ_GAIN_LIMIT}
                        step={1}
                        value={eq[band.key]}
                        onChange={e => updateEq({ enabled: true, [band.key]: Number(e.target.value) })}
                        style={{ width: '100%', accentColor: '#F5F5F7' }}
                      />
                    </div>
                  ))}
                  <div style={{ fontSize: 11, color: '#636366', lineHeight: 1.4 }}>
                    Действует на выбранный трек при проигрывании нот и сэмплов.
                  </div>
                </div>
              );
            })()}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {project.tracks.map(track => (
                <div key={track.id} onClick={() => setProject({...project, activeTrackId: track.id})} style={{ 
                  padding: 14, borderRadius: 14, border: '1px solid', cursor: 'pointer', 
                  transition: 'background 0.15s, border-color 0.15s, opacity 0.15s', 
                  background: project.activeTrackId === track.id ? 'rgba(255,255,255,0.06)' : 'transparent', 
                  borderColor: project.activeTrackId === track.id ? 'rgba(255,255,255,0.14)' : 'transparent', 
                  opacity: project.activeTrackId === track.id ? 1 : 0.55
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: track.color }} />
                      <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120, letterSpacing: -0.02 }}>{track.name}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={e => { e.stopPropagation(); setProject({...project, tracks: project.tracks.map(t => t.id === track.id ? {...t, muted: !t.muted} : t)}); }} style={{ 
                        width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        fontSize: 9, fontWeight: 700, borderRadius: 7, border: 'none', cursor: 'pointer', 
                        background: track.muted ? '#ff453a' : 'rgba(255,255,255,0.08)', color: 'white'
                      }}>M</button>
                      <button onClick={e => { e.stopPropagation(); setProject({...project, tracks: project.tracks.map(t => t.id === track.id ? {...t, solo: !t.solo} : t)}); }} style={{ 
                        width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        fontSize: 9, fontWeight: 700, borderRadius: 7, border: 'none', cursor: 'pointer', 
                        background: track.solo ? '#F5F5F7' : 'rgba(255,255,255,0.08)', color: track.solo ? '#111' : 'white'
                      }}>S</button>
                      {project.tracks.length > 1 && (
                        <button onClick={e => { e.stopPropagation(); handleDeleteTrack(track.id); }} style={{ 
                          width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', 
                          fontSize: 12, fontWeight: 700, borderRadius: 7, border: 'none', cursor: 'pointer', 
                          background: 'rgba(255,69,58,0.15)', color: '#ff453a'
                        }}>×</button>
                      )}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Volume2 size={12} style={{ color: '#636366' }} />
                    <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: track.color, width: `${track.volume * 100}%`, borderRadius: 2 }} />
                    </div>
                    <span style={{ fontSize: 10, color: '#636366', fontFamily: "'IBM Plex Mono', monospace", minWidth: 32, textAlign: 'right' }}>{Math.round(track.volume * 100)}%</span>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <h3 className="st-section-title" style={{ marginBottom: 12 }}>Add Instrument</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {INSTRUMENTS.map(inst => (
                  <button key={inst.id} onClick={() => addDefaultTrack(inst.id)} style={{ 
                    padding: 14, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', 
                    borderRadius: 12, cursor: 'pointer', transition: 'all 0.15s', 
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: '#8e8e93',
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; e.currentTarget.style.color = '#F5F5F7'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#8e8e93'; }}>
                    <inst.icon size={16} />
                    <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.06em' }}>{inst.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Piano Roll */}
        <div className="st-main">
          {/* Toolbar */}
          <div className="st-toolbar">
            <span style={{ fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: 10, color: '#636366' }}>Timeline</span>
            <div className="st-seg">
              <button
                type="button"
                className={editorView === 'piano' ? 'on' : ''}
                onClick={() => setEditorView('piano')}
              >
                Piano
              </button>
              <button
                type="button"
                className={editorView === 'playlist' ? 'on' : ''}
                onClick={() => setEditorView('playlist')}
              >
                Playlist
              </button>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <button type="button" onClick={undo} title="Undo (Ctrl+Z)" className="st-chip ghost">
                <Undo2 size={14} /> Undo
              </button>
              <button type="button" onClick={() => setZoom(z => Math.max(24, Math.round(z / 1.25)))} className="st-chip ghost">− Zoom</button>
              <input
                type="range"
                min={24}
                max={320}
                value={zoom}
                onChange={e => setZoom(Number(e.target.value))}
                title="Масштаб"
                style={{ width: 100, accentColor: '#F5F5F7' }}
              />
              <button type="button" onClick={() => {
                setZoom(z => Math.min(320, Math.round(z * 1.25)));
                setQuantizeGrid(q => (q >= 1 ? 0.5 : q));
              }} className="st-chip ghost">Zoom +</button>
              <span style={{ fontSize: 11, color: '#636366', fontFamily: "'IBM Plex Mono', monospace", minWidth: 36 }}>{zoom}px</span>
              <button type="button" onClick={() => commitProject(p => ({...p, tracks: p.tracks.map(t => ({...t, notes: []}))}))} className="st-chip ghost" style={{ color: '#ff453a' }}>Clear All</button>
              <button type="button" onClick={exportProject} className="st-chip ghost">Export JSON</button>
            </div>
          </div>

          {editorView === 'piano' && (
          <div
            style={{ flex: 1, overflow: 'auto', position: 'relative', userSelect: 'none' }}
            onWheel={(e) => {
              if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                const zoomIn = e.deltaY < 0;
                const factor = zoomIn ? 1.12 : 1 / 1.12;
                setZoom(z => Math.max(24, Math.min(320, Math.round(z * factor))));
                if (zoomIn) setQuantizeGrid(q => (q >= 1 ? 0.5 : q));
              }
            }}
          >
            {/* Sticky bar ruler */}
            <div style={{
              position: 'sticky', top: 0, zIndex: 35, display: 'flex', height: 28,
              background: 'rgba(8,8,8,0.95)', borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}>
              <div style={{
                width: 72, flexShrink: 0, position: 'sticky', left: 0, zIndex: 36,
                background: 'rgba(8,8,8,0.98)', borderRight: '1px solid rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 8, color: '#666', letterSpacing: '0.08em', fontWeight: 700,
              }}>
                BAR
              </div>
              <div
                style={{ position: 'relative', width: patternBeatLength * zoom, height: 28, cursor: 'ew-resize' }}
                title="Перетащите, чтобы задать старт"
                onMouseDown={(e) => {
                  const el = e.currentTarget;
                  beginPlayheadScrub(e, 'pattern', (clientX) => {
                    const rect = el.getBoundingClientRect();
                    return (clientX - rect.left) / zoom;
                  });
                }}
              >
                {/* Fencepost markers: 4 bars → points 1,2,3,4,5 (5 = end / loop) */}
                {Array.from({ length: activePattern.length + 1 }).map((_, point) => {
                  const left = point * BEATS_PER_BAR * zoom;
                  const isEnd = point === activePattern.length;
                  return (
                    <div
                      key={`ruler-point-${point}`}
                      style={{
                        position: 'absolute',
                        left: isEnd ? left - 2 : left,
                        top: 0,
                        bottom: 0,
                        width: isEnd ? 2 : BEATS_PER_BAR * zoom,
                        borderLeft: '2px solid rgba(245,245,247,0.55)',
                        boxSizing: 'border-box',
                        pointerEvents: 'none',
                      }}
                    >
                      <span style={{
                        position: 'absolute',
                        top: 6,
                        left: isEnd ? undefined : 6,
                        right: isEnd ? 4 : undefined,
                        fontSize: 11,
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        color: '#F5F5F7',
                      }}>
                        {point + 1}
                      </span>
                      {!isEnd && [1, 2, 3].map(beat => (
                        <div
                          key={`tick-${point}-${beat}`}
                          style={{
                            position: 'absolute',
                            left: beat * zoom,
                            top: 16,
                            bottom: 0,
                            width: 1,
                            background: 'rgba(255,255,255,0.15)',
                          }}
                        />
                      ))}
                    </div>
                  );
                })}
                {/* Playhead on pattern ruler */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    width: 2,
                    left: (playheadTime % Math.max(patternBeatLength, 0.0001)) * zoom,
                    background: '#F5F5F7',
                    boxShadow: 'none',
                    pointerEvents: 'none',
                    zIndex: 2,
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 2, left: -5,
                    width: 0, height: 0,
                    borderLeft: '6px solid transparent',
                    borderRight: '6px solid transparent',
                    borderTop: '8px solid #F5F5F7',
                  }} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', minHeight: '100%', width: 'max-content' }}>
              {/* Piano Keyboard */}
              <div style={{ 
                width: 72, position: 'sticky', left: 0, zIndex: 30, 
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
                      paddingRight: 8, borderBottom: '1px solid rgba(255,255,255,0.01)', 
                      fontSize: '8px', fontFamily: 'monospace', letterSpacing: '-0.02em',
                      background: isBlack ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.03)', 
                      color: isC ? '#F5F5F7' : isBlack ? '#888' : '#bbb',
                      fontWeight: isC ? 700 : 500,
                    }}>
                      {getNoteLabel(pitch)}
                    </div>
                  );
                })}
              </div>

              {/* Grid: fixed width only — do NOT flex-grow (that left empty space without lines) */}
              <div style={{ 
                position: 'relative',
                flexShrink: 0,
                background: 'rgba(255,255,255,0.01)', 
                width: patternBeatLength * zoom, 
                height: TOTAL_NOTES * NOTE_HEIGHT,
                overflow: 'hidden',
              }}>
                {/* Horizontal grid lines */}
                {Array.from({ length: TOTAL_NOTES }).map((_, i) => (
                  <div key={`h-${i}`} style={{ 
                    position: 'absolute', left: 0, right: 0, height: 1, 
                    background: i % 12 === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)', 
                    top: i * NOTE_HEIGHT 
                  }} />
                ))}
                
                {/* Vertical grid + end line (5th point for 4 bars) */}
                {Array.from({ length: Math.floor(patternBeatLength / quantizeGrid) }).map((_, i) => {
                  const cellsPerBar = Math.max(1, Math.round(BEATS_PER_BAR / quantizeGrid));
                  const isBar = i % cellsPerBar === 0;
                  return (
                    <div key={`v-${i}`} style={{ 
                      position: 'absolute', top: 0, bottom: 0, width: isBar ? 2 : 1, 
                      left: i * (zoom * quantizeGrid), 
                      background: isBar ? 'rgba(245,245,247,0.4)' : 'rgba(255,255,255,0.1)',
                    }} />
                  );
                })}
                {/* Closing fencepost at pattern end */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  width: 2,
                  left: patternBeatLength * zoom - 2,
                  background: 'rgba(245,245,247,0.55)',
                }} />

                {/* Bar watermarks 1..N only (not the end point) */}
                {Array.from({ length: activePattern.length }).map((_, bar) => (
                  <div
                    key={`bar-label-${bar}`}
                    style={{
                      position: 'absolute',
                      left: bar * BEATS_PER_BAR * zoom + 6,
                      top: 4,
                      fontSize: 48,
                      fontWeight: 800,
                      fontFamily: 'monospace',
                      color: 'rgba(255,255,255,0.03)',
                      pointerEvents: 'none',
                      zIndex: 1,
                      lineHeight: 1,
                    }}
                  >
                    {bar + 1}
                  </div>
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
                          boxShadow: isActive ? 'inset 0 1px 0 rgba(255,255,255,0.18)' : 'none',
                          transition: isDraggingNote ? 'none' : 'box-shadow 0.2s',
                        }}
                      >
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

                {/* Playhead — drag to set start */}
                <div
                  onMouseDown={(e) => {
                    const grid = e.currentTarget.parentElement;
                    if (!grid) return;
                    beginPlayheadScrub(e, 'pattern', (clientX) => {
                      const rect = grid.getBoundingClientRect();
                      return (clientX - rect.left) / zoom;
                    });
                  }}
                  title="Перетащите, чтобы задать старт"
                  style={{ 
                    position: 'absolute', top: 0, bottom: 0, width: 12, 
                    marginLeft: -5,
                    background: 'transparent', zIndex: 40, 
                    cursor: 'ew-resize',
                    left: (playheadTime % Math.max(patternBeatLength, 0.0001)) * zoom,
                    display: playheadTime >= 0 ? 'block' : 'none',
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 0, bottom: 0, left: 5, width: 3,
                    background: '#F5F5F7', boxShadow: 'none',
                    pointerEvents: 'none',
                  }} />
                  <div style={{ 
                    position: 'absolute', top: -4, left: 0, 
                    width: 12, height: 12, background: '#F5F5F7', 
                    borderRadius: '50%', boxShadow: 'none',
                    pointerEvents: 'none',
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 10, color: '#8a8a8a', letterSpacing: '1px' }}>PLAYLIST</span>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
                  padding: '3px 6px', borderRadius: 6,
                  border: isRecording ? '1px solid rgba(255,70,70,0.45)' : '1px solid rgba(255,255,255,0.1)',
                  background: isRecording ? 'rgba(255,70,70,0.08)' : 'rgba(255,255,255,0.03)',
                }}>
                  <Mic size={12} color={micArmed || isRecording ? '#ff8a8a' : '#777'} />
                  <select
                    value={selectedMicId}
                    onChange={e => { void selectMicrophone(e.target.value); }}
                    title="Выбор микрофона"
                    style={{
                      maxWidth: 160, fontSize: 9, color: '#ccc',
                      background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 4, padding: '3px 4px', outline: 'none',
                    }}
                  >
                    <option value="">Микрофон по умолчанию</option>
                    {micDevices.map(device => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Микрофон ${device.deviceId.slice(0, 6)}`}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => { void armMicrophone(); }}
                    disabled={isRecording}
                    title={micArmed ? 'Закрыть микрофон' : 'Открыть микрофон (проверка уровня)'}
                    style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: 0.6, padding: '3px 7px', borderRadius: 4, cursor: isRecording ? 'default' : 'pointer',
                      border: micArmed ? '1px solid rgba(255,138,138,0.5)' : '1px solid rgba(255,255,255,0.12)',
                      background: micArmed ? 'rgba(255,138,138,0.15)' : 'rgba(255,255,255,0.04)',
                      color: micArmed ? '#ffb3b3' : '#888',
                      opacity: isRecording ? 0.5 : 1,
                    }}
                  >
                    {micArmed ? 'MIC ON' : 'ARM'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { void toggleMicMonitor(); }}
                    title={micMonitorOn ? 'Выключить «слышать себя»' : 'Слышать себя (лучше в наушниках)'}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      fontSize: 9, fontWeight: 700, letterSpacing: 0.6, padding: '3px 7px', borderRadius: 4, cursor: 'pointer',
                      border: micMonitorOn ? '1px solid rgba(245,245,247,0.45)' : '1px solid rgba(255,255,255,0.12)',
                      background: micMonitorOn ? 'rgba(245,245,247,0.12)' : 'rgba(255,255,255,0.04)',
                      color: micMonitorOn ? '#D1D1D6' : '#777',
                    }}
                  >
                    {micMonitorOn ? <Headphones size={11} /> : <MicOff size={11} />}
                    {micMonitorOn ? 'MONITOR' : 'MON'}
                  </button>
                  <div
                    title="Уровень входа"
                    style={{
                      width: 56, height: 8, borderRadius: 3, overflow: 'hidden',
                      background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    <div style={{
                      width: `${Math.round(micLevel * 100)}%`,
                      height: '100%',
                      background: micLevel > 0.85 ? '#ff4646' : micLevel > 0.55 ? '#f0b429' : '#52d68a',
                      transition: 'width 0.05s linear',
                    }} />
                  </div>
                  <button
                    type="button"
                    onClick={() => { if (isRecording) { stopVocalRecording(); } else { void startVocalRecording(); } }}
                    title={isRecording ? 'Остановить запись' : 'Записать вокал с позиции плейхеда (бит играет под вас)'}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      fontSize: 9, fontWeight: 700, letterSpacing: 1,
                      padding: '4px 10px', borderRadius: 5, cursor: 'pointer',
                      border: isRecording ? '1px solid rgba(255,70,70,0.6)' : '1px solid rgba(255,255,255,0.15)',
                      background: isRecording ? 'rgba(255,70,70,0.2)' : 'rgba(255,255,255,0.04)',
                      color: isRecording ? '#ff6b6b' : '#bbb',
                    }}
                  >
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: isRecording ? '#ff4646' : '#c0392b',
                      boxShadow: isRecording ? '0 0 8px #ff4646' : 'none',
                      animation: isRecording ? 'st-pulse 1s infinite' : 'none',
                    }} />
                    {isRecording ? `STOP ${Math.floor(recordElapsedSec / 60)}:${String(recordElapsedSec % 60).padStart(2, '0')}` : 'REC'}
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[
                    { label: 'Split', title: 'Split at playhead (S)', onClick: splitSelectedClip },
                    { label: 'Dup', title: 'Duplicate (Ctrl/⌘+B)', onClick: duplicateSelectedClips },
                    { label: 'Del', title: 'Delete (Del)', onClick: () => handlePlaylistClipDelete(selectedClipIds) },
                  ].map(btn => (
                    <button
                      key={btn.label}
                      type="button"
                      title={btn.title}
                      disabled={selectedClipIds.length === 0}
                      onClick={btn.onClick}
                      style={{
                        fontSize: 9,
                        letterSpacing: '0.6px',
                        padding: '3px 8px',
                        borderRadius: 4,
                        border: '1px solid rgba(255,255,255,0.12)',
                        background: selectedClipIds.length > 0 ? 'rgba(245,245,247,0.12)' : 'rgba(255,255,255,0.03)',
                        color: selectedClipIds.length > 0 ? '#AEAEB2' : '#555',
                        cursor: selectedClipIds.length > 0 ? 'pointer' : 'default',
                        fontFamily: 'inherit',
                      }}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>
              <span style={{ fontSize: 10, color: '#5f5f5f' }}>{project.transportMode.toUpperCase()} • {Math.ceil(timelineLength / BEATS_PER_BAR)} bars</span>
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
              onClick={(e) => {
                if (e.target === e.currentTarget) setSelectedClipIds([]);
              }}
              onDragOver={(e) => {
                if (e.dataTransfer.types.includes('application/x-pattern-id') || e.dataTransfer.types.includes('Files')) {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'copy';
                }
              }}
              onDrop={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left - PLAYLIST_LABEL_WIDTH;
                const y = e.clientY - rect.top - 30;
                const startBar = Math.max(0, Math.floor(x / (zoom * BEATS_PER_BAR)));
                const lane = Math.floor(y / PLAYLIST_LANE_HEIGHT);

                const audioFiles = Array.from(e.dataTransfer.files || []).filter(file =>
                  file.type.startsWith('audio/') || /\.(mp3|wav|ogg|flac|m4a|aac)$/i.test(file.name)
                );
                if (audioFiles.length > 0) {
                  e.preventDefault();
                  void addAudioClipsAt(audioFiles, startBar, lane);
                  return;
                }

                const patternId = e.dataTransfer.getData('application/x-pattern-id');
                if (!patternId) return;
                e.preventDefault();
                addPatternClipAt(patternId, startBar, lane);
              }}
            >
              <div style={{ position: 'absolute', left: 0, top: 0, width: PLAYLIST_LABEL_WIDTH, height: 30, borderRight: '1px solid rgba(255,255,255,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)', background: '#161616', zIndex: 6 }} />
              <div
                style={{
                  position: 'absolute',
                  left: PLAYLIST_LABEL_WIDTH,
                  top: 0,
                  width: timelineLength * zoom,
                  height: 30,
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                  background: '#141414',
                  zIndex: 5,
                  cursor: 'ew-resize',
                }}
                title="Перетащите, чтобы задать старт"
                onMouseDown={(e) => {
                  const el = e.currentTarget;
                  beginPlayheadScrub(e, 'song', (clientX) => {
                    const rect = el.getBoundingClientRect();
                    return (clientX - rect.left) / zoom;
                  });
                }}
              >
                {Array.from({ length: Math.ceil(timelineLength / BEATS_PER_BAR) }).map((_, bar) => (
                  <div key={`bar-${bar}`} style={{ position: 'absolute', left: bar * BEATS_PER_BAR * zoom, top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.18)', pointerEvents: 'none' }}>
                    <span style={{ position: 'absolute', top: 7, left: 4, fontSize: 10, color: '#6e6e6e', fontFamily: 'monospace' }}>{bar + 1}</span>
                  </div>
                ))}
                {Array.from({ length: timelineLength + 1 }).map((_, beat) => (
                  <div
                    key={`sub-${beat}`}
                    style={{
                      position: 'absolute',
                      left: beat * zoom,
                      top: 16,
                      bottom: 0,
                      width: 1,
                      background: beat % BEATS_PER_BAR === 0 ? 'transparent' : 'rgba(255,255,255,0.05)',
                      pointerEvents: 'none',
                    }}
                  />
                ))}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    width: 2,
                    left: playheadTime * zoom,
                    background: '#F5F5F7',
                    boxShadow: 'none',
                    pointerEvents: 'none',
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 2, left: -5,
                    width: 0, height: 0,
                    borderLeft: '6px solid transparent',
                    borderRight: '6px solid transparent',
                    borderTop: '8px solid #F5F5F7',
                  }} />
                </div>
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
              <div
                style={{ position: 'absolute', left: PLAYLIST_LABEL_WIDTH, top: 30, width: timelineLength * zoom, height: PLAYLIST_LANES * PLAYLIST_LANE_HEIGHT }}
                onClick={() => setSelectedClipIds([])}
              >
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
                {Array.from({ length: timelineLength + 1 }).map((_, beat) => (
                  <div
                    key={`timeline-step-${beat}`}
                    style={{
                      position: 'absolute',
                      left: beat * zoom,
                      top: 0,
                      bottom: 0,
                      width: 1,
                      background: beat % BEATS_PER_BAR === 0 ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.04)',
                    }}
                  />
                ))}
              </div>
              {project.arrangement.map(clip => {
                const isAudioClip = clip.type === 'audio';
                const pattern = project.patterns.find(item => item.id === clip.patternId);
                if (!isAudioClip && !pattern) return null;
                const clipBeatLen = clip.lengthBeats ?? getPatternFullBeats(project.tracks, clip.patternId, project.patterns);
                const selected = selectedClipIds.includes(clip.id);
                const barsLabel = (clipBeatLen / BEATS_PER_BAR).toFixed(clipBeatLen % BEATS_PER_BAR === 0 ? 0 : 1);
                const isVocalClip = isAudioClip && clip.isVocal;
                const accent = isVocalClip ? '#FF453A' : isAudioClip ? '#30D158' : '#F5F5F7';
                return (
                  <div
                    key={clip.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      // Selection handled on mousedown for drag; Ctrl toggle already done there.
                      // Plain click after drag still refreshes single-select if needed:
                      if (!e.ctrlKey && !e.metaKey && !selectedClipIds.includes(clip.id)) {
                        selectPlaylistClip(clip, e);
                      } else if (!e.ctrlKey && !e.metaKey && selectedClipIds.length === 1 && !isAudioClip) {
                        setProject(prev => prev ? { ...prev, activePatternId: clip.patternId, transportMode: 'song' } : prev);
                      }
                    }}
                    onDoubleClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (isAudioClip) {
                        setVocalPanelClipId(clip.id);
                      } else {
                        openClipPattern(clip);
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const ids = selectedClipIds.includes(clip.id) && selectedClipIds.length > 1
                        ? selectedClipIds
                        : [clip.id];
                      handlePlaylistClipDelete(ids);
                    }}
                    onMouseDown={(e) => {
                      if (e.button !== 0) return;
                      beginPlaylistDrag(clip, e, 'move');
                    }}
                    style={{
                      position: 'absolute',
                      left: PLAYLIST_LABEL_WIDTH + clip.startBar * BEATS_PER_BAR * zoom + 1,
                      top: 30 + clip.lane * PLAYLIST_LANE_HEIGHT + 4,
                      width: Math.max(24, clipBeatLen * zoom - 2),
                      height: PLAYLIST_LANE_HEIGHT - 8,
                      borderRadius: 4,
                      border: selected ? `1px solid ${accent}` : '1px solid rgba(255,255,255,0.2)',
                      boxShadow: selected ? `0 0 0 1px ${isVocalClip ? 'rgba(255,138,138,0.35)' : isAudioClip ? 'rgba(183,243,107,0.35)' : 'rgba(245,245,247,0.35)'}` : 'none',
                      background: isVocalClip
                        ? (selected ? 'linear-gradient(180deg, rgba(255,138,138,0.38), rgba(255,138,138,0.16))' : 'linear-gradient(180deg, rgba(255,138,138,0.22), rgba(255,138,138,0.09))')
                        : isAudioClip
                          ? (selected ? 'linear-gradient(180deg, rgba(183,243,107,0.38), rgba(183,243,107,0.16))' : 'linear-gradient(180deg, rgba(183,243,107,0.22), rgba(183,243,107,0.09))')
                          : (selected ? 'linear-gradient(180deg, rgba(245,245,247,0.38), rgba(245,245,247,0.18))' : 'linear-gradient(180deg, rgba(245,245,247,0.22), rgba(245,245,247,0.1))'),
                      color: isVocalClip ? (selected ? '#ffe3e3' : '#e0a3a3') : isAudioClip ? (selected ? '#eaffd0' : '#b3d68f') : (selected ? '#F5F5F7' : '#A1A1A6'),
                      fontSize: 9,
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 10px',
                      cursor: 'grab',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      zIndex: selected ? 8 : 6,
                      userSelect: 'none',
                    }}
                  >
                    <div
                      onMouseDown={(e) => beginPlaylistDrag(clip, e, 'resize-left')}
                      title="Обрезать слева · ⌥/Alt — шаг 1/10"
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: 7,
                        cursor: 'ew-resize',
                        background: selected ? (isAudioClip ? 'rgba(183,243,107,0.35)' : 'rgba(245,245,247,0.35)') : 'rgba(255,255,255,0.08)',
                      }}
                    />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', pointerEvents: 'none' }}>
                      {isAudioClip && <Waves size={9} style={{ verticalAlign: 'middle', marginRight: 4 }} />}
                      {isAudioClip ? (clip.name || 'Audio') : pattern!.name}
                      <span style={{ opacity: 0.55, marginLeft: 6 }}>{barsLabel}b</span>
                    </span>
                    <div
                      onMouseDown={(e) => beginPlaylistDrag(clip, e, 'resize-right')}
                      title="Обрезать справа · ⌥/Alt — шаг 1/10"
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: 7,
                        cursor: 'ew-resize',
                        background: selected ? (isAudioClip ? 'rgba(183,243,107,0.35)' : 'rgba(245,245,247,0.35)') : 'rgba(255,255,255,0.08)',
                      }}
                    />
                  </div>
                );
              })}
              <div
                onMouseDown={(e) => {
                  const parent = e.currentTarget.parentElement;
                  if (!parent) return;
                  beginPlayheadScrub(e, 'song', (clientX) => {
                    const rect = parent.getBoundingClientRect();
                    return (clientX - rect.left - PLAYLIST_LABEL_WIDTH) / zoom;
                  });
                }}
                title="Перетащите, чтобы задать старт"
                style={{
                  position: 'absolute',
                  top: 30,
                  bottom: 0,
                  width: 12,
                  marginLeft: -5,
                  background: 'transparent',
                  cursor: 'ew-resize',
                  left: PLAYLIST_LABEL_WIDTH + playheadTime * zoom,
                  zIndex: 9,
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: 5,
                    width: 2,
                    background: '#F5F5F7',
                    boxShadow: 'none',
                    pointerEvents: 'none',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Vocal / audio clip processing panel */}
          {vocalPanelClipId && (() => {
            const clip = project.arrangement.find(c => c.id === vocalPanelClipId);
            if (!clip || clip.type !== 'audio') return null;
            const clipFx = normalizeClipFx(clip.fx, clip.eq);
            const clipGain = clip.gain ?? 0.9;
            const patchClip = (patch: Partial<PlaylistClip>) => {
              commitProject(prev => ({
                ...prev,
                arrangement: prev.arrangement.map(c => {
                  if (c.id !== clip.id) return c;
                  const next = { ...c, ...patch };
                  if (patch.fx) {
                    next.eq = {
                      enabled: patch.fx.enabled,
                      low: patch.fx.low,
                      mid: patch.fx.mid,
                      high: patch.fx.high,
                    };
                  }
                  return next;
                }),
              }));
            };
            const setFx = (partial: Partial<ClipFx>) => {
              patchClip({ fx: normalizeClipFx({ ...clipFx, ...partial }) });
            };
            const previewClip = () => {
              const eng = getEngine();
              void eng.resume();
              const bps = (project.bpm || 124) / 60;
              const offsetSec = (clip.offsetBeats ?? 0) / bps;
              const durationSec = Math.min(clip.lengthBeats / bps, 8);
              if (!clip.sampleId) return;
              void eng.ensureSample(clip.sampleId, { trimSilence: clip.isVocal }).then(buffer => {
                if (buffer) eng.playClip(buffer, 0, clipGain, offsetSec, durationSec, clipFx);
              });
            };
            const fxSliders: { key: keyof Pick<ClipFx, 'compress' | 'drive' | 'reverb'>; label: string }[] = [
              { key: 'compress', label: 'Компрессор' },
              { key: 'drive', label: 'Дисторшн' },
              { key: 'reverb', label: 'Реверб' },
            ];
            return (
              <div
                onClick={() => setVocalPanelClipId(null)}
                style={{
                  position: 'fixed', inset: 0, zIndex: 300,
                  background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <div
                  onClick={e => e.stopPropagation()}
                  style={{
                    width: 420, maxWidth: '94vw', maxHeight: '90vh', overflowY: 'auto',
                    padding: 20, borderRadius: 14,
                    background: '#151515', border: '1px solid rgba(255,255,255,0.12)',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                    display: 'flex', flexDirection: 'column', gap: 14,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 11, letterSpacing: 1.5, color: clip.isVocal ? '#ff8a8a' : '#b7f36b', fontWeight: 700, textTransform: 'uppercase' }}>
                        {clip.isVocal ? 'Обработка вокала' : 'Обработка аудио'}
                      </div>
                      <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>{clip.name || 'Audio clip'}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setVocalPanelClipId(null)}
                      style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 16, padding: 4 }}
                    >
                      ✕
                    </button>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                      <span>Громкость</span>
                      <span>{Math.round(clipGain * 100)}%</span>
                    </div>
                    <input
                      type="range" min={0} max={2} step={0.01} value={clipGain}
                      onChange={e => patchClip({ gain: Number(e.target.value) })}
                      style={{ width: '100%', accentColor: '#F5F5F7' }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>FX цепь</span>
                    <button
                      type="button"
                      onClick={() => setFx({ enabled: !clipFx.enabled })}
                      style={{
                        fontSize: 9, fontWeight: 700, letterSpacing: 1, padding: '3px 10px', borderRadius: 4, cursor: 'pointer',
                        border: clipFx.enabled ? '1px solid rgba(245,245,247,0.5)' : '1px solid rgba(255,255,255,0.15)',
                        background: clipFx.enabled ? 'rgba(245,245,247,0.15)' : 'rgba(255,255,255,0.04)',
                        color: clipFx.enabled ? '#D1D1D6' : '#777',
                      }}
                    >
                      {clipFx.enabled ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {VOCAL_FX_PRESETS.map(preset => {
                      const active = clipFx.enabled === preset.enabled
                        && clipFx.low === preset.low
                        && clipFx.mid === preset.mid
                        && clipFx.high === preset.high
                        && Math.abs(clipFx.compress - preset.compress) < 0.02
                        && Math.abs(clipFx.drive - preset.drive) < 0.02
                        && Math.abs(clipFx.reverb - preset.reverb) < 0.02;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => patchClip({
                            fx: {
                              enabled: preset.enabled,
                              low: preset.low,
                              mid: preset.mid,
                              high: preset.high,
                              compress: preset.compress,
                              drive: preset.drive,
                              reverb: preset.reverb,
                            },
                          })}
                          style={{
                            fontSize: 9, padding: '4px 9px', borderRadius: 4, cursor: 'pointer',
                            border: active ? '1px solid rgba(255,138,138,0.6)' : '1px solid rgba(255,255,255,0.12)',
                            background: active ? 'rgba(255,138,138,0.15)' : 'rgba(255,255,255,0.04)',
                            color: active ? '#ffb3b3' : '#999',
                          }}
                        >
                          {preset.name}
                        </button>
                      );
                    })}
                  </div>

                  {EQ_BANDS.map(band => (
                    <div key={band.key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#777', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                        <span>{band.label} <span style={{ color: '#555' }}>{band.hint}</span></span>
                        <span>{clipFx[band.key] > 0 ? '+' : ''}{clipFx[band.key]} dB</span>
                      </div>
                      <input
                        type="range" min={-EQ_GAIN_LIMIT} max={EQ_GAIN_LIMIT} step={1}
                        value={clipFx[band.key]}
                        onChange={e => setFx({ enabled: true, [band.key]: Number(e.target.value) })}
                        style={{ width: '100%', accentColor: clip.isVocal ? '#ff8a8a' : '#b7f36b' }}
                      />
                    </div>
                  ))}

                  {fxSliders.map(slider => (
                    <div key={slider.key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#777', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                        <span>{slider.label}</span>
                        <span>{Math.round(clipFx[slider.key] * 100)}%</span>
                      </div>
                      <input
                        type="range" min={0} max={1} step={0.01}
                        value={clipFx[slider.key]}
                        onChange={e => setFx({ enabled: true, [slider.key]: Number(e.target.value) })}
                        style={{ width: '100%', accentColor: clip.isVocal ? '#ff8a8a' : '#b7f36b' }}
                      />
                    </div>
                  ))}

                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button
                      type="button"
                      onClick={previewClip}
                      style={{
                        flex: 1, padding: '8px 0', borderRadius: 6, cursor: 'pointer', fontSize: 10, fontWeight: 700, letterSpacing: 1,
                        border: '1px solid rgba(245,245,247,0.4)', background: 'rgba(245,245,247,0.12)', color: '#D1D1D6',
                      }}
                    >
                      ▶ Прослушать
                    </button>
                    <button
                      type="button"
                      onClick={() => setVocalPanelClipId(null)}
                      style={{
                        flex: 1, padding: '8px 0', borderRadius: 6, cursor: 'pointer', fontSize: 10, fontWeight: 700, letterSpacing: 1,
                        border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: '#bbb',
                      }}
                    >
                      Готово
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Bottom Mixer */}
          <div className="st-mixer">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 200 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: '#F5F5F7', margin: 0, letterSpacing: -0.02 }}>Master FX</h3>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 600, color: '#636366', textTransform: 'uppercase', letterSpacing: 0.06 }}>
                    <span>Reverb</span>
                    <span>25%</span>
                  </div>
                  <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: '#F5F5F7', width: '25%' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 600, color: '#636366', textTransform: 'uppercase', letterSpacing: 0.06 }}>
                    <span>Delay</span>
                    <span>33%</span>
                  </div>
                  <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: '#8e8e93', width: '33%' }} />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ width: 1, height: 48, background: 'rgba(255,255,255,0.08)' }} />

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#636366', textTransform: 'uppercase', letterSpacing: 0.1 }}>Monitor</div>
              <div style={{
                height: 44, background: '#0a0a0a', borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.08)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden'
              }}>
                <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: '100%', padding: '0 16px', width: '100%' }}>
                  {Array.from({ length: 64 }).map((_, i) => (
                    <div key={i} style={{
                      flex: 1,
                      height: project.isPlaying ? `${Math.random() * 80 + 10}%` : '5%',
                      background: 'rgba(245,245,247,0.28)',
                      borderRadius: '2px 2px 0 0',
                      transition: 'height 0.1s'
                    }} />
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={exportProject} className="st-chip" style={{ height: 52, flexDirection: 'column', gap: 4, padding: '0 18px' }}>
                <Download size={18} />
                <span style={{ fontSize: 9, letterSpacing: 0.08 }}>Export</span>
              </button>
              <label className="st-chip ghost" style={{ height: 52, flexDirection: 'column', gap: 4, padding: '0 18px', margin: 0 }}>
                <Upload size={18} />
                <span style={{ fontSize: 9, letterSpacing: 0.08 }}>Import</span>
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