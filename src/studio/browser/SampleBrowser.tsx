import { useState, useRef } from 'react';
import { useStudioStore } from '../store/useStudioStore';
import { Folder, File, Play, Upload, Search, ChevronDown, ChevronRight } from 'lucide-react';

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileNode[];
  url?: string;
}

// Simulated file tree structure
const mockFileTree: FileNode[] = [
  {
    name: 'sounds',
    type: 'folder',
    path: '/sounds',
    children: [
      {
        name: 'drums',
        type: 'folder',
        path: '/sounds/drums',
        children: [
          { name: 'kick.wav', type: 'file', path: '/sounds/drums/kick.wav', url: '/src/pages/sounds/YOU READY？Kick @bangtozzy.wav' },
          { name: 'snare.wav', type: 'file', path: '/sounds/drums/snare.wav', url: '/src/pages/sounds/MASKED UP Clap @bangtozzy.wav' },
          { name: 'hihat.wav', type: 'file', path: '/sounds/drums/hihat.wav', url: '/src/pages/sounds/CHOISE Hat @babyxprod.wav' },
        ]
      },
      {
        name: 'fx',
        type: 'folder',
        path: '/sounds/fx',
        children: [
          { name: 'sweep.wav', type: 'file', path: '/sounds/fx/sweep.wav', url: '/src/pages/sounds/MAKE IT BLEED Op Hat #1 @babyxprod.wav' },
        ]
      },
      {
        name: 'loops',
        type: 'folder',
        path: '/sounds/loops',
        children: [
          { name: 'drum_loop.wav', type: 'file', path: '/sounds/loops/drum_loop.wav' },
        ]
      }
    ]
  }
];

export function SampleBrowser() {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['/sounds']));
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const handleFileClick = async (file: FileNode) => {
    setSelectedFile(file);
    if (file.url) {
      try {
        const response = await fetch(file.url);
        const blob = await response.blob();
        const audioUrl = URL.createObjectURL(blob);
        
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          audioRef.current.play();
          setIsPlaying(true);
          
          audioRef.current.onended = () => {
            setIsPlaying(false);
            URL.revokeObjectURL(audioUrl);
          };
        }
      } catch (error) {
        console.error('Failed to load audio:', error);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      // Here you would typically upload to server or add to IndexedDB
      console.log('Uploaded file:', file.name);
    });
  };

  const renderFileTree = (nodes: FileNode[], level = 0) => {
    return nodes
      .filter(node => node.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .map((node) => (
        <div key={node.path} style={{ marginLeft: `${level * 16}px` }}>
          {node.type === 'folder' ? (
            <div className="flex items-center gap-1 py-1 hover:bg-gray-700 rounded cursor-pointer">
              <button
                onClick={() => toggleFolder(node.path)}
                className="p-0.5 hover:bg-gray-600 rounded"
              >
                {expandedFolders.has(node.path) ? (
                  <ChevronDown className="w-3 h-3 text-gray-400" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-gray-400" />
                )}
              </button>
              <Folder className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-gray-300">{node.name}</span>
            </div>
          ) : (
            <div
              className={`flex items-center gap-2 py-1 hover:bg-gray-700 rounded cursor-pointer ${
                selectedFile?.path === node.path ? 'bg-blue-600/20 border-l-2 border-blue-500' : ''
              }`}
              onClick={() => handleFileClick(node)}
            >
              <File className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-300 flex-1">{node.name}</span>
              {selectedFile?.path === node.path && isPlaying && (
                <Play className="w-3 h-3 text-green-400 animate-pulse" />
              )}
            </div>
          )}
          {node.type === 'folder' && expandedFolders.has(node.path) && node.children && (
            <div>{renderFileTree(node.children, level + 1)}</div>
          )}
        </div>
      ));
  };

  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Sample Browser</h2>
        
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search samples..."
            className="w-full pl-8 pr-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Upload Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm font-medium text-white transition-colors"
        >
          <Upload className="w-4 h-4" />
          Upload Samples
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.wav,.mp3,.ogg"
          multiple
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto p-4">
        {renderFileTree(mockFileTree)}
      </div>

      {/* Audio Element for Preview */}
      <audio ref={audioRef} className="hidden" />

      {/* Selected File Info */}
      {selectedFile && (
        <div className="p-4 border-t border-gray-800 bg-gray-800">
          <div className="text-xs text-gray-400 mb-1">Selected:</div>
          <div className="text-sm text-white truncate">{selectedFile.name}</div>
          <div className="text-xs text-gray-500">{selectedFile.path}</div>
        </div>
      )}
    </div>
  );
}
