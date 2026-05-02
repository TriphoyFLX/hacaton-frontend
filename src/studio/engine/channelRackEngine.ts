import type { Channel } from '../models';
import { useStudioStore } from '../store/useStudioStore';
import { DrumSynthesizer, FL_DRUM_KIT } from './drumSynth';
import type { DrumSound } from './drumSynth';

/**
 * FL STUDIO STYLE DRUM ENGINE
 * 
 * Professional drum machine with Web Audio API
 * Sample-accurate timing with lookahead scheduling
 */

interface ChannelNodes {
  panner: StereoPannerNode;
  gain: GainNode;
}

export class ChannelRackEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private channelNodes = new Map<string, ChannelNodes>();
  private sampleBuffers = new Map<string, AudioBuffer>();
  private drumSynth: DrumSynthesizer | null = null;
  
  // Scheduling properties
  private bpm: number = 120;
  private stepCount: number = 16;
  private isPlaying: boolean = false;
  private nextStepTime: number = 0;
  private nextStepIndex: number = 0;
  private lastUIStep: number = -1;
  private timerID: number | null = null;
  
  // Scheduler constants
  private scheduleAheadTime = 0.1; // 100ms lookahead
  private lookaheadInterval = 25; // 25ms checks
  
  private onStepCallback?: (step: number) => void;
  private debug = true;
  private drumSoundsLoaded = false;
  private initialized = false;

  private log(message: string, data?: any) {
    if (this.debug) {
      console.log(`🎵 [FL Studio Engine] ${message}`, data);
    }
  }

  constructor() {
    this.initAudio();
  }

  private async initAudio() {
    try {
      // Use the audio context manager for proper initialization
      const { audioContextManager } = await import('./audioContext');
      this.audioContext = await audioContextManager.getAudioContext();
      
      if (this.audioContext) {
        this.masterGain = this.audioContext.createGain();
        this.masterGain.connect(this.audioContext.destination);
        this.masterGain.gain.value = 0.8;
        
        this.drumSynth = new DrumSynthesizer(this.audioContext);
        this.loadDrumSounds();
        
        this.initialized = true;
        this.log('Audio context initialized successfully');
      }
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
      this.log('Audio initialization failed', error);
    }
  }

  private async ensureInitialized(): Promise<boolean> {
    if (!this.initialized) {
      await this.initAudio();
    }
    return this.initialized && this.audioContext !== null;
  }

  private async loadDrumSounds() {
    if (!this.drumSynth || this.drumSoundsLoaded) return;

    this.log('🥁 Loading FL Studio drum kit...');
    const drumBuffers = this.drumSynth.getAllDrumSounds();
    
    drumBuffers.forEach((buffer, name) => {
      this.sampleBuffers.set(name, buffer);
      this.log(`✅ Loaded: ${name}`);
    });

    this.drumSoundsLoaded = true;
    this.log('🎯 All drum sounds ready!');
  }

  private getChannelNodes(channelId: string): ChannelNodes | null {
    if (!this.audioContext || !this.masterGain) return null;

    if (!this.channelNodes.has(channelId)) {
      const gain = this.audioContext.createGain();
      const panner = this.audioContext.createStereoPanner();
      
      panner.connect(gain);
      gain.connect(this.masterGain);
      
      gain.gain.value = 0.8;
      panner.pan.value = 0;
      
      this.channelNodes.set(channelId, { panner, gain });
      this.log(`🔌 Channel ${channelId} connected`);
    }

    return this.channelNodes.get(channelId)!;
  }

  updateChannelParams(channelId: string, volume: number, pan: number) {
    const nodes = this.getChannelNodes(channelId);
    if (!nodes || !this.audioContext) return;

    const now = this.audioContext.currentTime;
    nodes.gain.gain.setTargetAtTime(volume, now, 0.01);
    nodes.panner.pan.setTargetAtTime(pan, now, 0.01);
  }

  async loadChannelSample(channelId: string, audioBuffer: AudioBuffer) {
    this.sampleBuffers.set(channelId, audioBuffer);
    this.log(`📥 Sample loaded: ${channelId}`);
  }

  private triggerSound(channel: Channel, time: number, isPreview: boolean = false) {
    if (!this.audioContext) return;

    // Skip if muted (unless preview)
    if (!isPreview && channel.muted) return;
    
    // Solo check
    const store = useStudioStore.getState();
    const hasSolo = store.channels.some(c => c.solo);
    if (!isPreview && hasSolo && !channel.solo) return;

    const nodes = this.getChannelNodes(channel.id);
    if (!nodes) return;

    // Apply params
    this.updateChannelParams(channel.id, channel.volume, channel.pan);

    // Check for professional drum sound first
    const drumBuffer = this.sampleBuffers.get(channel.name);
    if (drumBuffer) {
      const source = this.audioContext.createBufferSource();
      source.buffer = drumBuffer;
      source.connect(nodes.panner);
      source.start(time);
      this.log(`🥁 ${channel.name} @ ${time.toFixed(3)}s`);
      return;
    }

    // Check for custom sample in channel
    if (channel.type === 'sample' && channel.audioBuffer) {
      const source = this.audioContext.createBufferSource();
      source.buffer = channel.audioBuffer;
      source.connect(nodes.panner);
      source.start(time);
      this.log(`🔊 Sample: ${channel.name} @ ${time.toFixed(3)}s`);
    } else {
      // Professional synth fallback
      this.playSynthSound(channel, nodes.panner, time);
    }
  }

  private playSynthSound(channel: Channel, destination: AudioNode, time: number) {
    if (!this.audioContext) return;

    // Use professional drum sounds instead of basic synth
    const drumBuffers = this.drumSynth?.getAllDrumSounds();
    const buffer = drumBuffers?.get(channel.name);
    if (buffer) {
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(destination);
      source.start(time);
      this.log(`🎹 Synth: 🔊 ${channel.name} @ ${time.toFixed(3)}s`);
    }
  }


  // =====================================================
  // SCHEDULER - Sample-accurate timing
  // =====================================================
  
  async start(bpm: number, stepCount: number) {
    if (!await this.ensureInitialized()) {
      console.error('Cannot start: Audio context not initialized');
      return;
    }

    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (error) {
        console.error('Failed to resume audio context:', error);
        return;
      }
    }

    this.bpm = bpm;
    this.stepCount = stepCount;
    this.isPlaying = true;
    this.nextStepTime = this.audioContext!.currentTime;
    this.nextStepIndex = 0;
    
    this.schedulerLoop();
    
    this.log(`▶️ STARTED: ${bpm} BPM, ${stepCount} steps`);
  }

  stop() {
    this.isPlaying = false;
    if (this.timerID !== null) {
      clearTimeout(this.timerID);
      this.timerID = null;
    }
    this.nextStepIndex = 0;
    this.lastUIStep = -1;
    this.log('⏹️ STOPPED');
  }

  private schedulerLoop() {
    if (!this.isPlaying || !this.audioContext) return;

    while (this.nextStepTime < this.audioContext.currentTime + this.scheduleAheadTime) {
      this.scheduleStep(this.nextStepIndex, this.nextStepTime);
      
      this.nextStepIndex = (this.nextStepIndex + 1) % this.stepCount;
      this.nextStepTime += this.getStepDuration();
    }

    this.timerID = window.setTimeout(() => this.schedulerLoop(), this.lookaheadInterval);
  }

  private getStepDuration(): number {
    return (60 / this.bpm) / 4; // 16th notes
  }

  private scheduleStep(stepIndex: number, time: number) {
    const store = useStudioStore.getState();
    const activePatternId = store.ui.activePatternId;
    
    if (!activePatternId) return;

    const pattern = store.patterns.find(p => p.id === activePatternId);
    if (!pattern) return;

    const channels = store.channels.filter(c => pattern.channelIds.includes(c.id));

    // Check if we should play this step based on timeline clips
    const currentBeat = this.getCurrentBeat();
    const shouldPlay = this.shouldPlayStepAtBeat(currentBeat);

    if (shouldPlay) {
      channels.forEach(channel => {
        if (channel.steps[stepIndex]) {
          this.triggerSound(channel, time);
        }
      });
    }

    // Update UI
    if (stepIndex !== this.lastUIStep && this.onStepCallback) {
      const delay = Math.max(0, (time - this.audioContext!.currentTime) * 1000);
      setTimeout(() => {
        if (this.isPlaying) {
          this.onStepCallback!(stepIndex);
        }
      }, delay);
      this.lastUIStep = stepIndex;
    }
  }

  private getCurrentBeat(): number {
    const store = useStudioStore.getState();
    const transport = store.playback;
    
    // currentTime is already in beats, not seconds!
    return transport.currentTime;
  }

  private shouldPlayStepAtBeat(stepBeat: number): boolean {
    const store = useStudioStore.getState();
    const clips = store.clips;
    const activePatternId = store.ui.activePatternId;
    
    // ABSOLUTE SILENCE: Only play if there are clips with this exact pattern on timeline
    const hasClipAtBeat = clips.some(clip => {
      // MUST have this pattern ID and be at this beat
      return clip.patternId === activePatternId && 
             clip.start <= stepBeat && 
             clip.start + clip.duration > stepBeat;
    });
    
    return hasClipAtBeat;
  }

  
  // =====================================================
  // PUBLIC API
  // =====================================================
  
  async previewStep(channel: Channel) {
    if (!await this.ensureInitialized()) return;
    
    const previewTime = this.audioContext!.currentTime + 0.01;
    this.triggerSound(channel, previewTime, true);
    this.log(`👆 Preview: ${channel.name}`);
  }

  onStep(callback: (step: number) => void) {
    this.onStepCallback = callback;
  }

  getCurrentStep(): number {
    return this.lastUIStep;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  setBpm(bpm: number) {
    this.bpm = bpm;
    this.log(`🎵 BPM: ${bpm}`);
  }

  /**
   * Get FL Studio drum kit
   */
  getDrumKit(): DrumSound[] {
    return FL_DRUM_KIT;
  }

  /**
   * Create a drum channel
   */
  createDrumChannel(drumType: DrumSound): Omit<Channel, 'id'> {
    return {
      name: drumType.name,
      type: 'synth',
      color: drumType.color,
      volume: 0.8,
      pan: 0,
      muted: false,
      solo: false,
      stepCount: 16,
      steps: new Array(16).fill(false),
    };
  }

  /**
   * Get AudioContext for external use (SampleLoader, etc.)
   */
  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  getDebugInfo() {
    return {
      audioContext: this.audioContext ? {
        state: this.audioContext.state,
        sampleRate: this.audioContext.sampleRate,
        currentTime: this.audioContext.currentTime.toFixed(3)
      } : null,
      masterGain: this.masterGain ? 'connected' : 'null',
      drumSoundsLoaded: this.drumSoundsLoaded,
      channels: Array.from(this.channelNodes.keys()).map(id => ({
        id,
        hasBuffer: this.sampleBuffers.has(id),
        nodes: this.channelNodes.has(id) ? 'connected' : 'none'
      })),
      isPlaying: this.isPlaying,
      bpm: this.bpm
    };
  }
}

// Singleton instance
export const globalChannelRackEngine = new ChannelRackEngine();

// Debug helper
(window as unknown as { debugAudio: () => unknown }).debugAudio = () => {
  return globalChannelRackEngine.getDebugInfo();
};
