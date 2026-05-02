import { useCallback, useEffect, useRef } from "react";
import { useStudioStore } from "../store/useStudioStore";
import { globalClock } from "./clock";
import { globalScheduler } from "./scheduler";

export function useTransport() {
  const store = useStudioStore();
  const { playback, ui } = store;
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Sync BPM with engine
  useEffect(() => {
    globalClock.setBpm(playback.bpm);
    globalScheduler.setBpm(playback.bpm);
  }, [playback.bpm]);

  // Subscribe to clock updates
  useEffect(() => {
    // Cleanup previous subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    // Track if we've triggered loop end for this cycle
    let loopTriggered = false;
    const SCHEDULER_LOOKAHEAD = 0.1; // must match scheduler.ts LOOK_AHEAD

    // Subscribe to clock ticks
    unsubscribeRef.current = globalClock.onTick((time) => {
      // Handle loop - trigger when we pass loopEnd
      if (ui.loopEnabled && !loopTriggered && time >= ui.loopEnd) {
        loopTriggered = true;
      }

      // Restart only after:
      // 1. We've passed loopEnd
      // 2. Waited past loopEnd + scheduler look-ahead to let all scheduled notes finish
      // 3. Reached a beat boundary for clean restart
      if (loopTriggered && time >= ui.loopEnd + SCHEDULER_LOOKAHEAD + 0.05) {
        const beatFraction = time % 1;
        // Wait for beat boundary (within first 10% of beat)
        if (beatFraction < 0.1 || beatFraction > 0.9) {
          loopTriggered = false;
          store.setCurrentTime(ui.loopStart);
          globalClock.stop();
          globalClock.start(ui.loopStart);
          globalScheduler.stop();
          globalScheduler.start(ui.loopStart);
          return;
        }
      }

      store.setCurrentTime(time);
    });

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [store, ui.loopEnabled, ui.loopStart, ui.loopEnd]);

  const play = useCallback(() => {
    if (!playback.isPlaying) {
      store.setIsPlaying(true);
      globalClock.start(playback.currentTime);
      globalScheduler.start(playback.currentTime);
    }
  }, [playback.isPlaying, playback.currentTime, store]);

  const pause = useCallback(() => {
    if (playback.isPlaying) {
      const currentTime = globalClock.stop();
      globalScheduler.stop();
      store.setIsPlaying(false);
      store.setCurrentTime(currentTime);
    }
  }, [playback.isPlaying, store]);

  const stop = useCallback(() => {
    globalClock.stop();
    globalScheduler.stop();
    store.setIsPlaying(false);
    store.resetPlayback();
  }, [store]);

  const seek = useCallback((time: number) => {
    const wasPlaying = playback.isPlaying;
    
    if (wasPlaying) {
      globalClock.stop();
      globalScheduler.stop();
    }

    store.setCurrentTime(Math.max(0, time));

    if (wasPlaying) {
      globalClock.start(time);
      globalScheduler.start(time);
    }
  }, [playback.isPlaying, store]);

  const togglePlay = useCallback(() => {
    if (playback.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [playback.isPlaying, play, pause]);

  return {
    isPlaying: playback.isPlaying,
    currentTime: playback.currentTime,
    bpm: playback.bpm,
    play,
    pause,
    stop,
    seek,
    togglePlay,
  };
}
