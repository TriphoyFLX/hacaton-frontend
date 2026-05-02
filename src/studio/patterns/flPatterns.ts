/**
 * FL STUDIO STYLE PRESET PATTERNS
 * 
 * Professional drum patterns for different genres
 * Ready-to-use beats that sound like FL Studio
 */

import { FL_DRUM_KIT } from '../engine/drumSynth';
import type { Pattern, Channel } from '../models';

export interface FLPattern {
  name: string;
  genre: string;
  description: string;
  channels: Omit<Channel, 'id'>[];
  steps: {
    [channelName: string]: boolean[];
  };
}

// Professional FL Studio patterns
export const FL_PATTERNS: FLPattern[] = [
  {
    name: 'Hip Hop Boom Bap',
    genre: 'Hip Hop',
    description: 'Classic 90s hip hop beat',
    channels: [
      { name: 'Kick', type: 'synth', color: '#ef4444', volume: 0.9, pan: 0, muted: false, solo: false, stepCount: 16, steps: [] },
      { name: 'Snare', type: 'synth', color: '#f59e0b', volume: 0.8, pan: 0, muted: false, solo: false, stepCount: 16, steps: [] },
      { name: 'Hi-Hat', type: 'synth', color: '#10b981', volume: 0.6, pan: 0, muted: false, solo: false, stepCount: 16, steps: [] },
      { name: 'Open Hat', type: 'synth', color: '#06b6d4', volume: 0.5, pan: 0, muted: false, solo: false, stepCount: 16, steps: [] },
    ],
    steps: {
      'Kick': [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
      'Snare': [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
      'Hi-Hat': [true, true, false, true, true, true, false, true, true, true, false, true, true, true, false, true],
      'Open Hat': [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
    }
  },
  {
    name: 'Trap Beat',
    genre: 'Trap',
    description: 'Modern trap with 808 kick and fast hi-hats',
    channels: [
      { name: 'Kick', type: 'synth', color: '#ef4444', volume: 1.0, pan: 0, muted: false, solo: false, stepCount: 16, steps: [] },
      { name: 'Snare', type: 'synth', color: '#f59e0b', volume: 0.9, pan: 0, muted: false, solo: false, stepCount: 16, steps: [] },
      { name: 'Hi-Hat', type: 'synth', color: '#10b981', volume: 0.4, pan: 0, muted: false, solo: false, stepCount: 16, steps: [] },
      { name: 'Open Hat', type: 'synth', color: '#06b6d4', volume: 0.3, pan: 0, muted: false, solo: false, stepCount: 16, steps: [] },
      { name: 'Clap', type: 'synth', color: '#8b5cf6', volume: 0.7, pan: 0, muted: false, solo: false, stepCount: 16, steps: [] },
    ],
    steps: {
      'Kick': [true, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false],
      'Snare': [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
      'Hi-Hat': [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true],
      'Open Hat': [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
      'Clap': [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
    }
  },
  {
    name: 'House 4/4',
    genre: 'House',
    description: 'Classic house beat with four-on-the-floor',
    channels: [
      { name: 'Kick', type: 'synth', color: '#ef4444', volume: 0.9, pan: 0, muted: false, solo: false, stepCount: 16, steps: [] },
      { name: 'Snare', type: 'synth', color: '#f59e0b', volume: 0.7, pan: 0, muted: false, solo: false, stepCount: 16, steps: [] },
      { name: 'Hi-Hat', type: 'synth', color: '#10b981', volume: 0.5, pan: 0, muted: false, solo: false, stepCount: 16, steps: [] },
      { name: 'Open Hat', type: 'synth', color: '#06b6d4', volume: 0.4, pan: 0, muted: false, solo: false, stepCount: 16, steps: [] },
    ],
    steps: {
      'Kick': [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
      'Snare': [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
      'Hi-Hat': [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false],
      'Open Hat': [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
    }
  },
  {
    name: 'Techno Drive',
    genre: 'Techno',
    description: 'Driving techno beat with kick and percussion',
    channels: [
      { name: 'Kick', type: 'synth', color: '#ef4444', volume: 0.95, pan: 0, muted: false, solo: false, stepCount: 16, steps: [] },
      { name: 'Snare', type: 'synth', color: '#f59e0b', volume: 0.6, pan: 0, muted: false, solo: false, stepCount: 16, steps: [] },
      { name: 'Hi-Hat', type: 'synth', color: '#10b981', volume: 0.4, pan: 0, muted: false, solo: false, stepCount: 16, steps: [] },
      { name: 'Clap', type: 'synth', color: '#8b5cf6', volume: 0.5, pan: 0, muted: false, solo: false, stepCount: 16, steps: [] },
    ],
    steps: {
      'Kick': [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
      'Snare': [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
      'Hi-Hat': [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
      'Clap': [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
    }
  },
  {
    name: 'Funk Groove',
    genre: 'Funk',
    description: 'Groovy funk beat with syncopation',
    channels: [
      { name: 'Kick', type: 'synth', color: '#ef4444', volume: 0.8, pan: 0, muted: false, solo: false, stepCount: 16, steps: [] },
      { name: 'Snare', type: 'synth', color: '#f59e0b', volume: 0.8, pan: 0, muted: false, solo: false, stepCount: 16, steps: [] },
      { name: 'Hi-Hat', type: 'synth', color: '#10b981', volume: 0.5, pan: 0, muted: false, solo: false, stepCount: 16, steps: [] },
      { name: 'Open Hat', type: 'synth', color: '#06b6d4', volume: 0.4, pan: 0, muted: false, solo: false, stepCount: 16, steps: [] },
      { name: 'Clap', type: 'synth', color: '#8b5cf6', volume: 0.6, pan: 0, muted: false, solo: false, stepCount: 16, steps: [] },
    ],
    steps: {
      'Kick': [true, false, false, true, false, false, true, false, false, true, false, false, true, false, false, false],
      'Snare': [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
      'Hi-Hat': [true, true, false, true, true, true, false, true, true, true, false, true, true, true, false, true],
      'Open Hat': [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
      'Clap': [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
    }
  },
  {
    name: 'Drum & Bass',
    genre: 'DnB',
    description: 'Fast-paced DnB breakbeat',
    channels: [
      { name: 'Kick', type: 'synth', color: '#ef4444', volume: 0.9, pan: 0, muted: false, solo: false, stepCount: 16, steps: [] },
      { name: 'Snare', type: 'synth', color: '#f59e0b', volume: 1.0, pan: 0, muted: false, solo: false, stepCount: 16, steps: [] },
      { name: 'Hi-Hat', type: 'synth', color: '#10b981', volume: 0.3, pan: 0, muted: false, solo: false, stepCount: 16, steps: [] },
    ],
    steps: {
      'Kick': [true, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false],
      'Snare': [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
      'Hi-Hat': [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true],
    }
  },
];

/**
 * Create a pattern from FL Studio preset
 */
export function createFLPattern(flPattern: FLPattern): Omit<Pattern, 'id'> {
  const channels: Channel[] = flPattern.channels.map((channel, index) => ({
    ...channel,
    id: `ch-${Date.now()}-${index}`,
    steps: flPattern.steps[channel.name] || new Array(16).fill(false),
  }));

  return {
    name: flPattern.name,
    stepCount: 16,
    channelIds: channels.map(c => c.id),
  };
}

/**
 * Get all available patterns by genre
 */
export function getPatternsByGenre(genre: string): FLPattern[] {
  return FL_PATTERNS.filter(pattern => 
    pattern.genre.toLowerCase() === genre.toLowerCase()
  );
}

/**
 * Get all available genres
 */
export function getAvailableGenres(): string[] {
  return [...new Set(FL_PATTERNS.map(pattern => pattern.genre))];
}
