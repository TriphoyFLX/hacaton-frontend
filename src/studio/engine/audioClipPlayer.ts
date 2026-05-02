import { audioContextManager } from './audioContext';

// Хранилище аудио буферов для клипов
const audioBuffers: Record<string, AudioBuffer> = {};
const activeSources: Record<string, AudioBufferSourceNode> = {};

export function registerAudioBuffer(clipId: string, buffer: AudioBuffer) {
  audioBuffers[clipId] = buffer;
  console.log(`🎵 Registered audio buffer for clip: ${clipId}`);
}

export function getAudioBuffer(clipId: string): AudioBuffer | undefined {
  return audioBuffers[clipId];
}

export function removeAudioBuffer(clipId: string) {
  delete audioBuffers[clipId];
  // Stop any playing source for this clip
  if (activeSources[clipId]) {
    try {
      activeSources[clipId].stop();
    } catch (error) {
      // Source might have already stopped
    }
    delete activeSources[clipId];
  }
}

export async function scheduleAudioClip(
  clipId: string, 
  startTime: number, 
  offsetSeconds = 0,
  duration?: number
): Promise<void> {
  try {
    const audioContext = await audioContextManager.getAudioContext();
    const buffer = audioBuffers[clipId];
    
    if (!buffer) {
      console.warn(`No audio buffer found for clip: ${clipId}`);
      return;
    }

    // Stop any existing source for this clip
    if (activeSources[clipId]) {
      try {
        activeSources[clipId].stop();
      } catch (error) {
        // Source might have already stopped
      }
    }

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    
    // Connect to destination (could be enhanced with effects/mixer)
    source.connect(audioContext.destination);
    
    // Schedule playback
    source.start(startTime, offsetSeconds, duration);
    
    // Store reference for potential stopping
    activeSources[clipId] = source;
    
    // Clean up when source finishes
    source.onended = () => {
      delete activeSources[clipId];
    };

    console.log(`🔊 Scheduled audio clip: ${clipId} at ${startTime}s`);
    
  } catch (error) {
    console.error(`Failed to schedule audio clip ${clipId}:`, error);
  }
}

export function stopAudioClip(clipId: string) {
  if (activeSources[clipId]) {
    try {
      activeSources[clipId].stop();
      delete activeSources[clipId];
      console.log(`⏹️ Stopped audio clip: ${clipId}`);
    } catch (error) {
      console.error(`Failed to stop audio clip ${clipId}:`, error);
    }
  }
}

export function stopAllAudioClips() {
  Object.keys(activeSources).forEach(clipId => {
    stopAudioClip(clipId);
  });
}

export function getAudioBufferDuration(clipId: string): number | undefined {
  const buffer = audioBuffers[clipId];
  return buffer ? buffer.duration : undefined;
}

// Utility function to convert beats to seconds
export function beatsToSeconds(beats: number, bpm: number): number {
  return (beats * 60) / bpm;
}

// Utility function to convert seconds to beats
export function secondsToBeats(seconds: number, bpm: number): number {
  return (seconds * bpm) / 60;
}
