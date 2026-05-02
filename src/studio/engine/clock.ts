type TickCallback = (time: number) => void;

export class Clock {
  private isRunning = false;
  private elapsedTime = 0;
  private animationFrameId: number | null = null;
  private callbacks: Set<TickCallback> = new Set();
  private lastFrameTime = 0;
  private bpm: number;
  constructor(bpm = 120) {
    this.bpm = bpm;
  }

  setBpm(bpm: number) {
    this.bpm = bpm;
  }

  onTick(callback: TickCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  start(startFrom = 0) {
    if (this.isRunning) return;

    this.isRunning = true;
    this.elapsedTime = startFrom;
    this.lastFrameTime = performance.now();

    this.tick();
  }

  stop(): number {
    if (!this.isRunning) return this.elapsedTime;

    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    return this.elapsedTime;
  }

  private tick = () => {
    if (!this.isRunning) return;

    const now = performance.now();
    const deltaTime = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;

    // Convert real time to musical time (beats)
    const beatDuration = 60 / this.bpm;
    this.elapsedTime += deltaTime / beatDuration;

    // Notify all listeners
    this.callbacks.forEach((cb) => cb(this.elapsedTime));

    this.animationFrameId = requestAnimationFrame(this.tick);
  };

  getTime(): number {
    return this.elapsedTime;
  }

  getIsRunning(): boolean {
    return this.isRunning;
  }
}

export const globalClock = new Clock();
