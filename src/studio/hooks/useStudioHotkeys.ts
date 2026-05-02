import { useEffect } from 'react';
import { useStudioStore } from '../store/useStudioStore';

export function useStudioHotkeys() {
  const { 
    setTool, 
    setIsPlaying, 
    playback,
    setZoom,
    openChannelRack, 
    closeChannelRack,
    ui,
    openPianoRoll,
    closePianoRoll
  } = useStudioStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger hotkeys when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Playback controls
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(!playback.isPlaying);
      }

      // Tool selection
      if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        setTool('select');
      }
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        setTool('draw');
      }
      if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        setTool('erase');
      }

      // Zoom controls
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          setZoom(Math.min(ui.zoom * 1.2, 4));
        }
        if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          setZoom(Math.max(ui.zoom / 1.2, 0.25));
        }
        if (e.key === '0') {
          e.preventDefault();
          setZoom(1);
        }
      }

      // Channel Rack toggle
      if (e.key === 'Tab') {
        e.preventDefault();
        if (ui.isChannelRackOpen) {
          closeChannelRack();
        } else {
          openChannelRack();
        }
      }

      // FL Studio Function Keys
      if (e.key === 'F5') {
        e.preventDefault();
        // Focus on Playlist/Timeline
        const timelineElement = document.querySelector('[data-timeline="true"]');
        if (timelineElement) {
          (timelineElement as HTMLElement).focus();
        }
      }

      if (e.key === 'F6') {
        e.preventDefault();
        // Toggle Channel Rack
        if (ui.isChannelRackOpen) {
          closeChannelRack();
        } else {
          openChannelRack();
        }
      }

      if (e.key === 'F7') {
        e.preventDefault();
        // Open Piano Roll for active clip
        if (ui.selectedClipId) {
          openPianoRoll(ui.selectedClipId);
        } else {
          // If no clip selected, close piano roll
          closePianoRoll();
        }
      }

      if (e.key === 'F9') {
        e.preventDefault();
        // Toggle Mixer (would need mixer state)
        const mixerElement = document.querySelector('[data-mixer="true"]');
        if (mixerElement) {
          (mixerElement as HTMLElement).classList.toggle('hidden');
        }
      }

      // Additional FL Studio hotkeys
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'b') {
          e.preventDefault();
          setTool('select'); // Brush tool equivalent
        }
        if (e.key === 'n') {
          e.preventDefault();
          setTool('draw'); // Pencil tool equivalent
        }
      }

      // Number keys for quick tool switching
      if (e.key === '1') {
        e.preventDefault();
        setTool('select');
      }
      if (e.key === '2') {
        e.preventDefault();
        setTool('draw');
      }
      if (e.key === '3') {
        e.preventDefault();
        setTool('erase');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setTool, setIsPlaying, playback.isPlaying, setZoom, openChannelRack, closeChannelRack, ui.isChannelRackOpen, openPianoRoll, closePianoRoll, ui.selectedClipId, ui.zoom]);
}
