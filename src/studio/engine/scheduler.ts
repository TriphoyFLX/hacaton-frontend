import { useStudioStore } from "../store/useStudioStore";
import type { Note } from "../models";

export class Scheduler {
  private lookAhead = 0.1; // seconds
  private scheduleAhead = 0.1; // seconds
  private nextNoteTime = 0;
  private isRunning = false;
  private timerId: number | null = null;
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private trackGains: Map<string, GainNode> = new Map();
  private bpm = 120;

  constructor() {
    this.initAudio();
  }

  // Get or create a gain node for a track
  private getTrackGain(trackId: string): GainNode | null {
    if (!this.audioContext || !this.masterGain) return null;
    
    if (!this.trackGains.has(trackId)) {
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = 1;
      gainNode.connect(this.masterGain);
      this.trackGains.set(trackId, gainNode);
      console.log(`[Scheduler] Created gain node for track ${trackId}`);
    }
    
    return this.trackGains.get(trackId) || null;
  }

  // Set volume for a specific track (0-1)
  async setTrackVolume(trackId: string, volume: number) {
    const normalizedVolume = Math.max(0, Math.min(1, volume));
    
    if (this.audioContext?.state === "suspended") {
      await this.audioContext.resume();
    }
    
    const trackGain = this.getTrackGain(trackId);
    if (trackGain && this.audioContext) {
      const now = this.audioContext.currentTime;
      trackGain.gain.setTargetAtTime(normalizedVolume, now, 0.01);
      console.log(`[Scheduler] Track ${trackId} volume set to ${normalizedVolume}`);
    }
  }

  async setMasterVolume(volume: number) {
    const normalizedVolume = Math.max(0, Math.min(1, volume));
    
    // Ensure audio context is ready
    if (this.audioContext?.state === "suspended") {
      await this.audioContext.resume();
    }
    
    if (this.masterGain && this.audioContext) {
      const now = this.audioContext.currentTime;
      // Smooth transition to new volume
      this.masterGain.gain.setTargetAtTime(normalizedVolume, now, 0.01);
    }
  }

  private async initAudio() {
    try {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 1;
      this.masterGain.connect(this.audioContext.destination);
      console.log("[Scheduler] Audio initialized, master gain connected");
    } catch (e) {
      console.warn("[Scheduler] Web Audio API not supported", e);
    }
  }

  setBpm(bpm: number) {
    this.bpm = bpm;
  }

  start(startTime = 0) {
    if (this.isRunning) return;
    
    if (this.audioContext?.state === "suspended") {
      this.audioContext.resume();
    }

    this.isRunning = true;
    this.nextNoteTime = startTime;
    this.scheduler();
  }

  stop() {
    this.isRunning = false;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  private scheduler = () => {
    if (!this.isRunning) return;

    // Calculate current time in beats
    const beatDuration = 60 / this.bpm;
    const currentTime = this.nextNoteTime;

    // Schedule notes within look-ahead window
    this.scheduleNotes(currentTime, currentTime + this.scheduleAhead / beatDuration);

    this.nextNoteTime += this.scheduleAhead / beatDuration;

    // Set up next scheduler call
    this.timerId = window.setTimeout(this.scheduler, this.lookAhead * 1000);
  };

  private scheduleNotes(startBeat: number, endBeat: number) {
    const store = useStudioStore.getState();
    const { notes, clips, tracks, ui } = store;

    // Handle loop
    if (ui.loopEnabled) {
      if (startBeat >= ui.loopEnd) {
        startBeat = ui.loopStart;
        endBeat = ui.loopStart + (endBeat - ui.loopEnd);
        this.nextNoteTime = ui.loopStart;
      }
    }

    // Find and play all notes that should play in this window
    for (const clip of clips) {
      const track = tracks.find((t) => t.id === clip.trackId);
      if (!track || track.muted) continue;

      const clipNotes = notes.filter((n) => n.clipId === clip.id);
      
      for (const note of clipNotes) {
        const noteStart = clip.start + note.start;

        // Check if note should play in this window
        if (noteStart >= startBeat && noteStart < endBeat) {
          this.playNote(note, track.id);
        }

        // Handle loop wrapping for notes
        if (ui.loopEnabled && endBeat > ui.loopEnd) {
          const loopLength = ui.loopEnd - ui.loopStart;
          const wrappedStart = noteStart + loopLength;
          if (wrappedStart >= startBeat && wrappedStart < endBeat) {
            this.playNote(note, track.id);
          }
        }
      }
    }
  }

  private playNote(note: Note, trackId: string) {
    if (!this.audioContext) return;

    const frequency = this.midiToFrequency(note.pitch);
    const duration = (note.duration * 60) / this.bpm;

    const osc = this.audioContext.createOscillator();
    const noteGainNode = this.audioContext.createGain();
    
    // Get track gain node (falls back to master if track not found)
    const trackGain = this.getTrackGain(trackId);
    
    osc.connect(noteGainNode);
    noteGainNode.connect(trackGain || this.masterGain || this.audioContext.destination);

    osc.frequency.value = frequency;
    osc.type = "sine";

    const velocity = note.velocity / 127;
    const now = this.audioContext.currentTime;

    noteGainNode.gain.setValueAtTime(0, now);
    noteGainNode.gain.linearRampToValueAtTime(velocity * 0.3, now + 0.01);
    noteGainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.start(now);
    osc.stop(now + duration);

    // Cleanup
    setTimeout(() => {
      osc.disconnect();
      noteGainNode.disconnect();
    }, duration * 1000 + 100);
  }

  private midiToFrequency(midiNote: number): number {
    return 440 * Math.pow(2, (midiNote - 69) / 12);
  }
}

export const globalScheduler = new Scheduler();
