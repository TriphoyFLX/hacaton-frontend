import { useState, useRef } from 'react';
import { useStudioStore } from '../store/useStudioStore';
import { AudioLoader } from '../engine/audioLoader';
import { Upload, Volume2 } from 'lucide-react';

export function AudioSampleLoader() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioLoader = useRef(new AudioLoader());
  
  const { addChannel } = useStudioStore();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    for (const file of files) {
      if (!file.type.startsWith('audio/')) {
        setError(`${file.name} is not an audio file`);
        continue;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Load audio buffer
        const audioBuffer = await audioLoader.current.loadAudioFile(file);
        
        // Create new channel
        addChannel({
          name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
          type: 'sample',
          color: '#' + Math.floor(Math.random()*16777215).toString(16),
          muted: false,
          solo: false,
          volume: 0.8,
          pan: 0,
          stepCount: 16,
        });

        // Load sample to channel
        const store = useStudioStore.getState();
        const channel = store.channels[store.channels.length - 1]; // Get the newly added channel
        
        if (channel) {
          // Store audio buffer in channel for playback
          store.updateChannel(channel.id, { audioBuffer });
          
          console.log(`✅ Loaded sample: ${file.name} to channel ${channel.name}`);
        }

      } catch (err) {
        console.error('Failed to load sample:', err);
        setError(`Failed to load ${file.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    }

    // Clear input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  
  return (
    <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
      <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
        <Volume2 className="w-4 h-4" />
        Load Audio Samples
      </h3>

      {error && (
        <div className="mb-3 p-2 bg-red-500/20 border border-red-500/50 rounded text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.wav,.mp3,.ogg,.flac,.m4a"
            multiple
            onChange={handleFileUpload}
            className="hidden"
            id="audio-file-input"
          />
          <label
            htmlFor="audio-file-input"
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg cursor-pointer transition-colors ${
              isLoading
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            <Upload className="w-4 h-4" />
            {isLoading ? 'Loading...' : 'Choose Audio Files'}
          </label>
        </div>

        <div className="text-xs text-gray-500">
          Supported formats: WAV, MP3, OGG, FLAC, M4A
        </div>

        {/* Quick sample buttons */}
        <div className="pt-2 border-t border-gray-700">
          <div className="text-xs text-gray-400 mb-2">Quick Samples:</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 transition-colors"
            >
              🎹 Piano
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 transition-colors"
            >
              🥁 Drums
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 transition-colors"
            >
              🎸 Guitar
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 transition-colors"
            >
              🎺 Brass
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
