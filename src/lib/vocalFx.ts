/** Shared vocal FX: presets, normalization, live/record Web Audio chain */

export const EQ_GAIN_LIMIT = 12;

export const EQ_BANDS = [
  { key: 'low' as const, label: 'LOW', hint: '200 Hz' },
  { key: 'mid' as const, label: 'MID', hint: '1 kHz' },
  { key: 'high' as const, label: 'HIGH', hint: '3.5 kHz' },
];

export interface ClipFx {
  enabled: boolean;
  low: number;
  mid: number;
  high: number;
  /** 0..1 compressor amount */
  compress: number;
  /** 0..1 distortion / saturation */
  drive: number;
  /** 0..1 reverb mix */
  reverb: number;
}

export interface TrackEqLike {
  enabled?: boolean;
  low?: number;
  mid?: number;
  high?: number;
}

export type VocalFxPreset = { id: string; name: string } & ClipFx;

export const VOCAL_FX_PRESETS: VocalFxPreset[] = [
  { id: 'flat', name: 'Флэт', enabled: false, low: 0, mid: 0, high: 0, compress: 0, drive: 0, reverb: 0 },
  { id: 'clean', name: 'Чистый', enabled: true, low: -4, mid: 3, high: 4, compress: 0.35, drive: 0, reverb: 0.08 },
  { id: 'warm', name: 'Тёплый', enabled: true, low: 4, mid: 1, high: -2, compress: 0.4, drive: 0.08, reverb: 0.12 },
  { id: 'radio', name: 'Радио', enabled: true, low: -9, mid: 7, high: -2, compress: 0.7, drive: 0.15, reverb: 0.05 },
  { id: 'air', name: 'Воздух', enabled: true, low: -3, mid: 1, high: 9, compress: 0.3, drive: 0, reverb: 0.22 },
  { id: 'podcast', name: 'Подкаст', enabled: true, low: -2, mid: 4, high: 2, compress: 0.75, drive: 0, reverb: 0.04 },
  { id: 'trap', name: 'Trap', enabled: true, low: -5, mid: 5, high: 6, compress: 0.55, drive: 0.12, reverb: 0.18 },
  { id: 'church', name: 'Холл', enabled: true, low: -1, mid: 2, high: 3, compress: 0.25, drive: 0, reverb: 0.72 },
  { id: 'distort', name: 'Дисторшн', enabled: true, low: 2, mid: 3, high: -1, compress: 0.45, drive: 0.72, reverb: 0.1 },
  { id: 'telephone', name: 'Телефон', enabled: true, low: -12, mid: 8, high: -8, compress: 0.8, drive: 0.25, reverb: 0 },
  { id: 'lofi', name: 'Lo-Fi', enabled: true, low: 3, mid: -5, high: -7, compress: 0.5, drive: 0.35, reverb: 0.28 },
  { id: 'brightpop', name: 'Pop', enabled: true, low: -3, mid: 2, high: 7, compress: 0.5, drive: 0.05, reverb: 0.15 },
];

export function clamp01(value: unknown): number {
  const num = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return Math.max(0, Math.min(1, num));
}

export function clampEqGain(value: unknown): number {
  const num = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return Math.max(-EQ_GAIN_LIMIT, Math.min(EQ_GAIN_LIMIT, num));
}

export function normalizeClipFx(
  fx: Partial<ClipFx> | undefined,
  legacyEq?: Partial<TrackEqLike>,
): ClipFx {
  return {
    enabled: Boolean(fx?.enabled ?? legacyEq?.enabled),
    low: clampEqGain(fx?.low ?? legacyEq?.low ?? 0),
    mid: clampEqGain(fx?.mid ?? legacyEq?.mid ?? 0),
    high: clampEqGain(fx?.high ?? legacyEq?.high ?? 0),
    compress: clamp01(fx?.compress),
    drive: clamp01(fx?.drive),
    reverb: clamp01(fx?.reverb),
  };
}

export function makeDistortionCurve(amount: number): Float32Array {
  const n = 44100;
  const curve = new Float32Array(new ArrayBuffer(n * 4));
  const k = Math.max(0.01, amount);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((Math.PI + k) * x) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

export function getUserMediaVocalConstraints(deviceId?: string): MediaStreamConstraints {
  return {
    audio: {
      // `ideal` — не падаем, если deviceId устарел (часто у оппонента / после смены устройства)
      ...(deviceId ? { deviceId: { ideal: deviceId } } : {}),
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      channelCount: { ideal: 1 },
    },
  };
}

/** Soft constraints if browser rejects AEC/NS/AGC off */
export function getUserMediaVocalConstraintsFallback(deviceId?: string): MediaStreamConstraints {
  return {
    audio: deviceId ? { deviceId: { ideal: deviceId } } : true,
  };
}

export function createImpulseReverb(ctx: AudioContext): ConvolverNode | null {
  try {
    const convolver = ctx.createConvolver();
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * 2.4;
    const impulse = ctx.createBuffer(2, length, sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.2);
      }
    }
    convolver.buffer = impulse;
    return convolver;
  } catch {
    return null;
  }
}

export type VocalFxChain = {
  /** Connect mic / source into this node */
  input: GainNode;
  /** Processed output */
  output: GainNode;
  dispose: () => void;
};

/**
 * Build EQ → compressor → drive → dry/wet reverb chain.
 * Caller connects: source → input, output → destination(s).
 */
export function buildVocalFxChain(ctx: AudioContext, fxIn: Partial<ClipFx> | undefined): VocalFxChain {
  const fx = normalizeClipFx(fxIn);
  const input = ctx.createGain();
  input.gain.value = 1;
  const output = ctx.createGain();
  output.gain.value = 1;
  const nodes: AudioNode[] = [input, output];

  let node: AudioNode = input;

  if (fx.enabled && (fx.low !== 0 || fx.mid !== 0 || fx.high !== 0)) {
    const low = ctx.createBiquadFilter();
    low.type = 'lowshelf';
    low.frequency.value = 200;
    low.gain.value = fx.low;
    const mid = ctx.createBiquadFilter();
    mid.type = 'peaking';
    mid.frequency.value = 1000;
    mid.Q.value = 0.9;
    mid.gain.value = fx.mid;
    const high = ctx.createBiquadFilter();
    high.type = 'highshelf';
    high.frequency.value = 3500;
    high.gain.value = fx.high;
    node.connect(low);
    low.connect(mid);
    mid.connect(high);
    node = high;
    nodes.push(low, mid, high);
  }

  if (fx.enabled && fx.compress > 0.01) {
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12 - fx.compress * 28;
    comp.knee.value = 6 + fx.compress * 12;
    comp.ratio.value = 2 + fx.compress * 10;
    comp.attack.value = 0.003;
    comp.release.value = 0.12 + (1 - fx.compress) * 0.18;
    node.connect(comp);
    node = comp;
    nodes.push(comp);
  }

  if (fx.enabled && fx.drive > 0.01) {
    const shaper = ctx.createWaveShaper();
    (shaper as WaveShaperNode).curve = makeDistortionCurve(1 + fx.drive * 40) as any;
    shaper.oversample = '2x';
    const driveGain = ctx.createGain();
    driveGain.gain.value = 1 - fx.drive * 0.25;
    node.connect(shaper);
    shaper.connect(driveGain);
    node = driveGain;
    nodes.push(shaper, driveGain);
  }

  if (fx.enabled && fx.reverb > 0.01) {
    const dry = ctx.createGain();
    const wet = ctx.createGain();
    dry.gain.value = 1 - fx.reverb * 0.85;
    wet.gain.value = fx.reverb * 0.9;
    node.connect(dry);
    dry.connect(output);
    const reverb = createImpulseReverb(ctx);
    if (reverb) {
      node.connect(wet);
      wet.connect(reverb);
      reverb.connect(output);
      nodes.push(dry, wet, reverb);
    } else {
      node.connect(output);
      nodes.push(dry, wet);
    }
  } else {
    node.connect(output);
  }

  return {
    input,
    output,
    dispose: () => {
      for (const n of nodes) {
        try { n.disconnect(); } catch { /* noop */ }
      }
    },
  };
}

/** Live mic → FX → record stream (+ optional monitor). */
export class VocalLiveSession {
  ctx: AudioContext;
  rawStream: MediaStream;
  recordStream: MediaStream;
  private source: MediaStreamAudioSourceNode;
  private dest: MediaStreamAudioDestinationNode;
  private chain: VocalFxChain;
  private monitorGain: GainNode;
  private analyser: AnalyserNode;
  private meterSource: MediaStreamAudioSourceNode;
  private disposed = false;

  private constructor(
    ctx: AudioContext,
    rawStream: MediaStream,
    source: MediaStreamAudioSourceNode,
    dest: MediaStreamAudioDestinationNode,
    chain: VocalFxChain,
    monitorGain: GainNode,
    analyser: AnalyserNode,
    meterSource: MediaStreamAudioSourceNode,
  ) {
    this.ctx = ctx;
    this.rawStream = rawStream;
    this.recordStream = dest.stream;
    this.source = source;
    this.dest = dest;
    this.chain = chain;
    this.monitorGain = monitorGain;
    this.analyser = analyser;
    this.meterSource = meterSource;
  }

  static async create(opts: {
    deviceId?: string;
    fx: ClipFx;
    monitor?: boolean;
  }): Promise<VocalLiveSession> {
    let rawStream: MediaStream;
    try {
      rawStream = await navigator.mediaDevices.getUserMedia(
        getUserMediaVocalConstraints(opts.deviceId),
      );
    } catch {
      rawStream = await navigator.mediaDevices.getUserMedia(
        getUserMediaVocalConstraintsFallback(opts.deviceId),
      );
    }
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (ctx.state !== 'running') await ctx.resume();

    const source = ctx.createMediaStreamSource(rawStream);
    const dest = ctx.createMediaStreamDestination();
    const chain = buildVocalFxChain(ctx, opts.fx);
    source.connect(chain.input);
    chain.output.connect(dest);

    const monitorGain = ctx.createGain();
    monitorGain.gain.value = opts.monitor ? 0.9 : 0;
    chain.output.connect(monitorGain);
    monitorGain.connect(ctx.destination);

    // Meter from raw mic (pre-FX) for honest input level
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.7;
    const meterSource = ctx.createMediaStreamSource(rawStream);
    meterSource.connect(analyser);

    return new VocalLiveSession(ctx, rawStream, source, dest, chain, monitorGain, analyser, meterSource);
  }

  setMonitor(on: boolean) {
    this.monitorGain.gain.value = on ? 0.9 : 0;
  }

  applyFx(fx: ClipFx) {
    try { this.source.disconnect(); } catch { /* noop */ }
    try { this.chain.output.disconnect(); } catch { /* noop */ }
    this.chain.dispose();
    this.chain = buildVocalFxChain(this.ctx, fx);
    this.source.connect(this.chain.input);
    this.chain.output.connect(this.dest);
    this.chain.output.connect(this.monitorGain);
  }

  /** RMS-ish level 0..1 for UI meter */
  getLevel(): number {
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    return Math.min(1, Math.sqrt(sum / data.length) * 3.2);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    try { this.chain.dispose(); } catch { /* noop */ }
    try { this.source.disconnect(); } catch { /* noop */ }
    try { this.monitorGain.disconnect(); } catch { /* noop */ }
    try { this.meterSource.disconnect(); } catch { /* noop */ }
    this.rawStream.getTracks().forEach(t => {
      try { t.stop(); } catch { /* noop */ }
    });
    // Close after a tick so a follow-up getUserMedia is not racing a closing context
    const ctx = this.ctx;
    setTimeout(() => { void ctx.close().catch(() => undefined); }, 0);
  }
}

export function presetNameForFx(fx: ClipFx): string {
  const match = VOCAL_FX_PRESETS.find(
    p =>
      p.enabled === fx.enabled
      && p.low === fx.low
      && p.mid === fx.mid
      && p.high === fx.high
      && Math.abs(p.compress - fx.compress) < 0.02
      && Math.abs(p.drive - fx.drive) < 0.02
      && Math.abs(p.reverb - fx.reverb) < 0.02,
  );
  return match?.name ?? 'Custom';
}
