import { useState } from 'react';
import { Image, Video, Music, X } from 'lucide-react';
import { postsApi } from '../api/posts';

interface CreatePostProps {
  onPostCreated: () => void;
}

export default function CreatePost({ onPostCreated }: CreatePostProps) {
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (file: File) => {
    const type = file.type;
    if (type.startsWith('image/')) return <Image size={16} />;
    if (type.startsWith('video/')) return <Video size={16} />;
    if (type.startsWith('audio/')) return <Music size={16} />;
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content && files.length === 0) return;

    setLoading(true);
    try {
      await postsApi.createPost(content, files);
      setContent('');
      setFiles([]);
      onPostCreated();
    } catch (error) {
      console.error('Failed to create post:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800/80 backdrop-blur-lg rounded-xl p-6 border border-gray-700 mb-6">
      <form onSubmit={handleSubmit}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Что у вас нового?"
          className="w-full bg-gray-700/50 text-white placeholder-gray-400 rounded-lg p-4 resize-none border border-gray-600 focus:border-purple-500 focus:outline-none min-h-[100px]"
          rows={3}
        />
        
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {files.map((file, index) => (
              <div key={index} className="flex items-center gap-2 bg-gray-700 px-3 py-2 rounded-lg">
                <span className="text-gray-300">{getFileIcon(file)}</span>
                <span className="text-sm text-gray-300 max-w-[150px] truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-between items-center mt-4">
          <div className="flex gap-2">
            <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition text-gray-300 hover:text-white">
              <Image size={20} />
              <span className="text-sm">Фото</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
            <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition text-gray-300 hover:text-white">
              <Video size={20} />
              <span className="text-sm">Видео</span>
              <input
                type="file"
                accept="video/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
            <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition text-gray-300 hover:text-white">
              <Music size={20} />
              <span className="text-sm">Аудио</span>
              <input
                type="file"
                accept="audio/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          </div>
          
          <button
            type="submit"
            disabled={loading || (!content && files.length === 0)}
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg transition text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Публикация...' : 'Опубликовать'}
          </button>
        </div>
      </form>
    </div>
  );
}
