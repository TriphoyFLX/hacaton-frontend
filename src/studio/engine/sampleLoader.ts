// Sample Loader - Handles loading and decoding audio files
export class SampleLoader {
  private audioContext: AudioContext;
  private cache: Map<string, AudioBuffer> = new Map();

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
  }

  // Load and decode audio file
  async loadSample(file: File): Promise<AudioBuffer> {
    const cacheKey = file.name + file.size;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      // Cache the decoded buffer
      this.cache.set(cacheKey, audioBuffer);
      
      return audioBuffer;
    } catch (error) {
      console.error('[SampleLoader] Failed to decode audio:', error);
      throw new Error('Failed to load audio file');
    }
  }

  // Load sample from URL
  async loadFromUrl(url: string): Promise<AudioBuffer> {
    if (this.cache.has(url)) {
      return this.cache.get(url)!;
    }

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      this.cache.set(url, audioBuffer);
      return audioBuffer;
    } catch (error) {
      console.error('[SampleLoader] Failed to load from URL:', error);
      throw new Error('Failed to load audio from URL');
    }
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }

  // Get cached buffer
  getCachedBuffer(key: string): AudioBuffer | undefined {
    return this.cache.get(key);
  }
}

// Create a singleton instance
let globalSampleLoader: SampleLoader | null = null;

export function getSampleLoader(audioContext?: AudioContext): SampleLoader {
  if (!globalSampleLoader && audioContext) {
    globalSampleLoader = new SampleLoader(audioContext);
  }
  if (!globalSampleLoader) {
    throw new Error('SampleLoader not initialized - provide AudioContext');
  }
  return globalSampleLoader;
}
