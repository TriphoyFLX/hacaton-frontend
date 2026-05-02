/**
 * FL STUDIO STYLE DRUM SYNTHESIZER
 * 
 * Professional drum sounds using Web Audio API
 * No samples needed - pure synthesis like classic drum machines
 */

export interface DrumSound {
  name: string;
  color: string;
  icon: string;
  type: 'kick' | 'snare' | 'hihat' | 'clap' | 'percussion' | 'bass';
}

// Professional drum kit configuration
export const FL_DRUM_KIT: DrumSound[] = [
  { name: 'Kick', color: '#ef4444', icon: '🥁', type: 'kick' },
  { name: 'Snare', color: '#f59e0b', icon: '🎯', type: 'snare' },
  { name: 'Hi-Hat', color: '#10b981', icon: '🎩', type: 'hihat' },
  { name: 'Open Hat', color: '#06b6d4', icon: '🎪', type: 'hihat' },
  { name: 'Clap', color: '#8b5cf6', icon: '👏', type: 'clap' },
  { name: 'Rim', color: '#ec4899', icon: '⭕', type: 'percussion' },
  { name: 'Cowbell', color: '#84cc16', icon: '🔔', type: 'percussion' },
  { name: 'Crash', color: '#f97316', icon: '💥', type: 'percussion' },
];

export class DrumSynthesizer {
  private audioContext: AudioContext;
  
  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
  }

  /**
   * Create professional kick drum - 808 style
   */
  createKick(): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.5; // 500ms for deep kick
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);

    // 808-style kick with pitch sweep
    const fundamentalFreq = 60; // Deep sub bass
    const sweepTime = 0.1; // Fast pitch sweep
    
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      
      // Pitch envelope - starts high, sweeps down to sub bass
      let freq;
      if (t < sweepTime) {
        freq = fundamentalFreq * 10 * Math.exp(-t * 30);
      } else {
        freq = fundamentalFreq;
      }
      
      // Amplitude envelope - punchy attack, smooth decay
      let amplitude;
      if (t < 0.01) {
        amplitude = t / 0.01; // Fast attack
      } else {
        amplitude = Math.exp(-t * 8); // Exponential decay
      }
      
      // Generate sine wave with harmonics for body
      let sample = 0;
      sample += Math.sin(2 * Math.PI * freq * t) * 0.8; // Fundamental
      sample += Math.sin(4 * Math.PI * freq * t) * 0.2; // 2nd harmonic
      sample += Math.sin(6 * Math.PI * freq * t) * 0.1; // 3rd harmonic
      
      // Add click at start for attack
      if (t < 0.005) {
        sample += Math.sin(2 * Math.PI * 200 * t) * (1 - t / 0.005) * 0.3;
      }
      
      data[i] = sample * amplitude * 0.8; // Normalize volume
    }

    return buffer;
  }

  /**
   * Create professional snare drum - TR-808 style
   */
  createSnare(): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.2;
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);

    // Snare has two components: tone (body) and noise (snap)
    const toneFreq = 200; // Snare body frequency
    const noiseAmount = 0.4; // Amount of noise for snap
    
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      
      // Amplitude envelope
      let amplitude;
      if (t < 0.005) {
        amplitude = t / 0.005; // Very fast attack
      } else {
        amplitude = Math.exp(-t * 15); // Quick decay
      }
      
      // Tone component (snare body)
      const tone = Math.sin(2 * Math.PI * toneFreq * t) * 0.6;
      
      // Noise component (snare snap)
      const noise = (Math.random() - 0.5) * noiseAmount;
      
      // Filter noise to sound like snare wires
      const filteredNoise = noise * Math.exp(-t * 50);
      
      data[i] = (tone + filteredNoise) * amplitude;
    }

    return buffer;
  }

  /**
   * Create closed hi-hat - crisp and metallic
   */
  createClosedHat(): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.05; // Very short for closed hat
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);

    // Hi-hats are filtered noise with metallic character
    const fundamentalFreq = 8000; // High frequency for brightness
    
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      
      // Quick envelope for closed hat
      const amplitude = Math.exp(-t * 100);
      
      // Metallic noise with harmonics
      let sample = 0;
      for (let harmonic = 1; harmonic <= 6; harmonic++) {
        const freq = fundamentalFreq * harmonic;
        const harmonicAmplitude = 1 / harmonic; // Decreasing amplitude
        sample += (Math.random() - 0.5) * Math.sin(2 * Math.PI * freq * t) * harmonicAmplitude;
      }
      
      // Add some ring for metallic character
      sample += Math.sin(2 * Math.PI * 12000 * t) * 0.1 * Math.exp(-t * 200);
      
      data[i] = sample * amplitude * 0.3;
    }

    return buffer;
  }

  /**
   * Create open hi-hat - longer decay
   */
  createOpenHat(): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.3; // Longer for open hat
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);

    const fundamentalFreq = 7000;
    
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      
      // Slower envelope for open hat
      const amplitude = Math.exp(-t * 8);
      
      // Similar metallic character but longer decay
      let sample = 0;
      for (let harmonic = 1; harmonic <= 5; harmonic++) {
        const freq = fundamentalFreq * harmonic;
        const harmonicAmplitude = 1 / (harmonic * 1.5);
        sample += (Math.random() - 0.5) * Math.sin(2 * Math.PI * freq * t) * harmonicAmplitude;
      }
      
      // Add shimmer for open sound
      sample += Math.sin(2 * Math.PI * 15000 * t) * 0.05 * Math.exp(-t * 50);
      
      data[i] = sample * amplitude * 0.25;
    }

    return buffer;
  }

  /**
   * Create clap - sharp and punchy
   */
  createClap(): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.03; // Very short for clap
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);

    // Clap is multiple noise bursts close together
    const clapBursts = 3; // Three quick claps
    const burstSpacing = 0.008; // 8ms between bursts
    
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      let sample = 0;
      
      // Generate multiple clap bursts
      for (let burst = 0; burst < clapBursts; burst++) {
        const burstTime = t - burst * burstSpacing;
        if (burstTime >= 0 && burstTime < 0.01) {
          const amplitude = Math.exp(-burstTime * 200);
          sample += (Math.random() - 0.5) * amplitude;
        }
      }
      
      // Filter to sound like hand clap
      data[i] = sample * 0.4;
    }

    return buffer;
  }

  /**
   * Create rimshot - wooden click sound
   */
  createRim(): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.02;
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);

    const rimFreq = 2500; // High frequency for wood click
    
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      
      // Very fast envelope
      const amplitude = Math.exp(-t * 300);
      
      // Tone component for wood character
      const tone = Math.sin(2 * Math.PI * rimFreq * t) * 0.7;
      
      // Noise component for texture
      const noise = (Math.random() - 0.5) * 0.3;
      
      data[i] = (tone + noise) * amplitude;
    }

    return buffer;
  }

  /**
   * Create cowbell - metallic tone
   */
  createCowbell(): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.15;
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);

    // Cowbell has specific harmonic structure
    const fundamentals = [540, 810, 1080]; // Cowbell harmonics
    
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      
      // Medium decay
      const amplitude = Math.exp(-t * 12);
      
      let sample = 0;
      fundamentals.forEach((freq, index) => {
        const harmonicAmplitude = [0.5, 0.3, 0.2][index];
        sample += Math.sin(2 * Math.PI * freq * t) * harmonicAmplitude;
      });
      
      // Add metallic overtones
      sample += Math.sin(2 * Math.PI * 2160 * t) * 0.1;
      sample += Math.sin(2 * Math.PI * 3240 * t) * 0.05;
      
      data[i] = sample * amplitude * 0.6;
    }

    return buffer;
  }

  /**
   * Create crash cymbal - long metallic decay
   */
  createCrash(): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 1.0; // Long decay for crash
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);

    // Crash is complex noise with many harmonics
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      
      // Slow decay for crash
      const amplitude = Math.exp(-t * 2);
      
      let sample = 0;
      
      // Complex metallic noise
      for (let harmonic = 1; harmonic <= 20; harmonic++) {
        const freq = 1000 * harmonic;
        const harmonicAmplitude = 1 / (harmonic * 2);
        sample += (Math.random() - 0.5) * Math.sin(2 * Math.PI * freq * t) * harmonicAmplitude;
      }
      
      // Add shimmer for metallic character
      sample += Math.sin(2 * Math.PI * 8000 * t) * 0.1 * Math.exp(-t * 10);
      sample += Math.sin(2 * Math.PI * 12000 * t) * 0.05 * Math.exp(-t * 15);
      
      data[i] = sample * amplitude * 0.15;
    }

    return buffer;
  }

  /**
   * Get all drum sounds as buffers
   */
  getAllDrumSounds(): Map<string, AudioBuffer> {
    const sounds = new Map<string, AudioBuffer>();
    
    sounds.set('Kick', this.createKick());
    sounds.set('Snare', this.createSnare());
    sounds.set('Hi-Hat', this.createClosedHat());
    sounds.set('Open Hat', this.createOpenHat());
    sounds.set('Clap', this.createRim());
    sounds.set('Rim', this.createRim());
    sounds.set('Cowbell', this.createCowbell());
    sounds.set('Crash', this.createCrash());
    
    return sounds;
  }
}
