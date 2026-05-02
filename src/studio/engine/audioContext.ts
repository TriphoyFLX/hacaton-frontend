export class AudioContextManager {
  private static instance: AudioContextManager;
  private audioContext: AudioContext | null = null;
  private isInitialized = false;
  private initializationPromise: Promise<AudioContext> | null = null;

  private constructor() {}

  static getInstance(): AudioContextManager {
    if (!AudioContextManager.instance) {
      AudioContextManager.instance = new AudioContextManager();
    }
    return AudioContextManager.instance;
  }

  async getAudioContext(): Promise<AudioContext> {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      // Resume if suspended
      if (this.audioContext.state === 'suspended') {
        try {
          await this.audioContext.resume();
        } catch (error) {
          console.warn('Failed to resume AudioContext:', error);
        }
      }
      return this.audioContext;
    }

    // Initialize if not already initializing
    if (!this.initializationPromise) {
      this.initializationPromise = this.initializeAudioContext();
    }

    return this.initializationPromise;
  }

  private async initializeAudioContext(): Promise<AudioContext> {
    try {
      // Create new AudioContext
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Handle context state changes
      this.audioContext.addEventListener('statechange', () => {
        console.log(`AudioContext state changed to: ${this.audioContext?.state}`);
      });

      // Handle context interruption (iOS/Safari)
      this.audioContext.addEventListener('statechange', async () => {
        if (this.audioContext?.state === 'interrupted') {
          try {
            await this.audioContext.resume();
            console.log('AudioContext resumed from interruption');
          } catch (error) {
            console.error('Failed to resume AudioContext from interruption:', error);
          }
        }
      });

      // Resume context if needed (required by some browsers)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.isInitialized = true;
      console.log('AudioContext initialized successfully');
      return this.audioContext;

    } catch (error) {
      console.error('Failed to initialize AudioContext:', error);
      
      // Fallback: try to create a simple context
      try {
        this.audioContext = new AudioContext();
        this.isInitialized = true;
        console.log('Fallback AudioContext created');
        return this.audioContext;
      } catch (fallbackError) {
        console.error('Fallback AudioContext also failed:', fallbackError);
        throw new Error('Could not initialize audio context');
      }
    }
  }

  async resumeAudioContext(): Promise<void> {
    try {
      const context = await this.getAudioContext();
      if (context.state === 'suspended') {
        await context.resume();
        console.log('AudioContext resumed');
      }
    } catch (error) {
      console.error('Failed to resume AudioContext:', error);
    }
  }

  getState(): string {
    return this.audioContext?.state || 'uninitialized';
  }

  async close(): Promise<void> {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        await this.audioContext.close();
        this.audioContext = null;
        this.isInitialized = false;
        this.initializationPromise = null;
        console.log('AudioContext closed');
      } catch (error) {
        console.error('Failed to close AudioContext:', error);
      }
    }
  }
}

// Export singleton instance
export const audioContextManager = AudioContextManager.getInstance();
