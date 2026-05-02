import { audioContextManager } from './audioContext';

export class AudioLoader {
  private audioContext: AudioContext | null = null;

  constructor() {
    // AudioContext will be initialized when needed
  }

  private async getAudioContext(): Promise<AudioContext> {
    if (!this.audioContext) {
      this.audioContext = await audioContextManager.getAudioContext();
    }
    return this.audioContext;
  }

  async loadAudioFile(file: File): Promise<AudioBuffer> {
    try {
      const context = await this.getAudioContext();
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await context.decodeAudioData(arrayBuffer);
      return audioBuffer;
    } catch (error) {
      console.error('Failed to load audio file:', error);
      throw new Error('Could not load audio file');
    }
  }

  async loadSampleFromUrl(url: string): Promise<AudioBuffer> {
    try {
      const context = await this.getAudioContext();
      console.log(`🔍 Loading audio from: ${url}`);
      
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`⚠️ HTTP error for ${url}: ${response.status} ${response.statusText}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      console.log(`📊 Received ${arrayBuffer.byteLength} bytes from ${url}`);
      
      const audioBuffer = await context.decodeAudioData(arrayBuffer);
      console.log(`✅ Successfully decoded audio: ${audioBuffer.duration.toFixed(2)}s, ${audioBuffer.sampleRate}Hz`);
      return audioBuffer;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'EncodingError') {
        console.warn(`⚠️ Encoding error for ${url}: File may be corrupted or unsupported format`);
      } else if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.warn(`⚠️ Network error for ${url}: File not found or server error`);
      } else {
        console.error(`❌ Failed to load sample from URL ${url}:`, error);
      }
      throw new Error(`Could not load sample from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAudioContextInstance(): Promise<AudioContext> {
    return this.getAudioContext();
  }
}
