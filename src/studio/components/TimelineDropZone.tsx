import { useState } from 'react';
import { Upload, Music } from 'lucide-react';

interface TimelineDropZoneProps {
  isActive: boolean;
  onDrop: (files: File[]) => void;
}

export function TimelineDropZone({ isActive, onDrop }: TimelineDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const audioFiles = files.filter(file => file.type.startsWith('audio/'));
    
    if (audioFiles.length > 0) {
      onDrop(audioFiles);
    }
  };

  if (!isActive) return null;

  return (
    <div
      className={`absolute inset-0 pointer-events-none transition-opacity duration-200 ${
        isDragOver ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        className="absolute inset-0 bg-blue-500/10 border-2 border-dashed border-blue-500 rounded-lg pointer-events-auto"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex items-center justify-center h-full">
          <div className="text-center p-8">
            <Upload className="w-12 h-12 text-blue-500 mx-auto mb-4" />
            <div className="text-blue-600 font-semibold text-lg mb-2">
              Drop Audio Files Here
            </div>
            <div className="text-blue-500 text-sm">
              WAV, MP3, OGG, FLAC, M4A
            </div>
            <div className="flex items-center justify-center gap-2 mt-4 text-blue-400">
              <Music className="w-4 h-4" />
              <span className="text-xs">
                Files will be placed on the timeline at drop position
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
