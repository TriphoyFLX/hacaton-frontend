import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Square, Plus, Trash2, Music, Upload, Scissors, Copy, GripHorizontal, Clock } from 'lucide-react';

// ==================== ТИПЫ ====================
interface DrumTrack {
  id: string;
  name: string;
  color: string;
  steps: boolean[];
  volume: number;
  audioBuffer: AudioBuffer | null;
  fileName: string;
}

interface PlaylistClip {
  id: string;
  trackId: string;
  name: string;
  startTime: number; // в секундах
  duration: number; // в секундах
  color: string;
  audioBuffer?: AudioBuffer;
  loopEnabled: boolean;
}

// ==================== АУДИО ДВИЖОК ====================
class AudioEngine {
  private ctx: AudioContext;
  private masterGain: GainNode;
  private tracks: Map<string, { buffer: AudioBuffer; gain: GainNode }> = new Map();
  private activeSources: AudioBufferSourceNode[] = [];

  constructor() {
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this.masterGain.gain.value = 0.8;
  }

  getContext(): AudioContext {
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  async initContext(): Promise<void> {
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  async loadBuffer(file: File): Promise<AudioBuffer> {
    const arrayBuffer = await file.arrayBuffer();
    return await this.ctx.decodeAudioData(arrayBuffer);
  }

  addTrack(trackId: string, buffer: AudioBuffer) {
    const existing = this.tracks.get(trackId);
    if (existing) {
      existing.gain.disconnect();
    }
    const gain = this.ctx.createGain();
    gain.connect(this.masterGain);
    gain.gain.value = 1;
    this.tracks.set(trackId, { buffer, gain });
  }

  removeTrack(trackId: string) {
    const track = this.tracks.get(trackId);
    if (track) {
      track.gain.disconnect();
      this.tracks.delete(trackId);
    }
  }

  setTrackVolume(trackId: string, volume: number) {
    const track = this.tracks.get(trackId);
    if (track) {
      track.gain.gain.value = volume;
    }
  }

  playSound(trackId: string, offset: number = 0, duration?: number): AudioBufferSourceNode | null {
    const track = this.tracks.get(trackId);
    if (!track || !track.buffer) return null;

    try {
      const source = this.ctx.createBufferSource();
      source.buffer = track.buffer;
      source.connect(track.gain);
      
      if (duration) {
        source.start(this.ctx.currentTime, offset, duration);
      } else {
        source.start(this.ctx.currentTime, offset);
      }
      
      this.activeSources.push(source);
      source.onended = () => {
        const index = this.activeSources.indexOf(source);
        if (index > -1) this.activeSources.splice(index, 1);
      };
      
      return source;
    } catch (error) {
      console.error('Error playing sound:', error);
      return null;
    }
  }

  playBuffer(buffer: AudioBuffer, offset: number = 0, duration?: number): AudioBufferSourceNode | null {
    try {
      const source = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();
      source.buffer = buffer;
      source.connect(gain);
      gain.connect(this.masterGain);
      
      if (duration) {
        source.start(this.ctx.currentTime, offset, duration);
      } else {
        source.start(this.ctx.currentTime, offset);
      }
      
      this.activeSources.push(source);
      source.onended = () => {
        const index = this.activeSources.indexOf(source);
        if (index > -1) this.activeSources.splice(index, 1);
      };
      
      return source;
    } catch (error) {
      console.error('Error playing buffer:', error);
      return null;
    }
  }

  // НАСТОЯЩИЙ СТОП - обрывает все звуки мгновенно
  stopAllSounds(): void {
    this.activeSources.forEach(source => {
      try {
        source.stop(0);
        source.disconnect();
      } catch (e) {
        // Игнорируем ошибки уже остановленных источников
      }
    });
    this.activeSources = [];
  }

  setMasterVolume(volume: number) {
    this.masterGain.gain.value = volume;
  }
}

// ==================== ГЛАВНЫЙ КОМПОНЕНТ ====================
export default function Studio() {
  const [audioEngine] = useState(() => new AudioEngine());
  const [tracks, setTracks] = useState<DrumTrack[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [bpm, setBpm] = useState(140);
  const [stepCount, setStepCount] = useState(16);
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);
  const [playlistClips, setPlaylistClips] = useState<PlaylistClip[]>([]);
  const [playlistDuration, setPlaylistDuration] = useState(60); // 60 секунд по умолчанию, растягивается
  const [draggingClipId, setDraggingClipId] = useState<string | null>(null);
  const [trimmingClipId, setTrimmingClipId] = useState<string | null>(null);
  const [trimEdge, setTrimEdge] = useState<'left' | 'right' | null>(null);
  
  const sequencerRef = useRef<number | null>(null);
  const playlistSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const isPlayingRef = useRef(false);
  const currentStepRef = useRef(0);
  const bpmRef = useRef(140);
  const stepCountRef = useRef(16);
  const tracksRef = useRef<DrumTrack[]>([]);

  // Синхронизация refs
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { currentStepRef.current = currentStep; }, [currentStep]);
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { stepCountRef.current = stepCount; }, [stepCount]);
  useEffect(() => { tracksRef.current = tracks; }, [tracks]);

  // Авторасширение плейлиста
  useEffect(() => {
    const maxEnd = playlistClips.reduce((max, clip) => {
      const end = clip.startTime + clip.duration;
      return end > max ? end : max;
    }, 0);
    if (maxEnd > playlistDuration - 10) {
      setPlaylistDuration(maxEnd + 30); // Добавляем 30 секунд запаса
    }
  }, [playlistClips]);

  // ==================== СЕКВЕНСОР CHANNEL RACK ====================
  useEffect(() => {
    if (isPlaying) {
      const stepDuration = 60 / bpm / 4;
      
      const runSequencer = () => {
        if (!isPlayingRef.current) return;
        
        const step = currentStepRef.current;
        const tracks = tracksRef.current;
        
        tracks.forEach(track => {
          if (track.steps[step] && track.audioBuffer) {
            audioEngine.playSound(track.id);
          }
        });
        
        const nextStep = (step + 1) % stepCountRef.current;
        currentStepRef.current = nextStep;
        setCurrentStep(nextStep);
        
        sequencerRef.current = window.setTimeout(runSequencer, stepDuration * 1000);
      };
      
      runSequencer();
      
      return () => {
        if (sequencerRef.current) {
          clearTimeout(sequencerRef.current);
          sequencerRef.current = null;
        }
      };
    } else {
      if (sequencerRef.current) {
        clearTimeout(sequencerRef.current);
        sequencerRef.current = null;
      }
    }
  }, [isPlaying, bpm, audioEngine]);

  // ==================== УПРАВЛЕНИЕ ТРЕКАМИ ====================
  const addTrack = async (file?: File) => {
    const trackId = `track-${Date.now()}-${Math.random()}`;
    const newTrack: DrumTrack = {
      id: trackId,
      name: file ? file.name.replace(/\.[^/.]+$/, '') : `Track ${tracks.length + 1}`,
      color: `hsl(${Math.random() * 360}, 70%, 60%)`,
      steps: new Array(stepCount).fill(false),
      volume: 0.8,
      audioBuffer: null,
      fileName: file?.name || ''
    };

    if (file) {
      try {
        const buffer = await audioEngine.loadBuffer(file);
        audioEngine.addTrack(trackId, buffer);
        newTrack.audioBuffer = buffer;
      } catch (error) {
        console.error('Failed to load audio file:', error);
      }
    }

    setTracks(prev => [...prev, newTrack]);
  };

  const removeTrack = (trackId: string) => {
    audioEngine.removeTrack(trackId);
    setTracks(prev => prev.filter(t => t.id !== trackId));
    if (selectedTrack === trackId) setSelectedTrack(null);
  };

  const toggleStep = (trackId: string, stepIndex: number) => {
    setTracks(prev => prev.map(track => {
      if (track.id !== trackId) return track;
      const newSteps = [...track.steps];
      newSteps[stepIndex] = !newSteps[stepIndex];
      return { ...track, steps: newSteps };
    }));
  };

  const updateTrackVolume = (trackId: string, volume: number) => {
    audioEngine.setTrackVolume(trackId, volume);
    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, volume } : t));
  };

  // ==================== ПЛЕЙЛИСТ ====================
  const addClipToPlaylist = (trackId: string, startTime?: number) => {
    const track = tracks.find(t => t.id === trackId);
    if (!track?.audioBuffer) return;
    
    const newClip: PlaylistClip = {
      id: `clip-${Date.now()}`,
      trackId,
      name: track.name,
      startTime: startTime || 0,
      duration: track.audioBuffer.duration,
      color: track.color,
      audioBuffer: track.audioBuffer,
      loopEnabled: false
    };
    
    setPlaylistClips(prev => [...prev, newClip]);
  };

  const handleDropOnPlaylist = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const playlistRect = e.currentTarget.getBoundingClientRect();
    const dropTime = Math.max(0, (e.clientX - playlistRect.left) / 50); // 50px = 1 секунда
    
    // Проверяем, это файл или трек
    const trackData = e.dataTransfer.getData('track');
    const files = e.dataTransfer.files;
    
    if (trackData) {
      try {
        const trackId = JSON.parse(trackData).id;
        addClipToPlaylist(trackId, dropTime);
      } catch (error) {
        console.error('Failed to parse track data:', error);
      }
    } else if (files.length > 0) {
      for (const file of Array.from(files)) {
        if (file.type.startsWith('audio/')) {
          try {
            const buffer = await audioEngine.loadBuffer(file);
            const newClip: PlaylistClip = {
              id: `clip-${Date.now()}-${Math.random()}`,
              trackId: 'playlist',
              name: file.name.replace(/\.[^/.]+$/, ''),
              startTime: dropTime,
              duration: buffer.duration,
              color: `hsl(${Math.random() * 360}, 70%, 60%)`,
              audioBuffer: buffer,
              loopEnabled: false
            };
            setPlaylistClips(prev => [...prev, newClip]);
          } catch (error) {
            console.error('Failed to load audio file:', error);
          }
        }
      }
    }
  }, [tracks, audioEngine]);

  const handleClipDragStart = (e: React.DragEvent, clipId: string) => {
    e.stopPropagation();
    setDraggingClipId(clipId);
    e.dataTransfer.setData('clip', clipId);
  };

  const handleClipDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggingClipId) return;
    
    const playlistRect = e.currentTarget.getBoundingClientRect();
    const newStartTime = Math.max(0, (e.clientX - playlistRect.left) / 50);
    
    setPlaylistClips(prev => prev.map(clip => 
      clip.id === draggingClipId ? { ...clip, startTime: newStartTime } : clip
    ));
    setDraggingClipId(null);
  };

  const handleTrimStart = (e: React.MouseEvent, clipId: string, edge: 'left' | 'right') => {
    e.stopPropagation();
    e.preventDefault();
    setTrimmingClipId(clipId);
    setTrimEdge(edge);
  };

  useEffect(() => {
    if (!trimmingClipId || !trimEdge) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const playlist = document.getElementById('playlist-area');
      if (!playlist) return;
      
      const rect = playlist.getBoundingClientRect();
      const mouseTime = (e.clientX - rect.left) / 50;
      
      setPlaylistClips(prev => prev.map(clip => {
        if (clip.id !== trimmingClipId) return clip;
        
        if (trimEdge === 'left') {
          const newStart = Math.max(0, mouseTime);
          const newDuration = clip.duration + (clip.startTime - newStart);
          if (newDuration < 0.1) return clip;
          return { ...clip, startTime: newStart, duration: newDuration };
        } else {
          const newDuration = Math.max(0.1, mouseTime - clip.startTime);
          return { ...clip, duration: newDuration };
        }
      }));
    };
    
    const handleMouseUp = () => {
      setTrimmingClipId(null);
      setTrimEdge(null);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [trimmingClipId, trimEdge]);

  const deleteClip = (clipId: string) => {
    setPlaylistClips(prev => prev.filter(c => c.id !== clipId));
  };

  // ==================== УПРАВЛЕНИЕ ВОСПРОИЗВЕДЕНИЕМ ====================
  const togglePlayback = async () => {
    await audioEngine.initContext();
    
    if (isPlaying) {
      // ПАУЗА
      setIsPlaying(false);
      if (sequencerRef.current) {
        clearTimeout(sequencerRef.current);
      }
      playlistSourcesRef.current.forEach(source => {
        try { source.stop(); } catch (e) {}
      });
      playlistSourcesRef.current = [];
    } else {
      // ВОСПРОИЗВЕДЕНИЕ
      setIsPlaying(true);
      
      // Запускаем клипы из плейлиста
      playlistClips.forEach(clip => {
        if (clip.audioBuffer) {
          const source = audioEngine.playBuffer(clip.audioBuffer, 0, clip.duration);
          if (source && clip.loopEnabled) {
            source.onended = () => {
              if (isPlayingRef.current) {
                const newSource = audioEngine.playBuffer(clip.audioBuffer!, 0, clip.duration);
                if (newSource) playlistSourcesRef.current.push(newSource);
              }
            };
          }
          if (source) playlistSourcesRef.current.push(source);
        }
      });
    }
  };

  const stop = () => {
    // НАСТОЯЩИЙ СТОП
    audioEngine.stopAllSounds();
    playlistSourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    playlistSourcesRef.current = [];
    
    setIsPlaying(false);
    setCurrentStep(0);
    
    if (sequencerRef.current) {
      clearTimeout(sequencerRef.current);
      sequencerRef.current = null;
    }
  };

  // ==================== ОБРАБОТЧИКИ ФАЙЛОВ ====================
  const handleFileDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      if (file.type.startsWith('audio/')) {
        await addTrack(file);
      }
    }
  }, [stepCount]);

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      await addTrack(file);
    }
    e.target.value = '';
  }, [stepCount]);

  const handleDropOnTrack = useCallback(async (e: React.DragEvent, trackId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    
    const file = files[0];
    if (!file.type.startsWith('audio/')) return;
    
    try {
      const buffer = await audioEngine.loadBuffer(file);
      audioEngine.addTrack(trackId, buffer);
      audioEngine.setTrackVolume(trackId, 0.8);
      
      setTracks(prev => prev.map(t => 
        t.id === trackId ? { 
          ...t, 
          audioBuffer: buffer,
          name: file.name.replace(/\.[^/.]+$/, ''),
          fileName: file.name
        } : t
      ));
    } catch (error) {
      console.error('Failed to load audio file:', error);
    }
  }, [audioEngine]);

  // ==================== UI ====================
  const pixelsPerSecond = 50; // Масштаб плейлиста

  return (
    <div className="h-screen bg-gradient-to-br from-[#0a0a1a] to-[#1a1a3e] text-white flex flex-col">
      {/* ХЕДЕР */}
      <div className="bg-black/40 backdrop-blur-sm border-b border-white/10 px-6 py-3 flex items-center justify-between">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          🎹 Drum Sequencer
        </h1>
        <span className="text-gray-400 text-sm">Drop audio files anywhere</span>
      </div>

      {/* ТРАНСПОРТ */}
      <div className="bg-black/30 border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between max-w-full">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlayback}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all transform hover:scale-105 ${
                isPlaying 
                  ? 'bg-gradient-to-br from-orange-500 to-red-500 shadow-lg shadow-orange-500/30' 
                  : 'bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg shadow-green-500/30'
              }`}
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>
            
            <button
              onClick={stop}
              className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-all shadow-lg shadow-red-600/30"
              title="Stop (обрывает всё)"
            >
              <Square size={20} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-400">BPM</label>
            <input
              type="number"
              value={bpm}
              onChange={(e) => setBpm(Math.max(40, Math.min(300, parseInt(e.target.value) || 140)))}
              className="w-20 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-center text-lg font-bold"
            />
            <div className="flex gap-1">
              <button onClick={() => setBpm(prev => Math.max(40, prev - 5))} className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded">-5</button>
              <button onClick={() => setBpm(prev => Math.min(300, prev + 5))} className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded">+5</button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Steps</span>
            {[16, 32, 64].map(count => (
              <button
                key={count}
                onClick={() => {
                  setStepCount(count);
                  setTracks(prev => prev.map(t => ({
                    ...t,
                    steps: [...t.steps.slice(0, count), ...new Array(Math.max(0, count - t.steps.length)).fill(false)]
                  })));
                }}
                className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                  stepCount === count ? 'bg-purple-600 shadow-lg shadow-purple-600/30' : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                {count}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CHANNEL RACK */}
      <div className="px-6 py-4 overflow-auto" style={{ maxHeight: '40vh' }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Channel Rack</h2>
          <button
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'audio/*';
              input.multiple = true;
              input.onchange = (e) => handleFileInput(e as any);
              input.click();
            }}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium flex items-center gap-2"
          >
            <Plus size={16} /> Add Track
          </button>
        </div>

        <div className="space-y-1">
          <div className="flex items-stretch mb-1">
            <div className="w-64 shrink-0" />
            <div className="flex-1 flex gap-0">
              {Array.from({ length: stepCount }).map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 text-center text-xs ${i % 4 === 0 ? 'text-purple-300' : 'text-gray-600'} ${currentStep === i && isPlaying ? 'bg-purple-500/30' : ''}`}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>

          {tracks.map(track => (
            <div
              key={track.id}
              className={`flex items-stretch rounded overflow-hidden ${selectedTrack === track.id ? 'ring-2 ring-purple-400' : ''}`}
              onClick={() => setSelectedTrack(track.id)}
              onDrop={(e) => handleDropOnTrack(e, track.id)}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('track', JSON.stringify({ id: track.id, name: track.name }));
              }}
            >
              <div className="w-64 bg-white/5 p-2 flex items-center gap-2 shrink-0 border-l-4" style={{ borderLeftColor: track.color }}>
                <GripHorizontal size={14} className="text-gray-500 cursor-move" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{track.name}</div>
                  <div className="text-xs text-gray-500">{track.fileName || 'No sample'}</div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); track.audioBuffer && audioEngine.playSound(track.id); }}
                  className="p-1 hover:bg-white/10 rounded"
                >
                  <Music size={14} />
                </button>
                <input
                  type="range" min="0" max="100" value={track.volume * 100}
                  onChange={(e) => { e.stopPropagation(); updateTrackVolume(track.id, parseInt(e.target.value) / 100); }}
                  className="w-16"
                />
                <button
                  onClick={(e) => { e.stopPropagation(); removeTrack(track.id); }}
                  className="p-1 hover:bg-red-500/30 rounded text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="flex-1 flex gap-0 bg-black/20">
                {track.steps.slice(0, stepCount).map((active, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); toggleStep(track.id, i); }}
                    className={`flex-1 min-h-[36px] transition-all ${
                      active ? 'bg-purple-500/80' : 'bg-white/5 hover:bg-white/10'
                    } ${currentStep === i && isPlaying ? 'ring-2 ring-yellow-400' : ''} ${i % 4 === 0 && !active ? 'bg-white/10' : ''}`}
                  />
                ))}
              </div>
            </div>
          ))}

          {tracks.length === 0 && (
            <div
              className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-purple-400/50 transition-colors cursor-pointer"
              onDrop={handleFileDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <Upload size={32} className="mx-auto mb-2 text-gray-500" />
              <p className="text-sm">Drop audio files here to create tracks</p>
            </div>
          )}
        </div>
      </div>

      {/* ПЛЕЙЛИСТ - БЕСКОНЕЧНЫЙ */}
      <div className="flex-1 px-6 py-4 overflow-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Playlist</h2>
          <span className="text-xs text-gray-500">Перетаскивай треки и файлы сюда • Тяни за края для обрезки</span>
        </div>

        <div
          id="playlist-area"
          className="relative bg-black/20 rounded-xl overflow-auto"
          style={{ minHeight: '200px' }}
          onDrop={handleDropOnPlaylist}
          onDragOver={(e) => e.preventDefault()}
        >
          {/* Временная шкала */}
          <div className="sticky top-0 bg-black/40 h-6 flex border-b border-white/10 z-10">
            {Array.from({ length: Math.ceil(playlistDuration / 5) }).map((_, i) => (
              <div key={i} className="flex-none" style={{ width: `${5 * pixelsPerSecond}px` }}>
                <div className="text-xs text-gray-500 pl-1">{i * 5}s</div>
              </div>
            ))}
          </div>

          {/* Контент плейлиста */}
          <div
            className="relative"
            style={{ width: `${playlistDuration * pixelsPerSecond}px`, minHeight: '150px' }}
            onDrop={handleClipDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            {/* Сетка */}
            {Array.from({ length: Math.ceil(playlistDuration) }).map((_, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 border-r border-white/5"
                style={{ left: `${i * pixelsPerSecond}px` }}
              />
            ))}

            {/* Клипы */}
            {playlistClips.map(clip => (
              <div
                key={clip.id}
                className="absolute top-2 h-12 rounded border-2 cursor-move group transition-colors"
                style={{
                  left: `${clip.startTime * pixelsPerSecond}px`,
                  width: `${Math.max(clip.duration * pixelsPerSecond, 20)}px`,
                  backgroundColor: clip.color + '30',
                  borderColor: clip.color
                }}
                draggable
                onDragStart={(e) => handleClipDragStart(e, clip.id)}
                onClick={() => {
                  // Предпрослушивание при клике
                  if (clip.audioBuffer) {
                    audioEngine.stopAllSounds();
                    audioEngine.playBuffer(clip.audioBuffer);
                  }
                }}
              >
                {/* Ручка обрезки слева */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-white/20 z-10"
                  onMouseDown={(e) => handleTrimStart(e, clip.id, 'left')}
                />
                
                <div className="flex items-center justify-center h-full text-xs px-2 truncate">
                  <span className="truncate">{clip.name}</span>
                </div>
                
                {/* Ручка обрезки справа */}
                <div
                  className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-white/20 z-10"
                  onMouseDown={(e) => handleTrimStart(e, clip.id, 'right')}
                />

                {/* Кнопка удаления */}
                <button
                  onClick={(e) => { e.stopPropagation(); deleteClip(clip.id); }}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            ))}

            {/* Индикатор дроп-зоны */}
            {tracks.length === 0 && playlistClips.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                <p>Перетащи треки или аудиофайлы сюда</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* СТАТУС БАР */}
      <div className="bg-black/40 border-t border-white/10 px-6 py-2 flex items-center justify-between text-xs text-gray-500">
        <span>{tracks.length} tracks • {stepCount} steps • {bpm} BPM • {playlistClips.length} clips</span>
        <span>{isPlaying ? '▶ Playing' : '⏸ Stopped'} • Step: {currentStep + 1}/{stepCount}</span>
      </div>
    </div>
  );
}