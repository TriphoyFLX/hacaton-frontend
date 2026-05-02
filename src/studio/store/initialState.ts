/**
 * FL STUDIO INITIAL STATE
 * 
 * Professional drum patterns ready to use immediately
 */
import type { Channel, Pattern } from '../models';

export const FL_INITIAL_CHANNELS: Omit<Channel, 'id'>[] = [
  {
    name: 'Kick',
    type: 'synth',
    color: '#ef4444',
    volume: 0.9,
    pan: 0,
    muted: false,
    solo: false,
    stepCount: 16,
    steps: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
  },
  {
    name: 'Snare',
    type: 'synth',
    color: '#f59e0b',
    volume: 0.8,
    pan: 0,
    muted: false,
    solo: false,
    stepCount: 16,
    steps: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
  },
  {
    name: 'Hi-Hat',
    type: 'synth',
    color: '#10b981',
    volume: 0.6,
    pan: 0.2,
    muted: false,
    solo: false,
    stepCount: 16,
    steps: [true, true, false, true, true, true, false, true, true, true, false, true, true, true, false, true],
  },
  {
    name: 'Open Hat',
    type: 'synth',
    color: '#06b6d4',
    volume: 0.4,
    pan: -0.2,
    muted: false,
    solo: false,
    stepCount: 16,
    steps: [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
  },
  {
    name: 'Clap',
    type: 'synth',
    color: '#8b5cf6',
    volume: 0.7,
    pan: 0,
    muted: false,
    solo: false,
    stepCount: 16,
    steps: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
  },
  {
    name: 'Rim',
    type: 'synth',
    color: '#ec4899',
    volume: 0.5,
    pan: 0.3,
    muted: true,
    solo: false,
    stepCount: 16,
    steps: [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
  },
];
