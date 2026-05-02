import { scheduleAudioClip, stopAllAudioClips, beatsToSeconds } from './audioClipPlayer';
import { audioContextManager } from './audioContext';
import { useStudioStore } from '../store/useStudioStore';

export class AudioScheduler {
  private isPlaying = false;
  private startTime = 0;
  private currentBeat = 0;
  private bpm = 120;
  private scheduledClips = new Set<string>();

  async start() {
    if (this.isPlaying) return;
    
    const audioContext = await audioContextManager.getAudioContext();
    const store = useStudioStore.getState();
    
    this.isPlaying = true;
    this.startTime = audioContext.currentTime;
    this.bpm = store.playback.bpm;
    this.currentBeat = 0; // Start from beginning for now
    
    console.log(`🎵 AudioScheduler started at beat ${this.currentBeat}`);
    
    // Clear any previously scheduled clips
    this.scheduledClips.clear();
    
    // Schedule all audio clips
    this.scheduleAudioClips();
  }

  stop() {
    if (!this.isPlaying) return;
    
    this.isPlaying = false;
    stopAllAudioClips();
    this.scheduledClips.clear();
    
    console.log(`⏹️ AudioScheduler stopped`);
  }

  pause() {
    this.isPlaying = false;
    stopAllAudioClips();
    this.scheduledClips.clear();
    console.log(`⏸️ AudioScheduler paused`);
  }

  setCurrentBeat(beat: number) {
    this.currentBeat = beat;
    if (this.isPlaying) {
      // Reschedule clips from new position
      this.scheduleAudioClips();
    }
  }

  private scheduleAudioClips() {
    if (!this.isPlaying) return;
    
    const store = useStudioStore.getState();
    const audioClips = store.clips.filter(clip => clip.type === 'audio');
    
    console.log(`🎵 Scheduling ${audioClips.length} audio clips`);
    
    audioClips.forEach(clip => {
      const clipId = clip.id;
      
      // Calculate when to start this clip
      const clipStartBeat = clip.start;
      const clipDurationBeats = clip.duration;
      
      // Always schedule clips when playing starts
      const delayBeats = clipStartBeat;
      const delaySeconds = beatsToSeconds(delayBeats, this.bpm);
      const durationSeconds = beatsToSeconds(clipDurationBeats, this.bpm);
      
      // Schedule the clip immediately
      scheduleAudioClip(
        clipId,
        this.startTime + delaySeconds,
        0, // Start from beginning
        durationSeconds
      );
      
      this.scheduledClips.add(clipId);
      
      console.log(`🔊 Scheduled clip "${clip.name}" at beat ${clipStartBeat} (${delaySeconds.toFixed(2)}s from now)`);
    });
  }

  // Call this periodically to check if new clips need to be scheduled
  update() {
    if (!this.isPlaying) return;
    
    // For now, just check if we need to reschedule
    // This could be enhanced with actual position tracking
    this.scheduleAudioClips();
  }

  getState() {
    return {
      isPlaying: this.isPlaying,
      currentBeat: this.currentBeat,
      bpm: this.bpm,
      scheduledClips: this.scheduledClips.size
    };
  }
}

// Singleton instance
export const audioScheduler = new AudioScheduler();
