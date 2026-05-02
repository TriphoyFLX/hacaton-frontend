import { audioContextManager } from './audioContext';
import { useStudioStore } from '../store/useStudioStore';

export class MidiPlayer {
  private isPlaying = false;
  private startTime = 0;
  private currentBeat = 0;
  private bpm = 120;

  async start() {
    if (this.isPlaying) return;
    
    const audioContext = await audioContextManager.getAudioContext();
    const store = useStudioStore.getState();
    
    this.isPlaying = true;
    this.startTime = audioContext.currentTime;
    this.bpm = store.playback.bpm;
    this.currentBeat = 0;
    
    console.log(`🎹 MidiPlayer started`);
    
    // Schedule all MIDI clips
    this.scheduleMidiClips();
  }

  stop() {
    if (!this.isPlaying) return;
    
    this.isPlaying = false;
    console.log(`🎹 MidiPlayer stopped`);
  }

  private scheduleMidiClips() {
    if (!this.isPlaying) return;
    
    const store = useStudioStore.getState();
    // Only play MIDI clips WITHOUT patternId (separate MIDI clips)
    const midiClips = store.clips.filter(clip => 
      clip.type === 'midi' && !clip.patternId
    );
    
    console.log(`🎹 Scheduling ${midiClips.length} separate MIDI clips`);
    
    midiClips.forEach(clip => {
      const clipStartBeat = clip.start;
      const delaySeconds = this.beatsToSeconds(clipStartBeat);
      
      // Schedule notes for this clip
      const notes = store.notes.filter(note => note.clipId === clip.id);
      
      notes.forEach(note => {
        const noteStartBeat = clip.start + note.start;
        const noteDelaySeconds = this.beatsToSeconds(noteStartBeat);
        const noteDurationSeconds = this.beatsToSeconds(note.duration);
        
        // Schedule note
        this.scheduleNote(note.pitch, noteDelaySeconds, noteDurationSeconds, note.velocity);
        
        console.log(`🎹 Scheduled note: ${note.pitch} at beat ${noteStartBeat}`);
      });
    });
  }

  private scheduleNote(pitch: number, startTime: number, duration: number, velocity: number) {
    // This would play actual MIDI notes
    // For now, just log it
    console.log(`🎹 Note: pitch=${pitch}, start=${startTime}s, duration=${duration}s, velocity=${velocity}`);
  }

  private beatsToSeconds(beats: number): number {
    return (beats * 60) / this.bpm;
  }

  update() {
    if (!this.isPlaying) return;
    
    // Update current position if needed
    const store = useStudioStore.getState();
    this.currentBeat = 0; // Could be enhanced with actual position tracking
  }

  getState() {
    return {
      isPlaying: this.isPlaying,
      currentBeat: this.currentBeat,
      bpm: this.bpm
    };
  }
}

// Singleton instance
export const midiPlayer = new MidiPlayer();
