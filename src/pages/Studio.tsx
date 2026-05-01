import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Square, Circle, Mic, Volume2, Save, Download, Plus, Trash2 } from 'lucide-react';

interface Track {
  id: string;
  name: string;
  color: string;
  volume: number;
  muted: boolean;
  solo: boolean;
  clips: Clip[];
}

interface Clip {
  id: string;
  trackId: string;
  startTime: number;
  duration: number;
  name: string;
  color: string;
  audioUrl?: string;
  fileName?: string;
  isRecording?: boolean;
}

interface StudioProject {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  tracks: Track[];
}

const STORAGE_KEY = 'studio-projects-v1';

const createDefaultTracks = (): Track[] => [
  {
    id: '1',
    name: 'Audio 1',
    color: 'bg-purple-500',
    volume: 100,
    muted: false,
    solo: false,
    clips: [],
  },
  {
    id: '2',
    name: 'Audio 2',
    color: 'bg-blue-500',
    volume: 100,
    muted: false,
    solo: false,
    clips: [],
  },
  {
    id: '3',
    name: 'Drums',
    color: 'bg-red-500',
    volume: 100,
    muted: false,
    solo: false,
    clips: [],
  },
  {
    id: '4',
    name: 'Bass',
    color: 'bg-green-500',
    volume: 100,
    muted: false,
    solo: false,
    clips: [],
  },
];

const loadProjects = (): StudioProject[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StudioProject[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveProjects = (projects: StudioProject[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
};

export default function Studio() {
  const [projects, setProjects] = useState<StudioProject[]>(() => loadProjects());
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [showProjectChooser, setShowProjectChooser] = useState(true);
  const [newProjectName, setNewProjectName] = useState('New Project');

  const [tracks, setTracks] = useState<Track[]>(createDefaultTracks());
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('New Project');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingDropTrackIdRef = useRef<string | null>(null);
  
  const timelineRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    let interval: number;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime(prev => prev + 0.1);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  useEffect(() => {
    if (activeProjectId) return;
    setShowProjectChooser(true);
  }, [activeProjectId]);

  useEffect(() => {
    if (!activeProjectId) return;
    setProjects((prev) => {
      const updated = prev.map((p) =>
        p.id === activeProjectId
          ? { ...p, name: projectName, tracks, updatedAt: new Date().toISOString() }
          : p
      );
      saveProjects(updated);
      return updated;
    });
  }, [activeProjectId, projectName, tracks]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        URL.createObjectURL(audioBlob);
        
        // Add clip to selected track
        if (selectedTrack) {
          const newClip: Clip = {
            id: Date.now().toString(),
            trackId: selectedTrack,
            startTime: currentTime,
            duration: 5, // Default 5 seconds
            name: `Recording ${Date.now()}`,
            color: tracks.find(t => t.id === selectedTrack)?.color || 'bg-gray-500'
          };

          setTracks(prev => prev.map(track => 
            track.id === selectedTrack 
              ? { ...track, clips: [...track.clips, newClip] }
              : track
          ));
        }
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const addTrack = () => {
    const colors = ['bg-yellow-500', 'bg-pink-500', 'bg-indigo-500', 'bg-orange-500'];
    const newTrack: Track = {
      id: Date.now().toString(),
      name: `Audio ${tracks.length + 1}`,
      color: colors[tracks.length % colors.length],
      volume: 100,
      muted: false,
      solo: false,
      clips: []
    };
    setTracks([...tracks, newTrack]);
  };

  const deleteTrack = (trackId: string) => {
    setTracks(tracks.filter(t => t.id !== trackId));
    if (selectedTrack === trackId) {
      setSelectedTrack(null);
    }
  };

  const toggleMute = (trackId: string) => {
    setTracks(tracks.map(track => 
      track.id === trackId ? { ...track, muted: !track.muted } : track
    ));
  };

  const toggleSolo = (trackId: string) => {
    setTracks(tracks.map(track => 
      track.id === trackId ? { ...track, solo: !track.solo } : track
    ));
  };

  const updateVolume = (trackId: string, volume: number) => {
    setTracks(tracks.map(track => 
      track.id === trackId ? { ...track, volume } : track
    ));
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms}`;
  };

  const createProject = () => {
    const now = new Date().toISOString();
    const id = Date.now().toString();
    const project: StudioProject = {
      id,
      name: newProjectName.trim() || 'New Project',
      createdAt: now,
      updatedAt: now,
      tracks: createDefaultTracks(),
    };
    const updated = [project, ...projects];
    setProjects(updated);
    saveProjects(updated);
    setActiveProjectId(id);
    setProjectName(project.name);
    setTracks(project.tracks);
    setSelectedTrack(null);
    setCurrentTime(0);
    setShowProjectChooser(false);
  };

  const openProject = (id: string) => {
    const project = projects.find((p) => p.id === id);
    if (!project) return;
    setActiveProjectId(project.id);
    setProjectName(project.name);
    setTracks(project.tracks);
    setSelectedTrack(null);
    setCurrentTime(0);
    setShowProjectChooser(false);
  };

  const handleAudioFilesForTrack = async (trackId: string, files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const audioFiles = fileArray.filter((f) => f.type.startsWith('audio/'));
    if (audioFiles.length === 0) return;

    const newClips: Clip[] = audioFiles.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      trackId,
      startTime: currentTime,
      duration: 5,
      name: file.name,
      fileName: file.name,
      audioUrl: URL.createObjectURL(file),
      color: tracks.find((t) => t.id === trackId)?.color || 'bg-gray-500',
    }));

    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, clips: [...t.clips, ...newClips] } : t))
    );

    await Promise.all(
      newClips.map(
        (clip) =>
          new Promise<void>((resolve) => {
            if (!clip.audioUrl) return resolve();
            const audio = new Audio();
            audio.src = clip.audioUrl;
            audio.onloadedmetadata = () => {
              if (Number.isFinite(audio.duration) && audio.duration > 0) {
                setTracks((prev) =>
                  prev.map((t) =>
                    t.id === trackId
                      ? {
                          ...t,
                          clips: t.clips.map((c) =>
                            c.id === clip.id ? { ...c, duration: audio.duration } : c
                          ),
                        }
                      : t
                  )
                );
              }
              resolve();
            };
            audio.onerror = () => resolve();
          })
      )
    );
  };

  const openFilePickerForTrack = (trackId: string) => {
    pendingDropTrackIdRef.current = trackId;
    fileInputRef.current?.click();
  };

  return (
    <div className="h-full flex flex-col bg-gray-900">
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        multiple
        className="hidden"
        onChange={async (e) => {
          const trackId = pendingDropTrackIdRef.current;
          if (!trackId) return;
          if (!e.target.files) return;
          await handleAudioFilesForTrack(trackId, e.target.files);
          e.target.value = '';
        }}
      />

      {showProjectChooser && (
        <div className="absolute inset-0 z-50 bg-gray-900/95 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-3xl bg-gray-800 border border-gray-700 rounded-2xl p-6">
            <div className="flex items-center justify-between gap-4 mb-6">
              <h1 className="text-2xl font-bold text-white">Студия</h1>
              {activeProjectId && (
                <button
                  onClick={() => setShowProjectChooser(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white"
                >
                  Назад
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-900/40 border border-gray-700 rounded-xl p-4">
                <h2 className="text-lg font-semibold text-white mb-3">Создать новый проект</h2>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-purple-500 focus:outline-none mb-3"
                  placeholder="Название проекта"
                />
                <button
                  onClick={createProject}
                  className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-white"
                >
                  Создать
                </button>
              </div>

              <div className="bg-gray-900/40 border border-gray-700 rounded-xl p-4">
                <h2 className="text-lg font-semibold text-white mb-3">Открыть существующий</h2>
                {projects.length === 0 ? (
                  <div className="text-gray-400 text-sm">Пока нет проектов</div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-auto pr-1">
                    {projects.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => openProject(p.id)}
                        className="w-full text-left px-3 py-2 rounded bg-gray-700/60 hover:bg-gray-700 border border-gray-600"
                      >
                        <div className="text-white font-medium">{p.name}</div>
                        <div className="text-gray-400 text-xs">{new Date(p.updatedAt).toLocaleString('ru-RU')}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="bg-gray-700 text-white px-3 py-1 rounded border border-gray-600 focus:border-purple-500 focus:outline-none"
            />
            <span className="text-gray-400 text-sm">BPM: 120</span>
            <span className="text-gray-400 text-sm">4/4</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowProjectChooser(true)}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm"
            >
              Проект
            </button>
            <button className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-white">
              <Save size={16} />
            </button>
            <button className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-white">
              <Download size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 flex">
        {/* Timeline ruler */}
        <div className="w-32 bg-gray-800 border-r border-gray-700 p-4">
          <div className="text-xs text-gray-400 space-y-1">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="flex justify-between">
                <span>{formatTime(i * 4)}</span>
                <span>{i * 4}s</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tracks */}
        <div className="flex-1 overflow-auto">
          <div ref={timelineRef} className="relative bg-gray-850 min-h-full">
            {/* Current time indicator */}
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
              style={{ left: `${(currentTime / 20) * 100}%` }}
            />
            
            {/* Playhead */}
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-green-500 z-10"
              style={{ left: `${(currentTime / 20) * 100}%` }}
            />

            {/* Tracks and clips */}
            {tracks.map((track) => (
              <div
                key={track.id}
                className={`h-20 border-b border-gray-700 relative cursor-pointer ${
                  selectedTrack === track.id ? 'bg-gray-800/50' : ''
                }`}
                onClick={() => setSelectedTrack(track.id)}
                onDragOver={(e) => {
                  e.preventDefault();
                }}
                onDrop={async (e) => {
                  e.preventDefault();
                  await handleAudioFilesForTrack(track.id, e.dataTransfer.files);
                }}
              >
                {/* Track name */}
                <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs text-white font-medium">
                  {track.name}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openFilePickerForTrack(track.id);
                  }}
                  className="absolute right-2 top-2 px-2 py-1 bg-gray-700/80 hover:bg-gray-700 rounded text-white text-xs"
                >
                  Add audio
                </button>
                
                {/* Clips */}
                {track.clips.map((clip) => (
                  <div
                    key={clip.id}
                    className={`absolute top-2 bottom-2 ${clip.color} rounded flex items-center justify-center text-white text-xs font-medium cursor-move`}
                    style={{
                      left: `${(clip.startTime / 20) * 100}%`,
                      width: `${(clip.duration / 20) * 100}%`
                    }}
                  >
                    {clip.name}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Track controls */}
      <div className="bg-gray-800 border-t border-gray-700 p-4">
        <div className="space-y-2">
          {tracks.map((track) => (
            <div key={track.id} className="flex items-center gap-4 bg-gray-700/50 rounded p-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: track.color.replace('bg-', '#').replace('500', '500') }} />
              
              <input
                type="text"
                value={track.name}
                onChange={(e) => {
                  setTracks(tracks.map(t => 
                    t.id === track.id ? { ...t, name: e.target.value } : t
                  ));
                }}
                className="bg-gray-600 text-white px-2 py-1 rounded text-sm w-24"
              />
              
              <div className="flex items-center gap-2">
                <Volume2 size={16} className="text-gray-400" />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={track.volume}
                  onChange={(e) => updateVolume(track.id, parseInt(e.target.value))}
                  className="w-20"
                />
                <span className="text-gray-400 text-xs w-8">{track.volume}%</span>
              </div>
              
              <button
                onClick={() => toggleMute(track.id)}
                className={`px-2 py-1 rounded text-xs ${
                  track.muted ? 'bg-red-600 text-white' : 'bg-gray-600 text-gray-300'
                }`}
              >
                M
              </button>
              
              <button
                onClick={() => toggleSolo(track.id)}
                className={`px-2 py-1 rounded text-xs ${
                  track.solo ? 'bg-yellow-600 text-white' : 'bg-gray-600 text-gray-300'
                }`}
              >
                S
              </button>
              
              {tracks.length > 1 && (
                <button
                  onClick={() => deleteTrack(track.id)}
                  className="p-1 text-red-400 hover:text-red-300"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
        
        <button
          onClick={addTrack}
          className="mt-2 flex items-center gap-2 px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-white text-sm"
        >
          <Plus size={16} />
          Add Track
        </button>
      </div>

      {/* Transport controls */}
      <div className="bg-gray-800 border-t border-gray-700 p-4">
        <div className="flex justify-center items-center gap-4">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-3 bg-green-600 hover:bg-green-700 rounded-full text-white"
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>
          
          <button
            onClick={() => setCurrentTime(0)}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-white"
          >
            <Square size={16} />
          </button>
          
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={!selectedTrack}
            className={`p-3 rounded-full text-white ${
              isRecording 
                ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
                : selectedTrack 
                  ? 'bg-gray-700 hover:bg-gray-600' 
                  : 'bg-gray-600 cursor-not-allowed opacity-50'
            }`}
          >
            <Mic size={20} />
          </button>
          
          <div className="flex items-center gap-2 bg-gray-700 px-3 py-2 rounded">
            <Circle size={12} className={isRecording ? 'text-red-500' : 'text-gray-400'} />
            <span className="text-white font-mono text-sm">{formatTime(currentTime)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
