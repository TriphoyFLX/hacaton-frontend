import type { Channel } from '../models';
import { useStudioStore } from '../store/useStudioStore';

/**
 * PROPER WEB AUDIO API SCHEDULING ENGINE
 * 
 * Architecture: Channel → PannerNode → GainNode → MasterGain → destination
 * Uses lookahead scheduling for sample-accurate timing.
 */

interface ChannelNodes {
  panner: StereoPannerNode;
  gain: GainNode;
}

export class ChannelRackEngine {
  // Audio Context - single source of truth
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  
  // Channel routing: channelId -> { panner, gain }
  private channelNodes: Map<string, ChannelNodes> = new Map();
  private sampleBuffers: Map<string, AudioBuffer> = new Map();
  
  // PROPER SCHEDULING (replaces broken setInterval)
  private isPlaying: boolean = false;
  private bpm: number = 120;
  private stepCount: number = 16;
  private nextStepIndex: number = 0;
  private nextStepTime: number = 0;
  private scheduleAheadTime: number = 0.1; // Lookahead in seconds
  private lookaheadInterval: number = 25; // ms between scheduling checks
  private timerID: number | null = null;
  
  // UI sync
  private onStepCallback?: (step: number) => void;
  private lastUIStep: number = -1;
  
  // Debug
  private debug: boolean = true;

  constructor() {
    this.initAudio();
  }

  private log(msg: string, data?: unknown) {
    if (this.debug) {
      console.log(`[ChannelRack] ${msg}`, data || '');
    }
  }

  private async initAudio() {
    try {
      this.audioContext = new (window.AudioContext || 
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      
      // Create master gain
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 1;
      this.masterGain.connect(this.audioContext.destination);
      
      this.log('✅ AudioContext initialized', { 
        sampleRate: this.audioContext.sampleRate,
        state: this.audioContext.state 
      });
    } catch (e) {
      console.error('❌ Web Audio API not supported', e);
    }
  }

  /**
   * Get or create channel nodes
   * Routing: Panner -> Gain -> Master -> Destination
   */
  private getChannelNodes(channelId: string): ChannelNodes | null {
    if (!this.audioContext || !this.masterGain) {
      this.log('❌ AudioContext not ready');
      return null;
    }

    if (!this.channelNodes.has(channelId)) {
      const gain = this.audioContext.createGain();
      const panner = this.audioContext.createStereoPanner();
      
      // Chain: panner -> gain -> master
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
    this.log(`📥 Sample loaded: ${channelId}`, { 
      duration: audioBuffer.duration 
    });
  }

  // =====================================================
  // SOUND TRIGGERING - Creates fresh source every time!
  // =====================================================
  
  private triggerSound(channel: Channel, time: number, isPreview: boolean = false) {
    if (!this.audioContext) {
      this.log('❌ No AudioContext');
      return;
    }

    // Skip if muted (unless preview)
    if (!isPreview && channel.muted) return;
    
    // Solo check
    const store = useStudioStore.getState();
    const hasSolo = store.channels.some(c => c.solo);
    if (!isPreview && hasSolo && !channel.solo) return;

    const nodes = this.getChannelNodes(channel.id);
    if (!nodes) {
      this.log(`❌ Channel ${channel.name} not connected`);
      return;
    }

    // Apply params
    this.updateChannelParams(channel.id, channel.volume, channel.pan);

    if (channel.type === 'sample' && this.sampleBuffers.has(channel.id)) {
      // PLAY SAMPLE - fresh BufferSource each trigger!
      const buffer = this.sampleBuffers.get(channel.id)!;
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(nodes.panner);
      source.start(time);
      
      this.log(`🔊 Sample: ${channel.name} @ ${time.toFixed(3)}s`);
    } else {
      // PLAY SYNTH
      this.playSynth(channel, nodes.panner, time);
    }
  }

  private playSynth(channel: Channel, destination: AudioNode, time: number) {
    if (!this.audioContext) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    const freq = this.getFrequency(channel.name);
    osc.frequency.value = freq;
    
    // Set waveform based on drum type
    const name = channel.name.toLowerCase();
    if (name.includes('kick')) osc.type = 'sine';
    else if (name.includes('snare')) osc.type = 'triangle';
    else if (name.includes('hat')) osc.type = 'square';
    else osc.type = 'sawtooth';

    osc.connect(gain);
    gain.connect(destination);

    // Envelope
    const duration = name.includes('kick') ? 0.15 : 0.1;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.5, time + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.start(time);
    osc.stop(time + duration);
    
    this.log(`🎹 Synth: ${channel.name} @ ${time.toFixed(3)}s`);
  }

  private getFrequency(name: string): number {
    const lower = name.toLowerCase();
    if (lower.includes('kick')) return 60;
    if (lower.includes('snare')) return 200;
    if (lower.includes('hat')) return 800;
    if (lower.includes('clap')) return 400;
    if (lower.includes('tom')) return 150;
    return 440;
  }

  // =====================================================
  // SCHEDULER - The key fix: Web Audio API timing
  // =====================================================
  
  start(bpm: number, stepCount: number = 16) {
    if (this.isPlaying || !this.audioContext) return;

    // Resume context (browser requires user gesture)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    this.bpm = bpm;
    this.stepCount = stepCount;
    this.isPlaying = true;
    
    // Start scheduling from current audio time
    this.nextStepTime = this.audioContext.currentTime;
    this.nextStepIndex = 0;
    
    // Kick off the scheduler loop
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

  /**
   * The heart of the engine: lookahead scheduling
   * Schedules steps ahead of time for sample-accurate playback
   */
  private schedulerLoop() {
    if (!this.isPlaying || !this.audioContext) return;

    // Schedule all steps that fall within lookahead window
    while (this.nextStepTime < this.audioContext.currentTime + this.scheduleAheadTime) {
      this.scheduleStep(this.nextStepIndex, this.nextStepTime);
      
      // Advance to next step
      this.nextStepIndex = (this.nextStepIndex + 1) % this.stepCount;
      this.nextStepTime += this.getStepDuration();
    }

    // Set up next check
    this.timerID = window.setTimeout(() => this.schedulerLoop(), this.lookaheadInterval);
  }

  private getStepDuration(): number {
    // 1 beat = 60/bpm seconds, 4 steps per beat (16th notes)
    return (60 / this.bpm) / 4;
  }

  private scheduleStep(stepIndex: number, time: number) {
    const store = useStudioStore.getState();
    const activePatternId = store.ui.activePatternId;
    
    if (!activePatternId) {
      this.log('⚠️ No active pattern');
      return;
    }

    const pattern = store.patterns.find(p => p.id === activePatternId);
    if (!pattern) return;

    // Get channels for this pattern
    const channels = store.channels.filter(c => pattern.channelIds.includes(c.id));

    // Schedule sounds for active steps
    channels.forEach(channel => {
      if (channel.steps[stepIndex]) {
        this.triggerSound(channel, time);
      }
    });

    // Update UI (throttle to avoid excessive re-renders)
    if (stepIndex !== this.lastUIStep && this.onStepCallback) {
      // Calculate when this step should display based on audio time
      const delay = Math.max(0, (time - this.audioContext!.currentTime) * 1000);
      setTimeout(() => {
        if (this.isPlaying) {
          this.onStepCallback!(stepIndex);
        }
      }, delay);
      this.lastUIStep = stepIndex;
    }
  }

  // =====================================================
  // PUBLIC API
  // =====================================================
  
  /**
   * Preview sound when user clicks a step
   */
  previewStep(channel: Channel) {
    if (!this.audioContext) return;
    
    // Play immediately at current time + small offset
    const previewTime = this.audioContext.currentTime + 0.01;
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
    // Next loop will use new BPM automatically
    this.log(`🎵 BPM changed: ${bpm}`);
  }

  /**
   * Debug: Check routing status
   */
  getDebugInfo() {
    return {
      audioContext: this.audioContext ? {
        state: this.audioContext.state,
        sampleRate: this.audioContext.sampleRate,
        currentTime: this.audioContext.currentTime.toFixed(3)
      } : null,
      masterGain: this.masterGain ? 'connected' : 'null',
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

// Create singleton instance
export const globalChannelRackEngine = new ChannelRackEngine();

// Debug helper (call in console: window.debugAudio())
(window as unknown as { debugAudio: () => unknown }).debugAudio = () => {
  return globalChannelRackEngine.getDebugInfo();
};
